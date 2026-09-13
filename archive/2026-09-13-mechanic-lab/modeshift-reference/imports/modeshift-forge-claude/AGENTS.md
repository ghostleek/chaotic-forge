# Mechanic Forge: ModeShift — Prototype Instructions

## Mission

Build a complete, polished prototype of **Mechanic Forge: ModeShift — One World,
Three Versions of Real**.

This is a hackathon prototype. Optimize for a memorable 90-second demo and a
reliable deployed app, not a generalized game engine or production architecture.
Work end to end: inspect, plan briefly, implement, run, test visually, fix, and
leave the repository in a demo-ready state. Make reasonable product decisions
without repeatedly asking for clarification.

Today's goal is a convincing local prototype. The actual hackathon build is five
hours, so prove the risky interaction—the forged span, where switching projection
turns misaligned fragments into a real floor—before adding breadth.

## Product concept

Mechanic Forge is an AI-assisted laboratory for game-design decisions. A designer
describes the player experience they want. AI proposes a supported game-mode
mutation, predicts how it will affect behavior, identifies a metric and fairness
risk, and the deterministic engine applies it to the same playable world.

The core demonstration is not three separate mini-games, and it is not three
cameras. It is **Perspective Forging**: one continuous low-poly orbital test
chamber in which each perspective is its own rule space, governed by one sentence.

> **If two surfaces appear connected in a projection, they become connected while
> that projection is active.**

| Mode | Verb | Rule space | Focus |
| --- | --- | --- | --- |
| **Inhabit** (`firstPerson`) | Interact | First person, full depth. The only mode that collects cores or enters the portal. World time and threats run normally | free; +4%/s standing on real ground |
| **Traverse** (`platformer`) | Connect | Orthographic side view, depth locked. Depth collapses and aligned fragments become **real colliders** | −12%/s while held |
| **Command** (`tactical`) | Plan | Orthographic overhead with `timeScale = 0` — no clock, no sentry, no pickups, no exposure. Reveals hazard extents, patrol cones and the safe lane | free to hold; −20%/edit once reconfigure lands |

The player is not changing how they see the world. They are changing which version
of it is real, and **Focus** is the budget that stops one version from winning.

The objective is always to collect three glowing energy cores and enter a cyan
exit portal. Position, collected cores, timer, Focus and metrics persist when
switching modes.

### Non-negotiable rules of the mechanic

- **The illusion is authored, not solved.** Do not build a generalised
  forced-perspective geometry engine. `FRAGMENTS` in `levelData.ts` carry a hand-placed
  `rest` and `aligned` transform; `PROJECTED_SOLIDS` derives its colliders from the
  aligned boxes. The *rule* is real — those colliders genuinely only exist while
  Traverse is open — but it applies to authored geometry.
- **One owner for solidity.** `gameState.syncProjection()` is the only caller of
  `setProjectedSolid`. A projection solidifies when the mode solidifies it, Focus
  remains, and the transition has landed. Never set it from a view or a component.
- **A projected surface is never a safe respawn.** `moveAndCollide` reports
  `groundIsProjected`; `evaluateWorld` must exclude it from `lastSafe`, or a collapse
  respawns the player into the void they were crossing. This is the mechanic's single
  most important fairness guarantee.
- **Focus is authoritative; `presentation.projectionStrength` is not.** The simulation
  must never branch on a presentation value.
- **A collapse is not a player mode switch.** `setMode(mode, "collapse")` skips the
  `modeSwitches` counter, or the "unnecessary switches" metric is meaningless.
- **No dead ends.** Inhabit on real ground trickles Focus back, so a run can always
  recover.

## The hero demo sequence

Author the level to support this exact sequence:

1. Start in **Inhabit** on the start pad. Ahead is a 10 m void; a full-speed jump
   reaches 7.4 m and the crossing needs 9.3 m, so it is impossible by a clear
   margin. Three fragments float over it at three different depths *and* three
   different heights — visibly not a path.
2. Press `1`. The camera pulls out to the side, depth collapses, and the fragments
   slide into one plane and light up as a floor. Focus begins draining.
3. Cross the forged span; core 1 sits mid-void over nothing.
4. Press `2` on the far lip. The span stops being solid immediately.
5. Continue embodied to the facade — a slab that reads as a dead end from the side
   with a corridor behind it in depth. Take core 2.
6. Press `3`. World time stops; the hazard field, sentry cone and low-exposure lane
   become inspectable and harmless. Command shows the route but cannot take the core.
7. Press `2`, take core 3, reach the portal, and show actual play metrics — Focus
   remaining and time per perspective — beside the AI prediction.

Step 2 is the centerpiece. It must feel intentional and work repeatedly without
reloading the world. The strongest single beat in the whole demo is the pair of
side-view reads: three slabs scattered, then one span.

## Scope order

Implement in this order. Do not work on a later phase while an earlier phase is
broken.

### P0 — Prove today

- Responsive 3D world built from attractive primitive geometry.
- Shared player transform, collectibles, portal, timer, and reset behavior.
- Traverse camera/controller with gravity, jump, ground detection, and safe fall
  reset.
- Inhabit camera/controller with click-to-focus or pointer-lock mouse look, WASD,
  collisions, and Escape to release the pointer.
- A cinematic 500–700 ms Traverse-to-Inhabit transition.
- Persistent state across repeated `1 → 2 → 1` switches.
- On-screen controls and clear ready, playing, paused, and completed states.
- A local design-intent panel with a convincing deterministic AI-style proposal.
- Production build succeeds with no console errors in the hero sequence.

### P1 — Add after P0 is stable

- Command camera with world time frozen (`timeScale = 0`); the body does not move.
- A magenta hazard volume or patrol cone visible in Command.
- Real metrics: completion time, falls, mode switches, path length, discoveries,
  Focus remaining, time per perspective, projection collapses,
  and hazard exposure.
- Compare the proposal's predicted effect with actual run metrics.
- Server-side Astra integration behind environment variables, with validated
  structured output and a deterministic fallback.
- Deploy and smoke-test the public URL.

### Stretch — Only with meaningful buffer

- One deterministic moving platform or patrol.
- Lightweight particles, portal pulse, and restrained camera shake.
- Asset-driven art styles (`7` Pixel Grove, `8` Block Bits). These read their
  geometry from `levelData.ts` like everything else, so they never fork the
  level. Source packs live in `public/` and are both CC0; see the README.
- Additional prompt examples or precedent cards.

Do not add combat, multiplayer, procedural level generation, custom Blender
assets, skeletal animation, user accounts, a database, a generalized level
editor, or arbitrary AI-generated runtime code.

## Technical defaults

- First inspect the repository and reuse working code and scripts.
- If starting empty, use Vite, React, TypeScript, Three.js,
  `@react-three/fiber`, and `@react-three/drei`.
- Prefer simple, understandable collision and movement code. Add a physics
  dependency only if it makes P0 faster and can be proven within 20 minutes.
- Keep the WebGL runtime separate from DOM product UI through a small typed
  bridge or shared store.
- Use one canonical player transform. Only the active controller may update it.
- Use delta-time movement with a capped timestep.
- Cap device pixel ratio around 1.5–2 and reuse geometries/materials.
- Keep the main experience optimized for a desktop laptop at 1280×720 and above.
- Support keys `1`, `2`, `3` for modes and `R` for reset, alongside clickable UI.
- Respect reduced-motion preferences by shortening transitions.
- Make small, reversible commits. Never discard unrelated user changes.

Suggested structure, adapting to the existing repository rather than forcing it:

```text
src/
  game/
    world/
    controllers/
    cameras/
    metrics/
    GameViewport.tsx
  ui/
  ai/
  shared/game-contract.ts
```

## Shared game contract

Use a narrow typed contract so the UI never manipulates Three.js internals:

```ts
export type GameMode = "platformer" | "firstPerson" | "tactical";

export type ModeConfig = {
  mode: GameMode;
  camera: "orthographic-side" | "perspective-first-person" | "orthographic-top";
  movement: "platformer" | "walk" | "tactical";
  depthLock: boolean;
  gravity: boolean;
  reveals: Array<"hidden-passages" | "hazards" | "patrol-cones" | "projection-alignment">;
  /** Turns aligned fragments into real colliders while this mode is active. */
  solidifiesProjection: boolean;
  /** Holds world time at zero: no clock, no sentry, no pickups, no exposure. */
  freezesWorld: boolean;
  /** Focus spent per second of play in this mode. */
  focusDrainPerS: number;
};

export type GameMetrics = {
  elapsedMs: number;
  falls: number;
  modeSwitches: number;
  pathLength: number;
  hazardExposureMs: number;
  discoveries: number;
  /** Wall-clock ms per perspective, measured even while Command is frozen. */
  modeTimeMs: Record<GameMode, number>;
  projectionCollapses: number;
};

export type GameSnapshot = {
  mode: GameMode;
  status: "ready" | "playing" | "paused" | "completed";
  collectedCoreIds: string[];
  totalCores: number;
  metrics: GameMetrics;
  focus: number;
  focusMax: number;
  /** False once Focus is too low to hold a projection reliably. */
  projectionStable: boolean;
};

export type GameBridge = {
  setMode(mode: GameMode): void;
  resetRun(): void;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
};
```

## State and controller rules

- Switching mode changes camera, controls, presentation, and revealed information;
  it never reloads the scene.
- Entering Traverse returns the player smoothly to the nearest safe depth lane.
- Entering Traverse solidifies the projection only once the transition lands, so the
  fly-in is not billed against Focus and the span materialises as the camera settles.
- Leaving Traverse de-solidifies the span immediately. Dropping someone standing on
  it is intended; respawning them into the void is not.
- Entering Inhabit hides or fades the avatar mesh to prevent camera clipping.
- Entering Command preserves position and shows tactical overlays.
- Disable inactive controllers completely; two controllers must never move the
  player during the same frame.
- A fall resets only position, not collectibles, elapsed time or Focus.
- The portal completes the run only after all three cores are collected.
- Metrics come from actual events rather than random or fabricated values.

## Visual direction

Create perceived quality through composition and lighting, not asset complexity:

- Dark obsidian orbital laboratory suspended in space.
- Charcoal metal, subtle grid lines, soft fog, stars, and restrained particles.
- Traverse accent: amber.
- Inhabit accent: cyan.
- Command accent: magenta.
- Glowing cores and a cyan portal ring.
- Mode transition tweens camera position, rotation, field of view or zoom, fog,
  lighting accent, and a short full-screen mode title.
- Use translucent editorial panels and compact data labels. Avoid a generic wall
  of rounded SaaS cards.
- Do not rely on color alone to identify state.

## Product UI

Keep the game visually dominant. Include:

- Title: **Mechanic Forge**
- Tagline: **One World. Three Versions of Real.**
- One-line explanation: “Describe the experience you want; AI proposes a mode,
  predicts its effect, and the same world recompiles around you.”
- A prompt prefilled with: “Make this platformer feel more immersive and
  exploratory.”
- `Ask Astra` and `Apply mutation` actions.
- Three compact mode cards for Traverse, Inhabit, and Command.
- A concise hypothesis panel showing design principle, predicted behavior,
  primary metric, fairness/trust risk, and playtest question.
- Live objective and controls.
- Completion results with replay and alternate-mode actions.

For today's prototype, the prompt flow may use a clearly identified deterministic
local proposal. Do not claim it is a live Astra call. The manual mode controls and
entire game must work without any model or network request.

## Optional Astra integration

If API credentials and a suitable server-side deployment path are already
available, implement one narrow endpoint using the current official OpenAI
Responses API and structured outputs. Otherwise leave a clean interface and
fallback for tomorrow rather than blocking P0.

The model selects only supported configuration values. It must not generate or
execute JavaScript, Three.js code, shaders, or arbitrary scene mutations.

```ts
type ModeProposal = {
  proposalId: string;
  title: string;
  mode: GameMode;
  config: ModeConfig;
  designPrinciple: string;
  predictedBehavior: string;
  primaryMetric:
    | "completion_time"
    | "falls"
    | "path_efficiency"
    | "hazard_exposure"
    | "discoveries";
  fairnessRisk: string;
  playtestQuestion: string;
};
```

- Validate model output server-side.
- Keep the API key server-side and out of bundles, logs, screenshots, and commits.
- Configure the model through `OPENAI_MODEL`; do not hard-code account details.
- Prevent double submission and stale responses.
- Time out gracefully and fall back to a known-good local proposal.
- Label fallback output honestly as `Demo fallback`.
- Conserve test usage today: use deterministic fixtures for normal development
  and make at most a few live calls for final smoke testing.

## Verification loop

Use the repository's real scripts. After each major phase:

1. Run the production build.
2. Open the app and test the full hero path visually.
3. Inspect the browser console.
4. Fix functional and obvious visual issues before continuing.

Before declaring success, verify:

- No console errors during the complete demo sequence.
- `1 → 2 → 3 → 1` works repeatedly without reloading or duplicating controls.
- Pointer lock enters and exits reliably.
- Player position and collected cores survive mode switches.
- The apparent platformer obstacle becomes legible in first person.
- The tactical view reveals useful information not shown in other modes.
- Falling resets safely.
- Portal gating and run reset work.
- Metrics update from real gameplay and reset cleanly.
- Resize does not distort cameras or obscure essential UI.
- API failure cannot break manual play.
- No secret appears in the client bundle or Git history.

Add focused tests for pure reducers, mode configuration, and metrics if a test
harness exists. Do not build a large test framework solely for this prototype.

## Demo and repository readiness

Keep `README.md` current with the problem, three modes, controls, architecture,
local setup, environment variables, deployed-link placeholder, video-link
placeholder, and honest disclosure of fallback behavior.

If P1 is reached, create `docs/demo-runbook.md` using this 90-second structure:

| Time | Content |
| --- | --- |
| 0:00–0:08 | Problem and promise |
| 0:08–0:20 | Design intent and structured Astra proposal |
| 0:20–0:38 | Traverse and the ambiguous obstacle |
| 0:38–0:52 | Hero transition into Inhabit and hidden passage |
| 0:52–1:05 | Command reveals hazard and safer route |
| 1:05–1:18 | Portal and actual metrics versus prediction |
| 1:18–1:30 | Astra + deterministic-engine architecture and close |

The final event submission requires a deployed working app, GitHub repository,
and an exactly 90-second Google Drive or YouTube video viewable without requesting
access.

## Definition of done for today

Today's prototype is done when:

1. A fresh install starts successfully from documented commands.
2. The production build passes.
3. Inhabit and Traverse are fully playable in one persistent world.
4. The forged span works: three fragments align on entering Traverse, carry the
   player across a gap no jump can clear, and stop being solid on leaving.
5. Focus drains, recharges, pays back on a core, and collapses the span at zero —
   and a collapse never respawns the player into the void.
6. Three cores, portal completion, real metrics, and reset work.
7. Command freezes world time. Its reconfigure layer is implemented only if the
   above is stable; otherwise the UI marks it as the next step without pretending
   it works.
8. The AI-style proposal is compelling, clearly labeled as local if it is not a
   live Astra response, and never blocks play.
9. The README records controls, status, known limitations, and the next safest
   task for tomorrow.

When finished, report the outcome first, then the build/test results, files
changed, how to run it, and any remaining risk. Do not claim unverified behavior.
