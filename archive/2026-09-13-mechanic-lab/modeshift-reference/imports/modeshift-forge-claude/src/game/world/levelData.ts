/**
 * One world, authored so the Perspective Forging demo works:
 *
 *   x=-11..-4  start pad
 *   x=-4..6    the IMPOSSIBLE GAP: a 10m void. Max jump range is 7.4m, so no
 *              amount of timing crosses it. Three fragments float over it at
 *              different depths and heights; Traverse collapses depth, pulls
 *              them into one plane, and the span becomes solid.
 *   x=15       the FACADE: a 10m slab that reads as an impossible wall from the
 *              orthographic side view, because the corridor behind it sits at
 *              depth lane z=-5 and projects onto the same screen band.
 *   x=16       hidden passage + core 2 (only legible in Inhabit)
 *   x=26       hazard field + patrol cone; core 3 on a pedestal inside it.
 *              Command reveals the low-exposure lane; Inhabit takes the core.
 *   x=42       exit portal, gated on all three cores.
 */

export type Solid = {
  id: string;
  /** center */
  c: [number, number, number];
  /** full size */
  s: [number, number, number];
  kind: "deck" | "structure" | "pedestal" | "projection";
};

export type Core = {
  id: string;
  p: [number, number, number];
  label: string;
  /** Which mode makes this core legible — used for HUD copy only. */
  legibleIn: "platformer" | "firstPerson" | "tactical";
};

export type Zone = {
  id: string;
  label: string;
  min: [number, number, number];
  max: [number, number, number];
};

export const PLAYER = {
  radius: 0.36,
  height: 1.8,
  /** center offset from the feet */
  eye: 1.55,
  walkSpeed: 6.2,
  runSpeed: 9.4,
  gravity: 26,
  jumpVelocity: 10.2,
  /** below this the run resets position only */
  fallY: -14,
} as const;

/** Horizontal reach of a full-speed jump from level ground. */
export const JUMP_RANGE = ((2 * PLAYER.jumpVelocity) / PLAYER.gravity) * PLAYER.runSpeed;

export const SOLIDS: Solid[] = [
  { id: "start-deck", c: [-7.5, -0.5, 0], s: [7, 1, 5], kind: "deck" },
  { id: "start-rail", c: [-10.7, 0.3, 0], s: [0.4, 1.6, 5], kind: "structure" },
  { id: "deck-2", c: [9, -0.5, 0], s: [6, 1, 5], kind: "deck" },
  // Spans both lanes so the facade is approached on solid ground; the bypass
  // is in depth, never a hole in the floor.
  { id: "mid-deck", c: [14, -0.5, -2.75], s: [12, 1, 10.5], kind: "deck" },
  { id: "facade", c: [15, 4, 0.25], s: [3, 10, 5.5], kind: "structure" },
  { id: "facade-lip", c: [15, 9.4, 0.25], s: [4.2, 0.8, 6.4], kind: "structure" },
  { id: "deck-3", c: [21.5, -0.5, -2], s: [7, 1, 12], kind: "deck" },
  { id: "hazard-deck", c: [31, -0.5, 0], s: [12, 1, 16], kind: "deck" },
  { id: "core-pedestal", c: [31, 0.25, 5], s: [3, 2.5, 3], kind: "pedestal" },
  { id: "portal-deck", c: [41, 0.25, -2], s: [8, 2.5, 12], kind: "deck" },
  { id: "portal-arch-l", c: [44.6, 2.6, -5.6], s: [0.5, 4, 0.5], kind: "structure" },
  { id: "portal-arch-r", c: [44.6, 2.6, 1.6], s: [0.5, 4, 0.5], kind: "structure" },
];

export const SPAWN: [number, number, number] = [-9, 0.05, 0];

/** Depth lanes Traverse is allowed to occupy. */
export const DEPTH_LANES = [0, -5];

/**
 * The fragments over the impossible gap. They are really there, really at these
 * depths — Traverse does not invent them, it collapses the depth between them.
 * `rest` differs from `aligned` in both z and y, so the side view genuinely
 * shows three slabs that do not form a line until the projection is active.
 */
export type Fragment = {
  id: string;
  /** where it floats in the real world — what Inhabit shows */
  rest: [number, number, number];
  /** where the projection pulls it — what solidifies */
  aligned: [number, number, number];
  s: [number, number, number];
};

// Depth spread is kept modest on purpose. The side view is near-orthographic, so
// z barely moves a fragment on screen there — it is the differing heights that
// make the slabs read as "not a path". Large depth offsets only hurt Inhabit,
// where they swing the fragments out to the edges of view at the gap lip.
// Command's overhead lens is where the depth scatter reads directly.
export const FRAGMENTS: Fragment[] = [
  { id: "frag-a", rest: [-2.3, -0.4, -2.4], aligned: [-2.3, -0.4, 0], s: [3.4, 0.8, 3.2] },
  { id: "frag-b", rest: [1.0, 1.1, 2.2], aligned: [1.0, -0.4, 0], s: [3.4, 0.8, 3.2] },
  { id: "frag-c", rest: [4.3, -1.6, -3.2], aligned: [4.3, -0.4, 0], s: [3.4, 0.8, 3.2] },
];

/**
 * Colliders that exist only while a projection is solid. Deliberately the
 * fragments' own aligned boxes: the player walks on the fragments, not on a
 * separate invisible bridge.
 */
export const PROJECTED_SOLIDS: Solid[] = FRAGMENTS.map((f) => ({
  id: f.id,
  c: f.aligned,
  s: f.s,
  kind: "projection" as const,
}));

/** The forged span, for presentation: x extent and deck-flush top. */
export const SPAN = {
  minX: -4,
  maxX: 6,
  top: 0,
  z: 0,
};

export const CORES: Core[] = [
  { id: "core-1", p: [1, 1.7, 0], label: "Mid-span", legibleIn: "platformer" },
  { id: "core-2", p: [16.6, 1.3, -5], label: "Hidden passage", legibleIn: "firstPerson" },
  { id: "core-3", p: [31, 2.95, 5], label: "Hazard pedestal", legibleIn: "tactical" },
];

export const CORE_PICKUP_RADIUS = 1.35;

export const PORTAL = {
  p: [42, 3.1, 0] as [number, number, number],
  radius: 1.5,
  enterRadius: 2.0,
};

/** Magenta hazard field. Only fully rendered in Command. */
export const HAZARD = {
  min: [26, 0, -4] as [number, number, number],
  max: [36, 3.6, 8] as [number, number, number],
};

/** Deterministic sweeping sentry (no AI, no randomness). */
export const SENTRY = {
  origin: [29.5, 1.5, 6.6] as [number, number, number],
  /** sweeps between these yaw values, period in seconds */
  yawFrom: -1.15,
  yawTo: 1.15,
  periodS: 7.2,
  range: 9,
  halfAngle: 0.34,
};

export const DISCOVERY_ZONES: Zone[] = [
  {
    id: "forged-span",
    label: "Crossed the forged span",
    // Just past the far lip: reachable only by crossing the projection.
    min: [6, -0.5, -2.5],
    max: [9, 3, 2.5],
  },
  {
    id: "hidden-passage",
    label: "Passage behind the facade",
    min: [15, -2, -8],
    max: [20, 4, -2.6],
  },
  {
    id: "low-exposure-lane",
    label: "Low-exposure lane past the hazard",
    min: [26, -2, -8],
    max: [36, 4, -4],
  },
  {
    id: "hazard-pedestal",
    label: "Pedestal inside the hazard field",
    min: [29.5, 1.4, 3.5],
    max: [32.5, 4, 6.5],
  },
];

export const WORLD_BOUNDS = { minX: -13, maxX: 48, minZ: -12, maxZ: 12 };
