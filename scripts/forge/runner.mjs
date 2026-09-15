/** Explicit durable-queue consumer. Run under a process supervisor; never from a web request. */
import OpenAI from 'openai';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import {
  CONCEPTS,
  MAX_ARTIFACT_BYTES,
} from '../../lib/party-forge/generation/contracts.ts';
import { validateGame } from './validate-game.mjs';

export function generationRequest(job, parentHtml) {
  const cards = JSON.parse(job.cards).map((id) =>
    CONCEPTS.find((c) => c.id === id),
  );
  return {
    agent: {
      model: 'gpt-6-astra',
      multi_agent: { enabled: false },
      instructions:
        'Build a playable, self-contained browser game. Write actual executable code and run checks in your sandbox. No external assets, networking, installs, accounts, APIs or secrets. Never claim a check ran when it did not.',
    },
    environment: {
      type: 'openai_hosted',
      ...(parentHtml
        ? {
            files: [
              {
                type: 'inline',
                path: '/workspace/parent.js',
                data: Buffer.from(parentHtml).toString('base64'),
              },
            ],
          }
        : {}),
    },
    metadata: { forge_job: job.id },
    input: `Create executable JavaScript for a browser Web Worker at /workspace/outputs/game.js, at most ${MAX_ARTIFACT_BYTES} bytes. No HTML, DOM, network, eval, imports, assets or dependencies. Forge owns the renderer. Implement self.onmessage: on {type:'reset',seed:1}, initialize and post the first frame; on {type:'step',dt:100,keys:[...]}, advance exactly 100ms and post a frame. keys contains ArrowUp/Down/Left/Right, w/a/s/d and space (' '). Output {type:'frame',status:'playing'|'won'|'lost',score:number,rects:[{x,y,w,h,color:'#rrggbb'}],message:string}. Canvas is 560x560; numbers must be within 0..560; maximum 512 rectangles. Provide concrete controls, scoring, win/loss and readable geometric art. Implement every selected concept: ${JSON.stringify(cards)}. ${parentHtml ? 'The exact parent source is /workspace/parent.js. Preserve its prior mechanics while adding the new concept.' : 'Design an actual playable mashup.'} Write and run tests in the sandbox for all mechanics and a completing run. Save test evidence at /workspace/outputs/validation.json. Forge independently smoke-checks your worker and requires human gameplay acceptance before declaring the build ready.`,
    stream: false,
  };
}
export async function consumeJob({
  client,
  job,
  parentHtml,
  update,
  validate = validateGame,
  sleepMs = 4000,
  tokenLimit = 80000,
}) {
  let sessionId = job.session_id;
  let canceled = job.status === 'canceling';
  async function pulse(fields = {}) {
    const result = await update(fields);
    canceled ||= result.status === 'canceling';
    return result;
  }
  if (!sessionId && job.fresh && Date.now() > job.created + 10 * 60_000) {
    await pulse({ status: 'failed' });
    return;
  }
  if (!sessionId) {
    // A previously claimed job without a persisted session is ambiguous after a crash.
    // The claim records dispatching before any network call. Only this fresh claim may submit.
    if (!job.fresh) {
      let scanned = 0;
      for await (const candidate of client.beta.agents.sessions.list({
        limit: 100,
        order: 'desc',
      })) {
        if (candidate.metadata?.forge_job === job.id) {
          sessionId = candidate.id;
          break;
        }
        if (
          ++scanned >= 1000 ||
          candidate.created_at * 1000 < job.created - 60000
        )
          break;
      }
      if (!sessionId) {
        await pulse({ status: 'recovery' });
        return;
      }
      await pulse({ sessionId, status: 'building' });
    }
    if (canceled && !sessionId && job.fresh) {
      await pulse({ status: 'canceled' });
      return;
    }
    if (!sessionId) {
      const created = await client.beta.agents.sessions.create(
        generationRequest(job, parentHtml),
      );
      sessionId = created.id;
      await pulse({
        sessionId,
        model: created.agent.model,
        status: 'building',
      });
    }
  }
  const deadline = job.created + 10 * 60_000;
  while (true) {
    await pulse();
    const turns = await client.beta.agents.sessions.turns.list(sessionId, {
      limit: 1,
      order: 'desc',
    });
    const turn = turns.data[0];
    if (
      canceled ||
      Date.now() > deadline ||
      (turn?.usage?.total_tokens ?? 0) > tokenLimit
    ) {
      await client.beta.agents.sessions.events.create(sessionId, {
        events: [{ type: 'agent.session.input.cancel' }],
      });
      // Keep the job active until provider cancellation/completion is actually observed.
      if (
        !turn ||
        !['completed', 'failed', 'cancelled'].includes(turn.status)
      ) {
        await sleep(sleepMs);
        continue;
      }
      await pulse({ status: canceled ? 'canceled' : 'failed', sessionId });
      return;
    }
    if (!turn || ['queued', 'in_progress', 'waiting'].includes(turn.status)) {
      await sleep(sleepMs);
      continue;
    }
    if (turn.status !== 'completed') {
      await pulse({ status: 'failed', sessionId });
      return;
    }
    await pulse({ status: 'validating', turnId: turn.id });
    let selected;
    for await (const artifact of client.beta.agents.sessions.artifacts.list(
      sessionId,
    )) {
      if (
        artifact.turn_id === turn.id &&
        artifact.path === '/workspace/outputs/game.js'
      ) {
        selected = artifact;
        break;
      }
    }
    if (!selected || selected.size_bytes > MAX_ARTIFACT_BYTES) {
      await pulse({ status: 'failed' });
      return;
    }
    const response = await client.beta.agents.sessions.artifacts.content(
      selected.id,
      { session_id: sessionId },
    );
    const html = await boundedText(response, MAX_ARTIFACT_BYTES);
    let evidence;
    try {
      evidence = await validate(html);
    } catch {
      await pulse({ status: 'failed' });
      return;
    }
    const state = await pulse();
    if (state.status === 'canceling') continue;
    const current = await client.beta.agents.sessions.retrieve(sessionId);
    await pulse({
      status: 'preview',
      code: html,
      turnId: turn.id,
      sessionId,
      model: current.agent.model,
      evidence: {
        ...evidence,
        usage: turn.usage,
        providerArtifact: selected.id,
        source: 'Agents API',
        selectedConcepts: JSON.parse(job.cards),
        parent: job.parent,
        qualification:
          'Browser smoke checks only; not a universal correctness or party-score guarantee.',
      },
    });
    return;
  }
}
async function boundedText(response, max) {
  if (!response.ok || !response.body)
    throw new Error('Artifact download failed');
  const reader = response.body.getReader();
  let size = 0;
  const parts = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw new Error('Artifact too large');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(parts).toString('utf8');
}
async function main() {
  const origin = process.env.FORGE_ORIGIN;
  const secret = process.env.FORGE_RUNNER_SECRET;
  if (!origin || !secret || process.env.FORGE_BUDGET_ACK !== 'configured')
    throw new Error(
      'Configure FORGE_ORIGIN, FORGE_RUNNER_SECRET and FORGE_BUDGET_ACK=configured. Sponsored trials additionally require OPENAI_API_KEY.',
    );
  const url = new URL(origin);
  if (
    url.protocol !== 'https:' &&
    !['127.0.0.1', 'localhost'].includes(url.hostname)
  )
    throw new Error('HTTPS required');
  // No SDK mutation retries: an ambiguous create must never submit twice.

  const send = async (body) => {
    const response = await fetch(new URL('/api/forge/runner', origin), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`Queue HTTP ${response.status}`);
    return response.json();
  };
  for (;;) {
    let job;
    try {
      const claim = await send({ action: 'claim' });
      job = claim.job;
      if (job && !claim.apiKey && !process.env.OPENAI_API_KEY)
        throw new Error('Sponsored trial key unavailable');
      if (job)
        await consumeJob({
          client: new OpenAI({
            apiKey: claim.apiKey ?? process.env.OPENAI_API_KEY,
            maxRetries: 0,
            timeout: 25000,
          }),
          job,
          parentHtml: claim.parentHtml,
          update: (fields) =>
            send({ action: 'update', id: job.id, lease: job.lease, ...fields }),
        });
    } catch {
      // Never log prompts, code, API responses or credentials.
      console.error(
        'Forge runner: job held for recovery or retry; inspect durable status.',
      );
      if (job) {
        try {
          await send({
            action: 'update',
            id: job.id,
            lease: job.lease,
            status: 'recovery',
          });
        } catch {
          /* Lease expires for another runner to reconcile. */
        }
      }
    }
    await sleep(5000);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
