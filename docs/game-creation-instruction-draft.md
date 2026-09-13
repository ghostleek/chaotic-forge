# Game creation instruction — compact contract

Status: accepted reusable documentation, 13 September 2026. This document does not update `AGENTS.md`, install a skill, change runtime prompts or start API work. Apply only the mode and scope the user accepts. [PC-12](./issues/PC-12.md) is the concrete example.

## Reusable instruction

> Create the smallest testable game that makes every selected concept change player behavior. Preserve explicit Source, Forge interpretation and User decision.
>
> In PLAN mode, propose the core loop, minimum input/state, mechanic interactions, existing scaffold, changed files and behavioral checks. Mark assumptions as proposed and stop before implementation or publication.
>
> In BUILD mode, read the required project guidance and the relevant runtime contract/tests. Reuse working input, simulation, rendering and lifecycle code. Implement only missing rules and necessary glue. Prefer ordinary functions and data; add abstractions or dependencies only for a demonstrated need. If the scaffold cannot express a concept, report the mismatch rather than dropping it.
>
> Every concept needs an observable executable effect and a behavioral check. Use deterministic updates and retain the exact executable, recipe, assets and version. Preserve prior accepted rules on remix. Keep authored/configured examples distinct from newly generated gameplay and observed results distinct from fixtures.
>
> Follow the host's execution boundary. Load only applicable skills/references; use targeted reads, scoped patches and executable checks. Return concise failures for repair. Run the required quality gates and independent review; report what actually ran. Do not substitute a description, animation or parameter label for a working mechanic.

## Dino × Mario task suffix

> Mode: BUILD. Implement the accepted authored onboarding demo combining an auto-scrolling Dino-style runner with Mario-inspired stomp bounce. One logical input: Jump. Blocks lose on contact; landing on a walker while descending removes it and bounces upward; other walker contact loses. Use one fixed short course, original geometric art, explicit start, pause and restart. Label it “Simulated demo · fixed authored example.” Preserve existing party, creator and legacy flows. Use base `1dbccea77d4d2707328c704f1d20be8aabc3b2ac` and the file boundaries in PC-12. Run focused behavioral/browser checks and every QUALITY.md gate, then prepare the separate PR. No merge, deployment, API job or installed skill is included.

After acceptance, rewrite the task suffix for BUILD: replace “Propose” with the accepted implementation outcome, remove the planning-only implementation stop, and include the approved base, files and checks. Preserve any publication limit unless publication is also authorized. Do not resend the complete conversation or turn this one-input example into a universal restriction for all games.

## Specific tool and skill routing

| Task | Concrete call or skill | Why it helps |
| --- | --- | --- |
| Find the existing contract | `functions.exec` → `tools.exec_command` with `rg --files`, then `rg -n` and bounded reads | Retrieves relevant interfaces and required guidance without printing the whole repository. Batch independent reads with `Promise.allSettled`; inspect every result. |
| Inspect or adjust pure gameplay | Read the domain module and its tests; use `tools.apply_patch` | Small patches preserve tested scaffolding and reduce repeated code output. Pure state/math work needs no framework skill. |
| Integrate a route or client component | Read `vercel:nextjs` and the relevant installed Next.js guide once | Loads framework rules only when files actually use them. Preserve the existing Vinext/Cloudflare target. |
| Validate the rule | `tools.exec_command`: focused Node behavioral tests, then required project gates | Deterministic collision/replay checks give concrete repair feedback. Keep full logs on disk and return relevant failures/counts. |
| Check the player and popup | `vercel:agent-browser` with open → snapshot → interact → screenshot; repository Playwright fallback | One browser workflow for keyboard/touch/focus, no API calls and visible rule behavior. Use screenshots for actual visual questions, not every frame. Apply verification skills when their triggers match. |
| Review several TSX changes | `vercel:react-best-practices` | A focused React review after the relevant edits. Do not load a component-library skill for native controls. |
| Check current model/API behavior | `openai-docs`; official documentation search/open only for the question at hand | Avoids inventing SDK features. No live API request is needed for planning. Keep the user's chosen model unless a change is separately accepted. |
| Maintain this reusable workflow later | `skill-creator` | Put a short entry instruction in one skill and load a relevant kernel contract only when needed. Do not install it during PLAN mode. |
| Final independent review | `collaboration.spawn_agent` with the diff, accepted contract and concise test results | Satisfies independent review without requiring several agents to independently rebuild this small game. Parallel work is useful only with separable file ownership. |

OpenAI documents on-demand skill loading: discovery uses the name/description before loading full instructions. Keep the invariant contract short and put task-specific examples in referenced files. This is a context-management technique, not a guaranteed savings percentage. [Official skill documentation](https://learn.chatgpt.com/docs/build-skills).

## Applying the pattern to later runtime generation

The current local `generationRequest` in `scripts/forge/runner.mjs` already asks for Worker JavaScript and lets Forge own the renderer. Its next proposed optimization is **tested scaffold + requested mechanic change**, rather than a larger universal prompt or a new framework. No runner edit is included in the planning task.

1. Keep stable host protocol, retained-source rules and output contract in one place. Supply the exact scaffold/parent in the sandbox. A path by itself is not usable context unless the file is actually available there.
2. Supply a compact task suffix: selected concepts, actual interpretation, parent version, preserved rules, requested delta and acceptance witnesses. Ask the model to change executable behavior and its tests, then emit the complete accepted artifact. Do not regenerate the application shell.
3. Let deterministic tools validate schema, compile/bundle, run behavioral witnesses and collect hashes. Return the failing witness and necessary context for a bounded repair. Retain full logs and executable bytes outside conversational output.
4. Use one generation worker by default for this small task. Desktop skills/tools are not automatically provided to the runtime agent; package needed files/scripts explicitly and verify the actual Agents API integration before relying on them.
5. A small tool set can be loaded directly. If the future catalog becomes large, Agents API supports `tool_search` with `defer_loading: true` for selected functions. Discovery adds a step; it is not an optimization for a tiny toolkit. Do not copy Responses API MCP configuration into Agents API. [Official tool-search guide](https://developers.openai.com/api/docs/guides/tools-tool-search).
6. Preserve stable prompt prefixes and place changing task content later when compatible with the chosen API. Caching can improve input cost/latency, but does not shorten output code or prove lower total token use. Eligibility, cache-write costs and API-specific configuration matter; verify support in the chosen Agents API path before changing it. Do not pad a short prompt merely to qualify. [Official prompt-caching guide](https://developers.openai.com/api/docs/guides/prompt-caching).

A fixed preset selected by a model is still a configured game. This runner is one example scaffold; arbitrary concepts require a suitable implementation, and generation acceptance still requires actual new executable effects. All generated bytes continue through the accepted isolation and validation boundaries. No secrets or unrestricted app-origin execution are introduced by the optimization.

## How to establish whether it saves tokens

Proposed later benchmark, subject to accepted live-call access and budget: compare the existing full-game request against scaffold-plus-delta on the same initial game and two small remixes, using the same model/settings and equivalent behavior checks. Count the one-time scaffold creation separately and include it when reporting a cold first game; show amortized results across later games. Include failed attempts and repair turns, not only successes.

Record total input/output tokens, available cached-input/cache-write/reasoning fields, tool-output volume, attempts, wall time, observed cost and accepted behavioral witnesses. The main measures are **tokens and cost per accepted playable artifact**, plus first-pass success rate. Mark unavailable provider fields as unavailable. Smaller source files or fewer calls alone do not establish a better result. Repeat enough comparable tasks to distinguish a stable improvement from one lucky run.

No percentage reduction, cost ceiling, or API benchmark result is claimed here. The current runner's polling-based token cancellation is not a guaranteed hard spending cap. Public authored-demo play remains local and makes zero generation requests by design; browser verification must establish that behavior after implementation.
