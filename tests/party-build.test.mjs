import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { chromium } from '@playwright/test';
import { Miniflare } from 'miniflare';
import { additionOptions, recipeFromContributions } from '../lib/party-forge/cards.ts';
import { resolveBuild } from '../lib/party-forge/resolve-build.ts';
import { loadBuild, manifestHash, qualifyBuild, retainedQualification } from '../lib/party-forge/validate-build.ts';
import { scoreTrial } from '../lib/party-forge/score.ts';
import { RUNTIME_RESOURCE } from '../lib/party-forge/runtimes/kitchen-chaos-v1/manifest.ts';
import { canonicalJson, hashValue } from '../lib/party-forge/runtimes/kitchen-chaos-v1/integrity.ts';
import { replayRuntime } from '../lib/party-forge/runtimes/kitchen-chaos-v1/retained/engine.js';
import { createPartyRuntime } from '../lib/party-forge/runtimes/kitchen-chaos-v1/adapter.ts';
import { createCompletingWitness, createQualification, initialRecipes, additionSequences } from './fixtures/party-builds/kitchen-chaos-v1.mjs';

function contributionsFor(recipe) {
  return [
    ...['fps', 'zombies', 'cooking'].map((slot, ordinal) => ({
      id: `choice-${slot}`, participantId: `player-${ordinal}`, ordinal, kind: 'initial',
      choice: { slot, cardId: recipe[slot] },
      provenance: { source: { kind: 'authored-demo', reference: 'Kitchen Chaos authored qualification deck' },
        forgeInterpretation: 'Test participant selected an explicitly supported authored rule.',
        userDecision: { participantId: `player-${ordinal}`, decisionId: `decision-${ordinal}` } },
    })),
    ...recipe.additions.map((cardId, index) => ({
      id: `addition-${cardId}`, participantId: `player-${index % 2}`, ordinal: index + 3, kind: 'addition', cardId,
      afterRoundId: `round-${Math.floor(index / 2) + 1}`, editorRole: index % 2 ? 'loser' : 'winner',
      provenance: { source: { kind: 'authored-demo', reference: 'Kitchen Chaos singleton additive deck' },
        forgeInterpretation: 'Test participant elected this additive rule.',
        userDecision: { participantId: `player-${index % 2}`, decisionId: `addition-decision-${index}` } },
    })),
  ];
}

async function buildRecipe(recipe, previous = null) {
  const contributions = contributionsFor(recipe);
  const result = await resolveBuild({ contributions, previous, qualification: createQualification(recipe, contributions) });
  assert.equal(result.status, 'playable', result.reason);
  return result.manifest;
}

void test('every initial recipe resolves from executable qualification and reconstructs unchanged', async () => {
  for (const recipe of initialRecipes) {
    const manifest = await buildRecipe(recipe);
    const loaded = await loadBuild(JSON.parse(JSON.stringify(manifest)));
    assert.deepEqual(loaded.recipe, recipe);
    assert.equal(manifest.origin.kind, 'preset');
    assert.equal(manifest.assets.length, 0, 'Geometry is retained in the engine; no unretained art dependency');
    assert.deepEqual(manifest.contributions, contributionsFor(recipe));
    assert.equal(manifest.validation.witnesses.length, 3);
    assert.ok(Object.isFrozen(manifest.contributions[0].provenance));
    assert.equal((await buildRecipe(recipe)).contentHash, manifest.contentHash);
  }
});

void test('evolution retains contributions and links exact parents, then Pass returns the same build', async () => {
  const recipe = structuredClone(initialRecipes[0]);
  let manifest = await buildRecipe(recipe);
  for (const card of ['dinner-bell', 'hot-potato', 'zombie-pantry']) {
    const previous = manifest;
    recipe.additions.push(card);
    manifest = await buildRecipe(recipe, previous);
    assert.deepEqual(manifest.parent, { buildId: previous.buildId, contentHash: previous.contentHash });
    assert.deepEqual(manifest.contributions.slice(0, -1), previous.contributions);
    assert.deepEqual(manifest.effects.slice(0, -1), previous.effects);
  }
  assert.deepEqual(additionOptions(manifest.contributions).cards, []);
  assert.equal(additionOptions(manifest.contributions).pass, true);
  const pass = await resolveBuild({ contributions: manifest.contributions, previous: manifest });
  assert.deepEqual(pass.manifest, manifest);
  const mutable = JSON.parse(JSON.stringify(manifest));
  const restoredPass = await resolveBuild({ contributions: mutable.contributions, previous: mutable });
  assert.deepEqual(restoredPass.manifest, manifest);
  mutable.effects[0].parameters.shotDamage = 999;
  assert.deepEqual(restoredPass.manifest, manifest);
  assert.ok(Object.isFrozen(restoredPass.manifest.effects[0].parameters));
});

void test('unsupported cards, repeated additions and rewritten attribution preserve prior build', async () => {
  const recipe = initialRecipes[0];
  const previous = await buildRecipe(recipe);
  const unsupported = structuredClone(previous.contributions);
  unsupported[0].choice.cardId = 'arbitrary-generated-shooter';
  const rewritten = structuredClone(previous.contributions);
  rewritten[0].provenance.forgeInterpretation = 'Rewritten old decision';
  const duplicateRecipe = { ...recipe, additions: ['hot-potato', 'hot-potato'] };
  const lost = previous.contributions.slice(1);
  for (const contributions of [unsupported, rewritten, contributionsFor(duplicateRecipe), lost]) {
    const result = await resolveBuild({ contributions, previous });
    assert.equal(result.status, 'incompatible');
    assert.deepEqual(result.previous, previous);
    assert.ok(result.reason);
  }
});

void test('all 128 ordered builds resolve from retained qualification that matches freshly executed witnesses', async () => {
  for (const initial of initialRecipes) {
    const manifests = new Map();
    for (const additions of additionSequences) {
      const recipe = { ...initial, additions };
      const contributions = contributionsFor(recipe);
      const previous = additions.length ? manifests.get(additions.slice(0, -1).join('|')) : null;
      const result = await resolveBuild({ contributions, previous });
      assert.equal(result.status, 'playable', result.reason);
      const replayed = await qualifyBuild(recipe, contributions, createQualification(recipe, contributions));
      assert.deepEqual(retainedQualification(recipe, contributions), replayed);
      assert.deepEqual(result.manifest.validation, replayed);
      manifests.set(additions.join('|'), result.manifest);
    }
  }
});

void test('empty scores and irrelevant or incomplete traces cannot be labelled accepted witnesses', async () => {
  const recipe = initialRecipes[0];
  const contributions = contributionsFor(recipe);
  const idle = Array.from({ length: 3600 }, (_, tick) => ({ tick, buttons: 0, yaw: 0, pitch: 0 }));
  const valid = createQualification(recipe, contributions);
  for (const qualification of [
    { ...valid, completingFrames: idle },
    { ...valid, completingFrames: valid.completingFrames.slice(0, -1) },
    { ...valid, witnesses: valid.witnesses.map(w => ({ ...w, frames: idle })) },
    { ...valid, witnesses: [valid.witnesses[0], valid.witnesses[0], valid.witnesses[2]] },
    { ...valid, seed: -1 },
  ]) {
    const result = await resolveBuild({ contributions, qualification });
    assert.equal(result.status, 'incompatible');
  }
});

void test('retained manifests reject tampering even when an attacker recomputes the manifest hash', async () => {
  const original = await buildRecipe(initialRecipes[0]);
  const mutate = [
    m => { m.runtime.version = 'kitchen-chaos-v2'; },
    m => { m.runtime.hash = `sha256:${'1'.repeat(64)}`; },
    m => { m.effects[0].parameters.unknownRule = 99; },
    m => { m.objective = 'A different objective'; },
    m => { m.origin = { kind: 'generated', jobId: 'job', service: 'Pretend', model: 'None', modelVersion: 'v1' }; },
    m => { m.validation.limitations = ['Observed external multiplayer evidence']; },
    m => { m.validation.witnesses[0].traceHash = `sha256:${'2'.repeat(64)}`; },
    m => { m.validation.completingTraceHash = `sha256:${'3'.repeat(64)}`; },
  ];
  for (const change of mutate) {
    const manifest = structuredClone(original);
    change(manifest);
    manifest.contentHash = await manifestHash(manifest);
    manifest.buildId = `kc-${manifest.contentHash.slice(7)}`;
    await assert.rejects(loadBuild(manifest));
  }
  const corrupted = structuredClone(original);
  corrupted.contributions[0].provenance.source.reference += ' changed';
  await assert.rejects(loadBuild(corrupted), /hash/);
});

void test('server derives score solely from the frozen full trace and rejects fabricated results', async () => {
  const recipe = initialRecipes[0];
  const manifest = await buildRecipe(recipe);
  const witness = createCompletingWitness(recipe);
  const round = { roundId: 'round-1', number: 1, buildId: manifest.buildId, buildHash: manifest.contentHash,
    roster: ['player-0', 'player-1', 'player-2'], seed: witness.seed,
    scoringVersion: 'orders-then-failures/1', ticks: 3600, ticksPerSecond: 60,
    startsAt: 1000, submissionDeadline: 61000, transportDeadline: 91000, tieCursor: 0 };
  const input = { protocolVersion: 'party-forge/1', roundId: round.roundId, buildId: manifest.buildId,
    buildHash: manifest.contentHash, attemptId: 'attempt-1', seed: witness.seed, frames: witness.frames };
  const score = await scoreTrial(manifest, round, input);
  assert.equal(score.completedOrders, witness.snapshot.metrics.completedOrders);
  assert.equal(score.failedOrders, witness.snapshot.metrics.failedOrders);
  assert.deepEqual(await scoreTrial(manifest, round, input), score);
  for (const forged of [
    { ...input, completedOrders: 999 }, { ...input, seed: 7 }, { ...input, roundId: 'round-2' },
    { ...input, buildHash: `sha256:${'0'.repeat(64)}` }, { ...input, frames: input.frames.slice(1) },
    { ...input, frames: input.frames.map(f => ({ ...f, extra: 'x'.repeat(512) })) },
  ]) await assert.rejects(scoreTrial(manifest, round, forged));
});

void test('retained JavaScript bytes match their hash and reproduce the typed source exactly', async () => {
  const directory = new URL('../lib/party-forge/runtimes/kitchen-chaos-v1/', import.meta.url);
  const source = await readFile(new URL('engine.ts', directory), 'utf8');
  const retained = await readFile(new URL('retained/engine.js', directory), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  assert.equal(retained, compiled, 'A changed engine needs deliberate artifact regeneration and version review');
  assert.equal(RUNTIME_RESOURCE.hash, `sha256:${createHash('sha256').update(retained).digest('hex')}`);
  assert.doesNotMatch(retained, /\b(?:window|document|localStorage|requestAnimationFrame|process|require)\b/);
  const witness = createCompletingWitness(initialRecipes[0]);
  assert.deepEqual(replayRuntime(witness.recipe, witness.seed, witness.frames).metrics, witness.snapshot.metrics);
});

void test('canonical hashing preserves arrays and normalizes object key ordering', async () => {
  assert.equal(await hashValue({ b: 2, a: 1 }), await hashValue({ a: 1, b: 2 }));
  assert.notEqual(await hashValue([1, 2]), await hashValue([2, 1]));
  assert.throws(() => canonicalJson({ a: undefined }));
  assert.throws(() => canonicalJson(NaN));
  assert.deepEqual(recipeFromContributions(contributionsFor(initialRecipes[0])), initialRecipes[0]);
});

void test('PC01 runtime adapter owns one tick lifecycle and exposes detached typed snapshots', async () => {
  const recipe = initialRecipes[0];
  const manifest = await buildRecipe(recipe);
  const witness = createCompletingWitness(recipe);
  const runtime = await createPartyRuntime(manifest, witness.seed);
  assert.equal(runtime.snapshot().tick, 0);
  assert.equal(runtime.isComplete(), false);
  assert.throws(() => runtime.step(), /input|frame/i);
  const frame = { ...witness.frames[0] };
  runtime.input(frame);
  assert.throws(() => runtime.input(frame), /input|pending|frame/i);
  frame.buttons = 63;
  const first = runtime.step();
  assert.equal(first.tick, 1);
  assert.equal(first.state.previousButtons, witness.frames[0].buttons);
  assert.throws(() => runtime.input(witness.frames[0]), /tick|frame/i);
  assert.throws(() => { first.state.player.x = 999; }, TypeError);
  for (const frame of witness.frames.slice(1)) {
    runtime.input(frame);
    runtime.step();
  }
  const final = runtime.snapshot();
  assert.equal(runtime.isComplete(), true);
  assert.equal(final.completedOrders, witness.snapshot.metrics.completedOrders);
  assert.deepEqual(final.state, witness.snapshot);
  assert.throws(() => runtime.step(), /input|frame|complete/i);
  assert.equal(runtime.reset(JSON.parse(JSON.stringify(manifest)), witness.seed).tick, 0);
  runtime.input(witness.frames[0]);
  runtime.reset(manifest, witness.seed);
  assert.throws(() => runtime.step(), /input|frame/i, 'Reset clears a pending input');
  const altered = structuredClone(manifest);
  altered.objective = 'A different game';
  assert.throws(() => runtime.reset(altered, witness.seed), /manifest|build/i);
  assert.throws(() => runtime.reset(manifest, -1), /seed/i);
  assert.equal(runtime.snapshot().tick, 0, 'Invalid resets preserve the valid lifecycle');
});

void test('PC01 synchronous score validation stays bound to its verified manifest and complete trace', async () => {
  const recipe = initialRecipes[0];
  const manifest = await buildRecipe(recipe);
  const witness = createCompletingWitness(recipe);
  const runtime = await createPartyRuntime(manifest, witness.seed);
  const trial = { protocolVersion: 'party-forge/1', roundId: 'round-score', buildId: manifest.buildId,
    buildHash: manifest.contentHash, attemptId: 'attempt-score', seed: witness.seed, frames: witness.frames };
  assert.deepEqual(runtime.validateScore(manifest, trial), {
    completedOrders: witness.snapshot.metrics.completedOrders, failedOrders: witness.snapshot.metrics.failedOrders,
  });
  assert.equal(runtime.snapshot().tick, 0, 'Verification does not overwrite the active player lifecycle');
  assert.throws(() => runtime.validateScore(manifest, { ...trial, completedOrders: 999 }));
  assert.throws(() => runtime.validateScore(manifest, { ...trial, buildId: 'another-build' }));
  assert.throws(() => runtime.validateScore(manifest, { ...trial, frames: witness.frames.slice(1) }));
});

void test('retained executable replays identical full snapshots in Node, Chrome and workerd', { timeout: 120_000 }, async () => {
  const retained = await readFile(new URL('../lib/party-forge/runtimes/kitchen-chaos-v1/retained/engine.js', import.meta.url), 'utf8');
  const worker = new Miniflare({ compatibilityDate: '2026-05-15', modulesRoot: '/',
    modules: [
      { type: 'ESModule', path: '/worker.js', contents: 'import { replayRuntime } from "./engine.js"; export default { async fetch(request) { const {recipe,seed,frames} = await request.json(); return Response.json(replayRuntime(recipe,seed,frames)); } };' },
      { type: 'ESModule', path: '/engine.js', contents: retained },
    ],
  });
  let browser;
  try {
    await worker.ready;
    browser = await chromium.launch({ channel: 'chrome' });
    const page = await browser.newPage();
    const moduleURL = `data:text/javascript;base64,${Buffer.from(retained).toString('base64')}`;
    for (const initial of initialRecipes) {
      const recipe = { ...initial, additions: ['dinner-bell', 'hot-potato', 'zombie-pantry'] };
      const witness = createCompletingWitness(recipe);
      const input = { recipe, seed: witness.seed, frames: witness.frames };
      const expected = replayRuntime(recipe, input.seed, input.frames);
      const browserResult = await page.evaluate(async ({ moduleURL, input }) => {
        const engine = await import(moduleURL);
        return engine.replayRuntime(input.recipe, input.seed, input.frames);
      }, { moduleURL, input });
      const response = await worker.dispatchFetch('http://runtime.test/replay', { method: 'POST', body: JSON.stringify(input) });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), expected);
      assert.deepEqual(browserResult, expected);
    }
  } finally {
    await browser?.close();
    await worker.dispose();
  }
});
