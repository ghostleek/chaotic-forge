# Mechanic Forge project rules

- Follow the current product direction in `PRD.md` and the selected packet in `PLAN.md`. Preserve the legacy G1–G4 Returnal dash flow in `archive/2026-09-13-mechanic-lab/PLAN-v0.2-mechanic-lab.md` and its behavioral tests.
- Preserve explicit Source, Forge interpretation, and User decision provenance.
- Never present simulated, preview, or local demo data as observed external evidence.
- Keep one hypothesis and one changed rule per legacy microplay test. The revised party loop follows the cumulative winner/loser additions specified in `PRD.md`.
- Do not expand the reference corpus, add account systems, or revive general graph editing. The revised party scope includes own-browser rooms and durable saved games as specified in `PRD.md`.
- Do not imply a live model call where the product uses deterministic local behavior.
- Treat tests as behavioral guarantees and keep the complete golden path covered.
- Run the exact gates in `QUALITY.md` before merging, including the final independent review.

The user approved mostly independent stacked PRs for Kahhow and Lance. Follow the explicit bases, shared-file ownership, serialized merges and revalidation policy in `PLAN.md`. Archived proposals and instructions are historical reference, not the active execution queue.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
