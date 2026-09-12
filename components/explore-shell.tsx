'use client';

import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useReducer, useRef } from 'react';

import { ProductHeader } from '@/components/product-header';
import {
  buildGameCollections,
  getGamePath,
  getMechanicPath,
} from '@/lib/mechanics/catalog';
import { VALIDATION_CORPUS } from '@/lib/mechanics/corpus';
import {
  EXPLORE_FILTER_KEYS,
  INITIAL_EXPLORE_STATE,
  buildFilterOptions,
  exploreReducer,
  formatFilterLabel,
  formatOption,
  getActiveFilterCount,
  getExploreResults,
  getExploreShortcut,
  getMatchReasons,
  type ExploreFilterKey,
} from '@/lib/mechanics/explore-state';
import type { MechanicImplementationCard } from '@/lib/mechanics/schema';

const FILTER_OPTIONS = buildFilterOptions(VALIDATION_CORPUS);
const GAME_COLLECTIONS = buildGameCollections(VALIDATION_CORPUS);
const PRIMARY_FILTER_KEYS: ExploreFilterKey[] = ['behavior', 'systemFamily'];
const ADVANCED_FILTER_KEYS = EXPLORE_FILTER_KEYS.filter(
  (key) => !PRIMARY_FILTER_KEYS.includes(key),
);
const SEARCH_SUGGESTIONS = [
  'Reward precise defensive timing',
  'Recover after taking damage',
  'Move through danger',
  'Maintain offensive pressure',
];

const FILTER_PLACEHOLDERS: Record<ExploreFilterKey, string> = {
  behavior: 'All behaviors',
  systemFamily: 'All systems',
  genre: 'All genres',
  platform: 'All platforms',
  timescale: 'Any timescale',
  context: 'Any context',
  complexity: 'Any complexity',
  dependency: 'Any dependency',
  risk: 'Any risk',
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

function ImplementationCard({
  card,
  reasons,
}: {
  card: MechanicImplementationCard;
  reasons: string[];
}) {
  const source = card.sources[0];

  return (
    <article className="reference-card">
      <div className="reference-card__meta">
        <span>
          {card.game.name} · {card.game.releaseYear}
        </span>
        <span className="source-state">
          <CheckCircle2 aria-hidden="true" /> Sourced summary
        </span>
      </div>

      <div className="reference-card__title">
        <div className="game-mark" aria-hidden="true">
          {card.game.name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')}
        </div>
        <div>
          <p>{card.patternName}</p>
          <h2>{card.implementationName}</h2>
        </div>
      </div>

      <p className="reference-card__summary">{card.summary.text}</p>

      <div className="match-explanation">
        <span>Why this matched</span>
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <dl className="comparison-preview">
        {(['agency', 'executionDemand', 'failureCost'] as const).map(
          (dimension) => (
            <div key={dimension}>
              <dt>
                {dimension === 'executionDemand'
                  ? 'Execution'
                  : dimension === 'failureCost'
                    ? 'Failure cost'
                    : 'Agency'}
              </dt>
              <dd>
                {card.comparison[dimension].label}
                <small>Product synthesis</small>
              </dd>
            </div>
          ),
        )}
      </dl>

      <div className="reference-card__tags" aria-label="Behavior tags">
        {card.discovery.behaviors.slice(0, 2).map((behavior) => (
          <span key={behavior}>{behavior}</span>
        ))}
      </div>

      <footer>
        <span>
          <Sparkles aria-hidden="true" /> Pattern: product synthesis
        </span>
        <div className="reference-card__actions">
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open source for ${card.implementationName}: ${source.title}`}
          >
            Source <ArrowUpRight aria-hidden="true" />
          </a>
          <Link href={getMechanicPath(card.id)}>
            Open breakdown <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </footer>
    </article>
  );
}

export function ExploreShell() {
  const [state, dispatch] = useReducer(exploreReducer, INITIAL_EXPLORE_STATE);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const results = useMemo(
    () => getExploreResults(VALIDATION_CORPUS, state),
    [state],
  );
  const activeFilterCount = getActiveFilterCount(state);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = getExploreShortcut({
        key: event.key,
        hasModifier: event.metaKey || event.ctrlKey || event.altKey,
        targetIsEditable: isEditableTarget(event.target),
        searchIsFocused: document.activeElement === searchRef.current,
        hasQuery: Boolean(state.query),
      });

      if (action === 'focus-search') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (action === 'clear-query') {
        event.preventDefault();
        dispatch({ type: 'query.changed', query: '' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.query]);

  const hasActiveSearch = Boolean(state.query || activeFilterCount);

  const commitQuery = (query: string) => {
    dispatch({ type: 'suggestion.chosen', query });
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      resultsRef.current?.focus({ preventScroll: true });
    });
  };

  return (
    <main className="explore-app">
      <a className="skip-link" href="#explore-results">
        Skip to results
      </a>

      <ProductHeader />

      <section className="explore-hero" aria-labelledby="explore-title">
        <div className="explore-hero__copy">
          <p className="eyebrow">
            <CircleGauge aria-hidden="true" /> Behavior-first mechanic research
          </p>
          <h1 id="explore-title">
            Start with a game. Leave with a testable mechanic.
          </h1>
          <p>
            Browse familiar games, unpack one mechanic, then adapt a single rule
            into a focused playtest.
          </p>

          <form
            className="explore-search"
            onSubmit={(event) => {
              event.preventDefault();
              commitQuery(state.query);
            }}
          >
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="mechanic-search">
              Search a game, mechanic, or player behavior
            </label>
            <input
              ref={searchRef}
              id="mechanic-search"
              type="search"
              value={state.query}
              onChange={(event) =>
                dispatch({ type: 'query.changed', query: event.target.value })
              }
              placeholder="Search a game, mechanic, or player behavior"
            />
            <kbd aria-label="Keyboard shortcut: slash">/</kbd>
          </form>

          <div
            className="search-suggestions"
            id="behavior-searches"
            aria-label="Suggested searches"
          >
            <span>Try</span>
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => commitQuery(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <aside className="validation-note">
          <span>Curated beta library</span>
          <strong>Concrete examples before abstraction</strong>
          <p>
            Ten source-linked implementations show what a mechanic does before
            Forge helps you adapt it.
          </p>
          <div>
            <b>5</b> games <i /> <b>10</b> implementations <i /> <b>1</b> golden
            flow
          </div>
        </aside>
      </section>

      <section className="browse-library" aria-labelledby="browse-title">
        <div className="browse-library__heading">
          <div>
            <p>Browse the library</p>
            <h2 id="browse-title">Popular game breakdowns</h2>
          </div>
          <nav aria-label="Browse modes">
            <a href="#popular-games" aria-current="page">
              Popular games
            </a>
            <a href="#explore-results">Mechanics</a>
            <a href="#behavior-searches">Behaviors</a>
          </nav>
        </div>

        <div className="game-grid" id="popular-games">
          {GAME_COLLECTIONS.map((game) => (
            <Link
              className={
                game.slug === 'returnal'
                  ? 'game-card game-card--featured'
                  : 'game-card'
              }
              href={getGamePath(game.name)}
              key={game.slug}
            >
              <span className="game-card__mark" aria-hidden="true">
                {game.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join('')}
              </span>
              <span className="game-card__copy">
                <small>
                  {game.releaseYear} · {game.genres[0].replaceAll('-', ' ')}
                </small>
                <strong>{game.name}</strong>
                <span>{game.implementations.length} mechanic breakdowns</span>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section
        className="explore-workspace"
        aria-label="Explore mechanic references"
      >
        <div className="filter-heading">
          <div>
            <SlidersHorizontal aria-hidden="true" />
            <div>
              <strong>Refine references</strong>
              <span>Filters combine across dimensions</span>
            </div>
          </div>
          {hasActiveSearch && (
            <button type="button" onClick={() => dispatch({ type: 'reset' })}>
              Reset all
            </button>
          )}
        </div>

        <div className="filter-grid filter-grid--primary">
          {PRIMARY_FILTER_KEYS.map((key) => (
            <label key={key}>
              <span>{formatFilterLabel(key)}</span>
              <select
                value={state.filters[key]}
                onChange={(event) =>
                  dispatch({
                    type: 'filter.changed',
                    key,
                    value: event.target.value,
                  })
                }
              >
                <option value="">{FILTER_PLACEHOLDERS[key]}</option>
                {FILTER_OPTIONS[key].map((option) => (
                  <option value={option} key={option}>
                    {formatOption(option)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <details className="advanced-filters">
          <summary>More filters · {ADVANCED_FILTER_KEYS.length}</summary>
          <div className="filter-grid">
            {ADVANCED_FILTER_KEYS.map((key) => (
              <label key={key}>
                <span>{formatFilterLabel(key)}</span>
                <select
                  value={state.filters[key]}
                  onChange={(event) =>
                    dispatch({
                      type: 'filter.changed',
                      key,
                      value: event.target.value,
                    })
                  }
                >
                  <option value="">{FILTER_PLACEHOLDERS[key]}</option>
                  {FILTER_OPTIONS[key].map((option) => (
                    <option value={option} key={option}>
                      {formatOption(option)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </details>

        {activeFilterCount > 0 && (
          <div className="active-filters" aria-label="Active filters">
            <span>{activeFilterCount} active</span>
            {EXPLORE_FILTER_KEYS.filter((key) => state.filters[key]).map(
              (key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => dispatch({ type: 'filter.cleared', key })}
                  aria-label={`Remove ${formatFilterLabel(key)} filter: ${formatOption(state.filters[key])}`}
                >
                  {formatFilterLabel(key)}: {formatOption(state.filters[key])}
                  <X aria-hidden="true" />
                </button>
              ),
            )}
          </div>
        )}

        <div
          className="results-heading"
          id="explore-results"
          ref={resultsRef}
          tabIndex={-1}
        >
          <div>
            <p>Implementation references</p>
            <h2>
              {results.length} {results.length === 1 ? 'match' : 'matches'}
            </h2>
          </div>
          <span>
            Corpus order · no ranking <ChevronRight aria-hidden="true" />
          </span>
        </div>

        <p className="sr-only" aria-live="polite">
          {results.length} mechanic references found.
        </p>

        {results.length > 0 ? (
          <div className="reference-grid">
            {results.map((card) => (
              <ImplementationCard
                key={card.id}
                card={card}
                reasons={getMatchReasons(card, state)}
              />
            ))}
          </div>
        ) : (
          <output className="empty-results">
            <span aria-hidden="true">
              <Search />
            </span>
            <p>No implementation matches this combination yet.</p>
            <h2>Broaden the question, not the promise.</h2>
            <p>
              Clear the filters to return to the ten-card validation corpus. We
              do not invent a reference when the source set has no match.
            </p>
            <button type="button" onClick={() => dispatch({ type: 'reset' })}>
              Reset search and filters
            </button>
          </output>
        )}
      </section>
    </main>
  );
}
