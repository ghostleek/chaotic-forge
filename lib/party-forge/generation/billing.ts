import { ForgeError, token } from './security.ts';
export type Identity = { userId: string; email: string };
export type BillingEnv = {
  DB: D1Database;
  FORGE_KEY_ENCRYPTION_SECRET?: string;
  FORGE_ADMIN_USER_IDS?: string;
  FORGE_ADMIN_EMAILS?: string;
  FORGE_TRIAL_ENABLED?: string;
};
function secret(env: BillingEnv) {
  if (!/^[a-f0-9]{64}$/.test(env.FORGE_KEY_ENCRYPTION_SECRET ?? ''))
    throw new ForgeError(503, 'Key storage is not configured.');
  return Uint8Array.from(env.FORGE_KEY_ENCRYPTION_SECRET!.match(/../g)!, (v) =>
    parseInt(v, 16),
  );
}
export async function encryptKey(
  env: BillingEnv,
  owner: string,
  value: string,
) {
  const key = await crypto.subtle.importKey(
    'raw',
    secret(env),
    'AES-GCM',
    false,
    ['encrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(owner) },
    key,
    new TextEncoder().encode(value),
  );
  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(bytes)),
  });
}
export async function decryptKey(
  env: BillingEnv,
  owner: string,
  ciphertext: string,
) {
  const value = JSON.parse(ciphertext) as { iv: number[]; data: number[] };
  const key = await crypto.subtle.importKey(
    'raw',
    secret(env),
    'AES-GCM',
    false,
    ['decrypt'],
  );
  const bytes = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: Uint8Array.from(value.iv),
      additionalData: new TextEncoder().encode(owner),
    },
    key,
    Uint8Array.from(value.data),
  );
  return new TextDecoder().decode(bytes);
}
export const SPONSORED_EMAILS = [
  'kahhow@string.sg',
  'leekahhow@gmail.com',
  'lancetyw@gmail.com',
] as const;
export function isAdmin(_env: BillingEnv, identity: Identity) {
  return SPONSORED_EMAILS.some(
    (email) => email === identity.email?.trim().toLowerCase(),
  );
}
export function requireAdmin(env: BillingEnv, identity: Identity) {
  if (!isAdmin(env, identity))
    throw new ForgeError(403, 'Admin access required.');
}
export async function billingStatus(env: BillingEnv, identity: Identity) {
  const stored = await env.DB.prepare(
    'SELECT owner FROM forge_keys WHERE owner=?',
  )
    .bind(identity.userId)
    .first();
  return {
    trial: false,
    remaining: 0,
    hasKey: !!stored,
    email: identity.email,
    userId: identity.userId,
    admin: isAdmin(env, identity),
  };
}
export async function identitySession(env: BillingEnv, identity: Identity) {
  const existing = await env.DB.prepare(
    'SELECT csrf FROM forge_sessions WHERE id=?',
  )
    .bind(identity.userId)
    .first<{ csrf: string }>();
  if (existing) return { id: identity.userId, csrf: existing.csrf };
  await env.DB.prepare(
    "INSERT INTO forge_sessions(id,csrf,epoch,expires) VALUES (?,?,'chatgpt',0) ON CONFLICT(id) DO NOTHING",
  )
    .bind(identity.userId, token())
    .run();
  return {
    id: identity.userId,
    csrf: (await env.DB.prepare('SELECT csrf FROM forge_sessions WHERE id=?')
      .bind(identity.userId)
      .first<{ csrf: string }>())!.csrf,
  };
}
