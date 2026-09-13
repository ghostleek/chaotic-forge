import { z } from 'zod';

/** Small executable rule vocabulary, not arbitrary code or an unrestricted generator. */
export const pixelRecipeSchema = z.strictObject({
  title: z.string().trim().min(1).max(48),
  summary: z.string().trim().min(1).max(220),
  mode: z.enum(['snake', 'invaders', 'bounce']),
  wrapWalls: z.boolean(),
  shooting: z.boolean(),
  ricochet: z.boolean(),
  invaders: z.boolean(),
  growTail: z.boolean(),
  foodCount: z.number().int().min(1).max(8),
  moveTicks: z.number().int().min(6).max(18),
  fireTicks: z.number().int().min(12).max(60),
  alienStepTicks: z.number().int().min(45).max(180),
  foodPoints: z.number().int().min(1).max(25),
  alienPoints: z.number().int().min(1).max(50),
  survivalPoints: z.number().int().min(0).max(5),
  hitPenalty: z.number().int().min(0).max(100),
  palette: z.enum(['green', 'pink', 'amber']),
  interpretations: z.array(z.strictObject({
    instructionIndex: z.number().int().min(0).max(4),
    interpretation: z.string().trim().min(1).max(240),
    ruleFields: z.array(z.enum(['mode', 'wrapWalls', 'shooting', 'ricochet', 'invaders', 'growTail', 'foodCount', 'moveTicks', 'fireTicks', 'alienStepTicks', 'foodPoints', 'alienPoints', 'survivalPoints', 'hitPenalty', 'palette'])).min(1).max(15),
  })).min(2).max(5),
});
export type PixelRecipe = z.infer<typeof pixelRecipeSchema>;
