import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomRecord, joinRoom, reduceRoom } from '../lib/party-forge/room-reducer.ts';
import { PROTOCOL_VERSION } from '../lib/party-forge/contracts.ts';
import { roomGenerationInputs } from '../lib/party-forge/server/room-generation.ts';
import { roomSelectionSchema } from '../lib/party-forge/generation/contracts.ts';

await test('room inputs retain overlapping confirmed cards, invalidate on roster changes, and require all players', async () => {
  let record = joinRoom(createRoomRecord('fixture-room', 'one', 'One', 1000), 'two', 'Two', 1000);
  assert.equal((await roomGenerationInputs(record.snapshot)).eligible, false);
  for (const actor of ['one', 'two']) {
    const result = await reduceRoom(record, actor, {
      protocolVersion: PROTOCOL_VERSION, commandId: crypto.randomUUID(), expectedRevision: record.snapshot.revision,
      type: 'choose-initial', choice: { slot: 'instruction', cardId: 'instruction', text: 'Doom' },
    }, 1000);
    assert.equal(result.receipt.status, 'accepted');
    record = result.record;
  }
  const confirmed = await roomGenerationInputs(record.snapshot);
  assert.equal(confirmed.eligible, true);
  assert.deepEqual(confirmed.cards, ['Doom', 'Doom']);
  assert.deepEqual(roomSelectionSchema.parse({ requestKey: crypto.randomUUID(), cards: confirmed.cards }).cards, confirmed.cards);
  record = joinRoom(record, 'three', 'Three', 1001);
  const changed = await roomGenerationInputs(record.snapshot);
  assert.equal(changed.eligible, false);
  assert.notEqual(changed.digest, confirmed.digest);
});
