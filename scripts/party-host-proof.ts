import { z } from 'zod';
import {
  compareAndSwapRoom,
  createRoom,
  getDb,
  readRoom,
} from '../db/index.ts';
import { roomSnapshotSchema } from '../lib/party-forge/contracts.ts';

/** Imported only by the local harness wrapper, never the application entrypoint. */
export async function proofRequest(
  request: Request,
  token: string,
): Promise<Response> {
  const url = new URL(request.url);
  if (!token || request.headers.get('authorization') !== `Bearer ${token}`)
    return new Response(null, { status: 403 });
  const roomId = url.pathname.slice('/__party_host_proof/rooms/'.length);
  if (
    !url.pathname.startsWith('/__party_host_proof/rooms/') ||
    !/^[a-zA-Z0-9_-]{1,96}$/.test(roomId)
  )
    return new Response(null, { status: 404 });
  const db = await getDb();
  if (request.method === 'GET') {
    const room = await readRoom(db, roomId);
    return Response.json(room, { status: room ? 200 : 404 });
  }
  if (!['POST', 'PUT'].includes(request.method))
    return new Response(null, { status: 405 });
  try {
    const body = await request.text();
    if (body.length > 64_000) return new Response(null, { status: 413 });
    const payload = z
      .strictObject({
        snapshot: roomSnapshotSchema,
        expectedRevision: z.number().int().nonnegative().optional(),
      })
      .parse(JSON.parse(body));
    if (payload.snapshot.roomId !== roomId)
      return new Response(null, { status: 400 });
    if (request.method === 'POST') {
      if (payload.expectedRevision !== undefined)
        return new Response(null, { status: 400 });
      return Response.json(await createRoom(db, payload.snapshot), {
        status: 201,
      });
    }
    if (payload.expectedRevision === undefined)
      return new Response(null, { status: 400 });
    const accepted = await compareAndSwapRoom(
      db,
      payload.expectedRevision,
      payload.snapshot,
    );
    return Response.json(
      { accepted, current: await readRoom(db, roomId) },
      { status: accepted ? 200 : 409 },
    );
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return new Response(null, { status: 400 });
    throw error;
  }
}
