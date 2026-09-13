import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEMO_POLICY,
  initialCardSchema,
  additionCardSchema,
  contributionHistorySchema,
} from '../lib/party-forge/contracts.ts';
import {
  BENCHMARK_POLICY,
  BENCHMARK_STAGES,
  QUALIFICATION_PROTOCOL_VERSION,
  benchmarkStageSchema,
  buildBenchmarkPrompt,
  parseQualificationBudget,
} from '../lib/party-forge/generation/benchmark.ts';

void test('qualification requires an initial mashup and two cumulative pairs of edits', () => {
  assert.deepEqual(
    BENCHMARK_STAGES.map((stage) => stage.contributions.length),
    [3, 5, 7],
  );
  assert.deepEqual(
    BENCHMARK_STAGES.map((stage) => stage.newContributionIds.length),
    [3, 2, 2],
  );
  for (let index = 0; index < BENCHMARK_STAGES.length; index++) {
    const stage = BENCHMARK_STAGES[index];
    assert.equal(benchmarkStageSchema.safeParse(stage).success, true);
    assert.equal(stage.protocolVersion, QUALIFICATION_PROTOCOL_VERSION);
    assert.equal(stage.expectedWitnessIds.length, stage.contributions.length);
    if (index) {
      const parent = BENCHMARK_STAGES[index - 1];
      assert.equal(stage.parentStageId, parent.id);
      assert.deepEqual(
        stage.contributions.slice(0, parent.contributions.length),
        parent.contributions,
      );
      assert.deepEqual(
        stage.contributions
          .slice(-2)
          .map((contribution) => contribution.editorRole),
        index === 1 ? ['winner', 'loser'] : ['loser', 'winner'],
      );
    }
  }
  assert.equal(BENCHMARK_POLICY.ticks, DEMO_POLICY.trialTicks);
  assert.equal(BENCHMARK_POLICY.ticksPerSecond, DEMO_POLICY.ticksPerSecond);
  assert.equal(BENCHMARK_POLICY.adaptation, 'off');
});

void test('benchmark attribution cannot masquerade as actual users or production manifests', () => {
  for (const stage of BENCHMARK_STAGES) {
    assert.equal(
      contributionHistorySchema.safeParse(stage.contributions).success,
      false,
    );
    for (const contribution of stage.contributions) {
      assert.equal(contribution.provenance.source.kind, 'authored-benchmark');
      assert.equal(contribution.provenance.userDecision, null);
      assert.equal(
        contribution.provenance.forgeInterpretation,
        contribution.rule,
      );
      assert.equal('participantId' in contribution, false);
    }
  }
  const falseAttribution = structuredClone(BENCHMARK_STAGES[0]);
  falseAttribution.contributions[0].provenance.userDecision = {
    participantId: 'alice',
    decisionId: 'choice-1',
  };
  assert.equal(benchmarkStageSchema.safeParse(falseAttribution).success, false);
  assert.equal(
    initialCardSchema.safeParse({ slot: 'cooking', cardId: 'conveyor-cooking' })
      .success,
    false,
  );
  assert.equal(
    additionCardSchema.safeParse('periodic-lights-out').success,
    false,
  );
});

void test('malformed stages cannot omit witnesses, reuse edit roles or skip a remix', () => {
  const invalid = [
    (stage) => {
      stage.expectedWitnessIds.pop();
    },
    (stage) => {
      stage.contributions.pop();
    },
    (stage) => {
      stage.newContributionIds = stage.newContributionIds.slice(0, 1);
    },
    (stage) => {
      stage.contributions[4].editorRole = 'winner';
    },
    (stage) => {
      stage.parentStageId = 'initial';
    },
    (stage) => {
      stage.contributions[6].witness.id = stage.contributions[5].witness.id;
    },
  ];
  for (const mutate of invalid) {
    const stage = structuredClone(BENCHMARK_STAGES[2]);
    mutate(stage);
    assert.equal(benchmarkStageSchema.safeParse(stage).success, false);
  }
});

void test('remix prompts preserve exact rules and require retained parent source without declaring success', () => {
  const hash = `sha256:${'a'.repeat(64)}`;
  for (const stage of BENCHMARK_STAGES) {
    const prompt = buildBenchmarkPrompt(
      stage.id,
      stage.parentStageId ? hash : undefined,
    );
    for (const contribution of stage.contributions) {
      assert.ok(prompt.includes(JSON.stringify(contribution.rule)));
      assert.ok(prompt.includes(contribution.witness.id));
    }
    assert.match(prompt, /are not qualification results/);
    assert.match(prompt, /does not execute or accept/);
    assert.match(prompt, /exactly 3600 frames/);
    assert.match(prompt, /globalThis\.forgeQualification/);
    assert.match(prompt, /completedOrders, failedOrders/);
    if (stage.parentStageId) {
      assert.match(
        prompt,
        /exact source must accompany this prompt; stop if it is missing/,
      );
      assert.ok(prompt.includes(hash));
    }
  }
  assert.throws(() => buildBenchmarkPrompt('remix-1'));
  assert.throws(() => buildBenchmarkPrompt('remix-2', 'not-a-hash'));
  assert.throws(() => buildBenchmarkPrompt('initial', hash));
  assert.throws(() => buildBenchmarkPrompt('remix-3', hash));
  assert.throws(() => {
    BENCHMARK_STAGES[2].contributions[0].rule = 'silently changed';
  }, TypeError);
});

void test('spend and duration limits must be explicit, finite and positive before preparation', () => {
  const valid = {
    spendCeilingUsd: 15,
    perJobSpendCeilingUsd: 5,
    perJobSeconds: 180,
  };
  assert.deepEqual(parseQualificationBudget(valid), {
    ...valid,
    maxJobs: 3,
    maxRepairs: 0,
  });
  for (const invalid of [
    {},
    { spendCeilingUsd: 5 },
    { perJobSeconds: 180 },
    { ...valid, spendCeilingUsd: 0 },
    { ...valid, spendCeilingUsd: -1 },
    { ...valid, spendCeilingUsd: Infinity },
    { ...valid, spendCeilingUsd: NaN },
    { ...valid, spendCeilingUsd: '5' },
    { ...valid, perJobSpendCeilingUsd: undefined },
    { ...valid, perJobSpendCeilingUsd: 0 },
    { ...valid, perJobSpendCeilingUsd: -1 },
    { ...valid, perJobSpendCeilingUsd: Infinity },
    { ...valid, perJobSpendCeilingUsd: 16 },
    { ...valid, perJobSeconds: 0 },
    { ...valid, perJobSeconds: 901 },
    { ...valid, perJobSeconds: 1.5 },
    { ...valid, maxJobs: 4 },
    { ...valid, maxRepairs: 1 },
    { ...valid, billGuaranteed: true },
  ])
    assert.throws(() => parseQualificationBudget(invalid));
});
