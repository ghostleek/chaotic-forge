import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { DashDemoPublish } from '@/components/dash-demo-publish';
import { ProductHeader } from '@/components/product-header';

export const metadata: Metadata = {
  title: 'Dash demo publishing — Mechanic Forge',
  description:
    'Inspect the fixed tester walkthrough and the boundary between a local demo and production sharing.',
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function DashPublishPage() {
  return (
    <div className="reference-app">
      <ProductHeader active="golden-flow" />
      <main className="reference-page publish-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/microplays/dash/preview">
            <ArrowLeft aria-hidden="true" /> Creator preview
          </Link>
          <span aria-hidden="true">/</span>
          <span>Demo publish</span>
        </nav>

        <DashDemoPublish />
      </main>
    </div>
  );
}
