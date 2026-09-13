import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Minimal durable room foundation. PC-03 owns the authority lifecycle and receipts.
export const partyRooms = sqliteTable(
  'party_rooms',
  {
    id: text('id').primaryKey(),
    revision: integer('revision').notNull().default(0),
    snapshot: text('snapshot').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    check('party_rooms_revision_nonnegative', sql`${table.revision} >= 0`),
    check('party_rooms_snapshot_json', sql`json_valid(${table.snapshot})`),
  ],
);
