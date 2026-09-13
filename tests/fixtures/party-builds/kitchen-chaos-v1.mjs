// Authored automated local input traces for Kitchen Chaos v1 qualification.
// These fixtures are simulation evidence, never observed external playtests.
import {
  createRuntime,
  snapshotRuntime,
  stepRuntime,
} from '../../../lib/party-forge/runtimes/kitchen-chaos-v1/engine.ts';

export const FIXTURE_PROVENANCE = Object.freeze({
  kind: 'authored-automated-local-trace',
  externalPlayEvidence: false,
  runtimeVersion: 'kitchen-chaos-v1',
  description:
    'A deterministic fixture controller authors legal player inputs from a fresh runtime; this is local automated qualification, not a human playtest.',
});

const additions = ['dinner-bell', 'hot-potato', 'zombie-pantry'];

function sequences(prefix, remaining) {
  return [prefix, ...remaining.flatMap((card) =>
    sequences([...prefix, card], remaining.filter((other) => other !== card)),
  )];
}

export const additionSequences = sequences([], additions);
export const initialRecipes = ['knockback', 'counter-ricochet'].flatMap((fps) =>
  ['pursuers', 'noise-seekers'].flatMap((zombies) =>
    ['quick-orders', 'batch-orders'].map((cooking) => ({
      fps,
      zombies,
      cooking,
      additions: [],
    })),
  ),
);

class AuthoredController {
  constructor(recipe, seed) {
    this.state = createRuntime(recipe, seed);
    this.frames = [];
  }

  input(buttons = 0, yaw = 0, pitch = 0) {
    if (this.frames.length >= 3600) {
      throw new Error('Authored fixture exhausted its sixty-second input budget.');
    }
    const frame = { tick: this.frames.length, buttons, yaw, pitch };
    this.state = stepRuntime(this.state, frame);
    this.frames.push(frame);
  }

  wait(ticks) {
    const endTick = this.state.tick + ticks;
    while (this.state.tick < endTick) this.safeInput();
  }

  safeInput(buttons = 0, yaw = 0) {
    const nearby = this.state.zombies
      .filter((zombie) => Math.hypot(zombie.x - this.state.player.x, zombie.y - this.state.player.y) < 4)
      .sort((a, b) => Math.hypot(a.x - this.state.player.x, a.y - this.state.player.y) -
        Math.hypot(b.x - this.state.player.x, b.y - this.state.player.y))[0];
    if (nearby && this.state.tick % 20 === 0) {
      this.input(16, Math.atan2(nearby.y - this.state.player.y, nearby.x - this.state.player.x));
    } else {
      this.input(buttons, yaw);
    }
  }

  interact() {
    this.input(32);
    this.input();
  }

  moveTo(x, y) {
    let budget = 450;
    while (Math.hypot(this.state.player.x - x, this.state.player.y - y) > 0.06) {
      if (--budget <= 0) {
        throw new Error(`Authored route blocked en route to ${x},${y}.`);
      }
      this.safeInput(1, Math.atan2(y - this.state.player.y, x - this.state.player.x));
    }
  }

  prepareOrder() {
    const portions = this.state.recipe.cooking === 'batch-orders' ? 2 : 1;
    for (let portion = 0; portion < portions; portion += 1) {
      this.moveTo(2, 2.95);
      this.interact();
      this.moveTo(5, 2.95);
      this.interact();
      this.moveTo(8, 2.95);
      // An active first cook after zombie spawning witnesses noise attraction.
      if (this.state.tick < 480) this.wait(480 - this.state.tick);
      this.interact();
    }
    while (this.state.stove.readyAtTick !== null && this.state.tick < this.state.stove.readyAtTick + 1) {
      this.safeInput();
    }
    this.interact();
    if (this.state.player.carry?.kind !== 'dish') {
      throw new Error('Authored fixture failed to collect its cooked dish.');
    }
  }

  finish() {
    while (this.frames.length < 3600) this.safeInput();
    return this;
  }
}

function reflectedAim(player, zombie) {
  const sides = [
    { axis: 'x', edge: 6.4, low: 4.05, high: 5.95, sign: -1 },
    { axis: 'x', edge: 7.6, low: 4.05, high: 5.95, sign: 1 },
    { axis: 'y', edge: 4, low: 6.45, high: 7.55, sign: -1 },
    { axis: 'y', edge: 6, low: 6.45, high: 7.55, sign: 1 },
  ];
  for (const side of sides) {
    const other = side.axis === 'x' ? 'y' : 'x';
    if ((player[side.axis] - side.edge) * side.sign <= 0 ||
        (zombie[side.axis] - side.edge) * side.sign <= 0) continue;
    const reflected = { ...zombie, [side.axis]: 2 * side.edge - zombie[side.axis] };
    const ratio = (side.edge - player[side.axis]) / (reflected[side.axis] - player[side.axis]);
    const intersection = player[other] + ratio * (reflected[other] - player[other]);
    if (intersection >= side.low && intersection <= side.high) {
      return Math.atan2(reflected.y - player.y, reflected.x - player.x);
    }
  }
  return null;
}

function createRicochetFrames(recipe, seed) {
  const controller = new AuthoredController(recipe, seed);
  // Travel around the marked counter and aim at reflected zombie positions.
  // Every shot remains an ordinary yaw/pitch input into the fresh runtime.
  const route = [[2, 3], [10, 3], [10, 7], [4, 7], [4, 3]];
  let waypoint = 0;
  while (controller.frames.length < 3600) {
    const target = route[waypoint];
    if (Math.hypot(controller.state.player.x - target[0], controller.state.player.y - target[1]) < 0.1) {
      waypoint = (waypoint + 1) % route.length;
    }
    const yaw = controller.state.zombies
      .map((zombie) => reflectedAim(controller.state.player, zombie))
      .find((angle) => angle !== null);
    if (yaw !== undefined && controller.state.tick % 20 === 0) controller.input(16, yaw);
    else controller.input(1, Math.atan2(target[1] - controller.state.player.y, target[0] - controller.state.player.x));
  }
  return controller.frames;
}

function createSpoilFrames(recipe, seed) {
  const controller = new AuthoredController(recipe, seed);
  controller.prepareOrder();
  controller.finish();
  return controller.frames;
}

function createBellFrames(recipe, seed) {
  const controller = new AuthoredController(recipe, seed);
  controller.prepareOrder();
  controller.moveTo(11, 2.95);
  while (!controller.state.zombies.some((zombie) => Math.hypot(zombie.x - 11, zombie.y - 2) < 7)) {
    controller.input();
  }
  controller.interact();
  controller.finish();
  return controller.frames;
}

function createPantryFrames(recipe, seed) {
  const controller = new AuthoredController(recipe, seed);
  controller.moveTo(2, 2.95);
  controller.moveTo(10, 2.95);
  while (controller.state.drops.length === 0) controller.safeInput();
  const drop = controller.state.drops[0];
  controller.moveTo(drop.x, drop.y);
  controller.interact();
  controller.finish();
  return controller.frames;
}

export function createCompletingWitness(recipe, seed = 20260913) {
  const controller = new AuthoredController(recipe, seed);
  controller.prepareOrder();
  controller.moveTo(11, 2.95);
  controller.interact();
  controller.finish();
  return {
    provenance: FIXTURE_PROVENANCE,
    recipe: structuredClone(recipe),
    seed,
    frames: controller.frames,
    snapshot: snapshotRuntime(controller.state),
  };
}

export function createQualification(recipe, contributions, seed = 20260913) {
  const witness = createCompletingWitness(recipe, seed);
  const specialFrames = new Map();
  return {
    seed,
    completingFrames: witness.frames,
    witnesses: contributions.map((contribution) => {
      const card = contribution.kind === 'initial' ? contribution.choice.cardId : contribution.cardId;
      if (card === 'counter-ricochet' && !specialFrames.has(card)) {
        specialFrames.set(card, createRicochetFrames(recipe, seed));
      }
      if (card === 'hot-potato' && !specialFrames.has(card)) {
        specialFrames.set(card, createSpoilFrames(recipe, seed));
      }
      if (card === 'dinner-bell' && !specialFrames.has(card)) {
        specialFrames.set(card, createBellFrames(recipe, seed));
      }
      if (card === 'zombie-pantry' && !specialFrames.has(card)) {
        specialFrames.set(card, createPantryFrames(recipe, seed));
      }
      return { contributionId: contribution.id, frames: specialFrames.get(card) ?? witness.frames };
    }),
  };
}
