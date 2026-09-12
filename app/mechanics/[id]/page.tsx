import type { Metadata } from 'next';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  FlaskConical,
  Lightbulb,
  LockKeyhole,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductHeader } from '@/components/product-header';
import {
  findMechanicImplementation,
  getGamePath,
} from '@/lib/mechanics/catalog';
import { VALIDATION_CORPUS } from '@/lib/mechanics/corpus';

type MechanicPageProps = {
  params: Promise<{ id: string }>;
};

const FIELD_LABELS = {
  intent: 'Goal',
  trigger: 'Activation',
  guard: 'Availability',
  transform: 'State change',
  interaction: 'Interaction',
  feedback: 'Readable feedback',
  risk: 'Trade-off',
  invariant: 'Invariant',
  evidence: 'Observable evidence',
} as const;

export function generateStaticParams() {
  return VALIDATION_CORPUS.map((card) => ({ id: card.id }));
}

export async function generateMetadata({
  params,
}: MechanicPageProps): Promise<Metadata> {
  const { id } = await params;
  const card = findMechanicImplementation(VALIDATION_CORPUS, id);

  if (!card) return {};

  return {
    title: `${card.implementationName} — Mechanic Forge`,
    description: card.summary.text,
    openGraph: { images: [] },
    twitter: { images: [] },
  };
}

export default async function MechanicPage({ params }: MechanicPageProps) {
  const { id } = await params;
  const card = findMechanicImplementation(VALIDATION_CORPUS, id);

  if (!card) notFound();

  const source = card.sources[0];
  const sourcedFields = Object.entries(card.causal).filter(
    ([, statement]) => statement.origin === 'source',
  );
  const interpretedFields = Object.entries(card.causal).filter(
    ([, statement]) => statement.origin === 'product-synthesis',
  );
  const isGoldenDash = card.id === 'returnal-projectile-dash';

  return (
    <div className="reference-app">
      <ProductHeader active={isGoldenDash ? 'golden-flow' : 'explore'} />
      <main className="reference-page mechanic-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href={getGamePath(card.game.name)}>
            <ArrowLeft aria-hidden="true" /> {card.game.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{card.implementationName}</span>
        </nav>

        <header className="mechanic-hero">
          <div>
            <p className="reference-kicker">{card.patternName}</p>
            <h1>{card.implementationName}</h1>
            <p>{card.summary.text}</p>
          </div>
          <div className="mechanic-hero__actions">
            {isGoldenDash ? (
              <Link className="primary-action" href="/forge/dash">
                Adapt this mechanic <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <Link
                className="secondary-action"
                href={getGamePath(card.game.name)}
              >
                Explore this game <ArrowRight aria-hidden="true" />
              </Link>
            )}
            <a
              className="secondary-action"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              View official source <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </header>

        {isGoldenDash && (
          <section
            className="mechanic-diagram"
            aria-label="Dash causal sequence"
          >
            <div>
              <span>01</span>
              <strong>Read the projectile lane</strong>
              <small>Incoming danger remains visible</small>
            </div>
            <ArrowRight aria-hidden="true" />
            <div>
              <span>02</span>
              <strong>Commit the dash</strong>
              <small>A bounded protected window begins</small>
            </div>
            <ArrowRight aria-hidden="true" />
            <div>
              <span>03</span>
              <strong>Own the endpoint</strong>
              <small>Positioning risk is preserved</small>
            </div>
          </section>
        )}

        <section className="trust-stack" aria-label="Mechanic provenance">
          <article className="trust-panel trust-panel--source">
            <header>
              <span className="provenance-label provenance-label--source">
                <BookOpenCheck aria-hidden="true" /> From the source
              </span>
              <p>Claims supported directly by the linked publisher material.</p>
            </header>
            <blockquote>{card.summary.text}</blockquote>
            <dl>
              {sourcedFields.map(([field, statement]) => (
                <div key={field}>
                  <dt>{FIELD_LABELS[field as keyof typeof FIELD_LABELS]}</dt>
                  <dd>{statement.text}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="trust-panel trust-panel--interpretation">
            <header>
              <span className="provenance-label provenance-label--interpretation">
                <Lightbulb aria-hidden="true" /> Forge interpretation
              </span>
              <p>
                A causal reading to help adaptation—not a sourced game fact.
              </p>
            </header>
            <dl>
              {interpretedFields.map(([field, statement]) => (
                <div key={field}>
                  <dt>{FIELD_LABELS[field as keyof typeof FIELD_LABELS]}</dt>
                  <dd>{statement.text}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="trust-panel trust-panel--decision">
            <header>
              <span className="provenance-label provenance-label--decision">
                <FlaskConical aria-hidden="true" /> Your decision
              </span>
              <p>No experiment rule has been attributed to {card.game.name}.</p>
            </header>
            <div className="decision-empty-state">
              <LockKeyhole aria-hidden="true" />
              <div>
                <strong>Preserve the mechanic, change one rule.</strong>
                <p>
                  Start an adaptation with the sourced behavior and Forge
                  invariants kept visible.
                </p>
              </div>
              {isGoldenDash ? (
                <Link className="primary-action" href="/forge/dash">
                  Adapt this mechanic <ArrowRight aria-hidden="true" />
                </Link>
              ) : (
                <Link className="secondary-action" href="/">
                  Find a supported test <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
