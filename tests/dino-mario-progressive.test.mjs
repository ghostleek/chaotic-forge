import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDinoMarioGame,
  stepDinoMarioGame,
  dinoSpeed,
  dinoDistance,
} from '../lib/party-forge/demos/dino-mario-progressive.ts';

void test('speed rises throughout the course; ground distance equals actual scroll', () => {
  let game = {
    ...createDinoMarioGame(),
    status: 'playing',
    protection: 100000,
    encounters: [{ id: 99, kind: 'block', x: 100000 }],
  };
  let previousSpeed = 0;
  for (let tick = 0; tick < 7200; tick++) {
    const next = stepDinoMarioGame(game);
    const speed = game.encounters[0].x - next.encounters[0].x;
    assert.ok(speed > previousSpeed);
    assert.ok(Math.abs(speed - dinoSpeed(tick)) < 1e-8);
    assert.ok(
      Math.abs(100000 - next.encounters[0].x - dinoDistance(next.tick)) < 1e-7,
    );
    previousSpeed = speed;
    game = next;
  }
  assert.equal(dinoSpeed(0), 3);
  assert.equal(dinoSpeed(1800), 6);
  assert.equal(dinoSpeed(3600), 9);
  assert.equal(dinoSpeed(7200), 15);
  assert.equal(game.status, 'playing');
  assert.equal(dinoSpeed(createDinoMarioGame().tick), 3);
});

void test('first pattern completes without damage and the next pattern is queued', () => {
  const play = () => {
    let game = { ...createDinoMarioGame(), status: 'playing' };
    const presses = new Set([133, 276, 471, 580, 788, 889, 1058]);
    while (game.status === 'playing' && game.tick < 1181)
      game = stepDinoMarioGame(game, presses.has(game.tick));
    return game;
  };
  const result = play();
  assert.equal(result.status, 'playing');
  assert.ok(result.encounters.length > 0);
  assert.ok(result.encounters.every((e) => e.id >= 14));
  assert.equal(stepDinoMarioGame(result).tick, 1182);
  assert.equal(result.hits, 0);
  assert.equal(result.stomps, 4);
  assert.equal(result.meat, 3);
  assert.deepEqual(result, play());
  let idle = { ...createDinoMarioGame(), status: 'playing' };
  while (idle.status === 'playing') idle = stepDinoMarioGame(idle);
  assert.equal(idle.status, 'lost');
});

void test('later segments keep spawning, remain bounded and preserve terminal inactivity', () => {
  let game = {
    ...createDinoMarioGame(),
    status: 'playing',
    protection: 100000,
  };
  for (let tick = 0; tick < 18000; tick++) {
    game = stepDinoMarioGame(game);
    assert.equal(game.status, 'playing');
    assert.ok(game.encounters.length <= 28);
    assert.equal(
      new Set(game.encounters.map((e) => e.id)).size,
      game.encounters.length,
    );
  }
  assert.ok(game.encounters.some((e) => e.id >= 140));
  const lost = { ...game, status: 'lost' };
  assert.equal(stepDinoMarioGame(lost, true), lost);
  assert.equal(dinoSpeed(createDinoMarioGame().tick), 3);
});

void test('spikes cross the player more frequently as acceleration continues', () => {
  let game = {
    ...createDinoMarioGame(),
    status: 'playing',
    protection: 100000,
  };
  const counts = [0, 0, 0];
  for (let tick = 0; tick < 5400; tick++) {
    const next = stepDinoMarioGame(game);
    for (const e of game.encounters) {
      if (e.kind !== 'block' || e.x <= 112) continue;
      const after = next.encounters.find((n) => n.id === e.id);
      if (!after || after.x <= 112) counts[Math.floor(tick / 1800)]++;
    }
    game = next;
  }
  assert.ok(counts[1] > counts[0], JSON.stringify(counts));
  assert.ok(counts[2] > counts[1], JSON.stringify(counts));
});

void test('two meats grow twice, further meat caps growth, and damage shrinks one stage', async () => {
  const { dinoPlayerSize } =
    await import('../lib/party-forge/demos/dino-mario.ts');
  const base = { ...createDinoMarioGame(), status: 'playing', encounters: [] };
  const eat = (g) =>
    stepDinoMarioGame({
      ...g,
      encounters: [{ id: 999, kind: 'meat', x: 130 }],
    });
  const first = eat(base),
    second = eat(first),
    third = eat(second);
  assert.equal(first.growth, 1);
  assert.equal(second.growth, 2);
  assert.equal(third.growth, 2);
  assert.equal(base.growth, 0);
  assert.equal(third.lives, 4);
  assert.ok(dinoPlayerSize(first).width > dinoPlayerSize(base).width);
  assert.ok(dinoPlayerSize(second).width > dinoPlayerSize(first).width);
  const hit = (g) =>
    stepDinoMarioGame({
      ...g,
      protection: 0,
      encounters: [{ id: 888, kind: 'block', x: 130 }],
    });
  const shrunk = hit(third),
    small = hit(shrunk);
  assert.equal(shrunk.growth, 1);
  assert.equal(shrunk.big, true);
  assert.equal(small.growth, 0);
  assert.equal(small.big, false);
  assert.equal(createDinoMarioGame().growth, 0);
});

void test('retained party renderer still draws meat without loading demo sprites', async () => {
  const { drawDinoMeat } = await import('../lib/party-forge/presentation/dino-view.ts');
  let painted = 0;
  const ctx = { fillStyle: '', fillRect() { painted++; }, beginPath() {}, ellipse() {}, fill() { painted++; } };
  drawDinoMeat(ctx, 0, 0);
  assert.ok(painted > 0, 'legacy party pickup must remain visible without asset loader');
});
