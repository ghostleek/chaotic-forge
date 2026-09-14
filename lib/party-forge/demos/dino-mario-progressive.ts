/** Endless authored demo v3. Retained party v2 keeps its original rules. */
import {
  DINO_MARIO as BASE,
  createDinoMarioGame as createBase,
  stepDinoMarioGame as stepBase,
  type DinoMarioState,
} from './dino-mario.ts';
export { dinoScore } from './dino-mario.ts';
export const DINO_MARIO = Object.freeze({
  ...BASE,
  version: 'dino-mario/3',
  finishTick: Infinity,
});
const SEGMENT_TICKS = BASE.finishTick;
export function dinoSpeed(tick: number) {
  return BASE.speed * (1 + Math.max(0, tick) / SEGMENT_TICKS);
}
/** Integrated fixed-step distance; neither time nor speed is capped. */
export function dinoDistance(tick: number) {
  const n = Math.max(0, tick);
  return BASE.speed * (n + (n * (n - 1)) / (2 * SEGMENT_TICKS));
}
function encountersForSegment(segment: number) {
  const course = createBase().encounters;
  const startTick = segment * SEGMENT_TICKS;
  return course.map((e) => ({
    ...e,
    id: segment * course.length + e.id,
    x:
      BASE.playerX +
      dinoDistance(startTick + (e.x - BASE.playerX) / BASE.speed) -
      dinoDistance(startTick),
  }));
}
export function createDinoMarioGame(): DinoMarioState {
  return { ...createBase(), encounters: encountersForSegment(0) };
}
export function stepDinoMarioGame(game: DinoMarioState, jumpDown = false) {
  if (game.status !== 'playing') return game;
  const next = stepBase(game, jumpDown, dinoSpeed(game.tick), Infinity);
  // Repeat the authored pattern with unique IDs and spacing matched to current speed.
  // Offscreen encounters are discarded by the shared engine, keeping memory bounded.
  if (next.status === 'playing' && next.tick % SEGMENT_TICKS === 0) {
    next.encounters.push(...encountersForSegment(next.tick / SEGMENT_TICKS));
  }
  return next;
}
