# Mechanic Forge project rules

- Follow the G1–G4 golden flow in `PLAN.md`; protect the single Returnal dash path first.
- Preserve explicit Source, Forge interpretation, and User decision provenance.
- Never present simulated, preview, or local demo data as observed external evidence.
- Keep one hypothesis and one changed rule per microplay test.
- During the hackathon, do not expand the corpus or add auth, persistence, or general graph editing.
- Do not imply a live model call where the product uses deterministic local behavior.
- Treat tests as behavioral guarantees and keep the complete golden path covered.
- Run the exact gates in `QUALITY.md` before merging, including the final independent review.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
