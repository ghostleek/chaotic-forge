import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_POLICY, PROTOCOL_VERSION, commandReceiptSchema, roomSnapshotSchema,
} from '../lib/party-forge/contracts.ts';
import {
  ROOM_HISTORY_LIMIT, ROUND_START_LEAD_MS, RoomTransitionError,
  createRoomRecord, joinRoom, reduceRoom, refreshPresence,
} from '../lib/party-forge/room-reducer.ts';
import { recipeFromContributions } from '../lib/party-forge/cards.ts';
import { scoreTrial } from '../lib/party-forge/score.ts';
import { createCompletingWitness } from './fixtures/party-builds/kitchen-chaos-v1.mjs';

// These deterministic local authority tests are not observations of remote play.
const players = ['one', 'two', 'three'];
const neutralFrames = () => Array.from({ length: DEMO_POLICY.trialTicks }, (_, tick) => ({ tick, buttons: 0, yaw: 0, pitch: 0 }));
let nextCommand = 0;
function command(record, type, fields = {}) {
  return { protocolVersion: PROTOCOL_VERSION, commandId: `command-${++nextCommand}`, expectedRevision: record.snapshot.revision, type, ...fields };
}
async function transition(record, actorId, type, fields = {}, now = record.snapshot.updatedAt, services) {
  const before = structuredClone(record);
  const result = await reduceRoom(record, actorId, command(record, type, fields), now, services);
  assert.deepEqual(record, before, 'a transition must not mutate its input');
  commandReceiptSchema.parse(result.receipt);
  roomSnapshotSchema.parse(result.record.snapshot);
  return result;
}
async function accept(record, actorId, type, fields = {}, now = record.snapshot.updatedAt, services) {
  const result = await transition(record, actorId, type, fields, now, services);
  assert.equal(result.receipt.status, 'accepted', JSON.stringify(result.receipt));
  return result.record;
}
async function reject(record, actorId, type, reason, fields = {}, now = record.snapshot.updatedAt) {
  const result = await transition(record, actorId, type, fields, now);
  assert.equal(result.receipt.status, 'rejected');
  assert.equal(result.receipt.reason, reason);
  assert.deepEqual(result.record, record);
  assert.deepEqual(result.history, []);
}
function lobby() {
  let record = createRoomRecord('room-local-tests', players[0], 'One', 1_000);
  record = joinRoom(record, players[1], 'Two', 1_000);
  return joinRoom(record, players[2], 'Three', 1_000);
}
async function ready() {
  let record = lobby();
  record = await accept(record, players[0], 'choose-initial', { choice: { slot: 'fps', cardId: 'knockback' } });
  record = await accept(record, players[1], 'choose-initial', { choice: { slot: 'zombies', cardId: 'pursuers' } });
  return accept(record, players[2], 'choose-initial', { choice: { slot: 'cooking', cardId: 'quick-orders' } });
}
async function start(record, now = record.snapshot.updatedAt) {
  const build = record.snapshot.build.manifest;
  for (const actor of record.snapshot.participants) {
    record = await accept(record, actor.id, 'acknowledge-build', { buildId: build.buildId, buildHash: build.contentHash }, now);
  }
  return accept(record, record.snapshot.hostId, 'start-round', {}, now);
}
function trial(record, actor, frames = neutralFrames()) {
  const round = record.snapshot.round;
  return {
    protocolVersion: PROTOCOL_VERSION, roundId: round.roundId,
    buildId: round.buildId, buildHash: round.buildHash,
    seed: round.seed, attemptId: `attempt-${actor}-${record.roundCounter}`, frames,
  };
}
async function complete(record, submissions = [...players].reverse().map(actor => [actor, neutralFrames()])) {
  let history;
  for (const [actor, frames] of submissions) {
    const result = await transition(record, actor, 'submit-trial', { trial: trial(record, actor, frames) }, record.snapshot.round.submissionDeadline);
    assert.equal(result.receipt.status, 'accepted', JSON.stringify(result.receipt));
    record = result.record;
    history = result.history;
  }
  assert.equal(history.length, 1);
  assert.equal(history[0].status, 'completed');
  return record;
}
async function completed() { return complete(await start(await ready())); }

void test('initial membership and choices preserve ownership and authored provenance, then freeze one validated build', async () => {
  let record = createRoomRecord('room', 'one', 'One', 1_000);
  assert.throws(() => joinRoom(record, 'one', 'Impersonator', 1_000), RoomTransitionError);
  record = joinRoom(record, 'two', 'Two', 1_000);
  await reject(record, 'one', 'start-round', 'unavailable');
  record = joinRoom(record, 'three', 'Three', 1_000);
  assert.throws(() => joinRoom(record, 'four', 'Four', 1_000), RoomTransitionError);
  await reject(record, 'outsider', 'choose-initial', 'unauthorized', { choice: { slot: 'fps', cardId: 'knockback' } });
  record = await accept(record, 'one', 'choose-initial', { choice: { slot: 'fps', cardId: 'knockback' } });
  await reject(record, 'two', 'choose-initial', 'invalid-choice', { choice: { slot: 'fps', cardId: 'counter-ricochet' } });
  record = await accept(record, 'one', 'choose-initial', { choice: { slot: 'fps', cardId: 'counter-ricochet' } });
  assert.equal(record.snapshot.contributions.length, 1);
  record = await accept(record, 'two', 'choose-initial', { choice: { slot: 'zombies', cardId: 'pursuers' } });
  record = await accept(record, 'three', 'choose-initial', { choice: { slot: 'cooking', cardId: 'quick-orders' } });
  assert.equal(record.snapshot.phase, 'ready');
  assert.equal(record.snapshot.build.manifest.origin.kind, 'preset');
  assert.equal(record.snapshot.build.manifest.contributions[0].choice.cardId, 'counter-ricochet');
  assert.deepEqual(record.snapshot.round.roster, players);
  assert.deepEqual(record.snapshot.contributions.map(c => c.provenance.userDecision.participantId), players);
  assert.ok(record.snapshot.contributions.every(c => c.provenance.source.kind === 'authored-demo'));
  assert.equal(new Set(record.snapshot.contributions.map(c => c.id)).size, 3);
  assert.throws(() => joinRoom(record, 'four', 'Four', 1_000), RoomTransitionError);
  await reject(record, 'one', 'choose-initial', 'invalid-phase', { choice: { slot: 'fps', cardId: 'knockback' } });
});

void test('stale commands have no effects and supplied actor IDs cannot cross the strict transport schema', async () => {
  const record = lobby();
  const action = command(record, 'choose-initial', { choice: { slot: 'fps', cardId: 'knockback' } });
  const first = await reduceRoom(record, 'one', action, 1_000);
  const stale = await reduceRoom(first.record, 'one', action, 1_000);
  assert.equal(stale.receipt.reason, 'stale-revision');
  assert.deepEqual(stale.record, first.record);
  assert.deepEqual(stale.history, []);
  await assert.rejects(() => reduceRoom(record, 'one', { ...action, actorId: 'two' }, 1_000));
  await assert.rejects(() => reduceRoom(record, 'one', { ...action, choice: { slot: 'fps', cardId: 'unqualified-laser' } }, 1_000));
});

void test('Ready requires three exact artifact acknowledgments, reopens expired windows, and finalizes equal simulation deadlines', async () => {
  let record = await ready();
  const original = structuredClone(record.snapshot.round);
  const build = record.snapshot.build.manifest;
  await reject(record, 'one', 'start-round', 'unavailable');
  await reject(record, 'one', 'acknowledge-build', 'invalid-choice', { buildId: 'other-build', buildHash: build.contentHash });
  record = await accept(record, 'one', 'acknowledge-build', { buildId: build.buildId, buildHash: build.contentHash });
  await reject(record, 'one', 'start-round', 'deadline', {}, original.startsAt + 1);
  record = await accept(record, 'two', 'acknowledge-build', { buildId: build.buildId, buildHash: build.contentHash }, original.startsAt + 1);
  assert.deepEqual(record.snapshot.acknowledgments.map(a => a.participantId), ['two']);
  assert.equal(record.snapshot.round.startsAt, original.startsAt + 1 + DEMO_POLICY.readyWindowMs);
  record = await start(record, record.snapshot.updatedAt);
  assert.equal(record.snapshot.phase, 'playing');
  assert.equal(record.snapshot.round.roundId, original.roundId);
  assert.equal(record.snapshot.round.seed, original.seed);
  assert.equal(record.snapshot.round.startsAt, record.snapshot.updatedAt + ROUND_START_LEAD_MS);
  assert.equal(record.snapshot.round.submissionDeadline, record.snapshot.round.startsAt + 60_000);
  assert.equal(record.snapshot.round.transportDeadline, record.snapshot.round.submissionDeadline + 30_000);
  await reject(record, 'one', 'leave', 'invalid-phase');
  await reject(record, 'one', 'vote', 'invalid-phase', { vote: 'end' });
});

void test('authority replays complete traces and rejects early, mismatched, duplicate and late attempts without granting DNF edits', async () => {
  let record = await start(await ready());
  const round = record.snapshot.round;
  await reject(record, 'one', 'submit-trial', 'deadline', { trial: trial(record, 'one') }, round.submissionDeadline - 1);
  await reject(record, 'one', 'submit-trial', 'incomplete-attempt', { trial: { ...trial(record, 'one'), seed: (round.seed + 1) >>> 0 } }, round.submissionDeadline);
  await reject(record, 'one', 'submit-trial', 'incomplete-attempt', { trial: { ...trial(record, 'one'), buildId: 'wrong-version' } }, round.submissionDeadline);
  const wrongFrames = neutralFrames();
  wrongFrames[4].tick = 5;
  await assert.rejects(() => reduceRoom(record, 'one', command(record, 'submit-trial', { trial: trial(record, 'one', wrongFrames) }), round.submissionDeadline));
  await assert.rejects(() => reduceRoom(record, 'one', command(record, 'submit-trial', { trial: { ...trial(record, 'one'), completedOrders: 900 } }), round.submissionDeadline));
  record = await accept(record, 'one', 'submit-trial', { trial: trial(record, 'one') }, round.submissionDeadline);
  assert.equal(record.snapshot.phase, 'playing');
  assert.equal(record.submissions.length, 1);
  assert.equal(record.submissions[0].completedOrders, 0);
  assert.equal('frames' in record.submissions[0], false);
  await reject(record, 'one', 'submit-trial', 'incomplete-attempt', { trial: { ...trial(record, 'one'), attemptId: 'new-attempt' } }, round.submissionDeadline);
  await reject(record, 'two', 'submit-trial', 'incomplete-attempt', { trial: { ...trial(record, 'two'), attemptId: record.submissions[0].attemptId } }, round.submissionDeadline);
  await reject(record, 'two', 'submit-trial', 'deadline', { trial: trial(record, 'two') }, round.transportDeadline + 1);
  const timeout = refreshPresence(record, 'two', round.transportDeadline + 1);
  assert.equal(timeout.snapshot.phase, 'playing');
  assert.equal(timeout.snapshot.lastCompleted, null);
  assert.deepEqual(timeout.snapshot.editSlots, []);
});

void test('a retained trace can submit at the grace boundary while a lost trace must explicitly abort and retry under a new round ID', async () => {
  let record = await start(await ready());
  const firstRound = structuredClone(record.snapshot.round);
  record = await accept(record, 'one', 'submit-trial', { trial: trial(record, 'one') }, firstRound.transportDeadline);
  const abort = await transition(record, 'one', 'abort-round', {}, firstRound.transportDeadline);
  assert.equal(abort.receipt.status, 'accepted');
  assert.equal(abort.history.length, 1);
  assert.equal(abort.history[0].status, 'aborted');
  assert.equal(abort.history[0].round.roundId, firstRound.roundId);
  assert.equal(abort.record.snapshot.phase, 'lobby');
  assert.equal(abort.record.snapshot.lastCompleted, null);
  assert.deepEqual(abort.record.submissions, []);
  await reject(abort.record, 'one', 'vote', 'invalid-phase', { vote: 'end' });
  record = await accept(abort.record, 'one', 'start-round');
  assert.notEqual(record.snapshot.round.roundId, firstRound.roundId);
  assert.equal(record.snapshot.round.number, firstRound.number);
  assert.equal(record.snapshot.round.buildId, firstRound.buildId);
  assert.equal(record.roundCounter, 2);
  record = await start(record);
  await reject(record, 'one', 'submit-trial', 'incomplete-attempt', {
    trial: { ...trial(record, 'one'), roundId: firstRound.roundId },
  }, record.snapshot.round.submissionDeadline);
});

void test('actual performance derives winner, middle and loser; receipt arrival never controls ranks or two distinct edit rights', async () => {
  let record = await start(await ready());
  const witness = createCompletingWitness(recipeFromContributions(record.snapshot.contributions), record.snapshot.round.seed);
  const cookTick = witness.frames.filter(frame => frame.buttons & 32)[2].tick;
  const burnedOrder = witness.frames.map(frame => frame.tick <= cookTick ? frame : { tick: frame.tick, buttons: 0, yaw: 0, pitch: 0 });
  const fullScore = await scoreTrial(record.snapshot.build.manifest, record.snapshot.round, trial(record, 'one', witness.frames));
  const burnedScore = await scoreTrial(record.snapshot.build.manifest, record.snapshot.round, trial(record, 'three', burnedOrder));
  assert.ok(fullScore.completedOrders > 0);
  assert.equal(burnedScore.completedOrders, 0);
  assert.ok(burnedScore.failedOrders > 0);
  record = await complete(record, [['three', burnedOrder], ['two', neutralFrames()], ['one', witness.frames]]);
  assert.deepEqual(Object.fromEntries(record.snapshot.lastCompleted.results.map(result => [result.participantId, result.rank])), { three: 3, two: 2, one: 1 });
  assert.deepEqual(record.snapshot.lastCompleted.editors, { winner: 'one', loser: 'three', order: ['one', 'three'] });
  record = await accept(record, 'two', 'vote', { vote: 'continue' });
  await reject(record, 'two', 'add-mechanic', 'unauthorized', { cardId: 'hot-potato' });
  await reject(record, 'three', 'add-mechanic', 'unauthorized', { cardId: 'hot-potato' });
});

void test('both ordered editor additions stay pending together, preserve earlier rules, and finite Pass allows unbounded unchanged replay', async () => {
  let record = await completed();
  assert.ok(record.snapshot.lastCompleted.results.every(result => result.rank === 1));
  assert.deepEqual(record.snapshot.lastCompleted.editors, { winner: 'one', loser: 'two', order: ['one', 'two'] });
  const original = structuredClone(record.snapshot.build.manifest);
  record = await accept(record, 'three', 'vote', { vote: 'continue' });
  await reject(record, 'one', 'pass', 'invalid-choice');
  record = await accept(record, 'one', 'add-mechanic', { cardId: 'dinner-bell' });
  assert.equal(record.snapshot.phase, 'additions');
  assert.deepEqual(record.snapshot.contributions, original.contributions);
  assert.equal(record.snapshot.build.manifest.buildId, original.buildId);
  assert.equal(record.snapshot.editSlots[0].resolution.cardId, 'dinner-bell');
  await reject(record, 'one', 'add-mechanic', 'unauthorized', { cardId: 'hot-potato' });
  await reject(record, 'two', 'add-mechanic', 'invalid-choice', { cardId: 'dinner-bell' });
  await reject(record, 'two', 'pass', 'invalid-choice');
  record = await accept(record, 'two', 'add-mechanic', { cardId: 'hot-potato' });
  assert.equal(record.snapshot.phase, 'ready');
  assert.deepEqual(record.snapshot.contributions.slice(0, 3), original.contributions);
  assert.deepEqual(record.snapshot.contributions.slice(3).map(c => [c.cardId, c.participantId, c.editorRole]), [
    ['dinner-bell', 'one', 'winner'], ['hot-potato', 'two', 'loser'],
  ]);
  assert.equal(record.snapshot.build.manifest.parent.buildId, original.buildId);
  record = await complete(await start(record));
  assert.equal(record.snapshot.lastCompleted.round.number, 2);
  assert.deepEqual(record.snapshot.lastCompleted.editors, { winner: 'two', loser: 'three', order: ['three', 'two'] });
  record = await accept(record, 'one', 'vote', { vote: 'continue' });
  record = await accept(record, 'three', 'add-mechanic', { cardId: 'zombie-pantry' });
  await reject(record, 'two', 'add-mechanic', 'invalid-choice', { cardId: 'zombie-pantry' });
  record = await accept(record, 'two', 'pass');
  assert.equal(record.snapshot.contributions.length, 6);
  const fullDeck = record.snapshot.build.manifest;
  record = await complete(await start(record));
  record = await accept(record, 'one', 'vote', { vote: 'continue' });
  const editors = record.snapshot.editSlots.map(slot => slot.participantId);
  await reject(record, editors[0], 'add-mechanic', 'invalid-choice', { cardId: 'dinner-bell' });
  record = await accept(record, editors[0], 'pass');
  record = await accept(record, editors[1], 'pass');
  assert.equal(record.snapshot.phase, 'ready');
  assert.deepEqual(record.snapshot.build.manifest, fullDeck);
  assert.equal(record.snapshot.round.number, 4);
  assert.equal(record.snapshot.lastCompleted.round.number, 3);
  assert.equal(record.snapshot.build.manifest.origin.kind, 'preset');
});

void test('failed resolution preserves the played artifact and both choices for retry or explicit revision', async () => {
  let record = await completed();
  const played = record.snapshot.build.manifest;
  record = await accept(record, 'one', 'vote', { vote: 'continue' });
  record = await accept(record, 'one', 'add-mechanic', { cardId: 'dinner-bell' });
  const simulatedFailure = { resolve: async request => ({ status: 'incompatible', previous: request.previous, reason: 'Simulated unit validation rejection' }) };
  record = await accept(record, 'two', 'add-mechanic', { cardId: 'hot-potato' }, record.snapshot.updatedAt, simulatedFailure);
  assert.equal(record.snapshot.phase, 'forging');
  assert.equal(record.snapshot.build.status, 'incompatible');
  assert.deepEqual(record.snapshot.build.previous, played);
  assert.deepEqual(record.snapshot.contributions, played.contributions);
  assert.deepEqual(record.snapshot.editSlots.map(slot => slot.resolution.cardId), ['dinner-bell', 'hot-potato']);
  const decisions = structuredClone(record.editDecisions);
  await reject(record, 'three', 'retry-forge', 'unauthorized');
  record = await accept(record, 'one', 'cancel-forge');
  assert.equal(record.snapshot.build.status, 'canceled');
  assert.deepEqual(record.editDecisions, decisions);
  record = await accept(record, 'one', 'retry-forge');
  assert.equal(record.snapshot.phase, 'ready');
  assert.deepEqual(record.snapshot.contributions.slice(3).map(c => c.id), decisions.map(d => d.contributionId));
  assert.deepEqual(record.snapshot.contributions.slice(0, 3), played.contributions);
});

void test('initial resolution failure remains editable and never fabricates a last completed or saved game', async () => {
  let record = lobby();
  record = await accept(record, 'one', 'choose-initial', { choice: { slot: 'fps', cardId: 'knockback' } });
  record = await accept(record, 'two', 'choose-initial', { choice: { slot: 'zombies', cardId: 'pursuers' } });
  record = await accept(record, 'three', 'choose-initial', { choice: { slot: 'cooking', cardId: 'quick-orders' } }, 1_000,
    { resolve: async () => { throw new Error('Simulated local qualification failure'); } });
  assert.equal(record.snapshot.build.status, 'failed');
  assert.equal(record.snapshot.build.previous, null);
  assert.equal(record.snapshot.lastCompleted, null);
  await reject(record, 'one', 'vote', 'invalid-phase', { vote: 'end' });
  record = await accept(record, 'three', 'choose-initial', { choice: { slot: 'cooking', cardId: 'batch-orders' } });
  assert.equal(record.snapshot.phase, 'ready');
  assert.equal(record.snapshot.contributions.at(-1).choice.cardId, 'batch-orders');
});

void test('failed and canceled evolutions can explicitly abort after an editor disappears even when both cards were chosen', async () => {
  let record = await completed();
  const played = record.snapshot.build.manifest;
  record = await accept(record, 'one', 'vote', { vote: 'continue' });
  record = await accept(record, 'one', 'add-mechanic', { cardId: 'dinner-bell' });
  record = await accept(record, 'two', 'add-mechanic', { cardId: 'hot-potato' }, record.snapshot.updatedAt,
    { resolve: async () => { throw new Error('Simulated resolution outage'); } });
  assert.ok(record.snapshot.editSlots.every(slot => slot.resolution.status === 'chosen'));
  const failed = record;
  const canceled = await accept(failed, 'one', 'cancel-forge');
  for (let variant of [failed, canceled]) {
    await reject(variant, 'one', 'abort-evolution', 'unavailable', {}, variant.snapshot.updatedAt + DEMO_POLICY.hostGraceMs - 1);
    variant = refreshPresence(variant, 'three', variant.snapshot.updatedAt + DEMO_POLICY.hostGraceMs);
    const abort = await transition(variant, 'three', 'abort-evolution');
    assert.equal(abort.receipt.status, 'accepted');
    assert.equal(abort.history[0].status, 'evolution-aborted');
    assert.equal(abort.record.snapshot.phase, 'results');
    assert.deepEqual(abort.record.snapshot.build.manifest, played);
    assert.deepEqual(abort.record.snapshot.editSlots, []);
  }
});

void test('trusted presence grace transfers only host coordination, preserves absent editor rights, and requires explicit evolution abort', async () => {
  let record = await completed();
  record = await accept(record, 'three', 'vote', { vote: 'continue' });
  record = await accept(record, 'one', 'add-mechanic', { cardId: 'dinner-bell' });
  const now = record.snapshot.updatedAt;
  const original = structuredClone(record);
  const heartbeat = refreshPresence(record, 'three', now + 1);
  assert.equal(heartbeat.snapshot.revision, record.snapshot.revision);
  assert.equal(heartbeat.snapshot.participants[2].lastSeenAt, now + 1);
  assert.deepEqual(record, original);
  await reject(record, 'one', 'abort-evolution', 'unavailable', {}, now + DEMO_POLICY.hostGraceMs - 1);
  record = refreshPresence(record, 'three', now + DEMO_POLICY.hostGraceMs);
  assert.equal(record.snapshot.hostId, 'three');
  assert.deepEqual(record.snapshot.editSlots, original.snapshot.editSlots);
  assert.equal(record.snapshot.revision, original.snapshot.revision + 1);
  await reject(record, 'three', 'add-mechanic', 'unauthorized', { cardId: 'hot-potato' });
  await reject(record, 'three', 'remove-unavailable', 'invalid-phase', { participantId: 'two' });
  const abort = await transition(record, 'three', 'abort-evolution');
  assert.equal(abort.history[0].status, 'evolution-aborted');
  assert.equal(abort.history[0].afterRoundId, record.snapshot.lastCompleted.round.roundId);
  record = abort.record;
  assert.equal(record.snapshot.phase, 'results');
  assert.equal(record.recovery, true);
  assert.deepEqual(record.snapshot.build.manifest, original.lastPlayedBuild);
  assert.deepEqual(record.snapshot.editSlots, []);
  assert.deepEqual(record.editDecisions, []);
  record = await accept(record, 'three', 'remove-unavailable', { participantId: 'one' });
  assert.equal(record.snapshot.participants.length, 2);
  await reject(record, 'three', 'start-round', 'unavailable');
  await reject(record, 'three', 'vote', 'unavailable', { vote: 'continue' });
  record = await accept(record, 'three', 'vote', { vote: 'end' });
  assert.equal(record.snapshot.phase, 'end-vote');
  record = await accept(record, 'two', 'vote', { vote: 'end' });
  assert.equal(record.snapshot.phase, 'ended');
  assert.deepEqual(record.snapshot.build.manifest, original.lastPlayedBuild);
});

void test('reconnecting during grace retains identity, while host succession never returns automatically to the old host', async () => {
  const original = lobby();
  const atGrace = refreshPresence(original, 'two', 31_000);
  assert.equal(atGrace.snapshot.hostId, 'two');
  const rejoined = refreshPresence(atGrace, 'one', 31_001);
  assert.equal(rejoined.snapshot.hostId, 'two');
  assert.equal(rejoined.snapshot.participants.find(p => p.id === 'one').presence, 'present');
  assert.equal(rejoined.snapshot.participants.length, 3);
  assert.throws(() => refreshPresence(rejoined, 'one', 30_999), RoomTransitionError);
  const allAbsent = refreshPresence(original, null, 31_000);
  assert.equal(allAbsent.snapshot.hostId, 'one');
  assert.ok(allAbsent.snapshot.participants.every(p => p.presence === 'unavailable'));
});

void test('fewer than three participants can explicitly discard an unplayed evolution and unanimously end the last played game', async () => {
  let record = await completed();
  const played = record.snapshot.build.manifest;
  record = await accept(record, 'one', 'vote', { vote: 'continue' });
  record = await accept(record, 'three', 'leave');
  assert.equal(record.snapshot.participants.length, 2);
  const pending = record;
  record = await accept(record, 'one', 'add-mechanic', { cardId: 'dinner-bell' });
  record = await accept(record, 'two', 'add-mechanic', { cardId: 'hot-potato' });
  assert.equal(record.snapshot.phase, 'additions');
  assert.ok(record.snapshot.editSlots.every(slot => slot.resolution.status === 'chosen'));
  for (const variant of [pending, record]) {
    assert.ok(variant.snapshot.participants.every(p => p.presence === 'present'));
    const aborted = await transition(variant, 'one', 'abort-evolution');
    assert.equal(aborted.receipt.status, 'accepted');
    assert.equal(aborted.history.length, 1);
    assert.equal(aborted.history[0].status, 'evolution-aborted');
    assert.match(aborted.history[0].reason, /fewer than the required participants/);
    assert.deepEqual(aborted.record.snapshot.build.manifest, played);
    assert.equal(aborted.record.recovery, true);
    let ended = await accept(aborted.record, 'one', 'vote', { vote: 'end' });
    ended = await accept(ended, 'two', 'vote', { vote: 'end' });
    assert.equal(ended.snapshot.phase, 'ended');
    assert.deepEqual(ended.snapshot.build.manifest, played);
  }
});

void test('an aborted evolved trial can retry its entire frozen build or unanimously end on the last actually played build', async () => {
  let record = await completed();
  const played = record.snapshot.build.manifest;
  record = await accept(record, 'one', 'vote', { vote: 'continue' });
  record = await accept(record, 'one', 'add-mechanic', { cardId: 'dinner-bell' });
  record = await accept(record, 'two', 'add-mechanic', { cardId: 'hot-potato' });
  record = await start(record);
  const attemptedBuild = record.snapshot.build.manifest;
  const attemptedRound = record.snapshot.round;
  const interrupted = await transition(record, 'one', 'abort-round');
  assert.equal(interrupted.history[0].status, 'aborted');
  assert.equal(interrupted.record.snapshot.phase, 'results');
  assert.deepEqual(interrupted.record.snapshot.build.manifest, played);
  assert.deepEqual(interrupted.record.retryBuild, attemptedBuild);
  record = await accept(interrupted.record, 'three', 'vote', { vote: 'continue' });
  assert.deepEqual(record.snapshot.build.manifest, attemptedBuild);
  assert.notEqual(record.snapshot.round.roundId, attemptedRound.roundId);
  assert.equal(record.snapshot.round.number, attemptedRound.number);
  assert.deepEqual(record.snapshot.editSlots, []);
  record = interrupted.record;
  for (const actor of players) record = await accept(record, actor, 'vote', { vote: 'end' });
  assert.equal(record.snapshot.phase, 'ended');
  assert.deepEqual(record.snapshot.build.manifest, played);
  await reject(record, 'one', 'start-round', 'invalid-phase');
  await reject(record, 'one', 'choose-initial', 'invalid-phase', { choice: { slot: 'fps', cardId: 'counter-ricochet' } });
});

void test('End requires every active vote before edits; Continue promptly opens contributions and votes cannot save an unplayed draft', async () => {
  let record = await completed();
  record = await accept(record, 'one', 'vote', { vote: 'end' });
  record = await accept(record, 'two', 'vote', { vote: 'end' });
  assert.equal(record.snapshot.phase, 'end-vote');
  record = await accept(record, 'three', 'vote', { vote: 'continue' });
  assert.equal(record.snapshot.phase, 'additions');
  await reject(record, 'one', 'vote', 'invalid-phase', { vote: 'end' });
  await reject(record, 'three', 'save-game', 'unavailable');
});

void test('membership changes clear pending End votes and a new supported roster can retry the preserved build without inherited editor rights', async () => {
  let record = await completed();
  record = await accept(record, 'two', 'vote', { vote: 'end' });
  const departure = await transition(record, 'one', 'leave');
  assert.deepEqual(departure.history, [], 'no unplayed evolution exists before Continue');
  record = departure.record;
  assert.equal(record.snapshot.hostId, 'two');
  assert.equal(record.recovery, true);
  assert.deepEqual(record.snapshot.votes, []);
  record = joinRoom(record, 'four', 'Four', record.snapshot.updatedAt);
  const played = record.snapshot.build.manifest;
  record = await accept(record, 'four', 'vote', { vote: 'continue' });
  assert.equal(record.snapshot.phase, 'ready');
  assert.deepEqual(record.snapshot.round.roster, ['two', 'three', 'four']);
  assert.deepEqual(record.snapshot.build.manifest, played);
  assert.deepEqual(record.snapshot.editSlots, []);
});

void test('bounded history capacity prevents undisclosed dropped rounds while permitting a unanimous end', async () => {
  let record = await completed();
  // Constructed capacity-boundary fixture, not evidence of ten thousand games.
  record.historyCount = ROOM_HISTORY_LIMIT;
  await reject(record, 'one', 'vote', 'unavailable', { vote: 'continue' });
  assert.equal(record.snapshot.phase, 'results');
  record.recovery = true;
  await reject(record, 'one', 'start-round', 'unavailable');
  for (const actor of players) record = await accept(record, actor, 'vote', { vote: 'end' });
  assert.equal(record.snapshot.phase, 'ended');
  assert.equal(record.historyCount, ROOM_HISTORY_LIMIT);
});

void test('history capacity still permits absent editor removal and unanimous ending at completed results', async () => {
  let record = await completed();
  const played = record.snapshot.build.manifest;
  // Constructed terminal-capacity fixture; no evolution has been opened.
  record.historyCount = ROOM_HISTORY_LIMIT;
  record = await accept(record, 'two', 'vote', { vote: 'end' });
  record = refreshPresence(record, 'three', record.snapshot.updatedAt + DEMO_POLICY.hostGraceMs);
  assert.equal(record.snapshot.hostId, 'three');
  const removal = await transition(record, 'three', 'remove-unavailable', { participantId: 'one' });
  assert.equal(removal.receipt.status, 'accepted');
  assert.deepEqual(removal.history, []);
  assert.equal(removal.record.historyCount, ROOM_HISTORY_LIMIT);
  assert.equal(removal.record.recovery, true);
  assert.deepEqual(removal.record.snapshot.editSlots, []);
  assert.deepEqual(removal.record.snapshot.votes, []);
  record = await accept(removal.record, 'two', 'vote', { vote: 'end' });
  record = await accept(record, 'three', 'vote', { vote: 'end' });
  assert.equal(record.snapshot.phase, 'ended');
  assert.deepEqual(record.snapshot.build.manifest, played);
});
