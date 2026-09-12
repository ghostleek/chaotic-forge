import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { DashExperimentBuilder } from '@/components/dash-experiment-builder';
import { ProductHeader } from '@/components/product-header';

export const metadata: Metadata = {
  title: 'Adapt projectile-phasing dash — Mechanic Forge',
  description:
    'Adapt one dash recharge rule while preserving the sourced behavior and matched test conditions.',
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function DashForgePage() {
  return (
    <div className="reference-app">
      <ProductHeader active="golden-flow" />
      <main className="reference-page forge-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/mechanics/returnal-projectile-dash">
            <ArrowLeft aria-hidden="true" /> Projectile-phasing dash
          </Link>
          <span aria-hidden="true">/</span>
          <span>Adaptation draft</span>
        </nav>

        <DashExperimentBuilder />
      </main>
    </div>
  );
}
