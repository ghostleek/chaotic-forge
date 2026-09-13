import { PLAYER, SOLIDS, PROJECTED_SOLIDS, HAZARD, type Solid } from "../world/levelData";

export type Box = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export function solidToBox(s: Solid): Box {
  return {
    minX: s.c[0] - s.s[0] / 2,
    maxX: s.c[0] + s.s[0] / 2,
    minY: s.c[1] - s.s[1] / 2,
    maxY: s.c[1] + s.s[1] / 2,
    minZ: s.c[2] - s.s[2] / 2,
    maxZ: s.c[2] + s.s[2] / 2,
  };
}

/** Always solid. */
export const PHYSICAL_BOXES: Box[] = SOLIDS.map(solidToBox);
/** Solid only while a projection holds them open. */
export const PROJECTED_BOXES: Box[] = PROJECTED_SOLIDS.map(solidToBox);

/**
 * The governing rule, made mechanical: surfaces that align in the active
 * projection are real colliders while it holds, and nothing at all when it
 * does not. Owned by gameState's syncProjection() — never set from a view.
 */
let projectedSolid = false;

export function setProjectedSolid(on: boolean): void {
  projectedSolid = on;
}

export function isProjectedSolid(): boolean {
  return projectedSolid;
}

export const HAZARD_BOX: Box = {
  minX: HAZARD.min[0],
  maxX: HAZARD.max[0],
  minY: HAZARD.min[1],
  maxY: HAZARD.max[1],
  minZ: HAZARD.min[2],
  maxZ: HAZARD.max[2],
};

/** Player AABB. `y` is the feet plane. */
const scratch: Box = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };

function playerBox(x: number, y: number, z: number, out: Box = scratch): Box {
  const r = PLAYER.radius;
  out.minX = x - r;
  out.maxX = x + r;
  out.minY = y;
  out.maxY = y + PLAYER.height;
  out.minZ = z - r;
  out.maxZ = z + r;
  return out;
}

function intersects(a: Box, b: Box): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

export type Pos = { x: number; y: number; z: number };

export function collidesAt(x: number, y: number, z: number): boolean {
  const box = playerBox(x, y, z);
  for (const b of PHYSICAL_BOXES) if (intersects(box, b)) return true;
  if (projectedSolid) {
    for (const b of PROJECTED_BOXES) if (intersects(box, b)) return true;
  }
  return false;
}

/** The projected box the player is currently inside, if any. */
export function intersectingProjectedBox(x: number, y: number, z: number): Box | null {
  const box = playerBox(x, y, z);
  for (const b of PROJECTED_BOXES) if (intersects(box, b)) return b;
  return null;
}

export type MoveResult = {
  onGround: boolean;
  hitCeiling: boolean;
  blockedX: boolean;
  blockedZ: boolean;
  /** True when the surface underfoot only exists because a projection is open. */
  groundIsProjected: boolean;
};

/**
 * Axis-separated swept AABB resolution. Deliberately simple and predictable —
 * every surface in this world is axis aligned. Each axis resolves against the
 * physical set first, then the projected set when one is open, so the player is
 * corrected out of real geometry before a projection is allowed to hold them.
 */
function resolveX(pos: Pos, dx: number, boxes: Box[], result: MoveResult): void {
  const r = PLAYER.radius;
  let box = playerBox(pos.x, pos.y, pos.z);
  for (const b of boxes) {
    if (!intersects(box, b)) continue;
    pos.x = dx > 0 ? b.minX - r : b.maxX + r;
    box = playerBox(pos.x, pos.y, pos.z);
    result.blockedX = true;
  }
}

function resolveZ(pos: Pos, dz: number, boxes: Box[], result: MoveResult): void {
  const r = PLAYER.radius;
  let box = playerBox(pos.x, pos.y, pos.z);
  for (const b of boxes) {
    if (!intersects(box, b)) continue;
    pos.z = dz > 0 ? b.minZ - r : b.maxZ + r;
    box = playerBox(pos.x, pos.y, pos.z);
    result.blockedZ = true;
  }
}

function resolveY(
  pos: Pos,
  dy: number,
  boxes: Box[],
  result: MoveResult,
  projected: boolean,
): void {
  let box = playerBox(pos.x, pos.y, pos.z);
  for (const b of boxes) {
    if (!intersects(box, b)) continue;
    if (dy > 0) {
      pos.y = b.minY - PLAYER.height;
      result.hitCeiling = true;
    } else {
      pos.y = b.maxY;
      result.onGround = true;
      result.groundIsProjected = projected;
    }
    box = playerBox(pos.x, pos.y, pos.z);
  }
}

export function moveAndCollide(pos: Pos, dx: number, dy: number, dz: number): MoveResult {
  const result: MoveResult = {
    onGround: false,
    hitCeiling: false,
    blockedX: false,
    blockedZ: false,
    groundIsProjected: false,
  };

  if (dx !== 0) {
    pos.x += dx;
    resolveX(pos, dx, PHYSICAL_BOXES, result);
    if (projectedSolid) resolveX(pos, dx, PROJECTED_BOXES, result);
  }

  if (dz !== 0) {
    pos.z += dz;
    resolveZ(pos, dz, PHYSICAL_BOXES, result);
    if (projectedSolid) resolveZ(pos, dz, PROJECTED_BOXES, result);
  }

  if (dy !== 0) {
    pos.y += dy;
    resolveY(pos, dy, PHYSICAL_BOXES, result, false);
    if (projectedSolid) resolveY(pos, dy, PROJECTED_BOXES, result, true);
  }

  // Ground probe, so standing still still reports grounded.
  if (!result.onGround) {
    const probe = playerBox(pos.x, pos.y - 0.08, pos.z, {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
    });
    probe.maxY = pos.y + 0.05;
    for (const b of PHYSICAL_BOXES) {
      if (intersects(probe, b)) {
        result.onGround = true;
        break;
      }
    }
    if (!result.onGround && projectedSolid) {
      for (const b of PROJECTED_BOXES) {
        if (intersects(probe, b)) {
          result.onGround = true;
          result.groundIsProjected = true;
          break;
        }
      }
    }
  }

  return result;
}

export function inBox(x: number, y: number, z: number, b: Box): boolean {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY && z >= b.minZ && z <= b.maxZ;
}

/** Nearest depth lane the player can legally stand in. */
export function nearestSafeLane(x: number, y: number, z: number, lanes: readonly number[]): number {
  const sorted = [...lanes].sort((a, b) => Math.abs(a - z) - Math.abs(b - z));
  for (const lane of sorted) {
    if (!collidesAt(x, y, lane)) return lane;
  }
  return sorted[0] ?? 0;
}
