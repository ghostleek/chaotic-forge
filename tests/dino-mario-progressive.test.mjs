import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDinoMarioGame,
  stepDinoMarioGame,
  dinoSpeed,
  dinoDistance,
  hoverAltitude,
} from '../lib/party-forge/demos/dino-mario-progressive.ts';

void test('speed rises throughout the course; ground distance equals actual scroll', () => {
  let game = {
    ...createDinoMarioGame(),
    status: 'playing',
    protection: 100000,
    nextMeteorScore: Infinity,
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

void test('seeded layouts replay exactly, vary by seed and do not force bird-spike pairs', () => {
  const layout = seed => {
    let game = { ...createDinoMarioGame(seed), status: 'playing', protection: 100000, nextMeteorScore: Infinity, beamFired: true };
    const seen = new Map();
    for (let tick = 0; tick < 3600; tick++) {
      game = stepDinoMarioGame(game);
      for (const e of game.encounters) if (!seen.has(e.id)) seen.set(e.id, { id: e.id, kind: e.kind, x: e.x, motion: e.motion });
    }
    return [...seen.values()];
  };
  const a = layout(1);
  assert.deepEqual(a, layout(1));
  assert.notDeepEqual(a, layout(2));
  const types = a.map(e => e.kind);
  assert.ok(types.some((k, i) => k === 'block' && types[i + 1] === 'block'));
  assert.ok(types.some((k, i) => k === 'walker' && types[i + 1] === 'walker'));
  assert.ok(a.some(e => e.motion === 'fly') && a.some(e => e.motion === 'crawl'));
});

void test('later segments keep spawning, remain bounded and preserve terminal inactivity', () => {
  let game = {
    ...createDinoMarioGame(),
    status: 'playing',
    protection: 100000,
    nextMeteorScore: Infinity,
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
    nextMeteorScore: Infinity,
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
  let game = { ...createDinoMarioGame(), status: 'playing', nextEncounterDistance: Infinity, tick: 5999, encounters: [
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

void test('flight sweeps a grid square above and below its lane while continuing left', () => {
  assert.equal(hoverAltitude(0, 0), 64);
  assert.equal(hoverAltitude(60, 0), 104);
  assert.equal(hoverAltitude(180, 0), 24);
  let game = { ...createDinoMarioGame(), status: 'playing', protection: 100000, nextEncounterDistance: Infinity,
    encounters: [{ id: 90, kind: 'walker', x: 2000, motion: 'fly', altitude: 64, hoverPhase: 0 }] };
  for (let tick = 1; tick <= 240; tick++) {
    game = stepDinoMarioGame(game);
    assert.ok(Math.abs(game.encounters[0].altitude - hoverAltitude(tick, 0)) < 1e-9);
    assert.ok(Math.abs(game.encounters[0].x - (2000 - dinoDistance(tick))) < 1e-8);
  }
});

void test('meteor waves trigger once at 1500, 2500, 3500 and have seeded random positions', () => {
  const base = { ...createDinoMarioGame(42), status: 'playing', nextEncounterDistance: Infinity, beamFired: true, encounters: [] };
  let game = stepDinoMarioGame({ ...base, tick: 8998 });
  assert.equal(game.meteorWaves, 0);
  game = stepDinoMarioGame(game);
  assert.equal(game.meteorWaves, 1); assert.equal(game.nextMeteorScore, 2500);
  assert.ok(game.encounters.length >= 2 && game.encounters.length <= 4);
  assert.ok(game.encounters.every(e => e.kind === 'meteor' && e.warningTicks >= 60));
  assert.ok(new Set(game.encounters.map(e => e.x)).size > 1);
  assert.deepEqual(game, stepDinoMarioGame(stepDinoMarioGame({ ...base, tick: 8998 })));
  assert.equal(stepDinoMarioGame(game).meteorWaves, 1);
  const second = stepDinoMarioGame({ ...game, tick: 14999, encounters: [] });
  assert.equal(second.meteorWaves, 2); assert.equal(second.nextMeteorScore, 3500);
  const third = stepDinoMarioGame({ ...second, tick: 20999, encounters: [] });
  assert.equal(third.meteorWaves, 3); assert.equal(third.nextMeteorScore, 4500);
  const restart = createDinoMarioGame(43);
  assert.equal(restart.meteorWaves, 0); assert.equal(restart.nextMeteorScore, 1500);
});

void test('meteor swept contact instantly kills every size through protection; all deaths preserve fatal-hit size', () => {
  for (const growth of [0, 1, 2]) {
    const base = { ...createDinoMarioGame(), status: 'playing', growth, big: growth > 0,
      lives: 4, protection: 90, nextEncounterDistance: Infinity };
    const meteor = { id: 80, kind: 'meteor', x: 130, altitude: 300, verticalSpeed: 400, warningTicks: 0 };
    const dead = stepDinoMarioGame({ ...base, encounters: [meteor] });
    assert.equal(dead.status, 'lost'); assert.equal(dead.lives, 0);
    assert.equal(dead.deathCause, 'meteor'); assert.equal(dead.deathGrowth, growth);
    assert.equal(stepDinoMarioGame(dead, true), dead);
    const warned = stepDinoMarioGame({ ...base, encounters: [{ ...meteor, warningTicks: 20 }] });
    assert.equal(warned.status, 'playing'); assert.equal(warned.encounters[0].altitude, 300);
    for (const kind of ['block', 'walker']) {
      const hit = stepDinoMarioGame({ ...base, protection: 0, lives: 1, encounters: [{ id: 88, kind, x: 130 }] });
      assert.equal(hit.status, 'lost'); assert.equal(hit.deathGrowth, growth); assert.equal(hit.deathCause, 'collision');
    }
  }
});

void test('beam preserves hovering enemies above its actual visible path', () => {
  const game = { ...createDinoMarioGame(), status: 'playing', beamTicks: 20, beamFired: true,
    encounters: [{ id: 80, kind: 'walker', motion: 'fly', x: 300, altitude: 100 }] };
  assert.equal(stepDinoMarioGame(game).encounters.length, 1);
});

void test('three skeleton sprites have distinct size-appropriate silhouettes', async () => {
  const { drawDinoSkeleton, drawDinoPlayer } = await import('../lib/party-forge/presentation/dino-view.ts');
  const frames = [];
  for (const growth of [0, 1, 2]) {
    const bones = []; const ctx = { save() {}, restore() {}, fillRect(...args) { bones.push(args); } };
    drawDinoSkeleton(ctx, growth, 112, 258);
    const height = 258 - Math.min(...bones.map(b => b[1]));
    assert.equal(height, [40, 56, 64][growth]);
    frames.push([...bones]); bones.length = 0;
    drawDinoPlayer(ctx, { ...createDinoMarioGame(), status: 'lost', growth: 0, deathGrowth: growth }, 112, 258);
    assert.deepEqual(bones, frames[growth], 'fatal-hit size selects the skeleton even after shrinking');
  }
  assert.notDeepEqual(frames[0], frames[1]); assert.notDeepEqual(frames[1], frames[2]);
});
