# Mechanic Forge — PR sense-check and decisions

> **Historical planning, superseded 13 September 2026:** The active direction is [PRD v0.3](./PRD.md), with the [Kahhow/Lance delivery plan](./PLAN.md). The accepted loop now generates a game from everyone's initial cards, then both the winner and loser add one mechanic per completed round. Own-browser play and saving the finished game are in scope. Earlier proposals and restrictions below are preserved as history, not the current queue.

Reviewed: 13 September 2026, Singapore time. Baseline: local `c39ddb8`.

Status: review and proposed cut, not authorization to implement, publish, assign, or merge the backlog. The user requested automatic skill selection and a decision brief before further development.

## Bottom line

Keep the twenty MFH packets as a menu. Target three cohesive product PRs plus a release pass: a thin showcase frame, a small asset/HUD pass, and one creator-only overview-to-focus transition. Preserve the existing reference → one-rule experiment → local report → decision loop.

The current queue is not ready to dispatch unchanged. Its estimates total **485 task-minutes (8h 5m)**; fifteen of twenty packets are marked P0. Even with unlimited workers and no review overhead, its declared dependency graph takes **185 minutes** through release. Shared-file integration, human acceptance, the full per-PR quality gates, and rehearsal make that a lower bound, not a three-hour commitment.

This recommendation trades three-camera breadth and replay for one legible, polished interaction. If true first-person play or an in-product AI agent is the central promise, choose that explicitly and replace part of this cut; neither is a small add-on.

## What was verified

- Local history contains G1–G4 and the hardening merge, GitHub PR #8, in `c39ddb8`. `PLAN.md` still describes hardening as pending; its status header needs reconciliation before the next release, not another duplicate hardening PR.
- Code provides the 800 × 420 deterministic 2D arena, 45-second runs, seeded projectiles, bounded recharge mutations, and a separate fixed tester walkthrough. See [runtime](./lib/mechanics/dash-runtime.ts), [creator preview](./components/dash-microplay-preview.tsx), and [tester walkthrough](./components/dash-tester-walkthrough.tsx).
- [QUALITY.md](./QUALITY.md) requires lint, build, full tests, independent review, and post-review verification for every product merge. The final hardening packet cannot defer these checks for earlier PRs.
- [PRD.md §8.10](./PRD.md#810-hackathon-golden-flow) and [PLAN.md](./PLAN.md) protect the narrow prototype and distinguish it from production validation. Checkpoint GF and the market-evidence checkpoints are not established by merged code.
- Remote issue/PR listing failed with GitHub HTTP 401. The current remote queue, assignments, and checks are **unverified**. MFH-01…20 are local packet IDs, not verified GitHub numbers.
- No application build, unit suite, browser suite, deployment smoke, or human study was run for this documentation review. Historical pass counts in the split document must not be treated as fresh results.

## Decisions that matter before development

Defaults below are recommendations, not decisions silently accepted on your behalf.

| Decision | Recommended default | What you gain / give up | Human owner |
| --- | --- | --- | --- |
| What are we trying to win on? | Polished mechanic journey + documented agentic engineering; consider image generation as the second track | Best reuse of current work; less in-product AI spectacle. Confirm track eligibility with organizers, especially whether build-time asset use qualifies. | AI PM, with builder feasibility check |
| Two-dimensional focus view or true first-person world? | Existing overview + one close focus view; call it a focus view, not first-person | Protects runtime and schedule; does not deliver the spatial exploration shown in the partner screenshot. | Builder assesses source; AI PM owns the promise |
| Fixed demo or configurable tester handoff? | Use the elimination-recharge example throughout the narrated demo; keep the existing fixed-walkthrough disclosure | Avoids implying a selected creator mutation reaches the tester. A genuinely configurable handoff needs separate contract and report work. | Both |
| One polished transition or all three modes? | Overview ↔ focus, creator-only; defer Command | More review time and clearer controls; less tactical breadth. Freeze one identical view for both blind tester runs. | AI PM |
| Event timeline or spatial replay? | Existing timestamped event timeline and metrics | Honest with today's recorded data; no player path or camera replay. True replay requires additional capture and verification. | Builder + AI PM evidence acceptance |
| Twenty merge requests or fewer outcome slices? | Three product PRs and a release pass; retain MFH IDs as checklist references | Less repeated branch/review overhead; each combined diff needs a strict outcome boundary. Preserve sequential merging for now. | Builder |
| Build-time assets or runtime AI? | Generate assets during development; no new runtime API dependency | Stable offline/fallback demo. Voice, Agents API, and model-driven inspection each need explicit scope, access, latency/failure handling, and proof of real calls. | Both |
| Asset breadth and styling | One world surface, a restrained cyan/lilac palette, dark UI, simple CSS/SVG gameplay cues | Consistency and readability; fewer variants, no full generated sprite pipeline. | AI PM |

The two highest-impact answers are the target demo/track and whether the partner's multi-POV prototype exists as runnable source. An available prototype merits a bounded inspection, not an automatic port or a second game engine.

## Findings and required scope corrections

### 1. The minimum cut is not dependency-complete

In [the original queue](./mechanic-forge-split.md#10-twenty-issue-ready-pr-extensions), MFH-15 requires 12, 13, and 14, but the minimum cut omits 12 and 14. MFH-16 requires 07, which is also omitted. The final dispatch suggestion starts 06 after 01, although 06 depends on 03. A 40-minute foundation window also cannot cover the declared 60-minute foundation dependency chain before review.

Before assignment, either include those dependencies or change the child scope. Recommended: MFH-15 supports the existing overview and one focus view only; MFH-16 uses existing state plus CSS/SVG cues, with generated sprites explicitly optional. MFH-06 starts after palette approval. Do not silently mark omitted packets complete.

### 2. State continuity needs a running owner, not just a capsule

MFH-02 preserves `goal`, `mutation`, `seed`, `variant`, `phase`, and `pov`, but not the live player/projectiles, elapsed time, metrics, input queues, or ticking lifecycle. Those currently live inside [DashMicroplayPreview](./components/dash-microplay-preview.tsx). Remounting that component creates a new run; independent arena components would each own their own simulation/input listeners.

The selected POV implementation must keep one mounted runtime owner and swap presentation only. Prove that switching POV mid-dash preserves elapsed time, player position, projectiles, readiness, and metrics; it must not reset input, mount a second clock, or change the action sequence. Keep HUD/focus behavior outside the transformed world. Normal phase navigation must not secretly leave a hidden run ticking or discard a run without disclosure. MFH-02's refresh behavior should be an explicit safe reset, not new browser/server persistence.

### 3. “Inhabit” overpromises relative to the implementation

The existing simulation has x/y coordinates, one target, and projectile lanes. It has no depth axis, platforms, hidden passages, portal objectives, patrol AI, or first-person controller. MFH-11 explicitly forbids a 3D rewrite. A tighter crop can improve attention; it cannot reproduce the attached prototype's exploration mechanics.

Use an overview/focus pair unless runnable partner code proves a compatible shortcut. True 3D would be a separate architecture choice with integration and control risk. Also rewrite MFH-12's “objective order” and MFH-14's “trajectories” as existing targets/lanes and clearly illustrative guides, not new gameplay or recorded paths.

### 4. Replay is unsupported by recorded data—even the static fallback

[DashRuntimeEvent](./lib/mechanics/dash-runtime.ts) contains `type`, `atMs`, optional `detail`, and `preview: true`. It does not record positions, input history, or POV changes. Current state contains positions but does not preserve their history. The report consumes aggregate metrics, not a spatial trace.

MFH-18 cannot reconstruct a player path or dash locations from these events. A static path trace has the same missing-data problem as animation. Replace today's scope with a timestamped event list/timeline. If replay is later selected, explicitly design bounded local snapshots or an input/timestep log, separate presentation events from evidence, and add replay-equivalence tests. That is new capture work, not “consume existing events.”

### 5. Creator choices do not travel into the fixed tester report

The creator preview accepts different recharge mutations. [DashDemoPublish](./components/dash-demo-publish.tsx) points to the fixed `/play/dash-demo` route. The tester initializes the runtime without a mutation argument, using its `elimination` default; [dash-demo.ts](./lib/mechanics/dash-demo.ts) labels Run 1 as elimination recharge.

The current product discloses this fixed walkthrough. A continuous showcase must not erase that boundary or narrate its report as the result of an arbitrary creator-selected mutation. For today, demonstrate the elimination default and retain the disclosure. A configurable path must pass a validated experiment contract through both runs and derive report labels from it; it must not become a shortcut to unapproved production sharing.

### 6. Concurrency and quality rules disagree

`PLAN.md` requires sequential branches and merges. The split proposes three active implementation PRs and exact-parent stacked bases. These are different policies. The original 19/20 schedule also suggests a feature merge after freeze and recording, which would invalidate the checked candidate.

Default to the existing sequential policy. Asset exploration and acceptance preparation can proceed while the builder reviews a PR, but no dependent implementation dispatch before its approved base. Reserve the final 60–90 minutes for the release gate, deployed smoke, fallback and recording; move freeze earlier if measured gates need longer. No new feature merges after freeze; a necessary blocker fix gets its relevant gates and a fresh recording/smoke check.

### 7. Human review is the constrained resource

The AI PM is currently assigned art direction, generation, copy, issue refinement, cold tests, acceptance and pitch at once. The builder owns nearly every shared integration file, runtime contract and merge. Unlimited tokens do not remove those queues.

Keep one human accountable owner per packet. For 12/13/14/16, Copilot is the implementer, not the accountable owner: builder owns runtime/input integrity; AI PM accepts visible behavior. For 20, builder owns release; AI PM owns the submission asset as a separate deliverable. One consolidated revision request per PR is useful, but do not waive a quality gate to hit a fixed bounce count.

## All twenty packets, summarized

“Fold” means retain only the named subset in an outcome-based PR, not implement the original packet in full. Skill selection follows actual scope in [AGENTS.md](./AGENTS.md#pr-scope-and-skill-routing).

| Packet | Original purpose | Proposed treatment |
| --- | --- | --- |
| MFH-01 | Isolated showcase and fallback | Keep thin; no duplicate simulator or replacement home. |
| MFH-02 | Shared state capsule | Fold into runtime ownership work; safe refresh reset, no storage. |
| MFH-03 | Visual tokens | Keep; approve one palette before assets. |
| MFH-04 | Motion primitives | Fold in one fade/reframe + reduced-motion behavior; no framework. |
| MFH-05 | Phase rail | Optional orientation labels; no new multi-step navigation engine. |
| MFH-06 | Hero/environment pack | Keep one hero/world surface first; silhouettes only if needed and readable. |
| MFH-07 | Generated VFX sprites | Defer; CSS/SVG cues are sufficient for the selected feedback slice. |
| MFH-08 | Reference dossier | Frame existing source/copy; defer a complete layout rewrite. |
| MFH-09 | Forge command console | Frame the existing one-rule contract; no second live miniature simulation. |
| MFH-10 | Cross-phase anchor morph | Defer; match color/object placement if cheap, no dedicated morph PR. |
| MFH-11 | Presentation camera adapter | Keep only for the two-view slice after runtime-owner contract is proven. |
| MFH-12 | Traverse overview | Reuse the existing overview; no separate traversal mode or objectives. |
| MFH-13 | Inhabit close view | Keep as optional focus view; no first-person claim. |
| MFH-14 | Command tactical mode | Defer; does not earn enough demo time yet. |
| MFH-15 | POV switching | Keep two-view controls; make Command optional, ignore typing shortcuts, preserve state. |
| MFH-16 | Dash feedback | Keep readiness/protection/damage cues; generated sprites are not a dependency. |
| MFH-17 | Objective/status/control HUD | Keep; visible controls, clear objective, no color-only state. |
| MFH-18 | Observe replay | Defer spatial replay; retain the existing event list/report, tidy only if necessary. |
| MFH-19 | Accessibility/performance/determinism | Required for selected work, with tests in each PR and a final integrated pass. |
| MFH-20 | Deploy/rehearse/capture | Required; one known-good candidate, final feature freeze, verified fallback. |

## Proposed execution cut — approve before scheduling

| Slice | Included scope | Acceptance that matters | Proposed owner |
| --- | --- | --- | --- |
| A: Frame the existing story | Thin 01 + 03 + minimal 05/08/09 | Original routes work; source/interpretation/decision and fixed tester boundary remain obvious. No full journey rewrite. | Builder; AI PM accepts story |
| B: Art and legibility | Reduced 06 + 17 + minimal 16 | One coherent world surface; player, hazards, readiness, damage, objective and controls remain readable. CSS/SVG feedback works without optional assets. | AI PM; builder owns integration |
| C: One POV transition | Necessary 02/11 + 13 + two-view 15 + minimal 04 | Same input/timestep script produces identical runtime state/events with and without view changes; keyboard, mobile and reduced-motion checks pass. | Builder; AI PM accepts framing |
| Release pass | 19 + 20; fixes only if needed | Complete quality gates, independent review, fresh deployed smoke, fallback, final recording. | Builder; AI PM owns video |

Merge order is A → B → C → release. B uses existing state and does not depend on the camera adapter. C depends on the accepted shell and runtime-owner contract, not generated VFX, a new Traverse component, Command, or replay. Asset drafts can be prepared separately after palette agreement, without parallel code branches.

For a three-hour slot, treat C as stretch; cut it rather than compressing release verification. For four hours, C is the one ambition. Review measured gate duration after A before committing to C. If the frame grows into a new application shell, cut it down before taking on camera work.

## Skill routing and issue readiness

`AGENTS.md` now asks each task to classify the actual work, load only relevant available skills, and reconsider the selection if approved scope changes. Examples:

- MFH-06 generation → `imagegen`; asset imports/optimization → Next.js guidance only where relevant.
- MFH-11 pure camera math → runtime contract and unit tests; add React/browser guidance when integrating the view.
- MFH-15 → UI/framework guidance where touched, React review after multiple TSX edits, browser verification for behavior.
- MFH-18 review → inspect event schema first; selecting a visualization skill cannot supply missing history.
- Voice/Agents API proposal → scope decision first; `openai-docs` for current API facts. No automatic SDK, auth or storage installation.

This is instruction-based routing, not a background watcher or an auto-dispatch system. Remote Copilot work needs a self-contained issue brief because the local skill catalog and tools may not be available there. The approach follows OpenAI's [project instruction guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and [on-demand skill loading](https://learn.chatgpt.com/docs/build-skills).

Before publishing any selected issue, include outcome, human owner, implementer/reviewer, allowed files, preserved contracts, actual dependency/base links, selected skills or fallback, acceptance tests, timebox, and rollback. Maintain a mapping from retained MFH IDs to verified GitHub issues/PRs; do not publish both full original packets and condensed replacements as duplicate assignments.

## Next decision

Choose the demo direction and confirm whether runnable partner source is available. Then accept or revise the condensed cut and its human owners. Only after that should the selected issue briefs be rewritten, authenticated GitHub state reconciled, and approved assignments made. This review does not change the golden-flow contract or implement any feature.
