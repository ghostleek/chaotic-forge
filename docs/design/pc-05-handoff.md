# PC-05 — first-person Kitchen Chaos

Packet [PC-05 / issue #34](https://github.com/ghostleek/chaotic-forge/issues/34). Human accountable owner: Kahhow (@ghostleek). Implementer: Codex. Human reviewer: Lance (@leoendithas), acceptance pending.

Explicit user-approved parent: [PC-04 PR #46](https://github.com/ghostleek/chaotic-forge/pull/46), exact commit `5cce2f1`, branch `codex/pc-04-room-cards`. PC-05 branch: `codex/pc-05-playable-viewport`. PC-04 merged during implementation. PC-05 was rebased onto `1dbccea77d4d2707328c704f1d20be8aabc3b2ac` and now targets main. That base includes PC-02/03 and merged PC-06 saved-game support. Review only the incremental PC-05 diff; all backend changes remain inherited.

Observable outcome: three people (host plus two connected devices) can load the same retained authored game, confirm readiness, start a synchronized 60-second trial, move/aim/cook/repel enemies in a first-person viewport, and submit actual captured inputs for authoritative server scoring. Starting recipe is fixed to Knockback, Pursuers, Quick orders; later additions remain Dinner bell → Hot potato → Zombie pantry.

Files owned by Kahhow: game viewport, HUD/controller, presentation renderer, trial-input capture, scoped CSS, asset/provenance docs. Integration also changes Kahhow's PC-04 lobby and room client for server-clock observation, phase-sensitive polling and submission receipt reporting. Lance's API, schemas, resolver, retained runtime, score engine, persistence and hosting configuration remain unchanged.

One mounted controller owns one runtime and one simulation timer. Timestamped controls are sampled into 3,600 contiguous fixed-step inputs. Rendering consumes snapshots and cannot score or reset the game. Blur/visibility/pointer-lock loss clears held input; the trial clock continues. A completed trace stays with the mounted client and submits within the original transport window. Unknown network outcomes reuse the existing command identity. Refresh before retaining a completed submission cannot restart the active attempt; the host must explicitly abort and prepare a new round ID.

Skills: existing Next.js/client-boundary and installed version guides; React component guidance; browser verification guidance using installed Playwright/Chrome when the agent-browser CLI is unavailable. Procedural canvas art needs no raster-generation capability. No new dependencies.

Validation is intentionally bounded by the user's instruction to skip remaining test suites. Lint/build and an interactive local browser check are the requested implementation checks; no full QUALITY.md pass is claimed. Independent source review is separate from executable acceptance. Before merge, resume exact gates: `npm run lint`, `npm run build`, `npm test`, `npm run test:party`, complete-diff independent review, then second lint/build/focused tests after fixes. Include input/replay, resize, focus loss, reconnect, late submission and lost-trace refresh acceptance.

Timebox: this implementation pass. Cut decorative geometry and effects before control/capture correctness. Rollback: revert PC-05's incremental commit to retain PC-04's room/card UI, leaving all retained runtime resources intact. No deployment or merge requested.

## Recorded checks

Fresh `npm run lint` and `npm run build` both passed on merged base `1dbccea` with Node 24.21.0. Independent source review identified missed-start, old-round receipt and clock-continuity cases; each was corrected. Completed traces remain retryable after clock recalibration.

A local three-context browser preview loaded the same build, accepted readiness, started the real room clock, and displayed actual movement/aiming through the renderer without page errors. The preview was explicitly aborted after the short visual check. It does not establish full-trial scoring, multi-device latency, recovery, or evolved-round acceptance. No automated test suites were run, as requested.
