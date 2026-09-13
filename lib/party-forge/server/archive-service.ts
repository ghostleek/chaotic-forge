import { z } from 'zod';
import { getDb } from '../../../db/index.ts';
import { PROTOCOL_VERSION, gameHistorySchema, type GameArchive, type RoomCommand, type CommandReceipt } from '../contracts.ts';
import { parseArchiveImport, validateArchive, serializeArchive, MAX_ARCHIVE_BYTES } from '../archive.ts';
import { checkRuntimeAvailability, UnavailableRuntimeError } from '../runtime-registry.ts';
import type { RoomRecord } from '../room-reducer.ts';
import { readArchive, readPlayedBuilds, importArchive, roomArchiveId } from './archive-store.ts';
import { RoomHttpError, validRoomId } from './participants.ts';

export const ARCHIVE_RETENTION = Object.freeze({
  archive: 'no-automatic-expiry', rawTraceDays: 0, portableExport: true,
});
const headers = {'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff'};
export function archiveLink(archiveId: string) { return `/api/party/archives/${archiveId}`; }

/** Collect at one room revision. Never resolve or invent absent historical builds. */
async function completedArchive(db: D1Database, record: RoomRecord): Promise<GameArchive> {
  if (record.snapshot.phase !== 'ended' || !record.lastPlayedBuild || !record.snapshot.lastCompleted) {
    throw new RoomHttpError(409, 'End the group session after a completed round before saving.');
  }
  const rows = await db.prepare(`SELECT entry FROM party_room_history
    WHERE room_id = ? AND revision <= ? ORDER BY revision, ordinal LIMIT 10001`)
    .bind(record.snapshot.roomId, record.snapshot.revision).all<{entry: string}>();
  if (rows.results.length > 10_000) throw new Error('Room history exceeds its declared limit');
  const history = rows.results.map(row => gameHistorySchema.parse(JSON.parse(row.entry)));
  if (history.length !== record.historyCount) throw new RoomHttpError(409, 'The complete played history is unavailable. The room has been preserved.');
  const retained = await readPlayedBuilds(db, record.snapshot.roomId);
  // A pre-PC06 room with exactly one played version still carries those exact
  // bytes. Older overwritten versions cannot be reconstructed by regeneration.
  if (!retained.some(build => build.buildId === record.lastPlayedBuild!.buildId)) retained.push(record.lastPlayedBuild);
  const builds: GameArchive['builds'] = [];
  for (const entry of history) {
    if (entry.status !== 'completed' || builds.some(build => build.buildId === entry.result.round.buildId)) continue;
    const manifest = retained.find(build => build.buildId === entry.result.round.buildId && build.contentHash === entry.result.round.buildHash);
    if (!manifest) throw new RoomHttpError(409, 'An older played version was not retained by this room. No replacement was generated; the current room is preserved.');
    builds.push(manifest);
  }
  return validateArchive({
    protocolVersion: PROTOCOL_VERSION, archiveId: crypto.randomUUID(), savedAt: Date.now(),
    parentArchiveId: record.parentArchiveId ?? null, forkSetup: record.forkSetup ?? null,
    finalBuild: record.lastPlayedBuild, builds, history, traceRetentionDays: 0,
  });
}

/** The caller commits the candidate with its receipt and room CAS in one D1 batch. */
export async function prepareArchiveSave(db: D1Database, record: RoomRecord, command: RoomCommand): Promise<{
  record: RoomRecord; receipt: CommandReceipt; archive?: GameArchive; archiveId?: string;
}> {
  if (command.type !== 'save-game') throw new Error('Expected save-game');
  const reason = command.expectedRevision !== record.snapshot.revision ? 'stale-revision' : record.snapshot.phase !== 'ended' ? 'invalid-phase' : null;
  if (reason) return {record, receipt: {protocolVersion: PROTOCOL_VERSION, commandId: command.commandId, status: 'rejected', reason, current: record.snapshot}};
  const existing = await roomArchiveId(db, record.snapshot.roomId);
  const archive = existing ? undefined : await completedArchive(db, record);
  const next = structuredClone(record);
  next.snapshot.revision += 1;
  next.snapshot.updatedAt = Math.max(Date.now(), next.snapshot.updatedAt);
  return {record: next, archive, archiveId: existing ?? archive!.archiveId,
    receipt: {protocolVersion: PROTOCOL_VERSION, commandId: command.commandId, status: 'accepted', revision: next.snapshot.revision}};
}

export async function requirePlayableArchive(db: D1Database, id: string): Promise<GameArchive> {
  validRoomId(id);
  const saved = await readArchive(db, id);
  if (!saved) throw new RoomHttpError(404, 'Saved game not found.');
  return validateArchive(saved.archive);
}

export async function readArchiveResponse(request: Request, id: string): Promise<Response> {
  validRoomId(id);
  const saved = await readArchive(await getDb(), id);
  if (!saved) throw new RoomHttpError(404, 'Saved game not found.');
  const archive = await validateArchive(saved.archive, {allowUnavailable: true});
  if (new URL(request.url).searchParams.get('download') === '1') {
    return new Response(await serializeArchive(archive), {headers: {...headers,
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="forge-${archive.archiveId}.json"`,
    }});
  }
  const checks = archive.builds.map(checkRuntimeAvailability);
  const unavailable = checks.find(check => check.status === 'unavailable');
  return Response.json({archive, availability: unavailable ?? {status: 'available'}, provenance: saved.provenance, retention: ARCHIVE_RETENTION}, {headers});
}

async function readArchiveText(request: Request): Promise<string> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new RoomHttpError(415, 'Send an application/json archive.');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new RoomHttpError(403, 'Import must use the same origin.');
  if (Number(request.headers.get('content-length')) > MAX_ARCHIVE_BYTES) throw new RoomHttpError(413, 'An archive may contain at most 32 MiB.');
  if (!request.body) throw new RoomHttpError(400, 'A JSON archive is required.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', {fatal: true});
  let text = '';
  let bytes = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_ARCHIVE_BYTES) { await reader.cancel(); throw new RoomHttpError(413, 'An archive may contain at most 32 MiB.'); }
      try { text += decoder.decode(value, {stream: true}); }
      catch { throw new RoomHttpError(400, 'The archive must be valid UTF-8 JSON.'); }
    }
    try { text += decoder.decode(); } catch { throw new RoomHttpError(400, 'The archive must be valid UTF-8 JSON.'); }
  } finally { reader.releaseLock(); }
  return text;
}

export async function importArchiveResponse(request: Request): Promise<Response> {
  const text = await readArchiveText(request);
  let archive: GameArchive;
  try { archive = await parseArchiveImport(text); }
  catch (error) {
    if (error instanceof UnavailableRuntimeError) throw error;
    throw new RoomHttpError(400, 'This document is not a valid, intact supported game archive. Existing games were preserved.');
  }
  const db = await getDb();
  await importArchive(db, archive);
  const saved = await readArchive(db, archive.archiveId);
  if (!saved) throw new Error('The imported archive is not readable');
  return Response.json({archiveId: archive.archiveId, archiveUrl: archiveLink(archive.archiveId), provenance: saved.provenance}, {status: 201, headers});
}

export async function archiveHttpBoundary(action: () => Promise<Response>) {
  try { return await action(); }
  catch (error) {
    if (error instanceof RoomHttpError) return Response.json({error: error.message}, {status: error.status, headers});
    if (error instanceof UnavailableRuntimeError) return Response.json({error: error.message, availability: {status: 'unavailable'}}, {status: 409, headers});
    if (error instanceof z.ZodError) return Response.json({error: 'The archive does not match the supported game contract.'}, {status: 400, headers});
    console.error('Durable archive operation failed; no successful save was acknowledged.');
    return Response.json({error: 'Saved games are temporarily unavailable. Keep your document and retry the same request.'}, {status: 503, headers});
  }
}
