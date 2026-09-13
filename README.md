# Forge

Forge's revised direction is a competitive game-creation party: friends choose concept cards, Forge creates a playable mashup, and everyone competes. After each round, both the winner and loser add one mechanic. The group repeats until it ends, then saves the entire game for replay or remix.

**Product direction is documented; the party game is not implemented yet.** The current application remains the earlier mechanic-design lab with the G1–G4 Returnal dash journey. The imported ModeShift project is reference material, not the current application or a generic game generator.

## Current planning

- [PRD v0.3](./PRD.md): confirmed decisions, proposed demo rules, online journey, generation and saved-game contract.
- [Two-person delivery plan](./PLAN.md): Kahhow/Lance ownership and mostly independent stacked PRs, with an [issue publication index](./docs/issues/README.md).
- [OpenAI capability review](./docs/openai-capability-fit.md): Agents API for construction, GPT-Image-2.5 for assets, GPT-Live 1 for optional voice.
- [Quality gates](./QUALITY.md): required implementation checks and independent review.

The proposed first demo uses an explicitly authored FPS + zombies + cooking mashup. Actual on-the-fly generation remains a required later stage of the target product. The hand-sign AR jump quest and adaptive difficulty are preserved in separate packets.

Superseded plans, research, the earlier MFH backlog, and the complete ModeShift ZIP/import now live in the [dated archive](./archive/2026-09-13-mechanic-lab/README.md). The archive preserves their bytes and provenance; it is historical reference, not the active delivery queue. Old milestone/test notes are not a current verification pass.

## Repository today

The Next.js/React application contains the reference library, Returnal breakdown, one-rule Forge adaptation, deterministic creator microplay, and a disclosed local tester/report walkthrough. Domain code is in `lib/mechanics/`; golden-flow checks are in `tests/mechanics.test.mjs` and `tests/browser/explore.spec.ts`.

The hosting configuration uses Sites with Vinext/Cloudflare, but currently declares no database or object-storage binding. Existing development/build/browser-test scripts use Next. Archived reference source is excluded from application TypeScript and lint checks. PC-01 must reconcile the host build/test path before the party stacks depend on it.

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
