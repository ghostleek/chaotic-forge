import { contributionHistorySchema, type BuildManifest } from './contracts.ts';
import { recipeFromContributions } from './cards.ts';
import { loadBuild, manifestHash, qualifyBuild, retainedQualification, type Qualification } from './validate-build.ts';
import { buildDescriptor } from './runtimes/kitchen-chaos-v1/manifest.ts';
import { canonicalJson, freezeJson } from './runtimes/kitchen-chaos-v1/integrity.ts';

export type ResolveRequest = {
  contributions: unknown;
  previous?: BuildManifest | null;
  qualification?: Qualification;
};
export type ResolveResult =
  | { status: 'playable'; manifest: BuildManifest }
  | { status: 'incompatible'; previous: BuildManifest | null; reason: string };

/** Authored presets only. The room authority owns edit eligibility and job revisions. */
export async function resolveBuild(request: ResolveRequest): Promise<ResolveResult> {
  let previous: BuildManifest | null = null;
  try {
    if (request.previous) previous = (await loadBuild(request.previous)).build;
    const contributions = contributionHistorySchema.parse(request.contributions);
    if (previous) {
      if (canonicalJson(contributions) === canonicalJson(previous.contributions)) {
        return { status: 'playable', manifest: previous }; // Both slots passed; no new build.
      }
      if (contributions.length <= previous.contributions.length || contributions.length > previous.contributions.length + 2 ||
          canonicalJson(contributions.slice(0, previous.contributions.length)) !== canonicalJson(previous.contributions)) {
        throw new Error('Evolution must retain every prior contribution unchanged and append at most two legal additions');
      }
    } else if (contributions.length !== 3) {
      throw new Error('An initial build requires exactly three concept contributions; additions need their playable parent');
    }
    const descriptor = buildDescriptor(contributions, previous ? { buildId: previous.buildId, contentHash: previous.contentHash } : null);
    const recipe = recipeFromContributions(contributions);
    if (request.qualification) await qualifyBuild(recipe, contributions, request.qualification);
    const validation = retainedQualification(recipe, contributions);
    const contentHash = await manifestHash({ ...descriptor, validation });
    const manifest: BuildManifest = { ...descriptor, validation, contentHash, buildId: `kc-${contentHash.slice(7)}` };
    const { build } = await loadBuild(manifest);
    return { status: 'playable', manifest: freezeJson(build) };
  } catch (error) {
    return { status: 'incompatible', previous, reason: error instanceof Error ? error.message : 'Preset validation failed' };
  }
}
