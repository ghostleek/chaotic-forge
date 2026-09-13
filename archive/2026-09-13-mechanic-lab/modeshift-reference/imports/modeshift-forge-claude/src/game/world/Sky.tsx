import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BackSide,
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  type Mesh,
  NearestFilter,
  SRGBColorSpace,
  type Texture,
} from "three";
import type { ArtStyle, ParallaxLayer } from "./artStyles";
import { BG_TILE, parallaxBand } from "./assets";
import { useSheetsReady } from "./AssetSurfaces";
import { player } from "../gameState";

/**
 * The dome has to clear the furthest parallax band and still sit inside the
 * camera's 640-unit far plane from anywhere the player can stand.
 */
const SKY_RADIUS = 300;

/** Tiles per horizontal repeat and rows of solid ground beneath the silhouette. */
const BAND_COLS = 8;
const BAND_GROUND_ROWS = 6;
/** Plane width: comfortably wider than any lens sees at these depths. */
const BAND_PLANE_W = 460;

const BANDS: Record<ParallaxLayer["band"], { silhouette: readonly number[]; ground: readonly number[] }> = {
  farClouds: { silhouette: BG_TILE.cloudsPale, ground: BG_TILE.groundPale },
  nearTrees: { silhouette: BG_TILE.cloudsWithTrees, ground: BG_TILE.groundPale },
  hills: { silhouette: BG_TILE.hillsGreen, ground: BG_TILE.groundGreen },
};

/**
 * One parallax band. The texture is anchored to world X — the plane follows the
 * player only so a finite quad always covers the view — so the layer's apparent
 * speed falls out of its distance from the camera, in all three lenses.
 */
function ParallaxBand({ layer }: { layer: ParallaxLayer }) {
  const mesh = useRef<Mesh>(null);

  const tex = useMemo(() => {
    const band = BANDS[layer.band];
    const t = parallaxBand(band.silhouette, band.ground, BAND_COLS, BAND_GROUND_ROWS).clone();
    t.wrapT = ClampToEdgeWrapping;
    t.repeat.set(BAND_PLANE_W / layer.worldWidth, 1);
    t.needsUpdate = true;
    return t;
  }, [layer]);

  // Square tiles: one repeat spans BAND_COLS tiles across and 1 + ground rows down.
  const tileWorld = layer.worldWidth / BAND_COLS;
  const height = tileWorld * (1 + BAND_GROUND_ROWS);
  // The silhouette occupies the top tile, so the plane's top edge is the horizon.
  const centreY = layer.horizonY - height / 2;

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.position.x = player.x;
    tex.offset.x = (player.x - BAND_PLANE_W / 2) / layer.worldWidth;
  });

  return (
    <mesh
      ref={mesh}
      position={[0, centreY, layer.z]}
      scale={[BAND_PLANE_W, height, 1]}
      renderOrder={-1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={tex}
        color={layer.tint}
        transparent={layer.opacity < 1}
        opacity={layer.opacity}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function gradientTexture(top: string, bottom: string, pixelated: boolean): Texture {
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = pixelated ? 12 : 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = pixelated ? NearestFilter : LinearFilter;
  tex.magFilter = pixelated ? NearestFilter : LinearFilter;
  return tex;
}

/** Distant parallax band. Blocky for pixel art, soft peaks for the cartoon. */
function silhouetteTexture(kind: "blocky" | "peaks", color: string, width = 512): Texture {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = color;

  if (kind === "blocky") {
    const step = 16;
    // Deterministic pseudo-random skyline: same silhouette every run.
    let h = 60;
    for (let x = 0; x < c.width; x += step) {
      const n = Math.sin(x * 0.11) * 18 + Math.sin(x * 0.037) * 26;
      h = Math.max(18, Math.min(112, Math.round((70 + n) / 8) * 8));
      ctx.fillRect(x, c.height - h, step, h);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(0, c.height);
    for (let x = 0; x <= c.width; x += 8) {
      const y =
        c.height -
        (52 + Math.sin(x * 0.013) * 34 + Math.sin(x * 0.051) * 12 + Math.sin(x * 0.006) * 20);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(c.width, c.height);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  return tex;
}

export function Sky({ style }: { style: ArtStyle }) {
  const sheetsReady = useSheetsReady(style.parallax !== null);
  const parallax = style.parallax && sheetsReady ? style.parallax : null;

  const sky = useMemo(
    () => (style.sky ? gradientTexture(style.sky.top, style.sky.bottom, style.pixelated) : null),
    [style],
  );
  const near = useMemo(
    () =>
      style.silhouette
        ? silhouetteTexture(style.silhouette.kind, style.silhouette.color)
        : null,
    [style],
  );
  const far = useMemo(
    () =>
      style.silhouette
        ? silhouetteTexture(style.silhouette.kind, style.silhouette.second, 384)
        : null,
    [style],
  );

  return (
    <group>
      {/* Painted first so nothing can ever show through: the dome is clipped by
          the camera's far plane if it is larger than it, and a style with no
          dome relies on this outright. */}
      <color attach="background" args={[style.background]} key={style.id} />

      {sky && (
        <mesh scale={[SKY_RADIUS, SKY_RADIUS, SKY_RADIUS]} renderOrder={-2}>
          <sphereGeometry args={[1, 48, 32]} />
          <meshBasicMaterial map={sky} side={BackSide} depthWrite={false} fog={false} />
        </mesh>
      )}

      {parallax?.map((layer) => <ParallaxBand key={layer.band} layer={layer} />)}

      {!parallax && far && (
        <mesh position={[20, 24, -170]} scale={[400, 100, 1]} renderOrder={-1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={far} transparent depthWrite={false} fog={false} />
        </mesh>
      )}
      {!parallax && near && (
        <mesh position={[20, 12, -120]} scale={[300, 78, 1]} renderOrder={-1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={near} transparent depthWrite={false} fog={false} />
        </mesh>
      )}
    </group>
  );
}
