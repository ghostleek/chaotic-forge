import { useSyncExternalStore } from "react";

/**
 * Art direction is the second lever in the laboratory. These are not palette
 * swaps: each style changes the *rendering technique* — shading model, render
 * resolution, outlines, sky and backdrop — over identical geometry and physics.
 */
export type ArtStyleId = "obsidian" | "pixel" | "cel" | "grove" | "blockbits";

export type SurfaceTokens = {
  color: string;
  roughness: number;
  metalness: number;
};

/**
 * How a style builds the world's surfaces.
 *
 * `primitive` is the original technique: flat-shaded boxes whose look comes
 * entirely from the shading model. The other two replace what the world is
 * *made of* rather than how it is lit, which is the lever authored art gives
 * you that a renderer switch does not.
 */
export type SurfaceKind = "primitive" | "tiles" | "voxels";

/**
 * Parallax layer authored from a sprite sheet rather than drawn procedurally.
 *
 * The band's texture is anchored to world X, so a layer's apparent speed comes
 * from its distance through the ordinary perspective camera — there is no
 * scroll-rate fudge factor anywhere.
 */
export type ParallaxLayer = {
  /** which composed band to use */
  band: "farClouds" | "nearTrees" | "hills";
  /** distance behind the world; larger reads as further away */
  z: number;
  /** world height of the top of the silhouette */
  horizonY: number;
  /** world units one horizontal repeat of the band spans */
  worldWidth: number;
  opacity: number;
  /** multiplied into the band, for aerial perspective on the far layers */
  tint: string;
};

export type ArtStyle = {
  id: ArtStyleId;
  name: string;
  tagline: string;
  technique: string;
  key: string;
  worldTone: "dark" | "light";
  swatch: [string, string, string];

  /** what the world's surfaces are built from */
  surfaces: SurfaceKind;
  /** image parallax behind the world; overrides the procedural silhouette */
  parallax: ParallaxLayer[] | null;
  /** billboarded sprite avatar instead of the capsule */
  spriteAvatar: boolean;
  /** lit surfaces: physically based, or banded cel shading */
  shading: "pbr" | "toon";
  /** number of bands when shading is "toon" */
  toonSteps: number;
  /** inverted-hull ink outline around solid geometry */
  outline: { color: string; width: number } | null;
  /** render scale; < 1 with pixelated upscaling gives real pixel art */
  renderScale: number | null;
  pixelated: boolean;
  /** ACES rolls highlights off for the HDR look; flat styles want exact colour. */
  toneMapping: "aces" | "none";

  background: string;
  /** vertical gradient sky; null keeps the flat background colour */
  sky: { top: string; bottom: string } | null;
  /** distant parallax silhouette band */
  silhouette: { kind: "blocky" | "peaks"; color: string; second: string } | null;
  stars: boolean;

  fogColor: string;
  /** multiplier applied to the active mode's fog density */
  fogScale: number;

  deck: SurfaceTokens;
  structure: SurfaceTokens;
  pedestal: SurfaceTokens;
  edge: { color: string; opacity: number };
  grid: { color: string; opacity: number };
  trimOpacity: number;
  lights: {
    ambient: { color: string; intensity: number };
    hemi: { sky: string; ground: string; intensity: number };
    key: { color: string; intensity: number };
    fill: { color: string; intensity: number };
    accentIntensity: number;
  };
  core: { color: string; emissive: string; halo: string };
  portal: { color: string; emissive: string; disc: string };
  avatar: { body: string };
  hazard: string;
  passage: string;
  safeRoute: string;
  /** The forged span: Traverse's projection made solid. */
  projection: string;
};

export const ART_STYLES: Record<ArtStyleId, ArtStyle> = {
  obsidian: {
    id: "obsidian",
    name: "Obsidian Lab",
    tagline: "Dark orbital chamber, neon emissive",
    technique: "PBR · fog · starfield · full resolution",
    key: "4",
    worldTone: "dark",
    swatch: ["#04050a", "#252d40", "#63f0ff"],

    surfaces: "primitive",
    parallax: null,
    spriteAvatar: false,
    shading: "pbr",
    toonSteps: 0,
    outline: null,
    renderScale: null,
    pixelated: false,
    toneMapping: "aces",

    background: "#04050a",
    sky: null,
    silhouette: null,
    stars: true,

    fogColor: "#070a14",
    fogScale: 1,

    deck: { color: "#252d40", roughness: 0.72, metalness: 0.3 },
    structure: { color: "#1b2233", roughness: 0.5, metalness: 0.5 },
    pedestal: { color: "#2e3750", roughness: 0.42, metalness: 0.58 },
    edge: { color: "#89a6cc", opacity: 0.6 },
    grid: { color: "#8fb4dd", opacity: 0.3 },
    trimOpacity: 0.85,
    lights: {
      ambient: { color: "#6d82ab", intensity: 0.9 },
      hemi: { sky: "#3c5a8c", ground: "#05060b", intensity: 1.1 },
      key: { color: "#d8e6ff", intensity: 2.3 },
      fill: { color: "#5b7fbe", intensity: 0.9 },
      accentIntensity: 26,
    },
    core: { color: "#dffaff", emissive: "#63f0ff", halo: "#7ef0ff" },
    portal: { color: "#9ff6ff", emissive: "#38dcff", disc: "#4fe0ff" },
    avatar: { body: "#2b3346" },
    hazard: "#ff5fd2",
    passage: "#49e2ff",
    safeRoute: "#9ffce0",
    projection: "#ffb648",
  },

  pixel: {
    id: "pixel",
    name: "Pixel Forge",
    tagline: "16-bit sunset, chunky and flat",
    technique: "320×180 render · nearest upscale · 3-band toon",
    key: "5",
    worldTone: "dark",
    swatch: ["#2b1b4d", "#8fbf4a", "#ffd84a"],

    surfaces: "primitive",
    parallax: null,
    spriteAvatar: false,
    shading: "toon",
    toonSteps: 3,
    outline: null,
    renderScale: 0.25,
    pixelated: true,
    toneMapping: "none",

    background: "#2b1b4d",
    sky: { top: "#241546", bottom: "#ff9a5c" },
    silhouette: { kind: "blocky", color: "#3c2a63", second: "#573b7d" },
    stars: false,

    fogColor: "#4a2f63",
    fogScale: 0.25,

    deck: { color: "#8fbf4a", roughness: 1, metalness: 0 },
    structure: { color: "#7a4b2c", roughness: 1, metalness: 0 },
    pedestal: { color: "#d8a33f", roughness: 1, metalness: 0 },
    edge: { color: "#2a1a3f", opacity: 0.55 },
    grid: { color: "#ffffff", opacity: 0.1 },
    trimOpacity: 1,
    lights: {
      ambient: { color: "#ffd9b0", intensity: 0.34 },
      hemi: { sky: "#ffc48a", ground: "#3c2a63", intensity: 0.26 },
      key: { color: "#fff3d6", intensity: 0.6 },
      fill: { color: "#ff8f5c", intensity: 0.16 },
      accentIntensity: 0,
    },
    core: { color: "#fff6c9", emissive: "#ffd84a", halo: "#ffe98a" },
    portal: { color: "#bff6ff", emissive: "#4fd4ff", disc: "#7ee6ff" },
    avatar: { body: "#e8484f" },
    hazard: "#ff2d6f",
    passage: "#ffe14a",
    safeRoute: "#7cf5a0",
    projection: "#ffa030",
  },

  cel: {
    id: "cel",
    name: "Cel Ink",
    tagline: "Cartoon daylight, hard ink outlines",
    technique: "2-band toon · inverted-hull outlines · no fog",
    key: "6",
    worldTone: "light",
    swatch: ["#8fdcff", "#46c9a0", "#ff4fa3"],

    surfaces: "primitive",
    parallax: null,
    spriteAvatar: false,
    shading: "toon",
    toonSteps: 2,
    outline: { color: "#17121f", width: 0.11 },
    renderScale: null,
    pixelated: false,
    toneMapping: "none",

    background: "#8fdcff",
    sky: { top: "#4aa8e8", bottom: "#dff5ff" },
    silhouette: { kind: "peaks", color: "#7fb8dd", second: "#a9d4ee" },
    stars: false,

    fogColor: "#cfeeff",
    fogScale: 0.3,

    deck: { color: "#46c9a0", roughness: 1, metalness: 0 },
    structure: { color: "#7b5cf0", roughness: 1, metalness: 0 },
    pedestal: { color: "#ffd166", roughness: 1, metalness: 0 },
    edge: { color: "#17121f", opacity: 0.85 },
    grid: { color: "#ffffff", opacity: 0.16 },
    trimOpacity: 1,
    lights: {
      ambient: { color: "#ffffff", intensity: 0.32 },
      hemi: { sky: "#dff5ff", ground: "#2f7f66", intensity: 0.26 },
      key: { color: "#fffdf4", intensity: 0.62 },
      fill: { color: "#9fd8ff", intensity: 0.16 },
      accentIntensity: 0,
    },
    core: { color: "#ffffff", emissive: "#ff4fa3", halo: "#ff8fc6" },
    portal: { color: "#ffffff", emissive: "#7b5cf0", disc: "#b39dff" },
    avatar: { body: "#ff5f6d" },
    hazard: "#e8236b",
    passage: "#ffb020",
    safeRoute: "#0f9d6b",
    projection: "#ff9f1c",
  },

  grove: {
    id: "grove",
    name: "Pixel Grove",
    tagline: "Hand-drawn tiles, sprite hero, layered sky",
    technique: "Authored tilesets · sprite billboards · parallax bands",
    key: "7",
    worldTone: "light",
    swatch: ["#8ad7e8", "#4fbf62", "#c07f4f"],

    surfaces: "tiles",
    parallax: [
      { band: "farClouds", z: -170, horizonY: 16, worldWidth: 46, opacity: 1, tint: "#e4f3f9" },
      { band: "nearTrees", z: -108, horizonY: 9, worldWidth: 32, opacity: 1, tint: "#c2e6f0" },
      { band: "hills", z: -58, horizonY: -3, worldWidth: 22, opacity: 1, tint: "#4f9160" },
    ],
    spriteAvatar: true,
    shading: "toon",
    toonSteps: 4,
    outline: null,
    renderScale: 0.5,
    pixelated: true,
    toneMapping: "none",

    background: "#9fdcea",
    sky: { top: "#5fbfe0", bottom: "#d8f2f7" },
    silhouette: null,
    stars: false,

    fogColor: "#cfe9f2",
    fogScale: 0.16,

    deck: { color: "#ffffff", roughness: 1, metalness: 0 },
    structure: { color: "#ffffff", roughness: 1, metalness: 0 },
    pedestal: { color: "#ffffff", roughness: 1, metalness: 0 },
    edge: { color: "#2f2436", opacity: 0 },
    grid: { color: "#ffffff", opacity: 0 },
    trimOpacity: 0,
    lights: {
      ambient: { color: "#ffffff", intensity: 0.86 },
      hemi: { sky: "#dff4ff", ground: "#6b8f5a", intensity: 0.42 },
      key: { color: "#fff6e2", intensity: 0.5 },
      fill: { color: "#bfe4ee", intensity: 0.2 },
      accentIntensity: 0,
    },
    core: { color: "#fffbe0", emissive: "#ffc23d", halo: "#ffe08a" },
    portal: { color: "#ffffff", emissive: "#3fd0ff", disc: "#8ae6ff" },
    avatar: { body: "#6fd36f" },
    hazard: "#ff3b6b",
    passage: "#ffd23d",
    safeRoute: "#3fd07a",
    projection: "#ffb02e",
  },

  blockbits: {
    id: "blockbits",
    name: "Block Bits",
    tagline: "Chunky voxel props, soft daylight",
    technique: "Instanced glTF blocks · PBR · one atlas, 900+ instances",
    key: "8",
    worldTone: "light",
    swatch: ["#7cc6ea", "#5aa845", "#8d6b4a"],

    surfaces: "voxels",
    parallax: null,
    spriteAvatar: false,
    shading: "pbr",
    toonSteps: 0,
    outline: null,
    renderScale: null,
    pixelated: false,
    toneMapping: "aces",

    background: "#8fd0ef",
    sky: { top: "#3d8fce", bottom: "#e6f4fd" },
    silhouette: null,
    stars: false,

    // Enough aerial perspective that the block horizon melts into the dome
    // instead of reading as another row of platforms.
    fogColor: "#a8cfe8",
    fogScale: 1.2,

    deck: { color: "#ffffff", roughness: 0.72, metalness: 0 },
    structure: { color: "#ffffff", roughness: 0.72, metalness: 0 },
    pedestal: { color: "#ffffff", roughness: 0.72, metalness: 0 },
    edge: { color: "#28323f", opacity: 0 },
    grid: { color: "#ffffff", opacity: 0 },
    trimOpacity: 0,
    lights: {
      ambient: { color: "#ffffff", intensity: 0.52 },
      hemi: { sky: "#dff0fb", ground: "#4a6b3c", intensity: 0.72 },
      key: { color: "#fff4dc", intensity: 2.1 },
      fill: { color: "#a8ccea", intensity: 0.6 },
      accentIntensity: 6,
    },
    core: { color: "#fffbe0", emissive: "#ffc23d", halo: "#ffe08a" },
    portal: { color: "#e8faff", emissive: "#37c8ff", disc: "#7fe0ff" },
    avatar: { body: "#e05a4a" },
    hazard: "#ff4f8f",
    passage: "#ffd23d",
    safeRoute: "#4fd08a",
    projection: "#ffae3d",
  },
};

export const ART_STYLE_ORDER: ArtStyleId[] = ["obsidian", "pixel", "cel", "grove", "blockbits"];

export const ART_STYLE_KEYS: Record<string, ArtStyleId> = {
  Digit4: "obsidian",
  Digit5: "pixel",
  Digit6: "cel",
  Digit7: "grove",
  Digit8: "blockbits",
};

let current: ArtStyleId = "obsidian";
const listeners = new Set<() => void>();

export function getArtStyleId(): ArtStyleId {
  return current;
}

export function getArtStyle(): ArtStyle {
  return ART_STYLES[current];
}

export function setArtStyle(id: ArtStyleId): void {
  if (id === current) return;
  current = id;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useArtStyle(): ArtStyle {
  const id = useSyncExternalStore(subscribe, getArtStyleId, getArtStyleId);
  return ART_STYLES[id];
}
