/** Endless authored demo v3. Retained party v2 keeps its original rules. */
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
  version: 'dino-mario/5',
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
// Keep world spacing fixed: faster travel produces more spike encounters per second.
// Retain the authored walker → spike pair and pickups rather than adding random hazards.
const SEGMENT_DISTANCE = BASE.finishTick * BASE.speed;
function encountersForSegment(segment: number, distance = 0) {
  const course = createBase().encounters;
  return course.map((e, index) => ({
    ...e,
    ...(e.kind === 'walker' ? { motion: (index === 6 || index === 12 ? 'fly' : 'crawl') as 'fly' | 'crawl', altitude: index === 6 || index === 12 ? 24 : 0 } : {}),
    id: segment * course.length + e.id,
    x:
      e.x +
      (e.kind === 'block' && course[index - 1]?.kind === 'walker' ? 30 : 0) +
      segment * SEGMENT_DISTANCE -
      distance,
  }));
}
export function createDinoMarioGame(): DinoMarioState {
  return { ...createBase(), growth: 0, beamTicks: 0, beamFired: false, beamDestroyed: 0, encounters: encountersForSegment(0) };
}
export function stepDinoMarioGame(game: DinoMarioState, jumpDown = false) {
  if (game.status !== 'playing') return game;
  let prepared = { ...game, encounters: [...game.encounters] };
  if (!prepared.beamFired && dinoScore(prepared) >= DINO_BEAM_SCORE)
    prepared = { ...prepared, beamFired: true, beamTicks: DINO_BEAM_TICKS };
  const active = (prepared.beamTicks ?? 0) > 0;
  if (active) clearBeamPath(prepared);
  const next = stepBase(prepared, jumpDown, dinoSpeed(game.tick), Infinity);
  next.beamTicks = Math.max(0, (prepared.beamTicks ?? 0) - 1);
  if (next.status === 'playing') {
    // Queue each next pattern before it enters the viewport, with no visible pop-in.
    const before = Math.floor(
      (dinoDistance(game.tick) + BASE.width) / SEGMENT_DISTANCE,
    );
    const after = Math.floor(
      (dinoDistance(next.tick) + BASE.width) / SEGMENT_DISTANCE,
    );
    for (let segment = before + 1; segment <= after; segment++)
      next.encounters.push(
        ...encountersForSegment(segment, dinoDistance(next.tick)),
      );
  }
  if (next.status === 'playing') {
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
  const before = game.encounters.length;
  game.encounters = game.encounters.filter(e => e.x >= BASE.width || e.x + encounterSize(e.kind).width < muzzle);
  game.beamDestroyed = (game.beamDestroyed ?? 0) + before - game.encounters.length;
}
