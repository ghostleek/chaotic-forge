import type { BuildManifest } from './contracts.ts';

/** Exact reference pair only: extra instructions must never be silently dropped. */
export function snakeInvadersDemoOrder(contributions: Readonly<BuildManifest['contributions']>): [number, number] | null {
  if (contributions.length !== 2 || contributions.some(c => c.kind !== 'initial' || c.choice.slot !== 'instruction')) return null;
  const titles = contributions.map(c => c.kind === 'initial' && c.choice.slot === 'instruction' ? c.choice.text.trim().toLowerCase().replace(/\s+/g, ' ') : '');
  const snake = titles.indexOf('snake');
  const invaders = titles.indexOf('space invaders');
  return snake >= 0 && invaders >= 0 ? [snake, invaders] : null;
}
