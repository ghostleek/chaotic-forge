import {
  type BufferGeometry,
  type Mesh,
  MeshStandardMaterial,
  MeshToonMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SOLIDS, type Solid } from "./levelData";

/**
 * The voxel art style is built from KayKit Block Bits: one glTF mesh per block
 * material, all sharing a single texture atlas. Every block model is a 2x2x2
 * cube centred on its origin, so an instance scaled by half a cell exactly
 * fills a one-unit cell of the world.
 *
 * The level is *not* re-authored. The same `SOLIDS` boxes that drive collision
 * are diced into cells and skinned with blocks, so what the player sees and
 * what the simulation collides against can never drift apart.
 */

const BASE = import.meta.env.BASE_URL ?? "/";
const GLTF_DIR = `${BASE}KayKit_BlockBits_1.0_FREE/Assets/gltf/`;
const ATLAS = `${BASE}KayKit_BlockBits_1.0_FREE/Textures/block_bits_texture.png`;

/** Half the model's own 2-unit extent: an instance scale of 1 fills one cell. */
const MODEL_HALF = 0.5;

export const BLOCK_IDS = [
  "dirt_with_grass",
  "dirt",
  "stone",
  "stone_dark",
  "wood",
  "bricks_A",
  "stone_with_gold",
  "tree",
  "grass",
] as const;

export type BlockId = (typeof BLOCK_IDS)[number];

export type BlockAssets = {
  geometries: Record<BlockId, BufferGeometry>;
  texture: Texture;
};

let assetsPromise: Promise<BlockAssets> | null = null;

function loadGeometry(loader: GLTFLoader, id: BlockId): Promise<BufferGeometry> {
  return new Promise((resolve, reject) => {
    loader.load(
      `${GLTF_DIR}${id}.gltf`,
      (gltf) => {
        let geo: BufferGeometry | null = null;
        gltf.scene.traverse((o) => {
          const mesh = o as Mesh;
          if (!geo && mesh.isMesh) geo = mesh.geometry as BufferGeometry;
        });
        if (!geo) reject(new Error(`No mesh in ${id}.gltf`));
        else resolve(geo);
      },
      undefined,
      () => reject(new Error(`Failed to load ${id}.gltf`)),
    );
  });
}

export function loadBlockAssets(): Promise<BlockAssets> {
  if (assetsPromise) return assetsPromise;
  const loader = new GLTFLoader();
  const texture = new Promise<Texture>((resolve, reject) => {
    new TextureLoader().load(
      ATLAS,
      (t) => {
        t.colorSpace = SRGBColorSpace;
        // glTF UVs are authored for an unflipped texture; the default flip
        // would shift every block to the wrong atlas cell.
        t.flipY = false;
        t.anisotropy = 4;
        t.needsUpdate = true;
        resolve(t);
      },
      undefined,
      () => reject(new Error("Failed to load block atlas")),
    );
  });

  assetsPromise = Promise.all([
    Promise.all(BLOCK_IDS.map((id) => loadGeometry(loader, id))),
    texture,
  ]).then(([geos, tex]) => {
    const geometries = {} as Record<BlockId, BufferGeometry>;
    BLOCK_IDS.forEach((id, i) => {
      geometries[id] = geos[i];
    });
    return { geometries, texture: tex };
  });
  return assetsPromise;
}

let litMaterial: MeshStandardMaterial | null = null;
let toonMaterial: MeshToonMaterial | null = null;

export function blockMaterial(texture: Texture, shading: "pbr" | "toon"): MeshStandardMaterial | MeshToonMaterial {
  if (shading === "toon") {
    if (!toonMaterial) toonMaterial = new MeshToonMaterial({ map: texture });
    return toonMaterial;
  }
  if (!litMaterial)
    litMaterial = new MeshStandardMaterial({ map: texture, roughness: 0.72, metalness: 0 });
  return litMaterial;
}

export type BlockInstance = {
  block: BlockId;
  /** cell centre in world space */
  pos: [number, number, number];
  /** per-axis instance scale; 1 means the model's native 2-unit cube */
  scale: [number, number, number];
};

/**
 * Several solids overlap on purpose — the facade rises out of the mid deck,
 * the pedestal out of the hazard deck, deck 2 into the mid deck. Two shells in
 * the same space would z-fight, so a cell is skipped when an *earlier* solid
 * already fills it. Earlier means lower index in `SOLIDS`, which makes the
 * result deterministic and keeps the larger floor plates winning over the
 * things that stand on them.
 */
function insideEarlierSolid(p: [number, number, number], index: number): boolean {
  const eps = 1e-4;
  for (let i = 0; i < index; i += 1) {
    const o = SOLIDS[i];
    if (
      p[0] > o.c[0] - o.s[0] / 2 + eps &&
      p[0] < o.c[0] + o.s[0] / 2 - eps &&
      p[1] > o.c[1] - o.s[1] / 2 + eps &&
      p[1] < o.c[1] + o.s[1] / 2 - eps &&
      p[2] > o.c[2] - o.s[2] / 2 + eps &&
      p[2] < o.c[2] + o.s[2] / 2 - eps
    )
      return true;
  }
  return false;
}

/**
 * Dice one solid into cells and keep only the outer shell. Interior cells are
 * never visible, and skipping them roughly halves the instance count on the
 * taller solids.
 *
 * Cell size is the solid's own size divided by a whole number of cells, so
 * blocks land exactly on the collision box even when the box is not an integer
 * number of units across (the mid deck is 10.5 deep).
 */
function diceSolid(
  s: Solid,
  index: number,
  blockFor: (s: Solid, j: number, ny: number) => BlockId,
): BlockInstance[] {
  const n: [number, number, number] = [
    Math.max(1, Math.round(s.s[0])),
    Math.max(1, Math.round(s.s[1])),
    Math.max(1, Math.round(s.s[2])),
  ];
  const cell: [number, number, number] = [s.s[0] / n[0], s.s[1] / n[1], s.s[2] / n[2]];
  const min: [number, number, number] = [
    s.c[0] - s.s[0] / 2,
    s.c[1] - s.s[1] / 2,
    s.c[2] - s.s[2] / 2,
  ];
  const out: BlockInstance[] = [];
  for (let i = 0; i < n[0]; i += 1)
    for (let j = 0; j < n[1]; j += 1)
      for (let k = 0; k < n[2]; k += 1) {
        const onShell =
          i === 0 || i === n[0] - 1 || j === 0 || j === n[1] - 1 || k === 0 || k === n[2] - 1;
        if (!onShell) continue;
        const pos: [number, number, number] = [
          min[0] + (i + 0.5) * cell[0],
          min[1] + (j + 0.5) * cell[1],
          min[2] + (k + 0.5) * cell[2],
        ];
        if (insideEarlierSolid(pos, index)) continue;
        out.push({
          block: blockFor(s, j, n[1]),
          pos,
          scale: [cell[0] * MODEL_HALF, cell[1] * MODEL_HALF, cell[2] * MODEL_HALF],
        });
      }
  return out;
}

function blockForSolid(s: Solid, j: number, ny: number): BlockId {
  const top = j === ny - 1;
  if (s.kind === "deck") return top ? "dirt_with_grass" : "dirt";
  if (s.kind === "pedestal") return top ? "stone_with_gold" : "bricks_A";
  // Thin uprights read better as timber than as a one-block-wide stone pillar.
  if (s.id.includes("arch") || s.id.includes("rail")) return "wood";
  return top ? "stone" : "stone_dark";
}

/**
 * Decorative props sit only behind both traversal lanes (z = 0 and z = -5), so
 * nothing a player must see is ever occluded by scenery. Positions are the
 * tree base; each entry is the top surface it stands on.
 */
export const PROP_SPOTS: Array<{ x: number; z: number; y: number; scale: number }> = [
  { x: -3.2, z: -2.0, y: 0, scale: 0.85 },
  { x: 11.2, z: -2.0, y: 0, scale: 0.8 },
  { x: 9.5, z: -7.0, y: 0, scale: 1 },
  { x: 12.6, z: -7.2, y: 0, scale: 0.75 },
  { x: 19.5, z: -7.2, y: 0, scale: 0.9 },
  { x: 23.6, z: -7.0, y: 0, scale: 0.8 },
  { x: 38.5, z: -7.0, y: 1.5, scale: 0.95 },
  { x: 44.0, z: -6.8, y: 1.5, scale: 0.8 },
];

/** A tree: two trunk blocks, a five-block canopy, one block capping it. */
function treeInstances(spot: (typeof PROP_SPOTS)[number]): BlockInstance[] {
  const s = spot.scale;
  const half: [number, number, number] = [MODEL_HALF * s, MODEL_HALF * s, MODEL_HALF * s];
  const out: BlockInstance[] = [];
  const at = (dx: number, dy: number, dz: number, block: BlockId) =>
    out.push({
      block,
      pos: [spot.x + dx * s, spot.y + (dy + 0.5) * s, spot.z + dz * s],
      scale: half,
    });
  at(0, 0, 0, "tree");
  at(0, 1, 0, "tree");
  // Two stacked rings plus a cap: reads as a canopy rather than a blob.
  for (const dy of [2, 3])
    for (const [dx, dz] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      at(dx, dy, dz, "grass");
  at(0, 4, 0, "grass");
  return out;
}

/**
 * A distant block horizon. Without it the level reads as boxes floating in an
 * empty sky; with it the same blocks that build the world also build the
 * landscape, which is the whole point of the style.
 *
 * Each column is a single instance stretched downward, so the ridge is solid
 * all the way past the bottom of frame instead of showing sky underneath and
 * reading as yet another row of platforms. Two rows, 226 instances, and heavy
 * enough fog at that distance that the stretched side texture never shows.
 */
const HORIZON_ROWS = [{ z: -150 }, { z: -210 }];
const HORIZON_X = { from: -90, to: 136, step: 2 };
/** Half-height of a column: the model is 2 units, so 9 makes an 18-unit slab. */
const HORIZON_DEPTH = 9;

function horizonInstances(): BlockInstance[] {
  const out: BlockInstance[] = [];
  HORIZON_ROWS.forEach((row, r) => {
    for (let x = HORIZON_X.from; x <= HORIZON_X.to; x += HORIZON_X.step) {
      // Deterministic rolling profile. Left unquantised: snapping to the block
      // grid produced long flat runs that looked like staircases.
      const top =
        Math.sin(x * 0.09 + r * 1.7) * 1.8 + Math.sin(x * 0.031 + r) * 3.4 - 7 - r * 3.5;
      out.push({
        block: "dirt_with_grass",
        pos: [x, top - HORIZON_DEPTH, row.z],
        scale: [1, HORIZON_DEPTH, 1],
      });
    }
  });
  return out;
}

let layoutCache: BlockInstance[] | null = null;

/** Every block instance in the world, shell-only, computed once. */
export function voxelLayout(): BlockInstance[] {
  if (layoutCache) return layoutCache;
  const out: BlockInstance[] = [];
  SOLIDS.forEach((s, i) => out.push(...diceSolid(s, i, blockForSolid)));
  for (const spot of PROP_SPOTS) out.push(...treeInstances(spot));
  out.push(...horizonInstances());
  layoutCache = out;
  return out;
}

/** Instances bucketed by block type, one bucket per InstancedMesh. */
export function voxelBuckets(): Map<BlockId, BlockInstance[]> {
  const buckets = new Map<BlockId, BlockInstance[]>();
  for (const inst of voxelLayout()) {
    const list = buckets.get(inst.block);
    if (list) list.push(inst);
    else buckets.set(inst.block, [inst]);
  }
  return buckets;
}
