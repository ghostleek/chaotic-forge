# ModeShift — build brief

**Build a browser game where switching your viewpoint changes which version of
the world is physically real.**

This document gives you the concept, the design principles that make it work, and
the architectural invariants that keep it from falling apart. It does not give you
a level layout, a palette, or a file manifest. Those are yours to invent. Where a
number appears, it is calibration from a working reference build, not a
requirement — treat it as evidence that the tuning window exists, then find your
own.

---

## How to work

Build the whole thing. Do not stop at a plan, a scaffold, or a proposal, and do
not come back with clarifying questions — every open question in this brief is
delegated to you, and a reasonable decision made and documented beats a question
asked. If two instructions here conflict, say which one you followed and why.

Work in the order the design demands: prove the one risky interaction first
(§2), then build outward. A pretty shell around a mechanic that does not work is
worth nothing; a working mechanic in a plain shell can be dressed later.

Verify by running it, not by reasoning about it. Open the build, play the
sequence in §2 end to end, read the console, fix what you find, and repeat. Test
the simulation headlessly where you can (§5.5) and reserve the browser pass for
how it looks and feels.

When you are done, report what you built, what you verified and how, what you
chose differently from this brief and why, and what is still weak. Do not claim
behaviour you did not observe.

---

## 1. The idea

### 1.1 The problem this solves

Most games that offer multiple camera modes are offering a preference. If a
first-person view and a side view can both walk you to the objective, the choice
between them is decoration — the player picks one, forgets the others exist, and
the feature dies in the first ten minutes.

The fix is to stop treating the view as a camera and start treating it as a
**rule space**. Each perspective gets its own physics, its own information, and
its own set of verbs. Switching is not how you look at the problem; switching is
how you change what the problem *is*.

### 1.2 The governing sentence

The whole mechanic must reduce to one sentence a player can learn once and apply
everywhere. The reference build used:

> **If two surfaces appear connected in a projection, they become connected while
> that projection is active.**

Three slabs floating at different depths look like debris from inside the world.
Seen flat from the side, they overlap into an unbroken line — and while you hold
that view, they *are* an unbroken floor. You can run across them. Leave the view
and they stop being a floor, mid-stride if that is where you are.

You may invent a different sentence. It has to pass three tests: a player can
state it back to you after seeing it once; it produces surprising consequences in
more than one place in the level; and it is mechanically true rather than
narrated — the colliders really do come and go, and a player who distrusts you can
check.

### 1.3 The strengths ledger — the core principle

This is the design rule that does the most work, and the one most likely to be
diluted during implementation.

**Every view must be able to do something no other view can, and be unable to do
something another view can.** Asymmetric power paired with asymmetric blindness.
No view is the good one. If a player ever settles into a favourite and stops
switching, the ledger has collapsed and the game is a camera toggle again.

The reference build's ledger, as an example of the shape:

| View | Grants | Costs / cannot |
| --- | --- | --- |
| **Flat side view** | Collapses depth, so alignment becomes connection — forges traversable geometry that does not otherwise exist | Cannot judge depth at all; cannot pick anything up or trigger anything; drains the budget continuously |
| **Embodied first person** | The only view that can act on the world — collect, enter, trigger. Full honest depth | Sees almost nothing of the layout; the world runs live around you; cannot forge |
| **Overhead planning** | Freezes world time and reveals what is otherwise invisible: hazard extents, patrol arcs, the safe lane | Cannot act on anything. It shows you the route; it cannot walk it |

Read the table as three sentences: one view *connects*, one view *acts*, one view
*knows*. Write your own three verbs before you write any code, and check every
subsequent decision against them. The moment a view gains a second verb, take
something away.

Two consequences fall out of this and both matter:

**The views must share one world and one body.** No reloading, no separate levels
per mode, no "platformer stage" and "FPS stage". Position, progress, elapsed time
and every resource persist across a switch. The player is standing in the same
place before and after; only the rules around them changed. This is what makes the
switch feel like a discovery rather than a menu.

**The switch must be continuous.** A cut between two cameras reads as a scene
change. A camera that physically travels from the eye out to a wide flat vantage
over 500–700 ms, with the world visibly reorganising as it lands, reads as the
world being recompiled around you. The transition is the single most expensive
moment in the demo and deserves the most polish.

### 1.4 The budget that stops one view winning

The forging view is the exciting one, so it will dominate unless it costs
something. Give the player a single visible resource — the reference called it
**Focus** — with these properties:

Holding the world-altering view drains it continuously, so forging is a decision
with a clock on it rather than a mode you live in. The acting view is free but
leaves the world running: threats move, time passes, you are exposed. The
planning view is free to hold but can do nothing, so hiding in it stalls the run.
A slow recharge exists on some safe condition, so no run can dead-end and no
player is ever softlocked by spending badly. Progress pays back a chunk, so the
economy tightens and loosens across a run rather than being a one-way countdown.

Running out while the altered geometry is load-bearing is the interesting case,
and it comes with a **hard fairness guarantee**: geometry that only exists
because a projection is open must never be recorded as a safe respawn point. When
the projection collapses and drops the player, they land back on real ground —
never inside the void the projection was spanning. Get this wrong and the mechanic
reads as a bug the first time it fires, and no amount of polish recovers the
player's trust. Build the guarantee into the ground-detection return value, not
into a special case at the respawn site.

One more subtlety worth copying: a collapse is the world's decision, not the
player's. If you count switches anywhere, do not count that one.

---

## 2. The hero moment

You need one interaction that is **provably impossible in one view and trivial in
another**, placed early, in the player's first thirty seconds.

The reference used a gap. Jump physics give a maximum horizontal reach; the gap
is wider than that reach by a clear margin, and the crossing distance is wider
still — impossible is a subtraction the player can feel, not a designer's claim.
Over the gap float three slabs at three different depths *and* three different
heights, which is what makes them read as debris rather than a path. Switch to the
flat view: depth collapses, the slabs slide into one plane and light up as a
floor, and the budget starts draining. Run across. Switch back on the far side and
the floor you just used stops existing behind you.

The strongest single beat in the entire build is the **pair of reads** — three
scattered slabs, then one span, from the same vantage, seconds apart. Everything
else in the demo is scaffolding for those two images. Author the level so that
pair is unmissable, and spend real time on the transition that connects them.

Then repeat the lesson in different keys so the rule generalises past one trick:

- Something that reads as a solid dead end from the flat view but has an open
  route behind it in depth — punishing the player for trusting the projection,
  and rewarding them for checking it embodied.
- A threat region whose exact extent and timing are invisible while you are
  inside it and completely legible from the frozen planning view — so the
  planning view earns its keep by making a dangerous crossing routine.
- An objective sitting inside that threat region that *only* the acting view can
  take, forcing the player to plan in one view and commit in another.

That is three forced round trips through all three views, driven by the level
rather than by a tutorial.

---

## 3. What the player does

Keep the loop trivially legible. The reference: collect three energy cores, then
enter a portal that only opens once you hold all three. Each core is placed so a
different view is the one that makes it reachable — one past the forged span, one
behind the false wall, one inside the hazard. The objective itself never changes
between views; only your ability to approach it does.

States are `ready → playing → paused → completed`, with a reset that restores the
world and the resource but keeps the player's understanding. A fall resets
position only — never progress, never elapsed time, never the budget. Falling is a
cost in seconds, not a punishment.

Show a short run summary on completion: elapsed time, falls, switches, distance
travelled, exposure, and **time spent per perspective**. That last one is the
interesting number, because it shows the player their own ledger — a run that
spent 80% of its time in one view is a run where your design failed, and you want
to be able to see that during development. Every number must come from a real
gameplay event. Never fabricate or estimate one.

---

## 4. Art direction

### 4.1 Perceived quality comes from the system, not the assets

You are not going to out-asset a studio in a prototype, and you do not need to.
Quality here comes from composition, lighting, restraint and internal
consistency. Simple primitive geometry, lit well, with a committed palette and a
confident camera, looks better than detailed assets lit badly. Decide on a
lighting model and a palette early and apply them everywhere, including the UI.

### 4.2 Multiple art styles over identical geometry — the fun part

Build **several complete art styles the player can switch between live**, over
the same geometry, the same physics, the same level. This is the feature people
remember, it costs far less than it appears to, and it turns a demo into a toy.

The rule that makes it worth doing: **these are not palette swaps.** A style
should change the *rendering technique* or change *what the world is made of*.
The reference shipped five, and the progression is a useful ladder:

1. **Physically based** — realistic shading, exponential fog, starfield,
   filmic tone mapping, full resolution. The "default" look.
2. **True pixel art** — render the whole scene at ~320×180 and upscale
   nearest-neighbour, with banded toon shading and no tone mapping. This is a
   real low-resolution render, not a post-process filter, so geometry, lighting
   and edges all quantise together. It looks unmistakably different from a
   pixelate shader, and it is one line of render-scale plus a CSS
   `image-rendering` change.
3. **Cel / ink** — two-band toon shading with inverted-hull outlines, daylight
   sky, no tone mapping.
4. **Authored 2D tilesets** — composite a real pixel-art tileset onto every face
   of every collision box, a billboarded sprite for the player, and image
   parallax bands behind the world. The world is now made of drawn art.
5. **Instanced voxels** — dice the same collision boxes into unit cells, skin the
   outer shell with instanced voxel block models sharing one texture atlas, and
   fog a block horizon behind it. A thousand-plus instances in single-digit draw
   calls.

Styles 1–3 change how the world is lit. Styles 4–5 change what it is *made of*,
which is the lever authored art gives you that no renderer setting can, and the
jump in apparent production value between 3 and 4 is larger than between 1 and 3.
Source packs under a permissive licence (CC0 tilesets, CC0 voxel kits) make 4 and
5 an afternoon each. Commit the licence files.

Implement this as **one typed style-token object** — shading model, render scale,
tone mapping, outline, sky, fog colour and scale, surface colours and material
parameters, light rig, accent colours for every world element, and a flag for
what the surfaces are built from. Every renderer reads the active style object
and nothing else. Geometries and materials are shared singletons restyled in
place, never rebuilt on switch; pre-composite any expensive textures during idle
time after load, or the first switch stutters in front of your audience.

### 4.3 Modes carry colour, lens and light

A view switch should be a whole visual event, not just a new camera position.
Give each mode an accent colour that propagates through the UI, the lighting
accents and the world highlights; its own fog density suited to its lens; and its
own set of revealed layers that fade in and out. A brief full-screen mode title
on switch sells the change for almost no effort.

Two details worth stealing. Fog density must be per-lens, not global: a camera
sitting 60 units back needs roughly an order of magnitude less fog than one
inside the world, or the wide views grey out entirely. And reveal layers should
tween at *different rates* on purpose — in the reference the forged span's
fragments slide into alignment slightly slower than the camera settles, so the
floor looks forged rather than switched on.

Never encode state in colour alone. Every colour-coded state also carries a word,
an icon or a fill pattern.

### 4.4 The one hard rule about art

**The level data is the single source of truth, and no art style may fork it.**
The tileset style textures the same boxes the simulation collides against. The
voxel style dices those same boxes. Nothing re-authors geometry for looks.

This is not tidiness, it is the thing that keeps a multi-style build from
collapsing under its own weight: the art physically cannot drift from the physics,
because there is only one description of the world and everything derives from
it. Adding a sixth style should never require touching the level.

---

## 5. Architecture

Build whatever structure you like. Hold these invariants.

### 5.1 The invariants

**One canonical player transform.** Exactly one object holds the player's
position, velocity and orientation, and exactly one controller writes it per
simulation substep. Controllers for inactive views are not called at all — not
called and ignored, not called. Two controllers writing the same body in one
frame is the bug that eats a day and never fully goes away. On a switch, zero
horizontal velocity so no impulse leaks between rule spaces.

**One ordered frame.** Read input, step the simulation, place the camera, update
presentation — in that order, in one place. If the order lives in four different
update callbacks it will drift, and the symptom will be a camera that lags the
body by one frame in exactly one mode.

**Fixed timestep with a capped accumulator.** Simulate at a fixed substep
(1/120 s works) and cap how much time one frame may consume. Collision behaviour
must not change with frame rate, and a tab that was backgrounded for ten seconds
must not teleport the player through a wall on return.

**Simulation and presentation are separate, and the arrow points one way.** The
authoritative resource value drives colliders; the visual strength value drives
only how far things have slid and how brightly they glow. The simulation must
never branch on a presentation value. Write this down in the code, because the
temptation to read the pretty number is constant.

**One owner per rule flag.** The flag that says "the altered geometry is solid
right now" has exactly one writer, in the state module, and it is a pure function
of: does this view alter geometry, is there budget left, and has the transition
landed. No component, no camera, no renderer ever sets it. Everything else reads
it. This is what makes the geometry materialise exactly as the transition lands
and vanish the instant the budget hits zero, with no special-casing anywhere.

**Colliders are per-projection sets.** Keep at least two collision sets: one
always solid, one solid only while a projection holds it. Resolve against the
real set first, then the projected set, so the body is corrected out of real
geometry before projected geometry is allowed to hold it. The ground-detection
result must report *which set* the ground came from — that single boolean is what
implements the fairness guarantee in §1.4.

**A narrow typed contract between the renderer and the UI.** The UI reads an
immutable snapshot and calls a handful of commands (`setMode`, `resetRun`). It
never touches renderer objects, scene graphs or materials. Snapshots are pushed
on a throttle, not per frame, so UI work cannot starve the render loop.

**The level is plain data.** One module of typed arrays: solids, spawn, depth
lanes, objectives, zones, hazards, the projected fragments with their rest and
aligned transforms. Physics derives collision boxes from it, every art style
derives surfaces from it, tests import it directly. Tuning the level means
editing numbers in one file.

### 5.2 A shape that works

```
shared/contract      typed snapshot out, commands in; mode configuration table
state/               the one transform, run status, the budget, mode switching,
                     the single owner of the projection-solid flag
runtime/             the one ordered frame; camera interpolation; renderer setup
controllers/         input (one source of truth), collision, per-mode movement,
                     world evaluation (pickups, zones, hazards, fall, completion)
cameras/             per-mode camera pose maths, shared by the transition
world/               level data, materials, art styles, scene components
ui/                  DOM product layer; reads snapshots, never the renderer
test/                headless deterministic replay of the hero sequence
```

Mode behaviour belongs in a **configuration table**, not in branches scattered
through the code: camera kind, movement kind, depth lock, what it reveals, does
it alter geometry, does it freeze world time, what it costs per second. Adding a
fourth view should mean adding a row and a controller, not hunting for `if (mode
=== ...)` across the codebase.

### 5.3 Three ideas worth copying outright

**One camera for all views.** Do not build an orthographic camera and a
perspective camera and cross-fade them. Use a single perspective camera and make
the "orthographic" views a long lens pulled far back — roughly 16–26° field of
view at ~60 units. It is visually orthographic, and it means the hero transition
is a plain position lerp plus a rotation slerp plus a field-of-view lerp on one
camera. That is the difference between a transition that took an afternoon and
one that never quite worked.

**Damp the camera's focus point, not the camera.** Wide lenses amplify every
micro-step of the physics into visible jitter. Follow a damped point that chases
the body, and snap it to the body exactly in first person where any lag is
nausea.

**Freeze time by skipping the substep, not by scaling it.** The planning view
holds world time at zero. Implement it as an early-out that consumes accumulator
time without stepping the world — no clock, no patrol movement, no pickups, no
exposure accruing. Scaling delta to zero leaves a dozen subtle paths where
something still advances. Keep accruing wall-clock time *per perspective*,
though: how long the player stood in the planning view is a fact about the
player, not about the frozen world.

### 5.4 Determinism

No randomness anywhere in the simulation. Patrols, sweeps and cycles are pure
functions of elapsed time — a cosine over a period, not an accumulating rotation.
The same inputs from the same start state must produce the same run every time.
This costs nothing, and it buys you the next section.

### 5.5 The headless test that pays for itself

Write a test that imports the **real** simulation modules — state, controllers,
collision, level data — stubs the handful of browser globals they touch, and
replays the hero sequence at a fixed timestep in a plain Node process with no
renderer at all. Assert the things the demo depends on:

The gap is wider than maximum jump reach by a real margin. Entering the forging
view makes the projected geometry solid, but only after the transition lands.
Walking the span actually crosses it. Leaving the view de-solidifies immediately.
The budget drains, recharges, pays back on progress, and collapses at zero. A
collapse respawns on real ground and never inside the gap. Progress, position and
elapsed time survive every switch permutation. All objectives collected opens the
exit; fewer does not.

Roughly ninety assertions covered this in the reference build, and it runs in
under a second. It is the check that must stay green while you are changing art
styles at 2am; the browser pass is only for how things look.

---

## 6. Where to innovate

Everything not nailed down above is yours, and I would rather you surprise me
than reproduce the reference.

The governing sentence and the rule spaces are the obvious place to be original —
depth-collapse is one answer to "what can a projection make true", not the only
one. Time, scale, shadow, reflection, silhouette and negative space are all
unexplored. The number of views is yours too; three is a nice size for a demo,
but the ledger in §1.3 is what matters, not the count.

The level, the objectives, the resource's name and shape, the visual identity,
the art styles and how many, the stack, the file layout, the naming — all yours.
The reference used React, TypeScript, Three.js via react-three-fiber, and Vite,
with hand-rolled axis-separated swept-AABB collision against axis-aligned boxes,
which is about a hundred lines and completely predictable. Any stack that holds
§5.1 is fine. Do not add a physics engine for a world made of boxes.

One deliberate simplification is worth inheriting: **the illusion is authored, not
solved.** Do not build a general forced-perspective geometry solver. Hand-place
the fragments' resting and aligned transforms and derive the projected colliders
from the aligned ones. The *rule* is real — those colliders genuinely exist only
while the projection is open — but it applies to authored geometry. A general
solver is a research project, and it buys the demo nothing.

## 7. Out of scope

No combat, no multiplayer, no procedural generation, no accounts or persistence
backend, no level editor, no skeletal animation, no runtime code generation, no
LLM features inside the game. Desktop browser at 1280×720 and up; touch and
portrait are not targets. Respect `prefers-reduced-motion` by shortening the
transitions rather than removing them.

## 8. Acceptance checklist

Do not report success until you have watched each of these happen:

- The gap is impossible in the embodied view — you tried, at full speed, and fell.
- The flat view forges the span; you cross it; leaving mid-span drops you.
- A collapse from an exhausted budget lands you on real ground, never in the void.
- The planning view reveals something genuinely invisible elsewhere, and cannot act.
- `1 → 2 → 3 → 1` repeatedly, with no reload, no duplicated input handlers, no
  drift in position or progress.
- Progress, position, elapsed time and the budget survive every switch.
- Pointer lock enters and exits cleanly, and a host that blocks it falls back to
  drag-to-look instead of breaking the view.
- Every art style renders every element correctly, switches without a hitch, and
  does not change physics in any way.
- Resize does not distort any camera or hide essential UI.
- Falls reset position only. The exit gates on full progress. Reset is clean.
- Production build succeeds, and the console is silent through the whole sequence.
- The headless test passes.

## 9. Failure modes to watch for

If a playtester asks *"why would I ever switch back?"*, the ledger in §1.3 has
collapsed — one view has quietly accumulated a second verb. Take it away.

If the forged geometry appears before the camera lands, or lingers after the view
changes, something other than the single owner in §5.1 is writing the solidity
flag. Find it.

If a collapse ever respawns the player into the gap, stop and fix it before
anything else. That one bug destroys the mechanic's credibility completely.

If the hero transition reads as a cut rather than a move, the demo has no centre.
It is worth more polish than any other 600 ms in the build.

If adding an art style requires touching the level or the physics, §4.4 has been
violated and the build will get harder from here, not easier.

---

## Appendix — reference calibration

Numbers from a build that worked, for orientation only. Re-derive your own; what
matters is that a tuning window exists, not that you land on these.

Player: radius 0.36, height 1.8, eye 1.55, walk 6.2, run 9.4, gravity 26, jump
velocity 10.2 — giving a maximum horizontal jump reach of 7.4 m. The gap is 10 m
wide and needs 9.3 m of clearance to cross, so the impossibility is a clear
margin rather than a tight timing window.

Budget: 100 max, −12%/s while holding the forging view, +4%/s standing on real
ground in the embodied view, +25 per objective collected, visibly unstable below
30%. A full-budget forging view lasts about eight seconds, which is enough to
cross deliberately and not enough to live there.

Transition: 620 ms with an ease-in-out cubic, shortened to 180 ms under reduced
motion. Simulation substep 1/120 s, accumulator capped at 0.1 s, max 12 substeps
per frame. Device pixel ratio capped at 1.75; pixel-art styles render at 0.25–0.5
scale with nearest-neighbour upscaling.

Lenses: 20° field of view at 62 units for the flat side view, 26° at 58 units
overhead, 76° in first person. Fog density around 0.019 in first person and
0.003–0.004 in the wide views — a 5× difference, which is the point.
