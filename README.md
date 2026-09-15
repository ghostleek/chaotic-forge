# Forge

Forge's revised direction is a competitive game-creation party: friends choose concept cards, Forge creates a playable mashup, and everyone competes. After each round, both the winner and loser add one mechanic. The group repeats until it ends, then saves the entire game for replay or remix.

**The current application now ships the bounded party product.** The homepage is the party lobby, the repository includes authenticated Forge creation for the retained pixel runtime, durable rooms and saved archives, and the preserved G1–G4 Returnal dash journey. The imported ModeShift project remains reference material, not the current application or a generic game generator.

## Current planning

- [PRD v0.3](./PRD.md): confirmed decisions, proposed demo rules, online journey, generation and saved-game contract.
- [Two-person delivery plan](./PLAN.md): Kahhow/Lance ownership and mostly independent stacked PRs, with an [issue publication index](./docs/issues/README.md).
- [OpenAI capability review](./docs/openai-capability-fit.md): Agents API for construction, GPT-Image-2.5 for assets, GPT-Live 1 for optional voice.
- [Quality gates](./QUALITY.md): required implementation checks and independent review.

The current demo uses the retained Snake/Invaders/Bounce runtime with public saved play, deterministic preset reuse, and protected paid generation. Broader open-ended on-the-fly mashup generation remains a required later PC-09 stage of the target product. The hand-sign AR jump quest and adaptive difficulty are preserved in separate packets.

Superseded plans, research, the earlier MFH backlog, and the complete ModeShift ZIP/import now live in the [dated archive](./archive/2026-09-13-mechanic-lab/README.md). The archive preserves their bytes and provenance; it is historical reference, not the active delivery queue. Old milestone/test notes are not a current verification pass.

## Repository today

The Next.js/React application now includes the party lobby, room lifecycle, protected Forge creation flow, authoritative room/archive services, retained pixel runtime variants, saved replay/remix flows, and the preserved mechanic-lab reference pages. Party domain code lives in `lib/party-forge/`; the retained mechanic-lab code remains in `lib/mechanics/`. Behavioral coverage includes the party/unit suites in `tests/party-*.test.mjs`, `tests/pixel-*.test.mjs`, `tests/forge-*.test.mjs`, and browser coverage in `tests/browser/`.

The hosting configuration uses Sites with Vinext/Cloudflare and now declares the logical `DB` D1 and `FORGE_ARTIFACTS` R2 bindings used by the party and creation flows. Local scripts include the built-host and database gates in `package.json`, including `npm run build:worker`, `npm run db:migrate:local`, and `npm run test:party`. Archived reference source remains excluded from active application TypeScript and lint checks.

## Local development

Use Node.js 24 as declared in `package.json`.

```bash
npm install
npm run dev
```

Existing checks:

```bash
npm run lint
npm run build
npm test
```

Follow [AGENTS.md](./AGENTS.md) and the selected issue's file boundaries before implementation. [PC-01 / issue #30](https://github.com/ghostleek/chaotic-forge/issues/30) is assigned to Lance (@Leoendithas). PC-02–11 are queued for publication after the main-branch sync; their specifications and intended owners are in [the issue index](./docs/issues/README.md).
