import { DEMO_POLICY } from '../contracts.ts';

export class RoomHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** The client retains a crypto.getRandomValues(32-byte) secret; only its hash is stored. */
export function participantCapability(request: Request): string {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(
    request.headers.get('authorization') ?? '',
  );
  if (!match)
    throw new RoomHttpError(
      403,
      'A private participant capability is required.',
    );
  return match[1];
}

export async function capabilityHash(capability: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(capability),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/** Count actual streamed UTF-8 bytes before parsing, including chunked requests. */
export async function readRoomJson(request: Request): Promise<unknown> {
  if (
    request.headers.get('content-type')?.split(';')[0].trim() !==
    'application/json'
  ) {
    throw new RoomHttpError(415, 'Send an application/json request.');
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw new RoomHttpError(403, 'Room commands must use the same origin.');
  }
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) > DEMO_POLICY.maxTraceBytes) {
    throw new RoomHttpError(413, 'The room request exceeds 512,000 bytes.');
  }
  if (!request.body)
    throw new RoomHttpError(400, 'A JSON request body is required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > DEMO_POLICY.maxTraceBytes) {
        await reader.cancel();
        throw new RoomHttpError(413, 'The room request exceeds 512,000 bytes.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    throw new RoomHttpError(400, 'The request must contain valid UTF-8 JSON.');
  }
}

export function validRoomId(roomId: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(roomId)) {
    throw new RoomHttpError(404, 'Room not found.');
  }
}
