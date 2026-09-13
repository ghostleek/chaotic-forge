import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  BENCHMARK_STAGES,
  QUALIFICATION_PROTOCOL_VERSION,
} from '../../lib/party-forge/generation/benchmark.ts';
import { replayCandidate } from '../../lib/party-forge/generation/browser-replay.mjs';

// Explicitly authored fixtures exercise the runner only, never generation quality.
function candidate(source) {
  const frames = Array.from({ length: 3600 }, (_, tick) => ({
    tick,
    buttons: 0,
    yaw: 0,
    pitch: 0,
  }));
  return Buffer.from(
    JSON.stringify({
      protocolVersion: QUALIFICATION_PROTOCOL_VERSION,
      stageId: 'initial',
      parentArtifactHash: null,
      source,
      witnessTraceProposals: BENCHMARK_STAGES[0].contributions.map((item) => ({
        contributionId: item.id,
        witnessId: item.witness.id,
        frames,
      })),
      completingTraceProposal: { frames },
    }),
  );
}
const fixture = `
(() => {
  let tick, ticks, order, lastFrame;
  globalThis.forgeQualification = {
    reset(policy) { tick = 0; ticks = policy.ticks; order = 0; lastFrame = null; },
    input(frame) { lastFrame = frame.tick; },
    step() { if (lastFrame !== tick) throw new Error('unordered frame'); tick++; if (tick === 60) order = 1; },
    snapshot() { return { tick, completed: tick === ticks, completedOrders: order, failedOrders: 0, state: { player: { x: tick, y: 0 }, lighting: tick % 900 < 600 || tick % 900 > 719 } }; },
    isComplete() { return tick === ticks; },
    score() { return { completedOrders: order, failedOrders: 0 }; },
    render(canvas) { canvas.getContext('2d').fillRect(0, 0, 20, 20); },
  };
})();`;

test(
  'authored replay repeats all proposals, hashes full states and samples transitions without accepting behavior',
  { timeout: 40_000 },
  async () => {
    const result = await replayCandidate({
      candidateBytes: candidate(fixture),
      expectedStage: 'initial',
    });
    assert.equal(result.status, 'replayed-unverified');
    assert.equal(result.deterministic, true);
    assert.equal(result.completingTraceHasOrder, true);
    assert.equal(result.traces.length, 4);
    assert.equal(result.memoryLimitQualified, false);
    assert.equal(result.osNetworkIsolationQualified, false);
    assert.equal(result.behavioralAcceptance, false);
    assert.equal(result.sourceExecutedInNode, false);
    assert.equal(result.chromiumSandbox, true);
    for (const trace of result.traces) {
      assert.equal(trace.first.stateHash, trace.repeat.stateHash);
      assert.equal(trace.first.stateHash, trace.resetRepeat.stateHash);
      assert.equal(trace.freshInitializationDeterministic, true);
      assert.equal(trace.resetDeterministic, true);
      assert.deepEqual(trace.first.score, {
        completedOrders: 1,
        failedOrders: 0,
      });
      for (const tick of [0, 60, 599, 600, 719, 720, 3600])
        assert.ok(
          trace.first.samples.some((snapshot) => snapshot.tick === tick),
        );
    }
    assert.throws(() => process.kill(result.browserPid, 0), { code: 'ESRCH' });
  },
);

test(
  'authored source infinite loop is killed by the Node wall clock outside the renderer',
  { timeout: 15_000 },
  async () => {
    const started = performance.now();
    await assert.rejects(
      replayCandidate({
        candidateBytes: candidate('while (true) {}'),
        expectedStage: 'initial',
        wallTimeMs: 4_000,
      }),
      (error) => {
        assert.match(error.message, /wall-time limit/);
        assert.ok(Number.isInteger(error.browserPid));
        assert.throws(() => process.kill(error.browserPid, 0), {
          code: 'ESRCH',
        });
        return true;
      },
    );
    assert.ok(performance.now() - started < 8_000);
  },
);

test(
  'authored fixture with oversized snapshot fails instead of crossing the output boundary',
  { timeout: 15_000 },
  async () => {
    const source = fixture.replace(
      'player: { x: tick, y: 0 }',
      "player: { x: tick, y: 0 }, oversized: 'x'.repeat(65537)",
    );
    await assert.rejects(
      replayCandidate({
        candidateBytes: candidate(source),
        expectedStage: 'initial',
        wallTimeMs: 10_000,
      }),
      /Snapshot string limit exceeded/,
    );
  },
);

test(
  'authored fixture with score-changing render fails qualification replay',
  { timeout: 15_000 },
  async () => {
    const source = fixture.replace(
      'render(canvas) { canvas',
      'render(canvas) { order++; canvas',
    );
    await assert.rejects(
      replayCandidate({
        candidateBytes: candidate(source),
        expectedStage: 'initial',
        wallTimeMs: 10_000,
      }),
      /Render changed initial simulation state/,
    );
  },
);

test(
  'observer uses captured serialization after authored source poisons JSON and inherited toJSON',
  { timeout: 20_000 },
  async () => {
    const source =
      fixture +
      `
    JSON.stringify = () => 'forged';
    Object.prototype.toJSON = () => ({forged: true});
    Array.prototype.toJSON = () => ['forged'];
  `;
    const result = await replayCandidate({
      candidateBytes: candidate(source),
      expectedStage: 'initial',
      wallTimeMs: 15_000,
    });
    assert.equal(result.deterministic, true);
    assert.equal(result.traces[0].first.samples[0].tick, 0);
    assert.equal(result.traces[0].first.samples.at(-1).tick, 3600);
    assert.equal(result.traces[0].first.score.completedOrders, 1);
  },
);

test(
  'source initialization error after defining a runtime remains a replay failure',
  { timeout: 20_000 },
  async () => {
    await assert.rejects(
      replayCandidate({
        candidateBytes: candidate(
          fixture + '\nthrow new Error("authored initialization error");',
        ),
        expectedStage: 'initial',
        wallTimeMs: 15_000,
      }),
      /Candidate browser error: authored initialization error/,
    );
  },
);

test(
  'startup Math.random state is rejected by fresh source initialization even when reset repeats match',
  { timeout: 30_000 },
  async () => {
    const source = fixture
      .replace(
        '  let tick, ticks, order, lastFrame;',
        '  const startupRandom = Math.random();\n  let tick, ticks, order, lastFrame;',
      )
      .replace(
        'player: { x: tick, y: 0 }',
        'startupRandom, player: { x: tick, y: 0 }',
      );
    const result = await replayCandidate({
      candidateBytes: candidate(source),
      expectedStage: 'initial',
      wallTimeMs: 25_000,
    });
    assert.equal(result.deterministic, false);
    for (const trace of result.traces) {
      assert.equal(trace.resetDeterministic, true);
      assert.equal(trace.freshInitializationDeterministic, false);
      assert.notEqual(trace.first.stateHash, trace.repeat.stateHash);
    }
  },
);

test(
  'incomplete reset remains detectable despite clean state after fresh source initialization',
  { timeout: 30_000 },
  async () => {
    const source = fixture
      .replace(
        '  let tick, ticks, order, lastFrame;',
        '  let resetCount = 0;\n  let tick, ticks, order, lastFrame;',
      )
      .replace('reset(policy) { tick', 'reset(policy) { resetCount++; tick')
      .replace(
        'player: { x: tick, y: 0 }',
        'resetCount, player: { x: tick, y: 0 }',
      );
    const result = await replayCandidate({
      candidateBytes: candidate(source),
      expectedStage: 'initial',
      wallTimeMs: 25_000,
    });
    assert.equal(result.deterministic, false);
    for (const trace of result.traces) {
      assert.equal(trace.resetDeterministic, false);
      assert.equal(trace.freshInitializationDeterministic, true);
      assert.notEqual(trace.first.stateHash, trace.resetRepeat.stateHash);
    }
  },
);

test(
  'rebinding globalThis cannot replace the observer with forged output when no runtime exists',
  { timeout: 15_000 },
  async () => {
    const source = `
    const original = globalThis;
    const key = Object.getOwnPropertyNames(original).find(k => k.startsWith('__forgeObserver'));
    const forged = JSON.stringify({stateHash:'sha256:' + 'a'.repeat(64), fullTraceBytes:0, score:{completedOrders:1,failedOrders:0}, complete:true, samples:[]});
    original.globalThis = new Proxy({}, {get(_, property) {return property === key ? () => forged : Reflect.get(original, property);}});
  `;
    await assert.rejects(
      replayCandidate({
        candidateBytes: candidate(source),
        expectedStage: 'initial',
        wallTimeMs: 10_000,
      }),
      /Missing forgeQualification runtime/,
    );
  },
);
