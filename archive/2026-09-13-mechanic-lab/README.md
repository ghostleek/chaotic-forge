# Historical mechanic-lab and ModeShift archive

Archived on 13 September 2026 after the product moved to a competitive creation game. The active direction and delivery queue are the repository-root [PRD](../../PRD.md), [PLAN](../../PLAN.md), and [party issues](../../docs/issues/). Historical proposals, deadlines, owner assumptions, instructions and test notes in this folder do not override that direction or establish a current quality pass.

The existing mechanic-lab application remains the regression baseline until the party game is implemented. Its application source, domain code, tests, configuration and source corpus remain in their active locations. `CLAUDE.md` also stays at the root because it routes to the current `AGENTS.md`.

## What is preserved

| Material | Archived location | Why it is historical |
| --- | --- | --- |
| Mechanic-lab product contract and delivery plan | [PRD v0.2](./PRD-v0.2-mechanic-lab.md), [PLAN v0.2](./PLAN-v0.2-mechanic-lab.md) | The lab's G1–G4 behavior remains protected, while its delivery direction has been superseded. |
| Research basis and game-design field guide | [RESEARCH.md](./RESEARCH.md), [hackathon guide](./references/hackathon/README.md) | Earlier graph/lab and hackathon guidance, retained with its source attribution. |
| Twenty-packet showcase backlog and review | [MFH backlog](./mechanic-forge-split.md), [prior review](./mechanic-forge-pr-review.md) | The party PC packets replace the execution queue. Relevant runtime, provenance and review findings remain useful. |
| Product reconciliation and discovery | [ModeShift reconciliation](./mechanic-forge-product-reconciliation.md), [concept directions](./mechanic-forge-concept-directions.md), [original ideation transcript](./references/product-discovery/2026-09-13-forge-ideation.txt) | Intermediate direction choices and the user-provided source discussion. |
| Original ModeShift archive and full extracted comparison project | [ModeShift reference](./modeshift-reference/README.md) | Preserved comparison source, not the active application or proof of live game generation. |

All 1,080 moved files retain their exact pre-move bytes. [manifest.json](./manifest.json) records each original path, archived path, size and SHA-256. It also lists directory-level moves. Nothing was deleted from the imported project; the original ZIP retains the full supplied archive, including content excluded from the earlier extraction.

## Historical links and restoring a file

Archived documents were deliberately not rewritten. Their relative links and literal paths still describe their original locations under the repository root `/Users/kahhowlee/Documents/ChatGPT/mechanic-forge`. A root-level document's old `./references/...` link therefore describes the former root `references/` path, not a new active source tree. The original import manifest likewise records its extraction-time destination.

To locate a historical target, resolve its relative path against the original parent of the archived document, then look up that path in `manifest.json`. The map supplies the new location. Internal relative links within each moved directory continue to work when the complete directory was moved together. Root-level archived links to `PRD.md`, `PLAN.md`, `AGENTS.md` and `QUALITY.md` describe their names at the time of writing; consult the preserved v0.2 PRD/plan for the former lab contract, and the root documents for current project authority. Do not interpret a historical link as proof that today's file contents match its original context.

Restoration is reversible: copy a desired file from its `archived_path` to its `original_path` after checking for an existing file. Verify its SHA-256 against the manifest. Do not overwrite current active plans or source as a bulk restore operation.

## Build boundary

The application TypeScript and lint configurations explicitly exclude `archive/**`. The preserved comparison project remains readable without becoming part of the active build or app checks. No archived file was edited to achieve this separation. PC-01 still owns the broader host/Worker/database foundation; excluding references does not establish that the future party platform works.
