# Kitchen Chaos v1 simulation

This is an authored deterministic preset runtime, based on the proposed Kitchen
Chaos card semantics in `PRD.md`. Its dimensions, timings, difficulty and layout
are Forge implementation choices. Automated traces are simulated test evidence;
they are not external observations or a model-generated game.

## Input and presentation interface

`createRuntime(recipe, seed)` starts a trial at tick 0. Supply exactly one
`InputFrame` per step to `stepRuntime(state, frame)`. The first frame has tick 0,
the final frame has tick 3599, and the returned state's tick counts consumed
frames. The returned state completes at tick 3600. A frame's full held-button
mask is `forward=1`, `back=2`, `left=4`, `right=8`, `shoot=16`, `interact=32`.
Opposite directions cancel; diagonal movement is normalized. Shoot and interact
use rising edges, so holding either action never creates repeated actions.

Yaw is radians in `[-PI, PI]`, with 0 facing +x and PI/2 facing +y. Pitch is in
`[-PI/2, PI/2]`, positive upward. Movement stays on the x/y floor. Aim changes
only the view and shot ray; pitch does not change walking speed. Position updates
are rounded to one millionth of a metre. Shooting tests finite-height zombie
cylinders, counter boxes, room walls, floor and ceiling. The nearest surface wins
over an equal-distance zombie, and one shot can hit at most one zombie. Counter
ricochet permits one reflected segment only, from the marked counter.

`snapshotRuntime(state)` returns a detached copy plus `remainingTicks` for the
renderer. `WORLD` supplies the room, stations, blocking counters, and spawn
points. Each zombie reports its current target and target coordinates. Events
belong only to the most recent step, have the resulting state's tick, and are
capped at 64. The renderer may derive animation from these snapshots and events;
it must not add simulation state, score events, timestamps or randomness.

`resetRuntime(state)` preserves recipe and seed and clears all progress.
`replayRuntime(recipe, seed, frames)` accepts only complete 3600-frame traces;
partial traces, missing ticks and invalid bounds throw before scoring. A local
practice presentation may reset; a scored attempt must obey the room protocol's
continuity rules. Losing focus clears held buttons in future captured frames
while the clock continues. Never restart or pad a missing scored trace.

## Authored rules

The room is 14 by 10 metres. The player starts at (2,5), with interaction points
at ingredient (2,2), prep (5,2), stove (8,2), and delivery (11,2). Interaction
reach is 1.15 metres. The station aisle at y=2.9 is clear; the central marked
counter occupies x=6.4..7.6, y=4..6. Walking and displacement respect every
counter, using bounded movement substeps to avoid tunnelling.

Interact to pick up a raw ingredient, prepare it at the prep station, and load
it at the stove. Quick orders require one portion and cook in 150 ticks; batch
orders require two separately prepared portions and cook in 240 ticks. Collect
the finished dish from the stove and deliver it. Each complete dish counts as
one valid order; delivered portions are tracked separately. Cooked dishes burn
900 ticks after becoming ready. A burn fails exactly one order. Partial batch
ingredients wait safely for the remaining portion.

Seeded zombies first spawn at tick 420 and then every 360 ticks, capped at 10.
They move at 0.8 metres per second and navigate around counters. Pursuers follow
the player. Noise seekers approach the stove only while it is actively cooking,
and otherwise follow the player. A zombie contact slows the player for 30 ticks,
pushes them 0.55 metres, and spoils a carried finished dish once. Contact has a
shared 120-tick cooldown; it never ends or extends the trial. Empty-handed idle
trials remain valid zero-order, zero-failure outcomes.

Shots have an 18-tick cooldown and inflict one damage against two-health
zombies. Knockback pushes a hit zombie 2 metres and stuns it for 60 ticks.
Counter ricochet pushes 0.25 metres and stuns for 15 ticks, with the additional
one-bounce trajectory. Every hit repels once; two hits remove a zombie. The
small push shared by both variants makes Zombie Pantry compatible with either
FPS card. `ricochetHits` counts successful reflected hits, separately from rays
that merely bounced off a counter.

Each addition has a one-copy stack cap, with all three additions compatible:

- Dinner bell: each delivery starts or refreshes a 360-tick lure at delivery.
  Zombies within 7 metres pursue it, overriding their base target. The
  `bellAttractionTicks` metric counts actual moving zombie ticks under the lure.
- Hot potato: a carried finished dish spoils 600 ticks after collection. Expiry
  happens before interaction on that tick. `timerSpoiledDishes` isolates this
  effect from contact spoils. Raw and prepared ingredients do not expire.
- Zombie pantry: a repel drops one raw ingredient at the zombie's pre-push
  position while capacity permits. At most three drops exist at once, each
  expires after 900 ticks, and at most six can be picked up in a trial. Nearby
  drops take pickup priority over the unlimited ingredient station. Pending
  drops plus collected ingredients never exceed the pickup cap.

All numerical values are exported in frozen `RULES` and `WORLD` constants.
Order count is the primary performance metric; fewer failed orders is the
secondary metric. Partial work at the trial boundary adds no order or failure.
Results must be derived by replaying the retained executable from its initial
recipe and seed, never by accepting an arbitrary client snapshot or metrics.

## Retention and boundaries

`engine.ts` has no imports, network access, browser APIs, clock or platform state.
The retained transpiled JavaScript is the executable source used by build and
score integration. Its exact hash, runtime version, recipe and other manifest
references bind saved builds. After release, rule changes need a new runtime
version; do not replace retained bytes or silently run an older manifest using
new rules. Rendering and durable online room authority belong to their own
packets. This module alone establishes neither online play nor durable saves.

## Resolver, qualification and scoring integration

`await createPartyRuntime(manifest, seed)` in `adapter.ts` implements PC-01's
`PartyRuntime` envelope. It verifies the manifest once, then accepts exactly one
`input(frame)` followed by one `step()`. Missing, duplicate or out-of-order input
cannot advance the clock. `snapshot()` returns a frozen, detached envelope with
the typed Kitchen Chaos payload in `state`; `isComplete()` reports the fixed
trial boundary. Synchronous `reset(manifest, seed)` accepts only the same verified
manifest and clears pending input. Use a new async factory to load another
build. `validateScore(manifest, trial)` replays the bound build independently of
the active presentation state; use `scoreTrial` below when validating against a
frozen room round.

`resolveBuild({ contributions, previous? })` consumes PC-01 contribution history.
It produces a preset manifest or an explicit incompatible result retaining the
previous manifest. Initial resolution requires three supported slots; evolution
only appends one or two legal cards without rewriting earlier attribution or
rules. Room authority must enforce the two editor slots and their order before
calling the resolver. Reusing identical contributions after Pass returns the
same manifest. `additionOptions(history)` exposes legal singleton additions and
Pass when all three are present.

`qualification.json` retains build-time automated qualification for all 64
unique effect sets (eight starting recipes times eight addition subsets).
Permutation tests cover all 128 ordered histories. These records contain seed,
completing-trace hashes and per-card witness hashes, bound to the exact retained
runtime hash. They supply validation metadata only; they never supply player
inputs, scores or room results. `tests/fixtures/party-builds` recreates the
actual bounded traces independently of live product flow. Tests execute those
traces and compare every retained certificate. Providing optional `qualification`
to `resolveBuild` instead executes those supplied bounded traces immediately;
unsupported or ineffective witnesses cannot accept a build.
The manifest always retains the canonical build-time certificate. Loading rejects
invented validation hashes even if someone recomputes the outer content hash.

`loadBuild(manifest)` verifies canonical content hash, known executable version,
all resolved rule values, controls, scoring, authored origin and assets, then
reconstructs the exact recipe without resolving anew. It does not fetch or
execute arbitrary resource URLs. The resource key
`party-forge/kitchen-chaos-v1/engine.js` maps to the retained `engine.js` beside
this documentation. PC-05/06 must bundle/serve/retain these bytes as appropriate;
this packet does not claim an online archive URL.

`scoreTrial(manifest, frozenRound, trial)` rejects mismatched round/build/seed,
partial traces, unsupported fields and inputs over the 512,000-byte envelope.
It replays the retained executable and returns only derived order/failure counts,
attempt ID and canonical trace hash. PC-03 must establish participant identity,
check deadlines and enforce a single accepted attempt, then use PC-01 ranking
and tie/editor rules. This function does not award room permissions.

## Accepted integration base

PC-02 is [issue #31](https://github.com/ghostleek/chaotic-forge/issues/31).
Development is isolated on `codex/pc-02-kitchen-runtime` in a persistent
worktree outside PC-01's checkout. [PC-01 #30](https://github.com/ghostleek/chaotic-forge/issues/30)
is closed and [PR #41](https://github.com/ghostleek/chaotic-forge/pull/41) is
merged. PC-02 is rebased onto its main-branch merge commit
`2a842d704a0f9a9757a793d6ad7f77282f42f752`.
The shared `contracts.ts` is now the tracked parent file; the temporary draft
symlink has been removed. Its SHA-256 remains
`daf0fe513bbc06e96d7f9090dcbbeac4ef6ac39abdd8ce68562ed3ee6b04fb04`.
The rebase preserved both implementation commits without patch changes. The
incremental diff contains only PC-02-owned runtime, resolver and test files;
shared contracts/configuration and the original checkout belong to PC-01.

Node 24 is required. The packet tests are
`node --test --experimental-strip-types tests/party-runtime.test.mjs tests/party-build.test.mjs`.
The build suite compares full retained-engine snapshots across Node, Chrome and
local Cloudflare workerd for all eight maximal-addition recipes. Browser/Worker
checks require local listeners and Chrome process access. This proves module
compatibility and deterministic local execution, not hosted room durability.

## Local verification checkpoint — 13 September 2026

- `npm run lint` passes with the repository rules; no shared lint configuration
  or legacy assertions changed. Worker tooling loads lazily inside its test.
- `npm run build` passes using the merged PC-01 Vinext Cloudflare Worker build,
  including its entrypoint, assets, Site identity, DB binding and migration checks.
- `npm test` passed all 93 Node tests and all 20 desktop/mobile Chrome golden
  tests against the built Worker. No assertion was skipped or weakened.
- `npm run db:migrate:local` and `npm run test:party` pass. The latter verifies
  separate browser contexts, concurrent revision writes, and persistence across
  a Worker restart using real local D1.
- Independent adversarial review of the rebased incremental diff found no
  remaining P1/P2 findings, including the PC-01 adapter, qualification-hash and
  immutable-parent protections. Its separate non-network run passed 40 tests.
- Post-review lint, Worker build and all 41 focused PC-02 tests pass.

These checks cover the combined local branch on the merged foundation. They do
not establish deployed Site access or online multiplayer product acceptance.
The focused PC-02 suite covers all 128 ordered recipe histories, exact executable
bytes, complete bounded witnesses and actual Node/Chrome/workerd parity.
