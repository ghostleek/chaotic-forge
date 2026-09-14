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

void test('first pattern completes without damage, then more obstacles arrive beyond 2x', () => {
  const play = () => {
    let game = { ...createDinoMarioGame(), status: 'playing' };
    const presses = new Set([143, 293, 543, 693, 977, 1127, 1393]);
    while (game.status === 'playing' && game.tick < 1800)
      game = stepDinoMarioGame(game, presses.has(game.tick));
    return game;
  };
  const result = play();
  assert.equal(result.status, 'playing');
  assert.ok(result.encounters.length > 0);
  assert.ok(result.encounters.every((e) => e.id >= 14));
  assert.equal(stepDinoMarioGame(result).tick, 1801);
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
