export const DEFAULT_DASH_GOAL =
  'Reward aggressive movement without increasing weapon damage.';

export const DASH_REFERENCE = {
  game: 'Returnal',
  implementation: 'Projectile-phasing dash',
  behavior:
    'Dash can cross defined projectiles during a bounded movement window.',
  origin: 'source',
} as const;

export const DASH_BASELINE = {
  id: 'timer',
  label: 'After 3 seconds',
  origin: 'forge-defined',
} as const;

export const DASH_RECHARGE_OPTIONS = [
  {
    id: 'elimination',
    label: 'On enemy elimination',
    risk: 'May create a win-more loop or leave a struggling player without recovery.',
  },
  {
    id: 'close-range-elimination',
    label: 'On close-range elimination',
    risk: 'May over-reward an already dominant aggressive strategy.',
  },
  {
    id: 'projectile-crossing',
    label: 'After a successful projectile crossing',
    risk: 'May become self-refreshing if one dash crosses several hazards.',
  },
] as const;

export type DashRechargeOptionId = (typeof DASH_RECHARGE_OPTIONS)[number]['id'];

export const DASH_LOCKED_CONDITIONS = [
  { field: 'Dash distance', value: '6 meters' },
  { field: 'Protected window', value: '220 milliseconds' },
  { field: 'Player speed', value: 'Matched' },
  { field: 'Weapon damage', value: 'Matched' },
  { field: 'Arena and enemies', value: 'Matched' },
  { field: 'Encounter seed', value: 'Matched' },
  { field: 'Run duration', value: '45 seconds' },
] as const;

export type DashExperiment = ReturnType<typeof buildDashExperiment>;

export function getDashRechargeOption(id: DashRechargeOptionId) {
  return DASH_RECHARGE_OPTIONS.find((option) => option.id === id)!;
}

export function buildDashExperiment(
  goal = DEFAULT_DASH_GOAL,
  mutationId: DashRechargeOptionId = 'elimination',
) {
  const mutation = getDashRechargeOption(mutationId);

  return {
    schemaVersion: '0.1.0',
    title: 'Dash aggression loop',
    goal: goal.trim() || DEFAULT_DASH_GOAL,
    reference: DASH_REFERENCE,
    hypothesis: `Changing dash recharge from “${DASH_BASELINE.label}” to “${mutation.label}” will increase forward pressure without increasing weapon damage.`,
    changedRules: [
      {
        field: 'Dash recharge',
        control: DASH_BASELINE,
        mutation: {
          id: mutation.id,
          label: mutation.label,
          origin: 'user-decision',
        },
      },
    ],
    lockedConditions: DASH_LOCKED_CONDITIONS,
    risks: [
      mutation.risk,
      'The reference behavior is preserved, but neither recharge rule is attributed to Returnal.',
    ],
    evidencePlan: [
      'forward-pressure time',
      'dash attempts',
      'successful projectile crossings',
      'eliminations',
      'damage taken',
      'deaths and restarts',
      'completion time',
    ],
  } as const;
}

export function serializeDashExperimentJson(experiment: DashExperiment) {
  return `${JSON.stringify(experiment, null, 2)}\n`;
}

export function serializeDashExperimentMarkdown(experiment: DashExperiment) {
  const changedRule = experiment.changedRules[0];

  return [
    `# ${experiment.title}`,
    '',
    `**Goal:** ${experiment.goal}`,
    '',
    `**Hypothesis:** ${experiment.hypothesis}`,
    '',
    '## Reference boundary',
    '',
    `- From the source: ${experiment.reference.game} — ${experiment.reference.behavior}`,
    `- Experiment baseline: ${changedRule.control.label} (Forge-defined)`,
    `- Your decision: ${changedRule.mutation.label}`,
    '',
    '## One-rule change',
    '',
    `- ${changedRule.field}: ${changedRule.control.label} → ${changedRule.mutation.label}`,
    '',
    '## Locked conditions',
    '',
    ...experiment.lockedConditions.map(
      (condition) => `- ${condition.field}: ${condition.value}`,
    ),
    '',
    '## Risks',
    '',
    ...experiment.risks.map((risk) => `- ${risk}`),
    '',
    '## Evidence plan',
    '',
    ...experiment.evidencePlan.map((metric) => `- ${metric}`),
    '',
  ].join('\n');
}
