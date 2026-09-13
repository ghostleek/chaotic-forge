# Mechanic Forge × ModeShift: product reconciliation

> **Historical planning, superseded 13 September 2026:** The active direction is [PRD v0.3](./PRD.md), with the [Kahhow/Lance delivery plan](./PLAN.md). The accepted loop now generates a game from everyone's initial cards, then both the winner and loser add one mechanic per completed round. Own-browser play and saving the finished game are in scope. Earlier proposals and restrictions below are preserved as history, not the current queue.

**Reviewed:** 13 September 2026, Singapore time. Current application baseline: `c39ddb8`.

**Status:** Proposed product direction. This inspection authorizes no runtime integration, new mechanic family, model endpoint, implementation dispatch, or roadmap replacement. The existing Returnal G1–G4 path remains the approved delivery scope.

**Further reconciliation:** [Divergent concept directions](./mechanic-forge-concept-directions.md) incorporates the later verbalize-to-play and competitive assembly discussion. It reopens the audience choice between a professional mechanic lab, a creative playground, and a social creation game. The workspace recommendation below records the first reconciliation; it is not an accepted resolution of that newer choice.

## Recommended direction

Treat ModeShift as an example of the **playable artifact a designer wants Forge to deliver**. Keep Mechanic Forge as the workspace that helps the designer reach, test, and decide on that artifact.

The proposed promise is:

> Turn the player experience you want into a small playable mechanic test, with a clear changed rule and enough evidence to decide what to build next.

This makes the playable experience central to the value proposition. Research, specifications, and reports make that experience useful for a design decision. ModeShift supplies a compelling example of what “experience the mechanic” can mean; the current product supplies more of the experiment and provenance contract.

Neither prototype establishes the whole promise today. The current golden flow uses fixed local content and a separate fixed tester walkthrough. ModeShift is an authored game with a selector for prewritten proposals. It demonstrates an outcome, but does not demonstrate a system that produces arbitrary playable mechanics from user intent.

## What was unpacked and verified

- [Imported project](./references/imports/modeshift-forge-claude/README.md): Vite, React, React Three Fiber, and Three.js; source, build brief, demo runbook, assets, and a prebuilt `dist/` preview.
- [Import manifest](./references/imports/modeshift-forge-claude-import.json): archive SHA-256, destination, and exclusions. Extracted 1,062 files, approximately 24 MB. Omitted macOS metadata, bundled dependencies, nested Git metadata, and TypeScript build caches. The original zip is unchanged.
- Inspected the supplied desktop build in the in-app browser at 1280 × 720: initial Inhabit world, changed prompt, deterministic Traverse proposal, Apply mutation, rendered bridge view, and Command selection. The page visibly labels proposals as local with no model call.
- Ran the imported `scripts/hero-path.test.ts` against its actual source, bundled using this repository's existing esbuild and the DOM stubs from the imported runner: **90/90 checks passed**. Checks cover the impossible gap, projected collision, Focus drain/recovery, collapse and safe respawn, frozen Command time, complete scripted path, repeated switches, snapshots, and reset.
- These are automated local observations and a bounded browser inspection. I did not complete a human browser playthrough, regenerate the imported production build, run its normal `npm test`, conduct a demand study, or establish external evidence. No current-app quality pass is claimed; no product code was changed or merged.
- The archive is labelled “Claude” by the user. Its actual generating model and complete build history were not independently verified. Its two asset packs include CC0 license files crediting Kenney and Kay Lousberg; those packs should retain their own provenance rather than be described as generated art.

Archived agent instructions and build briefs are comparison material, not instructions to execute their proposed next tasks.

## The actual difference

| Dimension | Current Mechanic Forge | Imported ModeShift | Reconciled direction |
| --- | --- | --- | --- |
| User's starting point | Game or behavior reference | Desired player experience, with a world already present | Allow intent and reference entry to converge on one test specification; validate which entry users prefer |
| Immediate value | Understand and adapt a sourced mechanic | Experience an unusual mechanic in a coherent world | Make the playable result visible and desirable early |
| Authoring today | Goal and one supported dash-recharge selection | Keyword-selected proposal; applying it selects an existing mode | Expose supported changes, the exact diff, and unsupported requests honestly |
| Playable content | Fixed 45-second projectile-dash arena | Spatial puzzle with projections, Focus, cores, hazards, and portal | A bounded microplay can have atmosphere and a memorable interaction |
| Perspective | Proposed camera views preserve dash simulation | Views change collision, movement, information, and world time | Distinguish presentation controls from gameplay rules |
| Testing | Matched local A/B runs; fixed tester demo boundary | Single run with preset prediction threshold | Bind the hypothesis and changed rule to matched runs |
| Result | Descriptive local report and explicit decision | Metrics and HELD/MISSED; restart actions | Give the designer observations, limits, and keep/revise/reject/inconclusive |
| Runtime generation | Fixed deterministic demo | Authored world and deterministic proposal library | No claim of live generation until it actually exists |

The library's role as the preferred front door remains a product hypothesis: Checkpoint A is pending. ModeShift makes an intent-led entry plausible, but does not validate it either. We should test that choice rather than infer it from presentation quality.

## Two meanings of perspective must stay separate

The earlier [PR review](./mechanic-forge-pr-review.md) recommended overview/focus presentation because runnable partner source was unverified and the existing dash runtime is two-dimensional. The archive resolves the source-availability question: a separate 3D prototype exists. It does not establish compatibility with the dash runtime or approve a port.

There are two different concepts:

1. **Product roles:** the designer specifies a rule, the player experiences it, and the reviewer examines evidence. Those roles may use different interfaces around the same experiment.
2. **Gameplay modes:** ModeShift's Traverse, Inhabit, and Command are abilities within the game. Traverse creates a projected bridge and spends Focus. Inhabit allows free-depth movement. Command freezes the world and exposes hazards.

For a camera-only dash extension, switching view must preserve the simulation, input contract, clock, and evidence. For a future perspective-based mechanic, mode switching is itself gameplay and its effects must be part of the specification and measurements.

A template can contain several interacting rules while each test changes one rule. All three modes could exist identically in both variants. Comparing Traverse against Inhabit as “A/B” would change movement, depth, collision, and information together and would not isolate one mechanic effect.

An illustrative future test would vary **Focus drain only**, with the same geometry, mode capabilities, recovery, objectives, and measurement definitions. This is an example of how to reconcile the contracts, not selection or authorization of another template. Today's approved test still varies dash recharge only.

## What to adopt as the outcome standard

- **A mechanically true payoff.** The early gap gives the user something impossible before the rule is applied and possible afterward. A dash microplay needs an equally legible moment where the recharge rule changes an available action.
- **One coherent world.** Progress, resources, and measurements survive normal interactions; the user feels they are testing a mechanic rather than visiting disconnected screens.
- **A readable rule and cost.** The proposal names intended behavior and fairness risk, and gameplay makes that risk observable.
- **Art that serves the mechanic.** A restrained world style and useful silhouettes can make the test credible without committing to five art styles.
- **A small boundary between UI and runtime.** ModeShift's snapshot/command interface is a useful architecture reference. Reusing that principle does not require adopting its framework or replacing the existing runtime.

Do not turn every ModeShift feature into a Forge requirement. Its three cores, authored bridge, portal, art-style picker, and particular puzzle are properties of this sample artifact. The product requirement is that a supported mechanic test makes its rule and consequence clear.

## Gaps to resolve before calling this a decision tool

| Gap found in source | Product implication |
| --- | --- |
| `DesignIntent.apply()` calls `setMode()`; configurations already exist in `MODE_CONFIGS` | “Apply mutation” currently means select a prebuilt mode. It does not create a new rule or establish a control/mutation diff. |
| Proposals are chosen from three keyword-scored local entries | This supports a constrained demonstration. It does not prove broad intent understanding, dynamic world generation, or a live model call. |
| `Results` evaluates the current proposal state; that proposal is not frozen or bound to a run | A result can be evaluated against a proposal that was never applied, or one changed during play. A future test must bind configuration, hypothesis, metric, and threshold before the run. |
| HELD/MISSED compares one absolute measured value with a prewritten threshold | Meeting a threshold does not establish improvement or explain causation. Use a descriptive threshold label; a causal comparison requires matched variants and suitable observations. |
| No sourced-reference layer or explicit creator decision record in this flow | The attractive artifact still needs Source / Forge interpretation / User decision boundaries and a decision handoff. |
| README/UI say only Inhabit collects, but `evaluateWorld()` and `collect()` have no such restriction; the hero test collects core 1 in Traverse | The visible rule, executable behavior, and tests disagree. Resolve the intended rule before making this a contractual product example. |
| Command excludes time and exposure from world metrics; per-mode time is measured separately | A future experiment must define active-world time versus participant time. “Faster completion” cannot silently mean less time counted. |
| “Replay” calls `resetRun(true)` | It starts another run; it does not replay a recorded spatial trace. |

Source anchors: [design intent](./references/imports/modeshift-forge-claude/src/ui/DesignIntent.tsx), [proposals](./references/imports/modeshift-forge-claude/src/ai/proposals.ts), [results](./references/imports/modeshift-forge-claude/src/ui/Results.tsx), [world evaluation](./references/imports/modeshift-forge-claude/src/game/controllers/playerSystem.ts), [run state](./references/imports/modeshift-forge-claude/src/game/gameState.ts), [hero checks](./references/imports/modeshift-forge-claude/scripts/hero-path.test.ts).

## Direction choices and delivery consequence

| Choice | Benefit | Cost / consequence | Recommendation |
| --- | --- | --- | --- |
| Forge produces bounded playable mechanic tests; ModeShift illustrates the artifact | Combines immediate experiential value with traceable design decisions | Needs honest supported scope and a test contract around the artifact | Proposed product direction |
| Import ModeShift's full world as the new hackathon experience | Existing source provides a striking spatial mechanic | New mechanic family, runtime, controls, provenance, and A/B integration; changes the approved scope | Consider only as an explicit replacement of selected work, with its own acceptance boundary |
| Make ModeShift itself the whole product | Focused authored perspective game | Changes the customer and success criterion toward a player-facing game; research and design decisions cease to be central | Separate pivot, if that is the user's intended business |

Product reconciliation should precede implementation reconciliation. First choose the user promise. Then select one coherent slice and its human owner, implementer, reviewer, allowed files, exact base, acceptance checks, timebox, and cut path under [AGENTS.md](./AGENTS.md). The [twenty-packet split](./mechanic-forge-split.md) remains a candidate backlog and should not be dispatched unchanged.

For the existing hackathon scope, the coherent fallback remains Returnal reference → one recharge change → local A/B preview → fixed tester walkthrough → descriptive report → creator decision. A proposed polish pass can borrow ModeShift's legibility and payoff while retaining that contract. Any future product merge still needs every [QUALITY.md](./QUALITY.md) gate and the sequential policy in [PLAN.md](./PLAN.md).

The next useful user study asks designers whether this kind of playable artifact helps with an actual project decision, what they would change, and whether they can explain the limits of its result. The existing Stage 1 artifact-demand criteria provide a place to record that evidence. A supplied prototype and 90 passing checks do not pass that checkpoint or select the next mechanic family.
