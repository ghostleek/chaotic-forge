'use client';

import {
  ArrowRight,
  Check,
  Clipboard,
  ExternalLink,
  LockKeyhole,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

const DEMO_PATH = '/play/dash-demo';

const READY_ITEMS = [
  'Fixed mechanic contract',
  'Matched seed and arena',
  'Blind Run 1 / Run 2 labels',
  'No-account walkthrough',
] as const;

const BLOCKED_ITEMS = [
  'Unlisted per-experiment URL',
  'Durable creator-owned results',
  'Stable participant identity',
  'Balanced assignment and duplicate checks',
] as const;

export function DashDemoPublish() {
  const [copied, setCopied] = useState(false);

  const copyDemoPath = async () => {
    const url = new URL(DEMO_PATH, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <>
      <header className="publish-hero">
        <div>
          <p className="reference-kicker">
            <ExternalLink aria-hidden="true" /> Demo publish preview
          </p>
          <h1>Test the handoff without faking the infrastructure.</h1>
          <p>
            This fixed walkthrough proves the tester experience. It does not
            create a private experiment, send results back, or produce durable
            evidence.
          </p>
        </div>
        <div className="publish-mode-badge">
          <ShieldAlert aria-hidden="true" />
          <div>
            <strong>Local demo mode</strong>
            <span>No creator inbox · no external storage</span>
          </div>
        </div>
      </header>

      <section className="publish-gate" aria-labelledby="publish-gate-title">
        <header>
          <div>
            <span>Capability gate</span>
            <h2 id="publish-gate-title">What this link can—and cannot—prove</h2>
          </div>
          <em>Demo ready</em>
        </header>
        <div className="capability-columns">
          <div>
            <strong>Working in this build</strong>
            <ul>
              {READY_ITEMS.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Blocked for production</strong>
            <ul>
              {BLOCKED_ITEMS.map((item) => (
                <li key={item}>
                  <LockKeyhole aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="demo-link-card" aria-labelledby="demo-link-title">
        <div>
          <span>Fixed walkthrough route</span>
          <h2 id="demo-link-title">{DEMO_PATH}</h2>
          <p>
            Anyone who can access this deployment can open the same demo. Their
            response remains in their tab and is not delivered to you.
          </p>
        </div>
        <div className="demo-link-actions">
          <Button type="button" variant="outline" onClick={copyDemoPath}>
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Clipboard aria-hidden="true" />
            )}
            {copied ? 'Demo URL copied' : 'Copy demo URL'}
          </Button>
          <Link className="primary-action" href={DEMO_PATH}>
            Open tester walkthrough <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? 'The fixed demo URL was copied.' : ''}
        </p>
      </section>

      <aside className="production-boundary">
        <ShieldAlert aria-hidden="true" />
        <div>
          <strong>Do not use this route for a real study yet.</strong>
          <p>
            Production sharing still requires creator authentication, durable
            experiment storage, consent records, withdrawal, expiry, and
            authorization tests from the delivery plan.
          </p>
        </div>
      </aside>
    </>
  );
}
