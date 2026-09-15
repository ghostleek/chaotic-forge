import { Creator } from '@/components/party-forge/creation/creator';
import Link from 'next/link';
import { ForgeHeader } from '@/components/party-forge/forge-header';
import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create a game · Forge' };
export default async function Page() {
  const user = await getChatGPTUser();
  const { env } = await import('cloudflare:workers');
  if (
    (env as unknown as { FORGE_AUTH_MODE?: string }).FORGE_AUTH_MODE ===
    'legacy-code'
  )
    return <Creator />;
  if (!user)
    return (
      <main style={{ padding: '80px 24px', maxWidth: 720, margin: 'auto' }}>
        <ForgeHeader />
        <h1>Create a game with Forge</h1>
        <p>
          Sign in with ChatGPT to use your own OpenAI API key or access an
          approved trial.
        </p>
        <a href={chatGPTSignInPath('/forge/create')} target="_top">
          Sign in with ChatGPT →
        </a>
        <p>
          <Link href="/play/snake-space-invaders">
            Play the public demo without signing in
          </Link>
        </p>
      </main>
    );
  return <Creator signedIn />;
}
