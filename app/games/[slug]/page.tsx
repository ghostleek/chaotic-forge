import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Gamepad2, Layers3 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductHeader } from '@/components/product-header';
import {
  buildGameCollections,
  findGameCollection,
  getMechanicPath,
} from '@/lib/mechanics/catalog';
import { VALIDATION_CORPUS } from '@/lib/mechanics/corpus';

type GamePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return buildGameCollections(VALIDATION_CORPUS).map((game) => ({
    slug: game.slug,
  }));
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = findGameCollection(VALIDATION_CORPUS, slug);

  if (!game) return {};

  return {
    title: `${game.name} mechanic breakdowns — Mechanic Forge`,
    description: `Inspect ${game.implementations.length} sourced ${game.name} mechanic implementations and their Forge interpretations.`,
    openGraph: { images: [] },
    twitter: { images: [] },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = findGameCollection(VALIDATION_CORPUS, slug);

  if (!game) notFound();

  const source = game.implementations[0].sources[0];
  const isReturnal = game.slug === 'returnal';

  return (
    <div className="reference-app">
      <ProductHeader active={isReturnal ? 'golden-flow' : 'explore'} />
      <main className="reference-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">
            <ArrowLeft aria-hidden="true" /> Explore
          </Link>
          <span aria-hidden="true">/</span>
          <span>{game.name}</span>
        </nav>

        <header className="game-hero">
          <div className="game-hero__mark" aria-hidden="true">
            {game.name
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => word[0])
              .join('')}
          </div>
          <div>
            <p className="reference-kicker">
              <Gamepad2 aria-hidden="true" /> Popular game breakdown
            </p>
            <h1>{game.name}</h1>
            <p>
              {isReturnal
                ? 'Two combat patterns show how movement through pressure and clean-play escalation create different forms of risk.'
                : `Explore ${game.implementations.length} source-linked implementations before adapting their causal patterns.`}
            </p>
            <div className="reference-meta">
              <span>{game.releaseYear}</span>
              <span>
                {game.genres
                  .map((genre) => genre.replaceAll('-', ' '))
                  .join(' · ')}
              </span>
              <span>{game.platforms.join(' · ')}</span>
            </div>
          </div>
        </header>

        <section className="game-mechanics" aria-labelledby="mechanics-title">
          <div className="section-heading">
            <div>
              <p>Mechanics in this game</p>
              <h2 id="mechanics-title">Choose one concrete implementation</h2>
            </div>
            <span>{game.implementations.length} breakdowns</span>
          </div>

          <div className="mechanic-list">
            {game.implementations.map((card, index) => (
              <article className="mechanic-list-card" key={card.id}>
                <span className="mechanic-list-card__index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p>{card.patternName}</p>
                  <h3>{card.implementationName}</h3>
                  <p>{card.summary.text}</p>
                  <div
                    className="reference-card__tags"
                    aria-label="Behavior tags"
                  >
                    {card.discovery.behaviors.slice(0, 3).map((behavior) => (
                      <span key={behavior}>{behavior}</span>
                    ))}
                  </div>
                </div>
                <Link href={getMechanicPath(card.id)}>
                  Open mechanic breakdown <ArrowRight aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <aside className="source-boundary">
          <Layers3 aria-hidden="true" />
          <div>
            <strong>Source boundary</strong>
            <p>
              Game facts link to {source.publisher}. Mechanic structure and
              trade-offs are labelled as Forge interpretation.
            </p>
          </div>
          <a href={source.url} target="_blank" rel="noreferrer">
            View official source <ArrowRight aria-hidden="true" />
          </a>
        </aside>
      </main>
    </div>
  );
}
