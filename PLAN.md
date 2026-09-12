# Mechanic Forge Delivery Plan

**Status:** Active — golden-flow prototype in progress; Checkpoint A remains pending
**Last updated:** 2026-09-12  
**Related specification:** [PRD.md](./PRD.md)

## 1. Planning rule

Prioritize the shortest complete loop that proves users will move from reference discovery to a defensible mechanic decision:

```text
Explore -> Compare -> Fork -> Test -> Share -> Observe -> Decide
```

A feature moves earlier when it:

1. Tests a core product assumption.
2. Removes a dependency from the end-to-end loop.
3. Produces observable user behavior rather than more presentation polish.
4. Can serve several mechanic patterns instead of one bespoke example.
5. Improves trust, provenance, or test validity.

Catalog breadth, canvas flexibility, and generative spectacle do not outrank completing this loop.

## 2. Priority definitions

- **P0 — Prove the product:** Required to test the core thesis with target users.
- **P1 — Create retention:** Added after users complete the P0 loop and reveal repeat usage.
- **P2 — Scale and defend:** Added after repeated usage justifies integrations, automation, and network effects.
- **Not now:** High-cost work that does not yet reduce product risk.

## 3. Feature priority

| Order | Priority | Feature                                          | Why now                                                                                  | Dependency / exit signal                                                               |
| ----- | -------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1     | P0       | Ten-card validation corpus                       | Provides enough credible examples to test the wedge without premature catalog investment | Ten cards span several behavior queries and comparison dimensions                      |
| 2     | P0       | Behavior-first Explore prototype                 | Tests whether the Mobbin-like front door solves a real research task                     | 8/12 evaluators find a useful reference in under three minutes                         |
| 3     | P0       | Production corpus expansion                      | Makes the validated search and comparison experience credible                            | Stage 0 passes before expansion to 15–20 patterns and 50–75 implementations            |
| 4     | P0       | Mechanic and game pages                          | Establishes source trust and a reusable canonical record                                 | Users save examples and can explain why an implementation matches                      |
| 5     | P0       | Structured Compare                               | Differentiates the product from wikis and generic AI summaries                           | Users compare before choosing and identify a meaningful trade-off                      |
| 6     | P0       | Fork into Forge specification                    | Tests whether research converts into design work                                         | At least 5/12 evaluators fork a reference                                              |
| 7     | P0       | Markdown, JSON, and test-plan export             | Gives supported and unsupported mechanics an honest production handoff                   | Export preserves sources, assumptions, variables, and evidence state                   |
| 8     | P0       | Control/mutation builder                         | Creates the one-change test contract needed by microplays                                | Changed and locked variables are explicit and reviewable                               |
| 9     | P0       | One templated microplay                          | Tests whether Forge can cross from reasoning into experience                             | Stage 1 microplay-demand gate passes before runtime investment                         |
| 10    | P0       | Unlisted blind share link                        | Makes asynchronous human validation part of the core flow                                | A tester completes both assigned variants without an account                           |
| 11    | P0       | Telemetry and structured response                | Converts sharing into evidence instead of opinions in chat                               | Valid, partial, duplicate, automated, preview, and repeat sessions are distinguishable |
| 12    | P0       | Evidence report and decision log                 | Completes the product's promised outcome                                                 | Creator records keep/revise/reject/inconclusive from a real test                       |
| 13    | P1       | Demand-selected microplay families               | Tests whether the workflow generalizes beyond dashing                                    | Each family is requested by five creators and passes its gated usage cohort            |
| 14    | P1       | Generated read-only System Map                   | Gives expert users the graph without blank-canvas tax                                    | Independent Checkpoint E passes                                                        |
| 15    | P1       | Collections and project workspaces               | Supports repeat research and team continuity                                             | Users return to multiple mechanic decisions in the same project                        |
| 16    | P1       | Reviewer comments and decision requests          | Adds asynchronous collaboration around evidence                                          | Comments lead to a revision or recorded decision                                       |
| 17    | P1       | Remix/fork from a shared result                  | Turns sharing into a permission-aware acquisition loop                                   | Testers become creators without exposing private project details                       |
| 18    | P1       | Embed and presentation mode                      | Makes microplays easier to review in design docs and meetings                            | Repeated demand from active teams                                                      |
| 19    | P2       | Editable System Map                              | Useful only after the structured spec and generated map prove valuable                   | Repeated user need to alter topology rather than fields                                |
| 20    | P2       | Engine-specific exports                          | Deepens production integration after schemas stabilize                                   | Demand clusters around a specific engine and artifact type                             |
| 21    | P2       | Bring-your-own telemetry/build ingestion         | Connects Forge decisions to external prototypes                                          | Teams repeatedly return with external playtest data                                    |
| 22    | P2       | Community contributions and public pattern pages | Can expand the corpus after moderation and rights workflows exist                        | Proven contributor supply and review quality                                           |
| 23    | P2       | Tester exchange or panel integration             | Solves cold-start distribution once creators demonstrate demand                          | Shared links consistently fail only because testers are unavailable                    |
| 24    | Not now  | Generalized executable graph simulator           | Very high semantic and validation cost; directly overlaps Machinations                   | Reconsider only after narrow microplays prove demand for formal simulation             |
| 25    | Not now  | Prompt-to-full-game generation                   | Crowded category and outside the evidence-oriented wedge                                 | No planned dependency                                                                  |

## 4. Sequential PR series

Each PR is merged before the next branch is created so its tests and review run against the exact new baseline.

Evidence checkpoints are required stops, not implementation PRs. A failed checkpoint changes the next scope before more code is merged.

| Sequence     | Scope                                                                               | Required evidence before merge or continuation                                                                        |
| ------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| PR 1         | Quality baseline                                                                    | Repository lint and build are green; exceptions are narrow and documented                                             |
| PR 2         | Product specification and delivery plan                                             | Adversarial review finds no contradictory scope, sequencing, privacy, or experiment contract                          |
| PR 3         | Test harness, versioned domain schema, and ten-card validation corpus               | Unit tests cover schema validity, source attribution, filters, and comparison dimensions                              |
| PR 4         | Explore-first application shell and behavior search                                 | Interaction tests cover queries, filters, empty results, reset, and keyboard operation                                |
| Checkpoint A | Run the Stage 0 wedge study                                                         | Stage 0 exit criteria pass before production corpus expansion                                                         |
| PR 5         | Production corpus expansion                                                         | Corpus reaches 15–20 patterns and 50–75 sourced implementations inside the validated vertical                         |
| PR 6         | Mechanic/game detail and structured Compare                                         | Tests cover canonical links, comparison limits, missing fields, and source visibility                                 |
| PR 7         | Forked Forge specification, control/mutation diff, test-plan-only path, and exports | Tests prove provenance, invariant locks, diff accuracy, and Markdown, JSON, and test-plan output                      |
| Checkpoint B | Run the Stage 1 artifact-demand study                                               | Stage 1 exits pass, including one-third of eligible designers selecting a browser microplay as next artifact          |
| PR 8         | Creator authentication, project ownership, and durable experiment storage           | Authorization tests prevent cross-owner reads/writes and cascade deletion satisfies the data contract                 |
| PR 9         | Dash microplay creator preview                                                      | Deterministic runtime tests cover variant isolation, reset, completion, and telemetry events                          |
| PR 10        | Unlisted sharing and blind tester crossover                                         | Integration tests cover consent, stable assignment, AB/BA balance, resume, withdrawal, expiry, and preview            |
| PR 11        | Evidence report and decision log                                                    | Tests cover validity/exclusion rules, partial data, repeats, aggregation, withdrawal, and decision history            |
| Checkpoint C | Run the canonical Stage 2 measurement cohort                                        | Every Stage 2 exit criterion passes, and at least five distinct creators request the same next mechanic family        |
| PR 12        | Most-requested second microplay family selected at Checkpoint C                     | Cross-template contract tests pass and the template isolates the selected mechanic family                             |
| Checkpoint D | Run a 60-day second-template cohort with the same eligibility rules                 | Both shipped template families meet the Stage 2 publish and decision thresholds; five creators request a third family |
| PR 13        | Most-requested third microplay family, conditional on Checkpoint D                  | Cross-template contract tests pass and the template isolates the selected mechanic family                             |

An optional read-only System Map PR may be inserted at any branch boundary after Checkpoint C only when independent Checkpoint E in Stage 3 also passes. It is still developed, reviewed, and merged sequentially before the next numbered PR begins. Template evidence never authorizes System Map investment, and System Map evidence never authorizes another template.

PRs after 13 are selected from observed P1/P2 demand rather than committed in advance.

### Hackathon golden-flow prototype series

The following narrow series may proceed before Checkpoint A because it uses the existing ten-card corpus and fixed Returnal content rather than expanding the production corpus. It validates interaction continuity, not the market wedge, and does not satisfy or bypass any evidence checkpoint.

| Sequence      | Scope                                                                                                      | Required evidence before merge                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR G1         | Popular-game browse, Returnal page, projectile-dash breakdown, and source/interpretation/decision labels   | Browser tests prove both game-first and behavior-first entry paths reach the same breakdown; every visible primary action has a destination                                    |
| PR G2         | Adapted dash contract, one-rule control/variant diff, invariant locks, risk disclosure, and export preview | Unit and browser tests prove exactly one rule changes, locked fields remain unchanged, and experiment rules are never attributed to Returnal                                   |
| PR G3         | Deterministic sequential creator preview for the fixed dash microplay                                      | Runtime tests cover the same seed, reset, input, completion, variant isolation, event capture, and preview exclusion                                                           |
| PR G4         | Demo publish preview, blind tester walkthrough, descriptive evidence report, and recorded decision         | End-to-end tests cover the no-account journey and confirm simulated or local-only states are never presented as durable external evidence                                      |
| Checkpoint GF | Cold-test the complete golden flow with five designers unfamiliar with the project                         | At least four reach the dash breakdown unaided, identify the provenance boundary, create the one-rule adaptation, and explain what the resulting report can and cannot support |

After this series, resume Checkpoint A. Production corpus expansion remains blocked until the canonical Stage 0 thresholds pass. Production sharing remains blocked until creator ownership and durable storage are implemented.

## 5. Delivery stages

Stages are gated by evidence rather than fixed calendar promises. The product lead owns each checkpoint decision and records its cohort, observation window, numerator, denominator, exclusions, and pass/fail outcome in the PRD changelog. A missed minimum sample is “insufficient evidence,” not a pass.

### Stage 0 — Validate the wedge

**Goal:** Confirm the research problem and initial vertical before building corpus infrastructure.

Deliverables:

- Recruit 12 solo developers, hands-on designers, or small-team design leads.
- Test three starting prompts: desired behavior, named mechanic, and reference game.
- Show a lightweight Explore prototype with at least ten representative implementation cards.
- Compare library-first and canvas-first task completion.
- Ask participants to produce a mechanic decision artifact using their current process for baseline comparison.

Exit criteria:

- 8/12 participants find a useful reference within three minutes.
- At least 7/12 complete the assigned decision task more successfully from examples than from a blank graph, using a predeclared rubric for relevance, completion, and time.
- At least five participants identify a current project decision they would test with the product.
- At least 4/12 independently describe a current or recent decision in the same narrow vertical, spanning at least three distinct behavior queries.

Run the Stage 0 study as one 12-participant round completed within four weeks. The product lead classifies verticals from transcripts captured before participants see the proposed roadmap and signs the checkpoint record.

If these criteria fail, do not expand the database. Revisit the target persona and problem language.

### Stage 1 — Explore, Compare, Forge

**Goal:** Prove that reference discovery converts into an owned mechanic specification.

Deliverables:

- Curated corpus and source workflow.
- Search, filters, and match explanations.
- Mechanic and game pages.
- Comparison workspace.
- Forked mechanic specification.
- Control/mutation diff and locked invariants.
- Test-plan-only path for every specification, including mechanics without a supported microplay.
- Markdown, JSON, and test-plan export.

Exit criteria:

- At least 5/12 evaluators fork after browsing or comparing.
- At least 8/12 correctly classify at least four of five sampled fields as sourced fact, product inference, or user decision in an unaided check.
- At least three evaluators use an exported artifact in an actual project discussion or prototype task.
- At least one-third of eligible designers with a supported mechanic choose a browser microplay as the next artifact over a test-plan-only or engine-ready handoff. At least six eligible designers are required for a valid result.

Run the Stage 1 study as one 12-participant round completed within four weeks. The product lead verifies real-project export use and signs the checkpoint record.

Do not begin the microplay runtime if the final criterion fails. Continue improving the specification and export workflow or retest the initial vertical instead.

### Stage 2 — Microplay validation loop

**Goal:** Prove that a constrained browser experiment creates useful evidence before an engine prototype.

Deliverables:

- Dash microplay template reconstructed from the earlier A/B arena concept.
- Variable mapping and invariant locking.
- Creator preview for both variants.
- Publish validation and capability checks.
- Unlisted, expiring share link.
- Blind, balanced within-subject A/B tester flow.
- Stable anonymous participant identity and balanced within-subject `AB`/`BA` assignment.
- Event telemetry and post-play response.
- Evidence report and decision record.

Exit criteria:

- At least 8/10 newly recruited designers complete configuration and publishing without team assistance.
- At least 8/10 newly recruited testers complete the experience in under six minutes without an account.
- In the documented 60-day cohort defined in the PRD, at least 30% of eligible supported forks become shared tests.
- The median shared test in that cohort receives five valid sessions within seven days.
- In that cohort, at least half of creators whose tests reach five valid sessions record a decision within seven days of the fifth session.
- At least five creators who receive five valid sessions complete a debrief; three must identify a changed confidence level or next design action consistent with their recorded decision.

Complete each 10-person usability round within four weeks. The 60-day conversion cohort and its minimum sample sizes are canonical in the PRD; Checkpoint C may not substitute lower thresholds.

### Stage 3 — Generalize and retain

**Goal:** Establish that the workflow repeats across mechanics and projects.

Deliverables:

- A second microplay family selected from requests by at least five distinct creators.
- A third microplay family only after Checkpoint D identifies requests from at least five distinct creators.
- Project history and collections.
- Read-only System Map only if independent Checkpoint E passes.
- Comments and decision requests.
- Permission-aware remix from completed shares.

Exit criteria:

- At least 3 of 10 active creator teams complete a second evidence-backed mechanic decision within a 60-day retention cohort.
- Each of two microplay families independently meets the Stage 2 publish and decision thresholds in a 60-day cohort with the same minimum sample rules.
- At least 2 of those 3 repeat teams open prior evidence and cite it in a revision or subsequent decision record.
- At least 5 of the 10 active teams request the same engine and artifact type during the cohort before an engine export is scheduled.

For this gate, an active creator team is a workspace that recorded an evidence-backed decision during the 30 days before enrollment. Enroll the first 10 qualifying teams that consent to the study, then observe the fixed cohort for 60 days.

**Checkpoint E — System Map demand:** In a four-week study of at least 12 eligible creators using Forge specifications for real design tasks, at least five must independently encounter a dependency-diagnosis or communication problem that the structured fields do not resolve, and at least three must explicitly choose a read-only dependency view as the next artifact. The product lead reviews task recordings and signs the checkpoint. Checkpoint E may run any time after PR 7 and does not depend on template expansion.

### Stage 4 — Scale the moat

**Goal:** Turn accumulated implementation and decision data into a hard-to-reproduce workflow advantage.

Candidates:

- Engine-specific exports and project ingestion.
- User-provided telemetry mapped to Forge hypotheses.
- Comparable evidence patterns across anonymized, opted-in tests.
- Moderated community contributions.
- Public pattern pages and embeds.
- Tester exchange or PlaytestCloud-style panel partnership.
- Agent/API access to sourced patterns and mechanic specifications.

Every Stage 4 feature requires a separate privacy, rights, and business-model review.

## 6. Microplay sharing plan

### Why it belongs in the core flow

Without sharing, the microplay is only a creator-side toy. Sharing changes it into a validation instrument and connects four product advantages:

1. **Low friction:** Reviewers open a link instead of installing a build.
2. **Better evidence:** Variant assignment, telemetry, and responses share one test contract.
3. **Asynchronous collaboration:** A lead, teammate, community member, or publisher can review on their own time.
4. **Permission-aware growth:** A completed tester can discover the underlying public pattern or fork a permitted version.

### P0 sharing scope

Build only what is needed for trustworthy small-sample tests:

- unlisted link;
- no tester account;
- authenticated creator ownership and authorization for publishing, link management, and results;
- single device-class declaration;
- blind or named variants;
- balanced `AB`/`BA` ordering assigned once per participant and experiment version;
- reload resume using a scoped first-party participant token;
- concise instructions;
- affirmative 18+ consent with the creator, captured data, purpose, and retention disclosed;
- event capture;
- structured response;
- creator/test-session separation;
- explicit valid, partial, duplicate, automated, preview, and repeat session states;
- token-scoped `Delete my test data` access before, during, and for 90 days after participation; withdrawal removes telemetry and response data and recomputes results;
- raw-data deletion 90 days after collection, including for active links, followed only by de-identified aggregate retention;
- link pause, deletion, and mandatory expiry no later than 30 days after publishing;
- cascade deletion of the link, sessions, responses, aggregates, and decision;
- result access restricted to the authenticated owning creator.

### P1 sharing scope

- Password or workspace-only links.
- Comments tied to a run or moment.
- Embed mode.
- Branded review pages.
- Remix with explicit creator permission.
- Shareable evidence summary with sensitive data redaction.

### Guardrails

- Do not rank public mechanics by tiny or incomparable samples.
- Do not call preference a behavioral result.
- Do not reveal variant names before a blind test completes.
- Do not mix creator preview data with tester data.
- Do not imply that a three-minute microplay validates retention, monetization, or full-game fun.
- Do not make links public or searchable by default.

## 7. Suggested application structure

```text
Explore
  Games
  Mechanics
  Behaviors
  Saved references

Project
  Brief
  Comparisons
  Forge specifications
  Microplays
  Evidence decisions

Mechanic specification
  Contract
  References
  Variants
  System Map
  Test plan
  Export

Microplay
  Configure
  Preview
  Publish
  Sessions
  Evidence
  Decision
```

The existing three-column graph interface can later become the `System Map` view. It should not remain the application home.

## 8. Workstreams and dependencies

### Content and ontology

- Define the first vertical and pattern inclusion criteria.
- Finalize the internal schema and user-facing vocabulary.
- Establish source quality, media rights, and review standards.
- Create the first implementation records and comparison dimensions.

This workstream blocks trustworthy Explore, Compare, and AI grounding.

### Product and interaction

- Prototype search and comparison before full corpus tooling.
- Design the forked specification and variant diff.
- Design tester and creator flows independently.
- Make evidence state and provenance visible in every view.

### Microplay runtime

- Extract reusable controls from the earlier dash arena.
- Define template inputs, invariant fields, and event schemas.
- Build deterministic seeding where it materially supports comparison.
- Separate presentation events from evidence events.

### Platform and data

- Persist projects, specifications, variants, microplays, sessions, responses, and decisions.
- Authenticate creators and enforce project and experiment ownership on every creator-only read and write.
- Generate secure opaque share identifiers.
- Add link status, expiry, abuse protection, participant withdrawal, creator deletion, and report recomputation.
- Delete raw data and participant-contribution links 90 days after collection while allowing only de-identified counts, rates, and decisions to remain until creator deletion.
- Limit isolated abuse metadata to a daily-rotated keyed network hash, coarse user-agent family, request time/count, and allow/block reason, with deletion within 24 hours.
- Store schema and experiment versions with every session.

### Research and operations

- Recruit target designers and testers.
- Observe task completion rather than relying only on stated preference.
- Review whether each microplay isolates its claimed mechanic.
- Track unsupported mechanic requests to choose new templates.

## 9. Immediate backlog

### Product definition

- [ ] Select the initial action-game subgenre and ten anchor games.
- [x] Create a ten-card corpus for Stage 0 validation.
- [ ] Expand to 15–20 patterns only after the Stage 0 gate passes.
- [ ] Rewrite internal taxonomy labels into user-facing language.
- [x] Define source confidence and media rights fields.
- [x] Define the mechanic comparison dimensions.
- [x] Define the versioned Mechanic Forge JSON schema.

### Prototype

- [x] Replace the graph-first home concept with an Explore-first prototype.
- [ ] Create behavior-query, results, mechanic-detail, and comparison screens.
- [ ] Create a fork-to-specification interaction.
- [ ] Reintroduce the dash arena as a microplay template rather than the main workspace.
- [ ] Prototype the no-account tester journey.
- [ ] Prototype the evidence report and recorded decision.

### Validation

- [ ] Recruit 12 target designers.
- [ ] Run the Stage 0 task protocol.
- [ ] Record baseline tools, task time, confidence, and resulting artifact.
- [ ] Compare Explore-first and canvas-first completion.
- [ ] Identify the dominant search language and initial vertical.
- [ ] Update the PRD with findings and promote only validated features.

## 10. Suggested changelog

Record future recommendations and scope changes in `PRD.md` under its changelog, using this format:

```markdown
### YYYY-MM-DD — Decision title

- **Suggestion:** What changed or was proposed.
- **Reason:** Evidence or product risk that motivated it.
- **Impact:** Features, priorities, or assumptions affected.
- **Status:** Proposed, accepted, rejected, or superseded.
```

### 2026-09-12 — Initial plan

- Added an Explore-first delivery sequence.
- Prioritized a narrow curated corpus before database scale.
- Made Compare and Fork prerequisites for authoring investment.
- Added shareable microplays to P0 because sharing completes the evidence loop.
- Limited P0 sharing to unlisted, no-account, blind A/B validation with basic telemetry and feedback.
- Reframed the previous interactive arena as the first reusable microplay template.
- Moved the generated System Map to P1 and freeform graph editing to P2.
- Deferred generalized simulation, full-game generation, broad integrations, and public community features.

### 2026-09-12 — Adversarial review amendments

- Split the ten-card validation corpus from production corpus expansion.
- Added a positive microplay-demand gate to Stage 1.
- Moved Markdown, JSON, and test-plan export ahead of microplay implementation.
- Defined the P0 tester flow as a balanced within-subject crossover with stable assignment and explicit validity states.
- Added explicit non-PR evidence checkpoints so corpus, runtime, template, and System Map investment cannot bypass validation gates.
- Added creator authentication and ownership before external sharing, plus tester consent, data minimization, withdrawal, retention, and deletion requirements.
- Split additional templates and the System Map into independently gated PRs.
- Added a sequential delivery series with test expectations for every behavior-changing slice.
- Replaced subjective stage gates with owned, time-bounded cohorts and explicit denominators and thresholds.
- Bounded P0 links and raw-data retention, made withdrawal available throughout the retained lifecycle, and constrained abuse metadata.
- Made additional template selection demand-led and the read-only System Map an independently insertable optional PR.

### 2026-09-12 — PR 1–4 implementation checkpoint

- Completed the quality baseline, product specification, versioned domain schema, ten-card validation corpus, and Explore-first prototype.
- Verified the Explore prototype with automated domain/state tests and desktop/mobile browser interaction checks.
- Paused production corpus expansion at Checkpoint A; PR 5 remains blocked until the signed Stage 0 study passes its predeclared thresholds.
- Kept Compare, Forge, microplays, and the System Map out of the prototype so the study measures the Explore wedge without downstream feature effects.
