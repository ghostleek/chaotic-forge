export class ForgeError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('');
}
export function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++)
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
export function sameOrigin(request: Request, origin: string) {
  if (
    request.headers.get('Origin') !== origin ||
    request.headers.get('Sec-Fetch-Site') === 'cross-site'
  )
    throw new ForgeError(403, 'Request not allowed.');
}
export async function readJson(request: Request, max = 4096): Promise<unknown> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    throw new ForgeError(415, 'JSON is required.');
  const reader = request.body?.getReader();
  if (!reader) throw new ForgeError(400, 'Request body required.');
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > max) {
        await reader.cancel();
        throw new ForgeError(413, 'Request too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ForgeError(400, 'Invalid JSON.');
  }
}
