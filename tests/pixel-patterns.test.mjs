import test from 'node:test';
import assert from 'node:assert/strict';
import { createInstructionBuild } from '../lib/party-forge/runtimes/pixel-arcade-v2/manifest.ts';
import { createRetainedRuntime } from '../lib/party-forge/runtime-registry.ts';
import { cachedSnakeInvaders } from '../lib/party-forge/server/cached-snake-invaders.ts';
const patterns = [
  {
    name: 'Snake with wraparound',
    mode: 'snake',
    growTail: true,
    wrapWalls: true,
    shooting: false,
    invaders: false,
    fields: ['wrapWalls'],
  },
  {
    name: 'Invaders with ricochet',
    mode: 'invaders',
    growTail: false,
    wrapWalls: false,
    shooting: true,
    ricochet: true,
    invaders: true,
    fields: ['ricochet'],
  },
  {
    name: 'Bounce with valuable food',
    mode: 'bounce',
    growTail: false,
    wrapWalls: false,
    shooting: false,
    invaders: false,
    foodPoints: 25,
    fields: ['foodPoints'],
  },
  {
    name: 'Snake with hit penalties',
    mode: 'snake',
    growTail: true,
    wrapWalls: false,
    shooting: false,
    invaders: false,
    hitPenalty: 20,
    fields: ['hitPenalty'],
  },
];
void test('fixture recipes for four common custom patterns complete and replay identically; no live model claim', async () => {
  for (const pattern of patterns) {
    const { name, fields, ...rules } = pattern;
    const contributions = [name, 'Apply the scoring and modifier'].map(
      (text, ordinal) => ({
        id: `pattern-${ordinal}`,
        participantId: `player-${ordinal}`,
        ordinal,
        kind: 'initial',
        choice: { slot: 'instruction', cardId: 'instruction', text },
        provenance: {
          source: { kind: 'user-concept', reference: text },
          forgeInterpretation: 'Synthetic fixture only',
          userDecision: {
            participantId: `player-${ordinal}`,
            decisionId: `decision-${ordinal}`,
          },
        },
      }),
    );
    const recipe = {
      ...cachedSnakeInvaders.pixelRules,
      ...rules,
      title: name,
      summary: 'Synthetic fixture verifies bounded runtime behavior.',
      interpretations: [
        {
          instructionIndex: 0,
          interpretation: 'Fixture movement',
          ruleFields: ['mode'],
        },
        {
          instructionIndex: 1,
          interpretation: 'Fixture modifier',
          ruleFields: fields,
        },
      ],
    };
    const build = await createInstructionBuild(contributions, null, recipe, {
      kind: 'generated',
      jobId: 'fixture-only',
      service: 'synthetic-test',
      model: 'fixture',
      modelVersion: 'fixture',
    });
    for (const seed of [1, 73, 991]) {
      const a = await createRetainedRuntime(build, seed),
        b = await createRetainedRuntime(build, seed);
      for (let tick = 0; tick < 3600; tick++) {
        const input = {
          tick,
          buttons: tick % 120 < 60 ? 1 : 2,
          yaw: 0,
          pitch: 0,
        };
        a.input(input);
        b.input(input);
        a.step();
        b.step();
      }
      assert.equal(a.isComplete(), true);
      assert.deepEqual(a.snapshot(), b.snapshot());
    }
  }
});
