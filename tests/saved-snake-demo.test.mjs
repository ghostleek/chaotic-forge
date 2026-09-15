import { test } from 'node:test';
import assert from 'node:assert/strict';
import { savedSnakeInvadersBuild } from '../lib/party-forge/demos/saved-snake-invaders.ts';
import { cachedSnakeInvaders } from '../lib/party-forge/server/cached-snake-invaders.ts';
import { createRetainedRuntime } from '../lib/party-forge/runtime-registry.ts';
import { SAVED_SNAKE_SEED } from '../lib/party-forge/demos/saved-snake-seed.ts';

void test('public demo reuses the saved recipe, provenance and retained party runtime', async () => {
  const build = await savedSnakeInvadersBuild();
  assert.deepEqual(build.pixelRules, cachedSnakeInvaders.pixelRules);
  assert.equal(build.origin.jobId, cachedSnakeInvaders.origin.jobId);
  assert.equal(build.origin.reuse.sourceBuildId, cachedSnakeInvaders.buildId);
  assert.equal(build.runtime.version, 'pixel-arcade-v2');
  const a = await createRetainedRuntime(build, SAVED_SNAKE_SEED);
  const b = await createRetainedRuntime(
    await savedSnakeInvadersBuild(),
    SAVED_SNAKE_SEED,
  );
  assert.equal(a.snapshot().state.lives, 3);
  for (let tick = 0; tick < 3600; tick++) {
    const frame = { tick, buttons: tick < 60 ? 4 : 0, yaw: 0, pitch: 0 };
    a.input(frame);
    b.input(frame);
    assert.deepEqual(a.step(), b.step());
    if (tick === 0) {
      assert.equal(
        a.snapshot().state.shots[0].dx,
        -1,
        'auto-fire follows steering without Space',
      );
      assert.equal(a.snapshot().state.shots[0].dy, 0);
    }
  }
});
