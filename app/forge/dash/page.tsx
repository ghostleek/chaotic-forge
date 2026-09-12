import type { Metadata } from 'next';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FlaskConical,
  LockKeyhole,
} from 'lucide-react';
import Link from 'next/link';

import { ProductHeader } from '@/components/product-header';

export const metadata: Metadata = {
  title: 'Adapt projectile-phasing dash — Mechanic Forge',
  description:
    'Adapt one dash recharge rule while preserving the sourced behavior and matched test conditions.',
  openGraph: { images: [] },
  twitter: { images: [] },
};

const LOCKED_FIELDS = [
  'Dash distance',
  'Protected window',
  'Player speed',
  'Weapon damage',
  'Arena and enemies',
  'Encounter seed',
  'Run duration',
];

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

        <header className="forge-hero">
          <div>
            <p className="reference-kicker">
              <FlaskConical aria-hidden="true" /> Your decision
            </p>
            <h1>
              Reward aggressive movement without increasing weapon damage.
            </h1>
            <p>
              Start with the referenced dash behavior, then isolate one
              Forge-defined experiment rule.
            </p>
          </div>
          <div className="experiment-count">
            <strong>1</strong>
            <span>rule changes</span>
            <small>7 conditions stay matched</small>
          </div>
        </header>

        <section
          className="experiment-contract"
          aria-labelledby="contract-title"
        >
          <div className="section-heading">
            <div>
              <p>Experiment contract</p>
              <h2 id="contract-title">
                One rule changes. Everything else stays matched.
              </h2>
            </div>
            <span>Draft ready</span>
          </div>

          <table
            className="variant-comparison"
            aria-label="Dash recharge variants"
          >
            <thead>
              <tr className="variant-row variant-row--heading">
                <th scope="col">Rule</th>
                <th scope="col">
                  Control A <small>Experiment baseline · Forge-defined</small>
                </th>
                <th scope="col">
                  Variant B <small>Your decision</small>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="variant-row variant-row--changed">
                <th scope="row">Dash recharge</th>
                <td>After 3 seconds</td>
                <td>On enemy elimination</td>
              </tr>
              {LOCKED_FIELDS.map((field) => (
                <tr className="variant-row" key={field}>
                  <th scope="row">
                    <LockKeyhole aria-hidden="true" /> {field}
                  </th>
                  <td>
                    <Check aria-hidden="true" /> Locked
                  </td>
                  <td>
                    <Check aria-hidden="true" /> Matched
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section
          className="adaptation-boundary"
          aria-label="Provenance boundary"
        >
          <div>
            <span className="provenance-label provenance-label--source">
              Preserved from the reference
            </span>
            <p>
              Dash can cross defined projectiles during a bounded movement
              window.
            </p>
          </div>
          <div>
            <span className="provenance-label provenance-label--interpretation">
              Experiment baseline
            </span>
            <p>
              The three-second timer is Forge-defined, not a claim about
              Returnal.
            </p>
          </div>
          <div>
            <span className="provenance-label provenance-label--decision">
              Your decision
            </span>
            <p>Restore the dash charge when an enemy is eliminated.</p>
          </div>
        </section>

        <aside className="risk-callout">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Review the consequence before building</strong>
            <ul>
              <li>Elimination recharge may create a win-more loop.</li>
              <li>
                A spent charge may stay unavailable when a player cannot secure
                a kill.
              </li>
            </ul>
          </div>
        </aside>

        <footer className="forge-next-step">
          <span>Next implementation slice</span>
          <strong>
            Make this contract editable, exportable, and ready for a matched A/B
            preview.
          </strong>
        </footer>
      </main>
    </div>
  );
}
