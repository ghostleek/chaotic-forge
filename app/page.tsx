import Link from 'next/link';
import { DemoIntroduction } from '../components/party-forge/demos/demo-introduction';
import styles from '../components/party-forge/demos/dino-mario.module.css';
import { Lobby } from '../components/party-forge/lobby';

export const metadata = {
  title: 'Chaotic Forge — Your rules. Our game.',
  description: 'Write one instruction each, generate a pixel game, and compete with a friend. Two players to start; a third is optional.',
};

export default async function Home({ searchParams }: { searchParams: Promise<{ startRoom?: string; nickname?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <aside className={styles.homeEntry} aria-label="Simulated demo introduction">
        <Link href="/play/dino-mario">Try Dino × Mario <span>· simulated demo</span></Link>
        <DemoIntroduction />
      </aside>
      <Lobby initialStartRoom={params.startRoom === '1'} initialNickname={typeof params.nickname === 'string' ? params.nickname.slice(0, 32) : ''} />
    </>
  );
}
