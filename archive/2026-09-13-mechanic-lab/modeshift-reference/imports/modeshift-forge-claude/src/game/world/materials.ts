import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  DataTexture,
  IcosahedronGeometry,
  LineBasicMaterial,
  type Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  PlaneGeometry,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  TorusGeometry,
} from "three";
import type { ArtStyle } from "./artStyles";

/** One geometry per shape, scaled per instance. */
export const UNIT_BOX = new BoxGeometry(1, 1, 1);
export const UNIT_PLANE = new PlaneGeometry(1, 1);
export const CORE_GEO = new IcosahedronGeometry(0.34, 0);
export const CORE_HALO_GEO = new TorusGeometry(0.62, 0.035, 8, 40);
export const PORTAL_RING_GEO = new TorusGeometry(1.5, 0.11, 12, 56);
export const PORTAL_DISC_GEO = new CircleGeometry(1.42, 48);

export const DECK_MATERIAL = new MeshStandardMaterial({
  color: "#252d40",
  roughness: 0.72,
  metalness: 0.3,
});

export const STRUCTURE_MATERIAL = new MeshStandardMaterial({
  color: "#1b2233",
  roughness: 0.5,
  metalness: 0.5,
});

export const PEDESTAL_MATERIAL = new MeshStandardMaterial({
  color: "#2e3750",
  roughness: 0.42,
  metalness: 0.58,
});

export const EDGE_MATERIAL = new LineBasicMaterial({
  color: "#89a6cc",
  transparent: true,
  opacity: 0.6,
});

/**
 * Restyle the shared singletons in place. Geometry and material instances stay
 * reused; only their parameters change when the art direction changes.
 */
export function applyArtStyle(style: ArtStyle): void {
  const ramp = gradientMap(style.toonSteps || 3);
  for (const [toon, tokens] of [
    [DECK_TOON, style.deck],
    [STRUCTURE_TOON, style.structure],
    [PEDESTAL_TOON, style.pedestal],
  ] as const) {
    toon.color.set(tokens.color);
    toon.gradientMap = ramp;
    toon.needsUpdate = true;
  }
  if (style.outline) OUTLINE_MATERIAL.color.set(style.outline.color);
  TRIM_MATERIAL.opacity = style.trimOpacity;

  DECK_MATERIAL.color.set(style.deck.color);
  DECK_MATERIAL.roughness = style.deck.roughness;
  DECK_MATERIAL.metalness = style.deck.metalness;

  STRUCTURE_MATERIAL.color.set(style.structure.color);
  STRUCTURE_MATERIAL.roughness = style.structure.roughness;
  STRUCTURE_MATERIAL.metalness = style.structure.metalness;

  PEDESTAL_MATERIAL.color.set(style.pedestal.color);
  PEDESTAL_MATERIAL.roughness = style.pedestal.roughness;
  PEDESTAL_MATERIAL.metalness = style.pedestal.metalness;

  EDGE_MATERIAL.color.set(style.edge.color);
  EDGE_MATERIAL.opacity = style.edge.opacity;
}

/**
 * Cel-shaded twins of the lit surfaces. Swapping the shading model — not just
 * the colours — is what makes the art styles read as different renderers.
 */
export const DECK_TOON = new MeshToonMaterial({ color: "#8fbf4a" });
export const STRUCTURE_TOON = new MeshToonMaterial({ color: "#7a4b2c" });
export const PEDESTAL_TOON = new MeshToonMaterial({ color: "#d8a33f" });

/** Inverted-hull ink outline. */
export const OUTLINE_MATERIAL = new MeshBasicMaterial({
  color: "#17121f",
  side: BackSide,
  toneMapped: false,
});

const gradientCache = new Map<number, DataTexture>();

/** Hard banded ramp: darkest band at 0.28 so the shadow side still reads. */
function gradientMap(steps: number): DataTexture {
  const cached = gradientCache.get(steps);
  if (cached) return cached;
  const n = Math.max(2, steps);
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i += 1) {
    const v = Math.round((0.28 + (1 - 0.28) * (i / (n - 1))) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new DataTexture(data, n, 1, RGBAFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  gradientCache.set(steps, tex);
  return tex;
}

/** Thin emissive trim along deck edges; tinted by the active mode accent. */
export const TRIM_MATERIAL = new MeshBasicMaterial({
  color: "#ffb648",
  transparent: true,
  opacity: 0.85,
  toneMapped: false,
});

export function materialFor(
  kind: "deck" | "structure" | "pedestal" | "projection",
  shading: "pbr" | "toon",
): Material {
  if (shading === "toon") {
    if (kind === "deck") return DECK_TOON;
    if (kind === "pedestal") return PEDESTAL_TOON;
    return STRUCTURE_TOON;
  }
  if (kind === "deck") return DECK_MATERIAL;
  if (kind === "pedestal") return PEDESTAL_MATERIAL;
  return STRUCTURE_MATERIAL;
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  return [c, ctx];
}

function finish(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let gridTexture: CanvasTexture | null = null;
export function getGridTexture(): CanvasTexture {
  if (gridTexture) return gridTexture;
  const [c, ctx] = canvas(128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(150,185,225,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);
  ctx.strokeStyle = "rgba(120,155,200,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 0);
  ctx.lineTo(64, 128);
  ctx.moveTo(0, 64);
  ctx.lineTo(128, 64);
  ctx.stroke();
  gridTexture = finish(c);
  return gridTexture;
}

let hatchTexture: CanvasTexture | null = null;
export function getHatchTexture(): CanvasTexture {
  if (hatchTexture) return hatchTexture;
  const [c, ctx] = canvas(64);
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 7;
  for (let i = -64; i < 128; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 64, 64);
    ctx.stroke();
  }
  hatchTexture = finish(c);
  return hatchTexture;
}

let chevronTexture: CanvasTexture | null = null;
export function getChevronTexture(): CanvasTexture {
  if (chevronTexture) return chevronTexture;
  const [c, ctx] = canvas(64);
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (const off of [4, 30]) {
    ctx.beginPath();
    ctx.moveTo(off, 12);
    ctx.lineTo(off + 20, 32);
    ctx.lineTo(off, 52);
    ctx.stroke();
  }
  chevronTexture = finish(c);
  return chevronTexture;
}

export function overlayMaterial(color: string, opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}
