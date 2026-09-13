import { z } from 'zod';
import { getDb } from '../../../db/index.ts';
import {
  createRoomRequestSchema,
  joinRequestSchema,
  roomCommandSchema,
  roomSnapshotSchema,
  type ParticipantAccess,
} from '../contracts.ts';
import {
  createRoomRecord as initialRoom,
  joinRoom,
  reduceRoom,
  refreshPresence,
  RoomTransitionError,
  type RoomRecord,
} from '../room-reducer.ts';
import {
  commitRoom,
  createRoomRecord,
  findCreatedRoom,
  findEnrollment,
  findReceipt,
  listPresence,
  loadRoomRecord,
  readHistory,
  resolveParticipant,
  touchParticipant,
} from './room-store.ts';
import {
  capabilityHash,
  participantCapability,
  readRoomJson,
  RoomHttpError,
  validRoomId,
} from './participants.ts';

const MAX_CAS_ATTEMPTS = 8;
const responseHeaders = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: responseHeaders });
}

async function requireRoom(
  db: D1Database,
  roomId: string,
): Promise<RoomRecord> {
  const room = await loadRoomRecord<RoomRecord>(db, roomId);
  if (!room) throw new RoomHttpError(404, 'Room not found.');
  return room;
}

/** Heartbeats are persisted independently so ordinary polling does not invalidate commands. */
async function currentRoom(
  db: D1Database,
  roomId: string,
  now: number,
): Promise<RoomRecord> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const record = await requireRoom(db, roomId);
    const presence = await listPresence(db, roomId);
    for (const participant of record.snapshot.participants) {
      const seen = presence.find((p) => p.participantId === participant.id);
      if (seen)
        participant.lastSeenAt = seen.lastSeenAt;
    }
    const current = refreshPresence(
      record,
      null,
      Math.max(Date.now(), now, record.snapshot.updatedAt),
    );
    if (current.snapshot.revision === record.snapshot.revision) return current;
    if (
      await commitRoom(db, record.snapshot.revision, current, {
        expectedPresence: record.snapshot.participants.map((p) => ({
          participantId: p.id,
          lastSeenAt: p.lastSeenAt,
        })),
      })
    )
      return current;
  }
  throw new RoomHttpError(
    503,
    'The room is busy. Retry with the same command ID.',
  );
}

async function authenticated(request: Request, roomId: string) {
  validRoomId(roomId);
  const capability = participantCapability(request);
  const db = await getDb();
  const enrollment = await resolveParticipant(
    db,
    roomId,
    await capabilityHash(capability),
  );
  if (!enrollment)
    throw new RoomHttpError(
      403,
      'This capability does not belong to this room.',
    );
  const now = Date.now();
  await touchParticipant(db, roomId, enrollment.participantId, now);
  return { db, enrollment, capability, now };
}

function enrollmentResponse(
  room: RoomRecord,
  participantId: string,
  capability: string,
) {
  if (!room.snapshot.participants.some((p) => p.id === participantId)) {
    throw new RoomHttpError(403, 'This participant is no longer in the room.');
  }
  const access: ParticipantAccess = {
    roomId: room.snapshot.roomId,
    participantId,
    capability,
  };
  return json(
    { access, snapshot: roomSnapshotSchema.parse(room.snapshot) },
    201,
  );
}

export async function createRoomResponse(request: Request): Promise<Response> {
  const capability = participantCapability(request);
  const payload = createRoomRequestSchema.parse(await readRoomJson(request));
  if (payload.setup.kind !== 'fresh') {
    throw new RoomHttpError(
      409,
      'Saved-game setup is not available yet. Start a fresh room.',
    );
  }
  const db = await getDb();
  const hash = await capabilityHash(capability);
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const previous = await findCreatedRoom(db, hash, payload.commandId);
    if (previous) {
      return enrollmentResponse(
        await requireRoom(db, previous.roomId),
        previous.participantId,
        capability,
      );
    }
    const participantId = crypto.randomUUID();
    const record = initialRoom(
      crypto.randomUUID(),
      participantId,
      payload.nickname,
      Date.now(),
    );
    if (
      await createRoomRecord(db, record, {
        participantId,
        capabilityHash: hash,
        commandId: payload.commandId,
      })
    ) {
      return enrollmentResponse(record, participantId, capability);
    }
  }
  throw new RoomHttpError(
    503,
    'Room creation is busy. Retry with the same command ID and capability.',
  );
}

export async function joinRoomResponse(
  request: Request,
  roomId: string,
): Promise<Response> {
  validRoomId(roomId);
  const capability = participantCapability(request);
  const payload = joinRequestSchema.parse(await readRoomJson(request));
  const db = await getDb();
  const hash = await capabilityHash(capability);
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const previous = await findEnrollment(db, roomId, hash);
    if (previous) {
      if (previous.commandId !== payload.commandId) {
        throw new RoomHttpError(
          409,
          'This capability already belongs to a participant. Reconnect with it.',
        );
      }
      return enrollmentResponse(
        await requireRoom(db, roomId),
        previous.participantId,
        capability,
      );
    }
    const now = Date.now();
    const record = await currentRoom(db, roomId, now);
    const participantId = crypto.randomUUID();
    const next = joinRoom(
      record,
      participantId,
      payload.nickname,
      Math.max(Date.now(), now, record.snapshot.updatedAt),
    );
    if (
      await commitRoom(db, record.snapshot.revision, next, {
        participant: {
          participantId,
          capabilityHash: hash,
          commandId: payload.commandId,
        },
        expectedPresence: record.snapshot.participants.map((p) => ({
          participantId: p.id,
          lastSeenAt: p.lastSeenAt,
        })),
      })
    )
      return enrollmentResponse(next, participantId, capability);
  }
  throw new RoomHttpError(
    503,
    'The room is busy. Retry with the same join command ID and capability.',
  );
}

export async function readRoomResponse(
  request: Request,
  roomId: string,
): Promise<Response> {
  const { db, enrollment, now } = await authenticated(request, roomId);
  const record = await currentRoom(db, roomId, now);
  if (
    !record.snapshot.participants.some((p) => p.id === enrollment.participantId)
  ) {
    throw new RoomHttpError(403, 'This participant is no longer in the room.');
  }
  const after = new URL(request.url).searchParams.get('after') ?? '0';
  if (!/^\d{1,16}$/.test(after) || !Number.isSafeInteger(Number(after))) {
    throw new RoomHttpError(
      400,
      'The history cursor must be a nonnegative integer.',
    );
  }
  const page = await readHistory(
    db,
    roomId,
    Number(after),
    100,
    record.snapshot.revision,
  );
  return json({
    snapshot: roomSnapshotSchema.parse(record.snapshot),
    history: page.history,
    historyCursor: page.cursor,
    historyCount: record.historyCount,
  });
}

export async function commandRoomResponse(
  request: Request,
  roomId: string,
): Promise<Response> {
  // Bound and validate before touching persistence or replaying the expensive trial.
  validRoomId(roomId);
  participantCapability(request);
  const command = roomCommandSchema.parse(await readRoomJson(request));
  const { db, enrollment, now } = await authenticated(request, roomId);
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const original = await findReceipt(
      db,
      roomId,
      enrollment.participantId,
      command.commandId,
    );
    if (original) {
      const current = await requireRoom(db, roomId);
      // Former participants may recover their own original receipt, never new room state.
      const member = current.snapshot.participants.some(
        (p) => p.id === enrollment.participantId,
      );
      return json(
        {
          receipt: original,
          ...(member ? { snapshot: current.snapshot } : {}),
        },
        original.status === 'accepted' ? 200 : 409,
      );
    }
    const current = await currentRoom(db, roomId, now);
    if (
      !current.snapshot.participants.some(
        (p) => p.id === enrollment.participantId,
      )
    ) {
      throw new RoomHttpError(
        403,
        'This participant is no longer in the room.',
      );
    }
    const transition = await reduceRoom(
      current,
      enrollment.participantId,
      command,
      Math.max(Date.now(), now, current.snapshot.updatedAt),
    );
    if (
      await commitRoom(db, current.snapshot.revision, transition.record, {
        receipt: {
          actorId: enrollment.participantId,
          receipt: transition.receipt,
        },
        history: transition.history,
        expectedPresence: current.snapshot.participants.map((p) => ({
          participantId: p.id,
          lastSeenAt: p.lastSeenAt,
        })),
      })
    ) {
      return json(
        { receipt: transition.receipt, snapshot: transition.record.snapshot },
        transition.receipt.status === 'accepted' ? 200 : 409,
      );
    }
  }
  throw new RoomHttpError(
    503,
    'The room is busy. Retry with the same command ID.',
  );
}

/** No storage exception becomes a fabricated local room or a claimed successful command. */
export async function roomHttpBoundary(
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof RoomHttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        { error: 'The request does not match the party-forge/1 protocol.' },
        400,
      );
    if (error instanceof RoomTransitionError)
      return json({ error: error.message }, 409);
    console.error(
      'Party room request failed; durable state was not acknowledged.',
    );
    return json(
      {
        error:
          'The room service is unavailable. Keep your inputs and retry with the same command ID.',
      },
      503,
    );
  }
}
