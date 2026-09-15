import { z } from 'zod';
import { roomSnapshotSchema, type RoomSnapshot } from '../contracts.ts';
import { activeStates, NO_CACHE, type Job } from '../generation/contracts.ts';
import { identitySession, type Identity } from '../generation/billing.ts';
import { available, forgeRequest, publicJob, type ForgeEnv } from '../generation/server.ts';
import { ForgeError, hash, readJson, sameOrigin } from '../generation/security.ts';
import { PLAYER_CSP, playerHtml } from '../generation/player.ts';
import { capabilityHash, participantCapability, RoomHttpError, validRoomId } from './participants.ts';
import { resolveParticipant } from './room-store.ts';

const commandSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('generate'), requestKey: z.uuid(), digest: z.string().length(64) }),
  z.strictObject({ action: z.literal('cancel'), jobId: z.uuid() }),
  z.strictObject({ action: z.literal('playtest'), jobId: z.uuid() }),
]);
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: NO_CACHE });

/** Only authoritative confirmed room choices enter the prompt. Never accept client-supplied cards. */
export async function roomGenerationInputs(room: RoomSnapshot) {
  const cards = room.contributions.flatMap(c =>
    c.kind === 'initial' && c.choice.slot === 'instruction' ? [c.choice.text] : [],
  );
  const eligible = room.phase === 'lobby' && room.build.status === 'empty' &&
    room.participants.length >= 2 && room.participants.length <= 3 &&
    cards.length === room.participants.length && cards.length === room.contributions.length &&
    room.participants.every(p => room.contributions.some(c => c.participantId === p.id));
  const digest = await hash(JSON.stringify({
    host: room.hostId,
    participants: room.participants.map(p => p.id).sort(),
    contributions: room.contributions,
  }));
  return { cards, eligible, digest };
}

function sharedJob(job: Job) {
  const { id, status, created, updated, model, artifactHash, progress, brief } = publicJob(job);
  // Error text and terminal evidence can contain provider details. Room guests see a fixed failure label.
  return { id, status, created, updated, model, artifactHash, progress, brief };
}

export async function roomGenerationRequest(
  request: Request, roomId: string, env: ForgeEnv, identity: Identity | null,
): Promise<Response> {
  try {
    validRoomId(roomId);
    const capability = await capabilityHash(participantCapability(request));
    const participant = await resolveParticipant(env.DB, roomId, capability);
    const stored = await env.DB.prepare('SELECT snapshot FROM party_rooms WHERE id=?').bind(roomId).first<{ snapshot: string }>();
    if (!participant || !stored) throw new ForgeError(403, 'Room access is no longer available.');
    const room = roomSnapshotSchema.parse(JSON.parse(stored.snapshot));
    if (!room.participants.some(p => p.id === participant.participantId))
      throw new ForgeError(403, 'Rejoin this room to view its generation.');
    const inputs = await roomGenerationInputs(room);
    if (request.method === 'GET') {
      const job = await env.DB.prepare('SELECT * FROM forge_jobs WHERE room_id=? ORDER BY created DESC, id DESC LIMIT 1').bind(roomId).first<Job>();
      return json({
        digest: inputs.digest, eligible: inputs.eligible, available: await available(env),
        job: job ? sharedJob(job) : null,
        stale: !!job && job.room_digest !== inputs.digest,
      });
    }
    if (request.method !== 'POST') throw new ForgeError(405, 'Method not allowed.');
    sameOrigin(request, env.FORGE_ORIGIN ?? new URL(request.url).origin);
    const body = commandSchema.parse(await readJson(request));
    if (body.action === 'playtest') {
      const job = await env.DB.prepare('SELECT * FROM forge_jobs WHERE id=? AND room_id=?').bind(body.jobId, roomId).first<Job>();
      if (!job || !['preview', 'ready'].includes(job.status) || !job.artifact_hash)
        throw new ForgeError(409, 'This game is not ready to playtest.');
      if (job.room_digest !== inputs.digest || !inputs.eligible)
        throw new ForgeError(409, 'The room has changed. Generate from the current cards.');
      const artifact = await env.FORGE_ARTIFACTS?.get(`games/${job.id}/${job.artifact_hash}.js`);
      if (!artifact) throw new ForgeError(503, 'Saved game is temporarily unavailable.');
      // srcDoc does not inherit HTTP response CSP. Supply its own CSP before any code;
      // the caller also uses sandbox="allow-scripts" to give this document an opaque origin.
      const policy = PLAYER_CSP.replace('sandbox allow-scripts; ', '');
      const html = playerHtml(await artifact.text()).replace('<meta charset="utf-8">', `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}">`);
      return json({ html, artifactHash: job.artifact_hash });
    }
    if (room.hostId !== participant.participantId)
      throw new ForgeError(403, 'Only the room host can start or cancel generation.');
    if (body.action === 'cancel') {
      await env.DB.prepare(`UPDATE forge_jobs SET
        key_ciphertext=CASE WHEN status='queued' THEN NULL ELSE key_ciphertext END,
        status=CASE WHEN status='queued' THEN 'canceled' ELSE 'canceling' END, updated=?
        WHERE id=? AND room_id=? AND status IN (${activeStates.map(s => `'${s}'`).join(',')})
        AND EXISTS(SELECT 1 FROM party_rooms WHERE id=? AND snapshot=?)`)
        .bind(Date.now(), body.jobId, roomId, roomId, stored.snapshot).run();
      return json({ ok: true });
    }
    if (!inputs.eligible || body.digest !== inputs.digest)
      throw new ForgeError(409, 'Confirm every player’s current card before generating.');
    if (!identity || env.FORGE_AUTH_MODE === 'legacy-code')
      throw new ForgeError(401, 'The host must sign in with ChatGPT to fund generation.');
    // Origin + host capability checked above. The trusted identity determines funding;
    // room membership is never substituted for authenticated API-key ownership.
    const session = await identitySession(env, identity);
    const internalRequest = new Request(new URL('/api/forge/generations', request.url), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.FORGE_ORIGIN ?? new URL(request.url).origin, 'X-Forge-CSRF': session.csrf },
      body: JSON.stringify({ requestKey: body.requestKey, cards: inputs.cards }),
    });
    const response = await forgeRequest(internalRequest, env, identity, { roomId, digest: inputs.digest, snapshot: stored.snapshot });
    if (!response.ok) return response;
    return json({ ok: true }, 202);
  } catch (error) {
    if (error instanceof ForgeError || error instanceof RoomHttpError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError) return json({ error: 'Invalid room generation request.' }, 400);
    return json({ error: 'Room generation is temporarily unavailable.' }, 503);
  }
}
