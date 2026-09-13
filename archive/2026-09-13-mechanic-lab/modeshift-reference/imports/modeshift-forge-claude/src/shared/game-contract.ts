/**
 * The narrow boundary between DOM product UI and the WebGL runtime.
 * The UI reads snapshots and calls commands; it never touches Three.js objects.
 */

export type GameMode = "platformer" | "firstPerson" | "tactical";

/**
 * The governing rule of Perspective Forging: if two surfaces appear connected in
 * a projection, they become connected while that projection is active. Each mode
 * is therefore its own rule space, not just its own camera.
 */
export type ModeConfig = {
  mode: GameMode;
  camera: "orthographic-side" | "perspective-first-person" | "orthographic-top";
  movement: "platformer" | "walk" | "tactical";
  depthLock: boolean;
  gravity: boolean;
  reveals: Array<"hidden-passages" | "hazards" | "patrol-cones" | "projection-alignment">;
  /** Turns aligned fragments into real colliders while this mode is active. */
  solidifiesProjection: boolean;
  /** Holds world time at zero: no clock, no sentry, no pickups, no exposure. */
  freezesWorld: boolean;
  /** Focus spent per second of play in this mode. */
  focusDrainPerS: number;
};

export type GameMetrics = {
  elapsedMs: number;
  falls: number;
  modeSwitches: number;
  pathLength: number;
  hazardExposureMs: number;
  discoveries: number;
  /** Wall-clock ms spent in each perspective, measured even while frozen. */
  modeTimeMs: Record<GameMode, number>;
  /** Times Focus ran out and a live projection dropped the player. */
  projectionCollapses: number;
};

/**
 * Deliberate extension of the brief's contract: "paused" is required by the P0
 * checklist (pointer lock released in Inhabit must read as a distinct state).
 */
export type GameStatus = "ready" | "playing" | "paused" | "completed";

export type GameSnapshot = {
  mode: GameMode;
  status: GameStatus;
  collectedCoreIds: string[];
  totalCores: number;
  metrics: GameMetrics;
  /** Non-authoritative presentation hints, for HUD only. */
  transitioning: boolean;
  pointerLocked: boolean;
  pointerLockAvailable: boolean;
  discoveryLog: string[];
  /** Remaining Focus, 0..focusMax. */
  focus: number;
  focusMax: number;
  /** False once Focus is too low to hold a projection open reliably. */
  projectionStable: boolean;
};

export type GameBridge = {
  setMode(mode: GameMode): void;
  resetRun(): void;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
  getSnapshot(): GameSnapshot;
};

export const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  platformer: {
    mode: "platformer",
    camera: "orthographic-side",
    movement: "platformer",
    depthLock: true,
    gravity: true,
    reveals: ["projection-alignment"],
    solidifiesProjection: true,
    freezesWorld: false,
    focusDrainPerS: 12,
  },
  firstPerson: {
    mode: "firstPerson",
    camera: "perspective-first-person",
    movement: "walk",
    depthLock: false,
    gravity: true,
    reveals: ["hidden-passages"],
    solidifiesProjection: false,
    freezesWorld: false,
    focusDrainPerS: 0,
  },
  tactical: {
    mode: "tactical",
    camera: "orthographic-top",
    movement: "tactical",
    depthLock: false,
    gravity: true,
    reveals: ["hazards", "patrol-cones"],
    solidifiesProjection: false,
    freezesWorld: true,
    focusDrainPerS: 0,
  },
};

export const MODE_LABELS: Record<GameMode, { name: string; accent: string; hint: string }> = {
  platformer: { name: "Traverse", accent: "#ffb648", hint: "Connect · depth collapses into a span" },
  firstPerson: { name: "Inhabit", accent: "#49e2ff", hint: "Interact · the only mode that collects" },
  tactical: { name: "Command", accent: "#ff5fd2", hint: "Reconfigure · world time frozen" },
};

export const MODE_ORDER: GameMode[] = ["platformer", "firstPerson", "tactical"];

export const MODE_KEYS: Record<string, GameMode> = {
  Digit1: "platformer",
  Digit2: "firstPerson",
  Digit3: "tactical",
};
