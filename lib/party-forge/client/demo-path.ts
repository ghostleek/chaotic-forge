import type { AdditionCard, InitialCard, RoomSnapshot } from '../contracts.ts';

/** User decision: one authored demo recipe, not a permutation explorer. */
export const INITIAL_PATH: readonly InitialCard[] = [
  { slot: 'fps', cardId: 'knockback' },
  { slot: 'zombies', cardId: 'pursuers' },
  { slot: 'cooking', cardId: 'quick-orders' },
];
export function nextAddition(room: RoomSnapshot): AdditionCard | null {
  const used = new Set([
    ...room.contributions.flatMap((c) =>
      c.kind === 'addition' ? [c.cardId] : [],
    ),
    ...room.editSlots.flatMap((s) =>
      s.resolution.status === 'chosen' ? [s.resolution.cardId] : [],
    ),
  ]);
  return (
    (['dinner-bell', 'hot-potato', 'zombie-pantry'] as const).find(
      (id) => !used.has(id),
    ) ?? null
  );
}
