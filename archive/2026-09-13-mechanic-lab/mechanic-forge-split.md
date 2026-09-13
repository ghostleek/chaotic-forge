# Mechanic Forge Hackathon Split

> **Historical planning, superseded 13 September 2026:** The active direction is [PRD v0.3](./PRD.md), with the [Kahhow/Lance delivery plan](./PLAN.md). The accepted loop now generates a game from everyone's initial cards, then both the winner and loser add one mechanic per completed round. Own-browser play and saving the finished game are in scope. Earlier proposals and restrictions below are preserved as history, not the current queue.

**For:** 13 September 2026 hackathon, Singapore time  
**Status:** Candidate backlog — reviewed 13 September; not an approved twenty-PR execution queue  
**Baseline assumption:** The G1–G4 MVP and its hardening pass are complete before any extension PR is merged.

**Read before assignment:** [PR sense-check and decision brief](./mechanic-forge-pr-review.md). It records dependency gaps, runtime/data limits, a smaller proposed cut, and decisions still needed. The original estimates, tonight/tomorrow schedule, pull orders, and stacked-branch suggestions below are retained for comparison, not execution instructions. Hardening is present in local commit `c39ddb8`; the historical test notes below are not a fresh quality result. Use `AGENTS.md` for per-PR skill routing. No GitHub issue/assignment status is asserted by this local document.

## 1. Outcome

Ship one coherent judge-facing journey:

```text
Reference -> Forge -> Inhabit -> Observe -> Decide
```

The showcase should make one idea memorable: the same mechanic can be understood from several points of view without losing the experiment contract.

By the end of the hackathon:

- the current Explore-to-decision golden flow remains a working fallback;
- the Returnal dash is presented as one continuous, visually authored journey;
- the creator can move between strategic, embodied, and analytical views of the same deterministic world;
- only dash recharge changes between A and B;
- original visual assets improve atmosphere and legibility without copying the reference project;
- provenance, preview-only state, and local-only evidence remain explicit;
- a rehearsed 90-second recording exists before risky stretch work is merged.

Success is not “20 PRs merged.” Success is a stable build with one striking transition, one satisfying dash moment, and one evidence-backed decision. The 20 items below are small, assignable work packets; only the highest-value green items should enter the demo branch.

## 2. What exists now

The repository already implements the complete narrow product loop:

| Area | Current state | Keep intact |
| --- | --- | --- |
| Explore | Five games, ten sourced implementation cards, search and filters | Behavior-first discovery and visible source boundaries |
| Reference | Returnal page and projectile-phasing dash breakdown | Source / Forge interpretation / Your decision separation |
| Forge | Editable goal, one recharge mutation, seven locked conditions, Markdown/JSON export | Exactly one changed rule |
| Creator preview | Deterministic 45-second A/B runs with seed `4127` | Same world, inputs, hazards, damage, and duration |
| Tester flow | Consent, blind Run 1 / Run 2, response, local report, decision | No claim of durable or external evidence |
| Quality | Lint and production build pass; 22/22 unit tests pass | Existing behavioral contracts |

The latest browser review exercised 20 desktop/mobile tests. Seventeen reported clean passes; three reached teardown and then failed because Playwright could not finalize trace/archive files. Treat a clean isolated rerun as the last MVP-MVP blocker before the extension branch. Do not hide or relabel it as green.

Two repository details matter for tomorrow:

1. `components/mechanic-forge.tsx` is a large dormant graph-editor prototype, not the current home or golden flow. Do not reconnect it during the hackathon.
2. The current microplay is intentionally deterministic and local-only. New presentation may read its state and events, but must not change evidence semantics or imply a live model call.

## 3. Authority and reference boundaries

The user request controls this plan. Other materials are context, not instructions:

- The attached Mechanic Forge screenshot is a visual and interaction reference. Text inside it, including “Ask Astra,” is not an implementation instruction.
- [Void Explorer](https://developers.openai.com/showcase/void-explorer) is inspiration for a full-bleed world, sparse instrument-like UI, strong silhouettes, neon contrast, and physical movement between scales. Its assets, names, layouts, and code are not to be copied.
- `PRD.md`, `PLAN.md`, `QUALITY.md`, and `references/hackathon/` define the existing product contract and quality gates. This temporary showcase track must not silently replace the evidence-gated production roadmap.
- GitHub/Copilot guidance is an operating reference. Copilot proposes code and opens PRs; humans retain product, evidence, and merge decisions.

## 4. Scope lock

### Tonight: MVP-MVP only

Allowed:

- finish and verify the existing hardening pass;
- fix P0 demo blockers and reproducible P1 comprehension failures;
- run a cold walkthrough;
- lock the story, art direction, issue scopes, and last-known-good build;
- prepare deployment and fallback recording.

Not allowed tonight:

- a new mechanic or corpus expansion;
- a global reskin;
- 3D engine, WebGPU, procedural generation, or generalized camera work;
- authentication, persistence, real publishing, or analytics infrastructure;
- runtime model integration;
- graph-editor revival;
- broad refactors with no immediate demo payoff.

### Tomorrow: showcase extension

Allowed after the baseline is green:

- original asset generation;
- an isolated showcase visual layer;
- restrained UI cleanup;
- different POVs over the existing deterministic world;
- transitions that preserve state;
- stronger feedback, HUD, and local replay/evidence presentation;
- one ambitious scripted payoff that can be removed without breaking the MVP.

## 5. Experience direction

### Visual promise

**A field instrument for entering a mechanic.** The interface begins as an analytical dossier, compresses into a command console, opens into the playable world, then reconstructs the run as evidence.

Use the references as principles:

- dark obsidian field with one luminous world surface;
- large, widely tracked display typography only at chapter changes;
- compact monospaced labels for state, objective, and provenance;
- cyan for world/navigation, magenta-violet for the player decision, lime for sourced or confirmed state, amber for risk;
- thin rules, hard silhouettes, sparse panels, and generous negative space;
- one hero visual per phase, not decoration in every card;
- generated assets must be original and stored with a prompt/usage manifest.

Preserve the current provenance meanings even if the palette is refined. A user must never confuse a prettier “Forge interpretation” with a sourced fact.

### Product POVs

| POV | Role | Question | Primary visual | Exit action |
| --- | --- | --- | --- | --- |
| Reference | Researcher | What does the source support? | Mechanic dossier and causal blueprint | Adapt one rule |
| Forge | Designer | What changes, and what stays fixed? | A/B command console around the same world | Enter preview |
| Inhabit | Player | What does the rule feel like under pressure? | Tight playable camera, minimal HUD | Complete both runs |
| Observe | Reviewer | What happened, and what can we conclude? | Route replay, event trace, limitations, decision | Keep / revise / reject / inconclusive |

### Runtime camera modes

The creator preview may expose three views inspired by the attached prototype:

- **Traverse:** whole-arena view for routes, gaps, timing, and objective order.
- **Inhabit:** close follow view for embodiment, projectile pressure, and dash feel.
- **Command:** high overview with trajectories, danger regions, and objective state.

All three views read the same world coordinates and runtime state. Switching view must not reset, pause, alter input, change collision, change the seed, or create evidence events. The blind tester flow uses one locked default view for both variants so POV does not become an experimental confound.

### Transition grammar

Every transition carries one persistent anchor:

```text
source mechanic -> changed recharge rule -> player dash -> event trace -> decision
```

Use a 250–450 ms reframe, crossfade, or camera move. Preserve focus and announce the new view for assistive technology. `prefers-reduced-motion` gets an immediate state change or short opacity fade. If supported route transitions are risky in the installed Next.js version, keep the experience within an isolated client shell or fall back to a plain fade; do not invent an unsupported framework API.

## 6. Roles and decision rights

Assumed split:

- **Builder / engineering lead — you:** architecture, runtime integrity, integration, deployment, and final merge.
- **AI PM / experience lead — co-participant:** user story, evidence integrity, art direction, issue acceptance, cold testing, and pitch.
- **GitHub/Copilot agent — implementation producer:** bounded code, tests, asset wiring, PR updates, and mechanical cleanup.

### Ownership matrix

| Work | Builder | AI PM | Copilot |
| --- | --- | --- | --- |
| Product promise and cut line | Consulted | **DRI** | Informed |
| POV names and judge narrative | Consulted | **DRI** | Informed |
| Source and evidence language | Reviewer | **DRI** | Implements |
| Visual reference board and asset acceptance | Consulted | **DRI** | Optimizes/integrates |
| Runtime state, collision, determinism | **DRI** | Acceptance test | Implements only from locked contract |
| Component boundaries and hot files | **DRI** | Informed | Follows file contract |
| Accessibility and comprehension | Technical reviewer | **DRI** | Implements/tests |
| Pull-request merge order | **DRI** | P0/P1 recommendation | No merge authority |
| Deployment and rollback | **DRI** | Smoke test | Fixes bounded defects |
| Demo and 90-second submission | Co-presenter | **DRI** | Supplies build proof |

### Hard decision rule

- The AI PM decides **why**, user comprehension, evidence language, and whether an experience change earns demo time.
- The builder decides **how**, whether runtime risk is acceptable, and whether a PR is safe to merge.
- Copilot may suggest alternatives but does not resolve product ambiguity, change the experiment contract, or merge its own work.
- Either human may veto a change that weakens the one-rule test, source boundary, accessibility, or last-known-good build.

### Handoff contract

Before assigning an issue to Copilot, the AI PM supplies:

1. one-sentence user outcome;
2. target route or screenshot region;
3. exact acceptance criteria;
4. visual reference plus what must not be copied;
5. product copy and provenance state;
6. priority and cut behavior.

The builder adds:

1. allowed and forbidden files;
2. relevant data/runtime contracts;
3. required Next.js guide to read from `node_modules/next/dist/docs/`;
4. tests to add or preserve;
5. base branch and dependency PRs;
6. rollback instruction.

Copilot returns:

1. a short implementation summary;
2. a screenshot or recording for visual work;
3. commands run and results;
4. known gaps;
5. no unrelated cleanup.

## 7. Tonight plan

Use relative time so the plan survives a late start.

| Time | Builder | AI PM | Output / gate |
| --- | --- | --- | --- |
| 0:00–0:20 | Finish hardening diff; identify exact RC commit | Re-read golden-flow copy and 90-second story | One named candidate; no feature work |
| 0:20–0:50 | Run clean lint, build, unit, and isolated browser suite | Prepare a five-question cold-test sheet | All gates green or one owned blocker |
| 0:50–1:20 | Deploy/smoke current flow in a fresh session | Run one cold walkthrough without coaching | Top three comprehension failures ranked |
| 1:20–1:45 | Fix only a reproducible P0/P1 blocker | Lock POV names, visual blend, and cut order | MVP-MVP freeze |
| 1:45–2:15 | Create milestone/labels and publish approved issues | Refine issue outcomes and acceptance copy | Tomorrow queue assignable |
| 2:15–2:45 | Capture a stable fallback take | Narrate and time the script | 90-second backup exists |
| Final block | Tag/archive last-known-good; stop risky changes | Prepare asset prompts and demo cues | Sleep with a working build |

If less than 90 minutes remain, do only the first three rows and capture the fallback. Tomorrow's visual work may start from a smaller issue queue.

## 8. Tomorrow: 3–4 hour execution

Unlimited agent tokens do not remove the human bottleneck: product decisions, visual review, conflict resolution, and live-demo rehearsal. Keep no more than three Copilot implementation PRs active at once.

| Clock | Integration rail — Builder | Product/visual rail — AI PM | Agent rail — Copilot |
| --- | --- | --- | --- |
| 0:00–0:15 | Verify RC and create showcase integration branch | Reconfirm demo sentence and P0 issue order | Read repo rules and selected issues |
| 0:15–0:55 | Merge foundation PRs 01–05 in dependency order | Generate/select asset pack; review tokens | Implement up to three non-overlapping PRs |
| 0:55–1:35 | Integrate Reference/Forge and camera adapter | Cold-check narrative and transition legibility | Implement PRs 08–11 |
| 1:35–2:20 | Integrate two best runtime POVs | Direct art, HUD, and first-30-second polish | Implement PRs 12–17 by green priority |
| 2:20–2:45 | Add Observe view; run focused tests | Validate evidence limits and pitch payoff | Implement PR 18 or fix review comments |
| 2:45–3:10 | Feature freeze; full quality gate | Fresh-session cold run | PR 19 only |
| 3:10–3:35 | Deploy and verify rollback | Record final 90-second take | Bounded blocker fixes |
| 3:35–4:00 | Optional single stretch merge | Rehearse live demo twice | Stop or document remaining PRs |

At 2:45, unmerged P1/P2 work stays unmerged. A visually exciting half-integration is not a demo asset.

## 9. GitHub issue and Copilot operating model

### Recommended setup

- Milestone: `Hackathon — POV showcase cut`
- Labels: `hackathon`, `agent-ready`, `p0`, `p1`, `p2-stretch`, `lane:foundation`, `lane:visual`, `lane:runtime`, `lane:evidence`, `needs-product-review`, `needs-engineering-review`, `blocked`
- One issue maps to one PR unless the issue is explicitly marked asset-only or release-only.
- Use `MFH-01` through `MFH-20` in titles so dependency order stays visible.
- Keep the existing golden flow on the protected fallback branch; integrate showcase work on a separate branch.

GitHub supports assigning an existing issue to Copilot, which then works toward a PR. Review comments can be delegated back to Copilot, and `@copilot` can be used to request a refinement on the same PR. Human review remains mandatory. See [GitHub's Copilot agent walkthrough](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/overview) and [research/plan/iterate workflow](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/research-plan-iterate).

### Bounce loop

```text
AI PM locks outcome and screenshot
  -> Builder locks files, contract, base, and tests
  -> Assign issue to Copilot
  -> Copilot opens PR with proof
  -> AI PM reviews behavior, copy, and visual result
  -> Builder reviews architecture, determinism, and tests
  -> Comment @copilot with one consolidated revision request
  -> Re-review changed result
  -> Builder merges or closes
```

Use one consolidated feedback comment per round. Do not bounce vague taste feedback. Convert it to an observable delta such as “the active POV must be identifiable without color” or “the player remains centered for the whole dash.”

### Agent issue preamble

Paste this into each issue assigned to Copilot:

```markdown
Read AGENTS.md and the relevant installed Next.js guide before editing.
Preserve Source / Forge interpretation / Your decision labels.
Do not add a runtime model call, auth, persistence, corpus expansion, or graph editing.
Do not alter the one-rule A/B contract or deterministic evidence semantics.
Stay within Allowed files. If another file is required, stop and explain why.
Return screenshots for visual work and report lint, focused tests, and build status.
```

### Merge rules

- A dependency PR must merge before its child issue is assigned, unless the child uses the parent's exact branch as its base.
- Only the builder edits shared hot files: `app/globals.css`, `components/dash-microplay-preview.tsx`, `components/dash-tester-walkthrough.tsx`, and `lib/mechanics/dash-runtime.ts`, unless an issue explicitly grants one of them.
- Prefer new isolated `components/showcase/`, `lib/showcase/`, and CSS module files.
- Copilot-generated PRs never merge on green checks alone; the AI PM accepts the visible behavior and the builder accepts the diff.
- After a significant revision, request re-review and rerun the focused test.
- Close superseded PRs instead of combining two competing visual implementations.

## 10. Twenty issue-ready PR extensions

### Queue summary

| ID | Title | Priority | DRI | Depends on | Estimate | Demo contribution |
| --- | --- | --- | --- | --- | --- | --- |
| MFH-01 | Isolate the showcase route and fallback | P0 | Builder | RC | 20m | Safe place for ambition |
| MFH-02 | Add a versioned showcase state capsule | P0 | Builder | 01 | 20m | One world survives transitions |
| MFH-03 | Add scoped visual tokens | P0 | AI PM | 01 | 20m | Coherent art direction |
| MFH-04 | Add motion and reduced-motion primitives | P0 | Builder | 03 | 20m | Clean transitions |
| MFH-05 | Add the persistent phase rail | P0 | AI PM | 02, 03 | 20m | Journey is always legible |
| MFH-06 | Generate the original hero/environment pack | P0 | AI PM | 03 | 25m | Memorable world surface |
| MFH-07 | Generate and integrate a small VFX sprite pack | P1 | AI PM | 06 | 25m | Readable projectiles and dash |
| MFH-08 | Reframe Reference as a mechanic dossier | P0 | AI PM | 03, 05 | 25m | Strong opening POV |
| MFH-09 | Reframe Forge as a command console | P0 | AI PM | 03, 05 | 25m | Rule change feels spatial |
| MFH-10 | Carry the mechanic anchor from Reference to Forge | P1 | Builder | 04, 08, 09 | 20m | First authored transition |
| MFH-11 | Add a presentation-only camera adapter | P0 | Builder | 01, 02 | 30m | POVs share one runtime |
| MFH-12 | Add Traverse view | P1 | Copilot | 11 | 20m | Route/timing overview |
| MFH-13 | Add Inhabit view | P0 | Copilot | 11 | 25m | Embodied hero moment |
| MFH-14 | Add Command view | P1 | Copilot | 11 | 25m | Tactical legibility |
| MFH-15 | Add POV controls and transition choreography | P0 | Builder | 04, 12, 13, 14 | 25m | Visible POV transit |
| MFH-16 | Add the dash feedback stack | P0 | Copilot | 07, 11 | 25m | Satisfying mechanic payoff |
| MFH-17 | Clean the objective, status, and control HUD | P0 | AI PM | 03, 11 | 20m | Judge understands play unaided |
| MFH-18 | Add Observe replay and local evidence overlays | P1 | Builder | 02, 11 | 30m | Experience reconnects to evidence |
| MFH-19 | Harden accessibility, mobile, performance, and determinism | P0 | Builder | Candidate stack | 35m | Demo reliability |
| MFH-20 | Integrate, deploy, rehearse, and capture | P0 | Builder + AI PM | 19 | 30m | Submission-ready release |

### MFH-01 — Isolate the showcase route and fallback

- **Outcome:** Add a direct showcase entry without replacing `/` or any existing golden-flow route.
- **Owner/review:** Builder DRI; AI PM checks entry copy; Copilot may scaffold.
- **Allowed area:** New `app/showcase/dash/` and `components/showcase/` files; one clearly reviewed link may be added later.
- **Acceptance:** Existing routes and tests remain unchanged; `/showcase/dash` loads with a visible “showcase preview” label; removing the new route restores the old build cleanly.
- **Guardrail:** No duplication of runtime logic and no claim that the showcase is a production flow.

### MFH-02 — Add a versioned showcase state capsule

- **Outcome:** Preserve `goal`, `mutation`, `seed`, `variant`, `phase`, and `pov` while moving between views.
- **Owner/review:** Builder owns schema; Copilot implements; AI PM verifies visible continuity.
- **Allowed area:** New `lib/showcase/session.ts` and tests.
- **Acceptance:** A deterministic default loads; refresh restores or safely resets local preview state; unknown versions fall back without crashing; no PII or durable evidence is stored.
- **Guardrail:** Presentation state may reference runtime state but may not redefine collision, recharge, evidence validity, or participant assignment.

### MFH-03 — Add scoped visual tokens

- **Outcome:** Establish an original Mechanic Forge showcase palette, typography scale, panel treatment, and focus language.
- **Owner/review:** AI PM DRI; Copilot implements; builder rejects global leakage.
- **Allowed area:** Showcase CSS module/tokens only; existing provenance variables may be referenced.
- **Acceptance:** Tokens cover field, panel, text, world, decision, evidence, risk, focus, and disabled states; text meets readable contrast; the original golden flow is visually unchanged.
- **Guardrail:** No wholesale `app/globals.css` rewrite and no copied Void Explorer assets or layout.

### MFH-04 — Add motion and reduced-motion primitives

- **Outcome:** Provide one safe transition API for phase and POV changes.
- **Owner/review:** Builder DRI; Copilot implements.
- **Allowed area:** New showcase transition component/hook and scoped styles.
- **Acceptance:** Default motion finishes within 450 ms; keyboard focus lands in the new view; screen readers receive the new view name; reduced-motion mode uses no spatial animation.
- **Fallback:** A simple opacity fade with identical state behavior.

### MFH-05 — Add the persistent phase rail

- **Outcome:** Make `Reference / Forge / Inhabit / Observe` visible as a four-step journey.
- **Owner/review:** AI PM DRI; Copilot implements; builder reviews navigation state.
- **Acceptance:** Current phase is exposed with text and `aria-current`, not color alone; completed and unavailable phases are distinct; the rail collapses cleanly on mobile.
- **Guardrail:** It is orientation, not a second navigation system. No dead links.

### MFH-06 — Generate the original hero/environment pack

- **Outcome:** Create the minimum art set needed for a distinctive world: one 16:9 hero environment, one seamless arena field, one player silhouette, one target silhouette.
- **Owner/review:** AI PM writes/selects prompts; builder checks file size/licensing; Copilot optimizes and wires imports.
- **Acceptance:** Assets share silhouette, horizon, lighting, and palette; remain readable behind UI; total optimized payload target is under 1.5 MB; manifest records prompt, generator, date, and intended use.
- **Guardrail:** Original work only. Do not ask for or reproduce AURORA, Void Explorer planets, Returnal captures, logos, or proprietary character designs.

### MFH-07 — Generate and integrate a small VFX sprite pack

- **Outcome:** Add one projectile, one dash trail, one protected-window cue, and one impact burst.
- **Owner/review:** AI PM accepts visual language; Copilot integrates; builder checks performance.
- **Acceptance:** Each effect communicates state at gameplay speed; effects remain distinguishable without hue alone; they derive from existing runtime events; effects can be disabled with one feature switch.
- **Guardrail:** No new combat mechanic, animation framework, or evidence event.

### MFH-08 — Reframe Reference as a mechanic dossier

- **Outcome:** Present the sourced dash as an instrument readout over the hero environment.
- **Owner/review:** AI PM DRI; Copilot implements; builder reviews source links.
- **Acceptance:** “From the source,” “Forge interpretation,” and “Your decision” remain explicit; source-supported behavior is visible before synthesis; “Adapt one rule” is the only primary exit.
- **Cut:** If the layout takes longer than 25 minutes, retain current content and apply only the showcase frame and hero asset.

### MFH-09 — Reframe Forge as a command console

- **Outcome:** Place Control A, Variant B, seven locks, and risks around a small live world preview.
- **Owner/review:** AI PM DRI; Copilot implements; builder verifies experiment contract.
- **Acceptance:** The changed rule is identifiable in three seconds; all locks remain available; the preview is labelled illustrative/local; goal and mutation still flow into the existing preview.
- **Guardrail:** The visual world may react to selection, but mutation choice must remain one of the existing bounded options.

### MFH-10 — Carry the mechanic anchor from Reference to Forge

- **Outcome:** Make one visual object—the dash corridor, player glyph, or recharge ring—persist through the phase change.
- **Owner/review:** Builder owns transition; AI PM selects anchor.
- **Acceptance:** The user can explain that the source behavior was preserved while only recharge changed; back navigation restores Reference without losing context; reduced motion remains clear.
- **Cut:** Replace object morph with matched positioning plus crossfade.

### MFH-11 — Add a presentation-only camera adapter

- **Outcome:** Convert deterministic world coordinates into camera transforms without modifying physics.
- **Owner/review:** Builder DRI; Copilot may implement after schema review.
- **Allowed area:** New camera module and focused tests; runtime edits require builder approval.
- **Acceptance:** Given identical state and POV, transform output is deterministic; player/projectile collision is unchanged; switching camera does not emit gameplay evidence or reset the run.
- **Guardrail:** No canvas/3D rewrite. Use existing DOM/runtime data.

### MFH-12 — Add Traverse view

- **Outcome:** Show the whole arena, route, pressure lanes, and objective order.
- **Owner/review:** Copilot implements; AI PM checks comprehension; builder checks camera contract.
- **Acceptance:** Player, target, hazards, route, and goal are visible at once; no important text overlaps the arena at desktop or mobile; current run remains controllable.
- **Files:** New `TraverseView` component and scoped styles only until integration.

### MFH-13 — Add Inhabit view

- **Outcome:** Create the showcase hero view with a tighter player-following frame and reduced chrome.
- **Owner/review:** Copilot implements; AI PM directs framing; builder checks input and collision.
- **Acceptance:** The player remains locatable; projectile approach and dash endpoint are readable; controls remain available; camera easing never changes world state; motion can be disabled.
- **Guardrail:** If follow-camera motion causes nausea or hides failures, use a fixed close crop centered on the action lane.

### MFH-14 — Add Command view

- **Outcome:** Show trajectories, pressure regions, objective status, and the current recharge rule in a tactical overview.
- **Owner/review:** Copilot implements; AI PM accepts information hierarchy; builder checks derived data.
- **Acceptance:** Overlays derive from existing positions and events; forecast-like shapes are labelled as guides, not observed evidence; controls and run timer remain consistent.
- **Guardrail:** Do not add enemy AI, pathfinding, prediction claims, or new telemetry.

### MFH-15 — Add POV controls and transition choreography

- **Outcome:** Let the creator switch with visible controls and keys `1`, `2`, `3` while maintaining one run.
- **Owner/review:** Builder integrates; AI PM accepts names and timing; Copilot resolves bounded review comments.
- **Acceptance:** Buttons show name and purpose, active mode is not color-only, shortcuts ignore editable fields, switching preserves run time/state, blind tester route remains locked to one view.
- **Demo target:** Traverse -> Inhabit immediately before the decisive dash -> Command after the crossing.

### MFH-16 — Add the dash feedback stack

- **Outcome:** Strengthen anticipation, activation, protected crossing, recharge, and impact without changing mechanics.
- **Owner/review:** Copilot implements; AI PM tunes feel; builder verifies event derivation.
- **Acceptance:** Each cue maps to an existing state/event; damage and successful protection cannot be confused; no unbounded timers or nondeterministic particles enter tests; effects respect reduced motion.
- **Cut order:** impact burst, dash trail, recharge ring, then optional camera impulse.

### MFH-17 — Clean the objective, status, and control HUD

- **Outcome:** A first-time judge understands goal, variant rule, remaining time, dash readiness, and controls without coaching.
- **Owner/review:** AI PM DRI; Copilot implements; builder checks runtime bindings.
- **Acceptance:** Five-second glance test passes; inactive details collapse; `H` may hide nonessential chrome but never objective/failure state; keyboard and touch controls remain visible when relevant.
- **Guardrail:** No dashboard wall. Maximum one primary panel per screen edge.

### MFH-18 — Add Observe replay and local evidence overlays

- **Outcome:** Reconstruct a completed run with player path, dash points, crossings, eliminations, damage, and POV changes.
- **Owner/review:** Builder owns data mapping; AI PM owns evidence language; Copilot implements isolated rendering.
- **Acceptance:** Replay consumes existing local preview/tester events; preference remains separate from behavior; sample and local-only limitations are visible; no fabricated path segments or predictive claim.
- **Cut:** Use a static path trace and event markers instead of animated replay.

### MFH-19 — Harden accessibility, mobile, performance, and determinism

- **Outcome:** Prove the selected showcase stack is safe enough to demo.
- **Owner/review:** Builder DRI; AI PM runs a cold comprehension pass; Copilot fixes only filed defects.
- **Acceptance:** Lint, build, unit, and browser suites pass in isolation; no console errors; keyboard path works; focus is visible; reduced-motion works; 390 px layout has no horizontal overflow; assets do not delay first interaction unacceptably; same seed/action script produces the same runtime result.
- **Cut:** Disable any optional view/effect that causes a quality failure after one repair attempt.

### MFH-20 — Integrate, deploy, rehearse, and capture

- **Outcome:** Produce one known-good deployed candidate, fallback, and submission proof.
- **Owner/review:** Builder owns release; AI PM owns final story; Copilot is limited to P0 fixes.
- **Acceptance:** Fresh private-session smoke passes; fallback route is known; 90-second recording shows product, POV transition, one-rule contract, evidence limitation, and two concrete Astra-assisted build contributions; source and asset manifest are retained.
- **Stop condition:** After the final take, no merge without both human owners explicitly agreeing it fixes a demo blocker.

## 11. Pull order and cuts

### Minimum convincing cut

Merge:

```text
01 -> 02 -> 03 -> 04 -> 05 -> 08 -> 09 -> 11 -> 13 -> 15 -> 16 -> 17 -> 19 -> 20
```

This ships one strong Inhabit view and visible phase/POV continuity. Traverse, Command, replay, and the full asset pack may remain open.

### Preferred four-hour cut

Add:

```text
06 -> 07 -> 10 -> 12 -> 14 -> 18
```

### Cut first

1. animated replay; keep static event markers;
2. Command view; keep Traverse and Inhabit;
3. object-morph transition; keep a crossfade;
4. secondary VFX; keep the dash trail and recharge cue;
5. generated hero asset on every phase; keep it only in Reference and Inhabit.

Never cut source labels, one-rule locks, objective/failure legibility, keyboard path, reduced motion, evidence limitations, or the fallback build.

## 12. Demo spine

1. **Reference:** “We start from a sourced behavior, not a blank prompt.”
2. **Forge:** “We preserve the dash and change one rule: recharge.”
3. **Inhabit:** “Now enter the same system and feel the difference under projectile pressure.”
4. **POV switch:** “The world does not change; only what the designer can see changes.”
5. **Observe:** “We turn the run back into evidence, with the limits visible.”
6. **Decide:** “The product does not declare a winner. The designer records keep, revise, reject, or inconclusive.”

## 13. Decisions to confirm

These answers improve the plan but do not block tonight's MVP-MVP work. Defaults are already chosen so execution can continue.

1. **Role split:** Is the builder/engineering-lead assumption for you correct? Default: yes; the AI PM owns product, evidence, art acceptance, and pitch.
2. **Visual blend:** Should tomorrow favor the dark Void Explorer-like instrument mood or the attached cyan/lilac cel-ink prototype? Default: dark instrument chrome with a cyan cel-shaded playable world and magenta/lime state accents.
3. **POV vocabulary:** Keep `Traverse / Inhabit / Command` inside the runtime, with `Reference / Forge / Inhabit / Observe` as the product journey? Default: yes.
4. **Demo medium:** Is live judging or the 90-second video primary? Default: design for live use, capture the video before stretch work.
5. **GitHub publication:** Should the 20 work packets be published as repository issues after review? Default: yes, but do not publish or assign until the issue set and GitHub authentication are confirmed.

## 14. Immediate next action

Tonight, close the quality gate and freeze the MVP-MVP. Then review the five defaults above, publish only the approved issue set, and assign the first three non-overlapping tasks: MFH-02, MFH-03, and MFH-06 after MFH-01 merges.
