import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './forge-header.module.css';

/** Shared party, demo and creator navigation. Page-specific help stays with its runtime. */
export function ForgeHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <Link
        href="/"
        className={styles.wordmark}
        aria-label="Chaotic Forge home"
      >
        CHAOTIC
        <br />
        FORGE /
      </Link>
      <nav aria-label="Forge navigation" className={styles.actions}>
        {children}
      </nav>
    </header>
  );
}
