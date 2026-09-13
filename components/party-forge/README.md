# RoomStatus

Saved from the user-approved flat cat-avatar interaction on 13 September 2026. Import `RoomStatus` from `./room-status`; its scoped stylesheet is imported automatically. The six SVGs are served from `public/party-forge/avatars/`.

This is a reusable, controlled component. A client parent owns room snapshots, local drafts, pending commands, errors, and avatar choices. It does not connect to a room, mark requests successful, or start a game.

```tsx
<RoomStatus
  participants={participants}
  localParticipantId={myParticipantId}
  roundNumber={roundNumber}
  phase="initial"
  connection={roomConnection}
  indicator="badge"
  selection={{
    label: selectedCardLabel,
    submitting: isSubmitting,
    error: confirmationError,
    onConfirm: confirmSelectedCard,
  }}
  onAvatarChange={chooseAvatar}
/>
```

The imported `RoomStatusProps`, `RoomStatusParticipant`, and `CatAvatarId` types describe the inputs. Callback props must come from a client parent. Optional `selection` and `onAvatarChange` omit the corresponding controls when absent. `indicator="ring"` adds the alternative colored outline.

The card-table study imports this same component through a small React bridge. `layout="table"` places the introduction beside the roster; `headingId` allows its parent to focus the heading after confirmation. Optional `avatarAction={{ participantId, label, disabled, onActivate }}` wraps that participant's avatar in a native button. The parent owns the action, eligibility and decorative animation; it does not change player status. Run `node tests/fixtures/party-ui/preview.mjs --table` and open `http://127.0.0.1:4319/play.html` to view the integrated study. Confirm a local card, then tap Mira to try the reversible hero swat.

Each participant provides a stable unique `id`, `name`, one of the six avatar IDs, `presence` (`present`, `away`, or `reconnecting`), and current-phase `contribution` (`deciding`, `chosen`, `watching`, or `up-next`). Preserve server roster order. These are presentation inputs, not a replacement for the shared wire protocol.

- Map only accepted current-phase contributions to `chosen`. Clicking Confirm calls the parent; it cannot turn the player green. Set pending state in the parent while sending an idempotent command, then update from the authority's response. Rejection remains unconfirmed and can display a retry error.
- Keep presence separate from contribution. A disconnected chosen player stays in the confirmed count and shows “Choice saved.” Slow thinking and an unfocused tab do not imply absence.
- Only supply the viewer's selected card. Draft labels and stale errors are hidden after confirmation; this component does not certify a draft as the accepted card.
- `watching` is excluded from the required count; `up-next` is included but cannot confirm yet. The parent must enforce actual edit eligibility and order.
- `connection="reconnecting"` marks the displayed room state as last known and disables confirmation without inventing peer disconnections.
- Chosen is distinct from executable-build Ready. This component covers the choice phase only. There are no timers, model calls, selfie uploads, accounts, or persistence.

Waiting indicators cycle **. → .. → ...** every 1.5 seconds using CSS. Deciding, sending, and reconnecting avatar badges animate; the sending/reconnecting button and active waiting footer use the same dots. Confirmed, away, watching, and next-editor marks stay static. When room updates are paused, peer marks freeze while the viewer's reconnect indicator continues. Dots reserve their full width, are hidden from assistive technology, and become static **...** with reduced motion. This indicates waiting, not a successful poll or newly confirmed room state.

## Isolated preview

From the repository root, run `node tests/fixtures/party-ui/preview.mjs`, then open `http://127.0.0.1:4319/`. It builds the actual React component and CSS into a temporary directory and serves only a labeled fixture. Stop with Ctrl+C to remove that output. The fixture uses the installed Vinext image shim, matching the application build. It requires no new packages or shared build configuration.

The fixture lets you switch scenarios, three/six players, badge/ring, and cats. Confirm enters a pending state; separate **Simulate room acceptance/rejection** controls demonstrate parent-owned responses. The product component contains none of this simulation.

Run focused behavioral checks with `node --test --experimental-strip-types tests/room-status.test.mjs`. They compile the actual TSX/CSS through Vite and render with React; no component or image replacement is mocked.

## Scope and handoff

Related packet: PC-04. Human accountable owner: Kahhow; implementer: Codex; human reviewer: Lance. An independent read-only agent reviewed this extraction and its fixes. Local PC-04 documentation records issue #33 and PC-01 PR #41; remote status was not freshly checked in this save request. Inspected base: `2a842d704a0f9a9757a793d6ad7f77282f42f752`.

Allowed files for this extraction: `components/party-forge/room-status.tsx`, its CSS module and this README; `public/party-forge/avatars/*.svg`; `tests/room-status.test.mjs`; `tests/fixtures/party-ui/**`; and the related design note. Kahhow owns component integration. No shared protocol/API, global CSS, route composition, package, or hosting files are changed. Lance retains shared contract ownership. The legacy G1–G4 behavior and Source / Forge interpretation / User decision provenance remain unchanged.

The component is saved independently of live integration. The live lobby must map PC-03's accepted choices/presence into these controlled props. The user dropped mixed-hand dealing/swaps; no open-deck amendment is required for the six-option preset scope. Shared avatar persistence is not part of the existing protocol. No implicit moving parent branch is approved by this extraction. Six-player layout does not qualify six-player gameplay. This work neither publishes a route nor completes PC-04.

Skills applied: Next.js plus installed client-boundary/CSS/public-asset guides; React guidance for controlled state and accessible rendering; browser-verification guidance with Playwright/Chrome because agent-browser is unavailable. Existing Sites guidance was inspected to preserve the host; saving this component does not publish the site. No raster generation was needed because the accepted SVGs were reused.

Timebox: one component extraction and verification pass. Cut the optional ring or picker first. Rollback removes these new component/assets/fixture/test files as a unit; there are no production imports or runtime migrations to undo. The selfie-to-3D easter egg remains in the [design note](../../docs/design/pc-04-player-wait-states.md).

## Verification recorded on 13 September 2026

- Application production build passed; compiled component fixture also passed.
- `npm test`: 58 Node checks and all 20 desktop/mobile golden-flow browser tests passed before the final additional regression. Post-review focused tests: **7 passed**.
- Scoped lint passed for all new TypeScript and JavaScript files.
- Full `npm run lint` remains blocked by existing missing `drizzle-kit`/`drizzle-orm` declarations and Promise/process typing errors in unrelated files. These are not waived or repaired by this component save.
- Actual component browser checks passed for keyboard confirmation; pending, rejection, retry and acceptance; hidden stale draft; avatar callbacks; saved choices during disconnect; editor transition; offline confirmation; six players; 320 px content; 32-character name wrapping; compiled light/dark colors; and reduced-motion settings. Final check had no console/page errors. Browser fixtures are local evidence, not live multiplayer acceptance.
- Independent review findings about stale confirmed drafts and long-name wrapping were fixed and re-reviewed. Browser inspection additionally caught CSS color lowering in the standalone build; declaring the component's color scheme fixed it and computed colors were checked.

Before any merge, satisfy the exact [QUALITY.md](../../QUALITY.md) gates, including full lint, build, tests, independent complete-diff review and post-review checks. This save is unmerged and does not claim a complete repository quality pass while full lint fails.

### Cycling dots follow-up

The user requested animated ellipses for wait/loading feedback. Browser checks sampled **1, 2, 3, 1** visible dots over a 1.5-second cycle, each at the same 16 px badge width. Live-region text stayed unchanged. Confirmation removed that player's animation; a paused viewer froze peer marks; all-chosen removed waiting dots. The reduced-motion setting disabled animation and showed three static dots. Six players fit 320 px content without overflow, and the browser reported no errors.

Fresh checks for this follow-up: application build passed; all **59 Node tests and 20 golden-flow browser tests passed**; the seven focused component checks and scoped lint passed; independent review found no actionable issues. Full lint still reports the unrelated missing Drizzle declarations and existing typing errors described above. This is CSS presentation feedback, not observed network activity, and no live-room integration or merge occurred.
