import type { MechanicImplementationCard } from './schema.ts';

export type GameCollection = {
  slug: string;
  name: string;
  releaseYear: number;
  genres: string[];
  platforms: string[];
  implementations: MechanicImplementationCard[];
};

export function slugifyGameName(name: string) {
  return name
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function buildGameCollections(
  cards: readonly MechanicImplementationCard[],
): GameCollection[] {
  const games = new Map<string, GameCollection>();

  for (const card of cards) {
    const slug = slugifyGameName(card.game.name);
    const existing = games.get(slug);

    if (existing) {
      existing.implementations.push(card);
      existing.genres = [...new Set([...existing.genres, ...card.game.genres])];
      existing.platforms = [
        ...new Set([...existing.platforms, ...card.game.platforms]),
      ];
      continue;
    }

    games.set(slug, {
      slug,
      name: card.game.name,
      releaseYear: card.game.releaseYear,
      genres: [...card.game.genres],
      platforms: [...card.game.platforms],
      implementations: [card],
    });
  }

  return [...games.values()];
}

export function findGameCollection(
  cards: readonly MechanicImplementationCard[],
  slug: string,
) {
  return buildGameCollections(cards).find((game) => game.slug === slug);
}

export function findMechanicImplementation(
  cards: readonly MechanicImplementationCard[],
  id: string,
) {
  return cards.find((card) => card.id === id);
}

export function getGamePath(gameName: string) {
  return `/games/${slugifyGameName(gameName)}`;
}

export function getMechanicPath(id: string) {
  return `/mechanics/${encodeURIComponent(id)}`;
}
