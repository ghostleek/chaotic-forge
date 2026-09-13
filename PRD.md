# Forge — competitive game creation

**Accepted standalone supplement — 13 September 2026:** [PC-12 Dino × Mario](./docs/issues/PC-12.md) introduces a one-input authored runner with stomp bounce as the default simulated onboarding example. It preserves the party recipe, reference corpus and live-generation target. Play is local and does not call AI.

**Version:** 0.4 · **Updated:** 13 September 2026
**Status:** Current demo simplified to one fixed authored recipe and deterministic additions; no mixed-hand dealing or swapping. Broader open-deck generation below is deferred target direction. See the latest demo decision immediately below.
**Promise:** “My friends and I made a surprising game together—and we can play it again.”

## Current demo simplification — 13 September 2026

The user dropped mixed-hand dealing and swapping, then explicitly removed permutation scope. PC-04 now offers exactly Knockback, Pursuers and Quick orders: each participant claims one available card, producing the same authored recipe. The next editor adds Dinner bell, then Hot potato, then Zombie pantry; Pass is available only when exhausted. Contributor identity and winner/loser ordering remain authoritative, but do not create different gameplay recipes. No open deck, dealing, redraws, arbitrary custom instructions or alternate rulesets are required. The broader product ideas below are deferred, not current demo acceptance. Generation remains a separate target.

## 1. Product decision

Forge is a browser party game in which a group chooses game-concept cards, generates a playable mashup, competes inside it, and changes it through the results. **Remixing the game is part of the game.** The result is a saved, playable creation with its history.

The target experience generates the game from the group's choices on the fly. Players do not begin by selecting an existing base game. The user explicitly permits preset chaotic combinations for the demo; that is a delivery technique, not a replacement for the generation requirement.

```text
Join → everyone chooses cards → Forge creates a playable version → everyone plays
     → results → group continues? → winner AND loser each add one mechanic
     → Forge evolves the same game → everyone plays again → repeat
     → group ends → save the whole game → replay / remix / forge fresh
```

Anyone can suggest any dimension: game modes, mechanics, concepts, perspectives, objectives, social rules or familiar game references. A player is never assigned a genre or a dimension. Cards may overlap in meaning; descriptive tags do not become seats or quotas. Players may discard unfamiliar uncommitted cards and receive replacements. See the [14-card base vocabulary and proposed extensions](./docs/card-catalog.md), and the [revised card-table design](./docs/design/pc-04-card-ux.md).

The social inspiration is the surprising combinations of Cards Against Humanity and the accumulating contributions of Gartic. These are user-supplied references for the desired feeling. Performance in the resulting game determines the next editors; subjective awards can add humor but do not silently replace those rules.

## 2. Decisions and proposed defaults

| Topic | Confirmed user direction |
| --- | --- |
| Initial round | Everyone chooses from a hand of mixed concepts and plays. Anyone may contribute any dimension; no FPS, Zombies or Cooking assignment. “Pay” was a typo; no payment or resource economy is required. |
| Card vocabulary | The definite base contains all 14 concepts listed in §4. Modes, mechanics and concepts can coexist in the same hand. |
| Discard / replacement | A player may discard an unfamiliar uncommitted card and receive a new one. This changes their options, not the active game or contribution rights. |
| Blank initial card | Exactly one conceptual blank card illustrates custom instructions in the initial hand. It is excluded from the playable demo. |
| Later contributions | Both the previous round's winner and loser add one card contribution each, which may express any mode, mechanic or concept. It must add an executable effect while preserving previous contributions. Middle-ranked players keep playing but cannot commit an extra addition that round. |
| Duration | Repeat for n rounds until the group decides to end. |
| Finished artifact | Save the entire evolved game for future play or remix; starting from scratch remains available. |
| Participation | Each player joins from their own browser. |
| Creation | Generate the game on the fly from concept cards; preset combinations are acceptable for a demo. |
| Example A | First-person shooter + zombies + Overcooked-style pressures. |
| Example B | AR jump quest + hand recognition + Naruto-style signs + Mario-like enemies. |
| Delivery | Prepare mostly independent stacked PRs for Kahhow and Lance. |
| Exploration | Preserve adaptive difficulty for strong players as an idea. Review GPT-Live 1, GPT-Image-2.5 and Agents API for fit. |

Proposed delivery choices below are not confirmed user decisions. The previous assignment of FPS/Zombies/Cooking to separate people is rejected, rather than an outstanding option.

| Area | Proposed delivery / decision still needed |
| --- | --- |
| Group size / device | Three desktop browsers for the first online walkthrough; target 3–6. Supported player counts and input devices must agree with the selected build. Bridge partnerships, for example, cannot be assumed to fit three people unchanged. |
| Hand layout | Four playable cards plus the single illustrative blank card in the review mockup. Actual deal size, distribution, duplicate/reshuffle policy and visibility remain to be agreed. |
| Card availability | One shared vocabulary with a disclosed runtime-support status. No per-player category quota. Any demo selection must be both supported and clearly labelled; unqualified catalog concepts are illustrative. |
| Online play | Shared world versus separate matched trials remains a product/runtime choice. A universal 60-second FPS trial is not suitable for every mode. |
| Preset showcase | FPS + zombies + timebound orders is one permitted example. It does not define the deck, assign roles or fulfill arbitrary on-the-fly generation. Select and qualify the actual demonstration combinations explicitly. |
| Edit order / ties | Proposed alternating winner/loser order and rotating tie allocation. Show equal ranks honestly and two distinct editor rights; network arrival time does not break ties. |
| Ending | Proposed unanimous end vote at completed results, before further edits. |
| Account / storage | No game account required; anonymous room capabilities, durable rooms and saved-game links. Host audience access still requires proof. |
| Adaptive difficulty | Off for the initial scored proof; no hidden individual adjustments. |

## 3. Revised user journey

1. **Meet at the table.** A host shares a room invitation. Friends join with a nickname. The roster says who is choosing or confirmed, never which genre they are allowed to contribute.
2. **Explore your hand.** Receive mixed game modes, mechanics and concepts. Inspect a short example or **Swap for a new card** when an idea is unfamiliar. No forced tutorial, payment or edit-right consumption is attached to swapping. The initial illustration includes one clearly unavailable blank custom-instruction card.
3. **Choose together.** Everyone commits one contribution from their supported hand. Any person can choose any kind of concept. Selection is local until the authority confirms it. In the target, the combination guides generation; in a preset demo, available coverage is disclosed rather than silently substituting a different game.
4. **See what emerged.** Forge explains what each chosen concept becomes in this game, including overlapping or conflicting ideas. Show the actual objective, controls and scoring once the playable version exists, plus preset/generated origin. An unresolved interpretation or failed build remains a draft. Ready acknowledges an available executable version, not a card selection.
5. **Play the same creation.** Every participant plays under the version's declared mode and common rules. The selected match model, player count, duration/completion condition and scoring must be supported by that build; the UI cannot infer them from a genre label.
6. **Reveal the outcome and decide whether to continue.** Show comparable results and the two named next editors. The group may end on this completed version. Keep subjective reactions separate from the declared ranking policy.
7. **Remix through the competition.** If continuing, both winner and loser choose one addition each in the announced order. Either may choose any dimension and swap unfamiliar uncommitted options. Others may inspect the evolving recipe; the open vocabulary does not give them an extra edit.
8. **Forge and play again.** Preserve earlier contributions, resolve the new interactions and validate the next build. Separate pending additions from the last played version. Failure retains that playable version and the editors' pending choices/rights.
9. **Keep the creation.** Save the whole final played game, contributions and history. Offer **Play again**, **Remix this game**, and **Forge fresh**, with distinct behavior.

Players alternate between competitor and eligible remixer. The host coordinates room setup, not game outcomes. The earlier designer/player/reviewer roles remain useful for the legacy design lab, but are no longer the party game's primary navigation or personas.

## 4. An open deck of modes, mechanics and concepts

The definite base set contains **14 user-supplied concepts**:

- First-person shooter; 2D; 3D; Space Invaders-style gameplay; jump quest.
- Overcooked-style timebound delivery based on fixed orders/instructions.
- Cards Against Humanity; poker; Snake; Mario; Super Smash Bros; Mario Kart.
- Tower defence; bridge **the card game**.

The [card catalog](./docs/card-catalog.md) gives each a friendly explanation, proposed working name, overlapping tags and example interactions. It also proposes typing, rhythm, pinball, maze chase, match-three, portals, gravity flips, hidden roles, delayed actions and a shrinking safe zone. Suggestions are not additional confirmed implementation commitments.

These are expressive inputs, not exclusive categories or a compulsory base-game picker. Poker may contribute hand combinations, hidden information or a decision structure; it does not necessarily turn the entire output into poker. A source reference such as Mario remains recorded while Forge states the original platforming behavior it actually implements. A card's illustration, generated title or valid JSON is not evidence that the rule runs.

### Draw, inspect, swap and commit

Every hand position can contain any type of concept. The initial review layout proposes four playable choices plus the one conceptual blank; counts, distribution, shared/private visibility, duplicates and reshuffling require a declared policy before implementation. Do not quietly encode a category quota in the dealing algorithm.

**Swap for a new card** exchanges an uncommitted choice the player does not understand. It never spends their contribution or winner/loser right, replaces an active rule or implies a fee. Keep the old card recoverable until the authority confirms a replacement. Duplicate requests return the same replacement; stale hand revisions refresh visibly. If the eligible pool is exhausted, explain the limit and offer the agreed reshuffle/Pass path, never a fake new draw. A swap limit or time constraint has not been approved.

The single **Your own idea** card illustrates future custom instructions. In the review UI it is labelled **Concept only · unavailable in demo**, cannot be committed or count toward readiness, and triggers no live generation. Its appearance is not a requirement to implement free-text contributions in this demo.

### Combination and interpretation

Related or contradictory cards are not automatically invalid. **2D + 3D** could mean a 3D scene with movement on a flat plane, or an explicit transition between modes; each contribution needs a visible effect. **Poker + Tower defence** could make hand combinations activate defenses. **Jump quest + Fixed-order rush** could turn timed platform routes into deliveries. These are proposed interpretations, not validated builds.

If Forge cannot preserve every accepted contribution, it must explain the conflict and request an explicit revision through the authorized flow. It cannot drop one player's idea, relabel an unrelated preset or force players into different categories to hide the limitation. Cards about judging, partnerships, perspective or dimensionality require explicit input, participant and scoring compatibility.

### Showcase examples and capability boundary

The user permits preset combinations for a demo. **FPS + zombies + fixed-order delivery pressure** remains one example: shooting, approaching threats and preparation/delivery must interact as actual rules. Earlier Knockback/Counter ricochet, Pursuers/Noise seekers, Quick/Batch orders, Dinner bell, Hot potato and Zombie pantry are optional showcase content, not the product's initial slots or complete deck.

The AR jump-quest example with hand recognition, signs and platform enemies remains a separate feasibility direction. Camera consent, recognition, calibration, tracking loss and any spatial AR claim need actual validation; camera-themed art does not establish these capabilities.

A finite demo may visibly label qualified combinations and illustration-only concepts. Inclusion in the 14-card catalog does not promise that all combinations execute today. A narrower runtime proof can be useful without redefining who may contribute what. The generation milestone must test heterogeneous concepts beyond one kitchen template.

## 5. Round and room rules

The authority freezes the roster, executable artifact, recipe version, seed, duration and scoring version for each round. Every player acknowledges that artifact before the trial starts. A loading failure cannot quietly put one player on another version.

| State | Exit condition / invariant |
| --- | --- |
| Lobby / initial choices | Every required participant has one confirmed contribution of any concept type; hands, swaps and support status are explicit. There is no distinct-category requirement. |
| Forging | One job for the selected contribution revision. Late output from an obsolete/canceled job cannot become the active game. |
| Ready | Required participants loaded and acknowledged the same artifact and instructions. |
| Playing | One accepted attempt per participant and round; no rule edits during play. |
| Results | All required valid attempts received; deterministic scoring selects winner/loser slots. |
| End vote | All active participants vote End to finish; a Continue choice opens the next edit phase. Uncast votes keep an all-End decision pending. |
| Additions | Exactly the two eligible participants resolve one slot each. Others may view and react. |
| Ended | Immutable final played version available to save. Historical ranks grant no future permissions. |

An explicit Ready/start boundary gives all players the same declared rules and participation window. Duration, completion, input format and score comparison belong to the immutable build/mode, not the whole catalog. A 60-second deterministic action trial is one showcase profile, not a universal format for bridge, poker or social cards. Proposed transport grace remains 30 seconds, without extra playtime. The authority validates the appropriate input/action evidence and derives results; arbitrary client scores are insufficient. This improves consistency, not cheat-proof competition. Browser timestamps and request arrival order do not determine rank.

Scoring may differ between generated versions when the accepted concepts require it. Explain the objective and rubric before Ready; apply the same frozen rubric to everyone in a round. Never compare raw scores across incompatible versions. A subjective-judging or team-card concept requires an explicit ranking/eligibility policy; the initial social inspiration alone does not authorize one.

**Attempt continuity:** scored trials do not pause. Losing focus or pointer lock clears held controls while the trial clock continues. A brief network interruption may reconnect the same still-running client and submit its retained bounded input trace before the original deadline plus transport grace; grace is not extra play time. For the continuous-trial profile, a refresh/crash that loses the required trace makes that attempt incomplete. Turn-based action logs need an explicit resume policy with no duplicate turns or extra attempts. Do not restart it, invent inputs, or award a result; explicitly abort/retry the round under a new round ID with the whole roster, or end using the last completed game.

Duplicate commands return the original receipt. Stale revisions are rejected with the current state. Room-scoped participant capabilities establish identity; an invitation link or supplied actor ID does not impersonate another player. Persist deadlines and state transitions so server restarts do not reset the room.

**Disconnects and incomplete rounds:** reconnect with the same identity during grace. A timeout, abandonment or disconnect never automatically earns loser privileges. If a round cannot complete, explicitly abort it; keep the last completed game, record the interruption, and grant no edits for the aborted round. The remaining group can retry or end. Participants leave explicitly between rounds; after disclosed grace, the host may visibly remove an unavailable player before the next roster is frozen. Ending then applies to that active roster. If fewer than the supported minimum remain, offer waiting or archiving the last completed game, not a silently redefined match.

The server transfers host coordination to the earliest remaining participant in the fixed roster order after the absent host's grace period, using stored server timestamps. Host succession never transfers edit rights. Preserve an absent editor's pending slot during grace; afterward the remaining group may explicitly abort the pending evolution, discard its unplayed draft, and preserve the last completed build. Wait for a supported roster to retry that build, or archive it. Record the abort and do not give the missing editor's privilege to a middle player. If no game has completed yet, offer waiting or abandoning the draft; do not call it a saved finished game.

**Ties:** retain honest equal ranks. Traverse the announced rotating roster order to fill one winner and one distinct loser editor slot from their respective tied groups. If everyone ties, choose two distinct slots using that order. Advance the rotation each completed round; do not use click speed.

**Finite decks:** choose only compatible additions, with explicit duplicate/stack limits. When no legal addition remains for an editor, show Pass and resolve that slot without inventing a new rule. The group may keep playing unchanged rules or end. Resource limits must be disclosed; do not impose an undisclosed fixed number of rounds.

## 6. Generation is a phase, not the game clock

Target pipeline:

```text
Chosen cards + accepted prior game + two eligible additions
  → generation job → runnable candidate + rule manifest + assets
  → validation → immutable playable artifact → ready → round
```

Use the same product contract for an authored preset resolver and a real generation service. Record `preset` versus `generated`, actual model/version when used, parent artifact, selected contributions, executable effects, assets, validation status and limitations. A generated title, thumbnail or explanation over an unchanged preset is not generated gameplay.

The recommended generation architecture is an Agents API build/repair job around a constrained game interface, with GPT-Image-2.5 for optional assets and GPT-Live 1 for optional voice conversation. This is a recommendation based on current documentation, not a benchmark or implemented feature. See the [capability review](./docs/openai-capability-fit.md).

Generated output must implement reset, input, step/snapshot, completion and score-validation contracts. Keep generation away from room authority and scoring credentials. Build and inspect code in an isolated environment; run accepted browser games through an isolated runtime boundary, with validated messages and bounded resources. A generated page must not gain the parent app's storage, credentials or arbitrary network access.

Validate that every earlier contribution remains effective within this match, both new additions are present, the build loads, assets exist, and bounded traces can be replayed for scoring. Require behavioral checks and witness traces for each contribution plus at least one completing run; these demonstrate tested scenarios, not universal correctness of arbitrary generated code. If validation fails, explain the affected choice, preserve the last playable build and pending rights, and offer retry/revise. A fallback preset requires a visible choice and preserves the contribution mapping; it cannot masquerade as successful generation.

Generation occurs once per game version, not once per participant. Players see real progress states, cancellation and failure recovery. No fixed latency or cost claim is made before measurement. A later successful job must not modify a round already started or a saved artifact.

## 7. What “save the entire game” means

Save a durable immutable game record, with a usable link and portable export where supported:

- Final executable artifact or a retained, versioned runtime plus the full resolved manifest for preset mode.
- Required assets and dependency/runtime versions; stable content hashes, not expiring sandbox URLs alone.
- Original concept selections, ordered additions, contributors, parent lineage, and card-to-rule interpretations.
- Completed round versions, seeds/configuration, results and explicit aborted-round markers. Keep raw scoring traces only for their defined validation retention period; a video of past play is not part of this promise.
- Mode/provenance and the chosen scoring/adaptation policy. Exclude room/host/player capabilities and API secrets.

The save succeeds only when the artifact and its dependencies are durable and readable from a fresh browser. A localStorage entry, prompt, screenshot, or list of card names is insufficient. Preserve old runtime versions or give an explicit unsupported-version error; never silently drop mechanics to load an old game.

| Action | Required behavior |
| --- | --- |
| Play again | Load the saved final executable version unchanged; reset attempts and scores. No generation required. A practice run or a new matched competition without edits is possible. |
| Remix this game | Create a new room from the saved final game, preserve ancestry, run the fork setup below, and start fresh ranks/edit eligibility. Never mutate the original. |
| Forge fresh | Start with new concept choices and new contribution history. |

**Proposed saved-remix setup:** create a new room from the saved build, with a contribution-based review of inherited ideas. Participants may propose keeping or explicitly replacing inherited contributions through the new room's agreed setup policy; replacements are not constrained to the same category. Finalize and record the whole fork recipe before its first round, preserving ancestry and the original archive. Once that new match begins, only winner/loser additions are permitted and earlier accepted contributions remain effective. An unchanged fork is **Play again**, not a changed game. Exact fork editing rights and minimum supported roster require contract agreement.

For the preset demo, store compact records in the existing host's durable database and retain the referenced versioned runtime/assets. Actual generated bundles may need object storage. Online rooms expire after a clearly displayed period of inactivity; proposed default is 24 hours. Saved games have a separate retention policy, not the room TTL. Before enabling saves, document that policy and a portable preservation route rather than promise permanence without support.

## 8. Fairness, fun and evidence

The design aims for surprise, equal initial participation, and a chance for both extremes to influence the next game. It does not guarantee equal chances of winning: genre skill still matters, and winning or losing intentionally changes creative power.

Playtest whether players intentionally lose for an edit, whether middle-ranked participants feel excluded, whether repeated leaders can build their own advantage, and whether accumulated mechanics remain understandable. Do not quietly remove loser rights or add handicaps to solve those questions. Adaptive difficulty is a separate recorded exploration in PC-11.

Party results are results of that game version, not causal evidence that a mechanic improved design. Preserve Source / Forge interpretation / User decision provenance in references and generated artifacts. Continue to label simulated tests and preview runs honestly.

Proposed first study: five groups complete at least two rounds. Record whether each person recognizes their contribution, can explain who edits next, sees prior rules survive, and can replay the saved final version from another browser. Also record voluntary continuation, intentional-loss behavior and generation wait abandonment. These are future observations, not existing validation. Revisit the loop if middle players are consistently disengaged or contribution effects are unclear.

## 9. Delivery and acceptance

The [delivery plan](./PLAN.md) splits work between Kahhow and Lance. PC-01–08 prove a complete online **preset demo**; PC-09 qualifies and integrates real on-the-fly generation. The target product is not complete until that requirement is met. PC-10 explores the hand-sign concept; PC-11 preserves adaptive difficulty. Voice and generated art can improve the experience without becoming mandatory for scoring or continuity.

Minimum demo acceptance: three independent browsers join → all contribute → all load and play V1 → winner/middle/loser are shown → middle-player edit is rejected → winner and loser each add one mechanic → all play V2 with earlier rules intact → unanimous end → durable save → fresh-browser replay of V2 → new remix with ancestry → fresh game without inherited history.

Also verify same-family contributions from multiple participants, unfamiliar-card replacement, duplicate/stale swap commands, the illustrative-only blank, ties, disconnect/reconnect, incomplete rounds, end votes, explicit conflicting interpretations, generation failure, deck exhaustion, missing artifacts and storage outages. Run all exact [QUALITY.md](./QUALITY.md) gates for implementation changes, preserve the legacy golden-flow tests, and add real Worker/database and multi-browser checks. An in-memory room fixture cannot establish online correctness.

Scope cuts: animation, optional art breadth, voice, live image generation, shared physics and extra runtime combinations can move later. Keep the 14-concept product vocabulary and unrestricted contribution types; display support limits honestly instead of restoring assigned categories. Removing separate-browser play, repeated rounds, both editor privileges or saved-game reuse breaks the accepted premise. Presets can prove the party loop, but must remain labeled as a generation fallback.

## 10. Reconciliation and repository boundary

The [v0.2 PRD](./archive/2026-09-13-mechanic-lab/PRD-v0.2-mechanic-lab.md) and [v0.2 plan](./archive/2026-09-13-mechanic-lab/PLAN-v0.2-mechanic-lab.md) preserve the earlier mechanic-design lab. Its G1–G4 Returnal dash routes remain a regression-protected fallback. Its one-hypothesis/one-changed-rule experiment invariant applies there; two cumulative party additions are a different product behavior.

The imported [ModeShift reference](./archive/2026-09-13-mechanic-lab/mechanic-forge-product-reconciliation.md) contributes a concrete playable artifact and meaningful perspective changes. Its authored 3D puzzle does not provide an arbitrary game generator, authoritative online room, or this mashup runtime. The older [concept exploration](./archive/2026-09-13-mechanic-lab/mechanic-forge-concept-directions.md) and [MFH candidate backlog](./archive/2026-09-13-mechanic-lab/mechanic-forge-split.md) are historical inputs, not the active delivery queue.

This revision updates product/planning documents and design imagery only. [PC-01 PR #41](https://github.com/ghostleek/chaotic-forge/pull/41) has merged a Worker/D1 foundation, but its current `party-forge/1` contract still encodes distinct FPS/Zombies/Cooking slots, FPS inputs and order scoring. Those are superseded implementation constraints, not the corrected product direction. See the [contract amendment map](./docs/party-forge-host.md) before downstream work. No open-deck runtime, card replacement, online party journey, arbitrary generation or camera capability is claimed implemented.
