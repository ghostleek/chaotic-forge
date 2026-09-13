# Verification — 13 September 2026

## Current revision: fixed options, no swaps

Latest user decision removes mixed-hand dealing and swapping. The UI now uses six PC-02/PC-03 preset IDs (two per slot), with an unavailable blank. The initial inventory enumerates 8 recipes and 48 participant assignments. No arbitrary concept is mapped to a preset, and this remains a local preview without room requests.

Fresh checks against the compiled React/table preview on port 4320 passed: `browser-check.mjs`, `onboarding-check.mjs`, and `hero-swat-check.mjs` (with `CARD_STUDY_URL=http://127.0.0.1:4320`). They cover the fixed option set, absent swap controls and inert stale swap events, inspection, selection/confirmation, waiting locks, actual RoomStatus/avatars, onboarding, hero swat/restore, mobile and reduced motion. Scoped Oxlint passed for the study JS/MJS and fixture runner. The Vite fixture build passed. No full repository or live-room gate is claimed.

`demo-combinations.json` was enumerated and checked locally: 8 unique recipe triples and 48 distinct participant assignments. The 40 later rule-set bound in `demo-combinations.md` is a combinatorial analysis of the current addition policy, not new runtime qualification. Earlier mixed-hand/swap checks below are historical and superseded.


## Current revision: fixed hero and dismissible onboarding

The latest user direction removes the 2D/3D control and repeated explanatory sections while retaining the hero artwork. This supersedes the whole-site mode experiment. Both pages now use flat cards/type/cats with the fixed dimensional SVG hero.

- Removed the mode control/handlers, illustrative-preview caption, permanent prototype paragraph, aside notes and asset-download footer. Existing source/interpretation/decision details and mini demos remain available on demand through the cards.
- Added reusable `onboarding.js` / `onboarding.css`. The introduction can be dismissed through × or Let’s play, and reopened with How to play. It remembers dismissal for the current tab session and safely falls back when storage is unavailable. Initial mounting does not steal focus. Onboarding never changes the hand or contributions.
- A compact Preview room badge and Example player labels remain visible after dismissal; this continues to be a local fixture with no room requests or generated gameplay.
- `node docs/design/pc-04-cards/onboarding-check.mjs` **passed**: initial/reopened focus, both dismissal controls, session persistence, blocked-storage fallback, selected/waiting-state continuity, fixed hero, removed controls/notes/footer, overview navigation, desktop/tablet/mobile layout and no browser console errors.
- `node docs/design/pc-04-cards/browser-check.mjs` **passed** after the UI changes: bounded hand, inspection without selection, keyboard/focus, swap, mini demos, separate confirmation, one-contribution waiting lock including stale events, cat states, reset and mobile dialogs.
- Final scoped Oxlint **passed** for all study JS/MJS using repository rules with project-wide TypeScript checking disabled. `git diff --check` **passed** for tracked changes; this new study folder remains untracked. No full-repository lint/build/test or merge pass is claimed.
- Independent `card_scope` review covered current source and all four new screenshots. The earlier mobile sticky-bar overlap was fixed by giving the action area its own space above the hand, then making it stick at the top while scrolling. The browser check asserts those layout boundaries. Final review found no blockers.
- Current screenshots, inspected locally: `verification/onboarding-desktop.png`, `verification/onboarding-mobile.png`, `verification/clean-table-1440.png`, `verification/clean-table-390.png`.

The preceding whole-site mode prototype was exercised successfully before the user changed direction. Its invalid unquoted numeric CSS selectors were fixed, and its state-continuity checks passed. Optional dimensional SVG/CSS assets remain reusable, but the prototype no longer exposes a mode switch; `onboarding-check.mjs` replaces the obsolete presentation test. The `site-2d-*` / `site-3d-*` screenshots are historical exploration artifacts.

## Previous revision: bounded hand and cat wait state

The user requested integration of the existing cat-avatar wait design and removal of the full-deck browser. This supersedes the catalog and repeated-contribution behavior described in the historical first-pass checks below.

- Removed full-deck browsing from both HTML pages and its event handler. Selection and inspection reject IDs outside the current dealt hand. Before confirming, swaps still replace one dealt card without adding a contribution; no new production redraw limit is implied.
- Reused three original cat SVGs byte-for-byte from `docs/design/avatars/`. You, Mira and Lance keep stable avatar identities; local selection remains orange Deciding. Only local confirmation turns You green Chosen. The other participants remain labeled Example player.
- One confirmed contribution enters waiting, locks every select/swap path, and preserves inspection, view switching and reset. Stale events cannot add another contribution. No fake delay, peer confirmation, readiness, or generation is introduced.
- Final post-review `node docs/design/pc-04-cards/browser-check.mjs` **passed** in installed Chrome: bounded hand, cats/assets, deciding versus chosen, keyboard and dialog focus, swap, separate review/confirmation, waiting lock including stale events, 2D/3D continuity, reset, desktop/tablet/mobile layout, and no console errors.
- Scoped JS Oxlint with the repository rules and project-wide TypeScript checks disabled **passed** after review. This is not a full-repository gate. The existing missing-Drizzle limitation recorded below remains; no repository build, full test, merge, or deployed acceptance pass is claimed for this revision.
- Independent `wait_state_review` agent reviewed the bounded study files and screenshots. Its blank-card contrast finding was fixed by excluding the dark blank from the waiting background override; the browser check now asserts that its background remains unchanged. No other implementation blockers were found.
- Fresh screenshot artifacts: `verification/cat-wait-desktop.png` and `verification/cat-wait-mobile.png`. Inspected both. The local in-app browser was refreshed to the initial hand so the user can try confirming into the wait state.

## Historical first-pass checks

The following records the previous card study. Catalog access and multiple preview contributions are no longer current behavior.

Scope: isolated `docs/design/pc-04-cards/**` component and interaction study. No production route, room client, scoring, runtime, or storage implementation changed. Other concurrent planning changes were excluded from this review.

## Passed

- `node docs/design/pc-04-cards/browser-check.mjs` against the real local HTTP-served pages, using installed Google Chrome via Playwright. Final post-review run passed.
- Desktop 1440px: five-card hand, blank has no action, inspection does not select, native Enter selection, 2D/3D selection preservation, separate preview/cancel/confirm, committed-card select/swap lock, direct swaps without a contribution, catalog selection, mini-demo step interaction, and reset.
- Regression from independent review: after three cards are confirmed and the fourth is selected, a catalog selection can replace that last uncommitted card; the inspector returns focus to the new hand card.
- Tablet 930px: world stays above the hand. Mobile 390px: no document/dialog horizontal overflow, details dialog works, reduced-motion setting respected by styles. No console/page errors in these checks.
- Scoped Oxlint passed for the study's JS/MJS with the repository rules and browser/node environments, using a temporary config with project-wide TypeScript checking disabled. This is a JS study check, not the full repository lint gate.
- SVG XML and vertex-bounds validation passed for both exported worlds. Pure renderer retains the same geometry between the two projections.
- Visual inspection of desktop/tablet and mobile states; original oversized SVG inline height override was removed so the parent owns sizing.
- Independent adversarial review by the `card_scope` agent, separate from implementation. Fixes covered last-slot replacement, blank ARIA, inherited CSS tokens, inspector focus destination, and SVG overflow. Final review reported no remaining implementation blockers in the bounded study.

## Repository gate limitation

`npm run lint` was attempted and failed on unresolved existing dependencies: `drizzle-kit`, `drizzle-orm`, and `drizzle-orm/sqlite-core`, plus the resulting implicit-any table callback in `db/schema.ts`. The study neither uses nor changes these files/dependencies. No repository build or full `npm test` pass is claimed. Nothing is merged, deployed, or declared PC-04 complete; the full QUALITY.md sequence is still required before product integration/merge.

Initial local attempts to launch a server/browser were blocked by the filesystem/process sandbox; authorized escalated retries succeeded. Playwright's default bundled browser was absent, so the final check uses the installed Chrome channel, matching the repository harness. The agent-browser CLI was unavailable. The mini-demo subagent encountered a usage limit; the parent implemented and verified the module locally.

## Artifacts

- `verification/card-table-desktop.png`
- `verification/card-inspect-mobile.png`
- `browser-check.mjs` — repeatable focused behavioral check; requires the local server described in README.

These are observed local UI checks and screenshots. They are not external user-study results, deployed multiplayer evidence, or proof of executable support for catalog combinations.
