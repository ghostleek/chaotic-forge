# Durable saved games — PC-06

Implementation base: `e529e74c7cbff5e63db7184734f553ae559bb27d`, merged PC-03 [PR #44](https://github.com/ghostleek/chaotic-forge/pull/44), with PC-01 [#41](https://github.com/ghostleek/chaotic-forge/pull/41) and PC-02 [#42](https://github.com/ghostleek/chaotic-forge/pull/42). Delivery issue: [#35](https://github.com/ghostleek/chaotic-forge/issues/35). Lance owns the archive, room, shared-contract, persistence, and test-harness changes. PC-07 owns the visible save/download/remix controls.

## Save and retrieve

Send the existing `party-forge/1` `save-game` command with its `commandId` and `expectedRevision` to `POST /api/party/rooms/:roomId/archive` or the existing `/commands` route. Use the room's private participant Bearer capability. Only an active participant of an ended room can save. The session must have a completed round; end consensus continues to be enforced by the room authority. A stale command is rejected with the current snapshot.

Success returns the normal receipt and snapshot plus `archiveId` and `archiveUrl`. Duplicate commands recover their stored receipt. Different save commands still identify the same immutable archive for that ended room. Revision/receipt/archive publication is one D1 transaction, conditional on the exact winning room write. No acknowledged save survives only in memory.

`GET /api/party/archives/:archiveId` is an unlisted, shareable read URL and returns:

- `archive`: immutable final manifest, all completed manifests, round/abort history, contribution provenance, lineage and version/seed/scoring information;
- `availability`: whether the exact retained dependencies can execute;
- `provenance`: `room-authority` or `portable-import-unverified`;
- `retention`: `archive: "no-automatic-expiry"`, `rawTraceDays: 0`, and `portableExport: true`.

`GET /api/party/archives/:archiveId?download=1` downloads the same portable JSON. A known missing executable has an explicit unavailable state; its intact document remains exportable. No runtime is regenerated or substituted. Save/read errors preserve the existing room and document. Read URLs confer no room authority, and there is no public archive index or account system.

## Storage and preservation

Migration `0002_whole_sharon_carter.sql` appends four tables. `party_played_builds` retains the exact manifest when a completed result is committed. Archives use separate metadata, build and history records; repeated rounds append bounded history without enlarging the live room record. Archives have no cascading foreign key to rooms. The group's final build is its last completed played version. Aborted/unplayed candidates are represented by abort metadata and are excluded from executable builds.

Saved games have no automatic expiry in this implementation. This is separate from the PRD's proposed 24-hour room inactivity policy; it does not claim that room cleanup is implemented. There is no guaranteed permanent hosting or backup service. Download JSON for independent preservation. Raw scoring input traces are validated when submitted and are not archived; completed results retain their trace hashes. Rollback may disable new writes while preserving these records and the released runtime bytes; applied migrations remain append-only.

Rooms created before PC-06 may lack overwritten historical manifests. A room whose exact single played build remains available can save it; a room missing any completed version receives an explicit error. The service does not manufacture missing history from current recipes.

The released v1 executable remains both statically imported by `runtime-registry.ts` and served at `/party-forge/kitchen-chaos-v1/engine.js`. Its public bytes match the retained source and manifest SHA-256. The version-owned `archive-policy.json` and `archive-runtime.ts` pin descriptor/effect text, qualification, loading and scoring independently of current catalog/resolver defaults. Saved-source remixes and their later additions use that retained policy. Later versions must append registry entries and new public paths while keeping released paths/bytes. Missing resolver, validator, runtime or asset versions cannot fall back to the latest implementation. This is an executable-retention mechanism; actual future cloud deployment acceptance remains a separate host check.

## Portable import

`POST /api/party/import` accepts a raw `GameArchive` JSON document with `Content-Type: application/json`. It does not accept participant capabilities or asserted command identities inside the document. It is a portable-content intake, not enrollment or verification that the imported historical play occurred on this host.

The importer validates actual streamed UTF-8 byte count (32 MiB maximum), strict schema, manifest hashes, retained version availability, contribution/round references, lineage and editor consistency. Invalid input is 400, unavailable versions or conflicting immutable IDs are 409, oversized input is 413, and unavailable storage is 503. Import never overwrites an existing ID with different content. Repeating the identical upload is idempotent; its original storage provenance is retained.

Chunked imports remain invisible until every child record is present. An interrupted matching upload can finish the same immutable record on retry. JSON binds remain below D1's 2 MB per-string limit, and a maximum-sized upload stays below 50 queries. See the [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) used in this design. Host CPU/memory and deployment quota acceptance still require the target environment.

## Future play and remix

Use the existing room-creation endpoint with a fresh capability and `setup: {kind: "play-again" | "remix", archiveId}`. Every participant enrolls afresh. Historical IDs, scores, ranks, host/editor privileges, and secrets are never copied into live authority. Only the source manifest and archive ID are retained in the bounded new-room state.

Play again prepares the exact saved final manifest when the third participant joins. A remix exposes `snapshot.fork` with the source archive/build, mode, and current decisions. Each of three new participants submits `choose-fork` to claim one inherited initial contribution and chooses Keep or the other variant in its FPS/Zombies/Cooking slot. Other participants cannot claim the same slot. All inherited later cards remain effective, including a fully exhausted deck. Replacements become attributed fork decisions with a new manifest whose parent identifies the source build. All-kept choices are labeled `play-again` and preserve the original manifest exactly. The source archive stays immutable.

After the first new round, the accepted winner/loser addition loop resumes with fresh ranks and edit eligibility. Ordinary evolution remains append-only. Failed initial remix setup retains decisions and permits explicit retry/revision and participant recovery before play. Source absence or corruption returns an error without creating a replacement room.

## Validation

Required commands: `npm run lint`, `npm run build`, `npm test`, `npm run test:party`, independent complete-diff adversarial review, then lint/build/focused tests after fixes. Use Node 24. `PARTY_TEST_PORT=3121` isolates the unchanged golden browser runner when another worktree uses its default port. The archive integration spec uses its own disposable D1 and port 3120; host/room suites keep their existing isolated harnesses.

Archive unit tests cover all exhausted-deck fork choices, exact loading, unavailable resources, invalid exports/imports and provenance preservation. Room tests cover fresh authority, claim races, setup recovery and unchanged legacy behavior. An isolated later-version module graph replaces the current resolver/catalog with incompatible defaults and proves v1 loading, scoring, fork and evolution still work. This is a local compatibility test, not a deployment. The production-Worker integration exercises real browser requests and wall-clock trials, immutable save/retrieval after process restart, missing/unplayed builds, portable round trips, fresh room setup, retained module bytes and storage failures. Authored automated input traces and portable fixtures remain labeled as such.

Validation on Node 24.19.0:

- `npm run lint` and `npm run build` passed, including the packaged Worker, assets and migration checks.
- `PARTY_TEST_PORT=3121 npm test` passed all 143 Node tests and all 20 unchanged desktop/mobile golden browser tests against a fresh built Worker.
- Independent complete-diff adversarial review identified and verified fixes for mutable-default coupling in saved v1 loading and abort-aware history ordering. The post-fix review has no remaining actionable findings.
- Post-review lint/build and all 36 focused archive/fork-room/room tests passed.
- Final `npm run test:party` passed all three real local Worker/D1 suites in 6.1 minutes: archive (3.3 minutes), host (4.8 seconds), and room (2.8 minutes). The archive test completed and saved a fresh remix with ancestry, then deleted the original room and verified that its saved archive and executable remained available. No source changes followed the final build.

The first sandboxed full test launch could not bind a local socket; the subsequent approved local Worker/Chrome run passed. Local browser tests execute authored automated control traces; fixture import history remains explicitly unverified. No actual deployed Site audience, remote D1 durability, human playtest feedback or two cloud deployment versions are claimed by local tests.
