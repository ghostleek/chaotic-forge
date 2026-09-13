import { buildManifestSchema, contributionHistorySchema, type BuildManifest } from '../../contracts.ts';
import { canonicalJson, freezeJson, hashValue } from '../kitchen-chaos-v1/integrity.ts';
import { createDinoRuntime } from './retained/engine.js';
export const DINO_RESOURCE = { key: 'party-forge/dino-runner-v2/engine.js', version: 'dino-runner-v2', hash: 'sha256:1533ff151167d1599c3bda04b69fa10b470b761041a0487cdc3c77a2dcedc72e', mediaType: 'text/javascript' as const };
const normalize = (s: string) => s.trim().toLowerCase().replace(/[.!]+$/g, '');
const dino = new Set(['chrome offline dino run', 'chrome dino', 'google dino', 'dino']);
const mario = new Set(['mario', 'super mario']);
const additions = {
  'double stomp points': { field: 'stompBonus', value: 100, explanation: 'Stomping a walker now awards 200 points instead of 100.' },
  'double meat points': { field: 'meatBonus', value: 50, explanation: 'Eating meat now awards 100 points instead of 50; growth and extra life remain.' },
  'finish bonus': { field: 'finishBonus', value: 250, explanation: 'Finishing the course awards an additional 250 points.' },
} as const;
export async function createDinoBuild(value: unknown, parent: BuildManifest['parent'] = null): Promise<BuildManifest | null> {
  const contributions = contributionHistorySchema.parse(value);
  const initial = contributions.filter(c => c.kind === 'initial');
  const texts = initial.map(c => c.kind === 'initial' && c.choice.slot === 'instruction' ? normalize(c.choice.text) : '');
  if (!texts.some(t=>dino.has(t)) || !texts.some(t=>mario.has(t)) || texts.some(t=>!dino.has(t)&&!mario.has(t))) return null;
  const rules = {stompBonus: 0, meatBonus: 0, finishBonus: 0};
  const effects: BuildManifest['effects'] = [];
  for (const c of contributions) {
    if (c.kind === 'initial') {
      const text = c.choice.slot === 'instruction' ? normalize(c.choice.text) : '';
      effects.push({contributionId: c.id, ruleId: `${dino.has(text) ? 'runner-jump' : 'stomp-grow'}-${c.ordinal}`, parameters: dino.has(text) ? {startingLives:3} : {maxLives:4}, explanation: dino.has(text) ? 'Dino: automatic running and jumping over red spike traps.' : 'Mario: stomp enemies to bounce; meat makes you bigger and adds a life, up to four.'});
    } else {
      const key = normalize(c.text ?? '') as keyof typeof additions;
      const rule = additions[key];
      if (!rule || rules[rule.field]) return null;
      rules[rule.field] = rule.value;
      effects.push({contributionId:c.id, ruleId:rule.field, parameters:{bonus:rule.value}, explanation:rule.explanation});
    }
  }
  const presses = new Set([143, 293, 543, 693, 977, 1127, 1393]);
  const frames = Array.from({length:1800}, (_,tick)=>({tick,buttons:presses.has(tick)?16:0,yaw:0,pitch:0}));
  const traceHash = await hashValue({seed:73,frames});
  const payload = {protocolVersion:'party-forge/1', parent, catalogVersion:'dino-runner/2', resolverVersion:'dino-authored-resolver-v2', origin:{kind:'preset',presetVersion:'dino-mario-v2'}, runtime:DINO_RESOURCE, assets:[], contributions, effects, runnerRules:rules,
    objective:'Run the same course: jump spikes, stomp walkers and eat meat. Highest score wins; fewer hits breaks ties.', controls:'direction-pad/1', scoringVersion:'points-then-hits/1', adaptation:'off',
    validation:{status:'bounded-rules',validatorVersion:'dino-authored-validator-v2',completingTraceHash:traceHash,witnesses:contributions.map(c=>({contributionId:c.id,traceHash})),limitations:[
      'Simulated authored remix, not a live model generation. Exact Dino and Mario cards select retained executable gameplay.',
      'Two or three players run the same fixed 30-second course in separate arenas with a shared start. Scores are recomputed from captured inputs.',
      'Three starting lives. Meat grows the dinosaur and adds one life, capped at four. Damage shrinks it and grants 1.5 seconds of protection.',
      'Scoring: 10 per second, 100 per stomp, 50 per meat; finish adds 500 and 100 per life. Winner and loser may each add one available scoring modifier; these are cumulative rounds, not controlled experiments.',
      'Supported extra cards: Double stomp points, Double meat points, Finish bonus. Other modifiers cannot silently match this demo.',
    ]}};
  const contentHash = await hashValue(payload);
  const build = buildManifestSchema.parse({...payload,contentHash,buildId:`dino-${contentHash.slice(7)}`});
  const run = createDinoRuntime(build,73);
  for (const frame of frames) { run.input(frame); run.step(); }
  if (run.snapshot().state.status !== 'won' || run.snapshot().hits !== 0) throw new Error('Authored course completion witness failed');
  return freezeJson(build);
}
export async function loadDinoBuild(value: unknown) {
  const build = buildManifestSchema.parse(value);
  const expected = await createDinoBuild(build.contributions,build.parent);
  if (!expected || canonicalJson(expected)!==canonicalJson(build)) throw new Error('Retained Dino rules or provenance changed');
  return {build:freezeJson(build)};
}
