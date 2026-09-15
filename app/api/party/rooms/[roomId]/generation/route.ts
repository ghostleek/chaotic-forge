import { getChatGPTUser } from '@/app/chatgpt-auth';
import { roomGenerationRequest } from '@/lib/party-forge/server/room-generation';
import type { ForgeEnv } from '@/lib/party-forge/generation/server';
type Context = { params: Promise<{ roomId: string }> };
async function handle(request: Request, context: Context) {
  const { env } = await import('cloudflare:workers');
  return roomGenerationRequest(request, (await context.params).roomId, env as unknown as ForgeEnv, await getChatGPTUser());
}
export const GET = handle;
export const POST = handle;
