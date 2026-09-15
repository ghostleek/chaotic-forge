/** Authored, immutable course v2. No model, network, random source or browser state. */
export const DINO_MARIO = Object.freeze({
  version: 'dino-mario/2',
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
  startingLives: 3,
  maxLives: 4,
  protectionTicks: 90,
});

export const DINO_MARIO_PROVENANCE = Object.freeze({
  source: 'Google Dino and Mario — user-supplied references.',
  interpretation:
    'An original scrolling runner with spike jumps, stomp bounce, meat growth and extra lives.',
  decision: 'Use Dino × Mario as the default simulated onboarding example.',
  origin: 'Simulated demo · fixed authored example',
});

export type Encounter = { id: number; kind: 'block' | 'walker' | 'meat'; x: number; motion?: 'crawl' | 'fly'; altitude?: number };
export type DinoMarioState = {
  status: 'ready' | 'playing' | 'won' | 'lost';
  tick: number;
  feet: number;
  vy: number;
  jumpDown: boolean;
  stomps: number;
  lives: number;
  big: boolean;
  /** Defined only by the evolving demo; absent on retained v2 games. */
  growth?: 0 | 1 | 2;
  beamTicks?: number;
  beamFired?: boolean;
  beamDestroyed?: number;
  protection: number;
  hits: number;
  meat: number;
  encounters: Encounter[];
};

// A walker is followed by a block: the automatic stomp bounce clears that block.
const COURSE = [
  [360, 'meat'],
  [600, 'block'],
  [1100, 'walker'],
  [1140, 'block'],
  [1600, 'meat'],
  [1800, 'block'],
  [2300, 'walker'],
  [2340, 'block'],
  [3100, 'block'],
  [3350, 'meat'],
  [3600, 'walker'],
  [3640, 'block'],
  [4400, 'walker'],
  [4440, 'block'],
] as const;

export function encounterSize(kind: Encounter['kind']) {
  if (kind === 'meat') return { width: 24, height: 24 };
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
    lives: DINO_MARIO.startingLives,
    big: false,
    protection: 0,
    hits: 0,
    meat: 0,
    encounters: COURSE.map(([x, kind], id) => ({ id, kind, x })),
  };
}

export function dinoPlayerSize(game: DinoMarioState) {
  if (game.growth === 2) return { width: 64, height: 64 };
  const scale = game.big ? 1.4 : 1;
  return { width: DINO_MARIO.playerWidth * scale, height: DINO_MARIO.playerHeight * scale };
}

/** Identical rules and inputs produce an inspectable score; no wall-clock bonus. */
export function dinoScore(game: DinoMarioState) {
  return Math.floor(game.tick / 6) + game.stomps * 100 + game.meat * 50
    + (game.status === 'won' ? 500 + game.lives * 100 : 0);
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
  scrollSpeed: number = DINO_MARIO.speed,
  finishTick: number = DINO_MARIO.finishTick,
): DinoMarioState {
  if (previous.status !== 'playing') return previous;
  const c = DINO_MARIO;
  const game: DinoMarioState = {
    ...previous,
    tick: previous.tick + 1,
    protection: Math.max(0, previous.protection - 1),
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
    const dx = scrollSpeed * remaining;
    const dy = game.vy * remaining;
    let contact: { entity: Encounter; time: number; top: boolean } | undefined;
    const player = dinoPlayerSize(game);
    for (const entity of game.encounters) {
      if (game.protection > 0 && entity.kind !== 'meat') continue;
      const size = encounterSize(entity.kind);
      const bottom = c.ground - (entity.altitude ?? 0);
      const top = bottom - size.height;
      const x = axisTimes(
        c.playerX,
        c.playerX + player.width,
        entity.x,
        entity.x + size.width,
        dx,
      );
      const y = axisTimes(
        game.feet - player.height,
        game.feet,
        top,
        bottom,
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
    game.encounters = game.encounters.filter((e) => e.id !== contact.entity.id);
    if (contact.entity.kind === 'meat') {
      game.meat++;
      if (game.growth !== undefined) game.growth = Math.min(2, game.growth + 1) as 0 | 1 | 2;
      game.big = true;
      game.lives = Math.min(c.maxLives, game.lives + 1);
    } else if (contact.entity.kind === 'walker' && contact.top) {
      game.stomps++;
      game.vy = game.growth === 2 ? c.bounce - 2 : c.bounce;
    } else {
      game.hits++;
      game.lives--;
      if (game.growth !== undefined) game.growth = Math.max(0, game.growth - 1) as 0 | 1 | 2;
      game.big = game.growth !== undefined && game.growth > 0;
      game.protection = c.protectionTicks;
      if (game.lives === 0) {
        game.status = 'lost';
        break;
      }
    }
    remaining *= 1 - time;
  }
  if (game.feet >= c.ground) {
    game.feet = c.ground;
    game.vy = 0;
  }
  game.encounters = game.encounters.filter(
    (e) => e.x + encounterSize(e.kind).width >= 0,
  );
  // Resolve contact before finish: losing the last life on this tick still loses.
  if (game.status === 'playing' && game.tick >= finishTick)
    game.status = 'won';
  return game;
}
