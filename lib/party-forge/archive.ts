import {
  archiveSchema,
  contributionHistorySchema,
  parseEvolution,
  parseForkSetup,
  type BuildManifest,
  type GameArchive,
} from './contracts.ts';
import { createArchiveBuild } from './runtimes/kitchen-chaos-v1/archive-runtime.ts';
import { canonicalJson, freezeJson, hashValue } from './runtimes/kitchen-chaos-v1/integrity.ts';
import {
  checkRuntimeAvailability,
  loadRetainedBuild,
  UnavailableRuntimeError,
  verifyManifestIntegrity,
} from './runtime-registry.ts';

export const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
type ForkSetup = NonNullable<GameArchive['forkSetup']>;
type CompletedHistory = Extract<GameArchive['history'][number], { status: 'completed' }>;

function requireArchive(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function boundedText(text: string) {
  requireArchive(typeof text === 'string' && text.length <= MAX_ARCHIVE_BYTES &&
    new TextEncoder().encode(text).byteLength <= MAX_ARCHIVE_BYTES,
  'The portable archive exceeds the 32 MiB limit');
}

async function forkContributionId(setup: ForkSetup, decision: ForkSetup['decisions'][number]) {
  return `fork-${(await hashValue({ sourceArchiveId: setup.sourceArchiveId,
    sourceBuildId: setup.sourceBuildId, sourceBuildHash: setup.sourceBuildHash, decision })).slice(7)}`;
}

/** A fork changes initial choices once; ordinary evolution stays append-only. */
export async function resolveArchiveFork(sourceBuild: unknown, value: unknown): Promise<{
  kind: 'play-again' | 'remix'; manifest: BuildManifest; setup: ForkSetup;
}> {
  const { build: source } = await loadRetainedBuild(sourceBuild);
  const { setup, kind } = parseForkSetup(source, value);
  const inheritedActors = new Set(source.contributions.map((contribution) => contribution.participantId));
  requireArchive(setup.decisions.every((decision) => !inheritedActors.has(decision.participantId)),
    'A saved match requires fresh participant identities');
  if (kind === 'play-again') return freezeJson({ kind, manifest: source, setup });
  const contributions = await Promise.all(source.contributions.map(async (contribution) => {
    if (contribution.kind === 'addition') return contribution;
    const decision = setup.decisions.find((entry) => entry.selection.inheritedContributionId === contribution.id)!;
    if (decision.selection.kind === 'keep') return contribution;
    return { ...contribution, id: await forkContributionId(setup, decision),
      participantId: decision.participantId, choice: decision.selection.choice,
      provenance: decision.provenance };
  }));
  const manifest = await createArchiveBuild(contributions, { buildId: source.buildId, contentHash: source.contentHash });
  return freezeJson({ kind, manifest, setup });
}

/** Saved-room evolution keeps the source version's rules as well as its attribution. */
export async function resolveArchiveEvolution(request: {
  previous?: BuildManifest | null; contributions: unknown;
}): Promise<
  | { status: 'playable'; manifest: BuildManifest }
  | { status: 'incompatible'; previous: BuildManifest | null; reason: string }
> {
  let previous: BuildManifest | null = null;
  try {
    if (request.previous) previous = (await loadRetainedBuild(request.previous)).build;
    requireArchive(previous, 'Saved evolution requires its exact retained playable parent');
    const contributions = contributionHistorySchema.parse(request.contributions);
    if (canonicalJson(contributions) === canonicalJson(previous.contributions)) {
      return { status: 'playable', manifest: previous };
    }
    requireArchive(contributions.length > previous.contributions.length &&
      contributions.length <= previous.contributions.length + 2 &&
      canonicalJson(contributions.slice(0, previous.contributions.length)) === canonicalJson(previous.contributions),
    'Evolution must retain every prior contribution unchanged and append at most two legal additions');
    const manifest = await createArchiveBuild(contributions, { buildId: previous.buildId, contentHash: previous.contentHash });
    return { status: 'playable', manifest: parseEvolution(previous, manifest) };
  } catch (error) {
    return { status: 'incompatible', previous, reason: error instanceof Error ? error.message : 'Saved evolution validation failed' };
  }
}

async function validateForkRoot(archive: GameArchive, first: BuildManifest) {
  requireArchive(archive.parentArchiveId !== archive.archiveId, 'An archive cannot be its own ancestor');
  if (archive.parentArchiveId === null) {
    requireArchive(archive.forkSetup === null && first.parent === null,
      'A fresh archive must start with an initial build and no fork decisions');
    return;
  }
  const setup = archive.forkSetup;
  // Direct Play again keeps the source manifest exactly, without a changed setup.
  if (!setup) return;
  const allKept = setup.decisions.every((decision) => decision.selection.kind === 'keep');
  requireArchive(allKept
    ? first.buildId === setup.sourceBuildId && first.contentHash === setup.sourceBuildHash
    : first.parent?.buildId === setup.sourceBuildId && first.parent.contentHash === setup.sourceBuildHash,
  'The first played build must match its saved fork source');
  for (const decision of setup.decisions) {
    const id = decision.selection.kind === 'keep'
      ? decision.selection.inheritedContributionId : await forkContributionId(setup, decision);
    const contribution = first.contributions.find((entry) => entry.id === id);
    requireArchive(contribution?.kind === 'initial', 'Fork decisions must refer to the first played initial slots');
    if (decision.selection.kind === 'replace') {
      requireArchive(canonicalJson(contribution.choice) === canonicalJson(decision.selection.choice) &&
        contribution.participantId === decision.participantId &&
        canonicalJson(contribution.provenance) === canonicalJson(decision.provenance),
      'The replacement must retain the new participant decision and its provenance');
    }
  }
}

/**
 * Strict portable data validation, never proof that imported scores were observed
 * by this host. The service retains that provenance separately from these bytes.
 */
export async function validateArchive(value: unknown, options: { allowUnavailable?: boolean } = {}): Promise<GameArchive> {
  const encoded = JSON.stringify(value);
  requireArchive(typeof encoded === 'string', 'Expected a portable JSON archive');
  boundedText(encoded);
  const archive = archiveSchema.parse(value);
  const builds = new Map<string, BuildManifest>();
  for (const value of archive.builds) {
    const manifest = await verifyManifestIntegrity(value);
    const availability = checkRuntimeAvailability(manifest);
    if (availability.status === 'unavailable') {
      if (!options.allowUnavailable) throw new UnavailableRuntimeError(availability.reason);
    } else {
      await loadRetainedBuild(manifest);
    }
    builds.set(manifest.buildId, manifest);
  }
  let previous: CompletedHistory['result'] | null = null;
  let previousBuild: BuildManifest | null = null;
  let lastEventAt = 0;
  const played = new Set<string>();
  for (const entry of archive.history) {
    if (entry.status === 'evolution-aborted') {
      requireArchive(previous && entry.afterRoundId === previous.round.roundId &&
        entry.abortedAt >= lastEventAt && entry.abortedAt <= archive.savedAt,
      'An evolution abort must follow its completed round and precede saving');
      lastEventAt = entry.abortedAt;
      continue;
    }
    const round = entry.status === 'completed' ? entry.result.round : entry.round;
    requireArchive(round.number === (previous?.round.number ?? 0) + 1 &&
      round.tieCursor === (previous?.nextTieCursor ?? 0),
    'Round numbering and tie rotation must follow completed history');
    requireArchive(round.startsAt >= lastEventAt, 'Historical rounds must follow every prior completion or abort');
    const manifest = builds.get(round.buildId);
    if (manifest) requireArchive(manifest.contentHash === round.buildHash &&
      manifest.scoringVersion === round.scoringVersion, 'A historical round references a different build or scoring version');
    if (entry.status === 'aborted') {
      requireArchive(entry.abortedAt <= archive.savedAt && entry.abortedAt >= lastEventAt,
        'An aborted round must precede saving and follow the previous completed round');
      lastEventAt = entry.abortedAt;
      continue; // Unplayed candidates are deliberately absent from retained builds.
    }
    requireArchive(manifest, 'A completed round is missing its immutable manifest');
    requireArchive(round.submissionDeadline <= archive.savedAt &&
      (!previous || round.startsAt >= previous.round.submissionDeadline),
    'Completed rounds must be chronological and precede saving');
    if (!previousBuild) {
      await validateForkRoot(archive, manifest);
    } else if (previousBuild.buildId !== manifest.buildId) {
      requireArchive(!played.has(manifest.buildId), 'Completed evolution cannot return to an older build');
      parseEvolution(previousBuild, manifest);
      const additions = manifest.contributions.slice(previousBuild.contributions.length);
      requireArchive(additions.length > 0 && additions.every((addition, index) =>
        addition.kind === 'addition' && addition.afterRoundId === previous!.round.roundId &&
        addition.participantId === previous!.editors.order[index] &&
        addition.participantId === previous!.editors[addition.editorRole]),
      'Evolved additions must belong to the previous completed round and its ordered editors');
    }
    played.add(manifest.buildId);
    previousBuild = manifest;
    previous = entry.result;
    lastEventAt = round.submissionDeadline;
  }
  return freezeJson(archive);
}

export async function parseArchiveImport(text: string): Promise<GameArchive> {
  boundedText(text);
  return validateArchive(JSON.parse(text));
}

/** Export still works when an executable is temporarily unavailable. */
export async function serializeArchive(value: unknown): Promise<string> {
  const archive = await validateArchive(value, { allowUnavailable: true });
  const text = canonicalJson(archive);
  boundedText(text);
  return text;
}
