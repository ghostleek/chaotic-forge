import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_ARCHIVE_BYTES, parseArchiveImport, resolveArchiveEvolution, resolveArchiveFork, serializeArchive, validateArchive } from '../lib/party-forge/archive.ts';
import { checkRuntimeAvailability, createRetainedRuntime, loadRetainedBuild, RETAINED_RUNTIMES, UnavailableRuntimeError } from '../lib/party-forge/runtime-registry.ts';
import { PROTOCOL_VERSION, rankResults } from '../lib/party-forge/contracts.ts';
import { resolveBuild } from '../lib/party-forge/resolve-build.ts';
import { manifestHash } from '../lib/party-forge/validate-build.ts';
import { canonicalJson } from '../lib/party-forge/runtimes/kitchen-chaos-v1/integrity.ts';
import { fixtureHash, fixtureRoster, makeBuild } from './fixtures/party-forge.ts';
import { scoreTrial } from '../lib/party-forge/score.ts';
import { createCompletingWitness } from './fixtures/party-builds/kitchen-chaos-v1.mjs';

// Archive-format fixtures use real retained preset manifests, but their historical
// scores are fabricated test data. They are not observed play or server evidence.
function resultFor(build, number) {
  const startsAt = number * 100_000;
  const round = { roundId: `round-${number}`, number, buildId: build.buildId,
    buildHash: build.contentHash, roster: fixtureRoster, seed: 42, scoringVersion: build.scoringVersion,
    ticks: 3600, ticksPerSecond: 60, startsAt, submissionDeadline: startsAt + 60_000,
    transportDeadline: startsAt + 90_000, tieCursor: (number - 1) % 3 };
  const scores = fixtureRoster.map((participantId, index) => ({ participantId, completedOrders: 3 - index, failedOrders: 0 }));
  const ranked = rankResults(round, scores);
  return { protocolVersion: PROTOCOL_VERSION, round, results: scores.map((score, index) => ({ ...score,
    rank: ranked.ranks[score.participantId], attemptId: `attempt-${number}-${index}`, traceHash: fixtureHash })),
  editors: ranked.editors, nextTieCursor: ranked.nextTieCursor };
}

async function archiveFixture(maximal = false) {
  const initial = await resolveBuild({ contributions: makeBuild().contributions });
  assert.equal(initial.status, 'playable');
  let build = initial.manifest;
  const builds = [build];
  const history = [{ status: 'completed', result: resultFor(build, 1) }];
  if (maximal) {
    for (const cards of [['dinner-bell', 'hot-potato'], ['zombie-pantry']]) {
      const result = history.at(-1).result;
      const additions = cards.map((cardId, index) => {
        const participantId = result.editors.order[index];
        return { id: `addition-${cardId}`, participantId, ordinal: build.contributions.length + index,
          kind: 'addition', cardId, afterRoundId: result.round.roundId,
          editorRole: result.editors.winner === participantId ? 'winner' : 'loser',
          provenance: { source: { kind: 'authored-demo', reference: 'Fabricated archive fixture decision' },
            forgeInterpretation: `Fixture addition ${cardId}`, userDecision: { participantId, decisionId: `decision-${cardId}` } } };
      });
      const next = await resolveBuild({ contributions: [...build.contributions, ...additions], previous: build });
      assert.equal(next.status, 'playable', next.reason);
      build = next.manifest;
      builds.push(build);
      history.push({ status: 'completed', result: resultFor(build, history.length + 1) });
    }
  }
  return { protocolVersion: PROTOCOL_VERSION, archiveId: 'archive-test', savedAt: 500_000,
    parentArchiveId: null, forkSetup: null, finalBuild: build, builds, history, traceRetentionDays: 0 };
}

function setupFor(source, replace = []) {
  const alternatives = { fps: 'counter-ricochet', zombies: 'noise-seekers', cooking: 'batch-orders' };
  return { protocolVersion: PROTOCOL_VERSION, sourceArchiveId: 'archive-test', sourceBuildId: source.buildId,
    sourceBuildHash: source.contentHash, decisions: source.contributions.filter((entry) => entry.kind === 'initial').map((entry, index) => {
      const participantId = `fresh-player-${index}`;
      return { participantId, selection: replace.includes(index)
        ? { kind: 'replace', inheritedContributionId: entry.id, choice: { slot: entry.choice.slot, cardId: alternatives[entry.choice.slot] } }
        : { kind: 'keep', inheritedContributionId: entry.id },
      provenance: { source: { kind: 'authored-demo', reference: 'New fixture fork decision' },
        forgeInterpretation: 'Keep or replace one inherited initial concept slot.', userDecision: { participantId, decisionId: `fork-choice-${index}` } } };
    }) };
}

async function rehash(build) {
  build.contentHash = await manifestHash(build);
  build.buildId = `kc-${build.contentHash.slice(7)}`;
}

void test('portable round trip preserves all actually played manifests, bounded history and provenance', async () => {
  const original = await archiveFixture(true);
  const encoded = await serializeArchive(original);
  const restored = await parseArchiveImport(encoded);
  assert.deepEqual(restored, original);
  assert.ok(Object.isFrozen(restored.finalBuild.contributions[0].provenance));
  assert.equal(await serializeArchive(restored), encoded);
  assert.equal(restored.builds.length, 3);
  assert.equal(restored.finalBuild.contributions.length, 6);
  assert.equal('capability' in restored, false);
  const first = await createRetainedRuntime(restored.finalBuild, restored.history.at(-1).result.round.seed);
  first.input({ tick: 0, buttons: 1, yaw: 0, pitch: 0 });
  first.step();
  const nextVisit = await createRetainedRuntime(restored.finalBuild, restored.history.at(-1).result.round.seed);
  assert.equal(nextVisit.snapshot().tick, 0);
  assert.equal(nextVisit.snapshot().completedOrders, 0);
  assert.equal(first.snapshot().tick, 1, 'A fresh future attempt does not mutate another runtime');
});

void test('strict imports reject capabilities, malformed schema, oversized UTF-8 and unsupported data', async () => {
  const original = await archiveFixture();
  for (const bad of [
    { ...original, capability: 'secret' },
    { ...original, protocolVersion: 'party-forge/99' },
    { ...original, finalBuild: { ...original.finalBuild, hostCapability: 'secret' } },
    { ...original, builds: [] },
  ]) await assert.rejects(parseArchiveImport(JSON.stringify(bad)));
  await assert.rejects(parseArchiveImport('{invalid json}'));
  await assert.rejects(parseArchiveImport(' '.repeat(MAX_ARCHIVE_BYTES + 1)), /32 MiB/);
  await assert.rejects(parseArchiveImport('é'.repeat(MAX_ARCHIVE_BYTES / 2 + 1)), /32 MiB/);
  assert.deepEqual(await validateArchive(original), original, 'Import rejection leaves existing work unchanged');
});

void test('hashes, complete-build references, history ordering and ordered edit attribution are checked', async () => {
  const original = await archiveFixture(true);
  const altered = structuredClone(original);
  altered.builds[0].objective += ' changed';
  await assert.rejects(validateArchive(altered), /hash/);
  const missing = structuredClone(original);
  missing.builds.shift();
  await assert.rejects(validateArchive(missing));
  const wrongFinal = structuredClone(original);
  wrongFinal.finalBuild = wrongFinal.builds[0];
  await assert.rejects(validateArchive(wrongFinal));
  const reordered = structuredClone(original);
  reordered.history.reverse();
  await assert.rejects(validateArchive(reordered));
  const future = structuredClone(original);
  future.savedAt = 100_000;
  await assert.rejects(validateArchive(future), /precede saving/);
  const wrongNumber = structuredClone(original);
  wrongNumber.history[1].result.round.number = 7;
  await assert.rejects(validateArchive(wrongNumber));
  const brokenLineage = structuredClone(original);
  brokenLineage.builds[1].parent.contentHash = fixtureHash;
  await rehash(brokenLineage.builds[1]);
  brokenLineage.history[1].result.round.buildId = brokenLineage.builds[1].buildId;
  brokenLineage.history[1].result.round.buildHash = brokenLineage.builds[1].contentHash;
  await assert.rejects(validateArchive(brokenLineage), /Evolution/);
  const wrongEditor = structuredClone(original);
  wrongEditor.builds.pop();
  wrongEditor.history.pop();
  const changed = wrongEditor.builds[1];
  changed.contributions[3].participantId = fixtureRoster[1];
  changed.contributions[3].provenance.userDecision.participantId = fixtureRoster[1];
  await rehash(changed);
  wrongEditor.finalBuild = changed;
  wrongEditor.history[1].result.round.buildId = changed.buildId;
  wrongEditor.history[1].result.round.buildHash = changed.contentHash;
  await assert.rejects(validateArchive(wrongEditor), /ordered editors/);
  const alteredRule = structuredClone(original);
  const initial = alteredRule.builds[0];
  initial.effects[0].parameters.shotDamage += 1;
  await rehash(initial);
  alteredRule.history[0].result.round.buildId = initial.buildId;
  alteredRule.history[0].result.round.buildHash = initial.contentHash;
  await assert.rejects(validateArchive(alteredRule, { allowUnavailable: true }), /Unsupported or altered/);
});

void test('archives omit unplayed and failed builds while preserving explicit aborts', async () => {
  const archive = await archiveFixture();
  const aborted = structuredClone(resultFor(archive.finalBuild, 2).round);
  aborted.buildId = 'unplayed-candidate';
  aborted.buildHash = fixtureHash;
  archive.history.push({ status: 'aborted', round: aborted, abortedAt: 210_000, reason: 'Fixture aborted before a completed game' });
  archive.history.push({ status: 'evolution-aborted', evolutionId: 'aborted-edit', afterRoundId: 'round-1',
    pendingRevision: 4, abortedAt: 220_000, reason: 'Fixture failed evolution was abandoned' });
  const restored = await parseArchiveImport(await serializeArchive(archive));
  assert.equal(restored.builds.length, 1);
  assert.deepEqual(restored.finalBuild, archive.finalBuild);
  const extra = await archiveFixture(true);
  archive.builds.push(extra.finalBuild);
  await assert.rejects(validateArchive(archive), /Archive/);
});

void test('missing versions are exportable unavailable records; corrupt retained versions never become unavailable', async () => {
  const archive = await archiveFixture();
  const absent = structuredClone(archive.finalBuild);
  absent.runtime.version = 'kitchen-chaos-v999';
  await rehash(absent);
  archive.builds = [absent];
  archive.finalBuild = absent;
  archive.history = [{ status: 'completed', result: resultFor(absent, 1) }];
  assert.equal(checkRuntimeAvailability(absent).status, 'unavailable');
  await assert.rejects(loadRetainedBuild(absent), UnavailableRuntimeError);
  await assert.rejects(validateArchive(archive), UnavailableRuntimeError);
  assert.deepEqual(await validateArchive(archive, { allowUnavailable: true }), archive);
  const preservation = await serializeArchive(archive);
  await assert.rejects(parseArchiveImport(preservation), UnavailableRuntimeError);
  absent.objective += ' silent corruption';
  await assert.rejects(validateArchive(archive, { allowUnavailable: true }), /hash/);

  const corrupt = await archiveFixture();
  const changed = structuredClone(corrupt.finalBuild);
  changed.runtime.hash = fixtureHash;
  await rehash(changed);
  corrupt.builds = [changed];
  corrupt.finalBuild = changed;
  corrupt.history = [{ status: 'completed', result: resultFor(changed, 1) }];
  await assert.rejects(validateArchive(corrupt, { allowUnavailable: true }), /retained version/);
});

void test('unavailable saved asset and resolver versions cannot be mistaken for playable archives', async () => {
  for (const mutate of [
    (manifest) => manifest.assets.push({ key: 'party-forge/missing-art/atlas.png', version: 'art-v1', hash: fixtureHash, mediaType: 'image/png' }),
    (manifest) => { manifest.resolverVersion = 'missing-resolver-v2'; },
    (manifest) => { manifest.validation.validatorVersion = 'missing-validator-v2'; },
  ]) {
    const archive = await archiveFixture();
    const manifest = structuredClone(archive.finalBuild);
    mutate(manifest);
    await rehash(manifest);
    archive.builds = [manifest];
    archive.finalBuild = manifest;
    archive.history = [{ status: 'completed', result: resultFor(manifest, 1) }];
    assert.equal(checkRuntimeAvailability(manifest).status, 'unavailable');
    await assert.rejects(createRetainedRuntime(manifest, 42), UnavailableRuntimeError);
    await assert.rejects(parseArchiveImport(await serializeArchive(archive)), UnavailableRuntimeError);
  }
});

void test('all eight exhausted-deck fork choices preserve additions and keep decisions separate from old authority', async () => {
  const archive = await archiveFixture(true);
  const source = archive.finalBuild;
  const before = canonicalJson(archive);
  for (let mask = 0; mask < 8; mask++) {
    const replaced = [0, 1, 2].filter((index) => mask & (1 << index));
    const setup = setupFor(source, replaced);
    const fork = await resolveArchiveFork(source, setup);
    assert.deepEqual(fork.setup, setup);
    assert.equal(fork.kind, mask ? 'remix' : 'play-again');
    assert.deepEqual(fork.manifest.contributions.slice(3), source.contributions.slice(3));
    assert.equal(fork.manifest.contributions.length, 6);
    if (!mask) assert.deepEqual(fork.manifest, source);
    else {
      assert.deepEqual(fork.manifest.parent, { buildId: source.buildId, contentHash: source.contentHash });
      for (const [index, contribution] of fork.manifest.contributions.slice(0, 3).entries()) {
        if (replaced.includes(index)) {
          assert.deepEqual(contribution.provenance, setup.decisions[index].provenance);
          assert.equal(contribution.participantId, setup.decisions[index].participantId);
          assert.notEqual(contribution.id, source.contributions[index].id);
        } else assert.deepEqual(contribution, source.contributions[index]);
      }
    }
    const child = { ...archive, archiveId: `fork-${mask}`, parentArchiveId: archive.archiveId,
      forkSetup: setup, finalBuild: fork.manifest, builds: [fork.manifest],
      history: [{ status: 'completed', result: resultFor(fork.manifest, 1) }] };
    assert.deepEqual(await parseArchiveImport(await serializeArchive(child)), child);
    assert.equal(canonicalJson(archive), before, 'Remixing cannot mutate the source artifact');
  }
});

void test('forks reject reused identities, duplicate inherited slots, same-card replacements and tampered decisions', async () => {
  const source = (await archiveFixture(true)).finalBuild;
  const actor = setupFor(source, [0]);
  actor.decisions[0].participantId = fixtureRoster[0];
  actor.decisions[0].provenance.userDecision.participantId = fixtureRoster[0];
  await assert.rejects(resolveArchiveFork(source, actor), /fresh participant/);
  const duplicate = setupFor(source);
  duplicate.decisions[1].selection = duplicate.decisions[0].selection;
  await assert.rejects(resolveArchiveFork(source, duplicate));
  const unchanged = setupFor(source, [0]);
  unchanged.decisions[0].selection.choice = source.contributions[0].choice;
  await assert.rejects(resolveArchiveFork(source, unchanged), /other supported variant/);
  const fork = await resolveArchiveFork(source, setupFor(source, [0]));
  const archive = { ...await archiveFixture(), archiveId: 'child-archive', parentArchiveId: 'archive-test',
    forkSetup: structuredClone(fork.setup), finalBuild: fork.manifest, builds: [fork.manifest],
    history: [{ status: 'completed', result: resultFor(fork.manifest, 1) }] };
  archive.forkSetup.decisions[0].provenance.forgeInterpretation = 'Rewritten after the fork';
  await assert.rejects(validateArchive(archive), /initial slots/);
});

void test('the static registry pins and bundles the exact released v1 executable', async () => {
  assert.ok(Object.isFrozen(RETAINED_RUNTIMES[0].runtime));
  const bytes = await readFile(new URL('../lib/party-forge/runtimes/kitchen-chaos-v1/retained/engine.js', import.meta.url));
  assert.equal(`sha256:${createHash('sha256').update(bytes).digest('hex')}`, RETAINED_RUNTIMES[0].runtime.hash);
  const publicBytes = await readFile(new URL('../public/party-forge/kitchen-chaos-v1/engine.js', import.meta.url));
  assert.deepEqual(publicBytes, bytes, 'The portable executable is the same exact module used for scoring');
  const source = (await archiveFixture()).finalBuild;
  assert.deepEqual(checkRuntimeAvailability(source), { status: 'available' });
  assert.deepEqual((await loadRetainedBuild(JSON.parse(JSON.stringify(source)))).build, source);
});

void test('every historical event advances the boundary, including repeated ready and evolution aborts', async () => {
  const original = await archiveFixture();
  const backwards = structuredClone(original);
  const earlyReady = structuredClone(resultFor(original.finalBuild, 1).round);
  earlyReady.roundId = 'ready-before-first';
  earlyReady.startsAt = 300_000;
  earlyReady.submissionDeadline = 360_000;
  earlyReady.transportDeadline = 390_000;
  backwards.history.unshift({ status: 'aborted', round: earlyReady, abortedAt: 250_000, reason: 'Ready abort may precede its planned start' });
  await assert.rejects(validateArchive(backwards), /prior completion or abort/);

  const valid = structuredClone(original);
  const ready = structuredClone(resultFor(original.finalBuild, 2).round);
  const retry = structuredClone(ready);
  retry.roundId = 'retry-ready';
  retry.startsAt = 210_000;
  retry.submissionDeadline = 270_000;
  retry.transportDeadline = 300_000;
  const complete = resultFor(original.finalBuild, 2);
  complete.round.roundId = 'completed-retry';
  complete.round.startsAt = 300_000;
  complete.round.submissionDeadline = 360_000;
  complete.round.transportDeadline = 390_000;
  valid.history.push(
    { status: 'aborted', round: ready, abortedAt: 190_000, reason: 'First ready abort before planned start' },
    { status: 'aborted', round: retry, abortedAt: 200_000, reason: 'Second ready abort before planned start' },
    { status: 'completed', result: complete },
  );
  assert.deepEqual(await validateArchive(valid), valid);
  const repeatedBackwards = structuredClone(valid);
  repeatedBackwards.history[2].abortedAt = 180_000;
  await assert.rejects(validateArchive(repeatedBackwards), /aborted round/);
  valid.history.push({ status: 'evolution-aborted', evolutionId: 'late-evolution', afterRoundId: 'completed-retry',
    pendingRevision: 9, abortedAt: 350_000, reason: 'Invalid timestamp before its completed boundary' });
  await assert.rejects(validateArchive(valid), /evolution abort/);
});

void test('saved evolution retains its immutable prefix and rejects rewritten decisions or excessive additions', async () => {
  const archive = await archiveFixture(true);
  const previous = archive.builds[0];
  const evolved = await resolveArchiveEvolution({ previous, contributions: archive.builds[1].contributions });
  assert.equal(evolved.status, 'playable');
  assert.deepEqual(evolved.manifest, archive.builds[1]);
  for (const contributions of [
    archive.finalBuild.contributions,
    previous.contributions.slice(0, 2),
    previous.contributions.map((entry, index) => index ? entry : { ...entry, provenance: { ...entry.provenance, forgeInterpretation: 'Changed prior attribution' } }),
  ]) {
    const rejected = await resolveArchiveEvolution({ previous, contributions });
    assert.equal(rejected.status, 'incompatible');
    assert.deepEqual(rejected.previous, previous);
  }
  const pass = await resolveArchiveEvolution({ previous: archive.finalBuild, contributions: archive.finalBuild.contributions });
  assert.equal(pass.status, 'playable');
  assert.deepEqual(pass.manifest, archive.finalBuild);
});

void test('a later module graph with changed catalog, resolver and card defaults still loads, scores, forks and evolves v1 archives', async () => {
  const archive = await archiveFixture(true);
  const source = archive.finalBuild;
  const { recipe } = await loadRetainedBuild(source);
  const round = archive.history.at(-1).result.round;
  const witness = createCompletingWitness(recipe, round.seed);
  assert.ok(witness.snapshot.metrics.completedOrders >= 1);
  const trial = { protocolVersion: PROTOCOL_VERSION, roundId: round.roundId, buildId: source.buildId,
    buildHash: source.contentHash, attemptId: 'retention-witness', seed: round.seed, frames: witness.frames };
  const setup = setupFor(source, [0, 2]);
  const payload = { archive, trial, setup, expectedSnapshot: witness.snapshot,
    expectedScore: await scoreTrial(source, round, trial), expectedFork: await resolveArchiveFork(source, setup) };
  const temporary = await mkdtemp(join(tmpdir(), 'party-retained-v1-'));
  try {
    await cp(new URL('../lib/party-forge/', import.meta.url), join(temporary, 'lib'), { recursive: true });
    await symlink(fileURLToPath(new URL('../node_modules', import.meta.url)), join(temporary, 'node_modules'), 'dir');
    await writeFile(join(temporary, 'package.json'), JSON.stringify({ type: 'module' }));
    await writeFile(join(temporary, 'fixture.json'), JSON.stringify(payload));
    const laterCards = (await readFile(join(temporary, 'lib/cards.ts'), 'utf8'))
      .replace("'kitchen-chaos/1'", "'kitchen-chaos/2'")
      .replace("'kitchen-chaos-resolver-v1'", "'kitchen-chaos-resolver-v2'")
      .replace("'kitchen-chaos-presets-v1'", "'kitchen-chaos-presets-v2'")
      .replace('Aimed shots repel the nearest visible zombie and push it away.', 'Later release card copy.');
    await writeFile(join(temporary, 'lib/cards.ts'), laterCards);
    // A later release may retire its current resolver implementation entirely.
    // Loading it is a regression even if today's retained engine is still present.
    for (const name of ['validate-build.ts', 'resolve-build.ts']) {
      await writeFile(join(temporary, 'lib', name), "throw new Error('A mutable current resolver entered the retained v1 module graph');\n");
    }
    const program = [
      "import assert from 'node:assert/strict';",
      "import {readFile} from 'node:fs/promises';",
      "import {CATALOG_VERSION, RESOLVER_VERSION, PRESET_VERSION, CARDS} from './lib/cards.ts';",
      "import {parseArchiveImport, serializeArchive, resolveArchiveFork, resolveArchiveEvolution} from './lib/archive.ts';",
      "import {checkRuntimeAvailability, createRetainedRuntime, loadRetainedBuild} from './lib/runtime-registry.ts';",
      "import {scoreTrial} from './lib/score.ts';",
      "const data = JSON.parse(await readFile(new URL('./fixture.json',import.meta.url),'utf8'));",
      "assert.equal(CATALOG_VERSION,'kitchen-chaos/2');",
      "assert.equal(RESOLVER_VERSION,'kitchen-chaos-resolver-v2');",
      "assert.equal(PRESET_VERSION,'kitchen-chaos-presets-v2');",
      "assert.equal(CARDS.knockback.interpretation,'Later release card copy.');",
      "const archive = await parseArchiveImport(JSON.stringify(data.archive));",
      "assert.deepEqual(archive,data.archive);",
      "assert.deepEqual(checkRuntimeAvailability(archive.finalBuild),{status:'available'});",
      "assert.deepEqual((await loadRetainedBuild(archive.finalBuild)).build,archive.finalBuild);",
      "assert.deepEqual(await parseArchiveImport(await serializeArchive(archive)),archive);",
      "const runtime = await createRetainedRuntime(archive.finalBuild,data.trial.seed);",
      "for(const frame of data.trial.frames){runtime.input(frame);runtime.step();}",
      "assert.deepEqual(runtime.snapshot().state,data.expectedSnapshot);",
      "assert.equal(runtime.isComplete(),true);",
      "runtime.reset(archive.finalBuild,data.trial.seed);",
      "assert.equal(runtime.snapshot().tick,0);",
      "assert.equal(runtime.snapshot().completedOrders,0);",
      "assert.deepEqual(await scoreTrial(archive.finalBuild,archive.history.at(-1).result.round,data.trial),data.expectedScore);",
      "assert.deepEqual(await resolveArchiveFork(archive.finalBuild,data.setup),data.expectedFork);",
      "const evolved = await resolveArchiveEvolution({previous:archive.builds[0],contributions:archive.builds[1].contributions});",
      "assert.equal(evolved.status,'playable');",
      "assert.deepEqual(evolved.manifest,archive.builds[1]);",
      "process.stdout.write('retained-v1-later-defaults-pass');",
    ].join('\n');
    await writeFile(join(temporary, 'verify.mjs'), program);
    const output = execFileSync(process.execPath, ['--experimental-strip-types', join(temporary, 'verify.mjs')],
      { cwd: temporary, encoding: 'utf8', timeout: 30_000 });
    assert.equal(output, 'retained-v1-later-defaults-pass');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
