# Asset-driven art styles

Two art styles were added to test one question: **does the art ceiling come from
the renderer, or from what the world is made of?**

The prototype was already on three.js via React Three Fiber, so "switch to
three.js" was moot, and switching to Unity would have meant rewriting the mode
system, the metrics and the AI plumbing to get at tooling this prototype does not
yet need. The cheaper experiment was to keep the engine and change the assets.

The answer is visible on keys `7` and `8`. Neither style changes a single line of
physics, camera or level layout.

## What was built

| Key | Style | Source pack | Technique |
| --- | --- | --- | --- |
| `7` | Pixel Grove | Kenney Pixel Platformer (CC0) | 18px tiles composited onto every box face, billboarded sprite hero, three image parallax bands, half-resolution nearest upscale |
| `8` | Block Bits | KayKit Block Bits by Kay Lousberg (CC0) | 1,188 instanced glTF voxel blocks over the same collision boxes, one shared 1024px atlas, nine draw calls |

Both packs are committed under `public/` with their licence files.

## The rule that keeps this honest

`src/game/world/levelData.ts` stays the only description of the world. Neither
style re-authors geometry:

- **Pixel Grove** textures the same `SOLIDS` boxes the simulation collides
  against, six materials per box in `BoxGeometry` face order.
- **Block Bits** dices those same boxes into one-unit cells and renders only the
  outer shell. Cell size is the box's own size divided by a whole number of
  cells, so blocks land exactly on the collision box even where it is not an
  integer number of units across — the mid deck is 10.5 deep.

So the art cannot drift from the physics. There is nothing to keep in sync.

## Where the code lives

| File | Role |
| --- | --- |
| `src/game/world/assets.ts` | Loads the sprite sheets and composites every texture on a canvas at load time. No runtime UV arithmetic against an atlas, so no texel bleed. |
| `src/game/world/tiledFaces.ts` | Builds the six per-box materials for the tiled style. Session-lifetime singletons, like the primitive world's shared materials. |
| `src/game/world/voxels.ts` | Loads the glTF block geometries, computes the shell layout, places props and the horizon. |
| `src/game/world/AssetSurfaces.tsx` | The two renderers plus their loading hooks. |
| `src/game/world/artStyles.ts` | `surfaces`, `parallax` and `spriteAvatar` extend the existing style contract. |

## Things that bit, and why the fix is where it is

Each of these was a visible artefact, not a theory.

**The sky had a hole in it.** The gradient dome was 600 units across while the
camera's far plane is 640, so the dome's far side was clipped and the scene
background showed through as a black wedge. It was invisible before only because
the styles that used a dome had a background colour close to their sky. The dome
is now 300 units and the background colour is always painted.

**Overlapping decks tore into z-fighting.** Several solids overlap on purpose —
the facade rises out of the mid deck, deck 2 runs into it. With one flat colour
that was invisible; with tiled textures the two surfaces have different tile
phase and the overlap tears. The tiled style resolves it with a small constant
polygon offset per solid, so the winner is deterministic. The voxel style
resolves it earlier, by skipping any cell an earlier solid already fills.

**Black speckles tiled into dark seams.** The source blocks are drawn with
rounded, transparent corners so a 2D level shows sky through them. On the face of
a 3D box there is nothing behind, and the material ignores alpha, so those
corners rendered black. Composites now back each cell with a colour sampled from
the tile's own centre texel, which makes them opaque by construction.

**Navy stripes down the facade.** Tiles 120, 121 and 123 look like plain dirt but
are autotile *edge* variants with a baked-in dark border. Tiled down a ten-unit
wall they read as stripes. The fill set is now the six tiles that carry no
border and share one base colour.

**The block horizon read as more platforms.** Early versions placed stepped
courses of blocks close behind the level; they had the same visual weight as the
play decks and you could see sky underneath them. The horizon is now two rows at
z = -150 and -210, each column a single instance stretched downward so the ridge
is solid past the bottom of frame, with enough fog that it melts into the dome.

## Measurements

Median frame time, 1280×760, all styles at the platformer lens:

| Style | Median | Notes |
| --- | --- | --- |
| Block Bits, platformer | 16.7 ms | 1,188 instances, 9 draw calls |
| Block Bits, tactical | 16.7 ms | p95 17.6 ms |
| Pixel Grove, platformer | 16.7 ms | — |

All three sit at the 60 Hz cap. The tiled style's first switch used to cost a
visible ~1 s while it composited its canvases; those are now built during an idle
callback after the sheets load, so the first press of `7` is instant.

## What this does not settle

The styles prove that authored assets move the ceiling on this engine. They do
not argue against Blender or Unity for other reasons:

- **Blender** is still the right tool for bespoke props. Nothing here is modelled;
  both packs are someone else's. A glTF loader is now wired up, so a custom model
  drops straight in.
- **Unity or Godot** would buy tooling — a tilemap editor, 2D lights, shader
  graphs, an asset store. That matters when this stops being a prototype. It
  would cost the React UI, the mode system, the metrics and the AI integration.

The next cheap wins on the current engine, roughly in order of payoff: a
postprocessing pass for bloom and colour grading, authored props via glTF, and
per-mode art treatments now that the style contract has somewhere to put them.
