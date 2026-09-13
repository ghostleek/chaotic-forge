import { z } from 'zod';
import { DEMO_POLICY } from '../contracts.ts';

/** Qualification inputs only. These are not accepted production manifests. */
export const QUALIFICATION_PROTOCOL_VERSION =
  'party-forge-qualification/1' as const;
export const BENCHMARK_SEED = 0x504309;
export const BENCHMARK_POLICY = Object.freeze({
  seed: BENCHMARK_SEED,
  ticks: DEMO_POLICY.trialTicks,
  ticksPerSecond: DEMO_POLICY.ticksPerSecond,
  scoringVersion: 'orders-then-failures/1',
  adaptation: DEMO_POLICY.adaptation,
} as const);

const id = z.string().regex(/^[a-z][a-z0-9-]{0,95}$/);
const text = z.string().trim().min(1).max(2000);
export const benchmarkStageIdSchema = z.enum(['initial', 'remix-1', 'remix-2']);
export type BenchmarkStageId = z.infer<typeof benchmarkStageIdSchema>;

const contributionBase = {
  id,
  ordinal: z.number().int().min(0).max(6),
  rule: text,
  provenance: z.strictObject({
    source: z.strictObject({
      kind: z.literal('authored-benchmark'),
      reference: z.literal('docs/party-generation-qualification.md'),
    }),
    forgeInterpretation: text,
    userDecision: z.null(),
  }),
  witness: z.strictObject({ id, criterion: text }),
};

export const benchmarkContributionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...contributionBase,
    kind: z.literal('initial'),
    slot: z.enum(['fps', 'zombies', 'cooking']),
  }),
  z.strictObject({
    ...contributionBase,
    kind: z.literal('addition'),
    afterStageId: z.enum(['initial', 'remix-1']),
    editorRole: z.enum(['winner', 'loser']),
  }),
]);
export type BenchmarkContribution = z.infer<typeof benchmarkContributionSchema>;

export const benchmarkStageSchema = z
  .strictObject({
    protocolVersion: z.literal(QUALIFICATION_PROTOCOL_VERSION),
    id: benchmarkStageIdSchema,
    parentStageId: z.enum(['initial', 'remix-1']).nullable(),
    contributions: z.array(benchmarkContributionSchema).min(3).max(7),
    newContributionIds: z.array(id).min(2).max(3),
    expectedWitnessIds: z.array(id).min(3).max(7),
  })
  .superRefine((stage, ctx) => {
    const stageNumber = ['initial', 'remix-1', 'remix-2'].indexOf(stage.id);
    const expectedLength = 3 + stageNumber * 2;
    const previousLength = stageNumber ? expectedLength - 2 : 0;
    const initial = stage.contributions.slice(0, 3);
    const additions = stage.contributions.slice(3);
    const ids = stage.contributions.map((contribution) => contribution.id);
    const witnesses = stage.contributions.map(
      (contribution) => contribution.witness.id,
    );
    const expectedParent = [null, 'initial', 'remix-1'][stageNumber];
    const valid =
      stage.parentStageId === expectedParent &&
      stage.contributions.length === expectedLength &&
      initial.every((contribution) => contribution.kind === 'initial') &&
      new Set(
        initial.map(
          (contribution) =>
            contribution.kind === 'initial' && contribution.slot,
        ),
      ).size === 3 &&
      additions.every(
        (contribution, index) =>
          contribution.kind === 'addition' &&
          contribution.afterStageId === (index < 2 ? 'initial' : 'remix-1') &&
          contribution.editorRole ===
            ['winner', 'loser', 'loser', 'winner'][index],
      ) &&
      stage.contributions.every(
        (contribution, index) => contribution.ordinal === index,
      ) &&
      new Set(ids).size === ids.length &&
      new Set(witnesses).size === witnesses.length &&
      JSON.stringify(stage.newContributionIds) ===
        JSON.stringify(ids.slice(previousLength)) &&
      JSON.stringify(stage.expectedWitnessIds) === JSON.stringify(witnesses);
    if (!valid)
      ctx.addIssue({
        code: 'custom',
        message:
          'Expected three initial contributions, then exactly one winner and one loser addition per remix with complete witness coverage',
      });
  });
export type BenchmarkStage = z.infer<typeof benchmarkStageSchema>;

const rules = [
  {
    id: 'knockback-fps',
    kind: 'initial',
    slot: 'fps',
    rule: 'The player aims and fires in first person. Each shot that hits a zombie pushes that zombie away from the player; shooting changes threat position, not just its appearance.',
    witness: {
      id: 'shot-displaces-zombie',
      criterion:
        'An aimed shot hits a visible zombie and measurably increases its distance from the player while the player remains still. Observe positions before and after the hit.',
    },
  },
  {
    id: 'pursuing-zombies',
    kind: 'initial',
    slot: 'zombies',
    rule: 'Zombies pursue the player through the kitchen. A zombie reaching the player interrupts preparation or delivery and can cause an unfinished order to fail. At most 12 zombies are active; ordinary scheduled spawns are skipped at this cap.',
    witness: {
      id: 'pursuit-interrupts-order',
      criterion:
        'While an order is being prepared or carried, an unopposed zombie approaches the stationary player and contact interrupts that task or causes a failed order.',
    },
  },
  {
    id: 'conveyor-cooking',
    kind: 'initial',
    slot: 'cooking',
    rule: 'Ingredients move along a conveyor. The player collects a moving ingredient, prepares and cooks it at kitchen stations, and carries the finished dish to delivery to complete an order. Combat and pursuit remain active throughout.',
    witness: {
      id: 'conveyor-to-delivery',
      criterion:
        'Observe an ingredient change position on the conveyor, then collect, prepare, cook and deliver it through player input. The delivered order increases completedOrders while the zombie simulation continues.',
    },
  },
  {
    id: 'delivery-bell',
    kind: 'addition',
    afterStageId: 'initial',
    editorRole: 'winner',
    rule: 'Completing a delivery rings a bell that spawns one additional pursuing zombie, immediately below the 12-active-zombie cap or queued until a slot opens at the cap. There is at most one delivery per tick and therefore at most 3600 queued bell spawns. The bell cannot replace normal zombie pursuit or the completed order reward.',
    witness: {
      id: 'delivery-summons-zombie',
      criterion:
        'With fewer than 12 active zombies, one delivery increases completedOrders and causes one additional zombie to spawn at that delivery tick, beyond any independently scheduled spawns.',
    },
  },
  {
    id: 'carried-dish-expiry',
    kind: 'addition',
    afterStageId: 'initial',
    editorRole: 'loser',
    rule: 'A cooked dish expires after 600 simulation ticks continuously carried without delivery. Expiry removes the carried dish and increases failedOrders once. Delivering it before expiry still completes the order.',
    witness: {
      id: 'carried-dish-expires',
      criterion:
        'Hold a cooked dish without delivering it for 600 ticks; observe its removal and a single failedOrders increment, with no completedOrders increment for that dish.',
    },
  },
  {
    id: 'zombie-ingredient-drops',
    kind: 'addition',
    afterStageId: 'remix-1',
    editorRole: 'loser',
    rule: 'A zombie drops one usable ingredient when defeated by three successful shots. Every successful shot still applies the earlier knockback. Dropped ingredients can be collected, prepared, cooked and delivered using the existing pipeline; conveyor ingredients remain available.',
    witness: {
      id: 'zombie-drop-is-cookable',
      criterion:
        'Defeat a zombie with three shots and observe knockback before defeat and one ingredient drop. Collect, prepare, cook and deliver the drop; completedOrders increases and conveyor movement and delivery bell remain active.',
    },
  },
  {
    id: 'periodic-lights-out',
    kind: 'addition',
    afterStageId: 'remix-1',
    editorRole: 'winner',
    rule: 'Kitchen lights go out during ticks 600 through 719 of every 900-tick cycle. During darkness only threats within three world units of the player are visible, making aim harder. Movement, aiming, firing, pursuit, conveyor motion, cooking, delivery, bell spawns and dish expiry continue unchanged.',
    witness: {
      id: 'darkness-retains-simulation',
      criterion:
        'Cross ticks 599, 600, 719 and 720. Observe the lighting transitions and loss of distant threat visibility during darkness, while a nearby shot can still cause knockback and dish/conveyor/zombie state continues advancing.',
    },
  },
] as const;

const contributions = rules.map((contribution, ordinal) =>
  benchmarkContributionSchema.parse({
    ...contribution,
    ordinal,
    provenance: {
      source: {
        kind: 'authored-benchmark',
        reference: 'docs/party-generation-qualification.md',
      },
      forgeInterpretation: contribution.rule,
      userDecision: null,
    },
  }),
);

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) freezeDeep(nested);
    Object.freeze(value);
  }
  return value;
}

export const BENCHMARK_STAGES: readonly BenchmarkStage[] = freezeDeep(
  benchmarkStageIdSchema.options.map((stageId, index) => {
    const selected = contributions.slice(0, 3 + index * 2);
    return benchmarkStageSchema.parse({
      protocolVersion: QUALIFICATION_PROTOCOL_VERSION,
      id: stageId,
      parentStageId: index ? benchmarkStageIdSchema.options[index - 1] : null,
      contributions: selected,
      newContributionIds: selected
        .slice(index ? selected.length - 2 : 0)
        .map((contribution) => contribution.id),
      expectedWitnessIds: selected.map(
        (contribution) => contribution.witness.id,
      ),
    });
  }),
);

/** Explicit planning limits; these do not enforce a provider's eventual bill. */
export const qualificationBudgetSchema = z
  .strictObject({
    spendCeilingUsd: z.number().positive(),
    perJobSpendCeilingUsd: z.number().positive(),
    perJobSeconds: z.number().int().min(1).max(900),
    maxJobs: z.literal(3).default(3),
    maxRepairs: z.literal(0).default(0),
  })
  .refine(
    (budget) => budget.perJobSpendCeilingUsd <= budget.spendCeilingUsd,
    'Per-job spend cannot exceed the total spend ceiling',
  );
export type QualificationBudget = z.infer<typeof qualificationBudgetSchema>;
export function parseQualificationBudget(value: unknown): QualificationBudget {
  return qualificationBudgetSchema.parse(value);
}

export function buildBenchmarkPrompt(
  stageId: BenchmarkStageId,
  parentArtifactHash?: string,
): string {
  const parsedStageId = benchmarkStageIdSchema.parse(stageId);
  const stage = BENCHMARK_STAGES.find(
    (candidate) => candidate.id === parsedStageId,
  )!;
  if (stage.parentStageId) {
    z.string()
      .regex(/^sha256:[a-f0-9]{64}$/)
      .parse(parentArtifactHash);
  } else if (parentArtifactHash !== undefined) {
    throw new Error('The initial benchmark cannot have a parent artifact');
  }
  return [
    'Implement this authored PC-09A qualification scenario as a new playable game. The scenario is benchmark input, not observed gameplay or actual participant decisions. Winner/loser labels specify hypothetical benchmark edit roles only.',
    'This is separate from the production party-forge/1 preset contract. Do not select an unchanged preset, claim production compatibility, invent users, or emit accepted validation. Each contribution needs observable executable behavior.',
    stage.parentStageId
      ? `Evolve the retained parent candidate ${parentArtifactHash} from stage ${stage.parentStageId}. Its exact source must accompany this prompt; stop if it is missing. Preserve every previous contribution with its exact rule semantics and add exactly the two new contributions listed below. Retain the previous candidate separately.`
      : 'Create the initial combination of knockback FPS, pursuing zombies and conveyor cooking. Conveyor cooking is outside the authored production preset deck.',
    `Frozen replay policy: ${JSON.stringify(BENCHMARK_POLICY)}. No adaptive difficulty, wall-clock simulation, unseeded randomness or timing-dependent scoring. Use deterministic state updates once per step.`,
    'Return a single JSON object with exactly: protocolVersion, stageId, parentArtifactHash, source, witnessTraceProposals, completingTraceProposal. No Markdown fences. source is a self-contained plain JavaScript script, at most 262144 UTF-8 bytes. The whole JSON must be at most 4194304 UTF-8 bytes. No imports, external assets, dependencies or build step.',
    `Set protocolVersion=${JSON.stringify(QUALIFICATION_PROTOCOL_VERSION)}, stageId=${JSON.stringify(stage.id)}, parentArtifactHash=${JSON.stringify(parentArtifactHash ?? null)}.`,
    'The script exposes globalThis.forgeQualification with reset({seed, ticks}), input(frame), step(), snapshot(), isComplete(), score(), and render(canvas). reset initializes all mutable state. input takes the complete control state for the current tick; step advances exactly one tick. snapshot returns a detached JSON-serializable {tick, completed, completedOrders, failedOrders, state} including world positions, cooking/carry state and lighting needed to inspect behavior. score returns only {completedOrders, failedOrders}, both nonnegative integers. isComplete is false until the configured tick budget is exhausted, then true; a completing trace must complete at least one order within that budget.',
    'The pure reset/input/step/snapshot/isComplete/score methods have no DOM, network, storage, credentials, worker, timer, dynamic-code or process access. The render(canvas) method is a separate nonauthoritative visualization using only the provided canvas 2D context; it must not mutate simulation state or score. Render a playable first-person view and clear objective/controls for independent human inspection. Human input uses the same input(frame) path as replay.',
    'Every input frame is {tick,buttons,yaw,pitch}: tick is its zero-based ordered index; buttons is an integer bitmask 0..63 (forward=1, back=2, left=4, right=8, shoot=16, interact=32); yaw is radians within [-pi,pi], pitch within [-pi/2,pi/2]. Derive shooting and interaction edges from consecutive full frames. Each proposed trace contains exactly 3600 frames, one per tick, using the frozen seed after reset.',
    'witnessTraceProposals is one {contributionId,witnessId,frames} per contribution, with its exact required witness ID. completingTraceProposal is {frames}. Propose playable control traces that a separate isolated runner and reviewer can inspect; do not substitute messages, counters labeled as evidence, assertions, hashes, or self-reported pass status for actual behavior. Proposed traces and code are untrusted and are not qualification results. A schema inspector does not execute or accept them.',
    `Required cumulative stage:\n${JSON.stringify(stage, null, 2)}`,
  ].join('\n\n');
}
