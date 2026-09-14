# Contextual live-room access

User request, 14 September 2026: remove the global banner and frontend Explore links; offer sign-in/API access when starting a live room.

PC-09 UI follow-up on local production descendant b03246ed8048443928ced530e377c6c223232363 (codex/dino-mario-lives-competition). No GitHub issue or PR verified. Accountable human owner: Kahhow (UX acceptance). Shared-file owner: Lance. Implementer: Codex. Independent reviewer: Codex review subagent.

Outcome: Create room opens contextual access setup; verified admin or saved BYOK status enables the explicit Create live room action. Sign-in/out returns preserve nickname and setup intent. Joining stays anonymous. Global navigation banner is removed and no /explore links remain in app/components; the legacy route remains available directly.

Files: app/layout.tsx, app/page.tsx, components/party-forge/lobby.tsx, room-access.tsx, creation/billing.tsx, tests/browser/room-access.spec.ts, tests/browser/dino-room.spec.ts, tests/browser/forge-starters.spec.ts and this handoff. Backend authorization, CSRF, paid generation policy, executable replay, saved games and Source/Forge interpretation/User decision provenance are unchanged. No schema, dependency or runtime changes. No optional dependencies.

Skills: Sites building/authentication for existing host; Next.js and installed client-boundary guide for routes and client props; React best practices for changed TSX. No capability installation needed.

Checks: QUALITY.md requires lint, production build, full unit/browser tests, independent review and verification after fixes. Lint/build pass; 204 unit tests pass. All 50 desktop/mobile browser tests pass. The initial sandbox blocked localhost listeners; unit and browser suites passed after running with localhost permission. Review found a contextual sign-out return bug, now fixed; final independent review found no actionable issues. Lint, build and full tests passed after the fix. No merge or deployment performed. Timebox: this session. Rollback: revert only the listed UI changes; preserve storage and production game behavior.
