import test from 'node:test';
import assert from 'node:assert/strict';
import {
  itemProgress,
  mergeProgress,
  publicProgress,
  gameBriefSchema,
} from '../lib/party-forge/generation/progress.ts';
import { selectionSchema } from '../lib/party-forge/generation/contracts.ts';
import { generationRequest, consumeJob } from '../scripts/forge/runner.mjs';
import { brief } from './fixtures/forge/brief.mjs';

await test('custom inputs preserve game requests; empty, duplicate and oversized requests fail', () => {
  const input = { requestKey: crypto.randomUUID(), cards: ['Doom', 'Pac-Man'] };
  assert.deepEqual(selectionSchema.parse(input).cards, input.cards);
  for (const cards of [
    ['Doom', ' doom '],
    ['', 'Pac-Man'],
    ['x'.repeat(301), 'Pac-Man'],
  ])
    assert.equal(selectionSchema.safeParse({ ...input, cards }).success, false);
  const request = generationRequest(
    { id: 'fixture', cards: JSON.stringify(input.cards) },
    null,
  );
  assert.deepEqual(request.agent.tools, [{ type: 'web_search', mode: 'live' }]);
  assert.match(request.input, /Doom/);
  assert.match(request.input, /brief.json/);
  assert.match(request.input, /BEFORE code/);
});

await test('activity exposes only safe metadata and deduplicates recovered items', () => {
  const raw = {
    id: 'search-1',
    type: 'web_search_call',
    status: 'completed',
    output: 'sk-secret',
    command: 'private text',
  };
  const entry = itemProgress(raw, 100);
  assert.deepEqual(entry, {
    id: 'search-1:researched',
    kind: 'researched',
    at: 100,
  });
  assert.equal(
    itemProgress({ id: 'reason', type: 'reasoning', text: 'private' }),
    null,
  );
  assert.equal(
    itemProgress({ id: 'message', type: 'message', text: 'private' }),
    null,
  );
  assert.deepEqual(mergeProgress([entry], [{ ...entry, at: 200 }]), [entry]);
  const log = Array.from({ length: 100 }, (_, i) => ({
    ...entry,
    id: String(i),
  }));
  assert.equal(mergeProgress([], log).length, 80);
  assert.deepEqual(publicProgress('{broken'), { progress: [], brief: null });
  assert.equal(
    JSON.stringify(
      publicProgress(
        JSON.stringify({ progress: [entry], dispatchLease: 'secret' }),
      ),
    ).includes('secret'),
    false,
  );
});

await test('brief rejects executable links and preserves winner and contribution requirements', () => {
  assert.equal(gameBriefSchema.safeParse(brief).success, true);
  assert.equal(
    gameBriefSchema.safeParse({
      ...brief,
      sources: [{ title: 'bad', url: 'javascript:alert(1)' }],
    }).success,
    false,
  );
  assert.equal(
    gameBriefSchema.safeParse({ ...brief, winner: '' }).success,
    false,
  );
});

await test('missing brief fails instead of promoting a generated game', async () => {
  const updates = [];
  await consumeJob({
    job: {
      id: 'fixture',
      session_id: 'existing',
      created: Date.now(),
      cards: '["Doom","Pac-Man"]',
    },
    client: {
      beta: {
        agents: {
          sessions: {
            turns: {
              list: async () => ({
                data: [{ id: 'turn', status: 'completed' }],
              }),
            },
            artifacts: { async *list() {} },
          },
        },
      },
    },
    update: async (fields) => {
      updates.push(fields);
      return { status: fields.status ?? 'building' };
    },
    validate: async () => {
      throw new Error('must not validate without a brief');
    },
  });
  assert.equal(updates.at(-1).status, 'failed');
  assert.equal(
    updates.some((value) => value.status === 'preview'),
    false,
  );
});

await test('malformed or mismatched completed briefs fail terminally, never loop in recovery', async () => {
  for (const output of [
    '{',
    JSON.stringify({
      ...brief,
      contributions: brief.contributions.map((c) => ({ ...c, input: 'wrong' })),
    }),
  ]) {
    const updates = [];
    await consumeJob({
      job: {
        id: 'fixture',
        session_id: 's',
        created: Date.now(),
        cards: '["snake","invaders"]',
      },
      client: {
        beta: {
          agents: {
            sessions: {
              turns: {
                list: async () => ({
                  data: [{ id: 't', status: 'completed' }],
                }),
              },
              artifacts: {
                async *list() {
                  yield {
                    id: 'b',
                    turn_id: 't',
                    path: '/workspace/outputs/brief.json',
                    size_bytes: output.length,
                  };
                },
                content: async () => new Response(output),
              },
            },
          },
        },
      },
      update: async (fields) => {
        updates.push(fields);
        return { status: fields.status ?? 'building' };
      },
    });
    assert.equal(updates.at(-1).status, 'failed');
  }
});

await test('cancellation and deadline are processed before reading activity or malformed artifacts', async () => {
  for (const cancel of [true, false]) {
    const updates = [];
    await consumeJob({
      job: {
        id: 'fixture',
        session_id: 's',
        created: cancel ? Date.now() : 0,
        status: cancel ? 'canceling' : 'building',
      },
      client: {
        beta: {
          agents: {
            sessions: {
              turns: {
                list: async () => ({
                  data: [{ id: 't', status: 'completed' }],
                }),
              },
              events: { create: async () => ({}) },
              items: {
                list: () => {
                  throw new Error('must not fetch activity');
                },
              },
              artifacts: {
                list: () => {
                  throw new Error('must not fetch malformed brief');
                },
              },
            },
          },
        },
      },
      update: async (fields) => {
        updates.push(fields);
        return { status: fields.status ?? (cancel ? 'canceling' : 'building') };
      },
    });
    assert.equal(updates.at(-1).status, cancel ? 'canceled' : 'failed');
  }
});
