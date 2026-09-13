import {
  DEMO_POLICY,
  inputFrameSchema,
  trialInputSchema,
  type BuildManifest,
  type PartyRuntime,
  type RuntimeInput,
  type RuntimeSnapshot,
  type TrialInput,
} from '../../contracts.ts';
import { loadBuild } from '../../validate-build.ts';
import { canonicalJson, freezeJson } from './integrity.ts';
import {
  createRuntime,
  replayRuntime,
  snapshotRuntime,
  stepRuntime,
  type KitchenSnapshot,
} from './retained/engine.js';

/** Shared PC-01 envelope with the concrete, detached Kitchen Chaos render data. */
export interface KitchenPartySnapshot extends RuntimeSnapshot {
  state: Readonly<KitchenSnapshot>;
}

export interface KitchenPartyRuntime extends PartyRuntime {
  reset(manifest: BuildManifest, seed: number): KitchenPartySnapshot;
  step(): KitchenPartySnapshot;
  snapshot(): KitchenPartySnapshot;
}

/**
 * Verify a retained manifest once, then expose PC-01's synchronous step contract.
 * Loading another build requires another async factory call; reset cannot swap
 * executable bytes or bypass manifest verification. Room authority remains
 * responsible for attempt continuity, frozen rounds, identity and deadlines.
 */
export async function createPartyRuntime(
  manifest: unknown,
  seed: number,
): Promise<KitchenPartyRuntime> {
  const { build, recipe } = await loadBuild(manifest);
  const boundManifest = canonicalJson(build);
  let current = createRuntime(recipe, seed);
  let pending: RuntimeInput | null = null;

  function assertBoundManifest(candidate: BuildManifest) {
    if (canonicalJson(candidate) !== boundManifest) {
      throw new Error('This runtime is bound to its already verified manifest');
    }
  }

  function snapshot(): KitchenPartySnapshot {
    const state = snapshotRuntime(current);
    return freezeJson({
      tick: state.tick,
      completed: state.status === 'complete',
      completedOrders: state.metrics.completedOrders,
      failedOrders: state.metrics.failedOrders,
      state,
    });
  }

  return Object.freeze({
    reset(candidate: BuildManifest, nextSeed: number): KitchenPartySnapshot {
      assertBoundManifest(candidate);
      // Construct before replacing either field: a rejected seed leaves the
      // current attempt and its pending frame untouched.
      const next = createRuntime(recipe, nextSeed);
      current = next;
      pending = null;
      return snapshot();
    },

    input(frame: RuntimeInput): void {
      if (pending !== null) throw new Error('Consume the pending input before supplying another frame');
      if (current.status === 'complete') throw new Error('This runtime trial is already complete');
      const parsed = inputFrameSchema.parse(frame);
      if (parsed.tick !== current.tick) throw new RangeError('Input must match the next simulation tick');
      // Zod returns a detached object; caller mutations cannot rewrite a queued
      // frame between input() and step().
      pending = parsed;
    },

    step(): KitchenPartySnapshot {
      if (pending === null) throw new Error('Exactly one captured input frame is required before stepping');
      const next = stepRuntime(current, pending);
      current = next;
      pending = null;
      return snapshot();
    },

    snapshot,

    isComplete(): boolean {
      return current.status === 'complete';
    },

    validateScore(candidate: BuildManifest, trial: TrialInput) {
      assertBoundManifest(candidate);
      const serialized = JSON.stringify(trial);
      if (!serialized || new TextEncoder().encode(serialized).byteLength > DEMO_POLICY.maxTraceBytes) {
        throw new RangeError('Trial exceeds the bounded input envelope');
      }
      const input = trialInputSchema.parse(trial);
      if (input.buildId !== build.buildId || input.buildHash !== build.contentHash) {
        throw new Error('Trial build does not match the retained executable manifest');
      }
      // Independent replay starts at tick 0, with the trace's declared seed.
      // This neither trusts nor changes the local presentation attempt.
      const final = replayRuntime(recipe, input.seed, input.frames);
      return {
        completedOrders: final.metrics.completedOrders,
        failedOrders: final.metrics.failedOrders,
      };
    },
  });
}
