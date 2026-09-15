import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptKey,
  decryptKey,
  requireAdmin,
} from '../lib/party-forge/generation/billing.ts';
void test('BYOK ciphertext binds to owner, hides plaintext and uses fresh nonces', async () => {
  const env = { FORGE_KEY_ENCRYPTION_SECRET: 'ab'.repeat(32) };
  const value = 'sk-fixture-never-a-real-key';
  const first = await encryptKey(env, 'alice', value);
  const second = await encryptKey(env, 'alice', value);
  assert.notEqual(first, second);
  assert.equal(first.includes(value), false);
  assert.equal(await decryptKey(env, 'alice', first), value);
  await assert.rejects(decryptKey(env, 'bob', first));
  await assert.rejects(
    decryptKey(
      { FORGE_KEY_ENCRYPTION_SECRET: 'cd'.repeat(32) },
      'alice',
      first,
    ),
  );
  await assert.rejects(encryptKey({}, 'alice', value));
});
void test('only the three authenticated emails receive sponsored access', () => {
  requireAdmin({}, { userId: 'owner', email: 'LEEKAHHOW@gmail.com' });
  assert.throws(() =>
    requireAdmin(
      { FORGE_ADMIN_USER_IDS: 'owner' },
      { userId: 'owner', email: 'other@example.com' },
    ),
  );
  assert.throws(() =>
    requireAdmin(
      { FORGE_ADMIN_EMAILS: 'other@example.com' },
      { userId: 'other', email: 'other@example.com' },
    ),
  );
});
