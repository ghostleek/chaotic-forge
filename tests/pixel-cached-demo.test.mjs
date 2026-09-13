import assert from 'node:assert/strict';
import { test } from 'node:test';
import { performance } from 'node:perf_hooks';
import { cachedInstructionDemo } from '../lib/party-forge/server/cached-instruction-demo.ts';
import { resolveInstructionRequest } from '../lib/party-forge/server/pixel-generation.ts';
import { createRetainedRuntime } from '../lib/party-forge/runtime-registry.ts';
import { contributionHistorySchema } from '../lib/party-forge/contracts.ts';
function cards(titles) {
  return titles.map((text, ordinal) => ({
    id: `card-${ordinal}`,
    participantId: `player-${ordinal}`,
    ordinal,
    kind: 'initial',
    choice: { slot: 'instruction', cardId: 'instruction', text },
    provenance: {
      source: { kind: 'user-concept', reference: text },
      forgeInterpretation: 'Awaiting generated interpretation',
      userDecision: {
        participantId: `player-${ordinal}`,
        decisionId: `decision-${ordinal}`,
      },
    },
  }));
}
void test('cached pair works in either order without database or model access', async () => {
  for (const titles of [
    ['Snake', 'Space Invaders'],
    ['  SPACE  INVADERS ', 'snake'],
    ['Space invader', 'SNAKES'],
    ['snakes', 'space invader'],
    ['SPACE-INVADER!', 'Snake'],
    ['Space invader', 'Snake', 'SNAKES'],
  ]) {
    const contributions = cards(titles);
    const started = performance.now();
    const result = await resolveInstructionRequest(
      { contributions },
      {
        prepare() {
          throw new Error('Cache must not access generation jobs');
        },
      },
      'cache-room',
    );
    assert.equal(result.status, 'playable');
    const build = result.manifest;
    assert.equal(build.origin.reuse.kind, 'cached-demo');
    assert.equal(
      build.origin.jobId,
      'resp_0f3e85ea9a091678016aa655c219dc87d0ad0522dfff422a99',
    );
    assert.deepEqual(
      build.contributions,
      contributionHistorySchema.parse(contributions),
    );
    for (const [index, title] of titles.entries()) {
      const field = /^snakes?$/.test(title.trim().toLowerCase())
        ? 'growTail'
        : 'invaders';
      assert.ok(
        build.pixelRules.interpretations
          .find((i) => i.instructionIndex === index)
          .ruleFields.includes(field),
      );
    }
    const runtime = await createRetainedRuntime(build, 73);
    for (let tick = 0; tick < 3600; tick++) {
      runtime.input({ tick, buttons: 0, yaw: 0, pitch: 0 });
      runtime.step();
    }
    assert.equal(runtime.isComplete(), true);
    assert.ok(runtime.snapshot().state.metrics.invaderHits > 0);
    console.log(
      `Cached build and full replay: ${Math.round(performance.now() - started)}ms`,
    );
  }
});
void test('audio and rhythm requests are blocked before a generation job is accessed', async () => {
  for (const instruction of [
    'Add AUDIO',
    'Sound turns off every 5 seconds',
    'taptap revenge',
    'Tap Tap Revenge',
    'dance dance revlution',
    'Dance Dance Revolution',
    'DDR',
    'Add music',
    'Rhythm lanes',
  ]) {
    const result = await resolveInstructionRequest(
      { contributions: cards(['Snake', instruction]) },
      {
        prepare() {
          throw new Error('Unsupported cards must not access model jobs');
        },
      },
      'blocked-room',
    );
    assert.equal(result.status, 'incompatible');
    assert.match(result.reason, /Rewrite your card/);
    assert.match(result.reason, /No AI request was made/);
  }
});
void test('new mechanic terms enter normal generation instead of the demo cache', async () => {
  let lookups = 0;
  const db = {
    prepare() {
      lookups++;
      return {
        bind() {
          return {
            async first() {
              return {
                status: 'failed',
                result: JSON.stringify({ reason: 'Normal generation path' }),
              };
            },
          };
        },
      };
    },
  };
  for (const instruction of [
    'Snake with wrapping',
    'Snake with more food',
    'Snake and tap to shoot',
  ]) {
    const result = await resolveInstructionRequest(
      { contributions: cards([instruction, 'Space invader']) },
      db,
      'custom-room',
    );
    assert.equal(result.status, 'incompatible');
    assert.equal(result.reason, 'Normal generation path');
  }
  assert.equal(lookups, 3);
});
void test('custom modifiers, extra players and different references never reuse the pair cache', async () => {
  for (const titles of [
    ['Snake with wrapping', 'Space Invaders'],
    ['Snake', 'Bounce'],
    ['Snake', 'Space Invaders', 'More food'],
  ])
    assert.equal(await cachedInstructionDemo(cards(titles)), null);
});
void test('every two/three-player saved-pair permutation replays deterministically without paid work', async () => {
  const titles = ['Snake', 'Space Invaders'];
  for (const count of [2, 3])
    for (let mask = 1; mask < (1 << count) - 1; mask++) {
      const selections = Array.from(
        { length: count },
        (_, i) => titles[(mask >> i) & 1],
      );
      const result = await resolveInstructionRequest(
        { contributions: cards(selections) },
        {
          prepare() {
            throw new Error('No paid tool call allowed');
          },
        },
        'permutation-room',
      );
      assert.equal(result.status, 'playable');
      for (const seed of [1, 73, 991]) {
        const a = await createRetainedRuntime(result.manifest, seed);
        const b = await createRetainedRuntime(result.manifest, seed);
        for (let tick = 0; tick < 3600; tick++) {
          const frame = {
            tick,
            buttons: tick % 240 < 120 ? 1 : 2,
            yaw: 0,
            pitch: 0,
          };
          a.input(frame);
          b.input(frame);
          a.step();
          b.step();
        }
        assert.deepEqual(a.snapshot(), b.snapshot());
        assert.equal(a.isComplete(), true);
      }
    }
});
