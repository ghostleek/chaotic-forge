import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createAgentApi,
  AgentApiError,
} from '../../lib/party-forge/generation/live-api.mjs';
import {
  estimateObservedCost,
  liveStopReason,
} from '../../lib/party-forge/generation/live-policy.mjs';
import { runLiveStage } from '../../lib/party-forge/generation/live.mjs';
import {
  BENCHMARK_STAGES,
  QUALIFICATION_PROTOCOL_VERSION,
} from '../../lib/party-forge/generation/benchmark.ts';
import { sha256 } from '../../lib/party-forge/generation/candidate.ts';

test('cost monitor rejects unknown counters, accounts subsets once and stops at thresholds', () => {
  assert.equal(estimateObservedCost(null), null);
  assert.equal(
    estimateObservedCost({ input_tokens: -1, output_tokens: 1 }),
    null,
  );
  assert.equal(
    estimateObservedCost({
      input_tokens: 1000,
      output_tokens: 1000,
      input_tokens_details: { cached_tokens: 500 },
      output_tokens_details: { reasoning_tokens: 500 },
    }),
    2.02,
  );
  assert.equal(
    liveStopReason({ elapsedMs: 900000, estimatedUsd: 1, blindUsageMs: 0 }),
    'time-stop',
  );
  assert.equal(
    liveStopReason({ elapsedMs: 0, estimatedUsd: 5, blindUsageMs: 0 }),
    'cost-stop',
  );
  assert.equal(
    liveStopReason({ elapsedMs: 0, estimatedUsd: null, blindUsageMs: 60000 }),
    'usage-unobservable',
  );
});

test('API restricts destination, refuses redirects, bounds bytes and redacts remote errors', async () => {
  const receipts = [];
  const requests = [];
  const api = createAgentApi(
    'fixture-private-key',
    (r) => receipts.push(r),
    async (url, options) => {
      requests.push({ url, options });
      return new Response(
        JSON.stringify({
          error: { code: 'scope_denied', message: 'fixture-private-key' },
        }),
        { status: 403, headers: { 'x-request-id': 'req_fixture' } },
      );
    },
  );
  await assert.rejects(
    api('https://attacker.invalid/agents/sessions'),
    /invalid-api-path/,
  );
  assert.equal(requests.length, 0);
  await assert.rejects(
    api('/agents/sessions/sess_fixture/events', {
      method: 'POST',
      body: { events: [] },
      idempotencyKey: 'logical-event',
    }),
    (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.code, 'scope_denied');
      assert.equal(
        JSON.stringify(error).includes('fixture-private-key'),
        false,
      );
      return true;
    },
  );
  assert.equal(
    requests[0].url,
    'https://api.openai.com/v1/agents/sessions/sess_fixture/events',
  );
  assert.equal(requests[0].options.redirect, 'error');
  assert.equal(requests[0].options.headers['Idempotency-Key'], 'logical-event');
  assert.equal(JSON.stringify(receipts).includes('fixture-private-key'), false);
  const bounded = createAgentApi(
    'fixture',
    () => {},
    async () => new Response('12345'),
  );
  await assert.rejects(
    bounded('/agents/sessions', { limit: 4 }),
    /api-response-too-large/,
  );
});

async function scenario(t, behavior) {
  const root = await mkdtemp(join(tmpdir(), 'pc09-live-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const calls = [];
  let clock = 100000;
  const result = await runLiveStage('initial', root, 'fixture', {
    now: () => clock,
    wait: async (ms) => {
      clock += ms;
    },
    createApi:
      () =>
      async (path, options = {}) => {
        calls.push({ path, ...options });
        return behavior({
          path,
          options,
          calls,
          advance: (ms) => {
            clock += ms;
          },
        });
      },
  });
  const persisted = JSON.parse(
    await readFile(join(root, 'initial/run.json'), 'utf8'),
  );
  assert.deepEqual(persisted, result);
  await assert.rejects(runLiveStage('initial', root, 'fixture'), {
    code: 'EEXIST',
  });
  return { result, calls };
}

test('known create rejection does not retry, dispatch, cancel or claim inference', async (t) => {
  const { result, calls } = await scenario(t, () => {
    throw new AgentApiError(403, 'scope_denied', 'req_fixture');
  });
  assert.equal(calls.length, 1);
  assert.equal(result.status, 'create-rejected');
  assert.equal(result.inferenceAccessVerified, false);
});

test('unknown creation recovers only its unique marker and cleans up without paid input', async (t) => {
  let marker;
  const { result, calls } = await scenario(t, ({ path, options }) => {
    if (options.method === 'POST') {
      marker = options.body.metadata.pc09a_run_id;
      throw new Error('transport-unknown');
    }
    if (path.includes('?'))
      return {
        data: [
          { id: 'sess_unrelated', metadata: {} },
          { id: 'sess_owned', metadata: { pc09a_run_id: marker } },
        ],
        has_more: false,
      };
    assert.equal(path, '/agents/sessions/sess_owned');
    assert.equal(options.method, 'DELETE');
    return {};
  });
  assert.equal(result.status, 'create-recovered-without-dispatch');
  assert.equal(result.cleanupConfirmed, true);
  assert.equal(calls.filter((c) => c.method === 'POST').length, 1);
});

test('deadline crossed during provisioning cannot dispatch the first paid input', async (t) => {
  const { result, calls } = await scenario(t, ({ path, options, advance }) => {
    if (path === '/agents/sessions')
      return { id: 'sess_owned', environment: { id: 'env_owned' } };
    if (path.startsWith('/agents/environments/')) {
      advance(900000);
      return { status: 'connected' };
    }
    assert.equal(options.method, 'DELETE');
    return {};
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.cleanupConfirmed, true);
  assert.equal(
    calls.some((c) => c.path.endsWith('/events')),
    false,
  );
});

test('completed mock job retains only the matching turn artifact without executing or accepting it', async (t) => {
  const frames = Array.from({ length: 3600 }, (_, tick) => ({
    tick,
    buttons: 0,
    yaw: 0,
    pitch: 0,
  }));
  const bytes = Buffer.from(
    JSON.stringify({
      protocolVersion: QUALIFICATION_PROTOCOL_VERSION,
      stageId: 'initial',
      parentArtifactHash: null,
      source: 'throw new Error("authored fixture must not execute");',
      witnessTraceProposals: BENCHMARK_STAGES[0].contributions.map((item) => ({
        contributionId: item.id,
        witnessId: item.witness.id,
        frames,
      })),
      completingTraceProposal: { frames },
    }),
  );
  let downloaded = false;
  const { result, calls } = await scenario(t, ({ path, options }) => {
    if (path === '/agents/sessions')
      return { id: 'sess_owned', environment: { id: 'env_owned' } };
    if (path.startsWith('/agents/environments/'))
      return { status: 'connected' };
    if (path.endsWith('/events')) return {};
    if (path.includes('/turns?'))
      return {
        data: [
          {
            id: 'turn_owned',
            status: 'completed',
            usage: { input_tokens: 1000, output_tokens: 1000 },
          },
        ],
        has_more: false,
      };
    if (path.includes('/artifacts?'))
      return {
        data: [
          {
            id: 'artifact_old',
            turn_id: 'turn_other',
            path: '/workspace/outputs/candidate.json',
            size_bytes: bytes.length,
          },
          {
            id: 'artifact_owned',
            turn_id: 'turn_owned',
            path: '/workspace/outputs/candidate.json',
            size_bytes: bytes.length,
          },
        ],
        has_more: false,
      };
    if (path.endsWith('/artifacts/artifact_owned/content')) {
      downloaded = true;
      return bytes;
    }
    if (options.method === 'DELETE') {
      assert.equal(downloaded, true);
      return {};
    }
    return { status: 'idle', usage: null };
  });
  assert.equal(result.status, 'candidate-downloaded-unverified');
  assert.equal(result.artifactHash, sha256(bytes));
  assert.equal(result.cleanupConfirmed, true);
  assert.equal(calls.filter((c) => c.path.endsWith('/events')).length, 1);
});

for (const mode of [
  'over-budget-turn',
  'missing-usage',
  'transient-cancel-with-late-usage',
]) {
  test(
    mode + ' cancels and confirms terminal state before cleanup',
    async (t) => {
      let cancelled = false;
      let cancelAttempts = 0;
      const { result, calls } = await scenario(t, ({ path, options }) => {
        if (path === '/agents/sessions') {
          assert.equal('input' in options.body, false);
          assert.equal(options.body.environment.network.access, 'disabled');
          assert.equal(JSON.stringify(options.body).includes('fixture'), false);
          return { id: 'sess_owned', environment: { id: 'env_owned' } };
        }
        if (path.startsWith('/agents/environments/'))
          return { status: 'connected' };
        if (path.endsWith('/events')) {
          if (options.body.events[0].type === 'agent.session.input.cancel') {
            cancelAttempts++;
            if (
              mode === 'transient-cancel-with-late-usage' &&
              cancelAttempts === 1
            ) {
              throw new AgentApiError(503, 'unavailable', 'req_transient');
            }
            cancelled = true;
          }
          assert.ok(options.idempotencyKey);
          return {};
        }
        if (path.includes('/turns?'))
          return {
            data: [
              {
                id: 'turn_owned',
                status: cancelled ? 'cancelled' : 'in_progress',
                usage:
                  mode === 'over-budget-turn'
                    ? { input_tokens: 1, output_tokens: 50000 }
                    : mode === 'transient-cancel-with-late-usage' && cancelled
                      ? { input_tokens: 1000, output_tokens: 1000 }
                      : null,
              },
            ],
            has_more: false,
          };
        if (options.method === 'DELETE') {
          assert.equal(cancelled, true);
          return {};
        }
        return {
          status: 'in_progress',
          usage:
            mode === 'over-budget-turn'
              ? { input_tokens: 1, output_tokens: 1 }
              : null,
        };
      });
      assert.equal(result.status, 'failed');
      assert.equal(result.cancellationConfirmed, true);
      assert.equal(result.cleanupConfirmed, true);
      assert.equal(
        result.errors[0].reason,
        mode === 'over-budget-turn' ? 'cost-stop' : 'usage-unobservable',
      );
      const events = calls.filter((c) => c.path.endsWith('/events'));
      assert.equal(
        events.length,
        mode === 'transient-cancel-with-late-usage' ? 3 : 2,
      );
      if (mode === 'transient-cancel-with-late-usage') {
        assert.equal(events[1].idempotencyKey, events[2].idempotencyKey);
        assert.equal(result.estimatedUsd, 2.02);
        assert.equal(result.inferenceAccessVerified, true);
      }
    },
  );
}
