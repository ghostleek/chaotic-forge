import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  capabilityHash,
  participantCapability,
  readRoomJson,
  RoomHttpError,
} from '../lib/party-forge/server/participants.ts';

const url = 'https://forge.example/api/party/rooms';
const bodyRequest = (body, headers = {}) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  });
const rejectsStatus = (promise, status) =>
  assert.rejects(
    promise,
    (error) => error instanceof RoomHttpError && error.status === status,
  );

test('room transport counts streamed bytes before JSON parsing without trusting content-length', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(256_000));
      controller.enqueue(new Uint8Array(256_001));
      controller.close();
    },
  });
  await rejectsStatus(
    readRoomJson(bodyRequest(stream, { 'content-length': '2' })),
    413,
  );
  const oversizedUtf8 = JSON.stringify({ name: '🎮'.repeat(130_000) });
  await rejectsStatus(readRoomJson(bodyRequest(oversizedUtf8)), 413);
});

test('room transport rejects malformed UTF-8, JSON, wrong content type and cross-origin commands', async () => {
  await rejectsStatus(
    readRoomJson(bodyRequest(new Uint8Array([0xc0, 0x80]))),
    400,
  );
  await rejectsStatus(readRoomJson(bodyRequest('{')), 400);
  await rejectsStatus(
    readRoomJson(bodyRequest('{}', { 'content-type': 'text/plain' })),
    415,
  );
  await rejectsStatus(
    readRoomJson(bodyRequest('{}', { origin: 'https://unrelated.example' })),
    403,
  );
  assert.deepEqual(
    await readRoomJson(
      bodyRequest('{"nickname":"Lance"}', { origin: 'https://forge.example' }),
    ),
    { nickname: 'Lance' },
  );
});

test('participant capabilities are private bearer secrets, not room IDs or actor IDs', async () => {
  const secret = 'a1'.repeat(32);
  assert.equal(
    participantCapability(
      new Request(url, { headers: { authorization: `Bearer ${secret}` } }),
    ),
    secret,
  );
  assert.throws(() => participantCapability(new Request(url)), { status: 403 });
  assert.throws(
    () =>
      participantCapability(
        new Request(url, {
          headers: { authorization: 'Bearer participant-alice' },
        }),
      ),
    { status: 403 },
  );
  const hash = await capabilityHash(secret);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, secret);
  assert.notEqual(hash, await capabilityHash('b2'.repeat(32)));
  assert.equal(hash, await capabilityHash(secret));
});
