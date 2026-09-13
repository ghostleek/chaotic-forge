/** Authored demo v1. Pure fixed-step simulation; no model or network dependency. */
export type Point = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export type SnakeGame = {
  snake: Point[];
  direction: Direction;
  pickup: Point;
  enemies: Point[];
  shots: Point[];
  bombs: Point[];
  tick: number;
  score: number;
  status: 'ready' | 'playing' | 'won' | 'lost';
  reason: string;
  fleetDirection: number;
};
export const BOARD = 28;
const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export function newSnakeGame(): SnakeGame {
  return {
    snake: [
      { x: 14, y: 23 },
      { x: 13, y: 23 },
      { x: 12, y: 23 },
    ],
    direction: 'right',
    pickup: { x: 19, y: 23 },
    enemies: Array.from({ length: 18 }, (_, i) => ({
      x: 3 + (i % 9) * 2,
      y: 3 + Math.floor(i / 9) * 2,
    })),
    shots: [],
    bombs: [],
    tick: 0,
    score: 0,
    status: 'ready',
    reason: '',
    fleetDirection: 1,
  };
}
export function stepSnakeGame(
  previous: SnakeGame,
  turn?: Direction,
  fire = false,
): SnakeGame {
  if (previous.status !== 'playing') return previous;
  const game = structuredClone(previous);
  game.tick++;
  if (turn) {
    const a = vectors[turn],
      b = vectors[game.direction];
    if (a.x !== -b.x || a.y !== -b.y) game.direction = turn;
  }
  const head = {
    x: game.snake[0].x + vectors[game.direction].x,
    y: game.snake[0].y + vectors[game.direction].y,
  };
  const grows = same(head, game.pickup);
  const body = grows ? game.snake : game.snake.slice(0, -1);
  const lose = (reason: string) => {
    game.status = 'lost';
    game.reason = reason;
    return game;
  };
  if (head.x < 0 || head.x >= BOARD || head.y < 0 || head.y >= BOARD)
    return lose('You hit the boundary.');
  if (body.some((p) => same(p, head)))
    return lose('You crossed your own trail.');
  game.snake.unshift(head);
  if (!grows) game.snake.pop();
  else {
    game.score += 25;
    // Deterministic free cell placement makes replays and tests reproducible.
    for (let i = 0; i < BOARD * 12; i++) {
      const p = {
        x: (game.tick * 7 + i * 11) % BOARD,
        y: 15 + ((game.tick + i) % 12),
      };
      if (!game.snake.some((s) => same(s, p))) {
        game.pickup = p;
        break;
      }
    }
  }
  if (fire) game.shots.push({ x: head.x, y: head.y - 1 });
  // Advance projectiles one cell at a time so they cannot tunnel through enemies.
  for (let substep = 0; substep < 2; substep++) {
    for (const shot of game.shots) {
      const victim = game.enemies.findIndex((e) => same(e, shot));
      if (victim >= 0) {
        game.enemies.splice(victim, 1);
        shot.y = -99;
        game.score += 100;
      } else shot.y--;
    }
    game.shots = game.shots.filter((s) => s.y >= 0);
  }
  if (game.tick % 8 === 0 && game.enemies.length) {
    const edge = game.enemies.some(
      (e) =>
        e.x + game.fleetDirection < 1 || e.x + game.fleetDirection > BOARD - 2,
    );
    if (edge) {
      game.fleetDirection *= -1;
      game.enemies.forEach((e) => e.y++);
    } else game.enemies.forEach((e) => (e.x += game.fleetDirection));
  }
  if (game.tick % 12 === 0 && game.enemies.length) {
    const enemy =
      game.enemies[Math.floor(game.tick / 12) % game.enemies.length];
    game.bombs.push({ x: enemy.x, y: enemy.y + 1 });
  }
  if (game.bombs.some((b) => same(b, head)))
    return lose('An invader shot hit your head.');
  if (game.tick % 2 === 0) game.bombs.forEach((b) => b.y++);
  game.bombs = game.bombs.filter((b) => b.y < BOARD);
  if (game.bombs.some((b) => same(b, head)))
    return lose('An invader shot hit your head.');
  if (game.enemies.some((e) => e.y >= 22 || same(e, head)))
    return lose('The fleet breached your space.');
  if (!game.enemies.length) {
    game.status = 'won';
    game.reason = 'Fleet cleared. Your space, your rules.';
  }
  return game;
}
