import { ExploreShell } from '@/components/explore-shell';
import Link from 'next/link';
import { DemoIntroduction } from '@/components/party-forge/demos/demo-introduction';
import styles from '@/components/party-forge/demos/dino-mario.module.css';

export default function Home() {
  return (
    <>
      <aside
        className={styles.homeEntry}
        aria-label="Simulated demo introduction"
      >
        <Link href="/play/dino-mario">
          Try Dino × Mario <span>· simulated demo</span>
        </Link>
        <DemoIntroduction autoOpen />
      </aside>
      <ExploreShell />
    </>
  );
}
