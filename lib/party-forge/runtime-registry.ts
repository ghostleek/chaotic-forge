import { buildManifestSchema, type BuildManifest } from './contracts.ts';
import { ARCHIVE_POLICY, createArchiveRuntime, loadArchiveBuild } from './runtimes/kitchen-chaos-v1/archive-runtime.ts';
import { createPixelRuntime } from './runtimes/pixel-arcade-v1/retained/engine.js';
import { loadPixelBuild, PIXEL_RUNTIME_RESOURCE } from './runtimes/pixel-arcade-v1/manifest.ts';
import { freezeJson, hashValue } from './runtimes/kitchen-chaos-v1/integrity.ts';

const kitchenAssets: BuildManifest['assets'] = ARCHIVE_POLICY.manifest.assets;

/**
 * Released entries are append-only. Their imports retain the actual executable
 * in every subsequent deployment; changing the default must not remove v1.
 * Registry keys never become fetch URLs, dynamic imports, or executable input.
 */
export const RETAINED_RUNTIMES = freezeJson([
  { runtime: PIXEL_RUNTIME_RESOURCE, resolverVersion: null, presetVersion: null, validatorVersion: null, assets: [] as BuildManifest['assets'] },
  {
    runtime: { ...ARCHIVE_POLICY.manifest.runtime },
    resolverVersion: ARCHIVE_POLICY.manifest.resolverVersion,
    presetVersion: ARCHIVE_POLICY.manifest.origin.presetVersion,
    validatorVersion: ARCHIVE_POLICY.validatorVersion,
    assets: kitchenAssets,
  },
]);

export type RuntimeAvailability =
  | { status: 'available' }
  | { status: 'unavailable'; reason: string };

export class UnavailableRuntimeError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'UnavailableRuntimeError';
  }
}

/** Availability is separate from integrity. A matching version with wrong bytes is corrupt. */
export function checkRuntimeAvailability(value: unknown): RuntimeAvailability {
  const build = buildManifestSchema.parse(value);
  const retained = RETAINED_RUNTIMES.find((entry) =>
    entry.runtime.key === build.runtime.key && entry.runtime.version === build.runtime.version);
  if (!retained) {
    return { status: 'unavailable', reason: `The exact saved runtime ${build.runtime.version} is unavailable. Preserve the export; no replacement game was generated.` };
  }
  if (build.runtime.hash !== retained.runtime.hash || build.runtime.mediaType !== retained.runtime.mediaType) {
    throw new Error('The saved runtime hash does not match its retained version');
  }
  for (const asset of build.assets) {
    const resource = retained.assets.find((entry) => entry.key === asset.key && entry.version === asset.version);
    if (!resource) return { status: 'unavailable', reason: `The exact saved asset ${asset.key} (${asset.version}) is unavailable. No asset was substituted.` };
    if (resource.hash !== asset.hash || resource.mediaType !== asset.mediaType) {
      throw new Error('The saved asset hash does not match its retained version');
    }
  }
  if (retained.assets.some((resource) => !build.assets.some((asset) => asset.key === resource.key))) {
    throw new Error('The saved manifest omits an asset required by its retained version');
  }
  if (build.catalogVersion === 'pixel-arcade/1') return { status: 'available' }; // Version-owned loader validates generated policy and recipe.
  if (build.resolverVersion !== retained.resolverVersion ||
      build.validation.validatorVersion !== retained.validatorVersion ||
      build.origin.kind !== 'preset' || build.origin.presetVersion !== retained.presetVersion) {
    return { status: 'unavailable', reason: 'The saved resolver, qualification, or generation version is unavailable. No version was substituted.' };
  }
  return { status: 'available' };
}

/** Even unavailable archives must retain internally valid content hashes. */
export async function verifyManifestIntegrity(value: unknown): Promise<BuildManifest> {
  const build = buildManifestSchema.parse(value);
  const { buildId: _id, contentHash, ...payload } = build;
  if (await hashValue(payload) !== contentHash) throw new Error('Manifest content hash mismatch');
  return freezeJson(build);
}

export async function loadRetainedBuild(value: unknown) {
  const build = await verifyManifestIntegrity(value);
  const availability = checkRuntimeAvailability(build);
  if (availability.status === 'unavailable') throw new UnavailableRuntimeError(availability.reason);
  // v1 validates exact authored rules, qualification hashes and asset references.
  return build.catalogVersion === 'pixel-arcade/1' ? loadPixelBuild(build) : loadArchiveBuild(build);
}

export async function createRetainedRuntime(value: unknown, seed: number) {
  const { build } = await loadRetainedBuild(value);
  return build.catalogVersion === 'pixel-arcade/1' ? createPixelRuntime(build, seed) : createArchiveRuntime(build, seed);
}
