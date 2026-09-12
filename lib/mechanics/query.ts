import {
  COMPARISON_DIMENSIONS,
  COMPARISON_LABELS,
  type ClaimOrigin,
  type ComparisonDimension,
  type MechanicFilters,
  type MechanicImplementationCard,
} from './schema.ts';

const normalize = (value: string) => value.toLocaleLowerCase().trim();

const hasAny = (values: readonly string[], requested?: readonly string[]) =>
  !requested?.length ||
  requested.some((item) => values.map(normalize).includes(normalize(item)));

const hasEvery = (values: readonly string[], requested?: readonly string[]) =>
  !requested?.length ||
  requested.every((item) => values.map(normalize).includes(normalize(item)));

function matchesFilters(
  card: MechanicImplementationCard,
  filters: MechanicFilters,
) {
  return (
    hasAny(card.discovery.behaviors, filters.behaviors) &&
    hasAny(card.discovery.systemFamilies, filters.systemFamilies) &&
    hasAny(card.discovery.genres, filters.genres) &&
    hasAny(card.discovery.platforms, filters.platforms) &&
    (!filters.timescales?.length ||
      filters.timescales.includes(card.discovery.timescale)) &&
    (!filters.contexts?.length ||
      filters.contexts.includes(card.discovery.context)) &&
    (!filters.complexities?.length ||
      filters.complexities.includes(card.discovery.complexity)) &&
    hasEvery(card.discovery.dependencies, filters.dependencies) &&
    hasAny(card.discovery.risks, filters.risks)
  );
}

function searchableText(card: MechanicImplementationCard) {
  return [
    card.patternName,
    card.implementationName,
    card.game.name,
    card.summary.text,
    ...card.discovery.behaviors,
    ...card.discovery.systemFamilies,
    ...card.discovery.genres,
    ...card.discovery.dependencies,
    ...card.discovery.risks,
    ...card.matchTerms,
  ]
    .map(normalize)
    .join(' ');
}

export function searchMechanicCards(
  cards: readonly MechanicImplementationCard[],
  query = '',
  filters: MechanicFilters = {},
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return cards.filter((card) => {
    const haystack = searchableText(card);
    return (
      terms.every((term) => haystack.includes(term)) &&
      matchesFilters(card, filters)
    );
  });
}

export type ComparisonRow = {
  dimension: ComparisonDimension;
  label: string;
  values: Array<{
    cardId: string;
    score: 1 | 2 | 3;
    label: string;
    note: string;
    origin: ClaimOrigin;
    sourceIds: string[];
  }>;
};

export function buildComparisonRows(
  cards: readonly MechanicImplementationCard[],
): ComparisonRow[] {
  if (cards.length < 2 || cards.length > 4) {
    throw new RangeError(
      'Compare requires between two and four implementation cards.',
    );
  }

  return COMPARISON_DIMENSIONS.map((dimension) => ({
    dimension,
    label: COMPARISON_LABELS[dimension],
    values: cards.map((card) => ({
      cardId: card.id,
      score: card.comparison[dimension].score,
      label: card.comparison[dimension].label,
      note: card.comparison[dimension].note.text,
      origin: card.comparison[dimension].note.origin,
      sourceIds: [...card.comparison[dimension].note.sourceIds],
    })),
  }));
}
