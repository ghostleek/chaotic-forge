import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EdgesGeometry, type Mesh } from "three";
import { SOLIDS } from "./levelData";
import {
  EDGE_MATERIAL,
  OUTLINE_MATERIAL,
  TRIM_MATERIAL,
  UNIT_BOX,
  UNIT_PLANE,
  applyArtStyle,
  getGridTexture,
  getHatchTexture,
  materialFor,
} from "./materials";
import { useArtStyle } from "./artStyles";
import { presentation } from "../presentation";
import {
  TileProps,
  TiledSurfaces,
  VoxelSurfaces,
  useBlockAssets,
  useSheetsReady,
} from "./AssetSurfaces";

const FACADE = SOLIDS.find((s) => s.id === "facade")!;

/** Thin glowing strips on the front and back lip of every deck. */
const DECK_TRIMS = SOLIDS.filter((s) => s.kind === "deck" || s.kind === "pedestal").flatMap((s) => {
  const top = s.c[1] + s.s[1] / 2;
  const halfZ = s.s[2] / 2;
  return [
    {
      id: `${s.id}-front`,
      position: [s.c[0], top - 0.015, s.c[2] + halfZ - 0.04] as [number, number, number],
      scale: [s.s[0] - 0.05, 0.05, 0.07] as [number, number, number],
    },
    {
      id: `${s.id}-back`,
      position: [s.c[0], top - 0.015, s.c[2] - halfZ + 0.04] as [number, number, number],
      scale: [s.s[0] - 0.05, 0.05, 0.07] as [number, number, number],
    },
  ];
});

export function WorldGeometry() {
  const style = useArtStyle();
  const edges = useMemo(() => new EdgesGeometry(UNIT_BOX), []);
  const warning = useRef<Mesh>(null);

  // Asset-driven styles swap what the surfaces are *made of*. Until their
  // assets land, the primitive world keeps rendering, so a style switch never
  // flashes an empty level.
  const tilesReady = useSheetsReady(style.surfaces === "tiles") && style.surfaces === "tiles";
  const blocks = useBlockAssets(style.surfaces === "voxels");
  const voxelsReady = style.surfaces === "voxels" && blocks !== null;
  const showPrimitives = !tilesReady && !voxelsReady;

  useEffect(() => {
    applyArtStyle(style);
  }, [style]);

  useFrame(({ clock }) => {
    TRIM_MATERIAL.color.copy(presentation.accent);
    if (warning.current) {
      const m = warning.current.material as { opacity: number };
      m.opacity = 0.13 + Math.sin(clock.elapsedTime * 1.4) * 0.03;
    }
  });

  const deckTops = useMemo(
    () =>
      SOLIDS.filter((s) => s.kind === "deck" || s.kind === "pedestal").map((s) => {
        const tex = getGridTexture().clone();
        tex.needsUpdate = true;
        tex.repeat.set(Math.max(1, Math.round(s.s[0] / 2)), Math.max(1, Math.round(s.s[2] / 2)));
        return {
          id: s.id,
          tex,
          y: s.c[1] + s.s[1] / 2 + 0.006,
          x: s.c[0],
          z: s.c[2],
          w: s.s[0],
          d: s.s[2],
        };
      }),
    [],
  );

  const hatch = useMemo(() => {
    const t = getHatchTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(FACADE.s[0] / 1.1, FACADE.s[1] / 1.1);
    return t;
  }, []);

  return (
    <group>
      {/* Ink outline: an inverted hull grown by a constant world-space width. */}
      {style.outline &&
        SOLIDS.map((s) => (
          <mesh
            key={`outline-${s.id}`}
            geometry={UNIT_BOX}
            material={OUTLINE_MATERIAL}
            position={s.c}
            scale={[
              s.s[0] + style.outline!.width * 2,
              s.s[1] + style.outline!.width * 2,
              s.s[2] + style.outline!.width * 2,
            ]}
          />
        ))}

      {showPrimitives &&
        SOLIDS.map((s) => (
          <group key={s.id} position={s.c}>
            <mesh geometry={UNIT_BOX} material={materialFor(s.kind, style.shading)} scale={s.s} />
            {style.edge.opacity > 0.01 && (
              <lineSegments geometry={edges} material={EDGE_MATERIAL} scale={s.s} />
            )}
          </group>
        ))}

      {tilesReady && (
        <>
          <TiledSurfaces />
          <TileProps />
        </>
      )}
      {voxelsReady && blocks && <VoxelSurfaces assets={blocks} shading={style.shading} />}

      {style.grid.opacity > 0.01 &&
        deckTops.map((d) => (
          <mesh
            key={`grid-${d.id}`}
            geometry={UNIT_PLANE}
            position={[d.x, d.y, d.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[d.w, d.d, 1]}
          >
            <meshBasicMaterial
              map={d.tex}
              transparent
              opacity={style.grid.opacity}
              depthWrite={false}
              color={style.grid.color}
            />
          </mesh>
        ))}

      {style.trimOpacity > 0.01 &&
        DECK_TRIMS.map((t) => (
          <mesh
            key={t.id}
            geometry={UNIT_BOX}
            material={TRIM_MATERIAL}
            position={t.position}
            scale={t.scale}
          />
        ))}

      {/* "No route this way": the facade wears its refusal on its front face. */}
      <mesh
        visible={showPrimitives}
        ref={warning}
        geometry={UNIT_PLANE}
        position={[FACADE.c[0], FACADE.c[1], FACADE.c[2] + FACADE.s[2] / 2 + 0.02]}
        scale={[FACADE.s[0] - 0.2, FACADE.s[1] - 0.4, 1]}
      >
        <meshBasicMaterial
          map={hatch}
          color={style.edge.color}
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
