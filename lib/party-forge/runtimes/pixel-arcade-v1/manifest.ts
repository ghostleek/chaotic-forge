import { PROTOCOL_VERSION, buildManifestSchema, contributionHistorySchema, isPixelHistory, type BuildManifest, type RuntimeInput } from '../../contracts.ts';
import { pixelRecipeSchema } from './rules.ts';
import { createPixelRuntime } from './retained/engine.js';
import { canonicalJson, freezeJson, hashValue } from '../kitchen-chaos-v1/integrity.ts';
export const PIXEL_RUNTIME_RESOURCE = { key: 'party-forge/pixel-arcade-v1/engine.js', version: 'pixel-arcade-v1', hash: 'sha256:7a9647bd86ce0eca906b46884dddd57d525bd273cf0669aa9d704dfb88d52a6e', mediaType: 'text/javascript' as const };
const LIMITATIONS = [
  'AI interprets your instruction cards into a bounded set of pixel rules. Supported movement: Snake, Invaders and bouncing platforms. This is rule generation, not arbitrary new game code.',
  'The retained engine and generated rules execute together. Rule mappings are model interpretations; review them before Ready. Bounded replay is not independent proof that every natural-language request is fulfilled.',
  'Three concurrent separate arenas, one shared seed and start. Original instructions, model provenance, exact rules and runtime version are retained.',
];
const frames: RuntimeInput[] = Array.from({length:3600}, (_,tick)=>({tick,buttons:0,yaw:0,pitch:0}));
export async function createInstructionBuild(value: unknown, parent: BuildManifest['parent'], recipeValue: unknown, origin: BuildManifest['origin']): Promise<BuildManifest> {
  const contributions = contributionHistorySchema.parse(value);
  const recipe = pixelRecipeSchema.parse(recipeValue);
  if (!isPixelHistory(contributions) || origin.kind !== 'generated') throw new Error('A generated instruction recipe is required');
  if (recipe.interpretations.length !== contributions.length || new Set(recipe.interpretations.map(i=>i.instructionIndex)).size !== contributions.length || recipe.interpretations.some(i=>i.instructionIndex >= contributions.length)) throw new Error('Each instruction needs its own rule interpretation');
  if (recipe.ricochet && !recipe.shooting) throw new Error('Bouncing shots require shooting');
  if (recipe.growTail && recipe.mode !== 'snake') throw new Error('A growing tail requires Snake movement');
  for (const entry of recipe.interpretations) {
    if (new Set(entry.ruleFields).size !== entry.ruleFields.length || entry.ruleFields.some(field =>
      (['fireTicks','ricochet'].includes(field) && !recipe.shooting) ||
      (['alienStepTicks','alienPoints'].includes(field) && !recipe.invaders) ||
      (field === 'growTail' && recipe.mode !== 'snake'))) throw new Error('An instruction was mapped to an inactive rule. Revise the cards.');
  }
  const traceHash = await hashValue({seed:73,frames});
  const payload = {
    protocolVersion: PROTOCOL_VERSION, parent, catalogVersion: 'pixel-arcade/1' as const, resolverVersion: 'pixel-instructions-resolver-v1', origin,
    runtime: PIXEL_RUNTIME_RESOURCE, assets: [], contributions, pixelRules: recipe,
    effects: contributions.map((c,index) => {
      const interpretation = recipe.interpretations.find(i=>i.instructionIndex===index)!;
      const parameters = Object.fromEntries(interpretation.ruleFields.flatMap(field => typeof recipe[field] === 'number' ? [[field,recipe[field] as number]] : typeof recipe[field] === 'boolean' ? [[field,Number(recipe[field])]] : []));
      return {contributionId:c.id,ruleId:`instruction-${index}`,parameters,explanation:interpretation.interpretation};
    }),
    objective: recipe.summary, controls: 'direction-pad/1' as const, scoringVersion: 'points-then-hits/1' as const, adaptation:'off' as const,
    validation:{status:'bounded-rules' as const,validatorVersion:'pixel-rules-validator-v1',completingTraceHash:traceHash,witnesses:contributions.map(c=>({contributionId:c.id,traceHash})),limitations:contributions.filter(c=>c.kind==='initial').length === 2 ? LIMITATIONS.map(note=>note.replace('Three concurrent separate arenas', 'Two or three concurrent separate arenas')) : LIMITATIONS},
  };
  const contentHash = await hashValue(payload);
  const build = buildManifestSchema.parse({...payload,contentHash,buildId:`px-${contentHash.slice(7)}`});
  const run = createPixelRuntime(build,73);
  for (const frame of frames) {run.input(frame);run.step();}
  if (!run.isComplete() || !Number.isFinite(run.snapshot().points)) throw new Error('Generated rules failed bounded execution');
  return freezeJson(build);
}
export async function loadPixelBuild(value: unknown): Promise<{build:BuildManifest}> {
  const build = buildManifestSchema.parse(value);
  const expected = await createInstructionBuild(build.contributions,build.parent,build.pixelRules,build.origin);
  if (canonicalJson(expected)!==canonicalJson(build)) throw new Error('Retained pixel rules or executable identity changed');
  return {build:freezeJson(build)};
}
