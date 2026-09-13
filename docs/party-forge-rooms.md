# PC-03 room authority

Issue [#32](https://github.com/ghostleek/chaotic-forge/issues/32), owner Lance (@Leoendithas), human reviewer Kahhow (@ghostleek). Base `7666e96ac22d0a9588ca159c15cd87457671a7e8` contains merged PC-01 [#41](https://github.com/ghostleek/chaotic-forge/pull/41) and PC-02 [#42](https://github.com/ghostleek/chaotic-forge/pull/42). Branch `codex/pc-03-online-rooms`. This packet provides HTTP authority; PC-04/05/07 own the party UI and PC-06 owns saved games. The presets remain explicitly authored deterministic builds.

## HTTP contract

All requests and responses use the existing `party-forge/1` schemas. Use `Content-Type: application/json` for POST. Requests are limited to 512,000 actual streamed UTF-8 bytes before parsing. An invalid shape is 400, missing/wrong capability 403, missing room 404, oversized body 413, unsupported content type 415, and unavailable storage 503. All responses disable caching. No score, actor ID, host flag, or arbitrary executable supplied by a client is accepted.

Before creating/joining, the browser generates a fresh 32-byte secret with `crypto.getRandomValues`, encodes it as 64 lowercase hex characters, and retains it privately. Send it in `Authorization: Bearer <secret>`. The server binds its SHA-256 hash to a server-generated participant ID in that room; raw secrets never enter D1, public snapshots, histories, manifests, or invitation links. Invitations contain only the room URL. Retain each participant capability privately to reconnect. Losing it cannot be repaired by submitting the public participant ID. A client must not share capabilities across users.

| Endpoint | Request | Response |
| --- | --- | --- |
| POST `/api/party/rooms` | `createRoomRequestSchema`, `setup: {kind:"fresh"}` | 201 `{access, snapshot}` |
| POST `/api/party/rooms/:roomId` | `joinRequestSchema` | 201 `{access, snapshot}` |
| GET `/api/party/rooms/:roomId` | Participant bearer capability | 200 `{snapshot, history, historyCursor, historyCount}` |
| POST `/api/party/rooms/:roomId/commands` | `roomCommandSchema` | 200 `{receipt, snapshot}` accepted; 409 with rejected receipt |

Creation retries use the same private capability and command ID and recover the same room. Join retries use the same room, capability, and command ID and recover the same participant. Enrollment responses include the current public snapshot. Only the caller's response includes its own access context. Reusing an enrolled capability with a different join command is rejected; reconnect by GET instead.

For commands, use the current `snapshot.revision` as `expectedRevision`. Retrying the same participant/command ID returns the identical original receipt, even if the command payload changes or the room has advanced. The accompanying snapshot can be newer. A former participant can still recover its own stored receipt, but receives no current snapshot; new commands and enrollment replay cannot regain access. A rejected stale receipt remains rejected: inspect the returned snapshot, revise the intended action, and use a new command ID to try again. Request IDs are scoped to the participant and room.

GET refreshes that participant's durable last-seen timestamp. Poll approximately every five seconds while connected. Heartbeats do not advance the room revision; a change in availability or host does. History is separate append-only storage, at most 100 records per page. Pass the returned non-null `historyCursor` as `?after=...` to fetch subsequent records. Each history page is capped at the returned snapshot revision, so a concurrent completion cannot mix newer history with an older snapshot. `historyCount` is the total number of completed/aborted round and aborted-evolution records, not a score or round number.

## Round continuity

The server assembles all three initial contributions with explicit authored Source, executable Forge interpretation, and participant decision provenance. One participant owns one concept slot. Initial choices and both later edit slots are checked by the reducer; a disabled UI control is never the permission boundary.

Ready publishes a 30-second acknowledgment window. All three participants acknowledge the same build ID/hash. The host's `start-round` then freezes the shared start, 60-second simulation deadline, and 30-second transport grace. If the acknowledgment window expires, a new acknowledgment reopens it and clears old acknowledgments. The final scheduled start/deadlines in the Playing snapshot are authoritative. Starting requires the full present three-player roster.

Each participant submits all 3,600 frames only after the trial's 60 seconds, and before the original transport deadline. The retained PC-02 runtime recomputes orders/failures and the trace hash. Only three derived-score records are held in current state; raw input traces are discarded after validation (zero-day retention). No valid result is invented for an invalid, late, missing, or lost trace. Refresh does not grant a restarted attempt. Explicit `abort-round` records the interruption; retrying uses a new round ID and the entire supported roster. No hidden timer or process memory controls recovery.

Three valid results produce honest competition ranks and deterministic, distinct winner/loser editor slots. Odd rounds edit winner then loser; even rounds edit loser then winner. A Continue vote opens those slots; unanimous End saves the final played boundary for PC-06. Missing votes keep End pending. Both choices remain pending until resolution can promote one next build. At singleton card caps, Pass is legal only when no card remains; exhausting the deck does not end the room.

Presence uses persisted trusted timestamps and a 30-second grace. Host succession follows participant order and changes only coordination. A missing editor retains its right during grace. After grace another active participant can explicitly abort the unplayed evolution, preserving the last completed build and recording the abort. Removing a missing participant happens at a round boundary. Two people may wait or unanimously end the last played game; they cannot start a scored demo trial. Historical ranks do not authorize future edits after an abort or end.

Saved-game setup and `save-game` remain explicitly unavailable until PC-06. Ended state itself is durable, but it is not presented as a completed portable saved-game feature. There is no account service, model call, general editor, or new source corpus.

## Atomic persistence and verification

All D1 lookups use the PC-01 `getDb` binding adapter and prepared statements. A transactional batch first compare-and-swaps the expected revision with a unique private write token. Subsequent receipt, history, and participant writes require that exact token, so a zero-row CAS cannot append history or grant identity. Rejected receipts are durable without changing the public revision. New migrations append to the accepted PC-01 migration; no runtime schema creation or memory fallback exists.

The unchanged golden browser suite defaults to local port 3107. If another task owns that port, set `PARTY_TEST_PORT` to an available port (this work used 3117); the suite still starts its own built Worker and refuses to reuse an existing server.

Run the gates in `QUALITY.md`: `npm run lint`, `npm run build`, `npm test`, `npm run test:party`, independent complete-diff adversarial review, then lint/build/focused tests after fixes. The party suite includes the original host migration/CAS/restart proof and actual room HTTP commands from separate browser contexts. Scripted trial traces are local deterministic fixtures, not observed human play or external evidence.

Validation on 2026-09-13, using Node 24.19.0: `npm run lint` and `npm run build` passed. `npm test` passed all 120 Node tests (including retained runtime parity in Node, Chrome and workerd) and all 20 unchanged desktop/mobile golden-flow tests. The golden run used `PARTY_TEST_PORT=3117` because a separate task owned port 3107; it started a fresh built Worker and reused no server. `npm run test:party` passed both real local D1 suites, including two actual 60-second rounds, three browser contexts, history/receipt races, Worker restarts, absence grace, abort/retry, minimum roster, removed-capability denial, unanimous ending and database-failure recovery.

An independent agent reviewed the complete diff and reported no remaining actionable findings after recovery fixes. These included preserving End/removal at the history limit and allowing failed/canceled or undersized unplayed evolution to be explicitly aborted without transferring edit rights. The follow-up also reviewed the optional test-port setting. Post-review `npm run lint`, `npm run build` and all 27 focused room/reducer/SQLite/transport tests passed. A separate storage review strengthened heartbeat races and snapshot-consistent history paging. Initial exploratory failures (sandbox ports/Chrome, empty-history cursor and concurrent test-port ownership) are resolved; none are counted as passing evidence.

Human acceptance by the accountable owner and named reviewer remains pending. Deployed Site access/audience remains unverified from PC-01; no deployment or public-room acceptance is claimed here.
