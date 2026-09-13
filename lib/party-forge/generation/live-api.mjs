export class AgentApiError extends Error {
  constructor(status, code, requestId) {
    super('Agents API request failed');
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}
const safe = (value) =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value)
    ? value
    : null;

/** Fixed origin, bounded bytes, no redirects, no automatic mutation retries. */
export function createAgentApi(
  apiKey,
  onReceipt = async () => {},
  fetchImpl = fetch,
) {
  if (!apiKey?.trim()) throw new Error('missing-api-key');
  return async function request(
    path,
    {
      method = 'GET',
      body,
      idempotencyKey,
      bytes = false,
      limit = 4 * 1024 * 1024,
    } = {},
  ) {
    if (!/^\/agents\/[a-zA-Z0-9_/?=&-]+$/.test(path) || path.includes('..'))
      throw new Error('invalid-api-path');
    const response = await fetchImpl('https://api.openai.com/v1' + path, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'OpenAI-Beta': 'agents=v1',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const receipt = {
      method,
      path,
      status: response.status,
      requestId: safe(response.headers.get('x-request-id')),
    };
    await onReceipt(receipt);
    const reader = response.body?.getReader();
    const chunks = [];
    let length = 0;
    if (reader) {
      try {
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          length += item.value.byteLength;
          if (length > limit) {
            await reader.cancel();
            throw new Error('api-response-too-large');
          }
          chunks.push(item.value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const data = Buffer.concat(chunks);
    if (!response.ok) {
      let code = null;
      try {
        code = safe(JSON.parse(data.toString('utf8')).error?.code);
      } catch {
        /* No raw payload in errors. */
      }
      throw new AgentApiError(response.status, code, receipt.requestId);
    }
    return bytes
      ? data
      : data.length
        ? JSON.parse(data.toString('utf8'))
        : null;
  };
}
