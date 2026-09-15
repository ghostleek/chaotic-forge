import { brief } from './fixtures/forge/brief.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newSnakeGame,
  stepSnakeGame,
} from '../lib/party-forge/generation/snake-demo.ts';
import {
  hash,
  equal,
  readJson,
  sameOrigin,
} from '../lib/party-forge/generation/security.ts';
import { generationRequest, consumeJob } from '../scripts/forge/runner.mjs';

await test('authored snake grows, scores, prevents reversal and ends on collisions', () => {
  let game = { ...newSnakeGame(), status: 'playing' };
  game = stepSnakeGame(game, 'left');
  assert.equal(game.direction, 'right');
  for (let i = 0; i < 4; i++) game = stepSnakeGame(game);
  assert.equal(game.snake.length, 4);
  assert.equal(game.score, 25);
  while (game.status === 'playing') game = stepSnakeGame(game);
  assert.equal(game.status, 'lost');
  assert.match(game.reason, /boundary/);
});
await test('projectiles hit fleet, clear objective and stop terminal state', () => {
  let game = {
    ...newSnakeGame(),
    status: 'playing',
    enemies: [{ x: 15, y: 21 }],
  };
  game = stepSnakeGame(game, undefined, true);
  assert.equal(game.status, 'won');
  assert.equal(game.score, 100);
  assert.deepEqual(stepSnakeGame(game), game);
});
await test('self collision and enemy projectiles have concrete loss behavior', () => {
  const game = {
    ...newSnakeGame(),
    status: 'playing',
    snake: [
      { x: 4, y: 4 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
    ],
    direction: 'up',
  };
  assert.match(stepSnakeGame(game, 'right').reason, /trail/);
  const hit = {
    ...newSnakeGame(),
    status: 'playing',
    bombs: [{ x: 15, y: 23 }],
  };
  assert.match(stepSnakeGame(hit).reason, /shot/);
});
await test('security bounds body size and rejects cross-site mutations', async () => {
  assert.equal((await hash('hello')).length, 64);
  assert.equal(equal('a', 'b'), false);
  assert.throws(() =>
    sameOrigin(new Request('https://forge.test'), 'https://forge.test'),
  );
  await assert.rejects(
    readJson(
      new Request('https://forge.test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'a'.repeat(5000) }),
      }),
    ),
    /large/,
  );
});
await test('Agents request uses executable outputs and preserves the actual parent', () => {
  const request = generationRequest(
    { id: 'job', cards: '["snake","invaders"]' },
    '<canvas>parent</canvas>',
  );
  assert.equal(request.agent.model, 'gpt-6-astra');
  assert.match(request.input, /game.js/);
  assert.match(request.input, /Preserve/);
  assert.equal(
    Buffer.from(request.environment.files[0].data, 'base64').toString(),
    '<canvas>parent</canvas>',
  );
});
await test('ambiguous dispatch is held without another paid create', async () => {
  let created = 0;
  const updates = [];
  await consumeJob({
    client: {
      beta: {
        agents: {
          sessions: {
            create: () => {
              created++;
            },
            async *list() {},
          },
        },
      },
    },
    job: { id: 'job', fresh: false, session_id: null },
    update: async (value) => {
      updates.push(value);
      return value;
    },
  });
  assert.equal(created, 0);
  assert.equal(updates[0].status, 'recovery');
});
await test('runner downloads the completed turn and retains validated executable with provenance', async () => {
  const html = '<canvas></canvas>';
  const updates = [];
  const client = {
    beta: {
      agents: {
        sessions: {
          create: async () => ({
            id: 'session',
            agent: { model: 'gpt-6-astra' },
          }),
          turns: {
            list: async () => ({
              data: [
                {
                  id: 'turn',
                  status: 'completed',
                  usage: { total_tokens: 100 },
                },
              ],
            }),
          },
          artifacts: {
            async *list() {
              yield {
                id: 'brief',
                turn_id: 'turn',
                path: '/workspace/outputs/brief.json',
                size_bytes: JSON.stringify(brief).length,
              };
              yield {
                id: 'old',
                turn_id: 'wrong',
                path: '/workspace/outputs/game.js',
              };
              yield {
                id: 'artifact',
                turn_id: 'turn',
                path: '/workspace/outputs/game.js',
                size_bytes: html.length,
              };
            },
            content: async (id) => {
              if (id === 'brief') return new Response(JSON.stringify(brief));
              assert.equal(id, 'artifact');
              return new Response(html);
            },
          },
          retrieve: async () => ({ agent: { model: 'gpt-6-astra' } }),
        },
      },
    },
  };
  await consumeJob({
    client,
    job: {
      id: 'job',
      fresh: true,
      created: Date.now(),
      cards: '["snake","invaders"]',
    },
    update: async (fields) => {
      updates.push(fields);
      return { status: fields.status ?? 'building' };
    },
    validate: async (output) => {
      assert.equal(output, html);
      return { testFixture: true };
    },
  });
  assert.equal(updates.at(-1).status, 'preview');
  assert.equal(updates.at(-1).code, html);
  assert.equal(updates.at(-1).evidence.providerArtifact, 'artifact');
});
