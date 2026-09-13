import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_POLICY, PROTOCOL_VERSION, archiveSchema, roomSnapshotSchema } from '../lib/party-forge/contracts.ts';
import { createArchiveRoomRecord, createRoomRecord, joinRoom, reduceRoom } from '../lib/party-forge/room-reducer.ts';
import { resolveBuild } from '../lib/party-forge/resolve-build.ts';
import { makeArchive, makeBuild } from './fixtures/party-forge.ts';

// Local deterministic room tests use a constructed archive history and genuinely
// validated authored manifests. They are not observations of human/external play.
const players = ['new-one', 'new-two', 'new-three'];
let commandId = 0;
let sourcePromise;
function sourceArchive() {
  sourcePromise ??= (async () => {
    let previous = null;
    for (const additions of [[], ['dinner-bell', 'hot-potato'], ['dinner-bell', 'hot-potato', 'zombie-pantry']]) {
      const result = await resolveBuild({ contributions: makeBuild(undefined, additions).contributions, previous });
      assert.equal(result.status, 'playable', result.reason);
      previous = result.manifest;
    }
    const archive = makeArchive();
    archive.finalBuild = previous;
    archive.builds = [previous];
    archive.history[0].result.round.buildId = previous.buildId;
    archive.history[0].result.round.buildHash = previous.contentHash;
    return archiveSchema.parse(archive);
  })();
  return sourcePromise.then(archive => structuredClone(archive));
}
async function room(mode = 'remix') {
  const source = await sourceArchive();
  let record = createArchiveRoomRecord('fork-room', players[0], 'One', 1_000, source, mode);
  record = joinRoom(record, players[1], 'Two', 1_000);
  record = joinRoom(record, players[2], 'Three', 1_000);
  return { record, source };
}
async function transition(record, actor, type, fields = {}, services, now = record.snapshot.updatedAt) {
  const before = structuredClone(record);
  const result = await reduceRoom(record, actor, {
    protocolVersion: PROTOCOL_VERSION, commandId: `fork-command-${++commandId}`,
    expectedRevision: record.snapshot.revision, type, ...fields,
  }, now, services);
  assert.deepEqual(record, before, 'the input record is immutable');
  roomSnapshotSchema.parse(result.record.snapshot);
  return result;
}
async function accept(record, actor, type, fields = {}, services, now) {
  const result = await transition(record, actor, type, fields, services, now);
  assert.equal(result.receipt.status, 'accepted', JSON.stringify(result.receipt));
  return result.record;
}
async function reject(record, actor, type, reason, fields = {}) {
  const result = await transition(record, actor, type, fields);
  assert.equal(result.receipt.status, 'rejected');
  assert.equal(result.receipt.reason, reason);
  assert.deepEqual(result.record, record);
  assert.deepEqual(result.history, []);
}
function keep(source, index) {
  return { selection: { kind: 'keep', inheritedContributionId: source.finalBuild.contributions[index].id } };
}
function replace(source, index) {
  const cards = [
    { slot: 'fps', cardId: 'counter-ricochet' },
    { slot: 'zombies', cardId: 'noise-seekers' },
    { slot: 'cooking', cardId: 'batch-orders' },
  ];
  return { selection: { ...keep(source, index).selection, kind: 'replace', choice: cards[index] } };
}

void test('an archive room resets authority, ranks and bounded live history while retaining the exact source', async () => {
  const source = await sourceArchive();
  const record = createArchiveRoomRecord('new-room', players[0], 'New host', 1_000, source, 'play-again');
  assert.equal(record.snapshot.hostId, players[0]);
  assert.deepEqual(record.snapshot.participants.map(p => p.id), [players[0]]);
  assert.equal(record.snapshot.lastCompleted, null);
  assert.equal(record.snapshot.round, null);
  assert.equal(record.lastPlayedBuild, null);
  assert.equal(record.roundCounter, 0);
  assert.equal(record.historyCount, 0);
  assert.deepEqual(record.snapshot.editSlots, []);
  assert.deepEqual(record.snapshot.votes, []);
  assert.equal(record.parentArchiveId, source.archiveId);
  assert.equal(record.forkSetup, null);
  assert.deepEqual(record.snapshot.build.manifest, source.finalBuild);
  assert.equal('sourceArchive' in record, false, 'the archive history cannot inflate the live room record');
  assert.throws(() => createArchiveRoomRecord('new-room', 'player-a', 'Old contributor', 1_000, source, 'remix'), /fresh participant/);
  assert.throws(() => joinRoom(record, 'player-a', 'Old contributor', 1_000), /Historical contribution/);
  source.finalBuild.contributions[0].provenance.forgeInterpretation = 'Mutated test input';
  assert.notEqual(record.sourceBuild.contributions[0].provenance.forgeInterpretation, 'Mutated test input');
  const fresh = createRoomRecord('fresh-room', 'fresh-person', 'Fresh', 1_000);
  assert.equal(fresh.snapshot.fork, null);
  assert.equal(fresh.parentArchiveId, null);
  assert.deepEqual(fresh.snapshot.contributions, []);
});

void test('Play again starts the original executable for a fresh roster and only new scores grant subsequent edit rights', async () => {
  const { source, record: initialRecord } = await room('play-again');
  let record = initialRecord;
  assert.equal(record.snapshot.phase, 'ready');
  assert.deepEqual(record.snapshot.round.roster, players);
  assert.equal(record.snapshot.round.number, 1);
  assert.equal(record.snapshot.round.tieCursor, 0);
  assert.deepEqual(record.snapshot.build.manifest, source.finalBuild);
  await reject(record, players[0], 'choose-initial', 'invalid-phase', { choice: { slot: 'fps', cardId: 'knockback' } });
  await reject(record, 'player-a', 'acknowledge-build', 'unauthorized', { buildId: source.finalBuild.buildId, buildHash: source.finalBuild.contentHash });
  await reject(record, players[0], 'start-round', 'unavailable');
  for (const actor of players) record = await accept(record, actor, 'acknowledge-build', {
    buildId: source.finalBuild.buildId, buildHash: source.finalBuild.contentHash,
  });
  record = await accept(record, players[0], 'start-round');
  for (const actor of players) {
    const round = record.snapshot.round;
    record = await accept(record, actor, 'submit-trial', { trial: {
      protocolVersion: PROTOCOL_VERSION, roundId: round.roundId, buildId: round.buildId,
      buildHash: round.buildHash, seed: round.seed, attemptId: `fresh-${actor}`,
      frames: Array.from({ length: DEMO_POLICY.trialTicks }, (_, tick) => ({ tick, buttons: 0, yaw: 0, pitch: 0 })),
    } }, undefined, round.submissionDeadline);
  }
  assert.equal(record.snapshot.phase, 'results');
  assert.deepEqual(record.snapshot.lastCompleted.editors.order, [players[0], players[1]]);
  assert.deepEqual(record.snapshot.lastCompleted.results.map(r => r.participantId), players);
  record = await accept(record, players[2], 'vote', { vote: 'continue' });
  await reject(record, 'player-a', 'pass', 'unauthorized');
  await reject(record, players[2], 'pass', 'unauthorized');
  record = await accept(record, players[0], 'pass');
  record = await accept(record, players[1], 'pass');
  assert.equal(record.snapshot.phase, 'ready');
  assert.deepEqual(record.snapshot.build.manifest, source.finalBuild);
  assert.deepEqual(record.snapshot.round.roster, players);
});

void test('remix requires distinct inherited initial slots and exposes each current decision without changing source additions', async () => {
  const { source, record: initialRecord } = await room();
  let record = initialRecord;
  await reject(record, players[0], 'choose-initial', 'invalid-phase', { choice: { slot: 'fps', cardId: 'knockback' } });
  await reject(record, players[0], 'choose-fork', 'invalid-choice', keep(source, 3));
  await reject(record, players[0], 'choose-fork', 'invalid-choice', {
    selection: { ...replace(source, 0).selection, choice: { slot: 'cooking', cardId: 'batch-orders' } },
  });
  await reject(record, players[0], 'choose-fork', 'invalid-choice', {
    selection: { ...replace(source, 0).selection, choice: source.finalBuild.contributions[0].choice },
  });
  record = await accept(record, players[0], 'choose-fork', keep(source, 0));
  await reject(record, players[1], 'choose-fork', 'invalid-choice', keep(source, 0));
  assert.deepEqual(record.snapshot.contributions, source.finalBuild.contributions);
  assert.equal(record.snapshot.fork.decisions[0].participantId, players[0]);
  assert.equal(record.snapshot.fork.decisions[0].provenance.userDecision.participantId, players[0]);
  record = await accept(record, players[0], 'leave');
  assert.deepEqual(record.snapshot.fork.decisions, []);
  assert.deepEqual(record.snapshot.contributions, source.finalBuild.contributions);
  record = joinRoom(record, 'new-four', 'Four', record.snapshot.updatedAt);
  record = await accept(record, 'new-four', 'choose-fork', keep(source, 0));
  assert.equal(record.snapshot.fork.decisions[0].participantId, 'new-four');
});

void test('all-kept remix decisions become Play again with a byte-identical manifest and explicit new setup ancestry', async () => {
  const { source, record: initialRecord } = await room();
  let record = initialRecord;
  for (const [index, actor] of players.entries()) record = await accept(record, actor, 'choose-fork', keep(source, index));
  assert.equal(record.snapshot.phase, 'ready');
  assert.equal(record.snapshot.fork.mode, 'play-again');
  assert.deepEqual(record.snapshot.build.manifest, source.finalBuild);
  assert.equal(record.forkSetup.sourceArchiveId, source.archiveId);
  assert.deepEqual(record.forkSetup.decisions.map(d => d.participantId), players);
  assert.deepEqual(record.snapshot.round.roster, players);
  assert.equal(record.snapshot.lastCompleted, null);
  await reject(record, players[0], 'choose-fork', 'invalid-phase', replace(source, 0));
});

void test('remixing an exhausted saved deck replaces only explicit slots, preserves every addition, and keeps the source immutable', async () => {
  const { source, record: initialRecord } = await room();
  let record = initialRecord;
  const original = JSON.stringify(source);
  record = await accept(record, players[0], 'choose-fork', replace(source, 0));
  record = await accept(record, players[1], 'choose-fork', keep(source, 1));
  record = await accept(record, players[2], 'choose-fork', replace(source, 2));
  assert.equal(record.snapshot.phase, 'ready');
  assert.equal(record.snapshot.fork.mode, 'remix');
  const changed = record.snapshot.build.manifest;
  assert.notEqual(changed.contentHash, source.finalBuild.contentHash);
  assert.deepEqual(changed.parent, { buildId: source.finalBuild.buildId, contentHash: source.finalBuild.contentHash });
  assert.equal(changed.contributions[0].choice.cardId, 'counter-ricochet');
  assert.equal(changed.contributions[0].participantId, players[0]);
  assert.equal(changed.contributions[2].choice.cardId, 'batch-orders');
  assert.equal(changed.contributions[2].participantId, players[2]);
  assert.deepEqual(changed.contributions[1], source.finalBuild.contributions[1]);
  assert.deepEqual(changed.contributions.slice(3), source.finalBuild.contributions.slice(3));
  assert.equal(JSON.stringify(source), original);
  assert.deepEqual(record.sourceBuild, source.finalBuild);
  assert.equal(record.forkSetup.decisions[0].selection.inheritedContributionId, source.finalBuild.contributions[0].id);
  assert.deepEqual(record.snapshot.round.roster, players);
});

void test('failed forks retain pending claims for retry or revision without fabricating a completed game', async () => {
  const { source, record: initialRecord } = await room();
  let record = initialRecord;
  record = await accept(record, players[0], 'choose-fork', replace(source, 0));
  record = await accept(record, players[1], 'choose-fork', keep(source, 1));
  record = await accept(record, players[2], 'choose-fork', keep(source, 2), {
    resolveFork: async () => { throw new Error('Simulated local retained-resource outage'); },
  });
  assert.equal(record.snapshot.phase, 'forging');
  assert.equal(record.snapshot.build.status, 'failed');
  assert.deepEqual(record.snapshot.build.previous, source.finalBuild);
  assert.equal(record.snapshot.lastCompleted, null);
  assert.equal(record.lastPlayedBuild, null);
  assert.equal(record.forkSetup, null);
  assert.equal(record.historyCount, 0);
  const pending = structuredClone(record.snapshot.fork.decisions);
  await reject(record, players[1], 'retry-forge', 'unauthorized');
  await reject(record, players[0], 'vote', 'invalid-phase', { vote: 'end' });
  const canceled = await accept(record, players[0], 'cancel-forge');
  assert.deepEqual(canceled.snapshot.fork.decisions, pending);
  let departed = await accept(canceled, players[1], 'leave');
  assert.equal(departed.snapshot.phase, 'lobby');
  assert.deepEqual(departed.snapshot.fork.decisions.map(d => d.participantId), [players[0], players[2]]);
  assert.deepEqual(departed.snapshot.contributions, source.finalBuild.contributions);
  departed = joinRoom(departed, 'new-four', 'Four', departed.snapshot.updatedAt);
  departed = await accept(departed, 'new-four', 'choose-fork', keep(source, 1));
  assert.equal(departed.snapshot.phase, 'ready');
  assert.deepEqual(departed.snapshot.round.roster, [players[0], players[2], 'new-four']);
  const retried = await accept(canceled, players[0], 'retry-forge');
  assert.equal(retried.snapshot.phase, 'ready');
  assert.deepEqual(retried.forkSetup.decisions, pending);
  record = await accept(canceled, players[0], 'choose-fork', keep(source, 0));
  assert.equal(record.snapshot.phase, 'ready');
  assert.equal(record.snapshot.fork.mode, 'play-again');
  assert.deepEqual(record.snapshot.build.manifest, source.finalBuild);
});
