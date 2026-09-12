# Mechanic Forge Product Requirements Document

**Status:** Golden-flow implementation specification

**Version:** 0.2

**Last updated:** 2026-09-12  
**Initial target:** Solo developers and small PC/console game teams, beginning with action-game combat and mobility mechanics

## 1. Product decision

Mechanic Forge will be an evidence-oriented mechanic design workspace, not a generic node editor and not a passive mechanics encyclopedia.

The product promise is:

> Find proven gameplay patterns, understand why they work, forge a version for your game, and run the smallest credible test before committing production time.

The primary journey is:

```text
Design problem
  -> relevant mechanics and real-game implementations
  -> comparison of causal patterns and trade-offs
  -> fork into a mechanic specification
  -> create a control and mutation
  -> generate or configure a microplay
  -> share an unlisted playtest
  -> review observed evidence
  -> keep, revise, or reject the mechanic
```

The Mobbin-like reference library is the acquisition and activation layer. The Forge specification is the core authoring layer. Shareable microplays and their evidence reports close the decision loop and are the long-term differentiator.

The node graph remains available as a generated **System Map**. It is not the default starting point, and it must not claim to simulate behavior unless its rules are actually executable.

## 2. Problem

Game designers regularly move between scattered references, intuition, design documents, engine prototypes, spreadsheets, and playtests. Existing products solve individual parts of this workflow, but the handoffs remain expensive:

- Reference libraries show what exists but rarely explain the causal structure or help adapt it.
- AI ideation tools produce plausible ideas without reliable provenance or evidence.
- Visual system tools require designers to formalize a model before receiving value.
- Prompt-to-game tools implement an idea before helping the designer isolate what should be tested.
- Playtesting services validate a build only after a prototype exists.

The result is that teams either prototype too much, argue from taste, or accept ungrounded AI output.

## 3. Market context and product gap

Mechanic Forge enters a market with strong adjacent products:

- [GameRefinery](https://www.gamerefinery.com/game-intelligence-tools/) provides mobile-game feature intelligence, deconstructions, market comparisons, and performance data.
- [Game Design Index](https://blazium-games.github.io/game-design-index/) provides an open, structured index of games, mechanics, variables, genre recipes, and relationships.
- [SteamMaho](https://steammaho.com/mechanics) and [Game Mechanics](https://gamemechanics.org/) provide broad searchable mechanic catalogs and examples.
- [Machinations](https://machinations.io/homepage) provides visual economic-system modeling, execution, prediction, and balancing.
- [Ludo.ai](https://ludo.ai/features/game-ideator) provides AI ideation, reference games, concept development, and game-design documents.
- [Summer Engine](https://www.summerengine.com/ai-game-maker), [Rosebud](https://rosebud.ai/ai-game-creator), and game engines provide increasingly fast prompt-to-playable implementation.
- [PlaytestCloud](https://www.playtestcloud.com/product) and [modl.ai](https://modl.ai/company) provide human or automated testing once a playable build exists.

Mechanic Forge should not compete on catalog size, node-editor flexibility, or one-prompt game generation. The defensible gap is the connected workflow from behavior-oriented research to a traceable design decision.

## 4. Target customer

### Primary persona: hands-on game designer

- Works alone or in a small team.
- Owns a feature from concept through prototype.
- Can discuss mechanics and player behavior but may not be able to build every experiment quickly.
- Uses videos, wikis, design breakdowns, spreadsheets, engine prototypes, and general-purpose AI.
- Needs to communicate why a mechanic should work and how the team will know.

### Secondary persona: design lead or creative director

- Reviews proposed mechanics and compares variants.
- Wants a concise causal explanation, risks, and evidence rather than another long design document.
- Needs asynchronous review without installing a build or learning a modeling tool.

### Initial vertical

Start with combat and mobility loops in action games and roguelites. This makes the corpus achievable, aligns with the existing dash experiment, and allows several mechanics to be represented as short browser-based microplays.

Mobile free-to-play LiveOps and macro-economy design are explicitly not the initial wedge because GameRefinery and Machinations are already strong there.

## 5. Jobs to be done

1. When I know the player behavior I want, help me find games and mechanics that achieved something similar.
2. When several games use the same broad mechanic, show me how their implementations and trade-offs differ.
3. When I choose a reference, help me adapt it without copying its surface treatment or losing its causal logic.
4. When I propose a change, isolate it as a control and mutation with explicit invariants.
5. When I need feedback, let someone experience the mechanic in minutes without installing a build.
6. When the test ends, separate observed evidence from assumptions and recommend the next decision—not a fabricated conclusion.

## 6. Product principles

### Behavior before implementation

Start from the desired player behavior or design problem, not a node type or code request.

### Reference before generation

Generated suggestions should cite curated mechanic patterns and real implementations wherever possible.

### One hypothesis per test

A microplay changes one important rule while holding the rest of the test contract stable.

### Evidence has provenance

Every conclusion is labeled as one of:

- **Design hypothesis:** reasoned but untested.
- **Model forecast:** derived from an explicit model and assumptions.
- **Automated observation:** recorded from an executable simulation or bot.
- **Human observation:** recorded from a playtest session.

Model-generated percentages must never be presented as observed outcomes.

### Progressive formalization

The product begins with plain-language references and comparisons. Structured atoms and the System Map appear only when they help adaptation, testing, or export.

### Private by default

Unreleased mechanics and microplays use unlisted links by default, with clear visibility, expiry, and deletion controls.

## 7. Core information model

### Game

A sourced reference title with genre, platform, release context, and implementation records.

### Mechanic pattern

A reusable design solution organized around a player behavior or design problem. It includes:

- desired behavior and experience;
- trigger and guard;
- state transformation;
- interaction topology;
- feedback and discoverability;
- cost, risk, counterplay, and fairness boundaries;
- tunable variables and dependencies;
- suitable metrics;
- related and conflicting patterns.

The existing intent, trigger, guard, transform, interaction, feedback, risk, invariant, and evidence contract remains useful as the internal schema. Terms such as `actum`, `tactum`, and `factum` should not be required user vocabulary.

### Implementation

How one real game instantiates a mechanic pattern, supported by source links, annotated stills or clips where rights permit, and an explanation of what differs from the general pattern.

### Mechanic specification

The user's forked version of a pattern, including project context, intended behavior, rules, tunables, dependencies, risks, invariants, and unresolved assumptions.

### Variant

A control or mutation of a mechanic specification. The difference between variants must be explicit and reviewable.

### Microplay

A browser-playable, instrumented experiment designed to test one mechanic hypothesis in less than three minutes. A microplay is not a vertical slice or a promise of production-ready code.

### Evidence report

The combined record of test configuration, assignments, telemetry, responses, limitations, and the resulting keep/revise/reject decision.

## 8. Required product areas

### 8.1 Explore

Users can search with a mechanic name, desired player behavior, design problem, genre, or reference game.

Results must support filters for:

- behavior or experience;
- system family;
- genre and platform;
- loop timescale;
- single-player or multiplayer context;
- implementation complexity;
- required dependencies;
- common risks.

The default result should explain why it matched the query, not only show tags.

### 8.2 Mechanic and game reference pages

A mechanic page shows its causal contract, real implementations, trade-offs, tunables, related patterns, and sources. A game page shows how multiple patterns combine into its core and supporting loops.

Users can save an implementation, add it to a comparison, or fork the general pattern into Forge.

### 8.3 Compare

Users can compare two to four implementations along consistent dimensions. Differences that change player behavior, counterplay, complexity, or evidence requirements should be emphasized automatically.

### 8.4 Forge

Forking creates an editable mechanic specification. AI may propose missing fields, risks, and metrics, but generated content must remain distinguishable from sourced material and user decisions.

The first output is a readable design contract. A generated System Map is a secondary view. Freeform graph editing is not required for the first release.

### 8.5 Variant builder

Users can duplicate a specification as a mutation and see the exact changed rules. Variables declared invariant remain locked unless the user explicitly changes the test contract.

### 8.6 Microplay builder

For supported mechanic families, users can choose a tested microplay template, map specification variables to its controls, preview both variants, and confirm instrumentation.

Initial templates should be intentionally constrained. Suggested first templates:

1. Dash recharge and movement reward.
2. Rally, lifesteal, or recoverable health.
3. Stagger, parry, or timing-window risk/reward.

Unsupported mechanics receive a generated test plan instead of a fake playable simulation.

### 8.7 Shareable validation

Shareability is part of the core validation flow.

The minimum share experience must include:

- unlisted browser link with no account required for testers;
- authenticated creator ownership for publishing, managing links, and viewing results;
- mobile/desktop capability declaration before publishing;
- a within-subject crossover in which each tester plays both variants once;
- balanced `control -> mutation` and `mutation -> control` ordering that is assigned once and remains stable across reloads;
- optional blind mode that hides the hypothesis and variant names;
- short task framing and consent notice;
- automatic capture of completion, retries, time, core mechanic events, and variant assignment;
- a structured post-play response with preference, confidence, comprehension, and one free-text explanation;
- link pause, mandatory expiry no later than 30 days after publishing, and deletion;
- creator preview sessions excluded from results;
- a clear invitation for the reviewer to inspect or fork the public pattern only after completing the test.

Public indexing, comments, embeds, remix chains, and custom branding are later enhancements. Sharing must first optimize for low-bias evidence and creator trust, not virality.

#### P0 experiment protocol

- The server creates an opaque participant ID on the tester's first visit and stores a scoped first-party token for that microplay.
- The share route can read only the published test contract. Aggregate results, project context, and creator controls require the authenticated owning creator.
- The participant is assigned to the currently smaller of two order buckets, with a random tie-break. The assignment is immutable for that experiment version.
- A test session contains both assigned variant runs and one post-play response. Reloading resumes the incomplete session instead of creating a new assignment.
- A **valid paired session** requires minimum exposure or the declared completion event for both variants, a completed response, a consistent experiment version, and no creator-preview, known automation, or duplicate flag.
- Abandoned sessions remain visible as funnel evidence but are excluded from paired behavior and preference comparisons.
- The first valid paired session per participant is used for the primary comparison. Later completions are labeled repeats and excluded unless the creator deliberately starts a retest cohort.
- Clearing local state may create a new participant token. P0 duplicate detection uses the token plus conservative rate and event-pattern checks; it must not rely on invasive device fingerprinting.
- Automated traffic and impossible event sequences are excluded and shown in an exclusion count. Ambiguous sessions remain visible but are not silently discarded.
- Partial responses are reported as missing data. The product must not impute preference, comprehension, or completion.
- Small samples are summarized descriptively. The P0 report does not claim statistical significance or generalize beyond the tested microplay and audience.

#### P0 privacy and data lifecycle

- Before play begins, the consent screen identifies the creator, explains the captured events and response fields, and requires an affirmative start action.
- P0 tests are for participants aged 18 or older. Creators must not knowingly target minors until a separate child-safety and consent design is approved.
- The research dataset stores only an opaque microplay-scoped participant ID, experiment and template versions, variant order, event names and elapsed times, completion state, coarse device compatibility, consent time, response selections, optional free text, and any exclusion reason.
- The research dataset must not store tester names, email addresses, full IP addresses, exact location, advertising IDs, or invasive device fingerprints.
- Abuse protection may store only a daily-rotated keyed network-address hash, coarse user-agent family, request timestamps and counts, and an allow/block reason. It is isolated from research data, cannot be reused across experiments, and is deleted within 24 hours.
- Tester data is used only to run the test, preserve assignment, detect conservative duplicates or automation, and produce the creator's evidence report.
- Every P0 share link expires no later than 30 days after publishing. Raw session and response data is deleted 90 days after collection even if the link remains active; expiry does not extend retention.
- After raw deletion, only de-identified aggregate counts, rates, and the recorded decision may remain until creator deletion. Free text and the participant-to-contribution link are deleted, so later withdrawal is no longer possible; the consent notice must disclose this 90-day withdrawal window.
- Pausing a link stops new sessions but preserves existing evidence. Deleting an experiment cascade-deletes its link, raw sessions, responses, aggregates, and recorded decision.
- The share route exposes a token-scoped `Delete my test data` action before play, during an active or resumed session, and after completion for the 90-day raw-data window. Withdrawal removes that participant's telemetry and response and recomputes the report.
- Optional free text warns testers not to include personal, confidential, or identifying information. Leaving it blank does not invalidate an otherwise complete session.
- These controls must be verified before external share links are enabled.

### 8.8 Evidence and decision

The evidence report compares variants, displays sample size and uncertainty, surfaces comprehension failures, and separates telemetry from self-report.

It must never declare a mechanic universally better. The creator records one decision:

- keep the mutation;
- keep the control;
- revise and retest;
- reject both;
- inconclusive.

Every decision retains the test configuration and limitations that produced it.

### 8.9 Export

The initial release exports:

- mechanic specification as Markdown;
- structured JSON using the Mechanic Forge schema;
- telemetry event plan;
- playtest brief and evidence summary.

Engine-specific resources and plugins follow only after validation of the core workflow.

### 8.10 Hackathon golden flow

The first complete product slice uses one recognizable game and one mechanic:

```text
Popular games
  -> Returnal
  -> Projectile-phasing dash
  -> mechanic breakdown
  -> adapt one rule
  -> creator A/B preview
  -> blind tester flow
  -> evidence report
  -> keep, revise, reject, or inconclusive
```

This slice is a product prototype, not evidence that the Stage 0 or Stage 1 gates have passed. It may use fixed content and a single supported template, but every visible action must be honest about whether it is functional, simulated, or pending durable infrastructure.

#### Discovery model

Explore borrows Mobbin's information-architecture pattern without copying its visual design: users can browse recognizable games first, then inspect the mechanics contained within each game. The default browse modes are **Popular games**, **Mechanics**, and **Behaviors**. Search continues to accept game names, mechanic names, and desired player behavior as equivalent entry points into the same detail records.

The first viewport must prioritize useful browsing over internal research language. It uses the promise **Start with a game. Leave with a testable mechanic.** and describes the corpus as a curated beta library. Behavior, Game, and System are the default refinement controls; advanced taxonomy remains available through progressive disclosure.

#### Reference-to-adaptation trust model

Every mechanic breakdown visibly separates:

1. **From the source:** statements directly supported by the linked first-party or publisher material.
2. **Forge interpretation:** causal structure, trade-offs, risks, dependencies, and evidence suggestions inferred by the product.
3. **Your decision:** the creator's adaptation or experiment rule.

The initial Returnal reference supports projectile-phasing dash behavior. It does not establish the experimental recharge rules. The timer control must therefore be labelled **Experiment baseline — Forge-defined**, while elimination recharge is labelled **Your decision**. Neither may be presented as Returnal's implementation.

#### Returnal and dash pages

The Returnal page groups its two current implementation records—Projectile-phasing dash and Adrenaline tiers—under one recognizable game context. It uses original interface diagrams rather than unlicensed gameplay captures and links back to the official source.

The dash page presents the sourced behavior followed by a plain-language causal breakdown: goal, activation, availability, state change, interaction, feedback, trade-off, invariants, tunables, and observable evidence. Its primary action is **Adapt this mechanic**; **View official source** remains secondary.

#### One-rule experiment contract

The adapted goal is **Reward aggressive movement without increasing weapon damage.** Only dash recharge changes:

- Control A: recharge after three seconds.
- Variant B: recharge on enemy elimination.
- Locked conditions: dash distance, protected window, player speed, weapon damage, arena, enemies, seed, and run duration.

The interface states **One rule changes. Everything else stays matched.** Before preview, it surfaces the win-more and recovery-lockout risks created by elimination recharge.

#### Preview, sharing, and evidence

The creator plays sequential runs rather than side-by-side arenas. The task is to cross projectile lanes and eliminate three targets. Preview runs are explicitly excluded from evidence, use the same seed, and explain the single changed rule before play.

The safe default publish contract is blind variants, two 45-second runs, desktop keyboard, unlisted access, seven-day expiry, no tester account, and creator previews excluded. Until creator ownership and durable experiment storage exist, this screen must say **Demo publish preview** and must not imply that an external test or evidence collection is live.

The tester journey is consent, Run 1, reset, Run 2, structured response, and completion. The report separates observed behavior from preference, states sample limitations, and lets the creator record **Keep**, **Revise**, **Reject**, or **Inconclusive** without the product choosing for them.

#### Golden-flow acceptance criteria

- A user can enter through Returnal or the behavior “move through danger” and reach the same dash breakdown.
- Search submission and suggestion selection move focus to the updated result set and announce the match count.
- Every reference card has a clear next action; no primary journey terminates at an external source.
- A user can correctly identify sourced fact, Forge interpretation, and their own decision in an unaided review.
- The adaptation screen shows exactly one changed rule and every locked condition.
- The creator can preview A and B under the same stated conditions without builder assistance.
- Publishing is labelled as a demo until ownership, storage, expiry, withdrawal, and result access are functional.
- The final report never presents preference as behavioral evidence or a small sample as a general conclusion.

## 9. End-to-end acceptance scenario

Given the intent “make dashing reward aggressive play without increasing weapon damage,” a new user can:

1. Browse Returnal or search for “move through danger.”
2. Open the Projectile-phasing dash implementation and distinguish its sourced behavior from Forge interpretation.
3. Choose **Adapt this mechanic** and start from a readable mechanic contract.
4. Change dash recharge from a Forge-defined timer baseline to an elimination event.
5. Verify that one rule changed while movement speed, damage, dash behavior, arena, opponents, seed, and duration remain locked.
6. Review the resulting win-more and recovery-lockout risks.
7. Preview both variants sequentially under the same conditions.
8. Prepare or publish an honestly labelled unlisted blind A/B test.
9. Review observed behavioral evidence separately from preference.
10. Record a keep, revise, reject, or inconclusive decision and export the result.

## 10. Success metrics

### North-star metric

**Evidence-backed mechanic decisions completed per active team per month.**

A completed decision requires a forked specification, an explicit hypothesis, a test result or documented external evidence, and a recorded decision.

### Funnel metrics

- Time from first query to a useful saved or compared reference.
- Search-to-reference-open rate.
- Reference-to-compare rate.
- Compare-to-fork rate.
- Specification-to-test-plan or microplay rate.
- Microplay publish and share rate.
- Valid tester sessions per shared microplay.
- Evidence-report-to-recorded-decision rate.
- Retest rate after a “revise” decision.

### Initial validation targets

These are product hypotheses, not forecasts:

- 8 of 12 recruited target designers find a relevant reference within three minutes.
- At least 5 of 12 evaluators fork a reference rather than stopping after browsing.
- At least one-third of eligible designers with a supported mechanic choose a browser microplay as their next validation artifact over a test-plan-only or engine-ready handoff, with at least six eligible designers required.
- At least 30% of supported forks become a shared microplay within the Stage 2 measurement window.
- The median shared microplay receives five valid sessions within seven days.
- At least half of creators whose microplay receives five valid sessions record a decision within seven days of the fifth session.

The Stage 2 conversion targets are evaluated on one documented 60-day cohort after the complete sharing and evidence loop ships. The cohort must contain at least 20 eligible supported forks and at least 10 creators whose tests reach five valid sessions; otherwise the result is “insufficient evidence,” not a pass. The product lead owns the gate decision and records the cohort definition, counts, exclusions, and outcome in the changelog.

## 11. Non-goals for the first release

- Universal coverage of every game genre or mechanic.
- A canonical academic grammar for all game design.
- Production-ready game or asset generation.
- A general-purpose visual scripting environment.
- Quantitative behavioral prediction without an executable model.
- Replacement for human playtesting or a full game engine.
- A public social network or marketplace of unreleased ideas.
- Enterprise mobile-market intelligence.

## 12. Risks and mitigations

### Corpus operations and copyright

High-quality implementations require continuous research and careful media rights. Begin with sourced written analysis, original diagrams, permitted captures, and links or timestamps to primary material. Do not build the product around indiscriminate scraping or rehosting.

### Ontology rigidity

One grammar will not fit every game. Preserve provenance, allow unknowns, and use system-specific extensions rather than forcing all designs into nine visible boxes.

### False authority from AI

Distinguish source, inference, user choice, forecast, and observation visually and in exported data.

### Microplay validity

A simplified experiment can strip away context that makes the mechanic meaningful. Every report must show what the microplay holds constant, what it omits, and which claims it cannot support.

### Cold-start sharing

Creators may not have testers. First support frictionless links to their own community; later consider opt-in tester exchange or a paid panel partnership.

### Scope creep into an engine

Only add a new playable template when it supports a repeated design question and shares the same evidence contract. Unsupported mechanics get test plans, not one-off mini-games.

## 13. Open questions to validate

1. Do target designers search more naturally by desired behavior, mechanic name, or reference game?
2. Is the strongest initial vertical action combat, roguelite progression, or another narrow category?
3. Does a structured comparison provide enough value over a general AI chat answer to trigger a fork?
4. Which artifact is most useful after Forge: a test plan, a browser microplay, or an engine-ready specification?
5. Will testers complete a blind two-variant microplay without creator facilitation?
6. What level of source evidence is required for professional trust?
7. Are studios comfortable sharing unlisted prototypes, and which privacy controls are mandatory?

## 14. Changelog

### 2026-09-12 — Golden-flow PR G2 implementation

- Made the dash design goal and the single Variant B recharge decision editable.
- Added three bounded recharge choices while preserving one changed field and seven locked conditions.
- Added session-local save feedback plus Markdown and JSON experiment exports.
- Required both exports to retain the source boundary, Forge-defined baseline, user decision, risks, invariants, and evidence plan.

### 2026-09-12 — Returnal dash golden flow

- Added a Mobbin-inspired browse hierarchy from popular games to mechanics while retaining behavior-first search.
- Selected Returnal's projectile-phasing dash as the single hackathon golden path.
- Defined the source, Forge interpretation, and user-decision trust states.
- Clarified that timer and elimination recharge rules are Forge experiment variants, not sourced claims about Returnal.
- Specified the one-rule A/B contract, locked conditions, creator preview, demo publishing boundary, tester sequence, evidence separation, and decision states.
- Added explicit acceptance criteria for every transition from discovery through decision.

### 2026-09-12 — Adversarial review amendments

- Split the small Stage 0 validation corpus from post-validation production corpus expansion.
- Added an explicit demand gate before investing in the microplay runtime.
- Defined a reproducible within-subject A/B protocol, stable assignment, validity and exclusion rules, repeat handling, and missing-data behavior.
- Reconciled export and unsupported-mechanic sequencing so every specification can produce a test plan before microplay support exists.
- Required creator authentication and ownership checks before publishing or reading results.
- Added an explicit tester consent, data-minimization, withdrawal, retention, and deletion contract for P0 sharing.
- Replaced subjective evidence gates with product-lead-owned, time-bounded cohorts, minimum samples, denominators, and pass thresholds.
- Capped P0 link life at 30 days and raw-data life at 90 days from collection, made withdrawal available throughout that window, and limited abuse metadata to a 24-hour allowlist.
- Made each additional microplay family demand-selected and made System Map work an independently gated optional PR.

### 2026-09-12 — Initial documented direction

- Created the first repository PRD because no prior PRD file existed.
- Repositioned Mechanic Forge from a Flowise-like node editor to an evidence-oriented mechanic design workflow.
- Added a Mobbin-like Explore and Compare layer as the product entry point.
- Retained the atom contract as an internal schema and demoted the graph to an optional generated System Map.
- Defined shareable microplays as short, instrumented experiments rather than miniature production prototypes.
- Made unlisted blind A/B sharing, telemetry, structured feedback, and decision capture part of the core loop.
- Narrowed the proposed initial corpus to action-game combat and mobility mechanics.
- Required explicit separation between hypotheses, model forecasts, automated observations, and human observations.
- Removed fabricated quantitative prediction and universal ontology claims from the intended product behavior.
- Deferred full graph authoring, broad genre coverage, engine plugins, public community features, and generalized simulation.
