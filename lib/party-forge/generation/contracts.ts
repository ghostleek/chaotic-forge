import { z } from 'zod';
export const CONCEPTS = [
  {
    id: 'snake',
    title: 'Growing trail',
    source: 'Snake',
    rule: 'Collect energy to grow a trail; avoid self-collision.',
  },
  {
    id: 'invaders',
    title: 'Descending fleet',
    source: 'Space Invaders-style gameplay',
    rule: 'Shoot a descending enemy fleet and dodge its projectiles.',
  },
  {
    id: 'shield',
    title: 'One-hit shield',
    source: 'Forge concept',
    rule: 'A collectible shield absorbs exactly one hit.',
  },
  {
    id: 'dash',
    title: 'Short dash',
    source: 'Forge concept',
    rule: 'A cooldown-limited dash changes movement and must have visible feedback.',
  },
] as const;
export const selectionSchema = z
  .strictObject({
    requestKey: z.uuid(),
    cards: z
      .array(z.enum(['snake', 'invaders', 'shield', 'dash']))
      .min(2)
      .max(4),
    parent: z.uuid().optional(),
  })
  .refine(
    (v) => new Set(v.cards).size === v.cards.length,
    'Duplicate concepts',
  );
export type Job = {
  id: string;
  owner: string;
  request_key: string;
  digest: string;
  cards: string;
  parent: string | null;
  status: string;
  created: number;
  updated: number;
  lease: string | null;
  lease_until: number | null;
  session_id: string | null;
  turn_id: string | null;
  artifact_hash: string | null;
  evidence: string | null;
  model: string | null;
  error: string | null;
  billing?: string;
  key_ciphertext?: string | null;
};
export const activeStates = [
  'queued',
  'dispatching',
  'building',
  'validating',
  'canceling',
  'recovery',
];
export const MAX_ARTIFACT_BYTES = 180_000;
export const NO_CACHE = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
