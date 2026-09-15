import {
  gameBriefSchema,
  progressSchema,
  publicProgress,
  mergeProgress,
} from './progress.ts';
import {
  billingStatus,
  decryptKey,
  encryptKey,
  identitySession,
  type Identity,
} from './billing.ts';
import { playerHtml, PLAYER_CSP } from './player.ts';
import { z } from 'zod';
import {
  activeStates,
  MAX_ARTIFACT_BYTES,
  NO_CACHE,
  selectionSchema,
  roomSelectionSchema,
  type Job,
} from './contracts.ts';
import {
  equal,
  ForgeError,
  hash,
  readJson,
  sameOrigin,
  token,
} from './security.ts';
export type ForgeEnv = {
  DB: D1Database;
  FORGE_ARTIFACTS?: R2Bucket;
  FORGE_ORIGIN?: string;
  FORGE_CODE_HASH?: string;
  FORGE_RUNNER_SECRET?: string;
  FORGE_ENABLED?: string;
  FORGE_DAILY_JOBS?: string;
  FORGE_AUTH_MODE?: string;
  FORGE_KEY_ENCRYPTION_SECRET?: string;
  FORGE_ADMIN_USER_IDS?: string;
  FORGE_ADMIN_EMAILS?: string;
  FORGE_TRIAL_ENABLED?: string;
};
const cookieName = 'forge_creator';
const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) => Response.json(value, { status, headers: { ...NO_CACHE, ...headers } });
const activeSql = activeStates.map((s) => `'${s}'`).join(',');
function configured(env: ForgeEnv) {
  if (
    !env.DB ||
    !env.FORGE_ORIGIN ||
    (env.FORGE_AUTH_MODE === 'legacy-code' &&
      !/^[a-f0-9]{64}$/.test(env.FORGE_CODE_HASH ?? '')) ||
    (env.FORGE_RUNNER_SECRET?.length ?? 0) < 32
  )
    throw new ForgeError(
      503,
      'Creation is not configured yet. The public demo is available.',
    );
}
async function throttle(
  env: ForgeEnv,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
) {
  const id = `${key}:${Math.floor(now / windowMs)}`;
  const row = await env.DB.prepare(
    'INSERT INTO forge_limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count',
  )
    .bind(id, now + windowMs)
    .first<{ count: number }>();
  if (!row || row.count > limit)
    throw new ForgeError(429, 'Too many requests. Please try again later.');
}
async function session(request: Request, env: ForgeEnv, mutation: boolean) {
  const raw = request.headers
    .get('Cookie')
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!raw || !/^[a-f0-9]{64}$/.test(raw))
    throw new ForgeError(401, 'Enter your creator code to continue.');
  const id = await hash(raw);
  const row = await env.DB.prepare(
    'SELECT id,csrf,epoch,expires FROM forge_sessions WHERE id=?',
  )
    .bind(id)
    .first<{ id: string; csrf: string; epoch: string; expires: number }>();
  if (!row || row.expires <= Date.now() || row.epoch !== env.FORGE_CODE_HASH)
    throw new ForgeError(
      401,
      'Your creator session expired. Enter your code again.',
    );
  if (mutation) {
    sameOrigin(request, env.FORGE_ORIGIN!);
    if (!equal(request.headers.get('X-Forge-CSRF') ?? '', row.csrf))
      throw new ForgeError(403, 'Request not allowed.');
  }
  return row;
}
function cookie(value: string, origin: string, age = 30 * 86400) {
  return `${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/api/forge; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`;
}
export function publicJob(job: Job) {
  return {
    id: job.id,
    cards: JSON.parse(job.cards),
    parent: job.parent,
    status: job.status,
    created: job.created,
    error: job.error,
    model: job.model,
    artifactHash: job.artifact_hash,
    ...publicProgress(job.evidence),
    updated: job.updated,
    evidence:
      ['ready', 'preview'].includes(job.status) && job.evidence
        ? JSON.parse(job.evidence)
        : null,
  };
}
async function owned(env: ForgeEnv, id: string, owner: string) {
  const job = await env.DB.prepare(
    'SELECT * FROM forge_jobs WHERE id=? AND owner=?',
  )
    .bind(id, owner)
    .first<Job>();
  if (!job) throw new ForgeError(404, 'Game not found.');
  return job;
}
export async function available(env: ForgeEnv) {
  const cap = Number(env.FORGE_DAILY_JOBS);
  if (
    env.FORGE_ENABLED !== 'true' ||
    !env.FORGE_ARTIFACTS ||
    !Number.isInteger(cap) ||
    cap < 1 ||
    cap > 100
  )
    return false;
  const runner = await env.DB.prepare(
    "SELECT seen FROM forge_runner WHERE id='runner'",
  ).first<{ seen: number }>();
  return !!runner && runner.seen > Date.now() - 90_000;
}
export async function forgeRequest(
  request: Request,
  env: ForgeEnv,
  identity: Identity | null = null,
  roomBinding?: { roomId: string; digest: string; snapshot: string },
): Promise<Response> {
  try {
    const path = new URL(request.url).pathname
      .replace(/^\/api\/forge\/?/, '')
      .split('/');
    if (path[0] === 'demo' && request.method === 'GET')
      return json({
        href: '/play/snake-space-invaders',
        origin: 'cached-demo',
        version: 'snake-invaders-three-lives-v2',
      });
    configured(env);
    const now = Date.now();
    if (path[0] === 'runner') return await runnerRequest(request, env, now);
    const chatgpt = env.FORGE_AUTH_MODE !== 'legacy-code';
    if (chatgpt && !identity)
      throw new ForgeError(401, 'Sign in with ChatGPT to create games.');
    if (!chatgpt && path[0] === 'access' && request.method === 'POST') {
      sameOrigin(request, env.FORGE_ORIGIN!);
      await throttle(env, 'unlock-global', 100, 900_000, now);
      // CF-Connecting-IP is supplied by the host; X-Forwarded-For is deliberately ignored.
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      await throttle(env, `unlock:${await hash(ip)}`, 5, 900_000, now);
      const body = z
        .strictObject({ code: z.string().min(1).max(256) })
        .parse(await readJson(request));
      if (!equal(await hash(body.code), env.FORGE_CODE_HASH!))
        throw new ForgeError(401, 'Invalid creator code.');
      const previous = request.headers
        .get('Cookie')
        ?.split(';')
        .map((v) => v.trim())
        .find((v) => v.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1);
      const retained =
        previous && /^[a-f0-9]{64}$/.test(previous)
          ? await env.DB.prepare('SELECT id FROM forge_sessions WHERE id=?')
              .bind(await hash(previous))
              .first()
          : null;
      const raw = retained ? previous! : token(),
        csrf = token();
      await env.DB.prepare(
        'INSERT INTO forge_sessions (id,csrf,epoch,expires) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET csrf=excluded.csrf,expires=excluded.expires,epoch=excluded.epoch',
      )
        .bind(await hash(raw), csrf, env.FORGE_CODE_HASH!, now + 7200_000)
        .run();
      return json({ csrf, available: await available(env) }, 200, {
        'Set-Cookie': cookie(raw, env.FORGE_ORIGIN!),
      });
    }
    const actor = chatgpt
      ? await identitySession(env, identity!)
      : await session(request, env, request.method !== 'GET');
    if (chatgpt && request.method !== 'GET') {
      sameOrigin(request, env.FORGE_ORIGIN!);
      if (!equal(request.headers.get('X-Forge-CSRF') ?? '', actor.csrf))
        throw new ForgeError(403, 'Request not allowed.');
    }
    if (chatgpt && path[0] === 'billing') {
      if (request.method === 'GET')
        return json(await billingStatus(env, identity!));
      if (request.method === 'POST') {
        const body = z
          .strictObject({ key: z.string().min(20).max(256) })
          .parse(await readJson(request));
        if (!/^sk-[A-Za-z0-9_-]+$/.test(body.key))
          throw new ForgeError(400, 'Enter an OpenAI API key.');
        const ciphertext = await encryptKey(env, identity!.userId, body.key);
        await env.DB.prepare(
          'INSERT INTO forge_keys(owner,ciphertext,updated) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET ciphertext=excluded.ciphertext,updated=excluded.updated',
        )
          .bind(actor.id, ciphertext, now)
          .run();
        return json(await billingStatus(env, identity!));
      }
      if (request.method === 'DELETE') {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM forge_keys WHERE owner=?').bind(actor.id),
          env.DB.prepare(
            "UPDATE forge_jobs SET key_ciphertext=CASE WHEN status='queued' THEN NULL ELSE key_ciphertext END,status=CASE WHEN status='queued' THEN 'canceled' ELSE 'canceling' END WHERE owner=? AND billing='byok' AND status IN ('queued','dispatching','building','validating','recovery')",
          ).bind(actor.id),
        ]);
        return json(await billingStatus(env, identity!));
      }
    }
    if (chatgpt && path[0] === 'trials')
      throw new ForgeError(
        403,
        'Sponsored API access is restricted to configured admins.',
      );
    if (path[0] === 'access' && request.method === 'GET')
      return json({
        csrf: actor.csrf,
        available: await available(env),
        ...(chatgpt ? { billing: await billingStatus(env, identity!) } : {}),
      });
    if (chatgpt && path[0] === 'access' && request.method === 'DELETE') {
      throw new ForgeError(400, 'Use ChatGPT sign-out.');
    }
    if (path[0] === 'access' && request.method === 'DELETE') {
      await env.DB.prepare('UPDATE forge_sessions SET expires=0 WHERE id=?')
        .bind(actor.id)
        .run();
      return json({ ok: true });
    }
    await throttle(env, `api:${actor.id}`, 120, 60_000, now);
    if (path[0] !== 'generations') throw new ForgeError(404, 'Not found.');
    if (!path[1] && request.method === 'GET') {
      const rows = await env.DB.prepare(
        'SELECT * FROM forge_jobs WHERE owner=? ORDER BY created DESC LIMIT 25',
      )
        .bind(actor.id)
        .all<Job>();
      return json({ jobs: rows.results.map(publicJob) });
    }
    if (!path[1] && request.method === 'POST') {
      const body = (roomBinding ? roomSelectionSchema : selectionSchema).parse(await readJson(request));
      const digest = await hash(
        JSON.stringify({ cards: body.cards, parent: body.parent ?? null }),
      );
      const existing = await env.DB.prepare(
        'SELECT * FROM forge_jobs WHERE owner=? AND request_key=?',
      )
        .bind(actor.id, body.requestKey)
        .first<Job>();
      if (existing) {
        if (existing.digest !== digest || (existing.room_id ?? null) !== (roomBinding?.roomId ?? null) || (existing.room_digest ?? null) !== (roomBinding?.digest ?? null))
          throw new ForgeError(
            409,
            'This request was already used for different choices.',
          );
        return json(publicJob(existing), 202);
      }
      if (!(await available(env)))
        throw new ForgeError(
          503,
          'The creator is offline. Your choices are preserved; you can still play the demo.',
        );
      if (body.parent) {
        const parent = await owned(env, body.parent, actor.id);
        const previous = JSON.parse(parent.cards) as string[];
        if (
          parent.status !== 'ready' ||
          previous.some(
            (c) => !body.cards.includes(c as (typeof body.cards)[number]),
          ) ||
          body.cards.length <= previous.length
        )
          throw new ForgeError(
            400,
            'A remix must keep every earlier rule and add a new concept.',
          );
      }
      let billing = 'legacy';
      let keyCiphertext: string | null = null;
      if (chatgpt) {
        const status = await billingStatus(env, identity!);
        if (status.admin) {
          billing = 'admin';
        } else if (status.trial && status.remaining > 0) {
          billing = 'trial';
        } else {
          billing = 'byok';
          keyCiphertext =
            (
              await env.DB.prepare(
                'SELECT ciphertext FROM forge_keys WHERE owner=?',
              )
                .bind(actor.id)
                .first<{ ciphertext: string }>()
            )?.ciphertext ?? null;
          if (!keyCiphertext)
            throw new ForgeError(
              402,
              'Add your own API key to generate a new game.',
            );
        }
      }
      const id = crypto.randomUUID();
      // One atomic INSERT owns quota reservation; no read/check/write race.
      await env.DB.prepare(`INSERT INTO forge_jobs (id,owner,request_key,digest,cards,parent,status,created,updated,billing,key_ciphertext,room_id,room_digest)
        SELECT ?,?,?,?,?,?,'queued',?,?,?,?,?,? WHERE
        (SELECT count(*) FROM forge_jobs WHERE status IN (${activeSql})) < 2 AND
        (SELECT count(*) FROM forge_jobs WHERE owner=? AND status IN (${activeSql})) = 0 AND
        (SELECT count(*) FROM forge_jobs WHERE owner=? AND created>?) < 3 AND
        (SELECT count(*) FROM forge_jobs WHERE created>=?) < ?
        AND (? IS NULL OR (SELECT count(*) FROM forge_jobs WHERE room_id=? AND status IN (${activeSql})) = 0)
        AND (? IS NULL OR EXISTS(SELECT 1 FROM party_rooms WHERE id=? AND snapshot=?))
        AND (? != 'trial' OR EXISTS(SELECT 1 FROM forge_trials WHERE user_id=? AND expires>? AND max_jobs>?))
        AND (? != 'trial' OR (SELECT count(*) FROM forge_jobs WHERE owner=? AND billing='trial') < (SELECT max_jobs FROM forge_trials WHERE user_id=? AND expires>?))
        AND (? != 'byok' OR EXISTS(SELECT 1 FROM forge_keys WHERE owner=? AND ciphertext=?))
        ON CONFLICT(owner,request_key) DO NOTHING`)
        .bind(
          id,
          actor.id,
          body.requestKey,
          digest,
          JSON.stringify(body.cards),
          body.parent ?? null,
          now,
          now,
          billing,
          keyCiphertext,
          roomBinding?.roomId ?? null,
          roomBinding?.digest ?? null,
          actor.id,
          actor.id,
          now - 3600_000,
          Math.floor(now / 86400_000) * 86400_000,
          Number(env.FORGE_DAILY_JOBS),
          roomBinding?.roomId ?? null,
          roomBinding?.roomId ?? null,
          roomBinding?.roomId ?? null,
          roomBinding?.roomId ?? null,
          roomBinding?.snapshot ?? null,
          billing,
          actor.id,
          now,
          0,
          billing,
          actor.id,
          actor.id,
          now,
          billing,
          actor.id,
          keyCiphertext,
        )
        .run();
      const job = await env.DB.prepare(
        'SELECT * FROM forge_jobs WHERE owner=? AND request_key=?',
      )
        .bind(actor.id, body.requestKey)
        .first<Job>();
      if (!job)
        throw new ForgeError(
          429,
          'Creation capacity reached. Try again later; the demo is available.',
        );
      if (job.digest !== digest || (job.room_id ?? null) !== (roomBinding?.roomId ?? null) || (job.room_digest ?? null) !== (roomBinding?.digest ?? null)) throw new ForgeError(409, 'Request conflict.');
      return json(publicJob(job), 202);
    }
    const job = await owned(env, path[1], actor.id);
    if (path[2] === 'artifact' && request.method === 'GET') {
      if (!['ready', 'preview'].includes(job.status) || !job.artifact_hash)
        throw new ForgeError(409, 'Game is not ready.');
      const artifact = await env.FORGE_ARTIFACTS?.get(
        `games/${job.id}/${job.artifact_hash}.js`,
      );
      if (!artifact)
        throw new ForgeError(503, 'Saved game is temporarily unavailable.');
      // Header sandbox creates a unique opaque origin even when opened outside the iframe.
      return new Response(playerHtml(await artifact.text()), {
        headers: {
          ...NO_CACHE,
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': PLAYER_CSP,
          'Permissions-Policy':
            'camera=(), microphone=(), geolocation=(), payment=()',
          'Cross-Origin-Resource-Policy': 'same-origin',
        },
      });
    }
    if (path[2] === 'accept' && request.method === 'POST') {
      const approval = z
        .strictObject({
          completedRun: z.literal(true),
          checkedConcepts: z.array(z.string()).max(5),
        })
        .parse(await readJson(request));
      const concepts = JSON.parse(job.cards) as string[];
      if (
        job.status !== 'preview' ||
        concepts.some((c) => !approval.checkedConcepts.includes(c))
      )
        throw new ForgeError(
          400,
          'Play a completing run and check every selected mechanic first.',
        );
      const evidence = {
        ...JSON.parse(job.evidence ?? '{}'),
        acceptance: {
          source: 'User decision',
          checkedAt: now,
          completedRun: true,
          checkedConcepts: approval.checkedConcepts,
        },
      };
      await env.DB.prepare(
        "UPDATE forge_jobs SET status='ready',evidence=?,updated=? WHERE id=? AND status='preview'",
      )
        .bind(JSON.stringify(evidence), now, job.id)
        .run();
      return json(publicJob(await owned(env, job.id, actor.id)));
    }
    if (path[2] === 'cancel' && request.method === 'POST') {
      await env.DB.prepare(
        `UPDATE forge_jobs SET key_ciphertext=CASE WHEN status='queued' THEN NULL ELSE key_ciphertext END,status=CASE WHEN status='queued' THEN 'canceled' ELSE 'canceling' END,updated=? WHERE id=? AND status IN ('queued','dispatching','building','validating','recovery')`,
      )
        .bind(now, job.id)
        .run();
      return json(publicJob(await owned(env, job.id, actor.id)));
    }
    if (!path[2] && request.method === 'GET') return json(publicJob(job));
    throw new ForgeError(405, 'Method not allowed.');
  } catch (error) {
    if (error instanceof ForgeError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json({ error: 'Check your submitted choices.' }, 400);
    console.error(
      'Forge request failed',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return json(
      {
        error:
          'Creation storage is unavailable. The public demo is still playable.',
      },
      503,
    );
  }
}

async function runnerRequest(request: Request, env: ForgeEnv, now: number) {
  if (
    !equal(
      request.headers.get('Authorization') ?? '',
      `Bearer ${env.FORGE_RUNNER_SECRET}`,
    )
  )
    throw new ForgeError(401, 'Not authorized.');
  if (request.method !== 'POST')
    throw new ForgeError(405, 'Method not allowed.');
  const body = z
    .strictObject({
      action: z.enum(['claim', 'update']),
      id: z.uuid().optional(),
      lease: z.string().optional(),
      status: z
        .enum([
          'building',
          'validating',
          'preview',
          'failed',
          'canceled',
          'recovery',
        ])
        .optional(),
      sessionId: z.string().max(200).optional(),
      turnId: z.string().max(200).optional(),
      model: z.string().max(100).optional(),
      code: z.string().max(MAX_ARTIFACT_BYTES).optional(),
      progress: progressSchema.optional(),
      brief: gameBriefSchema.optional(),
      evidence: z.record(z.string(), z.unknown()).optional(),
    })
    .parse(await readJson(request, MAX_ARTIFACT_BYTES + 20_000));
  await env.DB.prepare(
    "INSERT INTO forge_runner(id,seen) VALUES ('runner',?) ON CONFLICT(id) DO UPDATE SET seen=excluded.seen",
  )
    .bind(now)
    .run();
  if (body.action === 'claim') {
    await env.DB.prepare('DELETE FROM forge_limits WHERE expires<?')
      .bind(now)
      .run();
    if (env.FORGE_ENABLED !== 'true')
      await env.DB.prepare(
        "UPDATE forge_jobs SET key_ciphertext=CASE WHEN status='queued' THEN NULL ELSE key_ciphertext END,status=CASE WHEN status='queued' THEN 'canceled' ELSE 'canceling' END WHERE status IN ('queued','dispatching','building','validating')",
      ).run();
    const lease = token();
    // Recover existing jobs before starting new ones. Dispatch ambiguity stays held, never re-created.
    const job =
      await env.DB.prepare(`UPDATE forge_jobs SET evidence=CASE WHEN status='queued' THEN ? ELSE evidence END,lease=?,lease_until=?,updated=?,status=CASE WHEN status='queued' THEN 'dispatching' ELSE status END
      WHERE id=(SELECT id FROM forge_jobs WHERE status IN (${activeSql}) AND (lease_until IS NULL OR lease_until<?) ORDER BY created LIMIT 1) RETURNING *`)
        .bind(
          JSON.stringify({ dispatchLease: lease }),
          lease,
          now + 60_000,
          now,
          now,
        )
        .first<Job>();
    if (!job) return json({ job: null });
    let apiKey: string | null = null;
    if (job.billing === 'byok') {
      if (!job.key_ciphertext)
        throw new ForgeError(503, 'Job key unavailable.');
      apiKey = await decryptKey(env, job.owner, job.key_ciphertext);
    }
    if (job.billing === 'admin' && env.FORGE_AUTH_MODE === 'legacy-code')
      throw new ForgeError(403, 'Admin jobs require ChatGPT authentication.');
    if (job.billing === 'trial' && !job.session_id) {
      const valid = await env.DB.prepare(
        'SELECT user_id FROM forge_trials WHERE user_id=? AND expires>?',
      )
        .bind(job.owner, now)
        .first();
      if (!valid || env.FORGE_TRIAL_ENABLED !== 'true') {
        const fresh =
          job.evidence && JSON.parse(job.evidence).dispatchLease === lease;
        if (!fresh) {
          // Missing session_id can mean a lost paid-create response. Reconcile and cancel;
          // expiry is never evidence that provider execution stopped.
          await env.DB.prepare(
            "UPDATE forge_jobs SET status='canceling' WHERE id=? AND lease=?",
          )
            .bind(job.id, lease)
            .run();
          job.status = 'canceling';
        } else {
          await env.DB.prepare(
            "UPDATE forge_jobs SET status='canceled',key_ciphertext=NULL WHERE id=?",
          )
            .bind(job.id)
            .run();
          return json({ job: null });
        }
      }
    }
    let parentHtml: string | null = null;
    let parentBrief = null;
    if (job.parent) {
      const parent = await owned(env, job.parent, job.owner);
      parentBrief = publicProgress(parent.evidence).brief;
      parentHtml =
        (await (
          await env.FORGE_ARTIFACTS?.get(
            `games/${parent.id}/${parent.artifact_hash}.js`,
          )
        )?.text()) ?? null;
      if (!parentHtml)
        throw new ForgeError(503, 'Parent artifact unavailable.');
    }
    return json({
      job: {
        ...job,
        fresh:
          job.status === 'dispatching' &&
          job.session_id === null &&
          job.evidence === JSON.stringify({ dispatchLease: lease }),
      },
      parentHtml,
      parentBrief,
      apiKey,
    });
  }
  if (!body.id || !body.lease)
    throw new ForgeError(400, 'Job and lease required.');
  const job = await env.DB.prepare(
    'SELECT * FROM forge_jobs WHERE id=? AND lease=? AND lease_until>?',
  )
    .bind(body.id, body.lease, now)
    .first<Job>();
  if (!job || !activeStates.includes(job.status))
    throw new ForgeError(409, 'Job lease expired.');
  if (job.session_id && body.sessionId && body.sessionId !== job.session_id)
    throw new ForgeError(409, 'Session is immutable.');
  const status =
    job.status === 'canceling' && body.status !== 'canceled'
      ? 'canceling'
      : (body.status ?? job.status);
  let artifactHash = job.artifact_hash;
  if (status === 'preview') {
    if (
      !body.code ||
      !body.evidence ||
      !body.model ||
      !body.turnId ||
      !(body.sessionId || job.session_id) ||
      new TextEncoder().encode(body.code).length > MAX_ARTIFACT_BYTES
    )
      throw new ForgeError(400, 'Validated artifact required.');
    if (!env.FORGE_ARTIFACTS)
      throw new ForgeError(503, 'Artifact storage unavailable.');
    artifactHash = await hash(body.code);
    await env.FORGE_ARTIFACTS.put(
      `games/${job.id}/${artifactHash}.js`,
      body.code,
      { httpMetadata: { contentType: 'application/javascript' } },
    );
  }
  const oldEvidence = JSON.parse(job.evidence ?? '{}');
  const mergedEvidence = {
    ...oldEvidence,
    ...body.evidence,
    ...(body.progress || oldEvidence.progress
      ? {
          progress: mergeProgress(
            publicProgress(job.evidence).progress,
            body.progress ?? [],
          ),
        }
      : {}),
    ...(body.brief ? { brief: body.brief } : {}),
  };
  const result = await env.DB.prepare(
    `UPDATE forge_jobs SET key_ciphertext=CASE WHEN ? IN ('preview','failed','canceled') THEN NULL ELSE key_ciphertext END,status=?,session_id=COALESCE(session_id,?),turn_id=COALESCE(?,turn_id),model=COALESCE(?,model),artifact_hash=?,evidence=COALESCE(?,evidence),updated=?,lease_until=?,error=? WHERE id=? AND lease=? AND status=? AND lease_until>?`,
  )
    .bind(
      status,
      status,
      body.sessionId ?? null,
      body.turnId ?? null,
      body.model ?? null,
      artifactHash,
      JSON.stringify(mergedEvidence),
      now,
      now + 60_000,
      status === 'failed'
        ? 'The build did not pass validation. Your previous game is unchanged.'
        : status === 'recovery'
          ? 'The provider request needs operator recovery. It will not be submitted twice.'
          : null,
      job.id,
      body.lease,
      job.status,
      now,
    )
    .run();
  if (!result.meta.changes)
    throw new ForgeError(409, 'Job changed during update.');
  return json({ status });
}
