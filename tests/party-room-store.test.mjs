import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import {
  commitRoom,
  createRoomRecord,
  findCreatedRoom,
  findEnrollment,
  findReceipt,
  listPresence,
  loadRoomRecord,
  readHistory,
  touchParticipant,
} from '../lib/party-forge/server/room-store.ts';
import { PROTOCOL_VERSION } from '../lib/party-forge/contracts.ts';
import { makeRoom } from './fixtures/party-forge.ts';

// Actual SQLite statements and transactions prove local SQL behavior. The built
// Worker/D1 browser suite separately establishes production-adapter correctness.
function sqliteD1(t, afterFoundation) {
  const directory = mkdtempSync(join(tmpdir(), 'party-room-sqlite-'));
  const sqlite = new DatabaseSync(join(directory, 'rooms.sqlite'));
  t.after(() => {
    sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  });
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const name of readdirSync(new URL('../drizzle/', import.meta.url))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    sqlite.exec(
      readFileSync(new URL(`../drizzle/${name}`, import.meta.url), 'utf8'),
    );
    if (name.startsWith('0000_')) afterFoundation?.(sqlite);
  }
  return {
    sqlite,
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let values = [];
      return {
        bind(...bindings) {
          values = bindings;
          return this;
        },
        run() {
          return {
            meta: { changes: Number(statement.run(...values).changes) },
          };
        },
        first() {
          return statement.get(...values) ?? null;
        },
        all() {
          return { results: statement.all(...values) };
        },
      };
    },
    batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = statements.map((statement) => statement.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

function room(roomId = 'room-a') {
  const snapshot = makeRoom(roomId);
  snapshot.participants = snapshot.participants.slice(0, 1);
  return { snapshot, submissions: [], historyCount: 0 };
}

const host = {
  participantId: 'player-a',
  capabilityHash: 'a'.repeat(64),
  commandId: 'create-a',
};
const guest = {
  participantId: 'player-b',
  capabilityHash: 'b'.repeat(64),
  commandId: 'join-b',
};
const accepted = (commandId, revision) => ({
  protocolVersion: PROTOCOL_VERSION,
  commandId,
  status: 'accepted',
  revision,
});
const aborted = (id = 'evolution-a') => ({
  status: 'evolution-aborted',
  evolutionId: id,
  afterRoundId: 'round-a',
  pendingRevision: 0,
  reason: 'Fixture aborted evolution',
  abortedAt: 1_000_001,
});

test('the appended SQLite migration preserves existing platform room rows', async (t) => {
  const snapshot = makeRoom('legacy-platform-room');
  snapshot.revision = 7;
  const db = sqliteD1(t, (sqlite) => {
    sqlite
      .prepare(
        'INSERT INTO party_rooms (id, revision, snapshot, updated_at) VALUES (?, ?, ?, ?)',
      )
      .run(
        snapshot.roomId,
        snapshot.revision,
        JSON.stringify(snapshot),
        snapshot.updatedAt,
      );
  });
  const row = db.sqlite
    .prepare('SELECT * FROM party_rooms WHERE id = ?')
    .get(snapshot.roomId);
  assert.equal(row.revision, 7);
  assert.deepEqual(JSON.parse(row.snapshot), snapshot);
  assert.equal(row.internal_state, null);
  assert.equal(row.write_token, null);
  assert.equal(await loadRoomRecord(db, snapshot.roomId), null);
});

function advance(record) {
  const next = structuredClone(record);
  next.snapshot.revision += 1;
  next.snapshot.updatedAt += 1;
  return next;
}

function joinGuest(record) {
  const next = advance(record);
  next.snapshot.participants.push({
    id: guest.participantId,
    nickname: 'Guest',
    presence: 'present',
    lastSeenAt: next.snapshot.updatedAt,
  });
  return next;
}

test('SQLite bootstrap retry is privately scoped and cannot enroll on a lost room insert', async (t) => {
  const db = sqliteD1(t);
  const first = room();
  assert.equal(await createRoomRecord(db, first, host), true);
  assert.equal(await createRoomRecord(db, room('retry-room'), host), false);
  assert.equal(await loadRoomRecord(db, 'retry-room'), null);
  assert.equal(
    (await findCreatedRoom(db, host.capabilityHash, host.commandId)).roomId,
    'room-a',
  );
  assert.equal(
    await createRoomRecord(db, room('another-room'), {
      ...host,
      capabilityHash: guest.capabilityHash,
    }),
    true,
  );
  assert.equal(
    await createRoomRecord(db, first, {
      ...host,
      capabilityHash: 'c'.repeat(64),
    }),
    false,
  );
  assert.equal(
    await findEnrollment(db, first.snapshot.roomId, 'c'.repeat(64)),
    null,
  );
  const row = db.sqlite
    .prepare('SELECT snapshot, internal_state FROM party_rooms WHERE id = ?')
    .get('room-a');
  assert.deepEqual(JSON.parse(row.internal_state), {
    submissions: [],
    historyCount: 0,
  });
  assert.equal(row.snapshot.includes(host.capabilityHash), false);
});

test('lost SQLite CAS appends no history, receipt, or participant and rejected retries remain identical', async (t) => {
  const db = sqliteD1(t);
  const first = room();
  await createRoomRecord(db, first, host);
  const winner = advance(first);
  assert.equal(await commitRoom(db, 0, winner), true);
  const losingJoin = joinGuest(first);
  assert.equal(
    await commitRoom(db, 0, losingJoin, {
      receipt: {
        actorId: host.participantId,
        receipt: accepted('losing-command', 1),
      },
      history: [aborted()],
      participant: guest,
    }),
    false,
  );
  assert.equal(
    await findReceipt(db, 'room-a', host.participantId, 'losing-command'),
    null,
  );
  assert.equal(await findEnrollment(db, 'room-a', guest.capabilityHash), null);
  assert.deepEqual(await readHistory(db, 'room-a'), {
    history: [],
    cursor: null,
  });

  const receipt = {
    protocolVersion: PROTOCOL_VERSION,
    commandId: 'rejected',
    status: 'rejected',
    reason: 'invalid-phase',
    current: winner.snapshot,
  };
  assert.equal(
    await commitRoom(db, 1, winner, {
      receipt: { actorId: host.participantId, receipt },
    }),
    true,
  );
  assert.equal(
    await commitRoom(db, 1, winner, {
      receipt: {
        actorId: host.participantId,
        receipt: { ...receipt, reason: 'stale-revision' },
      },
    }),
    false,
  );
  assert.deepEqual(
    await findReceipt(db, 'room-a', host.participantId, 'rejected'),
    receipt,
  );
  assert.equal((await loadRoomRecord(db, 'room-a')).snapshot.revision, 1);
});

test('a later SQLite statement failure rolls back the room CAS, receipt, and history together', async (t) => {
  const db = sqliteD1(t);
  const first = room();
  await createRoomRecord(db, first, host);
  const next = advance(first);
  await assert.rejects(
    commitRoom(db, 0, next, {
      receipt: {
        actorId: host.participantId,
        receipt: accepted('must-rollback', 1),
      },
      history: [aborted()],
      // Fresh hash passes the CAS guard; duplicate participant ID fails the last statement.
      participant: { ...host, capabilityHash: guest.capabilityHash },
    }),
    /UNIQUE constraint failed/,
  );
  assert.deepEqual(await loadRoomRecord(db, 'room-a'), first);
  assert.equal(
    await findReceipt(db, 'room-a', host.participantId, 'must-rollback'),
    null,
  );
  assert.deepEqual(await readHistory(db, 'room-a'), {
    history: [],
    cursor: null,
  });
});

test('a concurrent heartbeat prevents stale host removal and preserves monotonic presence', async (t) => {
  const db = sqliteD1(t);
  const first = room();
  await createRoomRecord(db, first, host);
  const joined = joinGuest(first);
  assert.equal(await commitRoom(db, 0, joined, { participant: guest }), true);
  const stale = advance(joined);
  stale.snapshot.hostId = guest.participantId;
  stale.snapshot.participants = stale.snapshot.participants.filter(
    (p) => p.id !== host.participantId,
  );
  await touchParticipant(
    db,
    'room-a',
    host.participantId,
    first.snapshot.updatedAt + 50_000,
  );
  await touchParticipant(
    db,
    'room-a',
    host.participantId,
    first.snapshot.updatedAt,
  );
  assert.equal(
    await commitRoom(db, 1, stale, {
      expectedPresence: joined.snapshot.participants.map(
        ({ id, lastSeenAt }) => ({ participantId: id, lastSeenAt }),
      ),
      receipt: {
        actorId: guest.participantId,
        receipt: accepted('stale-removal', 2),
      },
      history: [aborted()],
    }),
    false,
  );
  assert.deepEqual(await loadRoomRecord(db, 'room-a'), joined);
  assert.equal(
    (await listPresence(db, 'room-a')).find(
      (p) => p.participantId === host.participantId,
    ).lastSeenAt,
    first.snapshot.updatedAt + 50_000,
  );
  assert.equal(
    await findReceipt(db, 'room-a', guest.participantId, 'stale-removal'),
    null,
  );
  assert.deepEqual(await readHistory(db, 'room-a'), {
    history: [],
    cursor: null,
  });
});

test('history pages never split and lose entries committed in the same revision', async (t) => {
  const db = sqliteD1(t);
  let record = room();
  await createRoomRecord(db, record, host);
  for (let revision = 1; revision <= 7; revision++) {
    const next = advance(record);
    next.historyCount += 16;
    assert.equal(
      await commitRoom(db, revision - 1, next, {
        history: Array.from({ length: 16 }, (_, ordinal) =>
          aborted(`event-${revision}-${ordinal}`),
        ),
      }),
      true,
    );
    record = next;
  }
  const first = await readHistory(db, 'room-a');
  const second = await readHistory(db, 'room-a', first.cursor);
  assert.equal(first.history.length, 96);
  assert.equal(first.cursor, 6);
  assert.equal(second.history.length, 16);
  assert.equal(second.cursor, null);
  const earlierSnapshotHistory = await readHistory(db, 'room-a', 0, 100, 1);
  assert.equal(earlierSnapshotHistory.history.length, 16);
  assert.equal(earlierSnapshotHistory.cursor, null);
  assert.equal(
    new Set(
      [...first.history, ...second.history].map((entry) => entry.evolutionId),
    ).size,
    112,
  );
});
