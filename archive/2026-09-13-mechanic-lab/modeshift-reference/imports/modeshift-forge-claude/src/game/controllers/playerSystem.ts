import { MODE_CONFIGS, type GameMode } from "../../shared/game-contract";
import {
  beginPlaying,
  collect,
  complete,
  discover,
  emit,
  lane,
  player,
  registerFall,
  state,
  tickFocus,
} from "../gameState";
import {
  CORES,
  CORE_PICKUP_RADIUS,
  DISCOVERY_ZONES,
  PLAYER,
  PORTAL,
  SENTRY,
  WORLD_BOUNDS,
} from "../world/levelData";
import { HAZARD_BOX, inBox, moveAndCollide } from "./physics";

const FIXED_STEP = 1 / 120;
const MAX_ACCUMULATED = 0.1;
const LOOK_SENSITIVITY = 0.0022;
const PITCH_LIMIT = Math.PI / 2 - 0.05;

let accumulator = 0;

/** Deterministic sentry yaw for a given run time, in seconds. */
export function sentryYaw(timeS: number): number {
  const phase = 0.5 - 0.5 * Math.cos((2 * Math.PI * timeS) / SENTRY.periodS);
  return SENTRY.yawFrom + (SENTRY.yawTo - SENTRY.yawFrom) * phase;
}

export function sentryDirection(timeS: number): [number, number] {
  const yaw = sentryYaw(timeS);
  return [Math.sin(yaw), -Math.cos(yaw)];
}

function inSentryCone(x: number, z: number, timeS: number): boolean {
  const [dx, dz] = sentryDirection(timeS);
  const vx = x - SENTRY.origin[0];
  const vz = z - SENTRY.origin[2];
  const dist = Math.hypot(vx, vz);
  if (dist > SENTRY.range || dist < 0.001) return false;
  const cos = (vx * dx + vz * dz) / dist;
  return cos > Math.cos(SENTRY.halfAngle);
}

function applyGravity(dt: number) {
  player.vy -= PLAYER.gravity * dt;
  if (player.vy < -40) player.vy = -40;
}

function tryJump() {
  if (player.onGround) {
    player.vy = PLAYER.jumpVelocity;
    player.onGround = false;
  }
}

type Axes = { x: number; y: number; jump: boolean; sprint: boolean };

function stepPlatformer(dt: number, a: Axes) {
  const speed = a.sprint ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const target = a.x * speed;
  // Snappy but not instant: platformer feel needs a little ground friction.
  const accel = player.onGround ? 34 : 16;
  player.vx += Math.max(-accel * dt, Math.min(accel * dt, target - player.vx));
  if (a.x === 0 && player.onGround) player.vx *= 0.82;

  if (a.jump) tryJump();
  applyGravity(dt);

  // Depth lock: ease back to the lane, then hold it exactly.
  let dz = 0;
  if (lane.target !== null) {
    const diff = lane.target - player.z;
    if (Math.abs(diff) < 0.005) {
      player.z = lane.target;
    } else {
      dz = diff * Math.min(1, dt * 9);
    }
  }

  const r = moveAndCollide(player, player.vx * dt, player.vy * dt, dz);
  player.onGround = r.onGround;
  player.onProjectedGround = r.groundIsProjected;
  if (r.onGround && player.vy < 0) player.vy = 0;
  if (r.hitCeiling && player.vy > 0) player.vy = 0;
  if (r.blockedX) player.vx = 0;
}

function stepWalk(dt: number, a: Axes) {
  const speed = a.sprint ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  const rx = Math.cos(player.yaw);
  const rz = -Math.sin(player.yaw);
  let mx = fx * a.y + rx * a.x;
  let mz = fz * a.y + rz * a.x;
  const len = Math.hypot(mx, mz);
  if (len > 0.0001) {
    mx = (mx / len) * speed;
    mz = (mz / len) * speed;
  } else {
    mx = 0;
    mz = 0;
  }
  const accel = player.onGround ? 40 : 18;
  player.vx += Math.max(-accel * dt, Math.min(accel * dt, mx - player.vx));
  player.vz += Math.max(-accel * dt, Math.min(accel * dt, mz - player.vz));
  if (len < 0.0001 && player.onGround) {
    player.vx *= 0.78;
    player.vz *= 0.78;
  }

  if (a.jump) tryJump();
  applyGravity(dt);

  const r = moveAndCollide(player, player.vx * dt, player.vy * dt, player.vz * dt);
  player.onGround = r.onGround;
  player.onProjectedGround = r.groundIsProjected;
  if (r.onGround && player.vy < 0) player.vy = 0;
  if (r.hitCeiling && player.vy > 0) player.vy = 0;
  if (r.blockedX) player.vx = 0;
  if (r.blockedZ) player.vz = 0;
}

/** Overhead view: input is screen aligned (W = world -Z, D = world +X). */
function stepTactical(dt: number, a: Axes) {
  const speed = a.sprint ? PLAYER.runSpeed : PLAYER.walkSpeed * 0.95;
  let mx = a.x;
  let mz = -a.y;
  const len = Math.hypot(mx, mz);
  if (len > 0.0001) {
    mx = (mx / len) * speed;
    mz = (mz / len) * speed;
  } else {
    mx = 0;
    mz = 0;
  }
  const accel = 38;
  player.vx += Math.max(-accel * dt, Math.min(accel * dt, mx - player.vx));
  player.vz += Math.max(-accel * dt, Math.min(accel * dt, mz - player.vz));
  if (len < 0.0001 && player.onGround) {
    player.vx *= 0.74;
    player.vz *= 0.74;
  }

  if (a.jump) tryJump();
  applyGravity(dt);

  const r = moveAndCollide(player, player.vx * dt, player.vy * dt, player.vz * dt);
  player.onGround = r.onGround;
  player.onProjectedGround = r.groundIsProjected;
  if (r.onGround && player.vy < 0) player.vy = 0;
  if (r.hitCeiling && player.vy > 0) player.vy = 0;
  if (r.blockedX) player.vx = 0;
  if (r.blockedZ) player.vz = 0;

  // Face the direction of travel so the avatar reads on the overhead map.
  if (Math.hypot(player.vx, player.vz) > 0.5) {
    player.yaw = Math.atan2(-player.vx, -player.vz);
  }
}

function clampToWorld() {
  player.x = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, player.x));
  player.z = Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, player.z));
}

let prevX = player.x;
let prevY = player.y;
let prevZ = player.z;

function evaluateWorld(dt: number, timeS: number) {
  const dist = Math.hypot(player.x - prevX, player.y - prevY, player.z - prevZ);
  // Anything larger than a substep is a teleport (fall reset or run reset).
  if (dist > 0.0005 && dist < 0.5) state.metrics.pathLength += dist;
  prevX = player.x;
  prevY = player.y;
  prevZ = player.z;

  if (state.status === "playing") state.metrics.elapsedMs += dt * 1000;

  const cy = player.y + PLAYER.height * 0.5;

  for (const core of CORES) {
    if (state.collected.has(core.id)) continue;
    const d = Math.hypot(player.x - core.p[0], cy - core.p[1], player.z - core.p[2]);
    if (d < CORE_PICKUP_RADIUS) collect(core.id);
  }

  for (const zone of DISCOVERY_ZONES) {
    if (state.discoveries.has(zone.id)) continue;
    if (
      player.x >= zone.min[0] &&
      player.x <= zone.max[0] &&
      player.y >= zone.min[1] &&
      player.y <= zone.max[1] &&
      player.z >= zone.min[2] &&
      player.z <= zone.max[2]
    ) {
      discover(zone.id);
    }
  }

  const inHazard =
    inBox(player.x, cy, player.z, HAZARD_BOX) || inSentryCone(player.x, player.z, timeS);
  if (inHazard && state.status === "playing") {
    state.metrics.hazardExposureMs += dt * 1000;
  }

  // Any solid *physical* ground is a safe respawn: the hazard field costs
  // exposure, not a life, so a fall must never rewind the player across the
  // chamber. A projected span is explicitly excluded — recording it would let a
  // collapse respawn the player into the void it was spanning.
  if (player.onGround && !player.onProjectedGround && player.y > -1) {
    player.lastSafe = [player.x, player.y, player.z];
  }

  if (player.y < PLAYER.fallY) registerFall();

  if (state.collected.size === CORES.length && state.status === "playing") {
    const d = Math.hypot(player.x - PORTAL.p[0], cy - PORTAL.p[1], player.z - PORTAL.p[2]);
    if (d < PORTAL.enterRadius) complete();
  }
}

export type FrameInput = {
  axisX: number;
  axisY: number;
  jump: boolean;
  sprint: boolean;
  lookDx: number;
  lookDy: number;
};

/**
 * Single entry point for the frame. Exactly one controller writes the canonical
 * transform per substep; the inactive ones are never called.
 */
export function stepGame(rawDt: number, timeS: number, fi: FrameInput): void {
  const mode: GameMode = state.mode;
  const config = MODE_CONFIGS[mode];
  // Command holds world time at zero: no clock, no sentry, no pickups, no
  // exposure. The existing frozen path already skips the whole substep.
  const frozen =
    state.status === "paused" || state.status === "completed" || config.freezesWorld;
  const inputLocked = frozen || state.transition.active;

  // Time-in-perspective is a fact about the player, not the world, so it
  // accrues even while the world being observed is frozen.
  if (state.status === "playing") state.metrics.modeTimeMs[mode] += rawDt * 1000;

  if (mode === "firstPerson" && !frozen && (fi.lookDx !== 0 || fi.lookDy !== 0)) {
    player.yaw -= fi.lookDx * LOOK_SENSITIVITY;
    player.pitch -= fi.lookDy * LOOK_SENSITIVITY;
    player.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, player.pitch));
  }

  const axes: Axes = inputLocked
    ? { x: 0, y: 0, jump: false, sprint: false }
    : { x: fi.axisX, y: fi.axisY, jump: fi.jump, sprint: fi.sprint };

  if (!inputLocked && (axes.x !== 0 || axes.y !== 0 || axes.jump)) beginPlaying();

  accumulator = Math.min(accumulator + rawDt, MAX_ACCUMULATED);
  let steps = 0;
  while (accumulator >= FIXED_STEP && steps < 12) {
    if (frozen) {
      accumulator -= FIXED_STEP;
      steps += 1;
      continue;
    }
    if (config.movement === "platformer") stepPlatformer(FIXED_STEP, axes);
    else if (config.movement === "walk") stepWalk(FIXED_STEP, axes);
    else stepTactical(FIXED_STEP, axes);
    clampToWorld();
    evaluateWorld(FIXED_STEP, timeS);
    tickFocus(FIXED_STEP);
    // A collapse swaps the rule space mid-frame; stop stepping the old one.
    if (state.mode !== mode) break;
    accumulator -= FIXED_STEP;
    steps += 1;
    // Jump is consumed by the first substep only.
    axes.jump = false;
  }

  emit();
}

export function resetSystem(): void {
  accumulator = 0;
  prevX = player.x;
  prevY = player.y;
  prevZ = player.z;
}
