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

void test('1,000 points fires once for exactly 120 fixed ticks and clears only its forward path', () => {
  let game = { ...createDinoMarioGame(), status: 'playing', tick: 5999, encounters: [
    { id: 90, kind: 'block', x: 300 }, { id: 91, kind: 'walker', x: 500 },
    { id: 92, kind: 'meat', x: 600 }, { id: 93, kind: 'block', x: 50 },
    { id: 94, kind: 'block', x: 5000 },
  ] };
  const original = structuredClone(game);
  game = stepDinoMarioGame(game);
  assert.equal(game.beamTicks, 120); assert.equal(game.beamFired, true);
  assert.equal(game.beamDestroyed, 3); assert.equal(game.meat, 0); assert.equal(game.stomps, 0);
  assert.deepEqual(game.encounters.map(e => e.id), [93, 94]);
  assert.equal(original.beamFired, false);
  for (let i = 0; i < 119; i++) game = stepDinoMarioGame({ ...game, encounters: [] });
  assert.equal(game.beamTicks, 1);
  game = stepDinoMarioGame(game); assert.equal(game.beamTicks, 0);
  game = stepDinoMarioGame({ ...game, encounters: [{ id: 99, kind: 'block', x: 400 }] });
  assert.equal(game.encounters.length, 1); assert.equal(game.beamTicks, 0);
  assert.equal(createDinoMarioGame().beamFired, false);
});

void test('active beam destroys incoming threats before collision and never advances when inactive', () => {
  const ready = createDinoMarioGame(); assert.equal(stepDinoMarioGame(ready), ready);
  const active = { ...ready, status: 'playing', beamTicks: 60, beamFired: true,
    encounters: [{ id: 88, kind: 'block', x: 141 }, { id: 89, kind: 'walker', x: 721 }] };
  const next = stepDinoMarioGame(active);
  assert.equal(next.hits, 0); assert.equal(next.encounters.length, 0);
  assert.equal(next.beamDestroyed, 2); assert.equal(next.beamTicks, 59);
  assert.equal(active.encounters.length, 2);
  const lost = { ...next, status: 'lost' }; assert.equal(stepDinoMarioGame(lost), lost);
});

void test('final-growth legs move independently while grounded and hold still airborne', async () => {
  const { drawDinoPlayer } = await import('../lib/party-forge/presentation/dino-view.ts');
  const sprites = { evolved: { naturalWidth: 1536, naturalHeight: 1024 } };
  const render = (tick, feet = 258) => {
    const calls = [];
    const ctx = { save() {}, restore() {}, fillRect(...args) { calls.push(args); } };
    drawDinoPlayer(ctx, { ...createDinoMarioGame(), status: 'playing', growth: 2, big: true, tick, feet }, 112, feet, sprites);
    return calls;
  };
  const a = render(3), b = render(9);
  assert.deepEqual(a.slice(0, -5), b.slice(0, -5), 'body is stable');
  assert.notDeepEqual(a.slice(-5, -1), b.slice(-5, -1), 'legs alternate');
  assert.deepEqual(a.at(-1), b.at(-1), 'eye is stable');
  assert.deepEqual(render(3, 200), render(9, 200));
});

void test('pterodactyls approach in both modes and flight contacts use their raised body', () => {
  const base = createDinoMarioGame();
  const enemies = base.encounters.filter(e => e.kind === 'walker');
  assert.deepEqual(enemies.map(e => e.motion), ['crawl', 'fly', 'crawl', 'fly']);
  for (const motion of ['crawl', 'fly']) {
    const altitude = motion === 'fly' ? 24 : 0;
    const game = { ...base, status: 'playing', feet: 258 - altitude - 28 - 1, vy: 4,
      encounters: [{ id: 90, kind: 'walker', motion, altitude, x: 120 }] };
    const stomped = stepDinoMarioGame(game);
    assert.equal(stomped.stomps, 1); assert.equal(stomped.hits, 0);
    assert.ok(stomped.vy < 0);
    const approaching = stepDinoMarioGame({ ...base, status: 'playing', encounters: [{ ...game.encounters[0], x: 500 }] });
    assert.equal(approaching.encounters[0].x, 497);
    const sideHit = stepDinoMarioGame({ ...game, feet: 258, vy: 0 });
    assert.equal(sideHit.hits, 1);
    const beam = stepDinoMarioGame({ ...game, feet: 258, beamFired: true, beamTicks: 10,
      encounters: [{ ...game.encounters[0], x: 300 }] });
    assert.equal(beam.beamDestroyed, 1); assert.equal(beam.stomps, 0);
  }
});

void test('pterodactyl flight and crawl select distinct animation rows and four phases', async () => {
  const { drawPterodactyl } = await import('../lib/party-forge/presentation/dino-view.ts');
  const calls = [];
  const ctx = { save() {}, restore() {}, drawImage(...args) { calls.push(args); } };
  const sprites = { pterodactyl: { naturalWidth: 1024, naturalHeight: 512 } };
  for (const tick of [0, 7, 14, 21]) drawPterodactyl(ctx, 100, 200, 'fly', tick, sprites);
  for (const tick of [0, 6, 12, 18]) drawPterodactyl(ctx, 100, 200, 'crawl', tick, sprites);
  assert.deepEqual(calls.map(c => c[1]), [0, 256, 512, 768, 0, 256, 512, 768]);
  assert.deepEqual(calls.map(c => c[2]), [0, 0, 0, 0, 256, 256, 256, 256]);
  assert.ok(calls.every(c => c[5] === 88));
  assert.deepEqual(calls.map(c => c[6]), [182, 182, 182, 182, 188, 188, 188, 188]);
});
