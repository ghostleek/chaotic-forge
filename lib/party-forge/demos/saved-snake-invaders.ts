import { cachedInstructionDemo } from '../server/cached-instruction-demo.ts';
import { cachedSnakeInvaders } from '../server/cached-snake-invaders.ts';

/** Presentation cards for the retained recipe, not records of newly joined players. */
export async function savedSnakeInvadersBuild() {
  const cards = ['Snake', 'Space Invaders'].map((text, ordinal) => ({
    id: `saved-demo-card-${ordinal}`,
    participantId: `saved-demo-source-${ordinal}`,
    ordinal,
    kind: 'initial' as const,
    choice: {
      slot: 'instruction' as const,
      cardId: 'instruction' as const,
      text,
    },
    provenance: {
      source: { kind: 'user-concept' as const, reference: text },
      forgeInterpretation:
        cachedSnakeInvaders.pixelRules.interpretations[ordinal].interpretation,
      userDecision: {
        participantId: `saved-demo-source-${ordinal}`,
        decisionId: `saved-demo-presentation-${ordinal}`,
      },
    },
  }));
  const build = await cachedInstructionDemo(cards);
  if (!build)
    throw new Error('The retained Snake/Invaders demo is unavailable');
  return build;
}
