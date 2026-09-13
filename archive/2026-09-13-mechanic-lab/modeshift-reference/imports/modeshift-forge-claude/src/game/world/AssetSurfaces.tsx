import { useEffect, useMemo, useRef, useState } from "react";
import { Billboard } from "@react-three/drei";
import { DoubleSide, InstancedMesh, Object3D } from "three";
import { UNIT_BOX, UNIT_PLANE } from "./materials";
import { TILE, loadSheets, sheetReady, tileSprite, treeSprite } from "./assets";
import { faces } from "./tiledFaces";
import {
  PROP_SPOTS,
  type BlockAssets,
  type BlockId,
  blockMaterial,
  loadBlockAssets,
  voxelBuckets,
} from "./voxels";

/**
 * Surfaces built from authored assets instead of shaded primitives.
 *
 * Both techniques read the same `SOLIDS` that drive collision, so the art can
 * never disagree with the simulation. Neither component renders anything until
 * its assets have arrived, and the primitive world stays mounted underneath
 * until then, so switching styles never shows an untextured frame.
 */

/* ------------------------------------------------------------------ loading */

export function useSheetsReady(enabled: boolean): boolean {
  const [ready, setReady] = useState(() => sheetReady("tiles"));
  useEffect(() => {
    if (!enabled || ready) return;
    let live = true;
    void loadSheets(["tiles", "characters", "backgrounds"]).then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, [enabled, ready]);
  return ready;
}

export function useBlockAssets(enabled: boolean): BlockAssets | null {
  const [assets, setAssets] = useState<BlockAssets | null>(null);
  useEffect(() => {
    if (!enabled || assets) return;
    let live = true;
    void loadBlockAssets()
      .then((a) => {
        if (live) setAssets(a);
      })
      .catch((err) => console.error("[blockbits]", err));
    return () => {
      live = false;
    };
  }, [enabled, assets]);
  return assets;
}

/* ------------------------------------------------------- tiled pixel-art set */

export function TiledSurfaces() {
  const built = useMemo(() => faces(), []);

  return (
    <group>
      {built.map(({ s, mats }) => (
        <mesh key={s.id} geometry={UNIT_BOX} material={mats} position={s.c} scale={s.s} />
      ))}
    </group>
  );
}

/** Billboarded scenery: a tree per prop spot, with a shrub tucked beside it. */
export function TileProps() {
  const tree = useMemo(() => treeSprite(), []);
  const shrubs = useMemo(() => TILE.shrub.map((t) => tileSprite(t)), []);

  return (
    <group>
      {PROP_SPOTS.map((spot, i) => {
        // Canvas is 3 tiles wide by 5 tall; keep that aspect so the trunk sits
        // on the deck rather than floating or sinking into it.
        const h = 5 * spot.scale;
        const w = 3 * spot.scale;
        const shrub = shrubs[i % shrubs.length];
        return (
          <group key={`prop-${i}`}>
            <Billboard position={[spot.x, spot.y + h / 2, spot.z]}>
              <mesh geometry={UNIT_PLANE} scale={[w, h, 1]}>
                <meshBasicMaterial
                  map={tree}
                  transparent
                  alphaTest={0.5}
                  side={DoubleSide}
                  toneMapped={false}
                />
              </mesh>
            </Billboard>
            <Billboard position={[spot.x + 1.5 * spot.scale, spot.y + 0.45, spot.z + 0.6]}>
              <mesh geometry={UNIT_PLANE} scale={[0.9, 0.9, 1]}>
                <meshBasicMaterial
                  map={shrub}
                  transparent
                  alphaTest={0.5}
                  side={DoubleSide}
                  toneMapped={false}
                />
              </mesh>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}

/* ----------------------------------------------------------- voxel block set */

/**
 * One InstancedMesh per block type: nine draw calls for the whole world,
 * including the trees. Matrices are written once on mount — nothing here
 * animates, so there is no per-frame cost at all.
 */
export function VoxelSurfaces({ assets, shading }: { assets: BlockAssets; shading: "pbr" | "toon" }) {
  const buckets = useMemo(() => voxelBuckets(), []);
  const material = useMemo(() => blockMaterial(assets.texture, shading), [assets, shading]);
  const refs = useRef(new Map<BlockId, InstancedMesh>());

  useEffect(() => {
    const dummy = new Object3D();
    let placed = 0;
    for (const [block, list] of buckets) {
      const mesh = refs.current.get(block);
      if (!mesh) continue;
      list.forEach((inst, i) => {
        dummy.position.set(inst.pos[0], inst.pos[1], inst.pos[2]);
        dummy.scale.set(inst.scale[0], inst.scale[1], inst.scale[2]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      placed += list.length;
    }
    if (import.meta.env.DEV)
      console.info(`[blockbits] ${placed} block instances in ${buckets.size} draw calls`);
  }, [buckets, assets]);

  return (
    <group>
      {[...buckets].map(([block, list]) => (
        <instancedMesh
          key={block}
          ref={(el) => {
            if (el) refs.current.set(block, el);
            else refs.current.delete(block);
          }}
          args={[assets.geometries[block], material, list.length]}
          castShadow={false}
          receiveShadow={false}
        />
      ))}
    </group>
  );
}
