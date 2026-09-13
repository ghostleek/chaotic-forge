import {
  roomSnapshotSchema,
  type RoomSnapshot,
} from '../lib/party-forge/contracts.ts';

export class StorageUnavailableError extends Error {
  constructor() {
    super('The room database is unavailable');
  }
}

/** The only binding lookup. No memory fallback and no runtime schema creation. */
export async function getDb(): Promise<D1Database> {
  const { env } = await import('cloudflare:workers');
  if (!env.DB) throw new StorageUnavailableError();
  return env.DB;
}

export async function createRoom(
  db: D1Database,
  value: RoomSnapshot,
): Promise<RoomSnapshot> {
  const room = roomSnapshotSchema.parse(value);
  if (room.revision !== 0)
    throw new Error('A new room starts at revision zero');
  await db
    .prepare(
      'INSERT INTO party_rooms (id, revision, snapshot, updated_at) VALUES (?, ?, ?, ?)',
    )
    .bind(room.roomId, room.revision, JSON.stringify(room), room.updatedAt)
    .run();
  return room;
}

export async function readRoom(
  db: D1Database,
  roomId: string,
): Promise<RoomSnapshot | null> {
  const row = await db
    .prepare('SELECT snapshot FROM party_rooms WHERE id = ?')
    .bind(roomId)
    .first<{ snapshot: string }>();
  return row ? roomSnapshotSchema.parse(JSON.parse(row.snapshot)) : null;
}

/** Internal persistence primitive; transport MUST authorize commands before calling it. */
export async function compareAndSwapRoom(
  db: D1Database,
  expectedRevision: number,
  value: RoomSnapshot,
): Promise<boolean> {
  const room = roomSnapshotSchema.parse(value);
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    room.revision !== expectedRevision + 1
  ) {
    throw new Error('A room write must advance exactly one expected revision');
  }
  const result = await db
    .prepare(
      'UPDATE party_rooms SET revision = ?, snapshot = ?, updated_at = ? WHERE id = ? AND revision = ?',
    )
    .bind(
      room.revision,
      JSON.stringify(room),
      room.updatedAt,
      room.roomId,
      expectedRevision,
    )
    .run();
  return result.meta.changes === 1;
}
