import { SnakeDemo } from '@/components/party-forge/creation/snake-demo';
import { savedSnakeInvadersBuild } from '@/lib/party-forge/demos/saved-snake-invaders';
export const metadata = { title: 'Saved Snake × Space Invaders · Forge' };
export default async function Page() {
  return <SnakeDemo build={await savedSnakeInvadersBuild()} />;
}
