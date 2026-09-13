import test from 'node:test';
import assert from 'node:assert/strict';
import { paidAccess } from '../lib/party-forge/generation/paid-access.ts';
import { encryptKey, isAdmin } from '../lib/party-forge/generation/billing.ts';
const emails = 'kahhow@string.sg,leekahhow@gmail.com,lancetyw@gmail.com';
void test('only authenticated exact admin emails use the site key; all others need their own', async () => {
  const env = {
    FORGE_ADMIN_EMAILS: emails,
    OPENAI_API_KEY: 'sk-fixture-site',
    FORGE_KEY_ENCRYPTION_SECRET: 'ab'.repeat(32),
    DB: {
      prepare() {
        return {
          bind() {
            return { first: async () => null };
          },
        };
      },
    },
  };
  await assert.rejects(paidAccess(env, null), (e) => e.status === 401);
  for (const email of emails.split(','))
    assert.equal(
      (await paidAccess(env, { userId: email, email })).key,
      'sk-fixture-site',
    );
  for (const email of [
    'stranger@gmail.com',
    'kahhow@string.sg.evil.test',
    'lancetyw+admin@gmail.com',
  ])
    await assert.rejects(
      paidAccess(env, { userId: 'user', email }),
      (e) => e.status === 402,
    );
  assert.equal(
    isAdmin(env, { userId: 'user', email: 'KAHHOW@STRING.SG' }),
    true,
  );
  const ciphertext = await encryptKey(env, 'user', 'sk-fixture-user');
  const byok = {
    ...env,
    DB: {
      prepare() {
        return {
          bind(owner) {
            assert.equal(owner, 'user');
            return { first: async () => ({ ciphertext }) };
          },
        };
      },
    },
  };
  assert.equal(
    (await paidAccess(byok, { userId: 'user', email: 'other@gmail.com' })).key,
    'sk-fixture-user',
  );
});
