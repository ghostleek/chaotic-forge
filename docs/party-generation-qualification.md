# PC-09A generation qualification

**Status, 2026-09-13:** the first live attempt was unsuccessful. Session creation, hosted environment connection and input submission succeeded, but usage remained unobservable, triggering cancellation and confirmed cleanup. No candidate was downloaded. Live qualification, generated gameplay and actual billing remain unverified; no remix stage was started.

Issue: [PC-09 / #38](https://github.com/ghostleek/chaotic-forge/issues/38). Owner: Lance. Branch: `codex/pc-09a-generation-qualification`. Current accepted base: merged [PC-02 PR #42](https://github.com/ghostleek/chaotic-forge/pull/42), exact SHA `7666e96ac22d0a9588ca159c15cd87457671a7e8`. The earlier preparation and validation used merged [PC-01 PR #41](https://github.com/ghostleek/chaotic-forge/pull/41), SHA `2a842d704a0f9a9757a793d6ad7f77282f42f752`; those historical results do not validate the new runner or current base. Existing deployed Site access remains outside this qualification.

The user authorized PC-09A and supplied a local environment-file path, then approved the monitoring thresholds below. A read-only Agents session-list request returned HTTP 200 with a valid empty list on 2026-09-13 (request ID `req_926eb523e6bf4977bd1e677c89c45768`). The subsequent live attempt verified session write and hosted sandbox connection; model inference usage and cost remain unverified. Its observed outcome is recorded below.

## Findings that affect integration

1. The accepted `party-forge/1` schema is intentionally specific to the demo: its initial and additive cards are closed enums, `catalogVersion` is fixed to `kitchen-chaos/1`, contribution history allows at most six entries, and validation supports at most six contribution witnesses. A novel conveyor-cooking choice and two complete two-card remixes cannot fit that schema. A generated-origin field alone does not solve this.
2. This spike uses `party-forge-qualification/1`, explicitly outside product room/archive acceptance. It shares the accepted input-frame bounds, 60 Hz/3,600-tick policy, and orders/failures rubric, but its runtime interface is an experimental adapter, not the accepted `PartyRuntime` interface. A general versioned card/contribution contract and adapter require an explicit shared-file handoff before PC-09B. No production enum, runtime, room, or saved game is changed here.
3. Current official session creation has no documented caller-configurable per-job dollar, token, or duration cap. The presence of a budget-related error code is not a public budget-setting API. Closing a stream also does not cancel its task. A cancellation watchdog is necessary but cannot guarantee a final invoice ceiling. [Session request reference](https://developers.openai.com/api/reference/resources/beta/subresources/agents/subresources/sessions/methods/create), [session lifecycle](https://developers.openai.com/api/docs/guides/agents-api/sessions)
4. API-hosted code construction, browser gameplay containment, and independent score acceptance are separate capabilities. The local replay runner adds process-group wall-time termination and bounded observations to the authored browser probe. It does not qualify hard process-memory limits, OS-level network isolation, a production score service or durable hosted play. Independent review of the browser runner is required before executing generated source; the current review record is below.

## What is runnable now

- `lib/party-forge/generation/benchmark.ts`: immutable cumulative scenarios, explicit provenance, replay policy, witness criteria, prompt construction, and strict planning budgets.
- `candidate.ts`: bounded JSON/UTF-8 intake, exact-byte artifact/source hashes, full tick traces, parent hash/stage checks and complete witness-proposal coverage. It never imports or evaluates submitted source. A successful intake means **structurally valid and unverified**, not playable, generated, secure, or accepted.
- `preflight.ts` and `access-probe.ts`: a static secret-free prerequisite checklist and an optional read-only Agents session-list request. These do not replace recorded live-run receipts or establish write, inference, chosen model or sandbox access.
- `cli.ts`: offline plan/initial prompt preparation, candidate inspection, and remix request preparation with the exact retained parent JSON. Existing output files/directories are not overwritten.
- `live.mjs`, `live-api.mjs` and `live-policy.mjs`: one explicitly requested stage per invocation, fixed API destination, network-disabled hosted environment, session/turn polling, monitored stop conditions, cancellation reconciliation, exact artifact retrieval and persisted receipts. Exclusive stage directories prevent accidentally purchasing a replacement job. No automatic repair or room promotion is implemented.
- `browser-replay.mjs`: `replayCandidate({ candidateBytes, expectedStage, parentBytes?, wallTimeMs?, maxOutputBytes? })` executes inspected source only in an ephemeral Chrome sandbox. It repeats reset/replay, hashes all observed states, checks completion/score envelopes and render noninterference, and returns `replayed-unverified`. It never evaluates submitted source in Node.
- `tests/integration/party-generation.isolation.mjs`, `.live.mjs` and `.replay.mjs`: authored boundary/replay regressions and mocked API orchestration tests, separate from actual generation evidence.

The live command can dispatch paid inference using the user's approved monitoring policy. The browser runner requires source inspection and independent runner review before use with generated output. Product integration and deployment remain outside this change; no SDK or new package dependency is required.

Use Node 24.x and the existing installed dependencies. The repository's standard unit command discovers `tests/party-generation.test.mjs`. Run the additional qualification checks explicitly:

```sh
node lib/party-forge/generation/cli.ts preflight
# A static checklist, not a persisted live qualification result.

node --test --experimental-strip-types tests/party-generation.test.mjs tests/integration/party-generation.intake.mjs
node --test tests/integration/party-generation.live.mjs
node --test tests/integration/party-generation.isolation.mjs
node --test tests/integration/party-generation.replay.mjs

# Optional authenticated READ only, after configuring a local environment file:
node --env-file=/absolute/path/to/private.env lib/party-forge/generation/cli.ts probe-access
```

No key value belongs in a prompt, bundle, output report, command argument, commit, browser, or sandbox. The documented application key needs `api.agents.read`, `api.agents.write`, and `api.responses.write` for the full live workflow. The read probe calls only `GET /v1/agents/sessions?limit=1&order=desc`, uses `OpenAI-Beta: agents=v1`, refuses redirects, and records only status/request ID/shape/count. It does not retain unrelated session contents. [Quickstart](https://developers.openai.com/api/docs/guides/agents-api/quickstart), [session list](https://developers.openai.com/api/reference/resources/beta/subresources/agents/subresources/sessions/methods/list)

## Budget and dispatch

The user approved **US$15 total / US$5 per job monitoring thresholds, 900 seconds per job, at most three sequential jobs and zero repair jobs**. These are monitored stop conditions, not guaranteed invoice bounds. A failed or unresolved stage stops its descendants. The selected model is `gpt-6-astra`, medium reasoning, standard service (`service_tier: default`); record an actual snapshot/version if the service reports one rather than inventing a version behind the alias.

The approved planning values are:

```json
{
  "spendCeilingUsd": 15,
  "perJobSpendCeilingUsd": 5,
  "perJobSeconds": 900,
  "maxJobs": 3,
  "maxRepairs": 0
}
```

To prepare the same values in an ignored local file without dispatching:

```sh
mkdir -p outputs
node lib/party-forge/generation/cli.ts prepare /absolute/path/to/budget.json outputs/pc09a-plan
```

The live monitor conservatively prices every observed input token at US$25 per million and every observed output token at US$75 per million, using the highest standard long-context rates throughout and adding a US$1.92 sandbox reserve per job. Cached-input and reasoning-token subsets are not added again. This is a conservative monitoring estimate, not an actual charge or invoice upper bound: usage can arrive late or change, and the reserve is not a metered sandbox bill. The runner cancels at the per-job estimate or time threshold, or after 60 seconds without observable usage progress. It reserves the next US$5 against the total before dispatching another stage. Project billing controls remain separate. [Model rates](https://developers.openai.com/api/docs/models/gpt-6-astra), [container rates](https://developers.openai.com/api/docs/pricing), [spend limits](https://developers.openai.com/api/docs/guides/spend-limits)

The authorized initial stage was invoked with this command shape; the retained run is `outputs/pc09a-live-2026-09-13`. Its failed outcome blocks descendants under the approved no-repair policy:

```sh
node --env-file=/absolute/path/to/private.env lib/party-forge/generation/live.mjs initial outputs/pc09a-live-2026-09-13
```

The runner uses `LIVE_POLICY`; the offline budget file is not an alternate override. Each stage directory retains `prompt.txt`, `run.json`, redacted `receipts.jsonl` and, when extraction succeeds, exact `candidate.json` bytes and `intake.json`. Reusing that directory fails rather than creating another paid job. A later `remix-1` or `remix-2` invocation requires the previous candidate's exact hash in an independently authored `acceptance.json` with status `independently-accepted`, a successful previous run record and confirmed cleanup. The runner never writes behavioral acceptance itself.

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

The implemented replay is a local inspection aid. It runs Chrome with its own sandbox, an empty inherited environment, an opaque iframe and restrictive CSP/permissions; context requests and WebSockets are intercepted. A Node watchdog outside the renderer kills only its own Chrome process group after 30 seconds by default (configurable up to 60 seconds). Snapshots are capped at 64 KiB, each full observed trace at 32 MiB, and returned observations/reports at 32 MiB. These byte and wall-time checks are not a hard process-memory limit or OS network sandbox.

Each proposed trace is replayed in two freshly initialized opaque source realms and repeated after reset in the first realm, comparing hashes of all 3,601 observed states. Fresh-initialization and reset determinism are reported separately. The observer retains a private browser handle and captures serialization primitives before loading source, checks frame/tick/completion and bounded score agreement, and verifies that initial/final rendering leaves state and score unchanged. Sampled world states aid review; a repeated self-consistent score or hash cannot establish that a contribution works.

Independent acceptance must still:

1. Inspect code and interface before execution, review the browser runner, and record the limits of local containment. Qualify hard CPU/memory and host isolation separately before production scoring. Never import candidate source into the room Worker or operator's Node process.
2. Replay every proposed witness and observe the named world-state changes. Reject fake counters or a scripted success report. Add adversarial control traces chosen independently from the generated proposals.
3. Replay the same trace in fresh instances and compare full snapshots and score, verify reset, then confirm a completing trace at 3,600 ticks with at least one valid completed order. Human-play the first-person interaction as a separate check.
4. Recheck every prior contribution after each remix. A changed explanation/title or source hash does not establish changed gameplay.
5. Record API receipts, selected actual model/version, candidate/parent hashes, independent validator identity/version, trace hashes, tested observations, failures and limitations. Refuse promotion on obsolete revision, cancellation, missing artifacts, invalid traces, lost behavior, or failed completion.
6. Reload the exact retained artifact after environment cleanup in a fresh isolated runner; verify it does not regenerate. Hosting/future-play acceptance remains separate from the local download.

The separate authored boundary probe checks attempted parent DOM/cookie/storage access, network, navigation/popups and spoofed messages. Those tests and the replay watchdog do not establish universal protection against arbitrary generated code. [Iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe), [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), [Playwright contexts](https://playwright.dev/docs/api/class-browsercontext)

## Live orchestration and remaining evidence

The runner creates an inline agent with the explicit model, multi-agent spawning disabled, hosted sandbox network disabled, and only the benchmark/retained parent files. It first creates a session without model input, records its identifiers, waits for environment `connected`, then submits one input event. An uncertain create outcome is reconciled by the unique run marker without resubmitting creation or model input. A nonstreaming response is not completion: the runner requires the expected turn to reach `completed` before retrieving the matching artifact. Application credentials remain outside the hosted sandbox. Actual write, inference and sandbox access are recorded independently. [Hosted environments](https://developers.openai.com/api/docs/guides/agents-api/environments/openai-hosted)

Input/cancel commands use `POST /v1/agents/sessions/{id}/events`, stable idempotency keys and `agent.session.input.message` / `agent.session.input.cancel` events. Stop conditions and interruption trigger cancellation with bounded terminal-state reconciliation, followed by cleanup of this run's session. Unconfirmed cancellation/cleanup remains in the record and blocks descendants. Exact candidate bytes are retained before cleanup; late or failed output cannot become an accepted parent. [Input events](https://developers.openai.com/api/reference/resources/beta/subresources/agents/subresources/sessions/subresources/events/methods/create)

Measure request-to-artifact and request-to-independently-playable times separately. Record first-pass validity, repairs/retries (zero allowed in this first plan), cancellation/obsolete-output behavior, retained contributions and fresh-run replay. Session/turn usage may be null or revised; cached input and reasoning output are subsets of totals. Calculated costs are estimates, and model/tool/sandbox charges must all be included. Actual-cost acceptance requires billing evidence, not the model's self-report. [Observability and usage](https://developers.openai.com/api/docs/guides/agents-api/observability)

## First live attempt — observed failure

Local evidence is retained in `outputs/pc09a-live-2026-09-13/initial/run.json` and `receipts.jsonl`, with run ID `3c9f0bcb-91b3-482c-b8d9-2422a68e45a5`. This is an actual API attempt under the approved US$15 total / US$5 per-job monitoring thresholds and 900-second deadline, not a mocked orchestration test.

| Event | Observed evidence |
| --- | --- |
| Dispatch began | `2026-09-13T05:36:09.180Z` |
| Session creation | HTTP 201; request `req_215100504bf4459eb30c16a09b82d3e9` |
| Hosted environment | Reached `connected`; `sandboxAccessVerified: true` |
| Initial input | HTTP 202; request `req_17c1f7d5bacc470d869a59dfa0045edb` |
| Monitoring stop | `usage-unobservable`; recorded `usage` and `estimatedUsd` remained null |
| Cancellation | HTTP 202; request `req_0ed8552d793f4517ade9518c85321664`; terminal turn state confirmed before cleanup |
| Session deletion | HTTP 200; request `req_1596379ec7bd45d0a5440af80e9bae21`; `cleanupConfirmed: true` |
| Cleanup finished | `2026-09-13T05:37:49.609Z` |

Elapsed dispatch-to-cleanup time was **100.429 seconds**. This includes provisioning, monitoring, cancellation and cleanup; it is not generation latency or time to a playable artifact. The run ended `failed`, with null artifact/source hashes and no downloaded candidate. No repair or descendant stage was dispatched, and no generated source was executed locally.

The accepted input does not establish completed inference. No model snapshot, token usage, estimated charge or actual invoice amount was confirmed. Null usage is not zero usage, and this record makes no zero-charge claim. The failed attempt demonstrates that this account can create a session and connect a hosted environment, and that the current monitor cancels when it cannot observe usage; it does not qualify generation quality or bounded billing.

## Validation record

**Current PC-02 base, 2026-09-13:** Node 24.19.0; accepted base `7666e96ac22d0a9588ca159c15cd87457671a7e8`.

| Check | Observed result |
| --- | --- |
| Initial lint/build | Passed; built Worker/assets/DB/migration package checks passed |
| `npm test` | 98 Node checks and all 20 desktop/mobile Chrome golden-flow tests passed |
| `npm run test:party` | Real local Worker/D1 concurrency/restart test passed |
| Independent complete-diff review | Found dispatch deadline/interruption race, cancellation retry and cleanup-continuation gaps, fresh-source determinism gap and observer substitution bypass; all fixed and independently rechecked |
| Second lint/build after review fixes | Passed |
| Focused qualification checks after fixes | All 31 passed: 5 protocol, 7 intake/access, 9 mocked live orchestration, 1 authored isolation and 9 authored replay checks |

The live regressions use mocked HTTP responses. Replay fixtures are authored, including infinite-loop termination with browser process exit, oversized snapshots, render mutation, poisoned serialization, initialization failure, startup randomness, incomplete reset and forged observer output. None of these results is a successful generated game. The actual live outcome is the unsuccessful attempt above.

**Historical preparation results only:** executed earlier on 2026-09-13 with Node 24.19.0 against the PC-01 base `2a842d704a0f9a9757a793d6ad7f77282f42f752`. These precede the live runner/browser replay and the move to accepted PC-02.

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

The first live attempt is recorded above as a failure. Novel generation, actual generation latency/cost, contribution acceptance, fresh-browser generated replay and durable hosted replay remain unverified. PC-09 must remain open. PC-09B still requires the accepted core demo dependencies and a successful qualification decision; local browser replay does not qualify production memory enforcement or make the full milestone ready.
