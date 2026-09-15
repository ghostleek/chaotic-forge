# PC-09 supplement — generation inside Chaotic Forge rooms

## Baseline and scope

15 September 2026. **Local, unreleased MVP.** User requested dynamic generation for authenticated three-admin/BYOK access, research for unclear mechanics, a game brief, live logs, and reuse of the existing multiplayer UI. No API key is available this session, so real Agents execution, latency, cost and game quality remain unverified.

Compared against the actual Site: production version 23, deployment `appgdep_6aa8e2f97c2881919b28287fe0a1e142`, source `f151999c8026a5f0a231514525b01f0cd6e62046`. This worktree starts from that source, preserving the newer header, room access, QR invites, confirmation UI, saved Snake replay, Dino/Mario runtime and legacy flows. The earlier standalone prototype on `43520c7` is superseded and must not be deployed over production.

**Observable outcome:** the existing room can submit its confirmed cards to a durable generation job; room members see its saved activity/brief and open the same isolated executable playtest.

**Accountability:** Kahhow owns UX acceptance; Lance owns backend, shared schema and release acceptance. Implementer: Codex. Independent reviewer: review agent, followed by human acceptance. Packet: PC-09 supplement; no new GitHub issue or PR link verified. This does not complete PC-09A's live qualification or PC-09B's scored competitive loop.

## Behavior

- The room's default generation action submits server-read confirmed instructions, including overlapping cards. Clients cannot provide replacement prompt cards or funding identity.
- A participant capability allows room progress/playtest access; only the current host can create/cancel. Paid access uses the separately authenticated ChatGPT identity. Exactly `kahhow@string.sg`, `leekahhow@gmail.com`, `lancetyw@gmail.com` may use operator funding; everyone else needs their stored encrypted key. Trials remain disabled.
- A database INSERT binds the job to the exact room snapshot and digest while reserving existing owner/global quotas and at most one active job per room. Request IDs allow retries without a second generation. Roster/card changes mark old output stale and prevent opening it as the current game. New membership cannot hide the active job's cancel/progress controls.
- Existing game building remains an explicitly selected alternative. It reuses matching saved games or uses the bounded Responses engine. No silent fallback labels a fixed engine as newly generated code.
- The Agents runner requests live web search for unclear references, then a structured brief with mechanics, controls, end conditions, winner, ties, sources, adaptations and per-input playtest checks, followed by executable worker code. A material unsupported reinterpretation must request clarification. Missing/malformed briefs fail rather than loop or promote output.
- Progress polls every few seconds and survives reload/runner recovery. Only fixed activity labels and event timestamps are exposed; command contents, private reasoning, provider session IDs and keys are excluded from shared progress. Times are receipt times. The full brief arrives after the completed provider turn; research-before-code is an instruction, not an independently enforced multi-turn gate.
- R2 retains exact JavaScript. Members receive the same artifact and seed. The trusted renderer, bounded worker messages and watchdog are reused. The iframe has an opaque origin; its srcDoc has an explicit CSP blocking network and the parent app is inaccessible.

## Deliberate limits

The room's generated output is a **shared playtest with local scores**, not an authoritative multiplayer round. Automated smoke checks establish rendering only, not all rules or a completing run. No generated preview enters the existing ranking, winner/loser addition, or game archive contract. Qualification of a bounded replay/scoring adapter is the next integration requirement. Existing competitive games retain their verified runtime and replay paths.

This slice supports initial generation and retries. The runner can reuse the exact accepted parent source and brief through the existing creator remix contract, but that is not yet connected to room winner/loser additions. Do not claim subsequent room remixes are complete.

No model call or deployment occurred. Fixtures show plumbing and isolation, never external/model-produced gameplay. Do not quote fixture elapsed time as generation latency. The existing ten-minute deadline, concurrency/request limits and best-effort token cancellation are not a hard dollar cap; actual provider access and project controls require operator qualification.

## Files, dependencies and release

Allowed implementation area: room generation route/service, existing Lobby and reusable progress panel/styles; existing generation runner/contracts/billing/server; `db/schema.ts` and appended migration `0005_pink_doctor_faustus.sql`; focused unit/browser/Worker tests; this handoff. Lance owns shared backend/schema, Kahhow owns UI. No runtime registry, authoritative scoring, existing archive schema, or legacy domain semantics changed.

Base: exact production `f151999` above, including existing PC-03/05/06 dependencies. Optional dependency: live supervised Agents runner with qualified API access. Without it, generation remains visibly offline and existing games remain available.

Timebox: current MVP session. Cut: preserve public saved play and current multiplayer builder, keep `FORGE_ENABLED=false`, retain the experimental room code for qualification. Rollback: disable generation/revert the feature UI or restore the prior Site version; retain additive migrations and artifacts. Do not drop stored data.

Required gates: `npm run lint`, `npm run build`, `npm test`, independent complete-diff review, second lint/build/focused checks after fixes, `npm run db:generate`, local packaged migration and `npm run test:party`. Local browser verification uses Playwright because the agent-browser CLI was unavailable. Selected guidance: OpenAI docs (installed API/SDK contracts), Sites building/hosting and persistence references (existing host/storage), Next.js route guide (route boundaries), React best practices (component changes), agent-browser (browser verification intent).

## Validation record

Completed locally on 15 September 2026:

- `npm run lint`: passed; repeated after review fixes.
- `npm run build`: passed; repeated after review fixes. Packaged Worker assets, bindings and migrations verified. Existing Vinext dynamic-import warnings remain.
- `env PARTY_TEST_PORT=3217 npm test`: 228 unit tests and 64 desktop/mobile Chrome tests passed (browser portion 3.6 minutes).
- `npm run test:party`: all 8 tests passed (7.0 minutes), including packaged migrations on real local D1, room/owner/CSRF restrictions, immutable shared artifact playtests, reload and Worker restart, overlapping cards, concurrent retry deduplication, stale-result blocking, and cancellation after the third player joins.
- Independent complete-diff review: two room issues found and fixed; follow-up found no new blockers. Reviewer separately ran 16 focused tests successfully.
- `git diff --check`: passed.

Early failures were a missing `cardId` in a new unit fixture, a test clicking before both room snapshots synchronized, and a stale test button label (`Confirm` instead of `Update`). Those fixtures were corrected and the full suites passed. An initial sandboxed unit run could not bind localhost; the approved full run passed outside that restriction.

Required live API execution, generated-game semantic quality, latency/cost and deployed multiplayer acceptance remain unverified. No deployment or merge performed.

Worktree: `/private/tmp/chaotic-forge-room-generation-mvp`, branch `codex/room-generation-mvp`, implementation commit `8995de2` on exact production base `f151999`. A complete recovery patch and this handoff are saved under the original workspace's ignored `outputs/room-generation-mvp/` directory. Apply the patch only to that exact base in a separate checkout. The original dirty working tree was preserved.

## GitHub PR integration

The PR branch incorporates GitHub `main` at `e48bc37` alongside the deployed version-23 history. This retains GitHub's stale pixel-job recovery, current README, sign-in wording and archived assets. The billing conflict keeps the explicit three-email sponsorship policy; configurable IDs or additional configured emails do not grant paid generation. The PR also carries deployed UI/Dino improvements whose commits were not yet on GitHub main. No Site deployment is part of this PR operation.

Post-integration checks: lint and production build passed; 16 focused generation/access/recovery tests passed; all three focused Worker/D1 funding, creator recovery and shared room-generation tests passed (41.9 seconds). Independent integration review found no new merge-specific blockers and separately passed 10 focused tests. Full desktop/mobile and long-running integration suites above are pre-integration evidence; rerun all QUALITY.md gates before merge. PR remains draft pending live qualification.
