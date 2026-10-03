---
name: code-review
description: Review pull requests for Mechanic Forge (chaotic-forge), a Next.js/Vinext party-game generator on Cloudflare Workers + D1 with deterministic replay, authoritative party rooms and admin/BYOK-gated generation. Use when reviewing any PR in this repo.
---

# Reviewing chaotic-forge PRs

Read `AGENTS.md` first (product rules, provenance, the current access
decision) and `QUALITY.md` (merge gates). Check every changed line against
them. Also check that the PR stays inside the packet's allowed files and
ownership in `PLAN.md`.

Don't repeat what CI already enforces (`npm run lint`, `npm run build`).
CI does not yet run `npm run test:unit` or the Playwright suites, so ask
for a test in `tests/` when behavior changes.

## Bug classes this repo has actually shipped — check each one

1. **Who may spend the site key.** `81f35f8` narrowed site-key access to
   case-normalized admin emails; user-id admins could previously use it.
   Any change to `lib/party-forge/generation/billing.ts` or creator/auth
   routes: identity must come from the server session, never the client;
   `isAdmin` (site key) and `requireAdmin` (owner tools) must not be
   conflated; emails compared after `trim().toLowerCase()`.
2. **Stuck or duplicated generation jobs.** `19a6c61` added a lease
   (`PIXEL_JOB_LEASE_MS`) because a crashed `running` row blocked a recipe
   forever. Claims and reclaims must be a single conditional
   `INSERT … WHERE`/`UPDATE … WHERE status='running' AND created_at<=?`
   checked via `meta.changes`, not a read-then-write. Retries must reuse the
   `Idempotency-Key`, keep the 3-per-room and daily limits, and never charge
   twice for a recovered job.
3. **Incomplete model output treated as success.** `2b73ebb`: a Responses
   call that hit `max_output_tokens` was parsed as a recipe. Require
   `status === 'completed'` (`generationFailureReason`), schema-parse output,
   and return a clear reason for unsupported instructions. Recovery of old
   failures must only match the known terminal reason, never completed or
   uncertain jobs.
4. **Silently dropping or mis-matching player instructions.** `0a9b3d4` and
   `31dd8dc`: saved-demo matching must map *every* card (normalized via
   `normalizeInstruction`) or not match at all; custom modifiers must not
   reuse a saved permutation. Remixes must not overwrite rule fields owned by
   earlier instructions.
5. **Replay/score rules that break at edge states.** `d766b39`: rounds never
   finished when all players were eliminated early. Any change to
   `room-reducer.ts`, `score.ts` or a runtime must stay replay-verified
   (early finish only with three verified hits) and deterministic across
   Node, Chrome and workerd. Changing gameplay changes trace hashes: retained
   qualifications in `tests/` must be regenerated, not loosened.
6. **Room state invariants.** `26fae35`: pending evolution in `forging`
   lost the last completed build and its editor rights. Check `contracts.ts`
   schema refinements still hold for every phase a change touches.
7. **Timestamps and ordering.** `2631ed0`: archive `savedAt` must be
   `Math.max(Date.now(), snapshot.updatedAt)` so it never precedes the data.
   Watch for clock-based ordering elsewhere.
8. **CLI/argument validation.** `8296a92`: `remix-2` requires a
   grandparent and `remix-1` forbids one. New CLI stages need the same.

## Also flag

- Simulated, preview or cached demo data presented as observed evidence, or
  UI implying a live model call where behavior is deterministic (AGENTS.md).
- A schema change without an appended migration in `drizzle/`, or one that
  edits an existing migration.
- New env vars missing from `.env.example`; API keys or decrypted BYOK keys
  reaching logs, errors or responses (`pixel-generation.ts` filters
  messages containing `key`).
- New Oxlint rule exceptions that extend beyond the generated primitives
  listed in `QUALITY.md`.

## Using context

The GitHub MCP server is available read-only. Use it when the diff alone
isn't enough: read the full module around a change, the linked issue, and
earlier PRs that touched the same file (PC-xx packet PRs often explain why
code looks the way it does).

## Style of comments

One finding per comment, with the concrete failing input, room state or
request. Skip formatting and naming nits (oxlint/oxfmt own style).
