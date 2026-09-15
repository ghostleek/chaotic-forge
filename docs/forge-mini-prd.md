---
created: 2026-09-13
date: 2026-09-13
type: planning
status: implementing
---
# Chaotic Forge — access, predictable demos and generation

## Product outcome

Friends combine instruction cards, play matched games, and remix the outcome. The public can play saved demos without signing in. Paid generation requires a signed-in user’s own OpenAI API key, except for these three authenticated admins: kahhow@string.sg, leekahhow@gmail.com, lancetyw@gmail.com. Admins use the site’s existing API key. This latest user decision replaces the broader trial-whitelist proposal.

## Walkthrough for the demo

1. Open the public lobby. Two players can join; a third is optional.
2. Click Snake and Space Invaders starters on the respective cards. Read the explanation and confirm each card. The order does not matter, and a third player can repeat either reference.
3. Forge rebinds the retained saved recipe to these participants. It makes no new model request. Review the rule mappings and start the matched round.
4. Try Bounce, Wraparound, Invader obstacles, or High stakes for a custom request. The person initiating paid generation must first sign in via ChatGPT. Admins use the site key; everyone else saves their own key under Sign in / API access.
5. Replay uses the saved rules and exact executable, seed, inputs and scoring version. It does not regenerate a potentially different game.

## Technical choices and why

| Choice | Reason and practical boundary |
| --- | --- |
| Sites-owned ChatGPT sign-in | The hosting dispatcher authenticates visitors and strips caller-supplied identity headers. App authorization checks the authenticated email against the explicit server allowlist. Stable user IDs own keys and private builds. Never expose this Worker through a proxy that trusts arbitrary identity headers. |
| GPT-6 Astra Responses API for current party games | Returns a validated bounded rule recipe for the existing Snake/Invaders/Bounce engine. This is rule generation, not arbitrary executable generation. One unique room/recipe job prevents duplicate paid calls; the client does not receive the site key. |
| Separate Agents API creator | Writes executable worker code, keeps exact outputs and runs a sandbox validator. It requires a supervised operator runner. It remains disabled until that runner is configured and live-qualified; deploying the interface does not make it operational. |
| AES-256-GCM BYOK storage | Keys are encrypted at rest with a separate server secret and owner-bound authentication. Only the trusted server/runner decrypts them. No key is returned to the browser or generated game. Removing a key prevents future use; already submitted synchronous Responses calls may finish. |
| Exact saved-pattern matching | Snake + Space Invaders, in either order and with a repeated third card, uses retained output without model spending. Extra words must not silently match. Custom modifiers require explicit paid authorization. |
| Bounded rule vocabulary | Runtime validation rejects unsupported audio/rhythm controls and invalid mappings before claiming successful play. Deterministic execution makes score replay inspectable. |
| Limits and duplicate handling | Existing three-attempt room cap remains; paid pixel generation also reserves at most 20 successful job claims per authenticated user/day. Failures consume an allocation; duplicate recipe claims do not purchase another call. These are request limits, not a guaranteed dollar budget. |

## Test patterns

All eight valid two/three-player Snake–Invaders orderings are replayed with seeds 1, 73 and 991, comparing complete deterministic snapshots. Tests preserve contribution order and provenance while asserting zero database/model calls on saved-pattern resolution. Additional cases cover case/punctuation aliases, custom wrapping and food modifiers that must miss the cache, and unsupported audio/rhythm that must fail before a paid call. These are local behavioral tests, not claims of new live model generation.

Starter buttons prefill only. They show both visible explanatory text and hover help. They never auto-confirm a card or spend money.

## Acceptance and release

Preserve the production party lobby, room APIs, historical runtimes and migrations. Preserve the G1–G4 mechanic lab at /explore. Run lint, production build, full unit/browser suite, real Worker/storage checks and independent adversarial review. Test deployed anonymous access and identity-header spoof rejection; verify admin behavior using a real authenticated session when available.

Owner: Kahhow for UX and acceptance; Lance for backend, shared files and data. Implementer: Codex; independent review is required. Deployment uses the current Site source, not the older local checkout. No GitHub PR is created by this note. Rollback uses the prior Site version; keep appended data migrations and encrypted keys, disable generation if qualification fails.

## Current delivery status

Implementation passed 183 unit tests, 24 full browser checks, 2 additional starter-button checks, and an independent review. Final storage checks and production verification are in progress. Deployment outcome will be appended here. The mobile follow-up is scheduled in Codex; device notification delivery depends on the app’s notification settings.

Four additional custom gameplay patterns have local deterministic runtime fixtures: wrapping Snake, ricochet Invaders, valuable-food Bounce, and Snake hit penalties. Each is checked at three seeds. These validate executable rules, not whether a live model will interpret every phrasing correctly.

## Public Snake remix correction — 14 September 2026

The direct Snake/Invaders demo link had incorrectly opened a separately authored game. It now uses the already-retained `Snake Invaders: Eat 10, Blast 25` rule output and the same three-life pixel engine used by the party demo. Food is worth 10 points, aliens 25, and shooting automatically follows travel direction. Standalone practice uses seed 73 and repeats that setup on restart. It requires no login or key and makes no generation request. Display cards explain the saved source; they do not claim new player contributions or a new model call. The Dino demo and paid-generation access policy are preserved.
