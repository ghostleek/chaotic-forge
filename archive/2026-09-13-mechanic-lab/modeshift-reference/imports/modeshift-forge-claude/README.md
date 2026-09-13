# Mechanic Forge — ModeShift

**One World. Three Versions of Real.**

> Each perspective is its own rule space. If two surfaces align in a projection
> they connect while it holds — and holding one costs Focus.

Mechanic Forge is an AI-assisted laboratory for game-design decisions. A designer
states the player experience they want. The system proposes a *supported* game-mode
mutation, commits to a predicted behavioural effect and a primary metric, names the
fairness risk, and the deterministic engine applies it to the same playable world —
no reload, no second level, no generated code.

## The problem

Three camera angles over one world is a preference, not a mechanic: if every view
can walk to the objective, switching is decoration. **Perspective Forging** makes
each perspective a different set of rules, governed by one sentence:

> If two surfaces appear connected in a projection, they become connected while
> that projection is active.

So the player is not changing how they see the world. They are changing which
version of it is real — and Focus is the budget that stops one version from
winning.

## The three modes

| Key | Mode | Verb | Rule space | Focus |
| --- | --- | --- | --- | --- |
| `1` | **Traverse** (`platformer`) | **Connect** | Long-lens side view, depth locked to a lane. Depth collapses: fragments that align in the projection become real colliders | −12%/s while held |
| `2` | **Inhabit** (`firstPerson`) | **Interact** | Perspective, pointer-lock mouse look, full depth. The only mode that collects cores or enters the portal. World time runs normally | free; +4%/s on real ground |
| `3` | **Command** (`tactical`) | **Plan** | Long-lens overhead with world time held at zero — no clock, no sentry, no pickups, no exposure. Reveals hazard extents, the patrol cone and the safe lane | free to hold |

The objective never changes: collect three energy cores and enter the portal.
Position, collected cores, elapsed time, Focus and all metrics persist across
switches.

### The hero sequence

1. **Inhabit** at the start pad. Ahead is a **10 m void** — no jump crosses it
   (full-speed jump range is 7.4 m, and the crossing needs 9.3 m). Three slabs
   float over it at three different depths and three different heights. Look at
   them: they are real geometry, and they are not a path.
2. Press `1`. The camera pulls out to the side over ~620 ms, depth collapses, and
   the three slabs **slide into one plane and light up as a floor**. Focus starts
   draining.
3. Run across the span you just forged. Core 1 sits mid-void, over nothing.
4. Press `2` on the far lip. The span stops being solid the moment Traverse ends.
5. Continue embodied to the **facade** — a 10 m slab that reads as a dead end from
   the side, with an open corridor behind it in depth. Take **core 2**.
6. Press `3`. Time stops. The magenta hazard field, the sweeping sentry cone and
   the low-exposure lane are all inspectable, and none of them can hurt you while
   you look. Command shows you the route; it cannot take the core.
7. Press `2` and go get **core 3** off the pedestal. Reach the portal, and compare
   the proposal's numeric prediction against what actually happened.

If Focus runs out while a projection is load-bearing, the span stops existing and
drops you. Because a projected surface is never recorded as a safe respawn, the
fall returns you to real ground — never into the void it was spanning.

## Art direction

Five art styles apply to identical geometry and identical physics. They are not
palette swaps. The first three change the *rendering technique*; the last two
change what the world is *made of*, which is the lever authored art gives you
that no renderer setting can.

| Key | Style | Technique |
| --- | --- | --- |
| `4` | **Obsidian Lab** | Physically based shading, exponential fog, starfield, ACES tone mapping, full resolution |
| `5` | **Pixel Forge** | Renders at 320×180 and upscales nearest-neighbour, 3-band toon shading, no tone mapping, gradient sky with a blocky parallax skyline |
| `6` | **Cel Ink** | 2-band toon shading with inverted-hull ink outlines, no tone mapping, daylight sky with soft peaks |
| `7` | **Pixel Grove** | Authored 18px tilesets on every box face, a billboarded sprite hero, three image parallax bands, half-resolution nearest upscale |
| `8` | **Block Bits** | 1,188 instanced glTF voxel blocks over the same collision boxes, one shared atlas, nine draw calls, a fogged block horizon |

### Where the art comes from

Both asset-driven styles are built from CC0 packs committed under `public/`:

- **[Kenney Pixel Platformer](https://kenney.nl)** — 18px tiles, 24px characters
  and background bands. Drives *Pixel Grove*.
- **[KayKit Block Bits](https://www.kaylousberg.com) by Kay Lousberg** — glTF
  voxel blocks sharing one 1024px texture atlas. Drives *Block Bits*.

Neither style re-authors the level. `src/game/world/levelData.ts` stays the one
source of truth: *Pixel Grove* textures the same boxes the simulation collides
against, and *Block Bits* dices those boxes into one-unit cells and skins the
outer shell with blocks. The art cannot drift from the physics, because there is
only one description of the world.

## Controls

| Input | Action |
| --- | --- |
| `A` / `D` / arrows | Move (Traverse) |
| `W` `A` `S` `D` | Move (Inhabit) |
| `Space` | Jump |
| `Shift` | Run |
| Mouse | Look (Inhabit — click the world to capture the pointer, `Esc` to release) |
| `1` `2` `3` | Traverse / Inhabit / Command (Command freezes the world; the body does not move) |
| `4` `5` `6` `7` `8` | Obsidian Lab / Pixel Forge / Cel Ink / Pixel Grove / Block Bits |
| `R` | Reset run |
| `H` | Hide the product panels (clean demo capture) |

Every mode and art style is also a clickable card. **The whole game works with no
model and no network request.**

## Local setup

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # tsc -b && vite build
npm run preview    # serve the production build
npm test           # headless deterministic hero-path checks
```

Requires Node 20+ (developed on Node 22). Optimised for a desktop browser at
1280×720 and above.

## Architecture

```text
src/
  shared/game-contract.ts     typed bridge: snapshots out, commands in
  game/
    gameState.ts              the one canonical player transform + run state
    GameRuntime.tsx           the single ordered frame (input → sim → camera → presentation)
    GameViewport.tsx          the WebGL surface and pointer-lock handling
    controllers/
      input.ts                one keyboard/mouse source of truth
      physics.ts              axis-separated swept AABB collision
      playerSystem.ts         per-mode controllers + world evaluation
    cameras/poses.ts          per-mode camera pose maths
    world/                    level data, materials, art styles, scene components
    presentation.ts           non-authoritative visual tweens
  ai/                         deterministic proposals + Astra client interface
  ui/                         DOM product UI (never touches Three.js)
scripts/                      headless test harness
```

Decisions worth knowing:

- **One canonical transform.** `gameState.player` is the only player position.
  Exactly one controller writes it per fixed substep; inactive controllers are
  never called. Mode switches zero horizontal velocity so no impulse leaks across.
- **Colliders are per-projection.** `physics.ts` holds two box sets: `PHYSICAL_BOXES`
  always collide, `PROJECTED_BOXES` only while a projection is open. `gameState`'s
  `syncProjection()` is the single owner of that flag — a projection solidifies once
  its camera has settled *and* there is Focus left to hold it, which is why the span
  materialises exactly as the transition lands and vanishes the instant Focus hits
  zero. `moveAndCollide` reports `groundIsProjected`, so a projected surface is never
  recorded as a safe respawn.
- **Focus is authoritative, presentation is not.** `focus.value` drives colliders;
  `presentation.projectionStrength` only drives how far the fragments have slid and
  how brightly the span glows. The simulation never branches on a presentation value.
- **One camera for three projections.** The two "orthographic" views are a single
  perspective camera on a long lens (16–26° FOV, ~60 units back). It is visually
  orthographic, and it means the hero transition is a plain lerp/slerp of one
  camera instead of a cross-fade between two projection types.
- **Fixed timestep.** 1/120 s substeps with a capped accumulator, so collision
  behaviour does not change with frame rate.
- **Geometry and materials are shared singletons**, restyled in place when the art
  direction changes.
- **The UI never touches Three.js.** It reads `GameSnapshot` via
  `useSyncExternalStore` and calls `setMode` / `resetRun`.

## AI proposals — honest disclosure

**The proposals shipped today are local and deterministic.** The same prompt always
produces the same proposal; there is no model call and no randomness. The UI labels
this as `Demo fallback · local deterministic proposal, no model call`, and the source
indicator only turns green when a validated live response is actually used.

`src/ai/astraClient.ts` is the narrow interface for a real call. It is enabled by a
single environment variable:

```bash
# .env.local — server endpoint only, never an API key in the client
VITE_ASTRA_ENDPOINT=/api/proposal
```

When set, the client POSTs `{ prompt }`, times out at 6 s, validates the response
server-side-shape with `validateProposal`, ignores stale responses, and falls back
to the local proposal on any failure — labelling it honestly with the reason. The
model may only *select* a supported mode; configuration is looked up from the modes
already shipped, so it can never emit code, shaders or scene mutations.

**No API key exists in this repository, in the bundle, or in Git history.** The
server endpoint itself is the next task (see below).

## Metrics

All metrics come from real gameplay events, never fabricated:

| Metric | Source |
| --- | --- |
| Completion time | accumulated while status is `playing` |
| Falls | crossings below the void plane |
| Mode switches | `setMode` calls |
| Path length | per-substep distance, excluding teleports (respawns/resets) |
| Hazard exposure | time with the player body inside the hazard volume or the sentry cone |
| Discoveries | entering any of four authored discovery zones |
| Focus remaining | the projection budget at the moment the run ended |
| Time per perspective | wall-clock ms per mode, accrued even while Command holds world time at zero |
| Projection collapses | times Focus ran out while a projection was load-bearing |

The results screen states the proposal's numeric prediction next to the measured
value and marks it `HELD` or `MISSED`. A missed prediction is shown as a miss.

## Status

**Done (P0):** responsive world; shared transform, collectibles, portal, timer,
reset; Traverse and Inhabit controllers; the ~620 ms cinematic transition;
persistent state across repeated `1 → 2 → 3 → 1`; ready/playing/paused/completed
states; the local design-intent panel; production build with a clean console.

**Done (P1):** Command camera; hazard volume, sweeping sentry cone and
low-exposure lane; all real metrics; prediction-vs-actual comparison.

**Done (Perspective Forging):** the impossible gap and its three depth-scattered
fragments; per-projection colliders; the forged span; Focus with drain, ground
recharge, core payback, an unstable band and collapse; Command freezing world
time; per-perspective time and collapse metrics. 90 headless checks cover it.

**Extra:** five art-direction styles, two of them asset-driven.

### Known limitations

- **Command plans but does not yet reconfigure.** World time freezes and the
  hazards become inspectable, but the platform-rotation edit (and its 20% Focus
  cost) is not implemented — the mode card says "reconfigure next" rather than
  pretending it works. `FOCUS.editCost` is reserved for it.
- The projection is authored, not derived. Three fragments have hand-placed rest
  and aligned transforms; there is no general forced-perspective geometry solver.
  The rule is real (the colliders genuinely only exist while Traverse is open), but
  it applies to one authored gap.
- No server-side Astra endpoint yet; proposals are local and labelled as such.
- No real-time shadows — the avatar uses a cheap projected contact shadow. The
  scene is lit with ambient/hemisphere/directional lights only.
- Pointer lock is unavailable in some embedded/sandboxed browser hosts. The app
  detects the rejection once and falls back to drag-to-look, and the HUD says so.
- At exactly 720 px tall the left rail scrolls a little (it has a fade edge);
  everything fits from about 820 px.
- Not designed for touch or portrait layouts.
- Bundle is ~1.1 MB (310 KB gzipped), dominated by Three.js. Not code-split.

### Next safest task

**Command's reconfigure layer.** Add a `MANIPULABLES` list to `levelData.ts` with a
couple of authored platform states (90° yaw steps swap `s[0]`/`s[2]`, which the
axis-aligned physics already handles), a selection controller for Command replacing
the now-unused `stepTactical`, and spend `FOCUS.editCost` per commit. Everything it
needs already exists: the world is frozen, colliders are already rebuilt from a flag
on every mode change, and Focus already has a cost path. That is the one change that
makes the third perspective a rule space rather than a viewer.

After that, the server-side proposal endpoint: one route holding the API key that
calls the Responses API with a structured-output schema matching `ModeProposal`.
`validateProposal`, the timeout, the stale-response guard and the labelled fallback
are already written and exercised by the client, so it is additive and cannot break
manual play.

## Deployment

- Deployed URL: _TBD_
- Demo video (90 s): _TBD_

Any static host works: `npm run build` and serve `dist/`.
