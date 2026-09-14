# PC-12 progressive demo follow-up

User decision: make the Dino mashup demo accelerate and double-check its obstacle legend/sprite; clarified that acceleration must continue beyond 2× as time passes. Forge interpretation: an endless authored runner, starting at 3 pixels per fixed step and adding 1× speed every 30 seconds with no cap, continuing until lives run out. Source references remain Dino and Mario; no new external evidence or model generation.

Outcome: the public onboarding demo runs beyond 30 seconds and 2×. The HUD shows elapsed time and uncapped speed. The authored encounter pattern repeats with unique IDs, speed-adjusted spacing and bounded memory. The legend uses the gameplay spike drawing. Seven timed jumps still clear the initial pattern without damage.

Human accountable owner: Kahhow (demo UX). Implementer: Codex. Independent code reviewer: Codex review_dino; human acceptance remains Kahhow/Lance. No new GitHub issue or PR verified. Exact local base: 571c96d on codex/dino-mario-lives-competition, containing the current demo. Existing unrelated room/billing edits were preserved.

Scope: the demo engine's optional speed and finish parameters, new progressive demo wrapper, Dino canvas renderer, demo component/CSS, focused domain/browser tests, and this handoff. Lance retains ownership of shared runtime contracts. V1 and V2 defaults and retained executable bytes, hashes, scoring and saved multiplayer replays remain unchanged. The demo wrapper is authored v3; public demo play still makes no model call. No dependency or storage migration added.

Skills: Sites building for existing-site conventions; agent-browser guidance for requested visual checking, using the existing Playwright Worker harness because the agent-browser CLI is unavailable. No new route or client/server boundary was introduced. No raster art generation was needed: the existing sprite drawing is reused.

Timebox: this session. Cut/rollback: restore the demo's prior imports/render parameters and legend, remove the progressive wrapper and its tests; retain all saved data and V1/V2 artifacts. No merge or deployment performed.

Validation: 22 focused Dino tests pass, including deterministic acceleration/distance and full course completion. Independent review found no blocking issues and independently repeated those 22 tests. Lint and production Worker build pass after fixes. Full npm test was retried with local server permission after a sandbox EPERM; final results recorded below.

Final results: all 207 unit tests passed with local server access. The initial full browser run passed 46/50; four Dino checks had ambiguous canvas selectors after the legend gained its canvas. After narrowing those selectors to the labeled gameplay canvas, all 14 Dino desktop/mobile browser checks passed, including the complete winning run, restart, pause and keyboard input. Other 36 browser checks passed in the full run. Final lint, build and 22 focused domain checks passed. Desktop/mobile screenshots were visually inspected: the red double spike legend matches the course sprite and the speed HUD fits both layouts. No product changes followed independent review; only browser selector fixes and formatting.


Endless follow-up validation: 23 focused Dino tests pass, including uncapped speed through 2 minutes, repeated encounters through 5 minutes, terminal inactivity, restart and retained V1/V2 behavior. Independent review repeated all 23 successfully and found no blocker. Minor accepted visual limitation: the first pickup of the second pattern appears within the viewport at its 30-second spawn; hazards start offscreen. Full fresh gate results follow below.

Fresh endless gate results: lint and production build passed; all 208 unit tests passed; all 50 desktop/mobile browser tests passed, including continued play at 31 seconds/2.03× and restart to 1×. Browser suite used isolated port 3129 because the default port was occupied. Independent review and the post-review lint/build/23 focused tests passed. No merge or deployment.
