import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const partyRooms = sqliteTable(
  'party_rooms',
  {
    id: text('id').primaryKey(),
    revision: integer('revision').notNull().default(0),
    snapshot: text('snapshot').notNull(),
    updatedAt: integer('updated_at').notNull(),
    internalState: text('internal_state'),
    writeToken: text('write_token'),
  },
  (table) => [
    check('party_rooms_revision_nonnegative', sql`${table.revision} >= 0`),
    check('party_rooms_snapshot_json', sql`json_valid(${table.snapshot})`),
  ],
);

export const partyParticipants = sqliteTable(
  'party_participants',
  {
    roomId: text('room_id')
      .notNull()
      .references(() => partyRooms.id, { onDelete: 'cascade' }),
    participantId: text('participant_id').notNull(),
    capabilityHash: text('capability_hash').notNull(),
    commandId: text('command_id').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.participantId] }),
    uniqueIndex('party_participants_room_capability').on(
      table.roomId,
      table.capabilityHash,
    ),
    check(
      'party_participants_last_seen_nonnegative',
      sql`${table.lastSeenAt} >= 0`,
    ),
  ],
);

// Bootstrap retries are bound to a private capability hash, not a public command ID.
export const partyRoomCreations = sqliteTable(
  'party_room_creations',
  {
    capabilityHash: text('capability_hash').notNull(),
    commandId: text('command_id').notNull(),
    roomId: text('room_id')
      .notNull()
      .references(() => partyRooms.id, { onDelete: 'cascade' }),
    participantId: text('participant_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.capabilityHash, table.commandId] }),
    uniqueIndex('party_room_creations_room').on(table.roomId),
  ],
);

export const partyCommandReceipts = sqliteTable(
  'party_command_receipts',
  {
    roomId: text('room_id')
      .notNull()
      .references(() => partyRooms.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').notNull(),
    commandId: text('command_id').notNull(),
    receipt: text('receipt').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.actorId, table.commandId] }),
    check('party_command_receipts_json', sql`json_valid(${table.receipt})`),
  ],
);

// History grows outside the bounded live room. Each committed revision appends in order.
export const partyRoomHistory = sqliteTable(
  'party_room_history',
  {
    roomId: text('room_id')
      .notNull()
      .references(() => partyRooms.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    ordinal: integer('ordinal').notNull(),
    entry: text('entry').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.revision, table.ordinal] }),
    check('party_room_history_revision_positive', sql`${table.revision} > 0`),
    check('party_room_history_ordinal_nonnegative', sql`${table.ordinal} >= 0`),
    check('party_room_history_entry_json', sql`json_valid(${table.entry})`),
  ],
);
