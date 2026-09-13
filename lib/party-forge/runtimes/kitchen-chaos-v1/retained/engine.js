/**
 * Authored Kitchen Chaos simulation. Coordinates are metres on an x/y floor;
 * z is height, yaw 0 faces +x, and positive pitch aims upward. A frame consumes
 * exactly one 1/60 second step. There are no wall-clock or platform inputs.
 *
 * This module is deliberately standalone: retained JS bytes, recipe and seed
 * are sufficient to replay a saved build. Public constants are deeply frozen.
 * Server scoring must replay from createRuntime, never accept client state.
 */
export const RUNTIME_VERSION = 'kitchen-chaos-v1';
export const BUTTONS = Object.freeze({ forward: 1, back: 2, left: 4, right: 8, shoot: 16, interact: 32 });
export const RULES = Object.freeze({
    ticksPerSecond: 60,
    durationTicks: 3_600,
    positionPrecision: 1_000_000,
    maxYaw: Math.PI,
    maxPitch: Math.PI / 2,
    maxButtons: 63,
    playerRadius: 0.28,
    playerSpeed: 3.6,
    eyeHeight: 1.25,
    interactionReach: 1.15,
    shotRange: 20,
    shotCooldownTicks: 18,
    shotDamage: 1,
    knockbackDistance: 2,
    knockbackStunTicks: 60,
    ricochetPushDistance: 0.25,
    ricochetStunTicks: 15,
    maxShotBounces: 1,
    zombieRadius: 0.3,
    zombieHeight: 1.7,
    zombieHealth: 2,
    zombieSpeed: 0.8,
    firstSpawnTick: 420,
    spawnIntervalTicks: 360,
    spawnJitter: 0.15,
    maxZombies: 10,
    contactCooldownTicks: 120,
    contactSlowTicks: 30,
    contactSpeedMultiplier: 0.5,
    contactPushDistance: 0.55,
    quickOrderPortions: 1,
    batchOrderPortions: 2,
    quickCookTicks: 150,
    batchCookTicks: 240,
    burnAfterReadyTicks: 900,
    hotPotatoCarryTicks: 600,
    dinnerBellTicks: 360,
    dinnerBellRadius: 7,
    pantryPickupCap: 6,
    pantryWorldDropCap: 3,
    pantryDropLifetimeTicks: 900,
    pantryPickupReach: 1.15,
    additionStackCap: 1,
    maxAdditions: 3,
    maxEventsPerTick: 64,
    rayEpsilon: 0.000_01,
    waypointMargin: 0.05,
});
export const WORLD = Object.freeze({
    width: 14,
    height: 10,
    ceilingHeight: 3,
    playerStart: Object.freeze({ x: 2, y: 5 }),
    stations: Object.freeze([
        Object.freeze({ id: 'ingredient', x: 2, y: 2 }),
        Object.freeze({ id: 'prep', x: 5, y: 2 }),
        Object.freeze({ id: 'stove', x: 8, y: 2 }),
        Object.freeze({ id: 'delivery', x: 11, y: 2 }),
    ]),
    counters: Object.freeze([
        Object.freeze({ id: 'ingredient-counter', minX: 1.4, maxX: 2.6, minY: 0.4, maxY: 1.2, height: 1, ricochet: false }),
        Object.freeze({ id: 'prep-counter', minX: 4.4, maxX: 5.6, minY: 0.4, maxY: 1.2, height: 1, ricochet: false }),
        Object.freeze({ id: 'stove-counter', minX: 7.4, maxX: 8.6, minY: 0.4, maxY: 1.2, height: 1, ricochet: false }),
        Object.freeze({ id: 'delivery-counter', minX: 10.4, maxX: 11.6, minY: 0.4, maxY: 1.2, height: 1, ricochet: false }),
        Object.freeze({ id: 'marked-counter', minX: 6.4, maxX: 7.6, minY: 4, maxY: 6, height: 1.6, ricochet: true }),
    ]),
    spawnPoints: Object.freeze([
        Object.freeze({ x: 13, y: 3 }), Object.freeze({ x: 13, y: 8 }),
        Object.freeze({ x: 2, y: 9 }), Object.freeze({ x: 10, y: 9 }),
    ]),
});
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const quantize = (value) => Math.round(value * RULES.positionPrecision) / RULES.positionPrecision;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const portionsFor = (recipe) => recipe.cooking === 'quick-orders' ? RULES.quickOrderPortions : RULES.batchOrderPortions;
const hasAddition = (state, addition) => state.recipe.additions.includes(addition);
function validateRecipe(recipe) {
    if (!recipe || !['knockback', 'counter-ricochet'].includes(recipe.fps) ||
        !['pursuers', 'noise-seekers'].includes(recipe.zombies) ||
        !['quick-orders', 'batch-orders'].includes(recipe.cooking) || !Array.isArray(recipe.additions) ||
        recipe.additions.length > RULES.maxAdditions || new Set(recipe.additions).size !== recipe.additions.length ||
        Array.from(recipe.additions).some((addition) => !['dinner-bell', 'hot-potato', 'zombie-pantry'].includes(addition))) {
        throw new RangeError('Unsupported Kitchen Chaos recipe or addition stack.');
    }
}
/** Throws before advancing on non-contiguous, non-finite or unbounded inputs. */
function validateFrame(state, frame) {
    if (!frame || !Number.isInteger(frame.tick) || frame.tick !== state.tick ||
        state.status !== 'running' || frame.tick >= RULES.durationTicks ||
        !Number.isInteger(frame.buttons) || frame.buttons < 0 || frame.buttons > RULES.maxButtons ||
        !Number.isFinite(frame.yaw) || Math.abs(frame.yaw) > RULES.maxYaw ||
        !Number.isFinite(frame.pitch) || Math.abs(frame.pitch) > RULES.maxPitch) {
        throw new RangeError('Expected one bounded input frame at the next running tick.');
    }
}
export function createRuntime(recipe, seed) {
    validateRecipe(recipe);
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff)
        throw new RangeError('Seed must be a uint32.');
    return {
        runtimeVersion: RUNTIME_VERSION,
        recipe: { ...recipe, additions: [...recipe.additions] },
        seed, rng: seed || 0x9e37_79b9, tick: 0, status: 'running', previousButtons: 0,
        nextShotTick: 0, nextSpawnTick: RULES.firstSpawnTick, nextEntityId: 1,
        player: { ...WORLD.playerStart, yaw: 0, pitch: 0, carry: null, slowedUntilTick: 0, contactReadyTick: 0 },
        stove: { portions: 0, readyAtTick: null, burnAtTick: null }, bell: null, zombies: [], drops: [],
        metrics: {
            completedOrders: 0, failedOrders: 0, deliveredPortions: 0, preparedPortions: 0, cookedPortions: 0,
            shotsFired: 0, hits: 0, ricochets: 0, ricochetHits: 0, repelledZombies: 0,
            pantryDrops: 0, pantryPickups: 0, contactHits: 0, spoiledDishes: 0, timerSpoiledDishes: 0, burnedOrders: 0,
            dinnerBellActivations: 0, pursuitTicks: 0, noiseSeekingTicks: 0, bellAttractionTicks: 0,
        },
        events: [],
    };
}
function cloneState(state) {
    return {
        ...state, recipe: { ...state.recipe, additions: [...state.recipe.additions] },
        player: { ...state.player, carry: state.player.carry ? { ...state.player.carry } : null },
        stove: { ...state.stove }, bell: state.bell ? { ...state.bell } : null,
        zombies: state.zombies.map((zombie) => ({ ...zombie, waypoint: zombie.waypoint ? { ...zombie.waypoint } : null })),
        drops: state.drops.map((drop) => ({ ...drop })), metrics: { ...state.metrics },
        events: state.events.map((event) => ({ ...event })),
    };
}
export function snapshotRuntime(state) {
    return { ...cloneState(state), remainingTicks: RULES.durationTicks - state.tick };
}
export function resetRuntime(state) {
    return createRuntime(state.recipe, state.seed);
}
function emit(state, event) {
    if (state.events.length < RULES.maxEventsPerTick)
        state.events.push({ ...event, tick: state.tick });
}
function random(state) {
    let value = state.rng;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    state.rng = value >>> 0;
    return state.rng / 0x1_0000_0000;
}
function canOccupy(point, radius) {
    return point.x >= radius && point.x <= WORLD.width - radius && point.y >= radius && point.y <= WORLD.height - radius &&
        WORLD.counters.every((counter) => {
            const nearestX = clamp(point.x, counter.minX, counter.maxX);
            const nearestY = clamp(point.y, counter.minY, counter.maxY);
            return Math.hypot(point.x - nearestX, point.y - nearestY) >= radius;
        });
}
/** Substeps also prevent a knockback from tunnelling through a thin counter. */
function move(point, deltaX, deltaY, radius) {
    const steps = Math.max(1, Math.ceil(Math.hypot(deltaX, deltaY) / (radius / 2)));
    for (let step = 0; step < steps; step += 1) {
        const x = quantize(clamp(point.x + deltaX / steps, radius, WORLD.width - radius));
        if (canOccupy({ x, y: point.y }, radius))
            point.x = x;
        const y = quantize(clamp(point.y + deltaY / steps, radius, WORLD.height - radius));
        if (canOccupy({ x: point.x, y }, radius))
            point.y = y;
    }
}
/** Slab intersection with a closed box; direction is unit length. */
function rayBox(ray, low, high) {
    const origin = [ray.x, ray.y, ray.z];
    const direction = [ray.dx, ray.dy, ray.dz];
    let near = -Infinity;
    let far = Infinity;
    let normal = [0, 0, 0];
    for (let axis = 0; axis < 3; axis += 1) {
        if (Math.abs(direction[axis]) < RULES.rayEpsilon) {
            if (origin[axis] < low[axis] || origin[axis] > high[axis])
                return null;
            continue;
        }
        const first = (low[axis] - origin[axis]) / direction[axis];
        const second = (high[axis] - origin[axis]) / direction[axis];
        const entry = Math.min(first, second);
        if (entry > near) {
            near = entry;
            normal = [0, 0, 0];
            normal[axis] = first < second ? -1 : 1;
        }
        far = Math.min(far, Math.max(first, second));
        if (near > far)
            return null;
    }
    if (far < RULES.rayEpsilon)
        return null;
    return { distance: Math.max(0, near), nx: normal[0], ny: normal[1], nz: normal[2], ricochet: false };
}
function nearestSurface(ray) {
    let nearest = { distance: RULES.shotRange, nx: 0, ny: 0, nz: 0, ricochet: false };
    for (const counter of WORLD.counters) {
        const hit = rayBox(ray, [counter.minX, counter.minY, 0], [counter.maxX, counter.maxY, counter.height]);
        if (hit && hit.distance < nearest.distance)
            nearest = { ...hit, ricochet: counter.ricochet };
    }
    // The containing room's exit planes are walls, floor and ceiling (no bounce).
    for (const [origin, direction, extent, axis] of [
        [ray.x, ray.dx, WORLD.width, 0], [ray.y, ray.dy, WORLD.height, 1], [ray.z, ray.dz, WORLD.ceilingHeight, 2],
    ]) {
        if (Math.abs(direction) < RULES.rayEpsilon)
            continue;
        const at = ((direction > 0 ? extent : 0) - origin) / direction;
        if (at >= 0 && at < nearest.distance) {
            nearest = { distance: at, nx: axis === 0 ? -Math.sign(direction) : 0, ny: axis === 1 ? -Math.sign(direction) : 0, nz: axis === 2 ? -Math.sign(direction) : 0, ricochet: false };
        }
    }
    return nearest;
}
/** Intersect the finite upright cylinder, including its top/bottom caps. */
function rayZombie(ray, zombie) {
    const x = ray.x - zombie.x;
    const y = ray.y - zombie.y;
    const a = ray.dx * ray.dx + ray.dy * ray.dy;
    const b = 2 * (x * ray.dx + y * ray.dy);
    const c = x * x + y * y - RULES.zombieRadius * RULES.zombieRadius;
    if (a < RULES.rayEpsilon * RULES.rayEpsilon) {
        if (c > 0 || Math.abs(ray.dz) < RULES.rayEpsilon)
            return null;
        const floor = -ray.z / ray.dz;
        const top = (RULES.zombieHeight - ray.z) / ray.dz;
        const low = Math.max(0, Math.min(floor, top));
        return low <= Math.max(floor, top) ? low : null;
    }
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0 || a <= 0)
        return null;
    const root = Math.sqrt(discriminant);
    let low = Math.max(0, (-b - root) / (2 * a));
    let high = (-b + root) / (2 * a);
    if (Math.abs(ray.dz) < RULES.rayEpsilon) {
        if (ray.z < 0 || ray.z > RULES.zombieHeight)
            return null;
    }
    else {
        const atFloor = -ray.z / ray.dz;
        const atTop = (RULES.zombieHeight - ray.z) / ray.dz;
        low = Math.max(low, Math.min(atFloor, atTop));
        high = Math.min(high, Math.max(atFloor, atTop));
    }
    return low <= high ? low : null;
}
function addPantryDrop(state, zombie) {
    if (!hasAddition(state, 'zombie-pantry') || state.metrics.pantryPickups + state.drops.length >= RULES.pantryPickupCap || state.drops.length >= RULES.pantryWorldDropCap)
        return;
    const drop = { id: state.nextEntityId++, x: zombie.x, y: zombie.y, expiresAtTick: state.tick + RULES.pantryDropLifetimeTicks };
    state.drops.push(drop);
    state.metrics.pantryDrops += 1;
    emit(state, { type: 'pantry_dropped', entityId: drop.id, x: drop.x, y: drop.y });
}
function shoot(state) {
    state.nextShotTick = state.tick + RULES.shotCooldownTicks;
    state.metrics.shotsFired += 1;
    let ray = {
        x: state.player.x, y: state.player.y, z: RULES.eyeHeight,
        dx: Math.cos(state.player.yaw) * Math.cos(state.player.pitch),
        dy: Math.sin(state.player.yaw) * Math.cos(state.player.pitch), dz: Math.sin(state.player.pitch),
    };
    let remaining = RULES.shotRange;
    emit(state, { type: 'shot', x: ray.x, y: ray.y, z: ray.z });
    for (let bounce = 0; bounce <= RULES.maxShotBounces; bounce += 1) {
        const surface = nearestSurface(ray);
        let nearestDistance = Math.min(remaining, surface.distance);
        let target = null;
        for (const zombie of state.zombies) {
            const hit = rayZombie(ray, zombie);
            // A surface wins equal-distance intersections: never shoot through cover.
            if (hit !== null && hit < nearestDistance) {
                target = zombie;
                nearestDistance = hit;
            }
        }
        if (target) {
            state.metrics.hits += 1;
            state.metrics.repelledZombies += 1;
            if (bounce > 0)
                state.metrics.ricochetHits += 1;
            emit(state, { type: 'hit', entityId: target.id, x: quantize(ray.x + ray.dx * nearestDistance), y: quantize(ray.y + ray.dy * nearestDistance), z: quantize(ray.z + ray.dz * nearestDistance), reflected: bounce > 0 });
            target.hp -= RULES.shotDamage;
            // Pantry drops at the contact point before displacement, so a successful
            // defensive shot creates a reachable ingredient, capped across the trial.
            addPantryDrop(state, target);
            const push = state.recipe.fps === 'knockback' ? RULES.knockbackDistance : RULES.ricochetPushDistance;
            const horizontal = Math.hypot(ray.dx, ray.dy);
            const pushX = horizontal < RULES.rayEpsilon ? Math.cos(state.player.yaw) : ray.dx / horizontal;
            const pushY = horizontal < RULES.rayEpsilon ? Math.sin(state.player.yaw) : ray.dy / horizontal;
            move(target, pushX * push, pushY * push, RULES.zombieRadius);
            target.stunnedUntilTick = state.tick + (state.recipe.fps === 'knockback' ? RULES.knockbackStunTicks : RULES.ricochetStunTicks);
            target.waypoint = null;
            emit(state, { type: 'zombie_repelled', entityId: target.id, x: target.x, y: target.y });
            if (target.hp <= 0)
                state.zombies = state.zombies.filter((zombie) => zombie.id !== target.id);
            return; // Exactly one zombie can be hit by one shot, including a bounce.
        }
        if (state.recipe.fps !== 'counter-ricochet' || !surface.ricochet || surface.distance >= remaining || bounce === RULES.maxShotBounces)
            return;
        state.metrics.ricochets += 1;
        const x = ray.x + ray.dx * surface.distance;
        const y = ray.y + ray.dy * surface.distance;
        const z = ray.z + ray.dz * surface.distance;
        emit(state, { type: 'ricochet', x: quantize(x), y: quantize(y), z: quantize(z) });
        const dot = ray.dx * surface.nx + ray.dy * surface.ny + ray.dz * surface.nz;
        const dx = ray.dx - 2 * dot * surface.nx;
        const dy = ray.dy - 2 * dot * surface.ny;
        const dz = ray.dz - 2 * dot * surface.nz;
        remaining -= surface.distance + RULES.rayEpsilon;
        ray = { x: x + dx * RULES.rayEpsilon, y: y + dy * RULES.rayEpsilon, z: z + dz * RULES.rayEpsilon, dx, dy, dz };
    }
}
function spoilCarry(state, reason) {
    if (state.player.carry?.kind !== 'dish')
        return;
    state.metrics.failedOrders += 1;
    state.metrics.spoiledDishes += 1;
    if (reason === 'timer')
        state.metrics.timerSpoiledDishes += 1;
    emit(state, { type: 'dish_spoiled', portions: state.player.carry.portions, reason });
    state.player.carry = null;
}
function interact(state) {
    if (!state.player.carry && state.metrics.pantryPickups < RULES.pantryPickupCap) {
        const nearby = state.drops.filter((drop) => distance(drop, state.player) <= RULES.pantryPickupReach).sort((a, b) => distance(a, state.player) - distance(b, state.player) || a.id - b.id)[0];
        if (nearby) {
            state.player.carry = { kind: 'raw', portions: 1, acquiredAtTick: state.tick };
            state.drops = state.drops.filter((drop) => drop.id !== nearby.id);
            state.metrics.pantryPickups += 1;
            emit(state, { type: 'pantry_picked', entityId: nearby.id, x: nearby.x, y: nearby.y });
            return;
        }
    }
    const station = WORLD.stations.find((candidate) => distance(candidate, state.player) <= RULES.interactionReach);
    if (!station)
        return;
    if (station.id === 'ingredient' && !state.player.carry) {
        state.player.carry = { kind: 'raw', portions: 1, acquiredAtTick: state.tick };
        emit(state, { type: 'ingredient_picked', portions: 1 });
    }
    else if (station.id === 'prep' && state.player.carry?.kind === 'raw') {
        state.player.carry = { ...state.player.carry, kind: 'prepared' };
        state.metrics.preparedPortions += 1;
        emit(state, { type: 'prepared', portions: 1 });
    }
    else if (station.id === 'stove') {
        if (state.player.carry?.kind === 'prepared' && state.stove.readyAtTick === null && state.stove.portions < portionsFor(state.recipe)) {
            state.stove.portions += 1;
            state.player.carry = null;
            emit(state, { type: 'cook_loaded', portions: state.stove.portions });
            if (state.stove.portions === portionsFor(state.recipe)) {
                const cookingTicks = state.recipe.cooking === 'quick-orders' ? RULES.quickCookTicks : RULES.batchCookTicks;
                state.stove.readyAtTick = state.tick + cookingTicks;
                state.stove.burnAtTick = state.stove.readyAtTick + RULES.burnAfterReadyTicks;
                emit(state, { type: 'cook_started', portions: state.stove.portions });
            }
        }
        else if (!state.player.carry && state.stove.readyAtTick !== null && state.tick >= state.stove.readyAtTick) {
            state.player.carry = { kind: 'dish', portions: state.stove.portions, acquiredAtTick: state.tick };
            emit(state, { type: 'dish_collected', portions: state.stove.portions });
            state.stove = { portions: 0, readyAtTick: null, burnAtTick: null };
        }
    }
    else if (station.id === 'delivery' && state.player.carry?.kind === 'dish' && state.player.carry.portions === portionsFor(state.recipe)) {
        state.metrics.completedOrders += 1;
        state.metrics.deliveredPortions += state.player.carry.portions;
        emit(state, { type: 'order_delivered', portions: state.player.carry.portions });
        state.player.carry = null;
        if (hasAddition(state, 'dinner-bell')) {
            state.bell = { x: station.x, y: station.y, untilTick: state.tick + RULES.dinnerBellTicks };
            state.metrics.dinnerBellActivations += 1;
            emit(state, { type: 'bell_rang', x: station.x, y: station.y });
        }
    }
}
/** Conservative visibility for path planning with the moving body's radius. */
function blockedPath(from, to, radius) {
    const length = distance(from, to);
    if (length < RULES.rayEpsilon)
        return null;
    const ray = { x: from.x, y: from.y, z: 0.5, dx: (to.x - from.x) / length, dy: (to.y - from.y) / length, dz: 0 };
    let nearest = null;
    let nearestDistance = length;
    for (const counter of WORLD.counters) {
        const hit = rayBox(ray, [counter.minX - radius, counter.minY - radius, 0], [counter.maxX + radius, counter.maxY + radius, WORLD.ceilingHeight]);
        if (hit && hit.distance < nearestDistance) {
            nearest = counter;
            nearestDistance = hit.distance;
        }
    }
    return nearest;
}
function zombieDestination(zombie, target) {
    const obstacle = blockedPath(zombie, target, RULES.zombieRadius);
    if (!obstacle) {
        zombie.waypoint = null;
        return target;
    }
    if (zombie.waypoint && distance(zombie, zombie.waypoint) > RULES.waypointMargin)
        return zombie.waypoint;
    const margin = RULES.zombieRadius + RULES.waypointMargin;
    const corners = [
        { x: obstacle.minX - margin, y: obstacle.minY - margin },
        { x: obstacle.maxX + margin, y: obstacle.minY - margin },
        { x: obstacle.minX - margin, y: obstacle.maxY + margin },
        { x: obstacle.maxX + margin, y: obstacle.maxY + margin },
    ];
    const options = corners.filter((corner) => distance(zombie, corner) > RULES.waypointMargin && canOccupy(corner, RULES.zombieRadius) && !blockedPath(zombie, corner, RULES.zombieRadius));
    // Prefer a visible exit corner; otherwise route to a visible entry corner.
    options.sort((a, b) => {
        const estimate = (point) => distance(zombie, point) + distance(point, target) + (blockedPath(point, target, RULES.zombieRadius) ? 2 : 0);
        return estimate(a) - estimate(b) || a.y - b.y || a.x - b.x;
    });
    zombie.waypoint = options[0] ?? null;
    return zombie.waypoint ?? target;
}
function updateZombies(state) {
    if (state.tick >= state.nextSpawnTick) {
        state.nextSpawnTick += RULES.spawnIntervalTicks;
        // Consume identical RNG values even at the entity cap.
        const spawn = WORLD.spawnPoints[Math.floor(random(state) * WORLD.spawnPoints.length)];
        const x = quantize(spawn.x + (random(state) * 2 - 1) * RULES.spawnJitter);
        const y = quantize(spawn.y + (random(state) * 2 - 1) * RULES.spawnJitter);
        if (state.zombies.length < RULES.maxZombies) {
            const zombie = { id: state.nextEntityId++, x, y, hp: RULES.zombieHealth, stunnedUntilTick: 0, target: 'player', targetX: state.player.x, targetY: state.player.y, waypoint: null };
            state.zombies.push(zombie);
            emit(state, { type: 'zombie_spawned', entityId: zombie.id, x, y });
        }
    }
    for (const zombie of state.zombies) {
        let target = state.player;
        let kind = 'player';
        if (state.bell && state.tick < state.bell.untilTick && distance(zombie, state.bell) <= RULES.dinnerBellRadius) {
            target = state.bell;
            kind = 'bell';
        }
        else if (state.recipe.zombies === 'noise-seekers' && state.stove.readyAtTick !== null && state.tick < state.stove.readyAtTick) {
            target = WORLD.stations[2];
            kind = 'stove';
        }
        if (kind !== zombie.target)
            zombie.waypoint = null;
        zombie.target = kind;
        zombie.targetX = target.x;
        zombie.targetY = target.y;
        if (state.tick < zombie.stunnedUntilTick)
            continue;
        const destination = zombieDestination(zombie, target);
        const remaining = distance(zombie, destination);
        const speed = RULES.zombieSpeed / RULES.ticksPerSecond;
        const before = { x: zombie.x, y: zombie.y };
        if (remaining > RULES.rayEpsilon)
            move(zombie, ((destination.x - zombie.x) / remaining) * Math.min(speed, remaining), ((destination.y - zombie.y) / remaining) * Math.min(speed, remaining), RULES.zombieRadius);
        if (distance(before, zombie) > RULES.rayEpsilon) {
            if (kind === 'stove')
                state.metrics.noiseSeekingTicks += 1;
            else if (kind === 'bell')
                state.metrics.bellAttractionTicks += 1;
            else
                state.metrics.pursuitTicks += 1;
        }
        if (distance(zombie, state.player) <= RULES.zombieRadius + RULES.playerRadius && state.tick >= state.player.contactReadyTick) {
            state.player.contactReadyTick = state.tick + RULES.contactCooldownTicks;
            state.player.slowedUntilTick = state.tick + RULES.contactSlowTicks;
            state.metrics.contactHits += 1;
            emit(state, { type: 'contact', entityId: zombie.id, x: zombie.x, y: zombie.y });
            spoilCarry(state, 'contact');
            const separation = distance(zombie, state.player);
            const dx = separation > RULES.rayEpsilon ? (state.player.x - zombie.x) / separation : 1;
            const dy = separation > RULES.rayEpsilon ? (state.player.y - zombie.y) / separation : 0;
            move(state.player, dx * RULES.contactPushDistance, dy * RULES.contactPushDistance, RULES.playerRadius);
        }
    }
}
/** Pure transition: inputs and every nested object of the old state survive unchanged. */
export function stepRuntime(state, frame) {
    validateFrame(state, frame);
    const next = cloneState(state);
    next.events = [];
    next.tick += 1;
    next.player.yaw = frame.yaw;
    next.player.pitch = frame.pitch;
    next.drops = next.drops.filter((drop) => drop.expiresAtTick > next.tick);
    if (next.bell && next.tick >= next.bell.untilTick)
        next.bell = null;
    if (next.stove.readyAtTick !== null && next.tick === next.stove.readyAtTick) {
        next.metrics.cookedPortions += next.stove.portions;
        emit(next, { type: 'cook_ready', portions: next.stove.portions });
    }
    // Expiry precedes interaction: a dish cannot be rescued on its expiry tick.
    if (next.stove.burnAtTick !== null && next.tick >= next.stove.burnAtTick) {
        next.metrics.burnedOrders += 1;
        next.metrics.failedOrders += 1;
        emit(next, { type: 'order_burned', portions: next.stove.portions });
        next.stove = { portions: 0, readyAtTick: null, burnAtTick: null };
    }
    if (hasAddition(next, 'hot-potato') && next.player.carry?.kind === 'dish' && next.tick - next.player.carry.acquiredAtTick >= RULES.hotPotatoCarryTicks)
        spoilCarry(next, 'timer');
    const forward = Number(Boolean(frame.buttons & BUTTONS.forward)) - Number(Boolean(frame.buttons & BUTTONS.back));
    const side = Number(Boolean(frame.buttons & BUTTONS.right)) - Number(Boolean(frame.buttons & BUTTONS.left));
    const magnitude = Math.hypot(forward, side) || 1;
    const speed = RULES.playerSpeed / RULES.ticksPerSecond * (next.tick < next.player.slowedUntilTick ? RULES.contactSpeedMultiplier : 1);
    move(next.player, (Math.cos(frame.yaw) * forward - Math.sin(frame.yaw) * side) / magnitude * speed, (Math.sin(frame.yaw) * forward + Math.cos(frame.yaw) * side) / magnitude * speed, RULES.playerRadius);
    const pressed = frame.buttons & ~state.previousButtons;
    if (pressed & BUTTONS.shoot && next.tick >= next.nextShotTick)
        shoot(next);
    if (pressed & BUTTONS.interact)
        interact(next);
    updateZombies(next);
    next.previousButtons = frame.buttons;
    if (next.tick === RULES.durationTicks) {
        next.status = 'complete';
        emit(next, { type: 'completed' });
    }
    return next;
}
/** Complete accepted traces only. No padding, client score or supplied state. */
export function replayRuntime(recipe, seed, frames) {
    if (!Array.isArray(frames) || frames.length !== RULES.durationTicks)
        throw new RangeError('A scored trial requires exactly 3600 input frames.');
    let state = createRuntime(recipe, seed);
    for (const frame of frames)
        state = stepRuntime(state, frame);
    return state;
}
