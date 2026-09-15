# Contextual live-room access

User request, 14 September 2026: remove the global banner and frontend Explore links; offer sign-in/API access when starting a live room.

PC-09 UI follow-up on local production descendant b03246ed8048443928ced530e377c6c223232363 (codex/dino-mario-lives-competition). No GitHub issue or PR verified. Accountable human owner: Kahhow (UX acceptance). Shared-file owner: Lance. Implementer: Codex. Independent reviewer: Codex review subagent.

Outcome: Create room opens contextual access setup; verified admin or saved BYOK status enables the explicit Create live room action. Sign-in/out returns preserve nickname and setup intent. Joining stays anonymous. Global navigation banner is removed and no /explore links remain in app/components; the legacy route remains available directly.

Files: app/layout.tsx, app/page.tsx, components/party-forge/lobby.tsx, room-access.tsx, creation/billing.tsx, tests/browser/room-access.spec.ts, tests/browser/dino-room.spec.ts, tests/browser/forge-starters.spec.ts and this handoff. Backend authorization, CSRF, paid generation policy, executable replay, saved games and Source/Forge interpretation/User decision provenance are unchanged. No schema, dependency or runtime changes. No optional dependencies.

Skills: Sites building/authentication for existing host; Next.js and installed client-boundary guide for routes and client props; React best practices for changed TSX. No capability installation needed.

Checks: QUALITY.md requires lint, production build, full unit/browser tests, independent review and verification after fixes. Lint/build pass; 204 unit tests pass. All 50 desktop/mobile browser tests pass. The initial sandbox blocked localhost listeners; unit and browser suites passed after running with localhost permission. Review found a contextual sign-out return bug, now fixed; final independent review found no actionable issues. Lint, build and full tests passed after the fix. No merge or deployment performed. Timebox: this session. Rollback: revert only the listed UI changes; preserve storage and production game behavior.

## Admin access UI follow-up — 14 September 2026

PC-09 UI follow-up on 571c96d72221678ede8af2a3d5a0b017d136f6d8; no new GitHub issue/PR verified. Owner Kahhow; implementer Codex; independent Codex review found no actionable issues. Lance retains shared-file ownership. Allowed changes: Billing, RoomAccess, their CSS modules, focused browser tests and this record. Outcome: server-recognized admins see no BYOK form; ChatGPT sign-in has primary-button styling and sign-out has outline-button styling in the key action row. Authentication, billing authorization, generated artifacts and replay contracts remain unchanged. No dependencies or schema changes. Sites/React guidance reused. Lint, production build and eight desktop/mobile access checks passed. Full QUALITY.md suite is required before a subsequent merge/release; this follow-up is local and unmerged. Timebox: this session. Rollback: revert only this UI diff.

Public-demo question: current public demo pages are standalone. Joining existing rooms is anonymous, but new-room UI currently requires authenticated admin/BYOK access. No free demo-room flow is introduced by this UI follow-up.
