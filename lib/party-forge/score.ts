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
  if (build.buildId !== input.buildId || build.contentHash !== input.buildHash) {
    throw new Error('Trial build does not match the retained executable manifest');
  }
  const runtime = await createRetainedRuntime(build, input.seed);
  const score = runtime.validateScore(build, input);
  return {
    attemptId: input.attemptId,
    traceHash: await hashValue(input),
    completedOrders: score.completedOrders,
    failedOrders: score.failedOrders,
  };
}
