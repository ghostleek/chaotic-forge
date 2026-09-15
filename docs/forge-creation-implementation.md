# PC-09 protected creator implementation

13 September 2026. Implements the approved standalone showcase/creator supplement. This is not completion of the online party integration or live API qualification.

The BYOK deployment amendment below supersedes the original code-only access and cookie ownership setup.

## What runs

- `/play/snake-space-invaders`: public authored 2D game, with snake growth, fleet/projectiles, collision, win/loss, local score, pause and restart. No API or code required.
- `/forge/create`: access-code unlock, supported concept selection, asynchronous job history, cancel, retained preview, human acceptance, and additive remix of accepted builds.
- `/api/forge/**`: D1-backed authorization and jobs; R2 stores exact generated JavaScript. The OpenAI key is held by the separate operator runner, never the browser or generated environment.
- `npm run forge:runner`: official OpenAI SDK 7.15.0, `beta.agents.sessions.create`, model `gpt-6-astra`, `openai_hosted`. Polls turns and retrieves the exact completed-turn `game.js` artifact. No automatic create retry. Ambiguous requests reconcile against provider metadata; unresolvable jobs remain held instead of being billed twice.

**Source:** [Agents API quickstart](https://developers.openai.com/api/docs/guides/agents-api/quickstart), [session lifecycle](https://developers.openai.com/api/docs/guides/agents-api/sessions), and installed SDK types. **User decision:** code-protected creation with freely playable Snake–Space Invaders demo. **Forge interpretation:** bounded experimental worker games, desktop input, manual gameplay acceptance after independent smoke checks.

## Review-driven changes to the proposal

Arbitrary generated HTML is not executed. The model writes an actual executable Web Worker game; Forge owns the fixed canvas renderer and controls. This still generates gameplay code, not a model description over the authored demo. The worker receives reset/step/input messages and returns bounded rectangle snapshots. It has no DOM, window or navigation. A trusted response has CSP sandboxing into an opaque origin, denies network, and allows a blob worker. A 1.5-second watchdog terminates nonresponding code. No generated code executes in Node or the room Worker. The retained exact source is used for later remix.

The initial independent validator proves start, frames and rendered change only. It does not establish every mechanic or a completing run. Therefore it produces an **experimental preview**, not an automatically accepted build. After playing, the creator explicitly confirms each mechanic and a completing run. The app records these as **User decision** evidence before allowing additive remix. This is not an automated PC-09A benchmark or authoritative multiplayer scoring.

The opt-in legacy-code mode uses a private HttpOnly cookie retained for 30 days; creation authorization expires after two hours. Lock revokes authorization while preserving ownership, and re-entering the code restores that browser's saved builds. Code rotation revokes old authorization while retaining the browser's ownership handle. Clearing cookies or using another browser does not recover private builds; this slice deliberately has no account/recovery system. It does not claim the full party archive/share contract.

## Setup

1. Apply generated migrations `drizzle/0001_dear_mulholland_black.sql` through the existing Sites workflow. Logical storage bindings are `DB` and `FORGE_ARTIFACTS`. For local built-host tests, `npm run db:migrate:local` uses the packaged migrations.
2. Configure the server values in [forge-environment.example](./forge-environment.example). Generate a high-entropy creator code and pipe it to `node scripts/forge/setup-code.mjs` to obtain its hash without putting the code in command arguments. Configure secrets using the hosting platform; never commit the code, runner secret or API key.
3. On a trusted operator machine or supervised runner, configure `OPENAI_API_KEY`, `FORGE_ORIGIN`, and `FORGE_RUNNER_SECRET`. The application key needs Agents read/write and Responses write. Install Chrome for Playwright. Set project spending controls before setting `FORGE_BUDGET_ACK=configured`.
4. Start `npm run forge:runner` under a process supervisor. It consumes the durable D1 queue over the protected runner endpoint; it is not a background promise in a Site HTTP request.
5. Enable `FORGE_ENABLED=true` only after actual API access, worker execution and budget controls are qualified. A recent runner heartbeat and configured R2 are required for submissions. The public demo works while creation is disabled.

Limits: two active jobs globally, one per browser creator, three requests per creator/hour, configured global daily request ceiling (example 5), ten-minute job deadline, and best-effort cancellation above 80,000 observed tokens. The current SDK does not expose a per-session hard dollar/token request cap; polling/cancellation and the acknowledgement flag do **not** guarantee a billing ceiling. Project controls, supervision and live cost qualification remain required. Failed and canceled submissions count toward request quotas.

Recovery: restarting the runner retrieves persisted provider sessions. For a create whose response was lost, it searches at most 1,000 recent sessions for the exact job metadata and does not resubmit if absent. Such a job may need operator investigation, including confirmation of upstream cancellation. Lease expiry is not proof the provider stopped. Rotate the runner secret to revoke its service access. Disabling creation cancels queued jobs and requests cancellation of active work when the runner next processes them; retain the public demo and stored builds.

## Ownership, scope and quality

Packet: PC-09 standalone supplement. Local PC-09 records issue #38; no GitHub publication, assignment, PR or merge was performed here. Observed base: `2a842d704a0f9a9757a793d6ad7f77282f42f752` plus the user's existing uncommitted planning/design work. Implementer: Codex in this task. Proposed human accountable owner: Lance for server/runner/storage; Kahhow for UI/demo. Opposite owner reviews their lane; an independent review agent reviewed this implementation and fixes.

New file boundaries: `lib/party-forge/generation/**`, `components/party-forge/creation/**`, `/forge/create`, `/play/snake-space-invaders`, `/api/forge/[...path]`, `scripts/forge/**`, and focused tests/fixtures. Shared changes: homepage entry, database schema/migration, logical R2 binding, official SDK dependency, built-host test R2/config support and test selection. Lance retains shared-file ownership. Two existing test files now explicitly ignore node:test registration promises and one design-check sort has an explicit comparator to satisfy the current lint gate; their behavioral assertions are unchanged.

Preserved: G1–G4 one-rule experiments, existing party v1 semantics, Source/Forge interpretation/User decision, authored-vs-generated disclosure. The standalone creator does not grant room edit rights and does not claim multiplayer score validation. No broad reference corpus, account system, generic editor, camera or live image generation added.

Timebox/cut follows the approved plan: if live qualification fails, keep `FORGE_ENABLED=false`, retain public authored play and accepted bytes. Full party generation remains dependent on PC-09A qualification plus accepted PC-02/03/05/06/07/08 and the shared runtime amendment. No host migration or production release was performed by this coding turn.

Validation evidence is reported in the task handoff. Required commands: `npm run lint`, `npm run build`, `npm test`, `npm run test:party`, independent complete-diff review, then lint/build/focused tests after fixes. Fixture API responses and fixture worker outputs are explicitly labeled test evidence; no live GPT-6 run is claimed without an application key and actual run records.

## Verification completed in this coding turn

- `npm run lint`: passed after fixes.
- `npm run build`: passed; built Worker, browser assets, bindings and packaged migrations verified.
- `FORGE_TEST_PORT=3210 npm test`: passed, 99 unit tests and 52 desktop/mobile browser tests. The isolated port avoids an existing listener; existing-server reuse stayed disabled. An earlier concurrent/rebuilt run was invalidated and was not used as the final pass.
- `npm run test:party`: passed, 4 real local Worker/storage and browser-isolation tests, including legacy host durability, creator authorization/races, saved R2 preview/acceptance/replay, lock/unlock ownership, blocked DOM/window/network access and hung-worker termination.
- Focused demo tests after pause fixes: 4 passed. Focused generation/runtime unit checks: 7 passed.
- Independent adversarial review and final fix/config re-review: no unresolved actionable findings.
- Local visual inspection at `/play/snake-space-invaders`: page rendered correctly and no page errors observed. Installed Playwright/Chrome was the available equivalent to the unavailable agent-browser CLI.

No OpenAI application key was present in this task's runtime. No live API job, actual generated-game benchmark, production secret configuration, deployment or merge was performed. A live initial build plus two additive remixes, actual costs/timing and full party acceptance remain unqualified.

## BYOK deployment amendment

**User decision:** sign in through ChatGPT; require each user’s own API key except for owner-whitelisted trials. This supersedes code-only access and browser-cookie ownership for deployed creation. It adds scoped creator identity, not a general account system or room authority. Sites dispatch owns sign-in/sign-out and strips caller-supplied identity headers. Do not expose the Worker behind an alternative proxy that trusts these headers from clients. The authored demo remains public.

The stable site-specific signed-in ID owns saved games, CSRF tokens, encrypted keys and trial grants. ChatGPT sign-in authenticates identity; it does not grant API credits or authorize sponsored use. The page displays a trial ID to share with the owner. Configure the owner's exact ID in `FORGE_ADMIN_USER_IDS` before whitelist controls appear. Owner grants default to three lifetime submitted jobs and seven days; failed/canceled jobs consume slots, renewals preserve prior usage. Trial admission reserves a slot atomically. Remaining trial credit is used first, then BYOK. Grants have maximum twenty jobs/thirty days. Revocation cancels queued work and requests upstream cancellation of active work.

Keys are AES-256-GCM encrypted with fresh nonces and owner-bound authenticated data, using a separate server secret. They are never returned to the browser, put in browser storage, logged, or given to generated gameplay. Only the bearer-protected trusted runner receives a decrypted key for its claimed job. The runner is a trusted credential processor; this is not a client-only key scheme. A job snapshots its key so editing a saved key does not change recovery ownership or project. Removing a key deletes saved credentials and cancels outstanding BYOK jobs; queued job ciphertext is deleted immediately, active ciphertext remains until provider cancellation/terminal settlement. Terminal jobs clear ciphertext. Changing the encryption secret without retaining the old secret makes saved/active keys unrecoverable; drain jobs and require key replacement before rotation.

Apply migration `0002_tense_the_fury.sql` in addition to 0001. Set the new values in `forge-environment.example` as server-only configuration. Keep `FORGE_TRIAL_ENABLED=false` until the supervised runner has an operator key and sponsored spending controls. BYOK-only runners do not require an operator OpenAI key. Keep `FORGE_ENABLED=false` until the runner and real API execution have been qualified. The public demo and sign-in page can ship while creation is disabled. Local fixture identity/API tests do not prove deployed dispatch authentication or live generation.

Implementation owner: Lance (server, secrets, runner, shared schema); UI owner: Kahhow. Implementer: Codex. Reviewer: independent review agent plus human owner acceptance. Scope remains the standalone PC-09 supplement; no verified new GitHub issue/PR link or merge. Rollback: disable creation/trials and redeploy the prior version; preserve migrations, saved artifacts and active recovery credentials. Existing legacy behavior tests remain required, with explicit `legacy-code` test configuration.

## BYOK verification

Current addition: lint and production build passed; complete `npm test` passed (101 unit and 52 browser tests); final storage/isolation suite passed (5 real local Worker tests); focused unit checks passed (9). Independent adversarial review findings were fixed and re-review found no unresolved actionable findings. Earlier failing integration runs were superseded by the final pass. This is local fixture evidence; deployed identity and live API calls remain separate qualification.

Deployment was intentionally not performed: the Site source branch contains a newer party/pixel implementation than this checkout. Publishing the older checkout would replace that runtime. Integrate this supplement into the current Site source before deployment, preserve its party endpoints and migrations, and apply the BYOK policy to any other live generation path before enabling production creation. No production environment values were changed. Owner-ID bootstrap and supervised runner/API qualification remain pending.

## Production integration superseding earlier local-only notes

The release is integrated on Site source d766b394958dd6518d664b04e5f41cd00a2bca9f in /tmp/forge-prod. Existing party lobby, APIs, schemas and historical executables remain. New schema is append-only migration 0004, not the earlier checkout's 0001/0002. The mechanic lab is available at /explore. Per latest user instruction, sponsored trial grants are disabled; only authenticated configured admin emails can use the site key. Production config names kahhow@string.sg, leekahhow@gmail.com and lancetyw@gmail.com and removes the ID allowlist. Existing Responses-based party generation now checks BYOK/admin access before spending. Agents code generation remains disabled without a supervised runner. A synchronous Responses request already submitted may finish after key removal. A unique claimed recipe, not a duplicate submit, consumes the pixel daily quota.
