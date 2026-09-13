import { z } from 'zod';

/** Wire contract v1. Fixtures are not runtime qualification or external evidence. */
export const PROTOCOL_VERSION = 'party-forge/1' as const;
export const DEMO_POLICY = Object.freeze({
  players: 3,
  trialSeconds: 60,
  ticksPerSecond: 60,
  trialTicks: 3600,
  transportGraceMs: 30_000,
  hostGraceMs: 30_000,
  readyWindowMs: 30_000,
  adaptation: 'off',
  competition: 'separate-matched-trials',
  additionStackLimit: 1,
  maxTraceBytes: 512_000,
} as const);

const version = z.literal(PROTOCOL_VERSION);
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/);
const text = z.string().trim().min(1).max(1000);
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const hash = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const unique = <T>(values: T[]) => new Set(values).size === values.length;
const rosterSchema = z
  .array(id)
  .length(3)
  .refine(unique, 'Roster members must be distinct');

export const initialCardSchema = z.discriminatedUnion('slot', [
  z.strictObject({
    slot: z.literal('fps'),
    cardId: z.enum(['knockback', 'counter-ricochet']),
  }),
  z.strictObject({
    slot: z.literal('zombies'),
    cardId: z.enum(['pursuers', 'noise-seekers']),
  }),
  z.strictObject({
    slot: z.literal('cooking'),
    cardId: z.enum(['quick-orders', 'batch-orders']),
  }),
]);
export const additionCardSchema = z.enum([
  'dinner-bell',
  'hot-potato',
  'zombie-pantry',
]);
export type InitialCard = z.infer<typeof initialCardSchema>;
export type AdditionCard = z.infer<typeof additionCardSchema>;

export const provenanceSchema = z.strictObject({
  source: z.strictObject({
    kind: z.enum(['user-concept', 'authored-demo']),
    reference: text,
  }),
  forgeInterpretation: text,
  userDecision: z.strictObject({ participantId: id, decisionId: id }),
});
const contributionBase = {
  id,
  participantId: id,
  ordinal: integer,
  provenance: provenanceSchema,
};
export const contributionSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      ...contributionBase,
      kind: z.literal('initial'),
      choice: initialCardSchema,
    }),
    z.strictObject({
      ...contributionBase,
      kind: z.literal('addition'),
      cardId: additionCardSchema,
      afterRoundId: id,
      editorRole: z.enum(['winner', 'loser']),
    }),
  ])
  .refine(
    (c) => c.participantId === c.provenance.userDecision.participantId,
    'Decision attribution must match contributor',
  );
export const contributionHistorySchema = z
  .array(contributionSchema)
  .min(3)
  .max(6)
  .superRefine((history, ctx) => {
    const initial = history.filter((c) => c.kind === 'initial');
    const additions = history.filter((c) => c.kind === 'addition');
    if (
      initial.length !== 3 ||
      !unique(initial.map((c) => c.choice.slot)) ||
      !unique(initial.map((c) => c.participantId)) ||
      !unique(history.map((c) => c.id)) ||
      !unique(additions.map((c) => c.cardId)) ||
      history.some((c, i) => c.ordinal !== i) ||
      history.slice(0, 3).some((c) => c.kind !== 'initial')
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Expected three distinct initial slots/contributors followed by ordered singleton additions',
      });
    }
  });

// Registry keys, never executable URLs or traversal paths. Availability/hash verification is PC-02/06.
export const retainedResourceSchema = z.strictObject({
  key: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_/-]{0,190}\.[a-zA-Z0-9]{1,10}$/),
  version: id,
  hash,
  mediaType: z.enum([
    'text/javascript',
    'application/json',
    'image/png',
    'image/webp',
    'audio/ogg',
  ]),
});
export const buildManifestSchema = z
  .strictObject({
    protocolVersion: version,
    buildId: id,
    contentHash: hash,
    parent: z.strictObject({ buildId: id, contentHash: hash }).nullable(),
    catalogVersion: z.literal('kitchen-chaos/1'),
    resolverVersion: id,
    origin: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('preset'), presetVersion: id }),
      z.strictObject({
        kind: z.literal('generated'),
        jobId: id,
        service: text,
        model: text,
        modelVersion: text,
      }),
    ]),
    runtime: retainedResourceSchema,
    assets: z.array(retainedResourceSchema).max(64),
    contributions: contributionHistorySchema,
    effects: z
      .array(
        z.strictObject({
          contributionId: id,
          ruleId: id,
          parameters: z.record(id, z.number().min(-1_000_000).max(1_000_000)),
          explanation: text,
        }),
      )
      .min(3)
      .max(24),
    objective: text,
    controls: z.literal('desktop-keyboard-mouse/1'),
    scoringVersion: z.literal('orders-then-failures/1'),
    adaptation: z.literal('off'),
    validation: z.strictObject({
      status: z.literal('accepted'),
      validatorVersion: id,
      completingTraceHash: hash,
      witnesses: z
        .array(z.strictObject({ contributionId: id, traceHash: hash }))
        .min(3)
        .max(6),
      limitations: z.array(text).min(1).max(16),
    }),
  })
  .superRefine((build, ctx) => {
    const ids = build.contributions.map((c) => c.id);
    const effectIds = build.effects.map((e) => e.contributionId);
    const witnessIds = build.validation.witnesses.map((w) => w.contributionId);
    if (
      ids.some((c) => !effectIds.includes(c) || !witnessIds.includes(c)) ||
      [...effectIds, ...witnessIds].some((c) => !ids.includes(c)) ||
      !unique(witnessIds) ||
      !unique(build.effects.map((e) => e.ruleId)) ||
      !unique([build.runtime, ...build.assets].map((a) => a.key)) ||
      build.runtime.mediaType !== 'text/javascript' ||
      build.parent?.buildId === build.buildId ||
      (build.contributions.length > 3 && !build.parent)
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Build must map every contribution to effects and witnesses with distinct resources and valid lineage',
      });
    }
  });
export type BuildManifest = z.infer<typeof buildManifestSchema>;

export const forkChoiceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('keep'), inheritedContributionId: id }),
  z.strictObject({
    kind: z.literal('replace'),
    inheritedContributionId: id,
    choice: initialCardSchema,
  }),
]);
export const forkDecisionSchema = z
  .strictObject({
    participantId: id,
    selection: forkChoiceSchema,
    provenance: provenanceSchema,
  })
  .refine(
    (d) => d.participantId === d.provenance.userDecision.participantId,
    'Fork attribution must match participant',
  );
export const forkSetupSchema = z
  .strictObject({
    protocolVersion: version,
    sourceArchiveId: id,
    sourceBuildId: id,
    sourceBuildHash: hash,
    decisions: z.array(forkDecisionSchema).length(3),
  })
  .refine(
    (setup) =>
      unique(setup.decisions.map((d) => d.participantId)) &&
      unique(setup.decisions.map((d) => d.selection.inheritedContributionId)),
    'Each new participant claims one inherited slot',
  );

/** Resolve setup semantics only; PC-06 authorizes the new room and retains the source. */
export function parseForkSetup(source: BuildManifest, value: unknown) {
  const parent = buildManifestSchema.parse(source);
  const setup = forkSetupSchema.parse(value);
  if (
    setup.sourceBuildId !== parent.buildId ||
    setup.sourceBuildHash !== parent.contentHash
  )
    throw new Error('Fork source mismatch');
  const choices = setup.decisions.map((decision) => {
    const inherited = parent.contributions.find(
      (c) => c.id === decision.selection.inheritedContributionId,
    );
    if (!inherited || inherited.kind !== 'initial')
      throw new Error('A fork claims an inherited initial slot');
    if (decision.selection.kind === 'keep') return inherited.choice;
    if (
      decision.selection.choice.slot !== inherited.choice.slot ||
      decision.selection.choice.cardId === inherited.choice.cardId
    ) {
      throw new Error(
        'A replacement must choose the other supported variant in that slot',
      );
    }
    return decision.selection.choice;
  });
  return {
    setup,
    kind: setup.decisions.every((d) => d.selection.kind === 'keep')
      ? ('play-again' as const)
      : ('remix' as const),
    choices,
    inheritedAdditions: parent.contributions.filter(
      (c) => c.kind === 'addition',
    ),
  };
}

/** Cross-build check after resolving additions; a parent pointer alone is insufficient. */
export function parseEvolution(
  previous: BuildManifest,
  candidate: unknown,
): BuildManifest {
  const parent = buildManifestSchema.parse(previous);
  const next = buildManifestSchema.parse(candidate);
  if (
    next.parent?.buildId !== parent.buildId ||
    next.parent.contentHash !== parent.contentHash ||
    next.contributions.length < parent.contributions.length ||
    next.contributions.length > parent.contributions.length + 2 ||
    parent.contributions.some(
      (c, i) => JSON.stringify(c) !== JSON.stringify(next.contributions[i]),
    )
  ) {
    throw new Error(
      'Evolution must preserve every previous contribution and add at most two',
    );
  }
  return next;
}

export const buildStateSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('empty') }),
  z.strictObject({
    status: z.literal('playable'),
    manifest: buildManifestSchema,
  }),
  z.strictObject({
    status: z.literal('forging'),
    jobId: id,
    contributionRevision: integer,
    previous: buildManifestSchema.nullable(),
  }),
  z.strictObject({
    status: z.enum(['failed', 'incompatible', 'canceled']),
    jobId: id,
    contributionRevision: integer,
    previous: buildManifestSchema.nullable(),
    affectedContributionIds: z.array(id).max(6),
    reason: text,
  }),
]);

export const roundSchema = z
  .strictObject({
    roundId: id,
    number: integer.min(1),
    buildId: id,
    buildHash: hash,
    roster: rosterSchema,
    seed: integer.max(0xffffffff),
    scoringVersion: z.literal('orders-then-failures/1'),
    ticks: z.literal(DEMO_POLICY.trialTicks),
    ticksPerSecond: z.literal(DEMO_POLICY.ticksPerSecond),
    startsAt: integer,
    submissionDeadline: integer,
    transportDeadline: integer,
    tieCursor: integer.max(2),
  })
  .refine(
    (r) =>
      r.submissionDeadline === r.startsAt + 60_000 &&
      r.transportDeadline ===
        r.submissionDeadline + DEMO_POLICY.transportGraceMs,
    'Transport grace cannot extend simulation time',
  );
export type FrozenRound = z.infer<typeof roundSchema>;

// Full control state at every tick; held controls clear on focus/pointer-lock loss.
// Interaction/shoot edges are derived from consecutive frames by the versioned runtime.
export const inputFrameSchema = z.strictObject({
  tick: integer.max(DEMO_POLICY.trialTicks - 1),
  buttons: integer.max(63), // forward, back, left, right, shoot, interact
  yaw: z.number().min(-Math.PI).max(Math.PI),
  pitch: z
    .number()
    .min(-Math.PI / 2)
    .max(Math.PI / 2),
});
export const trialInputSchema = z
  .strictObject({
    protocolVersion: version,
    roundId: id,
    buildId: id,
    buildHash: hash,
    attemptId: id,
    seed: integer.max(0xffffffff),
    frames: z.array(inputFrameSchema).length(DEMO_POLICY.trialTicks),
  })
  .refine(
    (t) => t.frames.every((frame, i) => frame.tick === i),
    'Every tick must appear exactly once in order',
  );
export type TrialInput = z.infer<typeof trialInputSchema>;
export type RuntimeInput = z.infer<typeof inputFrameSchema>;
export interface RuntimeSnapshot {
  tick: number;
  completed: boolean;
  completedOrders: number;
  failedOrders: number;
  // PC-02 freezes the Kitchen Chaos render payload without changing this envelope.
  state: Readonly<Record<string, unknown>>;
}
/** Pure deterministic runtime; no wall clock, DOM, network, storage, or credentials. */
export interface PartyRuntime {
  reset(manifest: BuildManifest, seed: number): RuntimeSnapshot;
  input(frame: RuntimeInput): void;
  step(): RuntimeSnapshot;
  snapshot(): RuntimeSnapshot;
  isComplete(): boolean;
  validateScore(
    manifest: BuildManifest,
    trial: TrialInput,
  ): { completedOrders: number; failedOrders: number };
}
export function parseTrialForRound(
  value: unknown,
  round: FrozenRound,
): TrialInput {
  const frozen = roundSchema.parse(round);
  const input = trialInputSchema.parse(value);
  if (
    input.roundId !== frozen.roundId ||
    input.buildId !== frozen.buildId ||
    input.buildHash !== frozen.buildHash ||
    input.seed !== frozen.seed
  ) {
    throw new Error('Trace does not match frozen round');
  }
  return input;
}

const scoreSchema = z.strictObject({
  participantId: id,
  completedOrders: integer.max(3600),
  failedOrders: integer.max(3600),
});
export const completedResultSchema = z
  .strictObject({
    protocolVersion: version,
    round: roundSchema,
    results: z
      .array(
        scoreSchema.extend({
          attemptId: id,
          traceHash: hash,
          rank: integer.min(1).max(3),
        }),
      )
      .length(3),
    editors: z.strictObject({
      winner: id,
      loser: id,
      order: z.tuple([id, id]),
    }),
    nextTieCursor: integer.max(2),
  })
  .superRefine((result, ctx) => {
    if (
      result.results.length !== 3 ||
      !unique(result.results.map((s) => s.participantId)) ||
      result.results.some((s) => !result.round.roster.includes(s.participantId))
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Exactly one result is required for every frozen participant',
      });
      return;
    }
    const expected = rankResults(result.round, result.results);
    if (
      !unique(result.results.map((s) => s.participantId)) ||
      !unique(result.results.map((s) => s.attemptId)) ||
      result.results.some(
        (s) =>
          !result.round.roster.includes(s.participantId) ||
          s.rank !== expected.ranks[s.participantId],
      ) ||
      JSON.stringify(result.editors) !== JSON.stringify(expected.editors) ||
      result.nextTieCursor !== expected.nextTieCursor
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Results must retain honest ranks and deterministic distinct editor slots',
      });
    }
  });
export function rankResults(
  round: FrozenRound,
  scores: z.infer<typeof scoreSchema>[],
) {
  const compare = (
    a: z.infer<typeof scoreSchema>,
    b: z.infer<typeof scoreSchema>,
  ) => b.completedOrders - a.completedOrders || a.failedOrders - b.failedOrders;
  const sorted = [...scores].sort(compare);
  const rotation = [
    ...round.roster.slice(round.tieCursor),
    ...round.roster.slice(0, round.tieCursor),
  ];
  const winner = rotation.find((p) =>
    scores.some((s) => s.participantId === p && compare(s, sorted[0]) === 0),
  )!;
  const loser = rotation.find(
    (p) =>
      p !== winner &&
      scores.some(
        (s) => s.participantId === p && compare(s, sorted.at(-1)!) === 0,
      ),
  )!;
  return {
    ranks: Object.fromEntries(
      scores.map((s) => [
        s.participantId,
        sorted.findIndex((other) => compare(s, other) === 0) + 1,
      ]),
    ),
    editors: {
      winner,
      loser,
      order: round.number % 2 ? [winner, loser] : [loser, winner],
    },
    nextTieCursor: (round.tieCursor + 1) % 3,
  };
}

export const roundHistorySchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('completed'),
    result: completedResultSchema,
  }),
  z.strictObject({
    status: z.literal('aborted'),
    round: roundSchema,
    reason: text,
    abortedAt: integer,
  }),
]);
export const evolutionAbortSchema = z.strictObject({
  status: z.literal('evolution-aborted'),
  evolutionId: id,
  afterRoundId: id,
  pendingRevision: integer,
  reason: text,
  abortedAt: integer,
});
export const gameHistorySchema = z.union([
  roundHistorySchema,
  evolutionAbortSchema,
]);

const commandBase = {
  protocolVersion: version,
  commandId: id,
  expectedRevision: integer,
};
/** Identity is resolved from a room-scoped capability by the transport, never a payload actor ID. */
export const roomCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...commandBase,
    type: z.literal('choose-fork'),
    selection: forkChoiceSchema,
  }),
  z.strictObject({
    ...commandBase,
    type: z.literal('choose-initial'),
    choice: initialCardSchema,
  }),
  z.strictObject({
    ...commandBase,
    type: z.literal('acknowledge-build'),
    buildId: id,
    buildHash: hash,
  }),
  z.strictObject({
    ...commandBase,
    type: z.literal('submit-trial'),
    trial: trialInputSchema,
  }),
  z.strictObject({
    ...commandBase,
    type: z.literal('vote'),
    vote: z.enum(['end', 'continue']),
  }),
  z.strictObject({
    ...commandBase,
    type: z.literal('add-mechanic'),
    cardId: additionCardSchema,
  }),
  z.strictObject({
    ...commandBase,
    type: z.enum([
      'pass',
      'retry-forge',
      'cancel-forge',
      'start-round',
      'abort-round',
      'abort-evolution',
      'leave',
      'save-game',
    ]),
  }),
  z.strictObject({
    ...commandBase,
    type: z.literal('remove-unavailable'),
    participantId: id,
  }),
]);
export type RoomCommand = z.infer<typeof roomCommandSchema>;
export const joinRequestSchema = z.strictObject({
  protocolVersion: version,
  commandId: id,
  nickname: z.string().trim().min(1).max(32),
});
/** Private transport context, never serialized in a snapshot, manifest, result, or archive. */
export interface ParticipantAccess {
  roomId: string;
  participantId: string;
  capability: string;
}
export const createRoomRequestSchema = z.strictObject({
  protocolVersion: version,
  commandId: id,
  nickname: z.string().trim().min(1).max(32),
  setup: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('fresh') }),
    z.strictObject({ kind: z.enum(['play-again', 'remix']), archiveId: id }),
  ]),
});

const participantSchema = z.strictObject({
  id,
  nickname: z.string().trim().min(1).max(32),
  presence: z.enum(['present', 'unavailable']),
  lastSeenAt: integer,
});
const editSlotSchema = z.strictObject({
  participantId: id,
  role: z.enum(['winner', 'loser']),
  resolution: z.discriminatedUnion('status', [
    z.strictObject({ status: z.literal('pending') }),
    z.strictObject({ status: z.literal('chosen'), cardId: additionCardSchema }),
    z.strictObject({
      status: z.literal('passed'),
      reason: z.literal('no-legal-addition'),
    }),
  ]),
});
export const roomSnapshotSchema = z
  .strictObject({
    protocolVersion: version,
    roomId: id,
    revision: integer,
    hostId: id,
    participants: z.array(participantSchema).min(1).max(3),
    phase: z.enum([
      'lobby',
      'forging',
      'ready',
      'playing',
      'results',
      'end-vote',
      'additions',
      'ended',
    ]),
    build: buildStateSchema,
    contributions: z.array(contributionSchema).max(6),
    round: roundSchema.nullable(),
    lastCompleted: completedResultSchema.nullable(),
    acknowledgments: z
      .array(
        z.strictObject({ participantId: id, buildId: id, buildHash: hash }),
      )
      .max(3),
    votes: z
      .array(
        z.strictObject({
          participantId: id,
          vote: z.enum(['end', 'continue']),
        }),
      )
      .max(3),
    editSlots: z.array(editSlotSchema).max(2),
    updatedAt: integer,
  })
  .superRefine((room, ctx) => {
    const members = room.participants.map((p) => p.id);
    const bad =
      !unique(members) ||
      !members.includes(room.hostId) ||
      [room.acknowledgments, room.votes, room.editSlots].some(
        (items) =>
          !unique(items.map((i) => i.participantId)) ||
          items.some((i) => !members.includes(i.participantId)),
      ) ||
      (['ready', 'playing'].includes(room.phase) &&
        (room.build.status !== 'playable' || !room.round)) ||
      (['results', 'end-vote', 'additions', 'ended'].includes(room.phase) &&
        (!room.lastCompleted || room.build.status !== 'playable')) ||
      (room.phase === 'additions' &&
        (room.editSlots.length !== 2 ||
          room.editSlots.some(
            (s, i) =>
              s.participantId !== room.lastCompleted?.editors.order[i] ||
              s.participantId !== room.lastCompleted?.editors[s.role],
          ))) ||
      (room.phase !== 'additions' && room.editSlots.length !== 0) ||
      (room.phase === 'ended' && endVoteOutcome(members, room.votes) !== 'end');
    if (bad)
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid membership, phase prerequisites, or editor slots',
      });
    const accepted =
      room.build.status === 'playable'
        ? room.build.manifest
        : 'previous' in room.build
          ? room.build.previous
          : null;
    if (
      accepted &&
      JSON.stringify(room.contributions) !==
        JSON.stringify(accepted.contributions)
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Snapshot history must equal accepted build history; pending edits belong in edit slots',
      });
    }
    if (room.build.status === 'playable') {
      const manifest = room.build.manifest;
      if (
        room.acknowledgments.some(
          (a) =>
            a.buildId !== manifest.buildId ||
            a.buildHash !== manifest.contentHash,
        ) ||
        (['ready', 'playing'].includes(room.phase) &&
          (room.round?.buildId !== manifest.buildId ||
            room.round?.buildHash !== manifest.contentHash)) ||
        (room.phase === 'playing' &&
          (room.acknowledgments.length !== 3 ||
            room.round?.roster.some((p) => !members.includes(p)))) ||
        (['results', 'end-vote', 'additions', 'ended'].includes(room.phase) &&
          (room.lastCompleted?.round.buildId !== manifest.buildId ||
            room.lastCompleted?.round.buildHash !== manifest.contentHash))
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Artifact acknowledgment or last played version mismatch',
        });
      }
    } else if (room.phase === 'ended')
      ctx.addIssue({
        code: 'custom',
        message: 'Ended room requires the final played build',
      });
    if (room.phase === 'additions') {
      const chosen = room.editSlots.flatMap((s) =>
        s.resolution.status === 'chosen' ? [s.resolution.cardId] : [],
      );
      const remaining = legalAdditions(room.contributions);
      if (
        !unique(chosen) ||
        chosen.some((card) => !remaining.includes(card)) ||
        room.editSlots.some(
          (slot, i) =>
            slot.resolution.status === 'passed' &&
            remaining.some(
              (card) =>
                !room.editSlots
                  .slice(0, i)
                  .some(
                    (earlier) =>
                      earlier.resolution.status === 'chosen' &&
                      earlier.resolution.cardId === card,
                  ),
            ),
        ) ||
        (room.editSlots[0]?.resolution.status === 'pending' &&
          room.editSlots[1]?.resolution.status !== 'pending')
      ) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Resolve editor slots in order; Pass requires an exhausted compatible deck',
        });
      }
    }
  });
export type RoomSnapshot = z.infer<typeof roomSnapshotSchema>;
export const commandReceiptSchema = z.discriminatedUnion('status', [
  z.strictObject({
    protocolVersion: version,
    commandId: id,
    status: z.literal('accepted'),
    revision: integer,
  }),
  z.strictObject({
    protocolVersion: version,
    commandId: id,
    status: z.literal('rejected'),
    reason: z.enum([
      'stale-revision',
      'unauthorized',
      'invalid-phase',
      'invalid-choice',
      'incomplete-attempt',
      'deadline',
      'unavailable',
    ]),
    current: roomSnapshotSchema,
  }),
]);
export type CommandReceipt = z.infer<typeof commandReceiptSchema>;
// Retries return the identical stored receipt, without changing its status or revision.

export const archiveSchema = z
  .strictObject({
    protocolVersion: version,
    archiveId: id,
    savedAt: integer,
    parentArchiveId: id.nullable(),
    forkSetup: forkSetupSchema.nullable(),
    finalBuild: buildManifestSchema,
    builds: z.array(buildManifestSchema).min(1).max(4),
    history: z.array(gameHistorySchema).min(1).max(10_000),
    traceRetentionDays: integer.max(30),
  })
  .superRefine((archive, ctx) => {
    const completed = archive.history.filter((h) => h.status === 'completed');
    const final = completed.at(-1)?.result.round;
    const builds = archive.builds;
    if (
      (archive.forkSetup !== null &&
        archive.forkSetup.sourceArchiveId !== archive.parentArchiveId) ||
      !unique(builds.map((b) => b.buildId)) ||
      !unique(
        archive.history
          .filter((h) => h.status !== 'evolution-aborted')
          .map((h) =>
            h.status === 'completed' ? h.result.round.roundId : h.round.roundId,
          ),
      ) ||
      !unique(
        archive.history
          .filter((h) => h.status === 'evolution-aborted')
          .map((h) => h.evolutionId),
      ) ||
      archive.history.some(
        (h, index) =>
          h.status === 'evolution-aborted' &&
          archive.history
            .slice(0, index)
            .filter((previous) => previous.status === 'completed')
            .at(-1)?.result.round.roundId !== h.afterRoundId,
      ) ||
      !final ||
      final.buildId !== archive.finalBuild.buildId ||
      final.buildHash !== archive.finalBuild.contentHash ||
      !builds.some(
        (b) => JSON.stringify(b) === JSON.stringify(archive.finalBuild),
      ) ||
      completed.some(
        (h) =>
          !builds.some(
            (b) =>
              b.buildId === h.result.round.buildId &&
              b.contentHash === h.result.round.buildHash,
          ),
      ) ||
      builds.some(
        (b) =>
          !completed.some(
            (h) =>
              h.result.round.buildId === b.buildId &&
              h.result.round.buildHash === b.contentHash,
          ),
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Archive must retain completed artifacts and save the last played version',
      });
    }
  });
export type GameArchive = z.infer<typeof archiveSchema>;

export function legalAdditions(
  history: z.infer<typeof contributionSchema>[],
): AdditionCard[] {
  return additionCardSchema.options.filter(
    (card) => !history.some((c) => c.kind === 'addition' && c.cardId === card),
  );
}
export function endVoteOutcome(
  active: string[],
  votes: { participantId: string; vote: 'end' | 'continue' }[],
) {
  const current = votes.filter((v) => active.includes(v.participantId));
  if (!unique(current.map((v) => v.participantId)))
    throw new Error('Duplicate vote');
  if (current.some((v) => v.vote === 'continue')) return 'continue';
  return active.length > 0 &&
    active.every((p) =>
      current.some((v) => v.participantId === p && v.vote === 'end'),
    )
    ? 'end'
    : 'pending';
}
