import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDinoMarioGame,
  stepDinoMarioGame,
  DINO_MARIO as C,
} from '../lib/party-forge/demos/dino-mario-v1.ts';

const start = (patch = {}) => ({
  ...createDinoMarioGame(),
  status: 'playing',
  ...patch,
});
const walker = (x) => ({ id: 50, kind: 'walker', x });
const block = (x) => ({ id: 51, kind: 'block', x });
const winningPresses = new Set([142, 289, 542, 689, 975, 1122, 1389]);
function complete(presses = winningPresses) {
  let game = start();
  const trace = [];
  while (game.status === 'playing') {
    game = stepDinoMarioGame(game, presses.has(game.tick));
    trace.push(game);
  }
  return { game, trace };
}

void test('one fixed course completes with seven jumps and four automatic stomp bounces', () => {
  const { game, trace } = complete();
  assert.equal(game.status, 'won');
  assert.equal(game.tick, C.finishTick);
  assert.equal(game.stomps, 4);
  assert.equal(game.encounters.length, 0);
  assert.ok(trace.some((s) => s.stomps === 1 && s.vy < 0));
  // No extra input after the first stomp: its bounce must clear the following block.
  assert.equal(trace[450].status, 'playing');
  assert.equal(
    trace[450].encounters.some((e) => e.id === 2),
    false,
  );
});

void test('removing the first jump from the same trace hits the first block', () => {
  const inputs = new Set(winningPresses);
  inputs.delete(142);
  const { game } = complete(inputs);
  assert.equal(game.status, 'lost');
  assert.equal(game.stomps, 0);
  assert.ok(game.tick < 200);
});

void test('a descending top contact removes one walker and changes vertical momentum', () => {
  const before = start({ feet: 225, vy: 8, encounters: [walker(130)] });
  const after = stepDinoMarioGame(before);
  assert.equal(after.stomps, 1);
  assert.equal(after.vy, C.bounce);
  assert.ok(after.feet < C.ground - 28);
  assert.equal(after.encounters.length, 0);
  assert.equal(stepDinoMarioGame(after).stomps, 1);
  assert.equal(before.encounters.length, 1, 'step cannot mutate its input');
});

void test('side, rising and underside contacts never become stomps', () => {
  for (const patch of [
    { feet: 245, vy: 1, encounters: [walker(142)] },
    { feet: 245, vy: -11, encounters: [walker(140)] },
    { feet: 300, vy: -6, encounters: [walker(120)] },
  ]) {
    const after = stepDinoMarioGame(start(patch));
    assert.equal(after.status, 'lost');
    assert.equal(after.stomps, 0);
  }
});

void test('relative contact timing rejects a walker that scrolls under too late', () => {
  const after = stepDinoMarioGame(
    start({ feet: 225, vy: 10, encounters: [walker(143)] }),
  );
  assert.equal(after.status, 'lost');
  assert.equal(after.stomps, 0);
  const missed = stepDinoMarioGame(
    start({ feet: 225, vy: 10, encounters: [walker(80)] }),
  );
  assert.equal(missed.status, 'playing');
  assert.equal(missed.stomps, 0);
});

void test('corner contact has no top-surface overlap and cannot earn a stomp', () => {
  const after = stepDinoMarioGame(
    start({ feet: 229, vy: 0.4, encounters: [walker(143)] }),
  );
  assert.equal(after.status, 'lost');
  assert.equal(after.stomps, 0);
});

void test('departing corner with zero horizontal overlap is a near miss', () => {
  const after = stepDinoMarioGame(
    start({ feet: 229, vy: 0.4, encounters: [walker(85)] }),
  );
  assert.equal(after.status, 'playing');
  assert.equal(after.stomps, 0);
  assert.equal(after.encounters.length, 1);
});

void test('falling onto a block loses even when the same approach stomps a walker', () => {
  const after = stepDinoMarioGame(
    start({ feet: 216, vy: 8, encounters: [block(130)] }),
  );
  assert.equal(after.status, 'lost');
  assert.equal(after.stomps, 0);
});

void test('holding Jump never auto-jumps on landing; release and fresh press work', () => {
  let game = start({ encounters: [] });
  for (let tick = 0; tick < 80; tick++) game = stepDinoMarioGame(game, true);
  assert.equal(game.feet, C.ground);
  assert.equal(game.vy, 0);
  game = stepDinoMarioGame(game, false);
  game = stepDinoMarioGame(game, true);
  assert.ok(game.feet < C.ground);
  assert.ok(game.vy < 0);
});

void test('ready and terminal states are inert, and a fresh game restores the exact course', () => {
  const ready = createDinoMarioGame();
  assert.equal(stepDinoMarioGame(ready, true), ready);
  const { game } = complete();
  assert.equal(stepDinoMarioGame(game, true), game);
  const lost = stepDinoMarioGame(start({ encounters: [block(141)] }));
  assert.equal(stepDinoMarioGame(lost, true), lost);
  assert.deepEqual(createDinoMarioGame(), ready);
});

void test('collision on the finishing tick wins over course completion', () => {
  const after = stepDinoMarioGame(
    start({ tick: C.finishTick - 1, encounters: [block(141)] }),
  );
  assert.equal(after.status, 'lost');
});

void test('retained recipe and identical input produce identical complete state traces', () => {
  assert.deepEqual(complete(), complete());
});
