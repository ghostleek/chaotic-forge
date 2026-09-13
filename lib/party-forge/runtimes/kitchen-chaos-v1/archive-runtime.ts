import {
  buildManifestSchema,
  contributionHistorySchema,
  inputFrameSchema,
  trialInputSchema,
  type BuildManifest,
  type PartyRuntime,
  type RuntimeInput,
  type RuntimeSnapshot,
  type TrialInput,
} from '../../contracts.ts';
import policy from './archive-policy.json' with { type: 'json' };
import certificate from './qualification.json' with { type: 'json' };
import { canonicalJson, freezeJson, hashValue } from './integrity.ts';
import {
  createRuntime,
  replayRuntime,
  snapshotRuntime,
  stepRuntime,
  type KitchenRecipe,
  type KitchenSnapshot,
} from './retained/engine.js';

/** Released v1 policy. New defaults must never replace this policy or executable. */
export const ARCHIVE_POLICY = freezeJson(policy);
type Contribution = BuildManifest['contributions'][number];
const effects: Record<string, { ruleId: string; parameters: Record<string, number>; explanation: string }> = policy.effects;
const objectives: Record<string, string> = policy.objectives;
const qualifications: Record<string, { completingTraceHash: string; witnesses: Record<string, string> }> = certificate.recipes;

function archivedRecipe(contributions: Contribution[]): KitchenRecipe {
  const initial = contributions.filter((entry) => entry.kind === 'initial');
  return {
    fps: initial.find((entry) => entry.choice.slot === 'fps')!.choice.cardId as KitchenRecipe['fps'],
    zombies: initial.find((entry) => entry.choice.slot === 'zombies')!.choice.cardId as KitchenRecipe['zombies'],
    cooking: initial.find((entry) => entry.choice.slot === 'cooking')!.choice.cardId as KitchenRecipe['cooking'],
    additions: contributions.filter((entry) => entry.kind === 'addition').map((entry) => entry.cardId),
  };
}

function archivedDescriptor(contributions: Contribution[], parent: BuildManifest['parent']) {
  const recipe = archivedRecipe(contributions);
  if (certificate.runtimeHash !== policy.manifest.runtime.hash || certificate.externalPlayEvidence !== false ||
      certificate.provenance !== 'authored-automated-local-qualification') {
    throw new Error('The retained v1 qualification does not match its executable');
  }
  const key = [recipe.fps, recipe.zombies, recipe.cooking, ...[...recipe.additions].sort()].join('|');
  const evidence = qualifications[key];
  if (!evidence) throw new Error('This effect set has no retained v1 executable qualification');
  return {
    ...policy.manifest, parent, contributions,
    effects: contributions.map((contribution) => {
      const card = contribution.kind === 'initial' ? contribution.choice.cardId : contribution.cardId;
      const effect = effects[card];
      if (!effect) throw new Error('This card has no retained v1 descriptor');
      return { contributionId: contribution.id, ...effect };
    }),
    objective: objectives[`${recipe.cooking}|${recipe.additions.includes('hot-potato') ? 'hot-potato' : 'standard'}`],
    validation: {
      status: 'accepted', validatorVersion: policy.validatorVersion,
      completingTraceHash: evidence.completingTraceHash,
      witnesses: contributions.map((contribution) => {
        const key = contribution.kind === 'initial' ? contribution.choice.slot : contribution.cardId;
        const traceHash = evidence.witnesses[key];
        if (!traceHash) throw new Error('A retained v1 contribution witness is missing');
        return { contributionId: contribution.id, traceHash };
      }),
      limitations: policy.limitations,
    },
  };
}

/** Validate saved bytes against their released descriptor, never today's resolver. */
export async function loadArchiveBuild(value: unknown): Promise<{ build: BuildManifest; recipe: KitchenRecipe }> {
  const build = buildManifestSchema.parse(value);
  const { buildId, contentHash, ...payload } = build;
  if (canonicalJson(payload) !== canonicalJson(archivedDescriptor(build.contributions, build.parent))) {
    throw new Error('Unsupported or altered retained v1 runtime, assets, rule parameters, or provenance mode');
  }
  const expectedHash = await hashValue(payload);
  if (expectedHash !== contentHash || buildId !== `kc-${expectedHash.slice(7)}`) throw new Error('Manifest content hash mismatch');
  return freezeJson({ build, recipe: archivedRecipe(build.contributions) });
}

/** Explicit saved-source fork construction uses the same retained v1 policy. */
export async function createArchiveBuild(value: unknown, parent: BuildManifest['parent']): Promise<BuildManifest> {
  const contributions = contributionHistorySchema.parse(value);
  const descriptor = archivedDescriptor(contributions, parent);
  const contentHash = await hashValue(descriptor);
  return (await loadArchiveBuild({ ...descriptor, contentHash, buildId: `kc-${contentHash.slice(7)}` })).build;
}

export interface ArchiveRuntimeSnapshot extends RuntimeSnapshot {
  state: Readonly<KitchenSnapshot>;
}
export interface ArchiveRuntime extends PartyRuntime {
  reset(manifest: BuildManifest, seed: number): ArchiveRuntimeSnapshot;
  step(): ArchiveRuntimeSnapshot;
  snapshot(): ArchiveRuntimeSnapshot;
}

/** Version-owned adapter: v1 reset, input, replay and validation survive new defaults. */
export async function createArchiveRuntime(value: unknown, seed: number): Promise<ArchiveRuntime> {
  const { build, recipe } = await loadArchiveBuild(value);
  const boundManifest = canonicalJson(build);
  let current = createRuntime(recipe, seed);
  let pending: RuntimeInput | null = null;
  const assertBound = (candidate: BuildManifest) => {
    if (canonicalJson(candidate) !== boundManifest) throw new Error('This runtime is bound to its already verified manifest');
  };
  function snapshot(): ArchiveRuntimeSnapshot {
    const state = snapshotRuntime(current);
    return freezeJson({ tick: state.tick, completed: state.status === 'complete',
      completedOrders: state.metrics.completedOrders, failedOrders: state.metrics.failedOrders, state });
  }
  return Object.freeze({
    reset(candidate: BuildManifest, nextSeed: number) {
      assertBound(candidate);
      const next = createRuntime(recipe, nextSeed);
      current = next;
      pending = null;
      return snapshot();
    },
    input(frame: RuntimeInput) {
      if (pending !== null) throw new Error('Consume the pending input before supplying another frame');
      if (current.status === 'complete') throw new Error('This runtime trial is already complete');
      const parsed = inputFrameSchema.parse(frame);
      if (parsed.tick !== current.tick) throw new RangeError('Input must match the next simulation tick');
      pending = parsed;
    },
    step() {
      if (pending === null) throw new Error('Exactly one captured input frame is required before stepping');
      current = stepRuntime(current, pending);
      pending = null;
      return snapshot();
    },
    snapshot,
    isComplete: () => current.status === 'complete',
    validateScore(candidate: BuildManifest, trial: TrialInput) {
      assertBound(candidate);
      const serialized = JSON.stringify(trial);
      if (!serialized || new TextEncoder().encode(serialized).byteLength > policy.maxTraceBytes) throw new RangeError('Trial exceeds the bounded input envelope');
      const input = trialInputSchema.parse(trial);
      if (input.buildId !== build.buildId || input.buildHash !== build.contentHash || input.frames.length !== policy.trialTicks) {
        throw new Error('Trial build does not match the retained executable manifest');
      }
      const final = replayRuntime(recipe, input.seed, input.frames);
      return { completedOrders: final.metrics.completedOrders, failedOrders: final.metrics.failedOrders };
    },
  });
}
