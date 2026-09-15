# Usability follow-up — 14 September 2026

User-authorized PC-04/PC-09/PC-12 UI follow-up: fix the seven audited usability findings, unify the header as a component, and add a QR-code invite modal alongside prominent copying. No new GitHub issue or PR verified.

Outcome: a host can find setup immediately, share a copyable or scannable invitation, and distinguish joined players from confirmed instructions. Initial and later-round starters remain distinct. Help is available on demand; party, public demos and creator use the same header.

Accountable human owner: Kahhow. Implementer: Codex. Reviewer: Lance, pending independent acceptance (no review requested or assigned externally). Shared-file owner: Lance, including package.json/lockfile; qrcode.react is the new browser-side encoder and jsqr is a test-only decoder.

Base: 571c96d72221678ede8af2a3d5a0b017d136f6d8, a local production descendant in codex/dino-mario-lives-competition, plus its existing uncommitted admin-access UI follow-up. Those existing changes were copied without modifying the original checkout. Work branch: codex/usability-invites, isolated at /private/tmp/chaotic-forge-usability. The user subsequently authorized deployment. Release preparation is on codex/usability-release at /private/tmp/chaotic-forge-usability-release, based on current production 51e6419da1e19daa5d991b61bc35adc0e1a1a737. Latest animated pterodactyls, growth, score beam and pause fixes are preserved; the only textual merge conflict was the Dino imports.

Allowed files: home/party/creator page composition, components/party-forge header/invite/lobby/cards/status/billing/public-demo presentation and scoped CSS, instruction-starter stage metadata, package manifest/lockfile for QR support, focused browser/status tests, and this handoff. Preserve server identity and funding authorization, CSRF, participant capabilities, room protocol, deterministic executable replay, stored games, historical runtimes, and Source / Forge interpretation / User decision provenance. No schema migration or paid generation.

Dependencies: existing PC-03/05/06 rooms, runtime and archives in the explicit base. No optional backend dependencies. QR generation is local and embeds only the public room join URL; it does not use a third-party QR service. Clipboard denial exposes a selectable URL. The QR modal reuses the existing Base UI dialog through components/ui/dialog.

Selected skills: Sites building (existing host), Next.js plus installed client-boundary documentation (shared route/header composition), shadcn (existing accessible dialog), React best practices (multiple TSX edits), agent-browser / browser verification / full-flow verification (desktop/mobile flow checks). agent-browser CLI is unavailable; existing Playwright behavioral tests and Codex browser controls provide the equivalent verification.

Acceptance: copy success and denied clipboard fallback; decode the rendered QR and join with a separate browser; Escape/Close and focus return; readable desktop/mobile starter titles; no later-round modifiers in initial choices; both eligible editors can select later modifiers; explicit readiness counts; no automatic onboarding after navigation; compact eligible funding setup; visible keyboard shortcuts; consistent home navigation on party/demo/creator.

QUALITY.md gates: npm run lint; npm run build (through Sites build helper); npm test; independent adversarial review; post-review lint/build/focused tests. Fresh results are recorded below. Tests use local fixtures for funding and real local Worker/D1 enrollment; no external-player or paid-generation evidence is claimed.

Timebox: this usability session. Cut/rollback: revert this UI patch and QR dependencies as a unit; keep the original production branch and all saved data. Deployment, if later authorized, can roll back the Site version without dropping data.

## Fresh validation

- `npm run lint`: passed on the final source and tests.
- `npm run build`: passed; Worker entrypoint, assets, Site identity, DB binding and packaged migrations verified.
- `npm test`: passed, 205 unit tests and 54 desktop/mobile Chrome browser checks (final full browser run: 3.1 minutes).
- Actual rendered QR decoded to the exact local join URL; a separate browser enrolled successfully. Clipboard success/denial, modal Escape/Close and focus return passed in both viewport profiles.
- Both-player authored gameplay and subsequent starter-based additions passed, alongside the retained G1–G4 golden flow. Funding was a labelled test fixture; enrollment and gameplay used the built local Worker.
- Desktop/mobile QR and starter screenshots inspected under `outputs/usability/`; home preview and current shared header inspected in the Codex browser. Starter names remain intact; the invite button is prominent and the modal fits the narrow viewport.
- First full browser run found eight outdated test expectations for automatic walkthrough opening and always-visible key settings. Updated them to exercise explicit help opening and collapsed settings; the final full run above supersedes that failure. No behavioral coverage was removed.
- Self-review fixed a header selector that could also style nested walkthrough controls. The successful final build and full suite include that fix.
- `git diff --check`: passed.

Independent adversarial review is still pending and required before merge; this is not a claim that all merge gates have been fulfilled. No merge or deployment performed. The local preview is http://127.0.0.1:5187/.

## Deployment retry — 15 September 2026

Combined latest production with the usability changes in an isolated release checkout. Fresh lint and production build passed. Full npm test passed: 216 unit tests and 60 desktop/mobile browser checks. git diff --check passed. Independent reviewer authorization remains pending; no remote push or deployment has occurred in this retry.

Real local Worker/D1 integration gate (`npm run test:party`) passed all 7 tests in 6.3 minutes, including authenticated BYOK isolation, generated worker isolation, archive replay, revision races, timed room evolution and restart recovery. All pre-review checks are complete. No production change was made; independent adversarial review and post-review checks remain.

## User release decision

The user explicitly instructed “No, just deploy first” on 15 September 2026. Independent review and post-review gates are deferred by that decision. The tested release is authorized for production deployment with the existing public audience and data preserved.

Final integration preserves production 5b8557e053267a13ec6e684fc956d08eb842def1 (random hazards, meteor waves and skeleton deaths). Fresh lint/build, all 221 unit checks and 28 targeted Dino/usability desktop/mobile browser checks passed after the clean merge. Earlier complete browser and Worker/D1 gates above remain the validation for unchanged room/backend flows. The first unit retry lacked sandbox loopback permission; its replay test passed when rerun with the required local-server access.
