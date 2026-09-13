import { buildManifestSchema, DEMO_POLICY, inputFrameSchema, type BuildManifest } from './contracts.ts';
import { cardIdFor, recipeFromContributions, type Contribution } from './cards.ts';
import { replayRuntime, type KitchenRecipe, type InputFrame } from './runtimes/kitchen-chaos-v1/retained/engine.js';
import { canonicalJson, freezeJson, hashValue } from './runtimes/kitchen-chaos-v1/integrity.ts';
import { buildDescriptor, VALIDATOR_VERSION, QUALIFICATION_LIMITATIONS } from './runtimes/kitchen-chaos-v1/manifest.ts';
import { RUNTIME_RESOURCE } from './runtimes/kitchen-chaos-v1/manifest.ts';
import certificate from './runtimes/kitchen-chaos-v1/qualification.json' with { type: 'json' };

export type Qualification = {
  seed: number;
  completingFrames: InputFrame[];
  witnesses: { contributionId: string; frames: InputFrame[] }[];
};

/** Build-time evidence retained with this exact executable; never used as player results. */
export function retainedQualification(recipe: KitchenRecipe, contributions: Contribution[]): BuildManifest['validation'] {
  if (certificate.runtimeHash !== RUNTIME_RESOURCE.hash || certificate.externalPlayEvidence !== false ||
      certificate.provenance !== 'authored-automated-local-qualification') throw new Error('Retained qualification does not match the executable');
  const key = [recipe.fps, recipe.zombies, recipe.cooking, ...[...recipe.additions].sort()].join('|');
  const recipes: Record<string, { completingTraceHash: string; witnesses: Record<string, string> }> = certificate.recipes;
  const evidence = recipes[key];
  if (!evidence) throw new Error('This effect set has no retained executable qualification');
  return {
    status: 'accepted', validatorVersion: VALIDATOR_VERSION, completingTraceHash: evidence.completingTraceHash,
    witnesses: contributions.map(contribution => {
      const key = contribution.kind === 'initial' ? contribution.choice.slot : contribution.cardId;
      const traceHash = evidence.witnesses[key];
      if (!traceHash) throw new Error('Retained qualification is missing a contribution witness');
      return { contributionId: contribution.id, traceHash };
    }), limitations: [...QUALIFICATION_LIMITATIONS],
  };
}

function parseFrames(frames: unknown): InputFrame[] {
  if (!Array.isArray(frames) || frames.length !== DEMO_POLICY.trialTicks) throw new Error('Qualification needs a complete bounded sixty-second trace');
  const encoded = JSON.stringify(frames);
  if (new TextEncoder().encode(encoded).byteLength > DEMO_POLICY.maxTraceBytes) throw new Error('Qualification trace exceeds the byte limit');
  return frames.map((frame, tick) => {
    const parsed = inputFrameSchema.parse(frame);
    if (parsed.tick !== tick) throw new Error('Qualification frames must be contiguous');
    return parsed;
  });
}

/** Execute witnesses; labels and prefilled hashes are never accepted as qualification. */
export async function qualifyBuild(recipe: KitchenRecipe, contributions: Contribution[], qualification: Qualification): Promise<BuildManifest['validation']> {
  if (!qualification || !Number.isInteger(qualification.seed) || qualification.seed < 0 || qualification.seed > 0xffffffff ||
      !Array.isArray(qualification.witnesses) || qualification.witnesses.length !== contributions.length ||
      new Set(qualification.witnesses.map(w => w.contributionId)).size !== contributions.length ||
      qualification.witnesses.some(w => !contributions.some(c => c.id === w.contributionId))) {
    throw new Error('Every contribution needs one bounded executable witness and a valid seed');
  }
  const completingFrames = parseFrames(qualification.completingFrames);
  const completing = replayRuntime(recipe, qualification.seed, completingFrames);
  if (completing.metrics.completedOrders < 1) throw new Error('Qualification must complete at least one valid order');
  const witnesses = [];
  for (const contribution of contributions) {
    const frames = parseFrames(qualification.witnesses.find(w => w.contributionId === contribution.id)!.frames);
    const result = replayRuntime(recipe, qualification.seed, frames);
    const metric = {
      knockback: 'repelledZombies', 'counter-ricochet': 'ricochetHits',
      pursuers: 'pursuitTicks', 'noise-seekers': 'noiseSeekingTicks',
      'quick-orders': 'completedOrders', 'batch-orders': 'completedOrders',
      'dinner-bell': 'bellAttractionTicks', 'hot-potato': 'timerSpoiledDishes', 'zombie-pantry': 'pantryPickups',
    } as const;
    if (result.metrics[metric[cardIdFor(contribution)]] < 1) {
      throw new Error(`Witness did not exercise ${cardIdFor(contribution)} (${contribution.id})`);
    }
    witnesses.push({ contributionId: contribution.id, traceHash: await hashValue({ seed: qualification.seed, frames }) });
  }
  return {
    status: 'accepted', validatorVersion: VALIDATOR_VERSION,
    completingTraceHash: await hashValue({ seed: qualification.seed, frames: completingFrames }),
    witnesses, limitations: [...QUALIFICATION_LIMITATIONS],
  };
}

export async function manifestHash(build: Omit<BuildManifest, 'buildId' | 'contentHash'> | BuildManifest): Promise<string> {
  const { buildId: _id, contentHash: _hash, ...payload } = build as BuildManifest;
  return hashValue(payload);
}

/** Reconstruct an exact retained preset; no resolution, generation or rule migration occurs. */
export async function loadBuild(value: unknown): Promise<{ build: BuildManifest; recipe: KitchenRecipe }> {
  const build = buildManifestSchema.parse(value);
  const recipe = recipeFromContributions(build.contributions);
  const descriptor = buildDescriptor(build.contributions, build.parent);
  const { buildId, contentHash, validation, ...actual } = build;
  if (canonicalJson(actual) !== canonicalJson(descriptor) ||
      canonicalJson(validation) !== canonicalJson(retainedQualification(recipe, build.contributions))) {
    throw new Error('Unsupported or altered retained runtime, assets, rule parameters, or provenance mode');
  }
  const expectedHash = await manifestHash(build);
  if (contentHash !== expectedHash || buildId !== `kc-${expectedHash.slice(7)}`) throw new Error('Manifest content hash mismatch');
  return freezeJson({ build, recipe });
}
