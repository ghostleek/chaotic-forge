import { z } from 'zod';
import {
  buildManifestSchema,
  commandReceiptSchema,
  gameHistorySchema,
  roomSnapshotSchema,
  type CommandReceipt,
  type GameArchive,
  type RoomSnapshot,
} from '../contracts.ts';

import { roomArchiveStatements } from './archive-store.ts';

export type GameHistory = z.infer<typeof gameHistorySchema>;
type StoredRoom = { snapshot: RoomSnapshot };

export interface Enrollment {
  participantId: string;
  capabilityHash: string;
  commandId: string;
}

export interface StoredEnrollment extends Enrollment {
  roomId: string;
  lastSeenAt: number;
}

interface CommitOptions {
  archive?: GameArchive;
  receipt?: { actorId: string; receipt: CommandReceipt };
  history?: GameHistory[];
  participant?: Enrollment;
  expectedPresence?: { participantId: string; lastSeenAt: number }[];
}

function encodeRoom<T extends StoredRoom>(record: T) {
  const { snapshot: value, ...internalState } = record;
  const snapshot = roomSnapshotSchema.parse(value);
  return {
    snapshot,
    snapshotJson: JSON.stringify(snapshot),
    internalJson: JSON.stringify(internalState),
  };
}

export async function loadRoomRecord<T extends StoredRoom>(
  db: D1Database,
  roomId: string,
): Promise<T | null> {
  const row = await db
    .prepare('SELECT snapshot, internal_state FROM party_rooms WHERE id = ?')
    .bind(roomId)
    .first<{ snapshot: string; internal_state: string | null }>();
  // PC-01's platform-only fixture rows are not enrolled authoritative rooms.
  if (!row?.internal_state) return null;
  return {
    ...JSON.parse(row.internal_state),
    snapshot: roomSnapshotSchema.parse(JSON.parse(row.snapshot)),
  } as T;
}

function enrollmentStatement(
  db: D1Database,
  roomId: string,
  enrollment: Enrollment,
  now: number,
  writeToken: string,
) {
  return db
    .prepare(
      `INSERT INTO party_participants
       (room_id, participant_id, capability_hash, command_id, last_seen_at)
       SELECT ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM party_rooms WHERE id = ? AND write_token = ?)`,
    )
    .bind(
      roomId,
      enrollment.participantId,
      enrollment.capabilityHash,
      enrollment.commandId,
      now,
      roomId,
      writeToken,
    );
}

/** Atomic bootstrap; a retry's capability hash and command ID identify its original room. */
export async function createRoomRecord<T extends StoredRoom>(
  db: D1Database,
  record: T,
  enrollment: Enrollment,
): Promise<boolean> {
  const { snapshot, snapshotJson, internalJson } = encodeRoom(record);
  if (snapshot.revision !== 0 || snapshot.hostId !== enrollment.participantId)
    throw new Error('A new room must enroll its host at revision zero');
  const writeToken = crypto.randomUUID();
  const results = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO party_rooms
         (id, revision, snapshot, updated_at, internal_state, write_token)
         SELECT ?, 0, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM party_room_creations WHERE capability_hash = ? AND command_id = ?
         )`,
      )
      .bind(
        snapshot.roomId,
        snapshotJson,
        snapshot.updatedAt,
        internalJson,
        writeToken,
        enrollment.capabilityHash,
        enrollment.commandId,
      ),
    enrollmentStatement(
      db,
      snapshot.roomId,
      enrollment,
      snapshot.updatedAt,
      writeToken,
    ),
    db
      .prepare(
        `INSERT INTO party_room_creations
         (capability_hash, command_id, room_id, participant_id)
         SELECT ?, ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM party_rooms WHERE id = ? AND write_token = ?)`,
      )
      .bind(
        enrollment.capabilityHash,
        enrollment.commandId,
        snapshot.roomId,
        enrollment.participantId,
        snapshot.roomId,
        writeToken,
      ),
  ]);
  return results[0].meta.changes === 1;
}

/**
 * D1 batch is transactional. A fresh, private write token makes every side effect
 * conditional on this exact CAS, including when a competing write already won.
 * Receipt-only rejections may retain the revision; all state changes advance it.
 */
export async function commitRoom<T extends StoredRoom>(
  db: D1Database,
  expectedRevision: number,
  record: T,
  options: CommitOptions = {},
): Promise<boolean> {
  const { snapshot, snapshotJson, internalJson } = encodeRoom(record);
  const receipt = options.receipt
    ? commandReceiptSchema.parse(options.receipt.receipt)
    : null;
  const history = (options.history ?? []).map((entry) =>
    gameHistorySchema.parse(entry),
  );
  if (history.length > 16)
    throw new Error('A room commit has too many history entries');
  const receiptOnly =
    receipt?.status === 'rejected' && !history.length && !options.participant;
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    (snapshot.revision !== expectedRevision + 1 &&
      !(receiptOnly && snapshot.revision === expectedRevision)) ||
    (receipt?.status === 'accepted' &&
      receipt.revision !== snapshot.revision) ||
    (receipt?.status === 'rejected' &&
      (receipt.current.roomId !== snapshot.roomId ||
        receipt.current.revision !== snapshot.revision))
  ) {
    throw new Error(
      'Room commit must advance one revision or store a rejection at the current revision',
    );
  }
  if (
    options.participant &&
    !snapshot.participants.some(
      (p) => p.id === options.participant?.participantId,
    )
  ) {
    throw new Error('Enrollment must belong to the committed roster');
  }
  const writeToken = crypto.randomUUID();
  const values: (string | number)[] = [
    snapshot.revision,
    snapshotJson,
    snapshot.updatedAt,
    internalJson,
    writeToken,
    snapshot.roomId,
    expectedRevision,
  ];
  let commandGuard = '';
  if (receipt && options.receipt) {
    commandGuard = ` AND NOT EXISTS (
      SELECT 1 FROM party_command_receipts
      WHERE room_id = ? AND actor_id = ? AND command_id = ?
    )`;
    values.push(snapshot.roomId, options.receipt.actorId, receipt.commandId);
  }
  if (options.participant) {
    commandGuard += ` AND NOT EXISTS (
      SELECT 1 FROM party_participants WHERE room_id = ? AND capability_hash = ?
    )`;
    values.push(snapshot.roomId, options.participant.capabilityHash);
  }
  if (options.expectedPresence?.length) {
    if (
      options.expectedPresence.length > 3 ||
      options.expectedPresence.some(
        (participant) =>
          !Number.isSafeInteger(participant.lastSeenAt) ||
          participant.lastSeenAt < 0,
      )
    )
      throw new Error('Invalid expected presence');
    commandGuard += ` AND NOT EXISTS (
      SELECT 1 FROM party_participants WHERE room_id = ? AND (
        ${options.expectedPresence.map(() => '(participant_id = ? AND last_seen_at > ?)').join(' OR ')}
      )
    )`;
    values.push(snapshot.roomId);
    for (const participant of options.expectedPresence) {
      values.push(participant.participantId, participant.lastSeenAt);
    }
  }
  const statements = [
    db
      .prepare(
        `UPDATE party_rooms SET revision = ?, snapshot = ?, updated_at = ?,
         internal_state = ?, write_token = ? WHERE id = ? AND revision = ?${commandGuard}`,
      )
      .bind(...values),
  ];
  if (receipt && options.receipt) {
    statements.push(
      db
        .prepare(
          `INSERT INTO party_command_receipts (room_id, actor_id, command_id, receipt)
           SELECT ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM party_rooms WHERE id = ? AND write_token = ?)`,
        )
        .bind(
          snapshot.roomId,
          options.receipt.actorId,
          receipt.commandId,
          JSON.stringify(receipt),
          snapshot.roomId,
          writeToken,
        ),
    );
  }
  for (const [ordinal, entry] of history.entries()) {
    statements.push(
      db
        .prepare(
          `INSERT INTO party_room_history (room_id, revision, ordinal, entry)
           SELECT ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM party_rooms WHERE id = ? AND write_token = ?)`,
        )
        .bind(
          snapshot.roomId,
          snapshot.revision,
          ordinal,
          JSON.stringify(entry),
          snapshot.roomId,
          writeToken,
        ),
    );
  }
  for (const entry of history) {
    if (entry.status !== 'completed') continue;
    const manifest = buildManifestSchema.parse((record as T & {lastPlayedBuild?: unknown}).lastPlayedBuild);
    if (manifest.buildId !== entry.result.round.buildId || manifest.contentHash !== entry.result.round.buildHash) {
      throw new Error('Completed history must retain its exact played manifest');
    }
    statements.push(db.prepare(`INSERT OR IGNORE INTO party_played_builds (room_id, build_id, manifest)
      SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM party_rooms WHERE id = ? AND write_token = ?)`)
      .bind(snapshot.roomId, manifest.buildId, JSON.stringify(manifest), snapshot.roomId, writeToken));
  }
  if (options.archive) {
    if (snapshot.phase !== 'ended' || !receipt || receipt.status !== 'accepted') throw new Error('Archive writes require an ended room and accepted save receipt');
    statements.push(...await roomArchiveStatements(db, snapshot.roomId, writeToken, options.archive));
  }
  if (options.participant) {
    statements.push(
      enrollmentStatement(
        db,
        snapshot.roomId,
        options.participant,
        snapshot.updatedAt,
        writeToken,
      ),
    );
  }
  const results = await db.batch(statements);
  return results[0].meta.changes === 1;
}

const enrollmentColumns = `p.room_id AS roomId, p.participant_id AS participantId,
  p.capability_hash AS capabilityHash, p.command_id AS commandId, p.last_seen_at AS lastSeenAt`;

export async function findCreatedRoom(
  db: D1Database,
  capabilityHash: string,
  commandId: string,
): Promise<StoredEnrollment | null> {
  return db
    .prepare(
      `SELECT ${enrollmentColumns} FROM party_room_creations c
       JOIN party_participants p ON p.room_id = c.room_id AND p.participant_id = c.participant_id
       WHERE c.capability_hash = ? AND c.command_id = ?`,
    )
    .bind(capabilityHash, commandId)
    .first<StoredEnrollment>();
}

export async function findEnrollment(
  db: D1Database,
  roomId: string,
  capabilityHash: string,
  commandId?: string,
): Promise<StoredEnrollment | null> {
  const values = [roomId, capabilityHash];
  if (commandId !== undefined) values.push(commandId);
  return db
    .prepare(
      `SELECT ${enrollmentColumns} FROM party_participants p
       WHERE p.room_id = ? AND p.capability_hash = ?${commandId === undefined ? '' : ' AND p.command_id = ?'}`,
    )
    .bind(...values)
    .first<StoredEnrollment>();
}

export async function resolveParticipant(
  db: D1Database,
  roomId: string,
  capabilityHash: string,
): Promise<StoredEnrollment | null> {
  return findEnrollment(db, roomId, capabilityHash);
}

export async function touchParticipant(
  db: D1Database,
  roomId: string,
  participantId: string,
  now: number,
): Promise<void> {
  if (!Number.isSafeInteger(now) || now < 0)
    throw new Error('Invalid presence time');
  await db
    .prepare(
      `UPDATE party_participants SET last_seen_at = MAX(last_seen_at, ?)
       WHERE room_id = ? AND participant_id = ?`,
    )
    .bind(now, roomId, participantId)
    .run();
}

export async function listPresence(
  db: D1Database,
  roomId: string,
): Promise<{ participantId: string; lastSeenAt: number }[]> {
  const result = await db
    .prepare(
      `SELECT participant_id AS participantId, last_seen_at AS lastSeenAt
       FROM party_participants WHERE room_id = ?`,
    )
    .bind(roomId)
    .all<{ participantId: string; lastSeenAt: number }>();
  return result.results;
}

export async function findReceipt(
  db: D1Database,
  roomId: string,
  actorId: string,
  commandId: string,
): Promise<CommandReceipt | null> {
  const row = await db
    .prepare(
      `SELECT receipt FROM party_command_receipts
       WHERE room_id = ? AND actor_id = ? AND command_id = ?`,
    )
    .bind(roomId, actorId, commandId)
    .first<{ receipt: string }>();
  return row ? commandReceiptSchema.parse(JSON.parse(row.receipt)) : null;
}

export async function readHistory(
  db: D1Database,
  roomId: string,
  afterRevision = 0,
  limit = 100,
  throughRevision = Number.MAX_SAFE_INTEGER,
): Promise<{ history: GameHistory[]; cursor: number | null }> {
  if (
    !Number.isSafeInteger(afterRevision) ||
    afterRevision < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 16 ||
    limit > 100 ||
    !Number.isSafeInteger(throughRevision) ||
    throughRevision < 0
  )
    throw new Error('Invalid history page');
  const result = await db
    .prepare(
      `SELECT revision, entry FROM party_room_history WHERE room_id = ? AND revision > ? AND revision <= ?
       ORDER BY revision, ordinal LIMIT ?`,
    )
    .bind(roomId, afterRevision, throughRevision, limit + 1)
    .all<{ revision: number; entry: string }>();
  const page = result.results.slice(0, limit);
  // A numeric revision cursor must never skip the rest of a multi-entry commit.
  if (
    result.results.length > limit &&
    result.results[limit].revision === page.at(-1)?.revision
  ) {
    const partialRevision = page.at(-1)!.revision;
    while (page.at(-1)?.revision === partialRevision) page.pop();
  }
  return {
    history: page.map((row) => gameHistorySchema.parse(JSON.parse(row.entry))),
    cursor:
      result.results.length > page.length
        ? (page.at(-1)?.revision ?? null)
        : null,
  };
}
