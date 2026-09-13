const SESSIONS_URL =
  'https://api.openai.com/v1/agents/sessions?limit=1&order=desc';
const MAX_RESPONSE_BYTES = 256 * 1024;

/** Read access only. Never starts a session or retains other sessions' contents. */
export async function probeAgentReadAccess(
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
) {
  if (!apiKey?.trim())
    return {
      status: 'blocked',
      reason: 'missing-api-key',
      modelRequestsMade: 0,
    };
  try {
    const response = await fetchImpl(SESSIONS_URL, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'OpenAI-Beta': 'agents=v1',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    const requestId = response.headers.get('x-request-id');
    const receipt = {
      httpStatus: response.status,
      requestId:
        requestId && /^[a-zA-Z0-9_-]{1,128}$/.test(requestId)
          ? requestId
          : null,
      modelRequestsMade: 0,
    };
    if (!response.ok) {
      await response.body?.cancel();
      return { ...receipt, status: 'blocked', reason: 'api-access-rejected' };
    }
    if (!response.body)
      return { ...receipt, status: 'blocked', reason: 'invalid-response' };
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          return {
            ...receipt,
            status: 'blocked',
            reason: 'response-too-large',
          };
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (
      typeof body !== 'object' ||
      body === null ||
      !('data' in body) ||
      !Array.isArray(body.data) ||
      body.data.length > 1 ||
      !('object' in body) ||
      body.object !== 'list' ||
      !('has_more' in body) ||
      typeof body.has_more !== 'boolean'
    ) {
      return { ...receipt, status: 'blocked', reason: 'invalid-response' };
    }
    return {
      ...receipt,
      status: 'read-access-verified',
      sessionsReturned: body.data.length,
      writeAccessVerified: false,
      inferenceAccessVerified: false,
      sandboxAccessVerified: false,
    };
  } catch {
    // Fetch errors can contain credentials and API error payloads; never return them.
    return {
      status: 'blocked',
      reason: 'request-failed',
      modelRequestsMade: 0,
    };
  }
}
