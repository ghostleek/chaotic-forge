import { DEMO_POLICY, buildManifestSchema, parseTrialForRound, type FrozenRound } from './contracts.ts';
import { createRetainedRuntime } from './runtime-registry.ts';
import { hashValue } from './runtimes/kitchen-chaos-v1/integrity.ts';

/** Recompute from an entire bounded trace. Identity/deadlines/idempotency belong to PC-03. */
export async function scoreTrial(manifest: unknown, round: FrozenRound, trial: unknown) {
  const serialized = JSON.stringify(trial);
  if (!serialized || new TextEncoder().encode(serialized).byteLength > DEMO_POLICY.maxTraceBytes) {
    throw new RangeError('Trial exceeds the bounded input envelope');
  }
  const build = buildManifestSchema.parse(manifest);
  const input = parseTrialForRound(trial, round);
  if (build.buildId !== input.buildId || build.contentHash !== input.buildHash || build.scoringVersion !== round.scoringVersion) {
    throw new Error('Trial build does not match the retained executable manifest');
  }
  const runtime = await createRetainedRuntime(build, input.seed);
  let score;
  if (input.endedEarly) {
    if (build.runtime.version !== 'pixel-arcade-v2') throw new Error('This runtime requires a complete timed trace');
    for (const frame of input.frames) {
      if (runtime.snapshot().state.gameOver === true) throw new Error('Early trace must stop at elimination');
      runtime.input(frame);runtime.step();
    }
    const end = runtime.snapshot();
    if (end.state.gameOver !== true || end.state.lives !== 0 || end.hits !== 3) throw new Error('An early finish requires three replay-verified collisions');
    score = {completedOrders: 0, failedOrders: 0, points: end.points, hits: end.hits};
  } else score = runtime.validateScore(build, input);
  return {
    attemptId: input.attemptId,
    traceHash: await hashValue(input),
    ...score,
  };
}
