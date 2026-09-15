import type { BuildManifest } from './contracts.ts';
import { normalizeInstruction } from './instruction-policy.ts';

/** Map every card to a saved reference; extra words must never be silently dropped. */
export function snakeInvadersDemoOrder(contributions: Readonly<BuildManifest['contributions']>): (0 | 1)[] | null {
  if (contributions.length < 2 || contributions.length > 3 || contributions.some(c => c.kind !== 'initial' || c.choice.slot !== 'instruction')) return null;
  const titles = contributions.map(c => c.kind === 'initial' && c.choice.slot === 'instruction' ? normalizeInstruction(c.choice.text) : '');
  const order = titles.map(title => /^snakes?$/.test(title) ? 0 : /^space invaders?$/.test(title) ? 1 : -1);
  return order.includes(0) && order.includes(1) && !order.includes(-1) ? order as (0 | 1)[] : null;
}
