import {
  CanvasTexture,
  NearestFilter,
  NearestMipmapNearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

/**
 * Asset plumbing for the two asset-driven art styles.
 *
 * Everything here is built by compositing source spritesheets onto a canvas at
 * load time, so the runtime never does UV arithmetic against an atlas and never
 * suffers texel bleed between neighbouring tiles. Results are cached by key:
 * switching art styles back and forth costs nothing after the first visit.
 */

const BASE = import.meta.env.BASE_URL ?? "/";

export const KENNEY = {
  tiles: `${BASE}kenney_pixel-platformer/Tilemap/tilemap.png`,
  characters: `${BASE}kenney_pixel-platformer/Tilemap/tilemap-characters.png`,
  backgrounds: `${BASE}kenney_pixel-platformer/Tilemap/tilemap-backgrounds.png`,
} as const;

/** Sheet geometry, from the pack's own Tilesheet information files. */
export const SHEETS = {
  tiles: { url: KENNEY.tiles, size: 18, gap: 1, cols: 20 },
  characters: { url: KENNEY.characters, size: 24, gap: 1, cols: 9 },
  backgrounds: { url: KENNEY.backgrounds, size: 24, gap: 1, cols: 8 },
} as const;

export type SheetId = keyof typeof SHEETS;

/**
 * Tile indices, verified against a rendered contact sheet of the pack.
 * Names describe what the tile looks like, not where it is used.
 */
export const TILE = {
  /** Grass-capped dirt block, outlined — reads as one stacked block from the side. */
  grassBlock: [0, 1, 2, 3],
  /**
   * Tile 38 is the pack's only fully opaque, single-colour green: every other
   * foliage tile carries a nine-slice outline or rounded transparent corners,
   * which tile into visible seams across a large ground plane.
   */
  grassField: [38],
  /**
   * Speckled dirt with no block outline. The neighbouring 120/121/123 are
   * autotile *edge* variants: their baked-in dark border tiles into navy
   * stripes down a tall wall. These six share one base colour and differ only
   * in their speckles, which is exactly the variation a large fill wants.
   */
  dirt: [122, 104, 4, 5, 24, 25],
  /** Gold crate, outlined. */
  goldCrate: [9],
  goldCrateMarked: [11],
  /** Tree trunk with branch stubs. */
  trunk: [117],
  /** Foliage nine-slice: top row, middle row, bottom row. */
  leafTop: [16, 17, 18, 19],
  leafMid: [36, 37, 38, 39],
  leafBottom: [56, 57, 58, 59],
  /** Small standalone pine. */
  pine: [126],
  shrub: [124, 125],
  mushroom: [128],
} as const;

/** Background sheet: plain sky row, silhouette row, solid ground row. */
export const BG_TILE = {
  skyPale: [0, 1, 2, 3],
  cloudsPale: [8, 10],
  cloudsWithTrees: [9, 11],
  groundPale: [16, 17, 18, 19],
  skyGreen: [6, 7],
  hillsGreen: [14, 15],
  groundGreen: [22, 23],
} as const;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(url);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
  imageCache.set(url, p);
  return p;
}

export function loadSheets(ids: readonly SheetId[]): Promise<void> {
  return Promise.all(ids.map((id) => loadImage(SHEETS[id].url))).then(() => undefined);
}

/** Non-null only after the sheet has loaded; compositing is synchronous. */
const loaded = new Map<string, HTMLImageElement>();
for (const id of Object.keys(SHEETS) as SheetId[]) {
  void loadImage(SHEETS[id].url).then((img) => loaded.set(SHEETS[id].url, img));
}

export function sheetReady(id: SheetId): boolean {
  return loaded.has(SHEETS[id].url);
}

function ctx2d(width: number, height: number, readback = false): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  // The sampling copies are read pixel-by-pixel; the composites never are.
  const g = c.getContext("2d", readback ? { willReadFrequently: true } : undefined);
  if (!g) throw new Error("2D context unavailable");
  g.imageSmoothingEnabled = false;
  return g;
}

/** Offscreen copy of a sheet, so individual texels can be sampled. */
const sheetPixels = new Map<SheetId, CanvasRenderingContext2D>();

function sheetContext(id: SheetId): CanvasRenderingContext2D | null {
  const hit = sheetPixels.get(id);
  if (hit) return hit;
  const img = loaded.get(SHEETS[id].url);
  if (!img) return null;
  const g = ctx2d(img.width, img.height, true);
  g.drawImage(img, 0, 0);
  sheetPixels.set(id, g);
  return g;
}

const fillCache = new Map<string, string>();

/**
 * The tile's own centre texel, as an opaque CSS colour.
 *
 * The source blocks are drawn with rounded, transparent corners so that a 2D
 * level shows sky through them. On the face of a 3D box there is nothing
 * behind, and an unlit material ignores alpha, so those corners rendered as
 * black specks and tiled into dark seams. Painting the cell with a colour from
 * the tile's own palette first makes every composite opaque by construction.
 */
function tileFill(id: SheetId, index: number): string {
  const key = `${id}:${index}`;
  const hit = fillCache.get(key);
  if (hit) return hit;
  const g = sheetContext(id);
  const sheet = SHEETS[id];
  if (!g) return "#000000";
  const pitch = sheet.size + sheet.gap;
  const cx = (index % sheet.cols) * pitch + (sheet.size >> 1);
  const cy = Math.floor(index / sheet.cols) * pitch + (sheet.size >> 1);
  const d = g.getImageData(cx, cy, 1, 1).data;
  const css = `rgb(${d[0]},${d[1]},${d[2]})`;
  fillCache.set(key, css);
  return css;
}

/**
 * Blit one tile of a sheet at 1:1, no filtering, no bleed from the 1px gutter.
 * `opaque` backs the cell first; sprites leave it off so they keep their alpha.
 */
function blitTile(
  g: CanvasRenderingContext2D,
  id: SheetId,
  index: number,
  dx: number,
  dy: number,
  opaque = false,
): void {
  const sheet = SHEETS[id];
  const img = loaded.get(sheet.url);
  if (!img) return;
  if (opaque) {
    g.fillStyle = tileFill(id, index);
    g.fillRect(dx, dy, sheet.size, sheet.size);
  }
  const col = index % sheet.cols;
  const row = Math.floor(index / sheet.cols);
  const pitch = sheet.size + sheet.gap;
  g.drawImage(
    img,
    col * pitch,
    row * pitch,
    sheet.size,
    sheet.size,
    dx,
    dy,
    sheet.size,
    sheet.size,
  );
}

/**
 * Deterministic index into a variant list. Same cell always draws the same
 * tile, so a texture looks varied but never shimmers between rebuilds.
 */
function pick<T>(variants: readonly T[], x: number, y: number): T {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const n = Math.floor((h - Math.floor(h)) * variants.length);
  return variants[Math.min(variants.length - 1, n)];
}

const textureCache = new Map<string, CanvasTexture>();

function finish(canvas: HTMLCanvasElement, mipmaps: boolean): CanvasTexture {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.magFilter = NearestFilter;
  // Nearest-mipmap keeps texels hard while killing the crawl on surfaces seen
  // edge-on from the overhead lens. Linear mips would soften the pixel art.
  t.minFilter = mipmaps ? NearestMipmapNearestFilter : NearestFilter;
  t.generateMipmaps = mipmaps;
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/**
 * A field of randomly-varied tiles, sized cols x rows. Tiling this across a
 * large surface hides the repeat that a single tile would make obvious.
 */
export function tileField(
  variants: readonly number[],
  cols = 4,
  rows = 4,
  sheet: SheetId = "tiles",
): CanvasTexture {
  const key = `field:${sheet}:${variants.join("_")}:${cols}x${rows}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const size = SHEETS[sheet].size;
  const g = ctx2d(cols * size, rows * size);
  for (let y = 0; y < rows; y += 1)
    for (let x = 0; x < cols; x += 1)
      blitTile(g, sheet, pick(variants, x, y), x * size, y * size, true);
  const tex = finish(g.canvas, true);
  textureCache.set(key, tex);
  return tex;
}

/**
 * A vertical wall strip: one row of cap tiles on top, body tiles below. Used
 * for the sides of solids so a deck shows a grass lip and dirt beneath it,
 * exactly like the source pack's own sample levels.
 */
export function wallStrip(
  cap: readonly number[] | null,
  body: readonly number[],
  rows: number,
  cols = 4,
): CanvasTexture {
  const key = `wall:${cap?.join("_") ?? "none"}:${body.join("_")}:${cols}x${rows}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const size = SHEETS.tiles.size;
  const g = ctx2d(cols * size, rows * size);
  for (let y = 0; y < rows; y += 1)
    for (let x = 0; x < cols; x += 1) {
      const variants = cap && y === 0 ? cap : body;
      blitTile(g, "tiles", pick(variants, x, y + (cap && y === 0 ? 100 : 0)), x * size, y * size, true);
    }
  const tex = finish(g.canvas, true);
  textureCache.set(key, tex);
  return tex;
}

/**
 * A repeating parallax band: silhouette tiles over a solid ground colour.
 * The band is authored one tile tall and extended downward with the solid row
 * so the layer can be any height without stretching the silhouette.
 */
export function parallaxBand(
  silhouette: readonly number[],
  ground: readonly number[],
  cols = 8,
  groundRows = 3,
): CanvasTexture {
  const key = `band:${silhouette.join("_")}:${ground.join("_")}:${cols}x${groundRows}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const size = SHEETS.backgrounds.size;
  const g = ctx2d(cols * size, (1 + groundRows) * size);
  for (let x = 0; x < cols; x += 1) {
    blitTile(g, "backgrounds", pick(silhouette, x, 0), x * size, 0, true);
    for (let y = 0; y < groundRows; y += 1)
      blitTile(g, "backgrounds", pick(ground, x, y), x * size, (1 + y) * size, true);
  }
  const tex = finish(g.canvas, false);
  // Vertical repeat would tile the silhouette down the band; clamp instead.
  tex.wrapT = RepeatWrapping;
  textureCache.set(key, tex);
  return tex;
}

/**
 * A horizontal strip of character frames. Animation is a UV offset, so the
 * avatar never swaps textures or materials mid-frame.
 */
export function spriteStrip(frames: readonly number[]): CanvasTexture {
  const key = `sprite:${frames.join("_")}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const size = SHEETS.characters.size;
  const g = ctx2d(frames.length * size, size);
  frames.forEach((f, i) => blitTile(g, "characters", f, i * size, 0));
  const tex = finish(g.canvas, false);
  tex.repeat.set(1 / frames.length, 1);
  textureCache.set(key, tex);
  return tex;
}

/**
 * A tree built from the pack's foliage nine-slice over a trunk tile: a
 * three-wide canopy with the trunk centred beneath it.
 */
export function treeSprite(): CanvasTexture {
  const key = "tree";
  const hit = textureCache.get(key);
  if (hit) return hit;
  const size = SHEETS.tiles.size;
  const g = ctx2d(3 * size, 5 * size);
  const canopy = [
    [TILE.leafTop[0], TILE.leafTop[1], TILE.leafTop[3]],
    [TILE.leafMid[0], TILE.leafMid[1], TILE.leafMid[3]],
    [TILE.leafBottom[0], TILE.leafBottom[1], TILE.leafBottom[3]],
  ];
  canopy.forEach((row, y) => row.forEach((t, x) => blitTile(g, "tiles", t, x * size, y * size)));
  blitTile(g, "tiles", TILE.trunk[0], size, 3 * size);
  blitTile(g, "tiles", TILE.trunk[0], size, 4 * size);
  const tex = finish(g.canvas, false);
  textureCache.set(key, tex);
  return tex;
}

/** A single tile as its own texture, for small billboarded props. */
export function tileSprite(index: number): CanvasTexture {
  const key = `tile:${index}`;
  const hit = textureCache.get(key);
  if (hit) return hit;
  const size = SHEETS.tiles.size;
  const g = ctx2d(size, size);
  blitTile(g, "tiles", index, 0, 0);
  const tex = finish(g.canvas, false);
  textureCache.set(key, tex);
  return tex;
}

/** Drop every cached texture. Only used by tests and hot-reload paths. */
export function disposeTextureCache(): void {
  for (const t of textureCache.values()) (t as Texture).dispose();
  textureCache.clear();
}
