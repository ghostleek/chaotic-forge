import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUTTONS,
  createRuntime,
  replayRuntime,
  resetRuntime,
  RULES,
  snapshotRuntime,
  stepRuntime,
  WORLD,
} from '../lib/party-forge/runtimes/kitchen-chaos-v1/engine.ts';
import {
  additionSequences,
  createCompletingWitness,
  createQualification,
  FIXTURE_PROVENANCE,
  initialRecipes,
} from './fixtures/party-builds/kitchen-chaos-v1.mjs';

const baseRecipe = initialRecipes[0];
const frame = (tick, buttons = 0, yaw = 0, pitch = 0) => ({ tick, buttons, yaw, pitch });

void test('versioned fixture deck enumerates all eight starting combinations and sixteen legal ordered addition paths', () => {
  assert.equal(initialRecipes.length, 8);
  assert.equal(new Set(initialRecipes.map((recipe) => JSON.stringify(recipe))).size, 8);
  assert.equal(additionSequences.length, 16);
  assert.equal(new Set(additionSequences.map((sequence) => sequence.join(','))).size, 16);
  assert.ok(additionSequences.every((sequence) => new Set(sequence).size === sequence.length));
  assert.deepEqual([0, 1, 2, 3].map((length) => additionSequences.filter((sequence) => sequence.length === length).length), [1, 3, 6, 6]);
  assert.equal(FIXTURE_PROVENANCE.externalPlayEvidence, false);
});

for (const initial of initialRecipes) {
  void test(`${initial.fps}/${initial.zombies}/${initial.cooking}: every legal additive path completes a real sixty-second cooking trial`, () => {
    for (const additions of additionSequences) {
      const recipe = { ...initial, additions };
      const witness = createCompletingWitness(recipe);
      assert.equal(witness.frames.length, 3600);
      assert.equal(witness.snapshot.status, 'complete');
      assert.equal(witness.snapshot.tick, 3600);
      assert.ok(witness.snapshot.metrics.completedOrders >= 1, `No valid order for ${JSON.stringify(recipe)}`);
      assert.ok(witness.snapshot.metrics.deliveredPortions >= (recipe.cooking === 'batch-orders' ? 2 : 1));
      assert.deepEqual(witness.frames.map((input) => input.tick), Array.from({ length: 3600 }, (_, tick) => tick));
      assert.deepEqual(snapshotRuntime(replayRuntime(recipe, witness.seed, witness.frames)), witness.snapshot);
    }
  });
}

void test('identical fixed inputs replay identically and reset preserves the complete recipe and seed', () => {
  const recipe = { ...baseRecipe, additions: ['dinner-bell', 'hot-potato', 'zombie-pantry'] };
  const witness = createCompletingWitness(recipe, 1729);
  const replayed = replayRuntime(recipe, witness.seed, witness.frames);
  assert.deepEqual(snapshotRuntime(replayed), witness.snapshot);
  assert.deepEqual(resetRuntime(replayed), createRuntime(recipe, witness.seed));
});

void test('steps and renderer snapshots cannot mutate the preceding simulation or recipe', () => {
  const recipe = structuredClone(baseRecipe);
  const first = createRuntime(recipe, 123);
  const before = structuredClone(first);
  const second = stepRuntime(first, frame(0, 1));
  assert.deepEqual(first, before);
  assert.notEqual(second.player.x, first.player.x);
  const view = snapshotRuntime(second);
  view.player.x = 999;
  view.metrics.completedOrders = 999;
  assert.notEqual(second.player.x, 999);
  assert.equal(second.metrics.completedOrders, 0);
  recipe.additions.push('hot-potato');
  assert.deepEqual(first.recipe.additions, []);
});

void test('frame validation rejects gaps, duplicates, impossible controls, malformed angles and out-of-budget traces', () => {
  const state = createRuntime(baseRecipe, 123);
  for (const bad of [
    frame(1), frame(-1), frame(0.5), frame(0, -1), frame(0, 64), frame(0, 0.5),
    frame(0, 0, NaN), frame(0, 0, Infinity), frame(0, 0, 0, Infinity),
    frame(0, 0, 0, Math.PI), { tick: 0, buttons: 0, yaw: 0 },
  ]) assert.throws(() => stepRuntime(state, bad));
  const advanced = stepRuntime(state, frame(0));
  assert.throws(() => stepRuntime(advanced, frame(0)));
  assert.throws(() => replayRuntime(baseRecipe, 123, [frame(0), frame(2)]));
  assert.throws(() => replayRuntime(baseRecipe, 123, Array.from({ length: 3601 }, (_, tick) => frame(tick))));
});

void test('unsupported recipes and malformed seeds cannot enter a scored runtime', () => {
  const sparseAdditions = [];
  sparseAdditions.length = 1;
  for (const recipe of [
    { ...baseRecipe, fps: 'laser' },
    { ...baseRecipe, zombies: 'none' },
    { ...baseRecipe, cooking: 'cosmetic' },
    { ...baseRecipe, additions: ['hot-potato', 'hot-potato'] },
    { ...baseRecipe, additions: ['unpublished-card'] },
    { ...baseRecipe, additions: sparseAdditions },
  ]) assert.throws(() => createRuntime(recipe, 123));
  for (const seed of [NaN, Infinity, -1, 0.5]) assert.throws(() => createRuntime(baseRecipe, seed));
});

// The following tests set up narrow unit scenarios. Their constructed states
// are never used as build qualification or as completing witness evidence.
function scenario(recipe = baseRecipe, player = {}, zombies = []) {
  const state = createRuntime(recipe, 42);
  Object.assign(state.player, player);
  state.zombies = zombies.map(([x, y], index) => ({
    id: index + 100,
    x, y, hp: 2, stunnedUntilTick: 0,
    target: 'player', targetX: state.player.x, targetY: state.player.y, waypoint: null,
  }));
  return state;
}

function advance(state, ticks, buttons = 0, yaw = 0, pitch = 0) {
  for (let index = 0; index < ticks; index += 1) state = stepRuntime(state, frame(state.tick, buttons, yaw, pitch));
  return state;
}

void test('yaw-relative movement normalizes diagonal speed, cancels opposite keys, and collides with walls and counters', () => {
  const start = createRuntime(baseRecipe, 42);
  const straight = advance(start, 1, 1);
  const diagonal = advance(start, 1, 1 | 8);
  const rotated = advance(start, 1, 1, Math.PI / 2);
  const canceled = advance(start, 1, 1 | 2 | 4 | 8);
  assert.ok(Math.abs(Math.hypot(diagonal.player.x - 2, diagonal.player.y - 5) - (straight.player.x - 2)) < 0.000002);
  assert.equal(rotated.player.x, 2);
  assert.ok(rotated.player.y > 5);
  assert.equal(canceled.player.x, 2);
  assert.equal(canceled.player.y, 5);
  const wall = advance(start, 100, 1, Math.PI);
  assert.ok(wall.player.x >= RULES.playerRadius);
  assert.ok(wall.player.x < RULES.playerRadius + RULES.playerSpeed / 60);
  const counter = advance(scenario(baseRecipe, { x: 5, y: 5 }), 100, 1);
  assert.ok(counter.player.x <= 6.4 - RULES.playerRadius);
  assert.ok(counter.player.x > 6);
  assert.equal(counter.player.y, 5);
});

void test('a shot uses yaw and pitch, respects counter occlusion, and hits only the nearest visible zombie', () => {
  const initial = scenario(baseRecipe, {}, [[4, 5], [6, 5]]);
  const hit = advance(initial, 1, 16);
  assert.equal(hit.metrics.hits, 1);
  assert.equal(hit.zombies.find((zombie) => zombie.id === 100).hp, 1);
  assert.equal(hit.zombies.find((zombie) => zombie.id === 101).hp, 2);
  assert.equal(hit.events.filter((event) => event.type === 'hit').length, 1);
  assert.equal(advance(initial, 1, 16, Math.PI).metrics.hits, 0);
  assert.equal(advance(initial, 1, 16, 0, Math.PI / 3).metrics.hits, 0);
  assert.equal(advance(initial, 1, 16, 0, -Math.PI / 3).metrics.hits, 0);
  assert.equal(advance(initial, 1, 16, 0, Math.PI / 2).metrics.hits, 0);
  assert.equal(advance(initial, 1, 16, 0, -Math.PI / 2).metrics.hits, 0);
  assert.equal(advance(scenario(baseRecipe, { x: 5, y: 5 }, [[9, 5]]), 1, 16).metrics.hits, 0);
});

void test('public rules and world geometry are immutable, and renderer snapshots detach nested carry, path and drops', () => {
  assert.throws(() => { RULES.durationTicks = 1; }, TypeError);
  assert.throws(() => { BUTTONS.forward = 16; }, TypeError);
  assert.throws(() => { WORLD.counters[0].minX = 0; }, TypeError);
  assert.throws(() => { WORLD.stations[0].x = 0; }, TypeError);
  assert.throws(() => { WORLD.spawnPoints[0].x = 0; }, TypeError);
  const state = scenario(baseRecipe, { carry: { kind: 'raw', portions: 1, acquiredAtTick: 0 } }, [[4, 5]]);
  state.zombies[0].waypoint = { x: 4, y: 3 };
  state.drops = [{ id: 200, x: 3, y: 3, expiresAtTick: 100 }];
  const snapshot = snapshotRuntime(state);
  snapshot.player.carry.portions = 999;
  snapshot.zombies[0].waypoint.x = 999;
  snapshot.drops[0].x = 999;
  assert.equal(state.player.carry.portions, 1);
  assert.equal(state.zombies[0].waypoint.x, 4);
  assert.equal(state.drops[0].x, 3);
});

void test('idle controls still consume the full clock, stay within resource bounds and earn no invented score', () => {
  let state = createRuntime(baseRecipe, 42);
  const frames = Array.from({ length: 3600 }, (_, tick) => frame(tick));
  for (const input of frames) {
    state = stepRuntime(state, input);
    assert.ok(state.zombies.length <= RULES.maxZombies);
    assert.ok(state.drops.length <= RULES.pantryWorldDropCap);
    assert.ok(state.events.length <= RULES.maxEventsPerTick);
  }
  assert.equal(state.status, 'complete');
  assert.equal(state.tick, 3600);
  assert.equal(state.metrics.completedOrders, 0);
  assert.equal(state.metrics.failedOrders, 0);
  assert.equal(snapshotRuntime(state).remainingTicks, 0);
  assert.throws(() => stepRuntime(state, frame(3600)));
  assert.deepEqual(replayRuntime(baseRecipe, 42, frames), state);
});

void test('knockback moves a hit threat farther than the ricochet variant without tunneling through a counter', () => {
  const knockback = advance(scenario(baseRecipe, {}, [[4, 5]]), 1, 16);
  const ricochet = advance(scenario({ ...baseRecipe, fps: 'counter-ricochet' }, {}, [[4, 5]]), 1, 16);
  assert.ok(knockback.zombies[0].x - ricochet.zombies[0].x > 1.5);
  assert.equal(knockback.zombies[0].stunnedUntilTick, 1 + RULES.knockbackStunTicks);
  const blocked = advance(scenario(baseRecipe, {}, [[5.5, 5]]), 1, 16);
  assert.ok(blocked.zombies[0].x <= 6.4 - RULES.zombieRadius);
});

void test('the marked counter permits exactly one reflected hit only with counter ricochet', () => {
  // Reflect (9,3) across y=4: the ray to (9,5) meets the counter at (7,4).
  const yaw = Math.atan2(2, 4);
  const ricochet = advance(scenario({ ...baseRecipe, fps: 'counter-ricochet' }, { x: 5, y: 3 }, [[9, 3]]), 1, 16, yaw);
  const blocked = advance(scenario(baseRecipe, { x: 5, y: 3 }, [[9, 3]]), 1, 16, yaw);
  assert.equal(ricochet.metrics.ricochets, 1);
  assert.equal(ricochet.metrics.ricochetHits, 1);
  assert.equal(ricochet.metrics.hits, 1);
  assert.equal(ricochet.events.find((event) => event.type === 'hit').reflected, true);
  assert.equal(blocked.metrics.hits, 0);
  assert.equal(blocked.metrics.ricochets, 0);
});

void test('holding shoot or pressing during cooldown never grants duplicate shots or deferred hits', () => {
  let state = scenario(baseRecipe, {}, [[4, 5]]);
  state = advance(state, 60, 16);
  assert.equal(state.metrics.shotsFired, 1);
  assert.equal(state.metrics.hits, 1);
  state = advance(state, 1);
  state = advance(state, 1, 16);
  assert.equal(state.metrics.shotsFired, 2);
  assert.equal(state.metrics.hits, 2);
  let cooling = advance(createRuntime(baseRecipe, 42), 1, 16);
  cooling = advance(cooling, 1);
  cooling = advance(cooling, 40, 16);
  assert.equal(cooling.metrics.shotsFired, 1);
  cooling = advance(cooling, 1);
  cooling = advance(cooling, 1, 16);
  assert.equal(cooling.metrics.shotsFired, 2);
});

void test('interaction needs range and a new press; a held delivery cannot score twice', () => {
  assert.equal(advance(createRuntime(baseRecipe, 42), 1, 32).player.carry, null);
  let carrying = advance(scenario(baseRecipe, { x: 2, y: 3 }), 1, 32);
  assert.equal(carrying.player.carry.kind, 'raw');
  carrying.player.x = 5;
  carrying = advance(carrying, 10, 32);
  assert.equal(carrying.player.carry.kind, 'raw');
  carrying = advance(carrying, 1);
  carrying = advance(carrying, 1, 32);
  assert.equal(carrying.player.carry.kind, 'prepared');
  assert.equal(carrying.metrics.preparedPortions, 1);
  const delivered = advance(scenario(baseRecipe, {
    x: 11, y: 3, carry: { kind: 'dish', portions: 1, acquiredAtTick: 0 },
  }), 100, 32);
  assert.equal(delivered.metrics.completedOrders, 1);
  assert.equal(delivered.metrics.deliveredPortions, 1);
  assert.equal(delivered.player.carry, null);
});

void test('batch cooking requires two prepared portions and rejects a single-portion delivery', () => {
  const batch = { ...baseRecipe, cooking: 'batch-orders' };
  const prepared = { x: 8, y: 3, carry: { kind: 'prepared', portions: 1, acquiredAtTick: 0 } };
  const quick = advance(scenario(baseRecipe, prepared), 1, 32);
  let state = advance(scenario(batch, prepared), 1, 32);
  assert.equal(quick.stove.readyAtTick, 1 + RULES.quickCookTicks);
  assert.equal(state.stove.portions, 1);
  assert.equal(state.stove.readyAtTick, null);
  state = advance(state, 1);
  state.player.carry = { kind: 'prepared', portions: 1, acquiredAtTick: state.tick };
  state = advance(state, 1, 32);
  assert.equal(state.stove.portions, 2);
  assert.equal(state.stove.readyAtTick, state.tick + RULES.batchCookTicks);
  assert.equal(advance(scenario(batch, { x: 11, y: 3, carry: { kind: 'dish', portions: 1, acquiredAtTick: 0 } }), 1, 32).metrics.completedOrders, 0);
});

void test('cooking readiness and burn deadlines apply before collection on the boundary tick', () => {
  let state = scenario(baseRecipe, { x: 8, y: 3 });
  state.stove = { portions: 1, readyAtTick: 10, burnAtTick: 910 };
  state = advance(state, 9, 32);
  assert.equal(state.player.carry, null);
  state = advance(state, 1);
  assert.equal(state.metrics.cookedPortions, 1);
  state = advance(state, 1, 32);
  assert.equal(state.player.carry.kind, 'dish');
  let burning = scenario(baseRecipe, { x: 8, y: 3 });
  burning.tick = 909;
  burning.nextSpawnTick = 2000;
  burning.stove = { portions: 1, readyAtTick: 10, burnAtTick: 910 };
  burning = advance(burning, 1, 32);
  assert.equal(burning.player.carry, null);
  assert.equal(burning.metrics.burnedOrders, 1);
  assert.equal(burning.metrics.failedOrders, 1);
  assert.equal(advance(burning, 20).metrics.failedOrders, 1);
});

void test('Hot potato expires once at its published timer and cannot be delivered on the expiry tick', () => {
  const recipe = { ...baseRecipe, additions: ['hot-potato'] };
  function atDeadline(selected, tick) {
    const state = scenario(selected, { x: 11, y: 3, carry: { kind: 'dish', portions: 1, acquiredAtTick: 0 } });
    state.tick = tick;
    state.nextSpawnTick = 2000;
    return state;
  }
  const spoiled = advance(atDeadline(recipe, RULES.hotPotatoCarryTicks - 1), 1, 32);
  assert.equal(spoiled.metrics.completedOrders, 0);
  assert.equal(spoiled.metrics.timerSpoiledDishes, 1);
  assert.equal(spoiled.metrics.failedOrders, 1);
  assert.equal(advance(spoiled, 20).metrics.timerSpoiledDishes, 1);
  assert.equal(advance(atDeadline(recipe, RULES.hotPotatoCarryTicks - 2), 1, 32).metrics.completedOrders, 1);
  assert.equal(advance(atDeadline(baseRecipe, RULES.hotPotatoCarryTicks - 1), 1, 32).metrics.completedOrders, 1);
});

void test('zombie contact interrupts a carried order once per contact cooldown and never impersonates a Hot potato expiry', () => {
  let state = scenario({ ...baseRecipe, additions: ['hot-potato'] }, {
    carry: { kind: 'dish', portions: 1, acquiredAtTick: 0 },
  }, [[2.1, 5]]);
  state = advance(state, 1);
  assert.equal(state.player.carry, null);
  assert.equal(state.metrics.contactHits, 1);
  assert.equal(state.metrics.failedOrders, 1);
  assert.equal(state.metrics.timerSpoiledDishes, 0);
  assert.ok(state.player.slowedUntilTick > state.tick);
  state = advance(state, 20);
  assert.equal(state.metrics.contactHits, 1);
  assert.equal(state.metrics.failedOrders, 1);
});

void test('noise seekers redirect toward active cooking while pursuers keep following the player', () => {
  const setup = (zombies) => {
    const state = scenario({ ...baseRecipe, zombies }, { x: 2, y: 3 }, [[10, 3]]);
    state.stove = { portions: 1, readyAtTick: 100, burnAtTick: 1000 };
    return state;
  };
  const noise = advance(setup('noise-seekers'), 1);
  const pursuit = advance(setup('pursuers'), 1);
  assert.equal(noise.zombies[0].target, 'stove');
  assert.equal(noise.zombies[0].targetX, 8);
  assert.equal(noise.metrics.noiseSeekingTicks, 1);
  assert.equal(pursuit.zombies[0].target, 'player');
  assert.equal(pursuit.zombies[0].targetX, 2);
  assert.equal(pursuit.metrics.noiseSeekingTicks, 0);
  assert.equal(pursuit.metrics.pursuitTicks, 1);
  const quiet = setup('noise-seekers');
  quiet.stove = { portions: 0, readyAtTick: null, burnAtTick: null };
  assert.equal(advance(quiet, 1).zombies[0].target, 'player');
});

void test('Dinner bell redirects nearby threats after delivery, preserves distant pursuit and expires', () => {
  const recipe = { ...baseRecipe, additions: ['dinner-bell'] };
  const state = scenario(recipe, { x: 11, y: 3, carry: { kind: 'dish', portions: 1, acquiredAtTick: 0 } }, [[10, 4], [2, 9]]);
  const rang = advance(state, 1, 32);
  assert.equal(rang.metrics.completedOrders, 1);
  assert.equal(rang.metrics.dinnerBellActivations, 1);
  assert.equal(rang.metrics.bellAttractionTicks, 1);
  assert.equal(rang.zombies[0].target, 'bell');
  assert.equal(rang.zombies[1].target, 'player');
  assert.equal(rang.bell.untilTick, 1 + RULES.dinnerBellTicks);
  const expiry = structuredClone(rang);
  expiry.tick = expiry.bell.untilTick - 1;
  assert.equal(advance(expiry, 1).bell, null);
  const without = scenario(baseRecipe, state.player, [[10, 4]]);
  assert.equal(advance(without, 1, 32).zombies[0].target, 'player');
});

void test('Zombie pantry drops usable raw ingredients with finite ground, pickup and expiry limits', () => {
  const recipe = { ...baseRecipe, additions: ['zombie-pantry'] };
  let state = scenario(recipe, {}, [[4, 5]]);
  state.zombies[0].hp = 20;
  for (let index = 0; index < 5; index += 1) {
    state = advance(state, 1, 16);
    state = advance(state, RULES.shotCooldownTicks);
  }
  assert.ok(state.metrics.hits > 3);
  assert.equal(state.drops.length, RULES.pantryWorldDropCap);
  const picking = scenario(recipe, { x: 4, y: 3 });
  picking.metrics.pantryPickups = RULES.pantryPickupCap - 1;
  picking.drops = [{ id: 200, x: 4, y: 3, expiresAtTick: 100 }, { id: 201, x: 4, y: 3, expiresAtTick: 100 }];
  let picked = advance(picking, 1, 32);
  assert.equal(picked.player.carry.kind, 'raw');
  assert.equal(picked.metrics.pantryPickups, RULES.pantryPickupCap);
  picked = advance(picked, 1);
  picked.player.carry = null;
  picked = advance(picked, 1, 32);
  assert.equal(picked.player.carry, null);
  assert.equal(picked.metrics.pantryPickups, RULES.pantryPickupCap);
  const expiring = scenario(recipe, { x: 4, y: 3 });
  expiring.drops = [{ id: 200, x: 4, y: 3, expiresAtTick: 1 }];
  assert.equal(advance(expiring, 1, 32).player.carry, null);
  assert.equal(advance(scenario(baseRecipe, {}, [[4, 5]]), 1, 16).drops.length, 0);
});

void test('fresh authored qualification traces visibly exercise every selected rule even with all three additions combined', () => {
  for (const initial of initialRecipes) {
    const recipe = { ...initial, additions: ['dinner-bell', 'hot-potato', 'zombie-pantry'] };
    const contributions = [
      ...['fps', 'zombies', 'cooking'].map((slot) => ({ id: slot, kind: 'initial', choice: { cardId: recipe[slot] } })),
      ...recipe.additions.map((cardId) => ({ id: cardId, kind: 'addition', cardId })),
    ];
    const qualification = createQualification(recipe, contributions);
    const requiredMetric = {
      knockback: 'repelledZombies', 'counter-ricochet': 'ricochetHits',
      pursuers: 'pursuitTicks', 'noise-seekers': 'noiseSeekingTicks',
      'quick-orders': 'completedOrders', 'batch-orders': 'completedOrders',
      'dinner-bell': 'bellAttractionTicks', 'hot-potato': 'timerSpoiledDishes',
      'zombie-pantry': 'pantryPickups',
    };
    for (const contribution of contributions) {
      const card = contribution.kind === 'initial' ? contribution.choice.cardId : contribution.cardId;
      const witness = qualification.witnesses.find((item) => item.contributionId === contribution.id);
      const replayed = replayRuntime(recipe, qualification.seed, witness.frames);
      assert.ok(replayed.metrics[requiredMetric[card]] > 0, `Missing ${card} effect for ${JSON.stringify(recipe)}`);
    }
  }
});
