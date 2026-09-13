import {
  MODE_CONFIGS,
  type GameBridge,
  type GameMetrics,
  type GameMode,
  type GameSnapshot,
  type GameStatus,
} from "../shared/game-contract";
import { CORES, DEPTH_LANES, PLAYER, SPAWN } from "./world/levelData";
import { intersectingProjectedBox, nearestSafeLane, setProjectedSolid } from "./controllers/physics";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export const TRANSITION_MS = 620;
export const REDUCED_TRANSITION_MS = 180;

/**
 * Focus is what stops one perspective from dominating. Traverse holds a
 * projection open and pays per second; Inhabit pays nothing but leaves the
 * world running; Command freezes time and will pay per edit.
 */
export const FOCUS = {
  max: 100,
  /** Reserved for Command edits, which land with the reconfigure layer. */
  editCost: 20,
  coreRestore: 25,
  /** Standing on real ground in Inhabit trickles back, so no run can dead-end. */
  groundRechargePerS: 4,
  /** Below this the projection still holds, but visibly flickers. */
  unstableBelow: 30,
} as const;

export const focus: { value: number } = { value: FOCUS.max };

/**
 * The one canonical player transform. Only the controller for the active mode
 * writes to it, and only inside the fixed-step update.
 */
export const player = {
  x: SPAWN[0],
  y: SPAWN[1],
  z: SPAWN[2],
  vx: 0,
  vy: 0,
  vz: 0,
  /** radians, 0 = looking down -Z */
  yaw: -Math.PI / 2,
  pitch: 0,
  onGround: false,
  /** True when the surface underfoot only exists because a projection is open. */
  onProjectedGround: false,
  lastSafe: [SPAWN[0], SPAWN[1], SPAWN[2]] as [number, number, number],
};

export type TransitionState = {
  active: boolean;
  startedAt: number;
  duration: number;
  from: GameMode | null;
  to: GameMode;
};

type Mutable = {
  mode: GameMode;
  status: GameStatus;
  collected: Set<string>;
  discoveries: Set<string>;
  metrics: GameMetrics;
  transition: TransitionState;
  pointerLocked: boolean;
  /** wall-clock ms accumulated while status === "playing" */
  lastModeTitleAt: number;
};

function freshMetrics(): GameMetrics {
  return {
    elapsedMs: 0,
    falls: 0,
    modeSwitches: 0,
    pathLength: 0,
    hazardExposureMs: 0,
    discoveries: 0,
    modeTimeMs: { platformer: 0, firstPerson: 0, tactical: 0 },
    projectionCollapses: 0,
  };
}

/** Inhabit is home: the run opens embodied, so the gap reads as impossible first. */
const INITIAL_MODE: GameMode = "firstPerson";

export const state: Mutable = {
  mode: INITIAL_MODE,
  status: "ready",
  collected: new Set(),
  discoveries: new Set(),
  metrics: freshMetrics(),
  transition: {
    active: false,
    startedAt: 0,
    duration: TRANSITION_MS,
    from: null,
    to: INITIAL_MODE,
  },
  pointerLocked: false,
  lastModeTitleAt: 0,
};

/**
 * Pointer lock is unavailable in some embedded/sandboxed hosts. We find out by
 * trying once, then fall back to drag-to-look rather than breaking Inhabit.
 */
export const capabilities = { pointerLock: true };

export function markPointerLockUnavailable(): void {
  if (!capabilities.pointerLock) return;
  capabilities.pointerLock = false;
  emit(true);
}

const listeners = new Set<(s: GameSnapshot) => void>();
let snapshot: GameSnapshot = buildSnapshot();
let lastEmit = 0;

export function projectionStable(): boolean {
  return focus.value > FOCUS.unstableBelow;
}

function buildSnapshot(): GameSnapshot {
  return {
    mode: state.mode,
    status: state.status,
    collectedCoreIds: [...state.collected],
    totalCores: CORES.length,
    metrics: { ...state.metrics, modeTimeMs: { ...state.metrics.modeTimeMs } },
    transitioning: state.transition.active,
    pointerLocked: state.pointerLocked,
    pointerLockAvailable: capabilities.pointerLock,
    discoveryLog: [...state.discoveries],
    focus: focus.value,
    focusMax: FOCUS.max,
    projectionStable: projectionStable(),
  };
}

export function emit(force = false): void {
  const now = performance.now();
  if (!force && now - lastEmit < 90) return;
  lastEmit = now;
  snapshot = buildSnapshot();
  for (const l of listeners) l(snapshot);
}

export function getSnapshot(): GameSnapshot {
  return snapshot;
}

export function transitionDuration(): number {
  return prefersReducedMotion() ? REDUCED_TRANSITION_MS : TRANSITION_MS;
}

/**
 * The governing rule, applied. A projection only solidifies once its camera has
 * settled and there is Focus left to hold it — so the span materialises exactly
 * as the transition lands, and vanishes the instant Focus runs out.
 */
export function syncProjection(): void {
  const solid =
    MODE_CONFIGS[state.mode].solidifiesProjection && focus.value > 0 && !state.transition.active;
  setProjectedSolid(solid);
}

syncProjection();

export function beginPlaying(): void {
  if (state.status === "ready") {
    state.status = "playing";
    emit(true);
  }
}

export function setMode(mode: GameMode, cause: "player" | "collapse" = "player"): void {
  if (mode === state.mode && !state.transition.active) return;
  if (state.status === "completed") return;
  const from = state.mode;
  state.mode = mode;
  // A collapse is the world's decision, not the player's: counting it would
  // pollute the "unnecessary switches" read.
  if (cause === "player") state.metrics.modeSwitches += 1;
  state.transition = {
    active: true,
    startedAt: performance.now(),
    duration: transitionDuration(),
    from,
    to: mode,
  };
  state.lastModeTitleAt = performance.now();

  // Zero velocity so no residual impulse leaks between controllers.
  player.vx = 0;
  player.vz = 0;

  if (MODE_CONFIGS[mode].depthLock) {
    // Entering Traverse: return to the nearest lane the body actually fits in.
    lane.target = nearestSafeLane(player.x, player.y, player.z, DEPTH_LANES);
  } else {
    lane.target = null;
  }

  if (mode !== "firstPerson" && document.pointerLockElement) {
    document.exitPointerLock();
  }
  syncProjection();
  emit(true);
}

/** Non-null while Traverse is easing the player back onto a depth lane. */
export const lane: { target: number | null } = { target: null };

export function endTransition(): void {
  if (!state.transition.active) return;
  state.transition.active = false;
  syncProjection();
  // Defensive: solidifying must never trap the body inside a fragment. In
  // practice the player is always on real ground at the moment of a switch.
  const box = intersectingProjectedBox(player.x, player.y, player.z);
  if (box) {
    player.y = box.maxY;
    player.vy = 0;
  }
  emit(true);
}

export function setPointerLocked(locked: boolean): void {
  if (state.pointerLocked === locked) return;
  state.pointerLocked = locked;
  if (!locked && state.mode === "firstPerson" && state.status === "playing") {
    state.status = "paused";
  } else if (locked && state.status === "paused") {
    state.status = "playing";
  }
  emit(true);
}

export function resume(): void {
  if (state.status === "paused") {
    state.status = "playing";
    emit(true);
  }
}

export function collect(id: string): void {
  if (state.collected.has(id)) return;
  state.collected.add(id);
  focus.value = Math.min(FOCUS.max, focus.value + FOCUS.coreRestore);
  syncProjection();
  emit(true);
}

export function discover(id: string): void {
  if (state.discoveries.has(id)) return;
  state.discoveries.add(id);
  state.metrics.discoveries = state.discoveries.size;
  emit(true);
}

/**
 * Focus ran out while a projection was load-bearing. The span stops existing,
 * which drops anyone standing on it — and because lastSafe never records a
 * projected surface, the fall returns them to real ground.
 */
export function collapseProjection(): void {
  focus.value = 0;
  state.metrics.projectionCollapses += 1;
  setMode("firstPerson", "collapse");
  syncProjection();
  emit(true);
}

export function tickFocus(dt: number): void {
  // Mid-transition you are not projecting yet, so the fly-in is not billed.
  if (state.transition.active || state.status !== "playing") return;
  const drain = MODE_CONFIGS[state.mode].focusDrainPerS;
  if (drain > 0) {
    focus.value = Math.max(0, focus.value - drain * dt);
    if (focus.value <= 0) {
      collapseProjection();
      return;
    }
  } else if (player.onGround && !player.onProjectedGround && focus.value < FOCUS.max) {
    focus.value = Math.min(FOCUS.max, focus.value + FOCUS.groundRechargePerS * dt);
  }
  syncProjection();
}

export function registerFall(): void {
  state.metrics.falls += 1;
  player.x = player.lastSafe[0];
  player.y = player.lastSafe[1] + 0.05;
  player.z = player.lastSafe[2];
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  emit(true);
}

export function complete(): void {
  if (state.status === "completed") return;
  state.status = "completed";
  if (document.pointerLockElement) document.exitPointerLock();
  emit(true);
}

export function resetRun(keepMode = true): void {
  player.x = SPAWN[0];
  player.y = SPAWN[1];
  player.z = SPAWN[2];
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.yaw = -Math.PI / 2;
  player.pitch = 0;
  player.onGround = false;
  player.onProjectedGround = false;
  player.lastSafe = [SPAWN[0], SPAWN[1], SPAWN[2]];
  state.collected.clear();
  state.discoveries.clear();
  state.metrics = freshMetrics();
  state.status = "ready";
  focus.value = FOCUS.max;
  lane.target = null;
  if (!keepMode) state.mode = INITIAL_MODE;
  state.transition = {
    active: true,
    startedAt: performance.now(),
    duration: transitionDuration(),
    from: state.mode,
    to: state.mode,
  };
  syncProjection();
  if (document.pointerLockElement) document.exitPointerLock();
  emit(true);
}

export const bridge: GameBridge = {
  setMode: (mode) => setMode(mode),
  resetRun: () => resetRun(true),
  getSnapshot,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const PLAYER_CONST = PLAYER;
