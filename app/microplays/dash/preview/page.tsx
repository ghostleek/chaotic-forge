import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { DashMicroplayPreview } from '@/components/dash-microplay-preview';
import { ProductHeader } from '@/components/product-header';
import {
  DASH_RECHARGE_OPTIONS,
  DEFAULT_DASH_GOAL,
  type DashRechargeOptionId,
} from '@/lib/mechanics/dash-experiment';

export const metadata: Metadata = {
  title: 'Dash A/B creator preview — Mechanic Forge',
  description:
    'Play the fixed dash mechanic with matched conditions and inspect preview-only event capture.',
  openGraph: { images: [] },
  twitter: { images: [] },
};

function readMutation(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (DASH_RECHARGE_OPTIONS.find((option) => option.id === candidate)?.id ??
    'elimination') as DashRechargeOptionId;
}

function readGoal(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.trim().slice(0, 240) || DEFAULT_DASH_GOAL;
}

export default async function DashPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    goal?: string | string[];
    mutation?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const mutationId = readMutation(params.mutation);
  const goal = readGoal(params.goal);

  return (
    <div className="reference-app">
      <ProductHeader active="golden-flow" />
      <main className="reference-page microplay-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/forge/dash">
            <ArrowLeft aria-hidden="true" /> Dash experiment
          </Link>
          <span aria-hidden="true">/</span>
          <span>Creator preview</span>
        </nav>

        <DashMicroplayPreview goal={goal} mutationId={mutationId} />
      </main>
    </div>
  );
}
