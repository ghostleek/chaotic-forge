'use client';

import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  GitCompareArrows,
  Hammer,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useReducer, useRef } from 'react';

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
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open source for ${card.implementationName}: ${source.title}`}
        >
          View source <ArrowUpRight aria-hidden="true" />
        </a>
      </footer>
    </article>
  );
}

export function ExploreShell() {
  const [state, dispatch] = useReducer(exploreReducer, INITIAL_EXPLORE_STATE);
  const searchRef = useRef<HTMLInputElement>(null);
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

  return (
    <main className="explore-app">
      <a className="skip-link" href="#explore-results">
        Skip to results
      </a>

      <header className="explore-header">
        <Link
          className="explore-brand"
          href="/"
          aria-label="Mechanic Forge home"
        >
          <span aria-hidden="true">
            <Hammer />
          </span>
          <strong>Mechanic Forge</strong>
          <em>ALPHA</em>
        </Link>

        <nav aria-label="Primary navigation">
          <a href="#explore-results" aria-current="page">
            <BookOpen aria-hidden="true" /> Explore
          </a>
          <span aria-disabled="true">
            <GitCompareArrows aria-hidden="true" /> Compare
            <small>Next</small>
          </span>
          <span aria-disabled="true">
            <Hammer aria-hidden="true" /> Forge
            <small>Later</small>
          </span>
        </nav>

        <div className="corpus-status">
          <i aria-hidden="true" /> 10 sourced examples
        </div>
      </header>

      <section className="explore-hero" aria-labelledby="explore-title">
        <div className="explore-hero__copy">
          <p className="eyebrow">
            <CircleGauge aria-hidden="true" /> Behavior-first mechanic research
          </p>
          <h1 id="explore-title">Start with the behavior you want.</h1>
          <p>
            Find sourced combat and mobility patterns, see how real games
            implement them, and understand the trade-offs before you build.
          </p>

          <div className="explore-search">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="mechanic-search">
              Search mechanics, desired behavior, or reference game
            </label>
            <input
              ref={searchRef}
              id="mechanic-search"
              type="search"
              value={state.query}
              onChange={(event) =>
                dispatch({ type: 'query.changed', query: event.target.value })
              }
              placeholder="Try “reward aggression without more damage”"
            />
            <kbd aria-label="Keyboard shortcut: slash">/</kbd>
          </div>

          <div className="search-suggestions" aria-label="Suggested searches">
            <span>Try</span>
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() =>
                  dispatch({ type: 'suggestion.chosen', query: suggestion })
                }
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <aside className="validation-note">
          <span>Stage 0 validation corpus</span>
          <strong>Evidence before inventory</strong>
          <p>
            This deliberately narrow set tests whether designers can find a
            useful action-game reference faster than starting from a blank
            graph.
          </p>
          <div>
            <b>5</b> games <i /> <b>10</b> implementations <i /> <b>9</b>{' '}
            filters
          </div>
        </aside>
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

        <div className="filter-grid">
          {EXPLORE_FILTER_KEYS.map((key) => (
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

        <div className="results-heading" id="explore-results">
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
