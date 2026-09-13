# PC-09A generation qualification

**Status, 2026-09-13:** offline preparation; live qualification is incomplete. No Agents API generation, generated playable artifact, latency measurement, actual API charge, or successful generated-game score validation is claimed.

Issue: [PC-09 / #38](https://github.com/ghostleek/chaotic-forge/issues/38). Owner: Lance. Branch: `codex/pc-09a-generation-qualification`. Accepted parent: merged [PC-01 PR #41](https://github.com/ghostleek/chaotic-forge/pull/41), exact merge/base SHA `2a842d704a0f9a9757a793d6ad7f77282f42f752`. PC-02 is not a dependency of this preparation and none of its unaccepted changes are included. Existing deployed Site access was unverified in the parent evidence; this work does not resolve that.

The user authorized starting PC-09A while PC-02 finishes and supplied a local environment-file path. A read-only Agents session-list request returned HTTP 200 with a valid empty list on 2026-09-13 (request ID `req_926eb523e6bf4977bd1e677c89c45768`). This verifies read access only; no model request was made. Write, model inference and sandbox access remain unverified, and the benchmark spend limit is pending.

## Findings that affect integration

1. The accepted `party-forge/1` schema is intentionally specific to the demo: its initial and additive cards are closed enums, `catalogVersion` is fixed to `kitchen-chaos/1`, contribution history allows at most six entries, and validation supports at most six contribution witnesses. A novel conveyor-cooking choice and two complete two-card remixes cannot fit that schema. A generated-origin field alone does not solve this.
2. This spike uses `party-forge-qualification/1`, explicitly outside product room/archive acceptance. It shares the accepted input-frame bounds, 60 Hz/3,600-tick policy, and orders/failures rubric, but its runtime interface is an experimental adapter, not the accepted `PartyRuntime` interface. A general versioned card/contribution contract and adapter require an explicit shared-file handoff before PC-09B. No production enum, runtime, room, or saved game is changed here.
3. Current official session creation has no documented caller-configurable per-job dollar, token, or duration cap. The presence of a budget-related error code is not a public budget-setting API. Closing a stream also does not cancel its task. A cancellation watchdog is necessary but cannot guarantee a final invoice ceiling. [Session request reference](https://developers.openai.com/api/reference/resources/beta/subresources/agents/subresources/sessions/methods/create), [session lifecycle](https://developers.openai.com/api/docs/guides/agents-api/sessions)
4. API-hosted code construction, browser gameplay containment, and independent bounded score execution are separate capabilities. The local authored browser probe covers particular browser boundaries; no production CPU/memory enforcement, generated-code scorer, or hosted artifact player is qualified by it.

## What is runnable now

- `lib/party-forge/generation/benchmark.ts`: immutable cumulative scenarios, explicit provenance, replay policy, witness criteria, prompt construction, and strict planning budgets.
- `candidate.ts`: bounded JSON/UTF-8 intake, exact-byte artifact/source hashes, full tick traces, parent hash/stage checks and complete witness-proposal coverage. It never imports or evaluates submitted source. A successful intake means **structurally valid and unverified**, not playable, generated, secure, or accepted.
- `preflight.ts` and `access-probe.ts`: secret-free readiness report and an optional read-only Agents session-list request. An empty valid list establishes read access only. It does not establish write, inference, chosen model, or sandbox access.
- `cli.ts`: offline plan/initial prompt preparation, candidate inspection, and remix request preparation with the exact retained parent JSON. Existing output files/directories are not overwritten.
- `tests/integration/party-generation.isolation.mjs`: authored Chrome boundary probe, explicitly separate from actual generated-game evidence.

There is no paid session creation, promotion to a room, automatic retry, generated-code execution command, or deployment in this change. Those parts require the live prerequisites and an accepted bounded execution path. This avoids installing an SDK or editing PC-02's package/configuration while the API path is still being qualified.

Use Node 24.x and the existing installed dependencies. The repository's standard unit command discovers `tests/party-generation.test.mjs`. Run the additional qualification checks explicitly:

```sh
node lib/party-forge/generation/cli.ts preflight
# Exit 2 is expected until live prerequisites are available.

node --test --experimental-strip-types tests/party-generation.test.mjs tests/integration/party-generation.intake.mjs
node --test tests/integration/party-generation.isolation.mjs

# Optional authenticated READ only, after configuring a local environment file:
node --env-file=/absolute/path/to/private.env lib/party-forge/generation/cli.ts probe-access
```

No key value belongs in a prompt, bundle, output report, command argument, commit, browser, or sandbox. The documented application key needs `api.agents.read`, `api.agents.write`, and `api.responses.write` for the full live workflow. The read probe calls only `GET /v1/agents/sessions?limit=1&order=desc`, uses `OpenAI-Beta: agents=v1`, refuses redirects, and records only status/request ID/shape/count. It does not retain unrelated session contents. [Quickstart](https://developers.openai.com/api/docs/guides/agents-api/quickstart), [session list](https://developers.openai.com/api/reference/resources/beta/subresources/agents/subresources/sessions/methods/list)

## Budget and dispatch

Before any paid run, record the API project, explicit model, total and per-job USD ceilings, per-job deadline, maximum jobs, repair allowance, billing containment and accepted enforcement limitations. The initial protocol allows three sequential jobs and no repair jobs; a failed stage stops its descendants. This is a first-pass qualification, not an assertion that the game works within a particular budget.

Example **proposed planning values**, not approved expenditure:

```json
{
  "spendCeilingUsd": 15,
  "perJobSpendCeilingUsd": 5,
  "perJobSeconds": 900,
  "maxJobs": 3,
  "maxRepairs": 0
}
```

Put the agreed values in an ignored local file, then:

```sh
mkdir -p outputs
node lib/party-forge/generation/cli.ts prepare /absolute/path/to/budget.json outputs/pc09a-plan
```

This writes a planning record and initial prompt only. It does not start a job or enforce a provider bill. Project/org monthly hard spend limits can provide containment, but enforcement can lag; verify dedicated project headroom and document the tolerated overshoot. Do not silently replace a requested hard per-job cap with a soft polling estimate. If acceptable containment is unavailable, stop paid execution. [Spend limits](https://developers.openai.com/api/docs/guides/spend-limits)

## Frozen authored scenarios

The user's source direction is FPS + zombies + cooking pressure from [PRD](../PRD.md). Conveyor behavior, the precise benchmark mechanics, seed, and numeric parameters are **Forge-authored qualification proposals**. There are no observed players, actual competition ranks, or participant card decisions here; each benchmark `userDecision` is explicitly null.

| Stage | Cumulative mechanics | Evidence required |
| --- | --- | --- |
| Initial | Aimed knockback FPS, pursuing zombies that interrupt cooking, conveyor collection/preparation/cooking/delivery | Three contribution witnesses and at least one completed order in a complete trial |
| Remix 1 | Retain all three; add a delivery bell spawn and a 600-tick carried-dish expiry | Five witnesses and a completing trial |
| Remix 2 | Retain all five; add cookable zombie ingredient drops and periodic lights-out visibility | Seven witnesses and a completing trial |

The two hypothetical editor slots alternate winner/loser order between remixes. This benchmark is not the finite production addition deck; it intentionally tests mechanics outside that deck. The authoritative scenario text and witness IDs live in `benchmark.ts`. All traces use seed `0x504309`, 3,600 full ordered input frames, the existing six-button mask/yaw/pitch bounds, and no adaptation.

The request requires a single self-contained JS source and proposed input traces in a JSON artifact under 4 MiB, with source under 256 KiB. No external dependencies/assets are allowed in this first benchmark. The runtime exposes deterministic reset/input/step/snapshot/completion/score operations; rendering is nonauthoritative. Generated trace proposals are suggestions to test, never proof of their own effects.

## Candidate retention and independent acceptance

Ask the actual agent to write the JSON candidate to `/workspace/outputs/candidate.json`. After the corresponding turn completes, enumerate artifacts and match **both turn ID and path**. Download exact bytes, enforce size before parsing, calculate hashes, and retain source and run receipts locally before session cleanup. Published artifacts survive environment expiry, but Forge must separately establish durable hosted storage and future play. [Files and artifacts](https://developers.openai.com/api/docs/guides/agents-api/environments/files)

```sh
node lib/party-forge/generation/cli.ts inspect initial outputs/initial.json
node lib/party-forge/generation/cli.ts inspect remix-1 outputs/remix-1.json outputs/initial.json
node lib/party-forge/generation/cli.ts inspect remix-2 outputs/remix-2.json outputs/remix-1.json

# Prepare only after independently accepting the parent behavior.
node lib/party-forge/generation/cli.ts remix-prompt remix-1 outputs/initial.json outputs/remix-1-request.json
node lib/party-forge/generation/cli.ts remix-prompt remix-2 outputs/remix-1.json outputs/remix-2-request.json outputs/initial.json
```

Each remix request includes its complete retained parent JSON, not only a hash or summary. Structural intake validates the immediate parent edge; it does not certify all ancestry or prior behavioral acceptance. The CLI keeps that limitation explicit.

An independently controlled, bounded runner must next:

1. Inspect code and interface; deny parent credentials/storage/network and bound CPU, memory, source size, result size, and duration. Never import candidate source into the room Worker or operator's Node process.
2. Replay every proposed witness and observe the named world-state changes. Reject fake counters or a scripted success report. Add adversarial control traces chosen independently from the generated proposals.
3. Replay the same trace in fresh instances and compare full snapshots and score, verify reset, then confirm a completing trace at 3,600 ticks with at least one valid completed order. Human-play the first-person interaction as a separate check.
4. Recheck every prior contribution after each remix. A changed explanation/title or source hash does not establish changed gameplay.
5. Record API receipts, selected actual model/version, candidate/parent hashes, independent validator identity/version, trace hashes, tested observations, failures and limitations. Refuse promotion on obsolete revision, cancellation, missing artifacts, invalid traces, lost behavior, or failed completion.
6. Reload the exact retained artifact after environment cleanup in a fresh isolated runner; verify it does not regenerate. Hosting/future-play acceptance remains separate from the local download.

The browser probe uses an opaque sandboxed frame, restrictive CSP, explicit permission denial, and an ephemeral Chrome context with request interception. It checks authored attempts against parent DOM/cookies/storage, network, navigation/popups and spoofed messages. These mechanisms and tests are useful preparation; they do not establish an OS resource budget or universal protection against arbitrary generated code. [Iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe), [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), [Playwright contexts](https://playwright.dev/docs/api/class-browsercontext)

## Live orchestration qualification checklist

Use an inline agent with an explicitly chosen model, no multi-agent spawning, hosted sandbox network disabled, and only the benchmark/retained parent files. `POST /v1/agents/sessions` creates the session; a nonstreaming response does not mean the task completed. Independently check environment `connected` and turn `completed`, then retrieve artifacts. Keep application credentials outside that sandbox. [Hosted environments](https://developers.openai.com/api/docs/guides/agents-api/environments/openai-hosted)

Follow-up/cancel commands use `POST /v1/agents/sessions/{id}/events`, with stable idempotency keys and `agent.session.input.message` / `agent.session.input.cancel` events. Persist the session, expected turn and stage before advancing. On timeout/disconnect, cancel and reconcile the existing session; never blindly submit a duplicate paid job. Confirm terminal cancellation, and exclude late artifacts from acceptance. Failed generation retains the last independently accepted file; it cannot consume hypothetical additions as if successful. [Input events](https://developers.openai.com/api/reference/resources/beta/subresources/agents/subresources/sessions/subresources/events/methods/create)

Measure request-to-artifact and request-to-independently-playable times separately. Record first-pass validity, repairs/retries (zero allowed in this first plan), cancellation/obsolete-output behavior, retained contributions and fresh-run replay. Session/turn usage may be null or revised; cached input and reasoning output are subsets of totals. Calculated costs are estimates, and model/tool/sandbox charges must all be included. Actual-cost acceptance requires billing evidence, not the model's self-report. [Observability and usage](https://developers.openai.com/api/docs/guides/agents-api/observability)

## Validation record

Executed on 2026-09-13 with Node 24.19.0 in the isolated worktree:

| Check | Observed result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run build` | Passed; built Worker/assets/DB/migration package checks passed |
| `npm test` | 57 Node checks and 20 desktop/mobile Chrome golden-flow tests passed |
| `npm run test:party` | Existing real local Worker/D1 concurrency/restart test passed |
| Protocol and intake suite | 12 checks passed after review fix |
| Authored browser boundary probe | 1 passed on Chrome 153.0.8010.36; nine denials, fetch/frame CSP violations, two rejected messages, zero external context requests |
| Authenticated read-only API probe | HTTP 200, valid empty session list; zero model requests |
| Independent adversarial review | Found a FIFO-open hang before the regular-file check; fixed with nonblocking open and a subprocess regression test |
| After review fix | Second lint/build/focused-test run passed; independent complete-diff recheck found no remaining actionable findings and reran all 12 focused checks successfully |

Chrome/Worker tests required approved execution outside the restrictive tool sandbox; Chrome retained its own sandbox. An initial restricted Chrome launch failed rather than being counted as a pass. Existing Vinext dynamic-import warnings remained in the successful build.

Novel generation, actual latency/cost, independent generated-code execution and durable hosted replay remain unverified. PC-09 must remain open. PC-09B still requires the accepted core demo dependencies and a successful qualification decision.
