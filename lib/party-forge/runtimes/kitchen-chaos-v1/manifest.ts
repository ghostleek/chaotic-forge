import { PROTOCOL_VERSION, type BuildManifest } from '../../contracts.ts';
import { CARDS, CATALOG_VERSION, PRESET_VERSION, RESOLVER_VERSION, cardIdFor, recipeFromContributions, type Contribution } from '../../cards.ts';
import { RULES, RUNTIME_VERSION } from './retained/engine.js';
import { freezeJson } from './integrity.ts';

export const VALIDATOR_VERSION = 'kitchen-chaos-validator-v1';
export const RUNTIME_RESOURCE = freezeJson({
  key: 'party-forge/kitchen-chaos-v1/engine.js', version: RUNTIME_VERSION,
  hash: 'sha256:94e56fdaa6a5cf1232a1e112e177e52ac4200f19f22f32ba58fe632e41942a31',
  mediaType: 'text/javascript' as const,
});
export const QUALIFICATION_LIMITATIONS = freezeJson([
  'Authored preset gameplay; no live model call or arbitrary generated gameplay.',
  'Automated local bounded input witnesses cover tested scenarios, not observed external playtests or universal correctness.',
  'Three desktop players use separate matched 60-second trials. This engine supplies no room transport, rendering or durable hosted archive.',
]);

function parametersFor(contribution: Contribution): Record<string, number> {
  switch (cardIdFor(contribution)) {
    case 'knockback': return { shotRange: RULES.shotRange, shotDamage: RULES.shotDamage,
      shotCooldownTicks: RULES.shotCooldownTicks, pushDistance: RULES.knockbackDistance, stunTicks: RULES.knockbackStunTicks };
    case 'counter-ricochet': return { shotRange: RULES.shotRange, shotDamage: RULES.shotDamage,
      shotCooldownTicks: RULES.shotCooldownTicks, maxBounces: RULES.maxShotBounces,
      pushDistance: RULES.ricochetPushDistance, stunTicks: RULES.ricochetStunTicks };
    case 'pursuers':
    case 'noise-seekers': return { speed: RULES.zombieSpeed, health: RULES.zombieHealth, firstSpawnTick: RULES.firstSpawnTick,
      spawnIntervalTicks: RULES.spawnIntervalTicks, maxZombies: RULES.maxZombies,
      contactCooldownTicks: RULES.contactCooldownTicks, contactSlowTicks: RULES.contactSlowTicks };
    case 'quick-orders': return { portions: RULES.quickOrderPortions, cookTicks: RULES.quickCookTicks, burnAfterReadyTicks: RULES.burnAfterReadyTicks };
    case 'batch-orders': return { portions: RULES.batchOrderPortions, cookTicks: RULES.batchCookTicks, burnAfterReadyTicks: RULES.burnAfterReadyTicks };
    case 'dinner-bell': return { attractionTicks: RULES.dinnerBellTicks, radius: RULES.dinnerBellRadius, stackCap: RULES.additionStackCap };
    case 'hot-potato': return { carryTicks: RULES.hotPotatoCarryTicks, stackCap: RULES.additionStackCap };
    case 'zombie-pantry': return { pickupCap: RULES.pantryPickupCap, worldDropCap: RULES.pantryWorldDropCap,
      dropLifetimeTicks: RULES.pantryDropLifetimeTicks, pickupReach: RULES.pantryPickupReach, stackCap: RULES.additionStackCap };
  }
}

export function buildDescriptor(contributions: Contribution[], parent: BuildManifest['parent']): Omit<BuildManifest, 'buildId' | 'contentHash' | 'validation'> {
  const recipe = recipeFromContributions(contributions);
  const portions = recipe.cooking === 'quick-orders' ? RULES.quickOrderPortions : RULES.batchOrderPortions;
  return {
    protocolVersion: PROTOCOL_VERSION, parent, catalogVersion: CATALOG_VERSION, resolverVersion: RESOLVER_VERSION,
    origin: { kind: 'preset', presetVersion: PRESET_VERSION }, runtime: { ...RUNTIME_RESOURCE }, assets: [],
    contributions,
    effects: contributions.map(contribution => ({ contributionId: contribution.id, ruleId: cardIdFor(contribution),
      parameters: parametersFor(contribution), explanation: CARDS[cardIdFor(contribution)].interpretation })),
    objective: `In 60 seconds, prepare and cook ${portions} portion${portions === 1 ? '' : 's'} per order, then deliver the cooked dish. Rank by most valid delivered orders, then fewest spoiled or burned orders.${recipe.additions.includes('hot-potato') ? ' Deliver carried dishes within 10 seconds before they spoil.' : ''} Zombie contact spoils a carried dish.`,
    controls: 'desktop-keyboard-mouse/1', scoringVersion: 'orders-then-failures/1', adaptation: 'off',
  };
}
