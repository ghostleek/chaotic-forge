import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { ProductHeader } from '@/components/product-header';

export default function NotFound() {
  return (
    <div className="reference-app">
      <ProductHeader />
      <main className="not-found-page">
        <span>404 · Reference not found</span>
        <h1>This mechanic is not in the curated library yet.</h1>
        <p>Return to Explore and choose one of the source-linked examples.</p>
        <Link className="primary-action" href="/">
          <ArrowLeft aria-hidden="true" /> Back to Explore
        </Link>
      </main>
    </div>
  );
}
