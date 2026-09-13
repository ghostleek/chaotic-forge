import { expect, test, type Page } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  PROTOCOL_VERSION,
  archiveSchema,
  commandReceiptSchema,
  completedResultSchema,
  gameHistorySchema,
  rankResults,
  roomSnapshotSchema,
  type BuildManifest,
  type CommandReceipt,
  type FrozenRound,
  type GameArchive,
  type ParticipantAccess,
  type RoomCommand,
  type RoomSnapshot,
  type TrialInput,
} from '../../lib/party-forge/contracts.ts';
import { recipeFromContributions } from '../../lib/party-forge/cards.ts';
import {
  createRuntime,
  replayRuntime,
  stepRuntime,
} from '../../lib/party-forge/runtimes/kitchen-chaos-v1/engine.ts';
import { hashValue } from '../../lib/party-forge/runtimes/kitchen-chaos-v1/integrity.ts';
import { manifestHash } from '../../lib/party-forge/validate-build.ts';
import { createCompletingWitness } from '../fixtures/party-builds/kitchen-chaos-v1.mjs';
import {
  hostEnvironment,
  migrateLocal,
  prepareHostConfig,
  startHost,
} from '../../scripts/party-host-process.mjs';

type HttpReply<T> = { status: number; body: T };
type CommandResponse = { receipt: CommandReceipt; snapshot: RoomSnapshot };
type SaveResponse = CommandResponse & { archiveId: string; archiveUrl: string };
type RoomResponse = {
  snapshot: RoomSnapshot;
  history: ReturnType<typeof gameHistorySchema.parse>[];
  historyCount: number;
};
type AccessResponse = { access: ParticipantAccess; snapshot: RoomSnapshot };
type ArchiveResponse = {
  archive: GameArchive;
  availability: { status: 'available' | 'unavailable'; reason?: string };
  provenance: 'room-authority' | 'portable-import-unverified';
  retention: { archive: string; rawTraceDays: number; portableExport: boolean };
};
type ImportResponse = {
  archiveId: string;
  archiveUrl: string;
  provenance: ArchiveResponse['provenance'];
};
type CommandAction = RoomCommand extends infer Command
  ? Command extends RoomCommand
    ? Omit<Command, 'protocolVersion' | 'commandId' | 'expectedRevision'>
    : never
  : never;

/** Same-origin requests originate in isolated browsers against real production routes. */
async function http<T>(
  page: Page,
  path: string,
  method: 'GET' | 'POST',
  capability?: string,
  body?: unknown,
): Promise<HttpReply<T>> {
  return page.evaluate(async ({ path, method, capability, body }) => {
    const response = await fetch(path, {
      method,
      headers: {
        ...(capability ? { authorization: `Bearer ${capability}` } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() as T };
  }, { path, method, capability, body });
}

function envelope(action: CommandAction, revision: number): RoomCommand {
  return { protocolVersion: PROTOCOL_VERSION, commandId: randomUUID(), expectedRevision: revision, ...action };
}

async function executeLocalSql(config: string, persistTo: string, sql: string) {
  const child = spawn(process.execPath, [
    resolve('node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB',
    '--local', '--config', config, '--persist-to', persistTo, '--command', sql,
  ], { env: hostEnvironment, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const [code] = await once(child, 'exit');
  expect(code, output).toBe(0);
}

/** Authored local legal traces, not human playtests. Every room score is server-derived. */
function trialsFor(round: FrozenRound, build: BuildManifest): TrialInput[] {
  const recipe = recipeFromContributions(build.contributions);
  const completing = createCompletingWitness(recipe, round.seed).frames;
  const neutral = Array.from({ length: 3600 }, (_, tick) => ({ tick, buttons: 0, yaw: 0, pitch: 0 }));
  let cooking = createRuntime(recipe, round.seed);
  let cookStartedAt = 0;
  for (const frame of completing) {
    cooking = stepRuntime(cooking, frame);
    if (cooking.stove.readyAtTick !== null) { cookStartedAt = cooking.tick; break; }
  }
  expect(cookStartedAt).toBeGreaterThan(0);
  const burning = neutral.map((frame, tick) => tick < cookStartedAt ? completing[tick] : frame);
  const frames = [completing, neutral, burning];
  expect(frames.map(input => {
    const { metrics } = replayRuntime(recipe, round.seed, input);
    return [metrics.completedOrders, metrics.failedOrders];
  })).toEqual([[1, 0], [0, 0], [0, 1]]);
  return frames.map(input => ({
    protocolVersion: PROTOCOL_VERSION, roundId: round.roundId, buildId: round.buildId,
    buildHash: round.buildHash, attemptId: randomUUID(), seed: round.seed, frames: input,
  }));
}

/**
 * Portable test fixture with an explicitly authored result for the exhausted deck.
 * V3 was NOT completed by the Worker. This imported result is local simulation
 * data and must remain portable-import-unverified, never room-authority evidence.
 */
async function exhaustedFixture(source: GameArchive, build: BuildManifest, round: FrozenRound): Promise<GameArchive> {
  const traces = trialsFor(round, build);
  const scores = traces.map((trial, index) => {
    const { metrics } = replayRuntime(recipeFromContributions(build.contributions), round.seed, trial.frames);
    return { participantId: round.roster[index], completedOrders: metrics.completedOrders, failedOrders: metrics.failedOrders };
  });
  const ranked = rankResults(round, scores);
  const result = completedResultSchema.parse({
    protocolVersion: PROTOCOL_VERSION, round,
    results: await Promise.all(scores.map(async (score, index) => ({
      ...score, rank: ranked.ranks[score.participantId], attemptId: traces[index].attemptId,
      traceHash: await hashValue(traces[index]),
    }))),
    editors: ranked.editors, nextTieCursor: ranked.nextTieCursor,
  });
  return archiveSchema.parse({
    ...source, archiveId: `authored-exhausted-${randomUUID()}`,
    // This authored completion has a synthetic end time; import provenance must
    // not turn it into a claim that the host observed another wall-clock round.
    savedAt: Math.max(Date.now(), round.submissionDeadline),
    finalBuild: build, builds: [...source.builds, build],
    history: [...source.history.filter(entry => entry.status !== 'aborted'), { status: 'completed', result }],
  });
}

async function browserReplay(page: Page, build: BuildManifest, seed: number) {
  const recipe = recipeFromContributions(build.contributions);
  const frames = createCompletingWitness(recipe, seed).frames;
  const proof = await page.evaluate(async ({ path, recipe, seed, frames }) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Retained runtime unavailable: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = `sha256:${Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')}`;
    const engine: typeof import('../../lib/party-forge/runtimes/kitchen-chaos-v1/engine.ts') = await import(path);
    let state = engine.createRuntime(recipe, seed);
    const initial = engine.snapshotRuntime(state);
    for (const frame of frames) state = engine.stepRuntime(state, frame);
    const finished = engine.snapshotRuntime(state);
    state = engine.resetRuntime(state);
    const reset = engine.snapshotRuntime(state);
    for (const frame of frames) state = engine.stepRuntime(state, frame);
    return { hash, initial, finished, reset, secondAttempt: engine.snapshotRuntime(state) };
  }, { path: `/${build.runtime.key}`, recipe, seed, frames });
  expect(proof.hash).toBe(build.runtime.hash);
  expect(proof.initial.tick).toBe(0);
  expect(proof.finished.tick).toBe(3600);
  expect(proof.finished.status).toBe('complete');
  expect(proof.finished.metrics.completedOrders).toBeGreaterThan(0);
  expect(proof.reset).toEqual(proof.initial);
  expect(proof.secondAttempt).toEqual(proof.finished);
  return proof;
}

test('durable archives over built Worker/D1: played versions, portable imports, fresh replay and exhausted remix', async ({ browser }) => {
  test.setTimeout(400_000);
  await mkdir('.wrangler', { recursive: true });
  const directory = await mkdtemp(resolve('.wrangler/party-archive-proof-'));
  const persistTo = resolve(directory, 'state');
  let config = await prepareHostConfig({ directory });
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  let host: Awaited<ReturnType<typeof startHost>> | undefined;
  let capabilities = [0, 1, 2].map(() => randomBytes(32).toString('hex'));
  let accesses: ParticipantAccess[] = [];
  let roomPath = '';

  async function read(index = 0): Promise<RoomResponse> {
    const response = await http<RoomResponse>(pages[index], roomPath, 'GET', capabilities[index]);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    response.body.snapshot = roomSnapshotSchema.parse(response.body.snapshot);
    response.body.history.forEach(entry => gameHistorySchema.parse(entry));
    for (const secret of capabilities) expect(JSON.stringify(response.body)).not.toContain(secret);
    return response.body;
  }
  async function post(index: number, command: RoomCommand, archive = false): Promise<HttpReply<SaveResponse>> {
    const response = await http<SaveResponse>(pages[index], `${roomPath}/${archive ? 'archive' : 'commands'}`, 'POST', capabilities[index], command);
    if ([200, 409].includes(response.status) && response.body.receipt) {
      response.body.receipt = commandReceiptSchema.parse(response.body.receipt);
      response.body.snapshot = roomSnapshotSchema.parse(response.body.snapshot);
    }
    return response;
  }
  async function act(index: number, action: CommandAction, status = 200): Promise<CommandResponse> {
    const response = await post(index, envelope(action, (await read(index)).snapshot.revision));
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    expect(response.body.receipt.status).toBe(status === 200 ? 'accepted' : 'rejected');
    return response.body;
  }
  async function createRoom(setup: { kind: 'fresh' } | { kind: 'play-again' | 'remix'; archiveId: string }) {
    capabilities = [0, 1, 2].map(() => randomBytes(32).toString('hex'));
    accesses = [];
    const created = await http<AccessResponse>(pages[0], '/api/party/rooms', 'POST', capabilities[0], {
      protocolVersion: PROTOCOL_VERSION, commandId: randomUUID(), nickname: 'Archive host', setup,
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    accesses.push(created.body.access);
    roomPath = `/api/party/rooms/${created.body.access.roomId}`;
    for (const index of [1, 2]) {
      const joined = await http<AccessResponse>(pages[index], roomPath, 'POST', capabilities[index], {
        protocolVersion: PROTOCOL_VERSION, commandId: randomUUID(), nickname: `Archive player ${index}`,
      });
      expect(joined.status, JSON.stringify(joined.body)).toBe(201);
      accesses.push(joined.body.access);
    }
    return (await read()).snapshot;
  }
  async function startRound() {
    const ready = (await read()).snapshot;
    expect(ready.phase).toBe('ready');
    expect(ready.build.status).toBe('playable');
    if (ready.build.status !== 'playable') throw new Error('Ready needs a playable manifest');
    const build = ready.build.manifest;
    for (const index of [0, 1, 2]) await act(index, { type: 'acknowledge-build', buildId: build.buildId, buildHash: build.contentHash });
    const started = await act(0, { type: 'start-round' });
    expect(started.snapshot.phase).toBe('playing');
    expect(started.snapshot.round!.roster).toEqual(accesses.map(access => access.participantId));
    return { build, round: started.snapshot.round! };
  }
  async function completeRound(round: FrozenRound, build: BuildManifest) {
    const trials = trialsFor(round, build);
    // The actual production sixty-second deadline remains intact throughout.
    while (Date.now() < round.submissionDeadline + 100) {
      for (const index of [0, 1, 2]) await read(index);
      const remaining = round.submissionDeadline + 100 - Date.now();
      if (remaining > 0) await new Promise(done => setTimeout(done, Math.min(4000, remaining)));
    }
    for (const index of [0, 1, 2]) await act(index, { type: 'submit-trial', trial: trials[index] });
    const completed = await read();
    expect(completed.snapshot.phase).toBe('results');
    expect(completed.snapshot.lastCompleted!.results.map(result => [result.completedOrders, result.failedOrders, result.rank]))
      .toEqual([[1, 0, 1], [0, 0, 2], [0, 1, 3]]);
    return completed;
  }
  async function archiveAt(page: Page, id: string): Promise<ArchiveResponse> {
    const response = await http<ArchiveResponse>(page, `/api/party/archives/${id}`, 'GET');
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    response.body.archive = archiveSchema.parse(response.body.archive);
    return response.body;
  }

  try {
    await migrateLocal(config, persistTo);
    host = await startHost({ config, persistTo, port: 3120 });
    for (const page of pages) await page.goto(host.baseURL);
    await createRoom({ kind: 'fresh' });
    await test.step('unfinished sessions cannot become finished archives', async () => {
      const before = await read();
      expect((await post(0, envelope({ type: 'save-game' }, before.snapshot.revision), true)).status).toBe(409);
      expect((await read()).snapshot.revision).toBe(before.snapshot.revision);
    });
    await act(0, { type: 'choose-initial', choice: { slot: 'fps', cardId: 'knockback' } });
    await act(1, { type: 'choose-initial', choice: { slot: 'zombies', cardId: 'pursuers' } });
    await act(2, { type: 'choose-initial', choice: { slot: 'cooking', cardId: 'quick-orders' } });
    const first = await startRound();
    await completeRound(first.round, first.build);
    await act(1, { type: 'vote', vote: 'continue' });
    await act(0, { type: 'add-mechanic', cardId: 'dinner-bell' });
    await act(2, { type: 'add-mechanic', cardId: 'hot-potato' });
    const second = await startRound();
    const secondCompleted = await completeRound(second.round, second.build);
    expect(secondCompleted.historyCount).toBe(2);
    expect(second.build.contributions.slice(0, 3)).toEqual(first.build.contributions);

    let candidate: BuildManifest;
    let abortedRound: FrozenRound;
    await test.step('an unplayed full-deck candidate is aborted before the group ends on V2', async () => {
      await act(1, { type: 'vote', vote: 'continue' });
      await act(2, { type: 'add-mechanic', cardId: 'zombie-pantry' });
      const ready = await act(0, { type: 'pass' });
      expect(ready.snapshot.phase).toBe('ready');
      if (ready.snapshot.build.status !== 'playable') throw new Error('Expected qualified candidate');
      candidate = ready.snapshot.build.manifest;
      abortedRound = ready.snapshot.round!;
      expect(candidate.contributions).toHaveLength(6);
      expect(candidate.buildId).not.toBe(second.build.buildId);
      const aborted = await act(0, { type: 'abort-round' });
      expect(aborted.snapshot.build).toEqual({ status: 'playable', manifest: second.build });
      expect(aborted.snapshot.phase).toBe('results');
      for (const index of [0, 1, 2]) await act(index, { type: 'vote', vote: 'end' });
      expect((await read()).snapshot.phase).toBe('ended');
    });

    const originalRoom = roomPath;
    const originalAccesses = [...accesses];
    const originalCapabilities = [...capabilities];
    let saved: SaveResponse;
    let original: ArchiveResponse;
    let originalReplay: Awaited<ReturnType<typeof browserReplay>>;
    await test.step('racing archive saves are immutable and retain exactly the completed versions', async () => {
      const revision = (await read()).snapshot.revision;
      const command = envelope({ type: 'save-game' }, revision);
      const raced = await Promise.all([post(0, command, true), post(0, command, true)]);
      for (const response of raced) expect(response.status, JSON.stringify(response.body)).toBe(200);
      saved = raced[0].body;
      expect(raced[1].body.receipt).toEqual(saved.receipt);
      expect(raced[1].body.archiveId).toBe(saved.archiveId);
      expect(raced[1].body.archiveUrl).toBe(saved.archiveUrl);
      expect(saved.receipt.status).toBe('accepted');
      const commandRetry = await post(0, command);
      expect(commandRetry.status).toBe(200);
      expect(commandRetry.body.receipt).toEqual(saved.receipt);
      expect(commandRetry.body.archiveId).toBe(saved.archiveId);
      const laterSave = await post(1, envelope({ type: 'save-game' }, (await read(1)).snapshot.revision), true);
      expect(laterSave.status, JSON.stringify(laterSave.body)).toBe(200);
      expect(laterSave.body.archiveId).toBe(saved.archiveId);
      original = await archiveAt(pages[0], saved.archiveId);
      expect(original.provenance).toBe('room-authority');
      expect(original.availability).toEqual({ status: 'available' });
      expect(original.retention).toMatchObject({ archive: 'no-automatic-expiry', rawTraceDays: 0, portableExport: true });
      expect(original.archive.finalBuild).toEqual(second.build);
      expect(original.archive.builds).toEqual([first.build, second.build]);
      expect(original.archive.history.slice(0, 2)).toEqual(secondCompleted.history);
      expect(original.archive.history.at(-1)).toMatchObject({ status: 'aborted', round: abortedRound! });
      expect(original.archive.builds.some(build => build.buildId === candidate!.buildId)).toBe(false);
      expect(original.archive.parentArchiveId).toBeNull();
      expect(original.archive.forkSetup).toBeNull();
      const serialized = JSON.stringify(original.archive);
      for (const secret of originalCapabilities) expect(serialized).not.toContain(secret);
      expect(serialized).not.toContain('capability');
      expect(serialized).not.toContain('capabilityHash');
      expect((await http(pages[0], `${roomPath}/archive`, 'POST', undefined, command)).status).toBe(403);
      const download = await http<GameArchive>(pages[0], `/api/party/archives/${saved.archiveId}?download=1`, 'GET');
      expect(download.status).toBe(200);
      expect(download.body).toEqual(original.archive);
      originalReplay = await browserReplay(pages[0], original.archive.finalBuild, second.round.seed);
    });

    await test.step('closing the original browsers and restarting a later Worker entry preserves the hosted artifact', async () => {
      for (const context of contexts) await context.close();
      contexts.length = 0;
      pages.length = 0;
      await host!.stop();
      host = undefined;
      // A later local Worker entry retains the packaged application and immutable
      // executable assets. This is actual restart/configuration evidence, not a
      // claim of two production deployments or external availability.
      const laterDirectory = resolve(directory, 'later-deployment');
      const laterConfig = await prepareHostConfig({ directory: laterDirectory });
      const configuration = JSON.parse(await readFile(laterConfig, 'utf8'));
      const entry = resolve(laterDirectory, 'entry.mjs');
      await writeFile(entry, `import app from ${JSON.stringify(configuration.main)};\nexport default { async fetch(request, env, ctx) { const response = await app.fetch(request, env, ctx); const headers = new Headers(response.headers); headers.set('x-pc06-local-deployment', 'later'); return new Response(response.body, { status: response.status, statusText: response.statusText, headers }); } };\n`);
      configuration.main = entry;
      configuration.no_bundle = false;
      await writeFile(laterConfig, JSON.stringify(configuration, null, 2));
      config = laterConfig;
      host = await startHost({ config, persistTo, port: 3120 });
      for (const index of [0, 1, 2]) {
        const context = await browser.newContext();
        contexts.push(context);
        pages[index] = await context.newPage();
        await pages[index].goto(host.baseURL);
      }
      const marker = await pages[0].evaluate(async () => (await fetch('/api/party/archives/absent')).headers.get('x-pc06-local-deployment'));
      expect(marker).toBe('later');
      const recovered = await archiveAt(pages[0], saved!.archiveId);
      expect(recovered).toEqual(original!);
      expect(await browserReplay(pages[0], recovered.archive.finalBuild, second.round.seed)).toEqual(originalReplay!);
      const emptyStorage = await pages[0].evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
      expect(emptyStorage).toEqual({ local: 0, session: 0 });
    });

    await test.step('fresh replay starts with exact saved rules and independent participant authority', async () => {
      const replay = await createRoom({ kind: 'play-again', archiveId: saved!.archiveId });
      expect(roomPath).not.toBe(originalRoom);
      expect(replay.build).toEqual({ status: 'playable', manifest: second.build });
      expect(replay.phase).toBe('ready');
      expect(replay.lastCompleted).toBeNull();
      expect(replay.acknowledgments).toHaveLength(0);
      expect(replay.editSlots).toHaveLength(0);
      expect(replay.votes).toHaveLength(0);
      expect((await read()).history).toEqual([]);
      expect(accesses.every(access => !originalAccesses.some(old => old.participantId === access.participantId))).toBe(true);
      for (const oldSecret of originalCapabilities) expect((await http(pages[0], roomPath, 'GET', oldSecret)).status).toBe(403);
      expect((await http(pages[0], originalRoom, 'GET', capabilities[0])).status).toBe(403);
      const replayRound = await startRound();
      expect(replayRound.round.number).toBe(1);
      expect(replayRound.round.roundId).not.toBe(first.round.roundId);
      expect(replayRound.round.roundId).not.toBe(second.round.roundId);
      expect(replayRound.build).toEqual(second.build);
      await act(0, { type: 'add-mechanic', cardId: 'zombie-pantry' }, 409);
      await act(0, { type: 'abort-round' });
      expect((await read()).snapshot.lastCompleted).toBeNull();
      expect((await archiveAt(pages[0], saved!.archiveId)).archive).toEqual(original!.archive);
    });

    await test.step('portable imports validate integrity and never replace current work or manufacture authority', async () => {
      const before = await read();
      const downloaded = await http<GameArchive>(pages[0], `/api/party/archives/${saved!.archiveId}?download=1`, 'GET');
      const imported = await http<ImportResponse>(pages[0], '/api/party/import', 'POST', undefined, downloaded.body);
      expect([200, 201], JSON.stringify(imported.body)).toContain(imported.status);
      expect(imported.body.archiveId).toBe(saved!.archiveId);
      expect(imported.body.provenance).toBe('room-authority');
      const invalid = structuredClone(downloaded.body);
      invalid.finalBuild.objective = 'Corrupted content with an unchanged content hash';
      expect((await http(pages[0], '/api/party/import', 'POST', undefined, invalid)).status).toBe(400);
      const capabilityPayload = { ...downloaded.body, hostCapability: originalCapabilities[0] };
      expect((await http(pages[0], '/api/party/import', 'POST', undefined, capabilityPayload)).status).toBe(400);
      expect((await http(pages[0], '/api/party/import', 'POST', undefined, { ...downloaded.body, protocolVersion: 'party-forge/999' })).status).toBe(400);
      const collision = { ...downloaded.body, savedAt: downloaded.body.savedAt + 1 };
      expect((await http(pages[0], '/api/party/import', 'POST', undefined, collision)).status).toBe(409);
      const after = await read();
      expect(after.snapshot.revision).toBe(before.snapshot.revision);
      expect(after.snapshot.build).toEqual(before.snapshot.build);
      expect(after.history).toEqual(before.history);
      expect((await archiveAt(pages[0], saved!.archiveId)).archive).toEqual(original!.archive);
    });

    const authored = await exhaustedFixture(original!.archive, candidate!, abortedRound!);
    let authoredId: string;
    await test.step('an honestly labeled portable exhausted deck can be imported without old capabilities', async () => {
      const imported = await http<ImportResponse>(pages[0], '/api/party/import', 'POST', undefined, authored);
      expect([200, 201], JSON.stringify(imported.body)).toContain(imported.status);
      authoredId = imported.body.archiveId;
      expect(imported.body.provenance).toBe('portable-import-unverified');
      const retained = await archiveAt(pages[0], authoredId);
      expect(retained.archive).toEqual(authored);
      expect(retained.provenance).toBe('portable-import-unverified');
      expect(retained.archive.finalBuild.contributions).toHaveLength(6);
      expect(retained.availability).toEqual({ status: 'available' });
    });

    await test.step('all inherited choices kept are Play again; exhausted remix replaces only its claimed initial slot', async () => {
      const initial = authored.finalBuild.contributions.filter(contribution => contribution.kind === 'initial');
      await createRoom({ kind: 'remix', archiveId: authoredId! });
      for (const index of [0, 1, 2]) await act(index, { type: 'choose-fork', selection: { kind: 'keep', inheritedContributionId: initial[index].id } });
      const kept = (await read()).snapshot;
      expect(kept.phase).toBe('ready');
      expect(kept.build).toEqual({ status: 'playable', manifest: authored.finalBuild });
      expect(kept.fork?.mode).toBe('play-again');
      expect(kept.fork?.decisions).toHaveLength(3);
      await createRoom({ kind: 'remix', archiveId: authoredId! });
      const source = await archiveAt(pages[0], authoredId!);
      await act(0, { type: 'choose-fork', selection: { kind: 'replace', inheritedContributionId: initial[0].id, choice: { slot: 'fps', cardId: 'counter-ricochet' } } });
      await act(1, { type: 'choose-fork', selection: { kind: 'keep', inheritedContributionId: initial[0].id } }, 409);
      await act(1, { type: 'choose-fork', selection: { kind: 'keep', inheritedContributionId: initial[1].id } });
      await act(2, { type: 'choose-fork', selection: { kind: 'keep', inheritedContributionId: initial[2].id } });
      const remix = (await read()).snapshot;
      expect(remix.phase).toBe('ready');
      if (remix.build.status !== 'playable') throw new Error('Exhausted remix must remain playable');
      expect(remix.fork?.mode).toBe('remix');
      expect(remix.build.manifest.buildId).not.toBe(authored.finalBuild.buildId);
      expect(remix.build.manifest.parent).toEqual({ buildId: authored.finalBuild.buildId, contentHash: authored.finalBuild.contentHash });
      expect(recipeFromContributions(remix.contributions)).toEqual({
        fps: 'counter-ricochet', zombies: 'pursuers', cooking: 'quick-orders', additions: ['dinner-bell', 'hot-potato', 'zombie-pantry'],
      });
      expect(remix.contributions.slice(3)).toEqual(authored.finalBuild.contributions.slice(3));
      expect(remix.lastCompleted).toBeNull();
      expect(remix.editSlots).toHaveLength(0);
      expect((await read()).history).toEqual([]);
      for (const decision of remix.fork!.decisions) {
        expect(accesses.map(access => access.participantId)).toContain(decision.participantId);
        expect(decision.provenance.userDecision.participantId).toBe(decision.participantId);
      }
      const remixRound = await startRound();
      await act(0, { type: 'choose-fork', selection: { kind: 'keep', inheritedContributionId: initial[0].id } }, 409);
      expect(remixRound.round.number).toBe(1);
      const playedRemix = await completeRound(remixRound.round, remixRound.build);
      expect(playedRemix.history).toHaveLength(1);
      expect(playedRemix.snapshot.lastCompleted!.results.map(result => result.participantId))
        .toEqual(accesses.map(access => access.participantId));
      for (const index of [0, 1, 2]) await act(index, { type: 'vote', vote: 'end' });
      const forkSave = await post(0, envelope({ type: 'save-game' }, (await read()).snapshot.revision), true);
      expect(forkSave.status, JSON.stringify(forkSave.body)).toBe(200);
      const forkArchive = await archiveAt(pages[0], forkSave.body.archiveId);
      expect(forkArchive.provenance).toBe('room-authority');
      expect(forkArchive.archive.parentArchiveId).toBe(authoredId!);
      expect(forkArchive.archive.forkSetup).toEqual({
        protocolVersion: PROTOCOL_VERSION,
        sourceArchiveId: authoredId!,
        sourceBuildId: authored.finalBuild.buildId,
        sourceBuildHash: authored.finalBuild.contentHash,
        decisions: remix.fork!.decisions,
      });
      expect(forkArchive.archive.builds).toEqual([remixRound.build]);
      expect(forkArchive.archive.finalBuild).toEqual(remixRound.build);
      expect(forkArchive.archive.history).toEqual(playedRemix.history);
      expect(await archiveAt(pages[0], authoredId!)).toEqual(source);
      const fresh = await createRoom({ kind: 'fresh' });
      expect(fresh.contributions).toEqual([]);
      expect(fresh.build).toEqual({ status: 'empty' });
      expect(fresh.fork).toBeNull();
      expect((await read()).history).toEqual([]);
    });

    await test.step('missing executable versions remain unavailable without substitution', async () => {
      const unsupported = structuredClone(authored);
      unsupported.archiveId = `unsupported-${randomUUID()}`;
      const originalId = unsupported.finalBuild.buildId;
      const unavailable = structuredClone(unsupported.finalBuild);
      unavailable.runtime.version = 'kitchen-chaos-unavailable-v999';
      unavailable.runtime.key = 'party-forge/kitchen-chaos-unavailable-v999/engine.js';
      unavailable.contentHash = await manifestHash(unavailable);
      unavailable.buildId = `kc-${unavailable.contentHash.slice(7)}`;
      unsupported.finalBuild = unavailable;
      unsupported.builds = unsupported.builds.map(build => build.buildId === originalId ? unavailable : build);
      unsupported.history = unsupported.history.map(entry => entry.status === 'completed' && entry.result.round.buildId === originalId
        ? { ...entry, result: { ...entry.result, round: { ...entry.result.round, buildId: unavailable.buildId, buildHash: unavailable.contentHash } } }
        : entry);
      expect(archiveSchema.safeParse(unsupported).success).toBe(true);
      const before = await read();
      expect((await http(pages[0], '/api/party/import', 'POST', undefined, unsupported)).status).toBe(409);
      expect((await http(pages[0], `/api/party/archives/${unsupported.archiveId}`, 'GET')).status).toBe(404);
      expect((await read()).snapshot.revision).toBe(before.snapshot.revision);
      expect((await archiveAt(pages[0], authoredId!)).archive).toEqual(authored);
    });

    await test.step('archive retention is independent of removal of the original disposable room', async () => {
      const originalId = originalAccesses[0].roomId.replaceAll("'", "''");
      await executeLocalSql(config, persistTo, `DELETE FROM party_rooms WHERE id = '${originalId}'`);
      // Enrollment is removed with its room, so the old capability loses access.
      expect((await http(pages[0], originalRoom, 'GET', originalCapabilities[0])).status).toBe(403);
      const retained = await archiveAt(pages[0], saved!.archiveId);
      expect(retained).toEqual(original!);
      expect(await browserReplay(pages[0], retained.archive.finalBuild, second.round.seed)).toEqual(originalReplay!);
    });

    await test.step('real D1 failure does not replace durable saves or fabricate a successful import', async () => {
      const before = await read();
      const incoming = { ...authored, archiveId: `storage-failure-${randomUUID()}` };
      await executeLocalSql(config, persistTo, 'ALTER TABLE party_archive_history RENAME TO pc06_unavailable_history');
      try {
        expect((await http(pages[0], `/api/party/archives/${saved!.archiveId}`, 'GET')).status).toBe(503);
        const response = await http(pages[0], '/api/party/import', 'POST', undefined, incoming);
        expect(response.status).toBe(503);
      } finally {
        await executeLocalSql(config, persistTo, 'ALTER TABLE pc06_unavailable_history RENAME TO party_archive_history');
      }
      expect((await http(pages[0], `/api/party/archives/${incoming.archiveId}`, 'GET')).status).toBe(404);
      const retry = await http<ImportResponse>(pages[0], '/api/party/import', 'POST', undefined, incoming);
      expect([200, 201], JSON.stringify(retry.body)).toContain(retry.status);
      expect((await archiveAt(pages[0], incoming.archiveId)).archive).toEqual(incoming);
      expect((await archiveAt(pages[0], saved!.archiveId)).archive).toEqual(original!.archive);
      expect((await read()).snapshot.revision).toBe(before.snapshot.revision);
      expect((await read()).history).toEqual(before.history);
      await host!.stop();
      host = undefined;
      host = await startHost({ config, persistTo, port: 3120 });
      expect((await archiveAt(pages[0], saved!.archiveId)).archive).toEqual(original!.archive);
      expect((await archiveAt(pages[0], authoredId!)).archive).toEqual(authored);
    });
  } finally {
    try {
      await Promise.all(contexts.map(context => context.close()));
    } finally {
      await host?.stop();
      await rm(directory, { recursive: true, force: true });
    }
  }
});
