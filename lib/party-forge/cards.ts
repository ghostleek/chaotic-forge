import { contributionHistorySchema, type BuildManifest, type AdditionCard } from './contracts.ts';
import type { KitchenRecipe } from './runtimes/kitchen-chaos-v1/engine.ts';
import { freezeJson } from './runtimes/kitchen-chaos-v1/integrity.ts';

export const CATALOG_VERSION = 'kitchen-chaos/1';
export const RESOLVER_VERSION = 'kitchen-chaos-resolver-v1';
export const PRESET_VERSION = 'kitchen-chaos-presets-v1';
export type Contribution = BuildManifest['contributions'][number];

/** Source is the authored demo deck; interpretation is executable behavior, not model output. */
export const CARDS = freezeJson({
  knockback: { slot: 'fps', title: 'Knockback', interpretation: 'Aimed shots repel the nearest visible zombie and push it away.' },
  'counter-ricochet': { slot: 'fps', title: 'Counter ricochet', interpretation: 'Aimed shots can reflect once from the marked counter to hit a zombie.' },
  pursuers: { slot: 'zombies', title: 'Pursuers', interpretation: 'Zombies pursue the player and interrupt nearby cooking through contact.' },
  'noise-seekers': { slot: 'zombies', title: 'Noise seekers', interpretation: 'Zombies approach an active cooking station; otherwise they pursue the player.' },
  'quick-orders': { slot: 'cooking', title: 'Quick orders', interpretation: 'Prepare, cook, collect and deliver one portion per valid order.' },
  'batch-orders': { slot: 'cooking', title: 'Batch orders', interpretation: 'Prepare two portions before cooking and deliver the batch as one valid order.' },
  'dinner-bell': { slot: 'addition', title: 'Dinner bell', interpretation: 'A delivery draws nearby zombies toward the delivery station for a bounded time.' },
  'hot-potato': { slot: 'addition', title: 'Hot potato', interpretation: 'A carried cooked dish spoils after its fixed carry deadline, failing that order.' },
  'zombie-pantry': { slot: 'addition', title: 'Zombie pantry', interpretation: 'A repelled zombie drops a raw ingredient, subject to ground and pickup caps.' },
} as const);

export function recipeFromContributions(value: unknown): KitchenRecipe {
  const contributions = contributionHistorySchema.parse(value);
  const initial = contributions.filter(c => c.kind === 'initial');
  // The shared schema establishes exactly one of each slot before this projection.
  return {
    fps: initial.find(c => c.choice.slot === 'fps')!.choice.cardId as KitchenRecipe['fps'],
    zombies: initial.find(c => c.choice.slot === 'zombies')!.choice.cardId as KitchenRecipe['zombies'],
    cooking: initial.find(c => c.choice.slot === 'cooking')!.choice.cardId as KitchenRecipe['cooking'],
    additions: contributions.filter(c => c.kind === 'addition').map(c => c.cardId),
  };
}

export function additionOptions(value: unknown): { cards: AdditionCard[]; pass: boolean; reason: string | null } {
  const recipe = recipeFromContributions(value);
  const cards = (['dinner-bell', 'hot-potato', 'zombie-pantry'] as AdditionCard[])
    .filter(card => !recipe.additions.includes(card));
  return { cards, pass: cards.length === 0, reason: cards.length ? null : 'All three additions are already present. Pass keeps every existing rule.' };
}

export function cardIdFor(contribution: Contribution): keyof typeof CARDS {
  return contribution.kind === 'initial' ? contribution.choice.cardId : contribution.cardId;
}
