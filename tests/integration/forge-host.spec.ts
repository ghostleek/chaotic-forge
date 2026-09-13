import { test, expect } from '@playwright/test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  prepareHostConfig,
  migrateLocal,
  startHost,
} from '../../scripts/party-host-process.mjs';

test('real Worker/D1 enforces code, csrf, ownership, quotas, dispatch recovery and cancellation', async ({
  playwright,
}) => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-host-'));
  const origin = 'http://127.0.0.1:3199';
  const secret = 'fixture-runner-secret-not-for-production-0000';
  const code = 'fixture-creator-code-not-for-production';
  const config = await prepareHostConfig({
    directory,
    vars: {
      FORGE_AUTH_MODE: 'legacy-code',
      FORGE_ORIGIN: origin,
      FORGE_CODE_HASH: createHash('sha256').update(code).digest('hex'),
      FORGE_RUNNER_SECRET: secret,
      FORGE_ENABLED: 'true',
      FORGE_DAILY_JOBS: '5',
    },
  });
  await migrateLocal(config, directory);
  let host = await startHost({ config, persistTo: directory, port: 3199 });
  const client = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const other = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  try {
    expect(
      (await client.post('/api/forge/generations', { data: {} })).status(),
    ).toBe(401);
    expect(
      (
        await client.post('/api/forge/access', {
          data: { code },
          headers: { Origin: 'https://evil.test' },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await client.post('/api/forge/access', { data: { code: 'wrong' } })
      ).status(),
    ).toBe(401);
    const access = await client.post('/api/forge/access', { data: { code } });
    expect(access.status()).toBe(200);
    expect(access.headers()['set-cookie']).toContain('HttpOnly');
    const { csrf } = await access.json();
    expect(
      (await client.post('/api/forge/generations', { data: {} })).status(),
    ).toBe(403);
    const runner = async (data: object) =>
      client.post('/api/forge/runner', {
        data,
        headers: { Authorization: `Bearer ${secret}` },
      });
    expect(
      (
        await client.post('/api/forge/runner', { data: { action: 'claim' } })
      ).status(),
    ).toBe(401);
    await runner({ action: 'claim' });
    const body = {
      requestKey: crypto.randomUUID(),
      cards: ['snake', 'invaders'],
    };
    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        client.post('/api/forge/generations', {
          data: body,
          headers: { 'X-Forge-CSRF': csrf },
        }),
      ),
    );
    for (const response of responses)
      expect(response.status(), await response.text()).toBe(202);
    const jobs = await Promise.all(responses.map((r) => r.json()));
    expect(new Set(jobs.map((j) => j.id)).size).toBe(1);
    const job = jobs[0];
    expect(
      (
        await client.post('/api/forge/generations', {
          data: { ...body, requestKey: crypto.randomUUID() },
          headers: { 'X-Forge-CSRF': csrf },
        })
      ).status(),
    ).toBe(429);
    const otherAccess = await other.post('/api/forge/access', {
      data: { code },
    });
    expect(otherAccess.status()).toBe(200);
    expect((await other.get(`/api/forge/generations/${job.id}`)).status()).toBe(
      404,
    );
    const claim = await (await runner({ action: 'claim' })).json();
    expect(claim.job.fresh).toBe(true);
    expect(
      (
        await runner({
          action: 'update',
          id: job.id,
          lease: 'wrong',
          status: 'building',
        })
      ).status(),
    ).toBe(409);
    await runner({
      action: 'update',
      id: job.id,
      lease: claim.job.lease,
      status: 'building',
      sessionId: 'fixture-session',
    });
    await host.stop();
    host = await startHost({ config, persistTo: directory, port: 3199 });
    expect(
      (await (await client.get(`/api/forge/generations/${job.id}`)).json())
        .status,
    ).toBe('building');
    const canceled = await client.post(
      `/api/forge/generations/${job.id}/cancel`,
      { data: {}, headers: { 'X-Forge-CSRF': csrf } },
    );
    expect((await canceled.json()).status).toBe('canceling');
    const completion = await runner({
      action: 'update',
      id: job.id,
      lease: claim.job.lease,
      status: 'preview',
      code: '<canvas></canvas>',
      evidence: { fixture: true },
      model: 'fixture',
      turnId: 'fixture-turn',
    });
    expect((await completion.json()).status).toBe('canceling');
    expect(
      (await client.get(`/api/forge/generations/${job.id}/artifact`)).status(),
    ).toBe(409);
    await runner({
      action: 'update',
      id: job.id,
      lease: claim.job.lease,
      status: 'canceled',
    });
    const fresh = await (
      await client.post('/api/forge/generations', {
        data: { ...body, requestKey: crypto.randomUUID() },
        headers: { 'X-Forge-CSRF': csrf },
      })
    ).json();
    const next = await (await runner({ action: 'claim' })).json();
    const codeFixture = await readFile(
      'tests/fixtures/forge/worker.js',
      'utf8',
    );
    expect(
      (
        await runner({
          action: 'update',
          id: fresh.id,
          lease: next.job.lease,
          status: 'preview',
          code: codeFixture,
          evidence: { fixture: true },
          sessionId: 'fixture-2',
          turnId: 'fixture-turn',
          model: 'fixture-only',
        })
      ).status(),
    ).toBe(200);
    const artifact = await client.get(
      `/api/forge/generations/${fresh.id}/artifact`,
    );
    expect(artifact.status()).toBe(200);
    expect(artifact.headers()['content-security-policy']).toContain(
      'sandbox allow-scripts',
    );
    expect(await artifact.text()).toContain('new Worker');
    expect(
      (
        await client.post(`/api/forge/generations/${fresh.id}/accept`, {
          data: { completedRun: true, checkedConcepts: [] },
          headers: { 'X-Forge-CSRF': csrf },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await client.post(`/api/forge/generations/${fresh.id}/accept`, {
          data: { completedRun: true, checkedConcepts: body.cards },
          headers: { 'X-Forge-CSRF': csrf },
        })
      ).status(),
    ).toBe(200);
    await client.delete('/api/forge/access', {
      headers: { 'X-Forge-CSRF': csrf },
    });
    expect(
      (await client.get(`/api/forge/generations/${fresh.id}`)).status(),
    ).toBe(401);
    const renewed = await client.post('/api/forge/access', { data: { code } });
    expect(renewed.status()).toBe(200);
    expect(
      (await client.get(`/api/forge/generations/${fresh.id}`)).status(),
    ).toBe(200);
    expect(
      await (
        await client.get(`/api/forge/generations/${fresh.id}/artifact`)
      ).text(),
    ).toBe(await artifact.text());
  } finally {
    await client.dispose();
    await other.dispose();
    await host.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
