import { expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { makeRoom } from '../fixtures/party-forge.ts';
import {
  migrateLocal,
  prepareHostConfig,
  startHost,
} from '../../scripts/party-host-process.mjs';

test('built Worker + real local D1: migrate, separate browsers, race, restart, reread', async ({
  browser,
}) => {
  await mkdir('.wrangler', { recursive: true });
  const directory = await mkdtemp(resolve('.wrangler/party-proof-'));
  const persistTo = resolve(directory, 'state');
  const token = randomUUID();
  const config = await prepareHostConfig({ directory, proofToken: token });
  let host: Awaited<ReturnType<typeof startHost>> | undefined;
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  try {
    expect(await migrateLocal(config, persistTo)).toContain(
      '0000_bored_agent_brand.sql',
    );
    await migrateLocal(config, persistTo); // Repeat migrations must preserve existing schema.
    host = await startHost({ config, persistTo, port: 3108 });
    const baseURL = host.baseURL;
    const pages = await Promise.all(contexts.map((c) => c.newPage()));
    for (const page of pages) {
      await page.goto(baseURL);
      await expect(
        page.getByRole('heading', {
          name: 'Start with a game. Leave with a testable mechanic.',
        }),
      ).toBeVisible();
    }
    const endpoint = `${baseURL}/__party_host_proof/rooms/proof-room`;
    const headers = { authorization: `Bearer ${token}` };
    expect((await contexts[0].request.get(endpoint)).status()).toBe(403);
    const original = makeRoom('proof-room');
    expect(
      (
        await contexts[0].request.post(endpoint, {
          headers,
          data: { snapshot: original },
        })
      ).status(),
    ).toBe(201);
    expect(
      await (await contexts[1].request.get(endpoint, { headers })).json(),
    ).toEqual(original);
    const proposals = ['first', 'second'].map((nickname) => ({
      ...original,
      revision: 1,
      updatedAt: original.updatedAt + 100,
      participants: original.participants.map((p, i) =>
        i === 0 ? { ...p, nickname } : p,
      ),
    }));
    const race = await Promise.all(
      proposals.map((snapshot, i) =>
        contexts[i].request.put(endpoint, {
          headers,
          data: { snapshot, expectedRevision: 0 },
        }),
      ),
    );
    expect(race.map((r) => r.status()).sort((a, b) => a - b)).toEqual([
      200, 409,
    ]);
    const accepted = proposals[race.findIndex((r) => r.status() === 200)];
    expect(
      await (await contexts[2].request.get(endpoint, { headers })).json(),
    ).toEqual(accepted);
    await host.stop();
    host = undefined;
    host = await startHost({ config, persistTo, port: 3108 });
    expect(
      await (await contexts[2].request.get(endpoint, { headers })).json(),
    ).toEqual(accepted);
    expect(
      (
        await contexts[0].request.put(endpoint, {
          headers,
          data: { snapshot: proposals[0], expectedRevision: 0 },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await contexts[0].request.post(
          `${baseURL}/__party_host_proof/rooms/invalid`,
          {
            headers,
            data: {
              snapshot: {
                ...original,
                roomId: 'invalid',
                capability: 'forged',
              },
            },
          },
        )
      ).status(),
    ).toBe(400);
    await test.step(
      'cleanup also resolves after an unexpected signaled exit',
      async () => {
        const exited = once(host!.child, 'exit');
        host!.child.kill('SIGKILL');
        await exited;
        expect(host!.child.exitCode).toBeNull();
        expect(host!.child.signalCode).toBe('SIGKILL');
        await host!.stop();
        host = undefined;
      },
      { timeout: 5000 },
    );
  } finally {
    try {
      await Promise.all(contexts.map((c) => c.close()));
    } finally {
      await host?.stop();
      await rm(directory, { recursive: true, force: true });
    }
  }
});
