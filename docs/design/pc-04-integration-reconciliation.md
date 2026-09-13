# PC-04 integration reconciliation

13 September 2026. User decision: reconcile issue #33 with the mixed-hand card direction, inspect PC-03 and reuse work produced across the existing chats. Human owner Kahhow; implementer Codex; human reviewer Lance. This is a branch-preparation record, not completed live integration or a fresh product quality pass.

## Base and checkout

PC-03 is [merged PR #44](https://github.com/ghostleek/chaotic-forge/pull/44), not an outstanding backend branch. PC-04 uses `codex/pc-04-room-cards` at exact merged main `e529e74c7cbff5e63db7184734f553ae559bb27d`, in `/private/tmp/chaotic-forge-pc04`. This includes the existing PC-01/02/03 and generation-qualification changes on main. The shared working checkout remains on its original main baseline; it was not switched, reset or stashed.

The copied-file inventory and SHA-256 hashes are in [pc-04-carry-manifest.json](./pc-04-carry-manifest.json). These are uncommitted snapshots. The PRD was carried because it records the user's accepted mixed-hand correction and was unchanged between the old tracked base and the new upstream base; copying it did not replace a newer upstream PRD. Unrelated AGENTS/PLAN/packet edits, gesture research, camera code and shared backend/configuration files were excluded.

## What to reuse

| Source | Reuse | Reconciliation |
| --- | --- | --- |
| PC-03 merged backend | Room creation/join/read/commands, scoped capabilities, receipts, revision conflicts, D1 persistence, history and phase authority | Integrate a client with these APIs; do not recreate them or claim deployed acceptance from their recorded local tests. |
| Create typography-heavy game cards | Bounded mixed-hand study, reusable cards, on-demand explainers, fixed hero, flat text/sprites, dismissible onboarding | Port composition into the room client without copying local fixture authority or the removed mode/catalog controls. |
| Add multiplayer wait-state avatars | Controlled React RoomStatus, six SVG cats, animated waiting dots, scoped styles, fixtures and tests | Make this the production status renderer. The task is still integrating it into the study and adding the second-cat swat; capture its final files/checks before committing this snapshot. |
| Find research-ready parallel issues | Gesture/camera experiment | Separate optional PC-10 work; no dependency or code import in PC-04. |

## Contract gaps and adapter boundaries

The merged `initialCardSchema` allows six variants across three unique FPS/Zombies/Cooking slots. `roomCommandSchema` has no hand deal/replacement command; its three addition IDs are also a fixed preset deck. `participantSchema` has `present`/`unavailable` presence and no avatar field. These facts prevent the revised arbitrary mixed hand and swaps from claiming live integration on this base alone.

Lance owns the shared open-deck amendment. PC-04 can implement enrollment, reads, receipt/revision handling, reconnect and phase display against the existing transport. Keep revised hand submission dependent on the accepted amendment; do not map unrelated concepts into the old slots or implement client-only accepted swaps. Any avatar preference remains local unless the protocol explicitly adds shared avatar persistence.

For RoomStatus, map nickname/id from authoritative participants; map `unavailable` to Away. Reconnecting describes the local client's transport state, not an invented remote presence. Only accepted current-phase contributions/edit slots map to Chosen. Pending transport maps to Sending. Derive Watching and Up next from authoritative editor rights/order; the component must not grant those rights. Ready refers to the available executable build and its acknowledged identity, not a chosen card. Decorative hero swatting must not change any of these values and must have restoration and reduced-motion behavior.

The merged service still refreshes the caller's heartbeat before reconciling presence, matching the inherited [expired-host succession review finding](https://github.com/ghostleek/chaotic-forge/pull/44#discussion_r3998867467). Track and test the fix with the backend owner before claiming host-recovery acceptance. This reconciliation does not edit that shared service.

## Ticket and validation status

The reconciled [local PC-04 ticket](../issues/PC-04.md) records the new direction, completed local pieces, real merged dependency and unchecked integration requirements. GitHub publication was attempted but the connector returned 403. Automatic approval review also rejected a browser fallback without explicit approval for that method. The remote issue has not been changed by this task.

Copied files were checked byte-for-byte and hashed. No runtime code was changed by the carry, no dependencies were installed in this checkout, and no old test results are counted as fresh integration checks. Before a PR, re-capture the active avatar task, adapt the actual client, then run QUALITY.md: lint, build, full tests, independent complete-diff review, and post-review lint/build/focused checks; include built-Worker/D1 room tests for network behavior.

Timebox: this reconciliation/preparation pass only; re-estimate remaining client work after the open-deck amendment. Rollback: discard this isolated uncommitted branch snapshot; the source checkout and accepted backend remain intact. No PR, merge, deployment, task cancellation, or other packet assignment occurred.
