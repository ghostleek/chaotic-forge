import { type Material, MeshLambertMaterial, type Texture } from "three";
import { SOLIDS, type Solid } from "./levelData";
import { TILE, sheetReady, tileField, tileSprite, treeSprite, wallStrip } from "./assets";

/**
 * Texture and material construction for the tiled pixel-art style.
 *
 * Kept out of the component module for two reasons: these are session-lifetime
 * singletons like the primitive world's shared materials in `materials.ts`, and
 * mixing non-component exports into a component file defeats Fast Refresh.
 */

/** Whole tiles per axis, so one tile always covers one world unit. */
function tileCounts(s: Solid): [number, number, number] {
  return [
    Math.max(1, Math.round(s.s[0])),
    Math.max(1, Math.round(s.s[1])),
    Math.max(1, Math.round(s.s[2])),
  ];
}

/**
 * `depthBias` breaks ties between solids that share a face.
 *
 * Several solids overlap on purpose — deck 2 runs into the mid deck, the facade
 * rises out of it — so their top faces are exactly coplanar. With one flat
 * colour that was invisible; with tiled textures the two surfaces have
 * different tile phase and the overlap tears into z-fighting patches. A small
 * constant polygon offset per solid makes the winner deterministic, so the
 * seam is stable instead of flickering as the camera moves.
 */
function lambert(
  map: Texture,
  repeatX: number,
  repeatY: number,
  depthBias: number,
): MeshLambertMaterial {
  const tex = map.clone();
  tex.needsUpdate = true;
  tex.repeat.set(repeatX, repeatY);
  return new MeshLambertMaterial({
    map: tex,
    polygonOffset: depthBias !== 0,
    polygonOffsetFactor: -depthBias,
    polygonOffsetUnits: -depthBias * 2,
  });
}

/**
 * Six materials in BoxGeometry's own face order: +X, -X, +Y, -Y, +Z, -Z.
 * The top is a flat field of ground tiles; the sides are a strip whose first
 * row is the capped block, so every deck shows a grass lip over dirt.
 */
function buildFaces(s: Solid, depthBias: number): Material[] {
  const [nx, ny, nz] = tileCounts(s);
  const isDeck = s.kind === "deck";
  const isPedestal = s.kind === "pedestal";

  const cap = isDeck ? TILE.grassBlock : isPedestal ? TILE.goldCrate : null;
  const body = isPedestal ? TILE.goldCrate : TILE.dirt;
  const topField = isDeck
    ? TILE.grassField
    : isPedestal
      ? TILE.goldCrateMarked
      : TILE.dirt;

  const side = wallStrip(cap, body, ny);
  const top = tileField(topField);
  const bottom = tileField(TILE.dirt);

  // The field texture is a 4x4 tile block, so a repeat of n/4 lays n tiles.
  const f = 4;
  return [
    lambert(side, nz / f, 1, depthBias),
    lambert(side, nz / f, 1, depthBias),
    lambert(top, nx / f, nz / f, depthBias),
    lambert(bottom, nx / f, nz / f, depthBias),
    lambert(side, nx / f, 1, depthBias),
    lambert(side, nx / f, 1, depthBias),
  ];
}

/**
 * Built once per session and kept, exactly like the primitive world's shared
 * materials. Rebuilding these on every style switch cost a visible ~1s hitch.
 */
let tiledFaces: Array<{ s: Solid; mats: Material[] }> | null = null;

export function faces(): Array<{ s: Solid; mats: Material[] }> {
  if (!tiledFaces) tiledFaces = SOLIDS.map((s, i) => ({ s, mats: buildFaces(s, i) }));
  return tiledFaces;
}

/**
 * Composite every texture the tiled style needs while the browser is idle, so
 * the first press of its key swaps instantly instead of building canvases on
 * the frame the user is watching.
 */
export function prewarmTiles(): void {
  if (!sheetReady("tiles")) return;
  faces();
  treeSprite();
  for (const t of TILE.shrub) tileSprite(t);
}

