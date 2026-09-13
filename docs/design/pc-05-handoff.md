# PC-05 — first-person Kitchen Chaos

Packet [PC-05 / issue #34](https://github.com/ghostleek/chaotic-forge/issues/34). Human accountable owner: Kahhow (@ghostleek). Implementer: Codex. Human reviewer: Lance (@leoendithas), acceptance pending.

Explicit user-approved parent: [PC-04 PR #46](https://github.com/ghostleek/chaotic-forge/pull/46), exact commit `5cce2f1`, branch `codex/pc-04-room-cards`. PC-05 branch: `codex/pc-05-playable-viewport`. Review this incremental diff; merge the parent first, then rebase/revalidate the child. The parent includes accepted PC-02 runtime and merged PC-03 room authority.

Observable outcome: three people (host plus two connected devices) can load the same retained authored game, confirm readiness, start a synchronized 60-second trial, move/aim/cook/repel enemies in a first-person viewport, and submit actual captured inputs for authoritative server scoring. Starting recipe is fixed to Knockback, Pursuers, Quick orders; later additions remain Dinner bell → Hot potato → Zombie pantry.

Files owned by Kahhow: game viewport, HUD/controller, presentation renderer, trial-input capture, scoped CSS, asset/provenance docs. Integration also changes Kahhow's PC-04 lobby and room client for server-clock observation, phase-sensitive polling and submission receipt reporting. Lance's API, schemas, resolver, retained runtime, score engine, persistence and hosting configuration remain unchanged.

One mounted controller owns one runtime and one simulation timer. Timestamped controls are sampled into 3,600 contiguous fixed-step inputs. Rendering consumes snapshots and cannot score or reset the game. Blur/visibility/pointer-lock loss clears held input; the trial clock continues. A completed trace stays with the mounted client and submits within the original transport window. Unknown network outcomes reuse the existing command identity. Refresh before retaining a completed submission cannot restart the active attempt; the host must explicitly abort and prepare a new round ID.

Skills: existing Next.js/client-boundary and installed version guides; React component guidance; browser verification guidance using installed Playwright/Chrome when the agent-browser CLI is unavailable. Procedural canvas art needs no raster-generation capability. No new dependencies.

Validation is intentionally bounded by the user's instruction to skip remaining test suites. Lint/build and an interactive local browser check are the requested implementation checks; no full QUALITY.md pass is claimed. Independent source review is separate from executable acceptance. Before merge, resume exact gates: `npm run lint`, `npm run build`, `npm test`, `npm run test:party`, complete-diff independent review, then second lint/build/focused tests after fixes. Include input/replay, resize, focus loss, reconnect, late submission and lost-trace refresh acceptance.

Timebox: this implementation pass. Cut decorative geometry and effects before control/capture correctness. Rollback: revert PC-05's incremental commit to retain PC-04's room/card UI, leaving all retained runtime resources intact. No deployment or merge requested.
