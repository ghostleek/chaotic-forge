import { test, expect } from '@playwright/test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareHostConfig, migrateLocal, startHost } from '../../scripts/party-host-process.mjs';
import { brief } from '../fixtures/forge/brief.mjs';

test('confirmed room cards fund one shared job; guests see durable progress and isolated playtests', async ({ browser, playwright }) => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-room-generation-'));
  const origin = 'http://127.0.0.1:3196';
  const secret = 'fixture-runner-secret-not-for-production-0000';
  const config = await prepareHostConfig({ directory, vars: {
    FORGE_ORIGIN: origin, FORGE_RUNNER_SECRET: secret, FORGE_ENABLED: 'true',
    FORGE_DAILY_JOBS: '10', FORGE_KEY_ENCRYPTION_SECRET: 'ab'.repeat(32),
  } });
  await migrateLocal(config, directory);
  let host = await startHost({ config, persistTo: directory, port: 3196 });
  // Local fixture headers stand in for trusted dispatch identity, not caller-controlled production identity.
  const hostContext = await browser.newContext({ extraHTTPHeaders: {
    'oai-authenticated-user-id': 'room-admin-fixture', 'oai-authenticated-user-email': 'leekahhow@gmail.com',
  } });
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const runnerContext = await playwright.request.newContext({ baseURL: origin, extraHTTPHeaders: { Origin: origin, Authorization: `Bearer ${secret}` } });
  const owner = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const runner = (data: object) => runnerContext.post('/api/forge/runner', { data });
  try {
    expect((await runner({ action: 'claim' })).status()).toBe(200);
    await owner.goto(origin);
    await owner.getByRole('textbox', { name: 'Your name' }).fill('Host fixture');
    await owner.getByRole('button', { name: 'Create room', exact: true }).click();
    await owner.getByRole('button', { name: 'Create live room', exact: true }).click();
    await expect(owner).toHaveURL(/\/party\//);
    await guest.goto(owner.url());
    await guest.getByRole('textbox', { name: 'Your name' }).fill('Guest fixture');
    await guest.getByRole('button', { name: 'Join room', exact: true }).click();
    for (const observer of [owner, guest]) await expect(observer.getByText('2 players joined · Enough players to start', { exact: true })).toBeVisible();
    for (const [page, input] of [[owner, 'Doom'], [guest, 'Pac-Man']] as const) {
      await page.getByRole('textbox', { name: 'Your instruction', exact: true }).fill(input);
      await page.getByRole('button', { name: 'Confirm instruction', exact: true }).click();
      for (const observer of [owner, guest]) await expect(observer.locator('p').filter({ hasText: new RegExp(`^${input}$`) })).toBeVisible();
    }
    await expect(owner.getByRole('button', { name: 'Generate game', exact: true })).toBeEnabled();
    await owner.getByRole('button', { name: 'Generate game', exact: true }).click();
    for (const page of [owner, guest]) await expect(page.getByText('Waiting for a runner', { exact: true })).toBeVisible();
    const claim = await (await runner({ action: 'claim' })).json();
    expect(JSON.parse(claim.job.cards)).toEqual(['Doom', 'Pac-Man']);
    expect(claim.job.room_id).toBe(owner.url().split('/').at(-1));
    expect(claim.job.billing).toBe('admin');
    expect(claim.apiKey).toBeNull();
    // Retrieve each browser's existing private capability without copying it into the playtest.
    const access = async (page: typeof owner) => page.evaluate(() => {
      for (let i = 0; i < sessionStorage.length; i++) {
        try { const v = JSON.parse(sessionStorage.getItem(sessionStorage.key(i)!)!); if (v?.access?.capability) return v.access; } catch { /* unrelated UI state */ }
      }
      throw new Error('Missing room access fixture');
    });
    const own = await access(owner), friend = await access(guest);
    const path = `/api/party/rooms/${own.roomId}/generation`;
    const api = async (page: typeof owner, capability: string, body?: object, originOverride?: string) => page.request.fetch(origin + path, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${capability}`, Origin: originOverride ?? origin }, ...(body ? { data: body } : {}),
    });
    const state = await (await api(owner, own.capability)).json();
    const generate = { action: 'generate', requestKey: crypto.randomUUID(), digest: state.digest };
    expect((await api(guest, friend.capability, generate)).status()).toBe(403);
    expect((await api(owner, own.capability, generate, 'https://other.test')).status()).toBe(403);
    expect((await api(owner, own.capability, { ...generate, cards: ['injected', 'cards'] })).status()).toBe(400);
    expect((await api(owner, own.capability, generate)).status()).toBe(429);
    expect((await api(guest, '00'.repeat(32))).status()).toBe(403);
    const gameBrief = { ...brief, contributions: brief.contributions.map((c, i) => ({ ...c, input: ['Doom', 'Pac-Man'][i] })) };
    const updated = await runner({ action: 'update', id: claim.job.id, lease: claim.job.lease,
      status: 'building', sessionId: 'fixture-session', progress: [{ id: 'fixture-search', kind: 'researched', at: Date.now() }],
    });
    expect(updated.status(), await updated.text()).toBe(200);
    for (const page of [owner, guest]) await expect(page.getByText('Web lookup completed', { exact: true }).first()).toBeVisible();
    await guest.reload();
    await expect(guest.getByText('Web lookup completed', { exact: true }).first()).toBeVisible();
    await host.stop();
    host = await startHost({ config, persistTo: directory, port: 3196 });
    const durable = await api(guest, friend.capability);
    expect(await durable.text()).not.toMatch(/fixture-session|room-admin-fixture|key_ciphertext|lease/);
    const preview = await runner({ action: 'update', id: claim.job.id, lease: claim.job.lease, status: 'preview',
      code: await readFile('tests/fixtures/forge/worker.js', 'utf8'), brief: gameBrief,
      evidence: { fixture: true }, model: 'authored-fixture-only', turnId: 'fixture-turn',
    });
    expect(preview.status(), await preview.text()).toBe(200);
    const hashes: string[] = [];
    for (const [page, membership] of [[owner, own], [guest, friend]] as const) {
      await expect(page.getByRole('button', { name: 'Open shared playtest', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: 'Open shared playtest', exact: true }).click();
      const frame = page.frameLocator('iframe[title="Generated room game playtest"]');
      await frame.getByRole('button', { name: 'Start game', exact: true }).click();
      await expect(frame.locator('canvas')).toHaveAttribute('data-frames', /[1-9]/);
      await expect(frame.getByText('Test fixture', { exact: true })).toBeVisible();
      const isolation = await frame.locator('body').evaluate(async () => {
        let parentBlocked = false, networkBlocked = false;
        try { void window.parent.document; } catch { parentBlocked = true; }
        try { await fetch('/api/forge/access'); } catch { networkBlocked = true; }
        return { parentBlocked, networkBlocked, csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') };
      });
      expect(isolation.parentBlocked).toBe(true);
      expect(isolation.networkBlocked).toBe(true);
      expect(isolation.csp).toContain("connect-src 'none'");
      const artifact = await (await api(page, membership.capability, { action: 'playtest', jobId: claim.job.id })).json();
      hashes.push(artifact.artifactHash);
      expect(artifact.html).not.toContain(membership.capability);
      await expect(page.getByText('Scores are local;', { exact: false })).toBeVisible();
    }
    expect(hashes[0]).toBe(hashes[1]);
    await guest.screenshot({ path: 'outputs/room-generation-fixture-mobile.png', fullPage: true });
    // A changed confirmed card invalidates the previous playable result.
    await guest.getByRole('textbox', { name: 'Your instruction', exact: true }).fill('Pac-Man with shields');
    await guest.getByRole('button', { name: 'Update instruction', exact: true }).click();
    await expect(owner.getByText('The room’s cards or players changed.', { exact: false })).toBeVisible();
    expect((await api(guest, friend.capability, { action: 'playtest', jobId: claim.job.id })).status()).toBe(409);
    // Overlapping player inputs are valid; retries reserve one room job.
    await guest.getByRole('textbox', { name: 'Your instruction', exact: true }).fill('Doom');
    await guest.getByRole('button', { name: 'Update instruction', exact: true }).click();
    await expect(owner.locator('p').filter({ hasText: /^Doom$/ })).toHaveCount(2);
    await runner({ action: 'claim' });
    const current = await (await api(owner, own.capability)).json();
    const duplicateRequest = { action: 'generate', requestKey: crypto.randomUUID(), digest: current.digest };
    for (const response of await Promise.all([api(owner, own.capability, duplicateRequest), api(owner, own.capability, duplicateRequest)])) expect(response.status(), await response.text()).toBe(202);
    const next = await (await runner({ action: 'claim' })).json();
    expect(JSON.parse(next.job.cards)).toEqual(['Doom', 'Doom']);
    // An optional third player joins without confirming: controls must stay mounted.
    const thirdContext = await browser.newContext();
    try {
      const third = await thirdContext.newPage();
      await third.goto(owner.url());
      await third.getByRole('textbox', { name: 'Your name' }).fill('Third fixture');
      await third.getByRole('button', { name: 'Join room', exact: true }).click();
      await expect(owner.getByText('3 players joined · Enough players to start', { exact: true })).toBeVisible();
      await expect(owner.getByRole('button', { name: 'Cancel generation', exact: true })).toBeEnabled();
      await owner.getByRole('button', { name: 'Cancel generation', exact: true }).click();
      await expect(guest.getByText('Canceling — waiting for confirmation', { exact: true })).toBeVisible();
    } finally { await thirdContext.close(); }

  } finally {
    await Promise.all([hostContext.close(), guestContext.close(), runnerContext.dispose()]);
    await host.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
