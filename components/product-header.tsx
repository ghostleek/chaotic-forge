import { BookOpen, Compass, Hammer } from 'lucide-react';
import Link from 'next/link';

export function ProductHeader({
  active = 'explore',
}: {
  active?: 'explore' | 'golden-flow';
}) {
  return (
    <header className="explore-header">
      <Link className="explore-brand" href="/" aria-label="Mechanic Forge home">
        <span aria-hidden="true">
          <Hammer />
        </span>
        <strong>Mechanic Forge</strong>
        <em>ALPHA</em>
      </Link>

      <nav aria-label="Primary navigation">
        <Link href="/" aria-current={active === 'explore' ? 'page' : undefined}>
          <BookOpen aria-hidden="true" /> Explore
        </Link>
        <Link
          href="/games/returnal"
          aria-current={active === 'golden-flow' ? 'page' : undefined}
        >
          <Compass aria-hidden="true" /> Returnal flow
        </Link>
      </nav>

      <div className="corpus-status">
        <i aria-hidden="true" /> Curated beta · 10 mechanics
      </div>
    </header>
  );
}
