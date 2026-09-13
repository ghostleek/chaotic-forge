> Historical design study. The production interface is `/party`; the latest user decision is one fixed recipe (Knockback, Pursuers, Quick orders) with deterministic additions. Six-option/eight-recipe inventories below document an earlier exploration and are not current acceptance requirements. This local study does not claim live room authority. See `../../issues/PC-04.md`.

# PC-04 card interaction study

Related packet: PC-04, [issue #33](https://github.com/ghostleek/chaotic-forge/issues/33). Human accountable owner: Kahhow. Implementer: Codex. Human reviewer: Lance; independent agent review is recorded separately below. Inspected repository base: `2a842d704a0f9a9757a793d6ad7f77282f42f752` ([PC-01 PR #41](https://github.com/ghostleek/chaotic-forge/pull/41)). This is an isolated visual/component study on that checkout, not a completed live room client.

## Try it

From the repository root:

```sh
PARTY_UI_PORT=4320 node tests/fixtures/party-ui/preview.mjs --table
```

Open `http://127.0.0.1:4320/play.html` for the card table or `http://127.0.0.1:4320/` for the broader visual study. The runner compiles the real React component and both HTML entries with the installed Vite/Vinext image shim, serves public SVGs, and removes its temporary build on Ctrl+C. A raw static server cannot compile the shared TSX import.

Choose any of six cats, confirm a card, then tap **Mira's cat**. She swats the hero world away; **Bring it back** restores it. This decorative trick changes no cards, contributions, or peer states. Reduced motion shows the final state immediately, and Start again cancels an animation. The separate selfie-to-3D idea remains deferred.

Select a fixed demo option, inspect its meaning or step through an authored explainer, and review before confirming into the **local preview**. The blank card cannot be selected. The current direction uses flat typography and cat sprites with a fixed dimensional hero illustration; the 2D/3D toggle is removed. Start again restores the original hand. No network commands, game persistence, room privileges, or generated gameplay are simulated.

The first visit shows one dismissible introduction. Both × and Let’s play hide it and move focus to the hand; How to play reopens it. Dismissal is remembered for the tab session, with an in-memory fallback if browser storage is blocked. The repeated prototype explanations and asset-download footer are removed from both pages. A compact Preview room badge and Example player labels retain the distinction between local fixtures and real participants. Card details and concept explanations remain available on demand.

The user dropped mixed-hand dealing and swaps for simplicity. The table now shows the existing six authored choices, two each for FPS, zombies and cooking, plus the unavailable conceptual blank. There is no deal, shuffle, swap or redraw path. Exactly one option per category bounds the initial recipe to **8 combinations**; player assignment gives 48 equivalent contributor arrangements, not extra games. The live room client must disable a category claimed by another accepted contribution; this local study does not simulate those remote claims. One local confirmation locks further contribution and preserves inspection. See [the combination inventory](./demo-combinations.md) and reusable `demo-combinations.json`.

## Reuse

- `forge-card.js`: dependency-free `<forge-card>` custom element. Load `cards.css` once. Set `.card` to a concept object. Toggle `selected`, `committed`, and `locked` attributes. `locked` disables selection while leaving inspection available. Listen for bubbling `forge-select` and `forge-inspect` events carrying `detail.cardId`. A parent owns state and server authority.
- `cards.css`: standalone component styles, with `--fc-paper`, `--fc-ink`, and `--fc-accent` tokens. Typography stays live, selectable text. Native buttons provide keyboard operation.
- `demo-choices.js`: six fixed preset IDs/slots and interpretations matching PC-02/PC-03 at `e529e74c7cbff5e63db7184734f553ae559bb27d`. `demo` names an authored explanation. `concepts.js` retains historical vocabulary and the unavailable blank; its 14 concepts are not submitted by the current UI.
- `onboarding.js` and `onboarding.css`: `mountOnboarding(container, opener)` renders the introduction and returns event-listener cleanup. Pass the How to play button as `opener`; its expanded state tracks visibility. Initial mounting preserves focus. Dismissal focuses `#hand-heading`; reopening focuses `#onboarding-title`. The component stores only a dismissal preference, never game data.
- `presentation.css`: the current pages use its fixed `data-presentation="2d"` style. The earlier dimensional style and `presentation.js` controller remain available as optional reusable design assets; no site toggle or mode-link wiring is active. Old `?view=` links resolve to the fixed interface. Text remains live and selectable.
- `player-wait.js` and `player-wait.css`: `renderPlayerWait(container, localChosen, onSwat)` mounts the saved React `RoomStatus` once per container, using its table layout, traffic-light states, six-cat picker, and cycling `. → .. → ...` marks. The adapter owns only the local avatar preference and maps the study's confirmed contribution into the controlled component. Only confirmation turns the local player green. Mira and Lance remain explicitly illustrative; animation does not imply room polling or peer completion. `headingId` preserves confirmation focus; `avatarAction` supplies Mira's native, keyboard-accessible action.
- `hero-swat.js` and `hero-swat.css`: cancelable decorative cat/hero animation, restore control, reduced-motion fallback, and clipping to prevent horizontal scroll. Reuses the original Lilac SVG; no image generation, uploaded selfie, or Blender processing.
- `mini-demos.js`: `mountMiniDemo(container, conceptId)` returns a cleanup function. Authored, user-stepped explanations; no model calls or ranking.
- `world-scene.js`: `worldSvg('2d' | '3d', contributionCount)` renders the same illustrative geometry. 3D means an axonometric SVG illustration, not a WebGL world or 3D gameplay.
- `assets/world-2d.svg` and `assets/world-3d.svg`: standalone reusable SVGs with original paths, shapes and colors. Up to four acid-yellow markers reflect preview count. No generated raster dependencies.
- `study.js`, `study.css`, and the HTML pages: demonstration composition; replace this local state owner with the accepted room contract during integration.

The conceptual blank card remains visibly unavailable. Inspect, select and confirm are distinct. Source, Forge interpretation and User decision appear in the inspector. Catalog membership never certifies executable support. The hero artwork does not define a concept or game rule.

## Boundaries and handoff

Allowed changes for this integration: `docs/design/pc-04-cards/{player-wait.js,player-wait.css,study.js,hero-swat.js,hero-swat.css,browser-check.mjs,onboarding-check.mjs,hero-swat-check.mjs,README.md,verification.md,verification/**}`, `components/party-forge/{room-status.tsx,room-status.module.css,README.md}`, `tests/room-status.test.mjs`, and `tests/fixtures/party-ui/preview.mjs`. Kahhow owns these assets and component composition; Lance retains shared-contract ownership. No shared app, runtime, API, package or global-style ownership changes. Concurrent planning/gesture edits belong to other work and are excluded. `docs/issues/PC-04.md` remains owned by the coordinating task.

Live integration uses the existing merged PC-03 API from PR #44. No mixed-hand/replacement amendment is required after the user removed that feature. PC-02/05 qualify playable implementations. This local integration uses the existing React/Vite dependencies and the original study's state owner; no new packages. It does not select a new production branch base. The legacy G1–G4 flow and all runtime/scoring/storage contracts are untouched.

Selected skills for the current integration: Next.js and installed client/CSS/public-asset guides for reusing the saved React component; React guidance for controlled rendering; agent-browser, agent-browser-verify and verification for interaction checks. The agent-browser CLI was unavailable, so installed Playwright/Chrome is used as an equivalent. Sites guidance preserves the existing host. No route, publication, or raster generation is needed. Earlier imagegen/OpenAI Docs usage applies only to the historical visual exploration.

Timebox: one focused integration/verification pass. Cut the optional swat first by removing its mount/import and avatarAction. To undo this integration, restore the earlier vanilla adapter and remove the new swat files plus optional component props/table CSS and runner mode; preserve the accepted card study. No production import depends on it. No deployment, GitHub publication, or merge is part of this study.

Acceptance: native keyboard selection and deselection, inspect without accidental selection, separate review/confirm, one-contribution waiting lock, fixed six choices without swap paths, cat states, unavailable blank, fixed hero with no mode control, onboarding dismiss/reopen and tab-session persistence, unchanged selection/waiting after onboarding actions, dialog close/focus, mobile layout, reduced-motion behavior, and no browser console errors.

The repository's merge gates remain `npm run lint`, `npm run build`, `npm test`, independent adversarial complete-diff review, then second lint/build/focused tests after fixes. The study has its own browser checks; fresh results are recorded in `verification.md`. A prototype check is not a production room or full PC-04 acceptance pass.

## Asset provenance

The two PNG explorations were created with the built-in `image_gen.imagegen` tool. Its text result did not expose a selectable or certified GPT-6 model identity. They are design references only; the working interface uses original SVG/CSS/JS authored during this task. See `image-prompts.md` for prompts and references. The user accepted the typography-led direction and requested reusable code assets and an interactive selection study. The latest user decision supersedes the whole-site mode experiment: remove the toggle and static explainer sections, retain hero art, and put the preview introduction in a dismissible component. Dimensional cats remain reusable code-authored SVG artwork derived from the existing avatar identities, not raster generation or exported 3D models; the current page uses the original flat cats.
