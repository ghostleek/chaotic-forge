# Flat player wait states and cat avatars

13 September 2026 · **Design preview, not live room implementation.** Related packet: [PC-04](../issues/PC-04.md). This supplements the open-deck PRD and does not reinstate the older dimension-assigned party plan.

**Accepted and saved:** the user approved this design and requested saving the component. The reusable React implementation, assets, usage contract, isolated fixture, and fresh validation are documented in [RoomStatus](../../components/party-forge/README.md). The original design-pass verification and boundaries below describe the earlier preview, not the later component extraction.

## Provenance and scope

- **Source:** the user-supplied image of Kahhow, Mira, and Lance around a dimensional Forge table. It is a visual reference, not evidence of implemented multiplayer behavior.
- **User decision:** flatten the player presentation; start with several vector 2D cats; use green for chosen, orange for deciding, and red for inactive/unresponsive. Retain a future selfie-to-Blender-style 3D portrait easter egg, starting with the flat version first.
- **Forge interpretation, proposed:** keep each cat's identity stable and express state with a small badge plus explicit text. Use “Away” or “Reconnecting” for red. Add neutral “Watching” and “Up next” when no action is currently due. An avatar ring is an optional visual treatment.
- **Asset provenance:** six original SVG illustrations authored by Codex using vector shapes. No image-generation service, raster tracing, Blender job, or runtime model call was used. The supplied reference informs the player presentation, not copied artwork.
- The inline preview uses simulated named players, local scenarios, and a 900 ms mock confirmation delay. That delay is not measured network latency. Six-player display is a layout exploration, not supported-room evidence.

## Proposed state contract

| Presentation | Meaning | Authority and recovery |
| --- | --- | --- |
| Green · ✓ Chosen | This phase's contribution was accepted | Use confirmed room state, never a local selection or optimistic request. |
| Orange · … Deciding | An eligible player still has a choice to make | Taking time, reading, or an unfocused tab does not make them red. |
| Orange · … Sending | The local confirmation command is pending | Local-only detail; failure/rejection stays unconfirmed and offers recovery. |
| Red · ! Reconnecting / Away | Connectivity failed or an explicit availability state applies | Do not guess a human's attention. Presence and contribution status remain separate. |
| Red · Reconnecting + green ✓ Choice saved | A confirmed player lost connection | Keep their accepted choice, count it, and preserve edit rights. |
| Neutral · Watching | A playing participant has no contribution right this phase | Do not count them as a missing choice. This is not a new spectator role. |
| Neutral · Up next | The second eligible editor is waiting for the first | Follow accepted server edit order; client UI cannot grant rights. |

When the viewer loses connection, show **Room updates paused** and label counts **last known**. Do not turn everyone else's avatar red. No timer is shown until an authority-owned timeout policy exists. The visual does not automatically kick players, discard choices, transfer rights, or start a game.

Count required contributions, not every visible avatar: initially all required participants; during ordered evolution, the winner and loser only. When the first editor finishes, the second becomes Deciding. Keep the roster's order stable instead of sorting people by status.

**Chosen is not Ready to play.** Once an executable version exists, a separate phase shows Loading / Ready to play against that exact build acknowledgment. A complete choice count does not prove generation, successful loading, or permission to start a trial. Never relabel an unplayed build as saved gameplay.

Other players see choice status, not private hovered cards, inspected options, or unconfirmed drafts. The preview shows “Jump quest” only as the local player's selection. Confirmed-card reveal policy remains a separate decision.

## Reusable assets

All six assets have a transparent 128 × 128 viewBox, accessible title/description, and no external resources or scripts. Coat pattern and face distinguish them independently of traffic-light color.

- [Marmalade](./avatars/marmalade.svg): orange tabby.
- [Lilac](./avatars/lilac.svg): lavender, winking face.
- [Tuxedo](./avatars/tuxedo.svg): dark coat, cream muzzle/chest.
- [Cloud](./avatars/cloud.svg): cream, fluffy silhouette.
- [Calico](./avatars/calico.svg): patchwork face and coat.
- [Midnight](./avatars/midnight.svg): navy coat, crescent marking.

Use the illustration as identity and render status separately. Pair color with an icon and readable state text; do not continuously blink or pulse the avatars. Use a restrained live region for meaningful changes, including pending confirmation. Keep native keyboard controls and touch targets.

## Later easter egg

Retain **Meow in 3D** as a proposed secret portrait option inside the avatar picker. A future playful reveal could open a portrait studio from the player's own cat, with a keyboard-equivalent menu action. The trigger is proposed, not a confirmed requirement.

The user could then deliberately choose a selfie and request a 3D-looking portrait. A Blender-style rendered image and a real Blender scene/model are different deliverables; choose and label the actual output before implementation. No selfie collection, upload, camera permission, generation, storage, or Blender integration is included in this pass. Existing cats remain the default fallback.

## Implementation boundary for a later selected packet

- **Observable outcome:** each participant understands who still needs to contribute without confusing connection health, committed choices, or play readiness.
- **Accountable human owner:** Kahhow. **Design implementer:** Codex. **Proposed implementation owner:** Kahhow. **Independent human reviewer:** Lance, per PC-04; this document does not dispatch or assign work. A separate read-only agent reviewed this preview.
- **Current file boundary:** this note, `docs/design/avatars/*.svg`, and the packaged copies in `docs/design/assets/forge-cat-avatars.zip`; the interactive fragment belongs to the task's visualization output. Production routes, global CSS, dependencies, tests, and shared contracts are unchanged.
- **Later allowed PC-04 scope:** `room-status.tsx`, `lobby.tsx`, `card-picker.tsx`, scoped CSS, room client/hook, and focused client tests, as listed in the packet. Lance owns shared protocol/authority changes under PC-01/03.
- **Base/dependencies:** inspected checkout HEAD `2a842d704a0f9a9757a793d6ad7f77282f42f752`. PC-04 records issue #33 and PC-01 PR #41; those remote links/statuses were not freshly verified here. The accepted base for any implementation dispatch must be recorded separately. Current contracts still represent the older kitchen slots and expose only `present | unavailable`; confirmed-choice/presence reconciliation and PC-03 integration are required. The linked card-UX document was absent during this inspection.
- **Skills/capabilities:** visualize for the interactive design; agent-browser guidance for browser checks, with installed Playwright and Chrome as the available equivalent because the agent-browser CLI was missing. Original vector assets require no raster generation. No framework or runtime-model implementation occurred.
- **Timebox/cut:** a single design-preview pass. Future integration needs a fresh estimate after the room contract is reconciled. Cut rings and decorative treatments first; retain text, state separation, and recovery. Roll back this design by removing only this note and these new assets; no runtime rollback is needed.

## Verification performed

- Parsed all six SVGs; checked accessible descriptions and absence of scripts/external resources. Visually inspected at 128 px and 48 px on light and dark backgrounds.
- Rendered the inline fragment and operated it in isolated headless Chrome using Playwright. Verified local Sending → Chosen, the chosen count, avatar switching, saved choice on disconnect, the second editor becoming Deciding, and offline confirmation being disabled.
- Verified six-player counts, ring and badge presentations, dark appearance, reduced-motion setting, and keyboard confirmation. At a 320 px content width, document and root scroll widths both measured 320 px. Inspected desktop/mobile screenshots; no page JavaScript errors occurred on the completed check.
- Independent read-only review found no blockers; its pending-state announcement suggestion was incorporated.
- Playwright's default browser binary was absent; installed Chrome required running outside the shell sandbox. An initial verification-only control probe was unavailable in the rendered iframe; the completed six-player check used a temporary preview copy with presentation state exposed. Those probes are absent from the delivered fragment.
- **Not run:** product lint/build/full tests or live multiplayer acceptance. This is an unmerged design/asset change, not a fresh product quality pass. Before any product merge, run the exact [QUALITY.md](../../QUALITY.md) sequence: `npm run lint`, `npm run build`, `npm test`, independent complete-diff review, then a second lint/build/focused-test run after fixes. Network/storage changes additionally require `npm run test:party`.

Future integration acceptance must cover rejected/stale commands remaining unconfirmed, idempotent retry, authority-driven presence, preserved choices/rights on reconnect, private draft visibility, correct required-player counts, and version-specific Ready acknowledgments. Preview interactions do not establish those runtime guarantees.
