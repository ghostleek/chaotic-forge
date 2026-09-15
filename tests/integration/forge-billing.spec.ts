import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  prepareHostConfig,
  migrateLocal,
  startHost,
} from '../../scripts/party-host-process.mjs';

test('local trusted identity boundary isolates BYOK and restricts sponsorship to authenticated admins', async ({
  playwright,
}) => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-billing-'));
  const origin = 'http://127.0.0.1:3198';
  const secret = 'fixture-runner-secret-not-for-production-0000';
  const key = 'sk-fixture-only-not-a-real-api-key';
  const config = await prepareHostConfig({
    directory,
    vars: {
      FORGE_ORIGIN: origin,
      FORGE_RUNNER_SECRET: secret,
      FORGE_ENABLED: 'true',
      FORGE_DAILY_JOBS: '10',
      FORGE_KEY_ENCRYPTION_SECRET: 'ab'.repeat(32),
      FORGE_ADMIN_EMAILS: 'leekahhow@gmail.com',
      FORGE_TRIAL_ENABLED: 'true',
    },
  });
  await migrateLocal(config, directory);
  const host = await startHost({ config, persistTo: directory, port: 3198 });
  // Fixture headers model dispatch's trusted identity output. Production dispatch strips caller-supplied identity.
  const make = (id?: string) =>
    playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: {
        Origin: origin,
        ...(id
          ? {
              'oai-authenticated-user-id': id,
              'oai-authenticated-user-email':
                id === 'owner' ? 'leekahhow@gmail.com' : `${id}@fixture.test`,
            }
          : {}),
      },
    });
  const anonymous = await make();
  const owner = await make('owner');
  const user = await make('user');
  const other = await make('other');
  try {
    expect((await anonymous.get('/api/forge/access')).status()).toBe(401);
    const csrf = (await (await user.get('/api/forge/access')).json()).csrf;
    const ownerCsrf = (await (await owner.get('/api/forge/access')).json())
      .csrf;
    const otherCsrf = (await (await other.get('/api/forge/access')).json())
      .csrf;
    expect(
      (await user.post('/api/forge/billing', { data: { key } })).status(),
    ).toBe(403);
    expect(
      (
        await user.post('/api/forge/trials', {
          data: { userId: 'user' },
          headers: { 'X-Forge-CSRF': csrf },
        })
      ).status(),
    ).toBe(403);
    const runner = (data: object) =>
      owner.post('/api/forge/runner', {
        data,
        headers: { Authorization: `Bearer ${secret}` },
      });
    const heartbeat = await runner({ action: 'claim' });
    expect(heartbeat.status(), await heartbeat.text()).toBe(200);
    const submit = (client: typeof user, csrf: string) =>
      client.post('/api/forge/generations', {
        data: { requestKey: crypto.randomUUID(), cards: ['snake', 'invaders'] },
        headers: { 'X-Forge-CSRF': csrf },
      });
    expect((await submit(user, csrf)).status()).toBe(402);
    const saved = await user.post('/api/forge/billing', {
      data: { key },
      headers: { 'X-Forge-CSRF': csrf },
    });
    expect(saved.status()).toBe(200);
    expect(await saved.text()).not.toContain(key);
    expect((await (await other.get('/api/forge/billing')).json()).hasKey).toBe(
      false,
    );
    expect((await submit(user, csrf)).status()).toBe(202);
    const claim = await (await runner({ action: 'claim' })).json();
    expect(claim.apiKey).toBe(key);
    expect(claim.job.key_ciphertext).not.toContain(key);
    expect(
      (await other.get(`/api/forge/generations/${claim.job.id}`)).status(),
    ).toBe(404);
    expect(
      await (await user.get('/api/forge/generations')).text(),
    ).not.toContain(key);
    expect(
      (
        await runner({
          action: 'update',
          id: claim.job.id,
          lease: claim.job.lease,
          status: 'failed',
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await user.delete('/api/forge/billing', {
          headers: { 'X-Forge-CSRF': csrf },
        })
      ).status(),
    ).toBe(200);
    expect((await (await user.get('/api/forge/billing')).json()).hasKey).toBe(
      false,
    );
    expect(
      (
        await owner.post('/api/forge/trials', {
          data: { userId: 'other' },
          headers: { 'X-Forge-CSRF': ownerCsrf },
        })
      ).status(),
    ).toBe(403);
    expect((await submit(other, otherCsrf)).status()).toBe(402);
    expect((await submit(owner, ownerCsrf)).status()).toBe(202);
    const admin = await (await runner({ action: 'claim' })).json();
    expect(admin.job.billing).toBe('admin');
    expect(admin.apiKey).toBeNull();
  } finally {
    await Promise.all([
      anonymous.dispose(),
      owner.dispose(),
      user.dispose(),
      other.dispose(),
    ]);
    await host.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
