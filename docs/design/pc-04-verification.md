# PC-04 handoff — 2026-09-13

User decision: cap rooms at **three people total (host plus two connected devices)**. Existing PC-03 membership authority already enforces this cap. The user explicitly stopped further testing before push. This is a draft handoff, not merge readiness.

Scope: `/party` create/join, three fixed cards (Knockback, Pursuers, Quick orders), authoritative confirmation, private tab-scoped recovery, exact-request retry, cat waiting state, retained-build loading, ordered deterministic additions, and provenance. PC-05 still supplies the playable viewport; this interface does not start timed trials or invent player results.

## Checks actually performed

- Production `npm run build`: passed after the main client/review fixes. Subsequent expected-player-count and small presentation/lint edits have not been rebuilt.
- `npm test`: passed with the real Node 24.21.0 runtime; 20 desktop/mobile golden browser cases passed. The later expected-player-count test was added afterward and was not run before the user's stop instruction.
- Focused client/RoomStatus tests: 14 passed at the recorded run, including lost-response identity, stale receipt handling, enrollment storage failure, revoked membership and polling cleanup. The later stopped-client and expected-player-count cases remain unrun.
- Actual local Worker/D1 three-browser UI check: create/join, fixed recipe confirmation, lost-response retry, reload recovery, shared build acknowledgment, onboarding and hero interaction reached successfully. Final mobile overflow assertion failed. A defensive long-text wrapping change is unverified; do not claim mobile acceptance.
- `npm run test:party`: local persistence test passed. Room integration was interrupted at the user's request on the final run. An earlier attempt failed with a transport fetch error; no full party gate pass is claimed.
- Full lint surfaced test-registration promise diagnostics and an undefined process PID check. Mechanical fixes add explicit `void` to existing test registrations (no assertion changes) and guard the PID. The last outstanding nested registration was fixed after the last lint run; final lint remains unverified.
- Independent adversarial review examined client, storage/retry lifecycle, readiness, membership recovery, avatars, expected room size and mechanical shared-test fixes. Reported blockers were addressed. Review explicitly does not waive the unfinished gates or PC-05 dependency.

These are authored automated local checks, not external playtest or deployed multiplayer evidence. No merge/deployment performed. Keep issue #33 open until remaining acceptance is reconciled and complete.

## Ownership and rollback

Kahhow is accountable; Codex implemented; Lance is the human reviewer (acceptance pending). Base is merged PC-03 PR #44 at e529e74c7cbff5e63db7184734f553ae559bb27d. Shared API/contracts/runtime/storage/hosting remain unchanged. Necessary shared gate repairs are limited to explicit test-registration promise handling in existing test files and the process PID guard in scripts/party-host-process.mjs.

Revert scoped party UI/client/routes/assets together to cut this feature. Preserve accepted PC-01–03 contracts and legacy G1–G4 behavior. Resume exact QUALITY.md gates before merge.
