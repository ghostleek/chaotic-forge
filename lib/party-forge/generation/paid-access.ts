import {
  decryptKey,
  isAdmin,
  type BillingEnv,
  type Identity,
} from './billing.ts';
import { ForgeError } from './security.ts';

/** Only trusted dispatch identity and server secrets may authorize provider spending. */
export async function paidAccess(
  env: BillingEnv & { OPENAI_API_KEY?: string },
  identity: Identity | null,
) {
  if (!identity)
    throw new ForgeError(
      401,
      'Sign in with ChatGPT and add your API key at /forge/create. Saved demos are free to play.',
    );
  if (isAdmin(env, identity)) {
    if (!env.OPENAI_API_KEY)
      throw new ForgeError(503, 'The site API key is not configured.');
    return {
      key: env.OPENAI_API_KEY,
      owner: identity.userId,
      billing: 'admin' as const,
    };
  }
  const saved = await env.DB.prepare(
    'SELECT ciphertext FROM forge_keys WHERE owner=?',
  )
    .bind(identity.userId)
    .first<{ ciphertext: string }>();
  if (!saved)
    throw new ForgeError(
      402,
      'Add your own OpenAI API key at /forge/create before generating. Saved demos are free to play.',
    );
  return {
    key: await decryptKey(env, identity.userId, saved.ciphertext),
    owner: identity.userId,
    billing: 'byok' as const,
  };
}
