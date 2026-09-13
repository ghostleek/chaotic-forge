/** Authored, immutable course v1. No model, network, random source or browser state. */
export const DINO_MARIO = Object.freeze({
  version: 'dino-mario/1',
  width: 720,
  height: 320,
  ground: 258,
  playerX: 112,
  playerWidth: 28,
  playerHeight: 40,
  stepMs: 1000 / 60,
  finishTick: 1800,
  speed: 3,
  gravity: 0.6,
  jump: -11,
  bounce: -10,
});

export const DINO_MARIO_PROVENANCE = Object.freeze({
  source: 'Google Dino and Mario — user-supplied references.',
  interpretation:
    'An original scrolling runner with obstacle jumps and enemy stomp bounce.',
  decision: 'Use Dino × Mario as the default simulated onboarding example.',
  origin: 'Simulated demo · fixed authored example',
});

export type Encounter = { id: number; kind: 'block' | 'walker'; x: number };
export type DinoMarioState = {
  status: 'ready' | 'playing' | 'won' | 'lost';
  tick: number;
  feet: number;
  vy: number;
  jumpDown: boolean;
  stomps: number;
  encounters: Encounter[];
};

// A walker is followed by a block: the automatic stomp bounce clears that block.
const COURSE = [
  [600, 'block'],
  [1100, 'walker'],
  [1140, 'block'],
  [1800, 'block'],
  [2300, 'walker'],
  [2340, 'block'],
  [3100, 'block'],
  [3600, 'walker'],
  [3640, 'block'],
  [4400, 'walker'],
  [4440, 'block'],
] as const;

export function encounterSize(kind: Encounter['kind']) {
  return kind === 'block'
    ? { width: 28, height: 38 }
    : { width: 30, height: 28 };
}

export function createDinoMarioGame(): DinoMarioState {
  return {
    status: 'ready',
    tick: 0,
    feet: DINO_MARIO.ground,
    vy: 0,
    jumpDown: false,
    stomps: 0,
    encounters: COURSE.map(([x, kind], id) => ({ id, kind, x })),
  };
}

/** Entry/exit times for a moving interval against a stationary interval. */
function axisTimes(
  min: number,
  max: number,
  targetMin: number,
  targetMax: number,
  delta: number,
) {
  if (delta === 0)
    return max > targetMin && min < targetMax ? [-Infinity, Infinity] : null;
  const a = (targetMin - max) / delta;
  const b = (targetMax - min) / delta;
  return [Math.min(a, b), Math.max(a, b)];
}

/** One fixed step, independent of rendering frequency. Input is held state, not auto-repeat. */
export function stepDinoMarioGame(
  previous: DinoMarioState,
  jumpDown = false,
): DinoMarioState {
  if (previous.status !== 'playing') return previous;
  const c = DINO_MARIO;
  const game: DinoMarioState = {
    ...previous,
    tick: previous.tick + 1,
    jumpDown,
    encounters: previous.encounters.map((e) => ({ ...e })),
  };
  if (jumpDown && !previous.jumpDown && game.feet === c.ground)
    game.vy = c.jump;
  game.vy += c.gravity;

  // Swept rectangles classify the first contact, including moving-under-player near misses.
  // Each stomp removes an entity, so this loop is bounded by the fixed course size + 1.
  let remaining = 1;
  while (remaining > 0) {
    const dx = c.speed * remaining;
    const dy = game.vy * remaining;
    let contact: { entity: Encounter; time: number; top: boolean } | undefined;
    for (const entity of game.encounters) {
      const size = encounterSize(entity.kind);
      const top = c.ground - size.height;
      const x = axisTimes(
        c.playerX,
        c.playerX + c.playerWidth,
        entity.x,
        entity.x + size.width,
        dx,
      );
      const y = axisTimes(
        game.feet - c.playerHeight,
        game.feet,
        top,
        c.ground,
        dy,
      );
      if (!x || !y) continue;
      const time = Math.max(0, x[0], y[0]);
      const exit = Math.min(1, x[1], y[1]);
      if (time > exit || time >= x[1] || time >= y[1]) continue;
      if (!contact || time < contact.time) {
        contact = {
          entity,
          time,
          top: dy > 0 && game.feet <= top && y[0] > x[0],
        };
      }
    }
    const time = contact?.time ?? 1;
    game.feet += dy * time;
    for (const entity of game.encounters) entity.x -= dx * time;
    if (!contact) break;
    if (contact.entity.kind !== 'walker' || !contact.top) {
      game.status = 'lost';
      break;
    }
    game.encounters = game.encounters.filter((e) => e.id !== contact.entity.id);
    game.stomps++;
    game.vy = c.bounce;
    remaining *= 1 - time;
  }
  if (game.feet >= c.ground) {
    game.feet = c.ground;
    game.vy = 0;
  }
  game.encounters = game.encounters.filter(
    (e) => e.x + encounterSize(e.kind).width >= 0,
  );
  // A collision on the finishing tick still loses.
  if (game.status === 'playing' && game.tick >= c.finishTick)
    game.status = 'won';
  return game;
}
