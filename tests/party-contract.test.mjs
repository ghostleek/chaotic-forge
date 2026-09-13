import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PROTOCOL_VERSION,
  archiveSchema,
  buildManifestSchema,
  buildStateSchema,
  roomCommandSchema,
  roomSnapshotSchema,
  completedResultSchema,
  roundSchema,
  trialInputSchema,
  parseTrialForRound,
  rankResults,
  endVoteOutcome,
  legalAdditions,
  contributionHistorySchema,
  parseEvolution,
  parseForkSetup,
} from '../lib/party-forge/contracts.ts';
import {
  makeBuild,
  makeRoom,
  makeRound,
  makeResult,
  makeTrial,
  makeArchive,
  fixtureRoster,
} from './fixtures/party-forge.ts';

void test('all eight declared initial combinations have an unambiguous schema', () => {
  for (const fps of ['knockback', 'counter-ricochet'])
    for (const zombies of ['pursuers', 'noise-seekers'])
      for (const cooking of ['quick-orders', 'batch-orders']) {
        const manifest = makeBuild([
          { slot: 'fps', cardId: fps },
          { slot: 'zombies', cardId: zombies },
          { slot: 'cooking', cardId: cooking },
        ]);
        assert.equal(buildManifestSchema.parse(manifest).origin.kind, 'preset');
      }
});

void test('manifest boundaries reject malformed, unsupported and falsely attributed data', async (t) => {
  const cases = {
    version: (b) => {
      b.protocolVersion = 'party-forge/2';
    },
    privilegedField: (b) => {
      b.hostCapability = 'secret';
    },
    hash: (b) => {
      b.contentHash = 'not-a-hash';
    },
    wrongCardSlot: (b) => {
      b.contributions[0].choice.cardId = 'pursuers';
    },
    duplicateSlot: (b) => {
      b.contributions[1].choice = b.contributions[0].choice;
    },
    duplicateContributor: (b) => {
      b.contributions[1].participantId = 'player-a';
    },
    falseAttribution: (b) => {
      b.contributions[0].provenance.userDecision.participantId = 'player-b';
    },
    missingEffect: (b) => {
      b.effects.pop();
    },
    missingWitness: (b) => {
      b.validation.witnesses.pop();
    },
    unknownContribution: (b) => {
      b.effects[0].contributionId = 'unknown';
    },
    duplicateRule: (b) => {
      b.effects[1].ruleId = b.effects[0].ruleId;
    },
    nonfiniteParameter: (b) => {
      b.effects[0].parameters.speed = Infinity;
    },
    unvalidated: (b) => {
      b.validation.status = 'pending';
    },
    missingActualModel: (b) => {
      b.origin = { kind: 'generated', jobId: 'job-1' };
    },
    impliedModelOnPreset: (b) => {
      b.origin.model = 'pretend-model';
    },
    arbitraryExecutableUrl: (b) => {
      b.runtime.key = 'https://example.com/runtime.js';
    },
    pathTraversal: (b) => {
      b.runtime.key = '../runtime.js';
    },
    duplicateResource: (b) => {
      b.assets = [b.runtime];
    },
  };
  for (const [name, mutate] of Object.entries(cases))
    await t.test(name, () => {
      const build = makeBuild();
      mutate(build);
      assert.equal(buildManifestSchema.safeParse(build).success, false);
    });
});

void test('evolution preserves prior contributions and bounded additions; failure retains previous build', () => {
  const evolved = makeBuild(undefined, ['dinner-bell', 'hot-potato']);
  assert.deepEqual(parseEvolution(makeBuild(), evolved), evolved);
  assert.deepEqual(
    evolved.contributions.slice(0, 3),
    makeBuild().contributions,
  );
  assert.deepEqual(legalAdditions(evolved.contributions), ['zombie-pantry']);
  const exhausted = makeBuild(undefined, [
    'dinner-bell',
    'hot-potato',
    'zombie-pantry',
  ]);
  assert.deepEqual(legalAdditions(exhausted.contributions), []);
  const duplicate = structuredClone(evolved.contributions);
  duplicate[4].cardId = 'dinner-bell';
  assert.equal(contributionHistorySchema.safeParse(duplicate).success, false);
  const failed = buildStateSchema.parse({
    status: 'failed',
    jobId: 'job-2',
    contributionRevision: 2,
    previous: makeBuild(),
    affectedContributionIds: ['addition-0'],
    reason: 'Fixture validation failed',
  });
  assert.equal(failed.previous.buildId, 'build-initial');
  assert.equal('manifest' in failed, false);
  const erased = structuredClone(evolved);
  erased.contributions[0].choice.cardId = 'counter-ricochet';
  assert.throws(() => parseEvolution(makeBuild(), erased));
});

void test('commands require version/revision and never accept asserted authority or client scores', () => {
  const command = {
    protocolVersion: PROTOCOL_VERSION,
    commandId: 'command-1',
    expectedRevision: 0,
    type: 'vote',
    vote: 'end',
  };
  assert.deepEqual(roomCommandSchema.parse(command), command);
  for (const extra of [
    { actorId: 'player-b' },
    { isHost: true },
    { score: 999 },
  ]) {
    assert.equal(
      roomCommandSchema.safeParse({ ...command, ...extra }).success,
      false,
    );
  }
  for (const expectedRevision of [
    -1,
    0.5,
    Number.MAX_SAFE_INTEGER + 1,
    Infinity,
  ]) {
    assert.equal(
      roomCommandSchema.safeParse({ ...command, expectedRevision }).success,
      false,
    );
  }
  assert.equal(
    roomCommandSchema.safeParse({ ...command, type: 'unknown' }).success,
    false,
  );
});

void test('trial envelope binds every input tick to the frozen version and seed', () => {
  assert.equal(
    parseTrialForRound(makeTrial(), makeRound()).frames.length,
    3600,
  );
  for (const field of ['roundId', 'buildId', 'buildHash', 'seed']) {
    const trace = makeTrial();
    trace[field] =
      field === 'seed'
        ? 123
        : field === 'buildHash'
          ? `sha256:${'b'.repeat(64)}`
          : 'different';
    assert.throws(() => parseTrialForRound(trace, makeRound()));
  }
  for (const mutate of [
    (t) => t.frames.pop(),
    (t) => t.frames.push(t.frames[0]),
    (t) => {
      t.frames[1].tick = 0;
    },
    (t) => {
      t.frames[2].yaw = NaN;
    },
    (t) => {
      t.frames[0].buttons = 64;
    },
  ]) {
    const trace = makeTrial();
    mutate(trace);
    assert.equal(trialInputSchema.safeParse(trace).success, false);
  }
  assert.equal(
    roundSchema.safeParse({ ...makeRound(), transportDeadline: 1_100_000 })
      .success,
    false,
  );
  assert.equal(
    roundSchema.safeParse({
      ...makeRound(),
      roster: ['player-a', 'player-a', 'player-c'],
    }).success,
    false,
  );
});

void test('ranks are honest under ties; rotation and odd/even edit order are independent of arrival', () => {
  const scores = fixtureRoster.map((participantId) => ({
    participantId,
    completedOrders: 2,
    failedOrders: 0,
  }));
  const first = rankResults(makeRound(), scores);
  assert.deepEqual(first.ranks, {
    'player-a': 1,
    'player-b': 1,
    'player-c': 1,
  });
  assert.deepEqual(first.editors, {
    winner: 'player-a',
    loser: 'player-b',
    order: ['player-a', 'player-b'],
  });
  assert.deepEqual(rankResults(makeRound(), scores.toReversed()), first);
  const second = rankResults(
    { ...makeRound(), number: 2, tieCursor: 1 },
    scores,
  );
  assert.deepEqual(second.editors.order, ['player-c', 'player-b']);
  const result = makeResult();
  result.editors.loser = result.editors.winner;
  assert.equal(completedResultSchema.safeParse(result).success, false);
  const falseRank = makeResult();
  falseRank.results[0].rank = 2;
  assert.equal(completedResultSchema.safeParse(falseRank).success, false);
  assert.equal(
    completedResultSchema.safeParse({ ...makeResult(), results: [] }).success,
    false,
  );
});

void test('end voting waits for every active participant unless one continues', () => {
  const votes = fixtureRoster.map((participantId) => ({
    participantId,
    vote: 'end',
  }));
  assert.equal(endVoteOutcome(fixtureRoster, votes.slice(0, 2)), 'pending');
  assert.equal(endVoteOutcome(fixtureRoster, votes), 'end');
  assert.equal(
    endVoteOutcome(fixtureRoster, [
      { participantId: 'player-b', vote: 'continue' },
    ]),
    'continue',
  );
  assert.equal(endVoteOutcome([], []), 'pending');
});

void test('room snapshots expose no capabilities and cannot start mixed builds or reassign editors', () => {
  const room = makeRoom();
  assert.equal(roomSnapshotSchema.safeParse(room).success, true);
  assert.equal(
    roomSnapshotSchema.safeParse({ ...room, capability: 'secret' }).success,
    false,
  );
  assert.equal(
    roomSnapshotSchema.safeParse({ ...room, phase: 'playing' }).success,
    false,
  );
  room.phase = 'playing';
  room.build = { status: 'playable', manifest: makeBuild() };
  room.contributions = room.build.manifest.contributions;
  room.round = makeRound();
  room.acknowledgments = fixtureRoster.map((participantId) => ({
    participantId,
    buildId: room.round.buildId,
    buildHash: room.round.buildHash,
  }));
  assert.equal(roomSnapshotSchema.safeParse(room).success, true);
  room.acknowledgments[0].buildId = 'old-build';
  assert.equal(roomSnapshotSchema.safeParse(room).success, false);
  const additions = {
    ...makeRoom(),
    phase: 'additions',
    build: { status: 'playable', manifest: makeBuild() },
    contributions: makeBuild().contributions,
    lastCompleted: makeResult(),
    editSlots: [
      {
        participantId: 'player-a',
        role: 'winner',
        resolution: { status: 'pending' },
      },
      {
        participantId: 'player-b',
        role: 'loser',
        resolution: { status: 'pending' },
      },
    ],
  };
  assert.equal(roomSnapshotSchema.safeParse(additions).success, false);
  additions.editSlots[1].participantId = 'player-c';
  assert.equal(roomSnapshotSchema.safeParse(additions).success, true);
  additions.build.manifest = makeBuild(undefined, ['dinner-bell']);
  additions.lastCompleted.round.buildId = additions.build.manifest.buildId;
  additions.editSlots[0].resolution = {
    status: 'chosen',
    cardId: 'dinner-bell',
  };
  assert.equal(roomSnapshotSchema.safeParse(additions).success, false);
  additions.contributions = additions.build.manifest.contributions;
  assert.equal(roomSnapshotSchema.safeParse(additions).success, false);
});

void test('exhausted saved games retain additions during explicit fork setup; all-kept is play again', () => {
  const source = makeBuild(undefined, [
    'dinner-bell',
    'hot-potato',
    'zombie-pantry',
  ]);
  const setup = {
    protocolVersion: PROTOCOL_VERSION,
    sourceArchiveId: 'archive-1',
    sourceBuildId: source.buildId,
    sourceBuildHash: source.contentHash,
    decisions: source.contributions.slice(0, 3).map((c, i) => ({
      participantId: `new-player-${i}`,
      selection: { kind: 'keep', inheritedContributionId: c.id },
      provenance: {
        ...c.provenance,
        userDecision: {
          participantId: `new-player-${i}`,
          decisionId: `fork-decision-${i}`,
        },
      },
    })),
  };
  assert.equal(parseForkSetup(source, setup).kind, 'play-again');
  setup.decisions[0].selection = {
    kind: 'replace',
    inheritedContributionId: source.contributions[0].id,
    choice: { slot: 'fps', cardId: 'counter-ricochet' },
  };
  const remix = parseForkSetup(source, setup);
  assert.equal(remix.kind, 'remix');
  assert.deepEqual(remix.inheritedAdditions, source.contributions.slice(3));
  assert.equal(source.contributions[0].choice.cardId, 'knockback');
  setup.decisions[0].selection.choice.cardId = 'knockback';
  assert.throws(() => parseForkSetup(source, setup));
});

void test('pending editor choices and rights survive forging and a failed evolution', () => {
  const prior = makeBuild();
  const room = {
    ...makeRoom(),
    phase: 'forging',
    contributions: prior.contributions,
    build: {
      status: 'forging',
      jobId: 'evolution-job',
      contributionRevision: 7,
      previous: prior,
    },
    lastCompleted: makeResult(),
    editSlots: [
      {
        participantId: 'player-a',
        role: 'winner',
        resolution: { status: 'chosen', cardId: 'dinner-bell' },
      },
      {
        participantId: 'player-c',
        role: 'loser',
        resolution: { status: 'chosen', cardId: 'hot-potato' },
      },
    ],
  };
  assert.equal(roomSnapshotSchema.safeParse(room).success, true);
  room.build = {
    ...room.build,
    status: 'failed',
    reason: 'Validation failed',
    affectedContributionIds: ['pending-dinner-bell'],
  };
  assert.equal(roomSnapshotSchema.safeParse(room).success, true);
  assert.equal(
    roomSnapshotSchema.safeParse({ ...room, editSlots: [] }).success,
    false,
  );
  room.lastCompleted.round.buildId = 'different-build';
  assert.equal(roomSnapshotSchema.safeParse(room).success, false);
});

void test('archives reject surplus unplayed candidates and record evolution abort without inventing a trial', () => {
  const archive = makeArchive();
  const candidate = makeBuild(undefined, ['dinner-bell']);
  assert.equal(
    archiveSchema.safeParse({
      ...archive,
      builds: [...archive.builds, candidate],
    }).success,
    false,
  );
  const abort = {
    status: 'evolution-aborted',
    evolutionId: 'evolution-1',
    afterRoundId: 'round-1',
    pendingRevision: 7,
    reason: 'Editor unavailable after grace',
    abortedAt: 2_000_000,
  };
  archive.history.push(abort);
  assert.equal(archiveSchema.safeParse(archive).success, true);
  assert.equal(
    archiveSchema.safeParse({
      ...archive,
      history: [abort, archive.history[0]],
    }).success,
    false,
  );
  assert.equal(
    archiveSchema.safeParse({
      ...archive,
      history: [...archive.history, abort],
    }).success,
    false,
  );
  abort.afterRoundId = 'never-played';
  assert.equal(archiveSchema.safeParse(archive).success, false);
});

void test('archive saves the last completed artifact, retains abort markers, and excludes secrets', () => {
  const archive = makeArchive();
  assert.equal(archiveSchema.safeParse(archive).success, true);
  archive.history.push({
    status: 'aborted',
    round: { ...makeRound(), roundId: 'round-2', number: 2 },
    reason: 'Lost trace',
    abortedAt: 2_000_000,
  });
  assert.equal(archiveSchema.safeParse(archive).success, true);
  assert.equal(
    archiveSchema.safeParse({
      ...archive,
      finalBuild: makeBuild(undefined, ['dinner-bell']),
    }).success,
    false,
  );
  assert.equal(
    archiveSchema.safeParse({ ...archive, hostCapability: 'secret' }).success,
    false,
  );
  const aborted = structuredClone(archive);
  aborted.history[1].editors = { winner: 'player-a' };
  assert.equal(archiveSchema.safeParse(aborted).success, false);
});
