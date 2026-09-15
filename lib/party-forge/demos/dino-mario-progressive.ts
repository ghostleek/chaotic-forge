/** Seeded endless demo v6. Retained party v2 keeps its original rules. */
import {
  DINO_MARIO as BASE,
  createDinoMarioGame as createBase,
  stepDinoMarioGame as stepBase,
  type DinoMarioState,
  dinoScore,
  dinoPlayerSize,
  encounterSize,
} from './dino-mario.ts';
export { dinoScore } from './dino-mario.ts';
export const DINO_MARIO = Object.freeze({
  ...BASE,
  version: 'dino-mario/6',
  finishTick: Infinity,
});
export const DINO_BEAM_TICKS = 120;
export const DINO_BEAM_SCORE = 1000;
const SEGMENT_TICKS = BASE.finishTick;
export function dinoSpeed(tick: number) {
  return BASE.speed * (1 + Math.max(0, tick) / SEGMENT_TICKS);
}
/** Integrated fixed-step distance; neither time nor speed is capped. */
export function dinoDistance(tick: number) {
  const n = Math.max(0, tick);
  return BASE.speed * (n + (n * (n - 1)) / (2 * SEGMENT_TICKS));
}
/** Seeded randomness keeps each run varied but reproducible from its initial seed. */
function random(game: DinoMarioState) {
  game.rng = ((game.rng ?? 1) * 1664525 + 1013904223) >>> 0;
  return game.rng / 4294967296;
}
export function hoverAltitude(tick: number, phase: number) {
  // One 40px grid square above and below the central flight lane.
  return 64 + 40 * Math.sin(tick * Math.PI / 120 + phase);
}
export function createDinoMarioGame(seed = 1): DinoMarioState {
  return { ...createBase(), growth: 0, beamTicks: 0, beamFired: false, beamDestroyed: 0,
    rng: seed >>> 0, nextEncounterDistance: 1100, nextEncounterId: 3,
    nextMeteorScore: 1500, meteorWaves: 0,
    encounters: [{ id: 0, kind: 'meat', x: 360 }, { id: 1, kind: 'block', x: 600 }, { id: 2, kind: 'meat', x: 850 }] };
}
function queueEncounters(game: DinoMarioState) {
  const distance = dinoDistance(game.tick);
  while ((game.nextEncounterDistance ?? Infinity) < distance + BASE.width + 240) {
    const x = game.nextEncounterDistance! - distance;
    const pick = random(game);
    const kind = pick < 0.15 ? 'meat' : pick < 0.57 ? 'block' : 'walker';
    const fly = kind === 'walker' && random(game) < 0.65;
    const phase = fly ? random(game) * Math.PI * 2 : 0;
    game.encounters.push({ id: game.nextEncounterId!++, kind, x,
      ...(kind === 'walker' ? { motion: fly ? 'fly' : 'crawl', altitude: fly ? hoverAltitude(game.tick, phase) : 0,
        ...(fly ? { hoverPhase: phase } : {}) } : {}) });
    // Independent choices permit spikes, birds and mixed runs without compulsory pairs.
    // Random gaps tighten over time, with a floor so individual threats stay readable.
    const density = 1 + Math.min(2, game.tick / 3600);
    game.nextEncounterDistance! += 160 + (180 + random(game) * 360) / density;
  }
}
function queueMeteors(game: DinoMarioState) {
  while (dinoScore(game) >= (game.nextMeteorScore ?? Infinity)) {
    game.nextMeteorScore! += 1000;
    game.meteorWaves = (game.meteorWaves ?? 0) + 1;
    const count = 2 + Math.floor(random(game) * 3);
    for (let i = 0; i < count; i++) game.encounters.push({
      id: game.nextEncounterId!++, kind: 'meteor', x: 180 + random(game) * 510,
      altitude: BASE.ground + 40 + random(game) * 100,
      verticalSpeed: 5 + random(game) * 3, warningTicks: 60 + i * 24,
    });
  }
}
export function stepDinoMarioGame(game: DinoMarioState, jumpDown = false) {
  if (game.status !== 'playing') return game;
  let prepared = { ...game, encounters: game.encounters.map(e => ({ ...e,
    ...(e.hoverPhase !== undefined ? { verticalSpeed: (e.altitude ?? 0) - hoverAltitude(game.tick + 1, e.hoverPhase) } : {}),
    ...(e.warningTicks !== undefined ? { warningTicks: Math.max(0, e.warningTicks - 1) } : {}),
  })) };
  if (!prepared.beamFired && dinoScore(prepared) >= DINO_BEAM_SCORE)
    prepared = { ...prepared, beamFired: true, beamTicks: DINO_BEAM_TICKS };
  const active = (prepared.beamTicks ?? 0) > 0;
  if (active) clearBeamPath(prepared);
  const next = stepBase(prepared, jumpDown, dinoSpeed(game.tick), Infinity);
  next.beamTicks = Math.max(0, (prepared.beamTicks ?? 0) - 1);
  if (next.status === 'playing') {
    queueEncounters(next);
    queueMeteors(next);
    if (!next.beamFired && dinoScore(next) >= DINO_BEAM_SCORE) {
      next.beamFired = true;
      next.beamTicks = DINO_BEAM_TICKS;
    }
    if (active || (next.beamTicks ?? 0) > 0) clearBeamPath(next);
  } else next.beamTicks = 0;
  return next;
}
/** Only the forward visible corridor is vaporized; distant course content survives. */
function clearBeamPath(game: DinoMarioState) {
  const muzzle = BASE.playerX + dinoPlayerSize(game).width;
  const top = Math.min(BASE.ground - 52, game.feet - dinoPlayerSize(game).height + 12);
  const before = game.encounters.length;
  game.encounters = game.encounters.filter(e => (e.warningTicks ?? 0) > 0 || e.x >= BASE.width || e.x + encounterSize(e.kind).width < muzzle || BASE.ground - (e.altitude ?? 0) < top || BASE.ground - (e.altitude ?? 0) - encounterSize(e.kind).height > BASE.ground);
  game.beamDestroyed = (game.beamDestroyed ?? 0) + before - game.encounters.length;
}
