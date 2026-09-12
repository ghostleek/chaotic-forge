import type { Metadata } from 'next';
import { Hammer } from 'lucide-react';
import Link from 'next/link';

import { DashTesterWalkthrough } from '@/components/dash-tester-walkthrough';

export const metadata: Metadata = {
  title: 'Dash movement test — Mechanic Forge demo',
  description:
    'A no-account, two-run local demonstration of a blind microplay test.',
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function DashDemoPage() {
  return (
    <div className="tester-app">
      <header className="tester-header">
        <Link href="/" aria-label="Mechanic Forge home">
          <span aria-hidden="true">
            <Hammer />
          </span>
          <strong>Mechanic Forge</strong>
        </Link>
        <em>Local demo · no account</em>
      </header>
      <main className="tester-page">
        <DashTesterWalkthrough />
      </main>
    </div>
  );
}
