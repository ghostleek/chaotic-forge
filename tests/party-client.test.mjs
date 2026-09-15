import assert from 'node:assert/strict';
import test from 'node:test';
import { RoomClient } from '../lib/party-forge/client/room-client.ts';
import {
  INITIAL_PATH,
  nextAddition,
} from '../lib/party-forge/client/demo-path.ts';
import { createRoomRecord, joinRoom } from '../lib/party-forge/room-reducer.ts';
const storage = () => {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
};
const access = {
  roomId: 'room',
  participantId: 'one',
  capability: 'a'.repeat(64),
};
const room = () => createRoomRecord('room', 'one', 'One', 1000).snapshot;
const saved = () => {
  const s = storage();
  s.setItem('party-forge/1:room', JSON.stringify({ access, request: null }));
  return s;
};
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), { status });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

await test('uncertain command retries identical ID and payload; no optimistic contribution', async () => {
  const posts = [];
  let fail = true;
  const client = new RoomClient('room', async (_url, init) => {
    if (init.method === 'GET') return response({ snapshot: room() });
    const body = JSON.parse(init.body);
    posts.push(body);
    if (fail) {
      fail = false;
      throw new Error('offline');
    }
    return response({
      receipt: {
        protocolVersion: 'party-forge/1',
        commandId: body.commandId,
        status: 'accepted',
        revision: 0,
      },
      snapshot: room(),
    });
  });
  client.start(saved());
  await settle();
  try {
    await client.command({ type: 'choose-initial', choice: INITIAL_PATH[0] });
    assert.equal(client.state.uncertain, true);
    assert.equal(client.state.room.contributions.length, 0);
    await client.command({ type: 'choose-initial', choice: INITIAL_PATH[1] });
    assert.equal(posts.length, 1);
    await client.retry();
    assert.deepEqual(posts[0], posts[1]);
    assert.equal(client.state.uncertain, false);
  } finally {
    client.stop();
  }
});

await test('rejected stale receipt allows a new reviewed action, keeps newer snapshot', async () => {
  const posts = [];
  const newer = joinRoom(
    createRoomRecord('room', 'one', 'One', 1000),
    'two',
    'Two',
    1000,
  ).snapshot;
  const client = new RoomClient('room', async (_url, init) => {
    if (init.method === 'GET') return response({ snapshot: room() });
    const body = JSON.parse(init.body);
    posts.push(body);
    return response(
      {
        receipt: {
          protocolVersion: 'party-forge/1',
          commandId: body.commandId,
          status: 'rejected',
          reason: 'stale-revision',
          current: newer,
        },
        snapshot: newer,
      },
      409,
    );
  });
  client.start(saved());
  await settle();
  try {
    await client.command({ type: 'choose-initial', choice: INITIAL_PATH[0] });
    await settle();
    assert.equal(client.state.room.revision, newer.revision);
    assert.match(client.state.error, /Not accepted/);
    await client.command({ type: 'choose-initial', choice: INITIAL_PATH[1] });
    assert.notEqual(posts[0].commandId, posts[1].commandId);
    assert.equal(posts[1].expectedRevision, newer.revision);
  } finally {
    client.stop();
  }
});

await test('lost enrollment response survives reload without a second enrollment identity', async () => {
  const s = storage();
  const posts = [];
  const transport = async (_url, init) => {
    const body = JSON.parse(init.body);
    posts.push({ body, capability: init.headers.Authorization });
    throw new Error('lost');
  };
  const first = new RoomClient(undefined, transport);
  first.start(s);
  await first.enroll('One');
  first.stop();
  const second = new RoomClient(undefined, transport);
  second.start(s);
  try {
    assert.equal(second.state.uncertain, true);
    await second.retry();
    assert.deepEqual(posts[0], posts[1]);
  } finally {
    second.stop();
  }
});

await test('poll cleanup aborts in-flight transport and ignores its late snapshot', async () => {
  let finish;
  let signal;
  const client = new RoomClient('room', async (_url, init) => {
    signal = init.signal;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  client.start(saved());
  client.stop();
  assert.equal(signal.aborted, true);
  finish(response({ snapshot: room() }));
  await settle();
  assert.equal(client.state.room, null);
});

await test('demo path is one initial recipe and ordered singleton additions', () => {
  assert.deepEqual(
    INITIAL_PATH.map((c) => c.cardId),
    ['knockback', 'pursuers', 'quick-orders'],
  );
  const snapshot = room();
  assert.equal(nextAddition(snapshot), 'dinner-bell');
  snapshot.editSlots = [
    { resolution: { status: 'chosen', cardId: 'dinner-bell' } },
  ];
  assert.equal(nextAddition(snapshot), 'hot-potato');
  snapshot.contributions = [
    { kind: 'addition', cardId: 'hot-potato' },
    { kind: 'addition', cardId: 'zombie-pantry' },
  ];
  assert.equal(nextAddition(snapshot), null);
});

await test('storage failure after successful enrollment preserves a retryable identity', async () => {
  const backing = storage();
  let writes = 0;
  const posts = [];
  const s = {
    ...backing,
    setItem: (key, value) => {
      writes++;
      if (writes === 2) throw new Error('quota');
      backing.setItem(key, value);
    },
  };
  const client = new RoomClient(undefined, async (_url, init) => {
    if (init.method === 'GET') return response({ snapshot: room() });
    const body = JSON.parse(init.body);
    posts.push(body);
    return response(
      {
        snapshot: room(),
        access: { ...access, capability: init.headers.Authorization.slice(7) },
      },
      201,
    );
  });
  client.start(s);
  try {
    await client.enroll('One');
    assert.equal(client.state.access, null);
    assert.equal(client.state.uncertain, true);
    assert.ok(backing.getItem('party-forge/1:enrollment'));
    await client.retry();
    assert.deepEqual(posts[0], posts[1]);
    assert.equal(client.state.access.roomId, 'room');
    assert.ok(backing.getItem('party-forge/1:room'));
  } finally {
    client.stop();
  }
});

await test('revoked membership has explicit recovery instead of an endless polling loop', async () => {
  const s = saved();
  const client = new RoomClient('room', async () =>
    response({ error: 'Removed' }, 403),
  );
  client.start(s);
  await settle();
  try {
    assert.equal(client.state.terminal, true);
    client.forgetAccess();
    assert.equal(client.state.access, null);
    assert.equal(s.getItem('party-forge/1:room'), null);
  } finally {
    client.stop();
  }
});

await test('late loader callbacks cannot send mutations after client stops', async () => {
  let posts = 0;
  const client = new RoomClient('room', async (_url, init) => {
    if (init.method === 'POST') posts++;
    return response({ snapshot: room() });
  });
  client.start(saved());
  await settle();
  client.stop();
  await client.command({ type: 'pass' });
  await client.enroll('Late');
  await client.retry();
  assert.equal(posts, 0);
  assert.equal(client.state.pending, false);
});

await test('denied session storage getter leaves the room disconnected without requests', () => {
  let calls = 0;
  const client = new RoomClient(undefined, async () => { calls++; return response({}); });
  client.start(() => { throw new Error('storage denied'); });
  assert.equal(client.snapshot().connected, false);
  assert.equal(client.snapshot().storageUnavailable, true);
  assert.match(client.snapshot().error, /Browser storage is unavailable/);
  assert.equal(calls, 0);
  client.stop();
});
