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
// Keep world spacing fixed: faster travel produces more spike encounters per second.
// Retain the authored walker → spike pair and pickups rather than adding random hazards.
const SEGMENT_DISTANCE = BASE.finishTick * BASE.speed;
function encountersForSegment(segment: number, distance = 0) {
  const course = createBase().encounters;
  return course.map((e, index) => ({
    ...e,
    id: segment * course.length + e.id,
    x:
      e.x +
      (e.kind === 'block' && course[index - 1]?.kind === 'walker' ? 30 : 0) +
      segment * SEGMENT_DISTANCE -
      distance,
  }));
}
export function createDinoMarioGame(): DinoMarioState {
  return { ...createBase(), growth: 0, encounters: encountersForSegment(0) };
}
export function stepDinoMarioGame(game: DinoMarioState, jumpDown = false) {
  if (game.status !== 'playing') return game;
  const next = stepBase(game, jumpDown, dinoSpeed(game.tick), Infinity);
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
  return next;
}
