import {
  forgeRequest,
  type ForgeEnv,
} from '@/lib/party-forge/generation/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
async function handle(request: Request) {
  const { env } = await import('cloudflare:workers');
  return forgeRequest(
    request,
    env as unknown as ForgeEnv,
    await getChatGPTUser(),
  );
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
