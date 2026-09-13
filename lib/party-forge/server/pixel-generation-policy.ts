import { z } from 'zod';
import { pixelRecipeSchema } from '../runtimes/pixel-arcade-v1/rules.ts';

export const PIXEL_OUTPUT_TOKENS = 6000;
export const PIXEL_GENERATION_POLICY = 'pixel-output-v2';
export const MESH_GENERATION_POLICY = 'pixel-mesh-v3';
export const LEGACY_OUTPUT_FAILURE = 'Generation did not finish within the output limit.';
export const outputSchema = z.strictObject({
  supported: z.boolean(),
  reason: z.string().max(500),
  recipe: pixelRecipeSchema.nullable(),
});

export function generationFailureReason(data: {status?: string; incomplete_details?: {reason?: string} | null}) {
  if (data.status === 'completed') return null;
  if (data.status === 'incomplete' && data.incomplete_details?.reason === 'max_output_tokens')
    return 'The model reached its response budget before finishing. Your cards are saved; simplify the instructions and try again.';
  if (data.status === 'incomplete' && data.incomplete_details?.reason === 'content_filter')
    return 'The generation service could not complete these instructions. Your cards are saved; revise them to try again.';
  return 'The generation service did not complete a result. Your cards are saved.';
}

/** Recover only the old known terminal failure; never duplicate completed or uncertain jobs. */
export function shouldRecoverLegacyOutputFailure(stored: {status:string; result:string|null} | null) {
  if (stored?.status !== 'failed' || !stored.result) return false;
  try { return JSON.parse(stored.result).reason === LEGACY_OUTPUT_FAILURE; }
  catch { return false; }
}

/** Retry the known misinterpretation once under the corrected meshing policy. */
export function shouldRecoverReferenceConflict(stored: {status:string; result:string|null} | null) {
  if (stored?.status !== 'failed' || !stored.result) return false;
  try {
    const reason=JSON.parse(stored.result).reason;
    return typeof reason === 'string' && /snake/i.test(reason) && /invaders/i.test(reason) &&
      /movement|control/i.test(reason) && /conflict|incompatib|cannot.*both/i.test(reason);
  } catch { return false; }
}
