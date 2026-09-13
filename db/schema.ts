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

// Only completed builds are retained here, atomically with their scored history.
export const partyPlayedBuilds = sqliteTable('party_played_builds', {
  roomId: text('room_id').notNull().references(() => partyRooms.id, { onDelete: 'cascade' }),
  buildId: text('build_id').notNull(),
  manifest: text('manifest').notNull(),
}, table => [
  primaryKey({ columns: [table.roomId, table.buildId] }),
  check('party_played_builds_json', sql`json_valid(${table.manifest})`),
]);

// Saved games deliberately have no cascading relationship to transient rooms.
// Imports remain invisible until every bounded child record has been written.
export const partyArchives = sqliteTable('party_archives', {
  id: text('id').primaryKey(),
  sourceRoomId: text('source_room_id'),
  contentHash: text('content_hash').notNull(),
  metadata: text('metadata').notNull(),
  provenance: text('provenance').notNull(),
  historyCount: integer('history_count').notNull(),
  buildCount: integer('build_count').notNull(),
  ready: integer('ready').notNull().default(0),
}, table => [
  uniqueIndex('party_archives_source_room').on(table.sourceRoomId),
  check('party_archives_metadata_json', sql`json_valid(${table.metadata})`),
  check('party_archives_history_bound', sql`${table.historyCount} BETWEEN 1 AND 10000`),
  check('party_archives_build_bound', sql`${table.buildCount} BETWEEN 1 AND 4`),
  check('party_archives_ready', sql`${table.ready} IN (0, 1)`),
  check('party_archives_provenance', sql`${table.provenance} IN ('room-authority', 'portable-import-unverified')`),
]);
export const partyArchiveBuilds = sqliteTable('party_archive_builds', {
  archiveId: text('archive_id').notNull().references(() => partyArchives.id),
  ordinal: integer('ordinal').notNull(),
  manifest: text('manifest').notNull(),
}, table => [
  primaryKey({ columns: [table.archiveId, table.ordinal] }),
  check('party_archive_builds_ordinal', sql`${table.ordinal} BETWEEN 0 AND 3`),
  check('party_archive_builds_json', sql`json_valid(${table.manifest})`),
]);
export const partyArchiveHistory = sqliteTable('party_archive_history', {
  archiveId: text('archive_id').notNull().references(() => partyArchives.id),
  ordinal: integer('ordinal').notNull(),
  entry: text('entry').notNull(),
}, table => [
  primaryKey({ columns: [table.archiveId, table.ordinal] }),
  check('party_archive_history_ordinal', sql`${table.ordinal} BETWEEN 0 AND 9999`),
  check('party_archive_history_json', sql`json_valid(${table.entry})`),
]);
