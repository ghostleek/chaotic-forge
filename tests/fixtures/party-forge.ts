import {
  PROTOCOL_VERSION,
  buildManifestSchema,
  roomSnapshotSchema,
  roundSchema,
  completedResultSchema,
  rankResults,
  type InitialCard,
  type AdditionCard,
} from '../../lib/party-forge/contracts.ts';

// SCHEMA FIXTURES ONLY: no runtime, actual witness trace, or external observation is claimed.
export const fixtureHash = `sha256:${'a'.repeat(64)}`;
export const fixtureRoster = ['player-a', 'player-b', 'player-c'];
export function makeBuild(
  choices: InitialCard[] = [
    { slot: 'fps', cardId: 'knockback' },
    { slot: 'zombies', cardId: 'pursuers' },
    { slot: 'cooking', cardId: 'quick-orders' },
  ],
  additions: AdditionCard[] = [],
) {
  const contributions = [
    ...choices.map((choice, i) => ({
      id: `contribution-${i}`,
      participantId: fixtureRoster[i],
      ordinal: i,
      kind: 'initial',
      choice,
      provenance: {
        source: {
          kind: 'authored-demo',
          reference: 'Schema fixture, not executed evidence',
        },
        forgeInterpretation: `Fixture effect for ${choice.cardId}`,
        userDecision: {
          participantId: fixtureRoster[i],
          decisionId: `decision-${i}`,
        },
      },
    })),
    ...additions.map((cardId, i) => ({
      id: `addition-${i}`,
      participantId: fixtureRoster[i % 2],
      ordinal: i + 3,
      kind: 'addition',
      cardId,
      afterRoundId: 'round-1',
      editorRole: i % 2 ? 'loser' : 'winner',
      provenance: {
        source: {
          kind: 'authored-demo',
          reference: 'Schema fixture, not executed evidence',
        },
        forgeInterpretation: `Fixture effect for ${cardId}`,
        userDecision: {
          participantId: fixtureRoster[i % 2],
          decisionId: `addition-decision-${i}`,
        },
      },
    })),
  ];
  return buildManifestSchema.parse({
    protocolVersion: PROTOCOL_VERSION,
    buildId: additions.length ? 'build-evolved' : 'build-initial',
    contentHash: fixtureHash,
    parent: additions.length
      ? { buildId: 'build-initial', contentHash: fixtureHash }
      : null,
    catalogVersion: 'kitchen-chaos/1',
    resolverVersion: 'fixture-resolver-1',
    origin: { kind: 'preset', presetVersion: 'fixture-preset-1' },
    runtime: {
      key: 'fixtures/runtime.js',
      version: 'fixture-runtime-1',
      hash: fixtureHash,
      mediaType: 'text/javascript',
    },
    assets: [],
    contributions,
    effects: contributions.map((c) => ({
      contributionId: c.id,
      ruleId: `rule-${c.ordinal}`,
      parameters: {},
      explanation: c.provenance.forgeInterpretation,
    })),
    objective: 'Schema fixture only; runtime qualification is PC-02.',
    controls: 'desktop-keyboard-mouse/1',
    scoringVersion: 'orders-then-failures/1',
    adaptation: 'off',
    validation: {
      status: 'accepted',
      validatorVersion: 'fixture-validator',
      completingTraceHash: fixtureHash,
      witnesses: contributions.map((c) => ({
        contributionId: c.id,
        traceHash: fixtureHash,
      })),
      limitations: [
        'Fabricated schema data; no executable or witness evidence exists.',
      ],
    },
  });
}
export function makeRound() {
  return roundSchema.parse({
    roundId: 'round-1',
    number: 1,
    buildId: 'build-initial',
    buildHash: fixtureHash,
    roster: fixtureRoster,
    seed: 42,
    scoringVersion: 'orders-then-failures/1',
    ticks: 3600,
    ticksPerSecond: 60,
    startsAt: 1_000_000,
    submissionDeadline: 1_060_000,
    transportDeadline: 1_090_000,
    tieCursor: 0,
  });
}
export function makeResult() {
  const round = makeRound();
  const scores = fixtureRoster.map((participantId, i) => ({
    participantId,
    completedOrders: 3 - i,
    failedOrders: 0,
  }));
  const ranked = rankResults(round, scores);
  return completedResultSchema.parse({
    protocolVersion: PROTOCOL_VERSION,
    round,
    results: scores.map((s, i) => ({
      ...s,
      rank: ranked.ranks[s.participantId],
      attemptId: `attempt-${i}`,
      traceHash: fixtureHash,
    })),
    editors: ranked.editors,
    nextTieCursor: ranked.nextTieCursor,
  });
}
export function makeRoom(roomId = 'fixture-room') {
  return roomSnapshotSchema.parse({
    protocolVersion: PROTOCOL_VERSION,
    roomId,
    revision: 0,
    hostId: 'player-a',
    participants: fixtureRoster.map((id) => ({
      id,
      nickname: id,
      presence: 'present',
      lastSeenAt: 1_000_000,
    })),
    phase: 'lobby',
    build: { status: 'empty' },
    contributions: [],
    round: null,
    lastCompleted: null,
    acknowledgments: [],
    votes: [],
    editSlots: [],
    updatedAt: 1_000_000,
  });
}
export function makeTrial() {
  const round = makeRound();
  return {
    protocolVersion: PROTOCOL_VERSION,
    roundId: round.roundId,
    buildId: round.buildId,
    buildHash: round.buildHash,
    attemptId: 'attempt-a',
    seed: round.seed,
    frames: Array.from({ length: 3600 }, (_, tick) => ({
      tick,
      buttons: 0,
      yaw: 0,
      pitch: 0,
    })),
  };
}
export function makeArchive() {
  return {
    protocolVersion: PROTOCOL_VERSION,
    archiveId: 'archive-1',
    savedAt: 2_000_000,
    parentArchiveId: null,
    forkSetup: null,
    finalBuild: makeBuild(),
    builds: [makeBuild()],
    history: [{ status: 'completed', result: makeResult() }],
    traceRetentionDays: 7,
  };
}
