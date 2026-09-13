import type { BuildManifest } from '../contracts.ts';
import { snakeInvadersDemoOrder } from '../demo-match.ts';
import { createInstructionBuild, PIXEL_RUNTIME_RESOURCE } from '../runtimes/pixel-arcade-v1/manifest.ts';
import { cachedSnakeInvaders } from './cached-snake-invaders.ts';

/** Rebind the verified model output to this room's actual cards without a model call. */
export async function cachedInstructionDemo(contributions: BuildManifest['contributions']): Promise<BuildManifest | null> {
  const order = snakeInvadersDemoOrder(contributions);
  if (!order) return null;
  const retained = cachedSnakeInvaders;
  if (retained.runtime.hash !== PIXEL_RUNTIME_RESOURCE.hash) throw new Error('Cached demo runtime no longer matches its retained executable');
  const recipe = {
    ...retained.pixelRules,
    interpretations: retained.pixelRules.interpretations.map(entry => ({...entry, instructionIndex: order[entry.instructionIndex]})),
  };
  return createInstructionBuild(contributions, null, recipe, {
    ...retained.origin,
    reuse: {kind:'cached-demo',version:'snake-invaders-v1',sourceBuildId:retained.buildId,sourceBuildHash:retained.contentHash},
  });
}
