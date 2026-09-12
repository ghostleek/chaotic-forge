import { searchMechanicCards } from './query.ts';
import type {
  ComplexityLevel,
  LoopTimescale,
  MechanicFilters,
  MechanicImplementationCard,
  PlayContext,
  SystemFamily,
} from './schema.ts';

export const EXPLORE_FILTER_KEYS = [
  'behavior',
  'systemFamily',
  'genre',
  'platform',
  'timescale',
  'context',
  'complexity',
  'dependency',
  'risk',
] as const;

export type ExploreFilterKey = (typeof EXPLORE_FILTER_KEYS)[number];

export type ExploreState = {
  query: string;
  filters: Record<ExploreFilterKey, string>;
};

export type ExploreAction =
  | { type: 'query.changed'; query: string }
  | { type: 'suggestion.chosen'; query: string }
  | { type: 'filter.changed'; key: ExploreFilterKey; value: string }
  | { type: 'filter.cleared'; key: ExploreFilterKey }
  | { type: 'reset' };

const EMPTY_FILTERS: Record<ExploreFilterKey, string> = {
  behavior: '',
  systemFamily: '',
  genre: '',
  platform: '',
  timescale: '',
  context: '',
  complexity: '',
  dependency: '',
  risk: '',
};

export const INITIAL_EXPLORE_STATE: ExploreState = {
  query: '',
  filters: EMPTY_FILTERS,
};

export function exploreReducer(
  state: ExploreState,
  action: ExploreAction,
): ExploreState {
  switch (action.type) {
    case 'query.changed':
    case 'suggestion.chosen':
      return { ...state, query: action.query };
    case 'filter.changed':
      return {
        ...state,
        filters: { ...state.filters, [action.key]: action.value },
      };
    case 'filter.cleared':
      return { ...state, filters: { ...state.filters, [action.key]: '' } };
    case 'reset':
      return {
        query: '',
        filters: { ...EMPTY_FILTERS },
      };
  }
}

export function toMechanicFilters(state: ExploreState): MechanicFilters {
  const { filters } = state;
  return {
    behaviors: filters.behavior ? [filters.behavior] : undefined,
    systemFamilies: filters.systemFamily
      ? [filters.systemFamily as SystemFamily]
      : undefined,
    genres: filters.genre ? [filters.genre] : undefined,
    platforms: filters.platform ? [filters.platform] : undefined,
    timescales: filters.timescale
      ? [filters.timescale as LoopTimescale]
      : undefined,
    contexts: filters.context ? [filters.context as PlayContext] : undefined,
    complexities: filters.complexity
      ? [filters.complexity as ComplexityLevel]
      : undefined,
    dependencies: filters.dependency ? [filters.dependency] : undefined,
    risks: filters.risk ? [filters.risk] : undefined,
  };
}

export function getExploreResults(
  cards: readonly MechanicImplementationCard[],
  state: ExploreState,
) {
  return searchMechanicCards(cards, state.query, toMechanicFilters(state));
}

export function getActiveFilterCount(state: ExploreState) {
  return EXPLORE_FILTER_KEYS.filter((key) => state.filters[key]).length;
}

export function buildFilterOptions(
  cards: readonly MechanicImplementationCard[],
): Record<ExploreFilterKey, string[]> {
  const unique = (values: string[]) => [...new Set(values)].sort();

  return {
    behavior: unique(cards.flatMap((card) => card.discovery.behaviors)),
    systemFamily: unique(
      cards.flatMap((card) => card.discovery.systemFamilies),
    ),
    genre: unique(cards.flatMap((card) => card.discovery.genres)),
    platform: unique(cards.flatMap((card) => card.discovery.platforms)),
    timescale: unique(cards.map((card) => card.discovery.timescale)),
    context: unique(cards.map((card) => card.discovery.context)),
    complexity: unique(cards.map((card) => card.discovery.complexity)),
    dependency: unique(cards.flatMap((card) => card.discovery.dependencies)),
    risk: unique(cards.flatMap((card) => card.discovery.risks)),
  };
}

const normalize = (value: string) => value.toLocaleLowerCase().trim();

export function getMatchReasons(
  card: MechanicImplementationCard,
  state: ExploreState,
) {
  const fields = [
    { label: 'Behavior', values: card.discovery.behaviors },
    { label: 'Pattern', values: [card.patternName, card.implementationName] },
    { label: 'Game', values: [card.game.name] },
    { label: 'Summary', values: [card.summary.text] },
    { label: 'System', values: card.discovery.systemFamilies },
    { label: 'Genre', values: card.discovery.genres },
    { label: 'Dependency', values: card.discovery.dependencies },
    { label: 'Risk', values: card.discovery.risks },
    { label: 'Related term', values: card.matchTerms },
  ];
  const terms = normalize(state.query).split(/\s+/).filter(Boolean);
  const reasons: string[] = [];

  for (const term of terms) {
    const field = fields.find((candidate) =>
      candidate.values.some((value) => normalize(value).includes(term)),
    );
    const value = field?.values.find((candidate) =>
      normalize(candidate).includes(term),
    );
    if (field && value) {
      const detail =
        field.label === 'Summary' ? `includes “${term}”` : formatOption(value);
      reasons.push(`${field.label}: ${detail}`);
    }
  }

  for (const key of EXPLORE_FILTER_KEYS) {
    if (state.filters[key]) {
      reasons.push(
        `${formatFilterLabel(key)}: ${formatOption(state.filters[key])}`,
      );
    }
  }

  return reasons.length > 0
    ? [...new Set(reasons)].slice(0, 3)
    : ['Curated validation example'];
}

export function formatOption(value: string) {
  return value
    .split(/[-\s]+/)
    .map((word) => {
      if (['ai', 'pc', 'pve', 'pvp', 'rpg'].includes(normalize(word))) {
        return word.toLocaleUpperCase();
      }
      return word.charAt(0).toLocaleUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function formatFilterLabel(key: ExploreFilterKey) {
  const labels: Record<ExploreFilterKey, string> = {
    behavior: 'Behavior',
    systemFamily: 'System family',
    genre: 'Genre',
    platform: 'Platform',
    timescale: 'Loop timescale',
    context: 'Play context',
    complexity: 'Complexity',
    dependency: 'Dependency',
    risk: 'Risk',
  };
  return labels[key];
}

export type ExploreShortcut = 'focus-search' | 'clear-query' | 'none';

export function getExploreShortcut(input: {
  key: string;
  hasModifier: boolean;
  targetIsEditable: boolean;
  searchIsFocused: boolean;
  hasQuery: boolean;
}): ExploreShortcut {
  if (input.key === '/' && !input.hasModifier && !input.targetIsEditable) {
    return 'focus-search';
  }
  if (input.key === 'Escape' && input.searchIsFocused && input.hasQuery) {
    return 'clear-query';
  }
  return 'none';
}
