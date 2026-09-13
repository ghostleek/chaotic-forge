import { archiveSchema, buildManifestSchema, type GameArchive } from '../contracts.ts';
import { canonicalJson, hashValue } from '../runtimes/kitchen-chaos-v1/integrity.ts';
import { RoomHttpError } from './participants.ts';

export type ArchiveProvenance = 'room-authority' | 'portable-import-unverified';
type ArchiveHeader = {
  id: string; contentHash: string; metadata: string; provenance: ArchiveProvenance;
  historyCount: number; buildCount: number; ready: number;
};
const headerColumns = `id, content_hash AS contentHash, metadata, provenance,
  history_count AS historyCount, build_count AS buildCount, ready`;

export async function archiveHeader(db: D1Database, id: string): Promise<ArchiveHeader | null> {
  return db.prepare(`SELECT ${headerColumns} FROM party_archives WHERE id = ?`).bind(id).first<ArchiveHeader>();
}
export async function roomArchiveId(db: D1Database, roomId: string): Promise<string | null> {
  const row = await db.prepare('SELECT id FROM party_archives WHERE source_room_id = ? AND ready = 1').bind(roomId).first<{id: string}>();
  return row?.id ?? null;
}
export async function readArchive(db: D1Database, id: string): Promise<{archive: GameArchive; provenance: ArchiveProvenance} | null> {
  const header = await archiveHeader(db, id);
  if (!header?.ready) return null;
  const [builds, history] = await db.batch<Record<string, string>>([
    db.prepare('SELECT manifest FROM party_archive_builds WHERE archive_id = ? ORDER BY ordinal').bind(id),
    db.prepare('SELECT entry FROM party_archive_history WHERE archive_id = ? ORDER BY ordinal').bind(id),
  ]);
  if (builds.results.length !== header.buildCount || history.results.length !== header.historyCount) throw new Error('Saved archive is incomplete');
  const archive = archiveSchema.parse({
    ...JSON.parse(header.metadata),
    builds: builds.results.map(row => JSON.parse(row.manifest as string)),
    history: history.results.map(row => JSON.parse(row.entry as string)),
  });
  if (await hashValue(archive) !== header.contentHash) throw new Error('Saved archive integrity check failed');
  return {archive, provenance: header.provenance};
}

export async function readPlayedBuilds(db: D1Database, roomId: string) {
  const rows = await db.prepare('SELECT manifest FROM party_played_builds WHERE room_id = ?').bind(roomId).all<{manifest: string}>();
  return rows.results.map(row => buildManifestSchema.parse(JSON.parse(row.manifest)));
}

/** These statements are appended to the exact room CAS transaction by room-store. */
export async function roomArchiveStatements(db: D1Database, roomId: string, writeToken: string, value: GameArchive) {
  const archive = archiveSchema.parse(value);
  const {builds, history, ...metadata} = archive;
  const hash = await hashValue(archive);
  const guard = 'EXISTS (SELECT 1 FROM party_rooms WHERE id = ? AND write_token = ?)';
  return [
    db.prepare(`INSERT INTO party_archives
      (id, source_room_id, content_hash, metadata, provenance, history_count, build_count, ready)
      SELECT ?, ?, ?, ?, 'room-authority', ?, ?, 1 WHERE ${guard}`)
      .bind(archive.archiveId, roomId, hash, canonicalJson(metadata), history.length, builds.length, roomId, writeToken),
    ...builds.map((build, ordinal) => db.prepare(`INSERT INTO party_archive_builds (archive_id, ordinal, manifest)
      SELECT ?, ?, ? WHERE ${guard}`).bind(archive.archiveId, ordinal, canonicalJson(build), roomId, writeToken)),
    // Copy all already committed room history within the same atomic batch. The
    // validated candidate was read at this exact CAS revision, never a moving tip.
    db.prepare(`INSERT INTO party_archive_history (archive_id, ordinal, entry)
      SELECT ?, ROW_NUMBER() OVER (ORDER BY revision, ordinal) - 1, entry
      FROM party_room_history WHERE room_id = ? AND ${guard}`)
      .bind(archive.archiveId, roomId, roomId, writeToken),
  ];
}

/** Chunked import is resumable but never visible before its final completeness CAS. */
export async function importArchive(db: D1Database, archive: GameArchive): Promise<void> {
  const {builds, history, ...metadata} = archive;
  const hash = await hashValue(archive);
  await db.prepare(`INSERT OR IGNORE INTO party_archives
    (id, source_room_id, content_hash, metadata, provenance, history_count, build_count, ready)
    VALUES (?, NULL, ?, ?, 'portable-import-unverified', ?, ?, 0)`)
    .bind(archive.archiveId, hash, canonicalJson(metadata), history.length, builds.length).run();
  const header = await archiveHeader(db, archive.archiveId);
  if (!header || header.contentHash !== hash) throw new RoomHttpError(409, 'This archive ID already belongs to different immutable content. The existing save was preserved.');
  if (header.ready) return;
  const guard = `EXISTS (SELECT 1 FROM party_archives WHERE id = ? AND content_hash = ? AND ready = 0)`;
  const buildWrites = builds.map((build, ordinal) => db.prepare(`INSERT OR IGNORE INTO party_archive_builds (archive_id, ordinal, manifest)
    SELECT ?, ?, ? WHERE ${guard}`).bind(archive.archiveId, ordinal, canonicalJson(build), archive.archiveId, hash));
  await db.batch(buildWrites);
  // Keep every string bind below D1's 2 MB bound and the entire 32 MiB
  // upload below 50 queries, including metadata, builds and final reads.
  const chunks: {start: number; json: string}[] = [];
  let encoded: string[] = [];
  let size = 2;
  let start = 0;
  for (const [ordinal, entry] of history.entries()) {
    const json = canonicalJson(entry);
    const bytes = new TextEncoder().encode(json).byteLength + 1;
    if (size + bytes > 1_500_000 && encoded.length) {
      chunks.push({start, json: `[${encoded.join(',')}]`});
      start = ordinal; encoded = []; size = 2;
    }
    encoded.push(json); size += bytes;
  }
  if (encoded.length) chunks.push({start, json: `[${encoded.join(',')}]`});
  for (let offset = 0; offset < chunks.length; offset += 10) {
    await db.batch(chunks.slice(offset, offset + 10).map(chunk =>
      db.prepare(`INSERT OR IGNORE INTO party_archive_history (archive_id, ordinal, entry)
        SELECT ?, CAST(json_each.key AS INTEGER) + ?, json_each.value FROM json_each(?) WHERE ${guard}`)
        .bind(archive.archiveId, chunk.start, chunk.json, archive.archiveId, hash)));
  }
  await db.prepare(`UPDATE party_archives SET ready = 1 WHERE id = ? AND content_hash = ? AND ready = 0
    AND (SELECT COUNT(*) FROM party_archive_builds WHERE archive_id = ?) = build_count
    AND (SELECT COUNT(*) FROM party_archive_history WHERE archive_id = ?) = history_count`)
    .bind(archive.archiveId, hash, archive.archiveId, archive.archiveId).run();
  if (!(await archiveHeader(db, archive.archiveId))?.ready) throw new Error('Archive import is incomplete; retry the same document');
}
