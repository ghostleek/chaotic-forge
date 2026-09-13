# PC-01 shared contract and host foundation

## Delivery and baseline

Packet: [PC-01 / GitHub #30](https://github.com/ghostleek/chaotic-forge/issues/30). Owner: Lance; human acceptance/review: Kahhow. Implementation branch: `codex/pc-01-contract-host`. Draft implementation: [PR #41](https://github.com/ghostleek/chaotic-forge/pull/41). The clean complete starting commit is [`c6a8fe4d29c7ae76ee6e57f7a826308b151fdd9b`](https://github.com/ghostleek/chaotic-forge/commit/c6a8fe4d29c7ae76ee6e57f7a826308b151fdd9b), verified against remote HEAD on 2026-09-13. It includes the deliberately reconciled planning/archive commit; the older `c39ddb8` planning reference is superseded as an execution base. There is no parent packet PR. Implementation is not accepted or merged; downstream work must use the accepted shared commit, not this moving branch.

The source remote redirects from `ghostleek/mechanic-forge` to `ghostleek/chaotic-forge`. The existing Site ID remains `appgprj_6aa42afc97b081918552ee892a3aaa9e`. The connected Sites `get_site` call returned `NOT_FOUND / Sites project not found` on 2026-09-13. Its audience, production database, and deployed operation are **unverified and blocked**. Access to that same Site is required to finish host acceptance. No replacement Site, audience change, deployment, or public-room claim has been made.

## Frozen v1 interface

`lib/party-forge/contracts.ts` exports strict Zod parsers and their inferred TypeScript types. Every wire envelope uses `party-forge/1`. Unknown fields and unsupported versions fail instead of being silently dropped. Callers parse untrusted input before execution; TypeScript alone is not a validation boundary.

- Initial cards: FPS has Knockback / Counter ricochet, Zombies has Pursuers / Noise seekers, Cooking has Quick orders / Batch orders. Exactly three distinct initial contributors fill distinct slots. The six-card authored deck describes eight combinations; fixtures validate their structure, not their executability. PC-02 must qualify each combination.
- A contribution records its participant, stable decision ID, order, Source, Forge interpretation, and User decision. Initial contributions and up to three singleton additions remain in order. Each later card has a stack limit of one. This limit is a PC-01 implementation default, not a previously confirmed user decision.
- Accepted manifests bind the catalog, resolver, runtime, assets, scoring version, immutable resource hashes/registry keys, parent, contributions, effects and witness references. Preset origin has no model metadata. Generated origin requires the actual job, service, model and version. Schema acceptance does not prove a stored executable exists or that a witness ran. PC-02/06/09 must verify hashes, supported runtime versions, asset availability and behavioral witnesses before promotion or replay.
- `parseEvolution` rejects replacement or deletion of earlier contributions and permits at most two appended contributions. The generation job/revision must still be current when the authority promotes it. Failed/incompatible/canceled build states retain the previous playable build separately from the pending revision. No fallback masquerades as generation.
- `PartyRuntime` defines deterministic reset, input, step/snapshot, completion and score replay. The render payload remains runtime-specific until PC-02; it is not permission to change the envelope. Runtime code cannot access wall-clock time, storage, network, or authority credentials.
- Room snapshots contain public state only. `RoomCommand` has a command ID and expected revision; the transport resolves a room-scoped capability to the actor. `ParticipantAccess` is private transport context. An invitation or caller-supplied participant ID cannot grant identity. Creation/join requests are separate from revisioned participant commands. PC-03 implements capability issuance, authorization, receipt persistence and transitions; the D1 helper here is an internal persistence primitive, not a public room API.
- Duplicate commands must return the original stored receipt. Stale commands return a rejected receipt and current snapshot. CAS protects revision writes but does not by itself implement command idempotency; that authority work belongs to PC-03.

## Demo policy and authority requirements

Three desktop keyboard/mouse participants play separate matched arenas. Lobby presence may be below three; scored rounds require exactly three distinct roster members. Mobile receives no claim of supported FPS controls. Adaptation stays off.

Each trial has 3,600 fixed 60 Hz ticks, lasting exactly 60 seconds. The server freezes roster order, build/hash, seed, scoring version and deadlines. The submission deadline is start + 60 seconds; transport grace ends 30 seconds later. A 30-second Ready acknowledgment window is the initial implementation default: the authority schedules the shared start only after all frozen participants acknowledge the artifact, otherwise it keeps/reopens Ready. Persist the resulting deadlines; restarts cannot reset them.

Input v1 contains every tick exactly once in order. Six held button bits mean forward, back, left, right, shoot and interact; yaw/pitch are absolute radians in their documented bounds. The runtime derives action edges from successive frames. Focus or pointer-lock loss records neutral held controls while simulation keeps running. No omitted ticks, extra play during grace, browser-time ranking, or score supplied by the client. Limit the UTF-8 request body to 512,000 bytes before JSON parsing at the PC-03 transport boundary. A crash/refresh that loses the trace requires a visible whole-roster abort/retry with a new round ID or ending on the last completed game.

Performance sorts completed orders descending, then failed/spoiled orders ascending. Equal scores keep equal competition ranks (1, 1, 3). Traverse roster order beginning at `tieCursor` to choose a winner from the tied best group, then a distinct loser from the tied worst group. All ties still produce two distinct editor slots. Advance the cursor by one modulo three after each completed round. Odd rounds edit winner then loser; even rounds edit loser then winner. Receipt arrival time is irrelevant.

An End vote is unanimous among the active roster at completed Results, before additions. Missing votes remain pending; any Continue opens additions. Exactly the eligible pair resolve slots in order. A singleton addition already present or chosen by the earlier editor is unavailable; Pass is permitted only when no legal card remains. Exhausting the deck does not end the game automatically. Schema limits allow 10,000 archived round records and four retained build versions per record; the UI must disclose this storage budget and offer an explicit archive/export boundary before exceeding it, rather than silently dropping history or declaring a fixed round count.

Host succession, unavailable-player removal and pending-editor grace use persisted server timestamps and roster order with a 30-second grace. Losing a player never automatically grants loser rights. An aborted round records its reason and grants no edits; an aborted evolution discards its unplayed draft and preserves the last completed build. Do not transfer an absent editor's right. Under three players, wait or archive the last completed game. These remain PC-03 transition guarantees; snapshot shape validation does not replace the authority state machine.

Archives retain the final **played** manifest, only completed-round builds/results, abort markers and parent archive lineage. Evolution aborts are separate records referring to the preceding completed round and pending revision; they never invent a trial. `forkSetup` retains explicit new-participant Keep/Replace decisions, and `parseForkSetup` validates them against the inherited build while retaining all later additions and labeling all-kept choices Play again. Pending drafts and private capabilities cannot enter the export schema. Raw scoring traces have an explicit retention period (0–30 days); the schema fixture uses seven days, not a production retention promise. Play again uses the saved final version unchanged with fresh attempts. Remix preserves ancestry and contributions with fresh ranks/permissions and follows the PRD fork setup; Forge fresh has new initial history. Durable executable retention and these actions are PC-06 responsibilities.

## Build and local D1 commands

Use Node 24.x and the committed npm lockfile. The installed Next CLI/deployment configuration guides and Vinext README were read for the framework boundary; the optional `vercel:nextjs` skill is unavailable in this environment. Sites persistence/SQLite guidance was followed. Archive source remains excluded from application TypeScript and lint.

```sh
npm ci
npm run db:generate        # only after intentionally changing db/schema.ts
npm run lint
npm run build             # Vite/Vinext -> Cloudflare Worker, not next build
npm run db:migrate:local  # packaged Drizzle SQL -> local DB
npm test                 # domain/contract tests, then unchanged golden browser suite
npm run test:party        # real local Worker/D1 durability and concurrency proof
```

`build:worker` aliases the build gate. `npm run dev` runs Vinext through Vite; `npm run start -- --port 3107` starts the actual built Worker under Wrangler/workerd. The compatibility date is pinned to `2026-05-22`, supported by the locked Wrangler 4.92.0 runtime. An initial attempt using today's date was rejected by that binary. No dependency upgrade or fallback runtime conceals that mismatch.

The client build keeps Vinext’s navigation module in its own explicit chunk. The locked Rolldown otherwise merges that module into the application entry and loses the dynamically imported navigation namespace; the unchanged golden browser suite reproduced the failure and passes with this targeted configuration. Existing vendor groups remain intact.

The build check verifies `dist/server/index.js`, client chunks, `.openai/hosting.json`, logical `DB`, and copied Drizzle SQL/journal. `dist/.openai/drizzle` is the production migration package. The inspected first migration creates only `party_rooms` with primary-key room identity, revision, JSON snapshot, update timestamp, and revision/JSON checks. All queries use one raw prepared statement each; conditional UPDATE changes the snapshot and revision atomically. There is no runtime CREATE TABLE, alternate storage, or memory fallback.

The logical DB's all-zero placeholder ID is for local development only. Sites provisions/maps the production database from the logical binding during its normal publishing path. Do not deploy the local Wrangler configuration to a different Cloudflare host. Once migrations have been applied remotely, retain their SQL, journal and snapshots unchanged and append migrations.

Default local migration/start state lives under `.wrangler/state`. The target suite creates a unique `.wrangler/party-proof-*` directory, applies the packaged migration twice, creates a typed room, reads from another isolated browser context, races two writes based on revision 0 (exactly one must win), terminates the Worker, starts a new process with the same D1 state, and rereads the winner. It also rejects an unauthorized probe, stale revision and extra privileged field.

Proof HTTP handlers exist only in `scripts/party-host-proof.ts`, imported by a generated local wrapper under `.wrangler`. The wrapper falls through to the built application. The normal start command serves the unwrapped Worker; the packaged build check verifies the proof path never appears in its JavaScript. This test seam is not a deployed party API or evidence that three users completed the future party journey. Golden tests use the unwrapped Worker.

## Validation record

First local gate run on 2026-09-13: `npm run lint` passed; `npm run build` passed including Worker/package assertions; `npm test` passed 49 Node tests (22 legacy + 27 party assertions) and all 20 unchanged desktop/mobile Chrome golden tests. `npm run test:party` passed its real D1 migration, three-context read, concurrent revision, and process-restart scenario. Independent adversarial agent review found four P2 issues: divergent snapshot/build history, missing evolution-abort records, surplus unplayed archive builds, and cleanup after a signaled child exit. These are fixed with regressions. A follow-up review also caught loss of pending editor choices during forging/failure; both slots now remain tied to the last completed build through forging, failed, incompatible, and canceled states. The final independent reviewer reported no remaining actionable findings after bounded schema checks. Post-review gates all passed: `npm run lint`, `npm run build`, `npm test` (52 Node assertions: 22 legacy + 30 party; all 20 unchanged desktop/mobile browser tests), and `npm run test:party` (real local D1, race, restart, and unexpected signaled-child cleanup). Human owner/reviewer acceptance remains pending.

Earlier exploratory failures were resolved: locked runtime compatibility date, shared Playwright output directories, and the navigation chunk boundary. Public audience/deployment acceptance remains blocked by the Site access failure above even when all local gates pass.
