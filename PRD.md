# Forge — competitive game creation

**Version:** 0.3 · **Updated:** 13 September 2026
**Status:** Revised product direction; delivery defaults are proposals, not implemented features.
**Promise:** “My friends and I made a surprising game together—and we can play it again.”

## 1. Product decision

Forge is a browser party game in which a group chooses game-concept cards, generates a playable mashup, competes inside it, and changes it through the results. **Remixing the game is part of the game.** The result is a saved, playable creation with its history.

The target experience generates the game from the group's choices on the fly. Players do not begin by selecting an existing base game. The user explicitly permits preset chaotic combinations for the demo; that is a delivery technique, not a replacement for the generation requirement.

```text
Join → everyone chooses cards → Forge creates a playable version → everyone plays
     → results → group continues? → winner AND loser each add one mechanic
     → Forge evolves the same game → everyone plays again → repeat
     → group ends → save the whole game → replay / remix / forge fresh
```

The social inspiration is the surprising combinations of Cards Against Humanity and the accumulating contributions of Gartic. These are user-supplied references for the desired feeling. Performance in the resulting game determines the next editors; subjective awards can add humor but do not silently replace those rules.

## 2. Decisions and proposed defaults

| Topic | Confirmed user direction |
| --- | --- |
| Initial round | Everyone chooses cards and plays. “Pay” was a typo; no payment or resource economy is required. |
| Later contributions | Both the previous round's winner and loser add one mechanic each. Middle-ranked players keep playing but cannot add that round. |
| Duration | Repeat for n rounds until the group decides to end. |
| Finished artifact | Save the entire evolved game for future play or remix; starting from scratch remains available. |
| Participation | Each player joins from their own browser. |
| Creation | Generate the game on the fly from concept cards; preset combinations are acceptable for a demo. |
| Example A | First-person shooter + zombies + Overcooked-style pressures. |
| Example B | AR jump quest + hand recognition + Naruto-style signs + Mario-like enemies. |
| Delivery | Prepare mostly independent stacked PRs for Kahhow and Lance. |
| Exploration | Preserve adaptive difficulty for strong players as an idea. Review GPT-Live 1, GPT-Image-2.5 and Agents API for fit. |

Proposed defaults make the first delivery implementable. They are not confirmed user decisions:

| Area | Proposed first delivery |
| --- | --- |
| Group size / device | Three desktop browsers with keyboard and mouse; target expansion to 3–6 players. Mobile can join/view but must not be offered unsupported FPS controls. |
| Online play | A shared room and recipe, with separate matched 60-second trials. Shared-world collision/cooperative netcode is later scope. |
| Main demo | Example A, called **Kitchen Chaos** below. Example B has a separate feasibility packet. |
| Initial demo cards | Three visible concept slots—FPS, Zombies, Cooking—with two meaningful implementations each. One player claims and chooses each slot. Every enabled combination must run. |
| Edit order | Winner first after odd-numbered rounds, loser first after even-numbered rounds. Both get exactly one slot. |
| Ties | Show tied results; a published rotating roster order selects two distinct editor slots. Network arrival time never breaks ties. |
| Ending | Unanimous end vote from the active roster at the completed-results boundary, before further edits. |
| Account / storage | No game account required; anonymous room capabilities, durable online rooms and saved-game links. Hosting access requirements must be checked. |
| Adaptive difficulty | Off. No hidden individual adjustments. |

## 3. Revised user journey

1. **Meet in the Forge.** A host shares a room invitation. Friends join with a nickname, see who is present, and learn: “Everyone contributes first. After playing, first and last each change the game.”
2. **Choose together.** Everyone commits one concept-card contribution. The target supports different genres, rules, themes and input concepts. The demo clearly identifies its supported deck and slots; it does not accept arbitrary cards and secretly substitute a preset.
3. **See what emerged.** Forge assembles or generates one playable version. Show how each contribution changes play, the objective and controls, and whether this is a preset demo or newly generated build. Everyone readies only after that version is available.
4. **Play the same creation.** Participants play the frozen version under the same configured rules. In the first demo each has an individual arena and seeded trial; they compete through their results.
5. **Reveal the outcome.** Show performance, tied results where applicable, and two named next editors. Keep playful reactions separate from the performance policy. Do not compare raw scores from different game versions.
6. **Choose to continue or finish.** If the group ends here, the final saved game is one they have actually played. Otherwise the winner and loser each choose one additive card, in the announced order. Everyone sees both pending contributions.
7. **Forge the next version.** Preserve earlier mechanics, resolve the new interactions, validate the result, explain the changes, and play again. Failed generation never destroys the last playable version or consumes an edit without producing its effect.
8. **Keep the creation.** Save its final executable version, contributions and round history. Offer **Play again**, **Remix this game**, and **Forge fresh**, with the distinct meanings below.

Players alternate between competitor and eligible remixer. The host coordinates room setup, not game outcomes. The earlier designer/player/reviewer roles remain useful for the legacy design lab, but are no longer the party game's primary navigation or personas.

## 4. Cards and the two demo ideas

Cards are expressive inputs to the Forge. A card can describe a genre, objective, theme, rule or input style. A genre label is not a promise that an entire existing commercial game can be inserted into any runtime. Forge must turn the contribution into concrete executable behavior and retain its attribution.

The user's concept vocabulary includes 2D jump quest, typing race, first-person shooter, match-three/Candy Crush, pinball, growing trail/Snake, maze chase/Pac-Man and rhythm tap/Tap Tap Revenge. These remain candidate generation inputs. The preset demo supports only its disclosed combinations.

### Example A: Kitchen Chaos — proposed demo priority

A first-person kitchen-defense challenge: aim and shoot at approaching zombies, move ingredients through preparation/cooking/delivery, and finish orders while threats interrupt the work. This is a mashup of interacting rules, not a shooter scene with cooking-themed decoration. The first version uses individual trials with shared creation and competition; cooperative kitchen play is not implied.

Proposed initial choices, subject to runtime qualification in PC-02:

| Slot | Two choices | Observable difference |
| --- | --- | --- |
| FPS | Knockback / counter ricochet | Shots push threats away / bounce once from marked counters. |
| Zombies | Pursuers / noise seekers | Threats follow the player / approach active cooking stations. |
| Cooking | Quick orders / batch orders | Frequent one-portion deliveries / prepare and deliver a small batch. |

Three later cards form the first additive deck: **Dinner bell** attracts nearby threats after delivery; **Hot potato** adds a bounded carried-dish spoil timer; **Zombie pantry** drops an ingredient when a zombie is repelled, with a fixed pickup cap. They must use documented values and remain completable together. These are proposed content, not existing implementations.

Rank each trial by completed valid orders, then fewer spoiled/failed orders; any remaining tie uses the declared editor-slot rotation without pretending the score was unequal. Keep the rubric fixed for the room. Display the objective before Ready, including any card that changes what constitutes a valid order.

### Example B: hand-sign jump quest — preserved stretch

Camera-observed hand signs trigger actions in a jump quest with platform enemies. Actual recognition, calibration, tracking-loss behavior and camera consent are necessary to claim gesture control. A camera backdrop alone is not spatial AR; world anchoring is a separate requirement if that is the desired experience. A keyboard fallback may demonstrate encounters, but must be labeled as such.

GPT-Live 1 is not the visual recognition component. The first spike should determine whether responsive hand tracking and recognizable signs work on the intended devices before adding it to scored multiplayer rounds. This example must not block the first complete party loop.

## 5. Round and room rules

The authority freezes the roster, executable artifact, recipe version, seed, duration and scoring version for each round. Every player acknowledges that artifact before the trial starts. A loading failure cannot quietly put one player on another version.

| State | Exit condition / invariant |
| --- | --- |
| Lobby / initial choices | All three demo slots have one participant contribution; rejected or unsupported choices remain editable. |
| Forging | One job for the selected contribution revision. Late output from an obsolete/canceled job cannot become the active game. |
| Ready | Required participants loaded and acknowledged the same artifact and instructions. |
| Playing | One accepted attempt per participant and round; no rule edits during play. |
| Results | All required valid attempts received; deterministic scoring selects winner/loser slots. |
| End vote | All active participants vote End to finish; a Continue choice opens the next edit phase. Uncast votes keep an all-End decision pending. |
| Additions | Exactly the two eligible participants resolve one slot each. Others may view and react. |
| Ended | Immutable final played version available to save. Historical ranks grant no future permissions. |

An explicit ready/start window gives each player the same 60 seconds of simulation time, with a shared submission deadline and reconnect grace. Proposed grace: 30 seconds. The server validates bounded input traces against the frozen build and recomputes results; accepting an arbitrary client score is insufficient. This improves consistency, not cheat-proof competition. Browser timestamps and submission speed do not determine rank.

**Attempt continuity:** scored trials do not pause. Losing focus or pointer lock clears held controls while the trial clock continues. A brief network interruption may reconnect the same still-running client and submit its retained bounded input trace before the original deadline plus transport grace; grace is not extra play time. A refresh/crash that loses the trace makes that attempt incomplete. Do not restart it, invent inputs, or award a result; explicitly abort/retry the round under a new round ID with the whole roster, or end using the last completed game.

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

**Proposed saved-remix setup:** a new match may revise inherited choices before its first round. In the demo each new player claims one inherited FPS/Zombies/Cooking slot and chooses Keep or its other supported variant. Retain inherited later-addition cards and record any replacement as a new fork decision; the original archive and its history stay unchanged. This makes an exhausted saved deck remixable. If everyone keeps the same configuration, label the result Play again, not a changed game. Once that new match starts, only winner/loser additive edits are permitted, and earlier rules again remain effective. The generated-game version must offer an equally explicit fork setup rather than silently discarding inherited contributions.

For the preset demo, store compact records in the existing host's durable database and retain the referenced versioned runtime/assets. Actual generated bundles may need object storage. Online rooms expire after a clearly displayed period of inactivity; proposed default is 24 hours. Saved games have a separate retention policy, not the room TTL. Before enabling saves, document that policy and a portable preservation route rather than promise permanence without support.

## 8. Fairness, fun and evidence

The design aims for surprise, equal initial participation, and a chance for both extremes to influence the next game. It does not guarantee equal chances of winning: genre skill still matters, and winning or losing intentionally changes creative power.

Playtest whether players intentionally lose for an edit, whether middle-ranked participants feel excluded, whether repeated leaders can build their own advantage, and whether accumulated mechanics remain understandable. Do not quietly remove loser rights or add handicaps to solve those questions. Adaptive difficulty is a separate recorded exploration in PC-11.

Party results are results of that game version, not causal evidence that a mechanic improved design. Preserve Source / Forge interpretation / User decision provenance in references and generated artifacts. Continue to label simulated tests and preview runs honestly.

Proposed first study: five groups complete at least two rounds. Record whether each person recognizes their contribution, can explain who edits next, sees prior rules survive, and can replay the saved final version from another browser. Also record voluntary continuation, intentional-loss behavior and generation wait abandonment. These are future observations, not existing validation. Revisit the loop if middle players are consistently disengaged or contribution effects are unclear.

## 9. Delivery and acceptance

The [delivery plan](./PLAN.md) splits work between Kahhow and Lance. PC-01–08 prove a complete online **preset demo**; PC-09 qualifies and integrates real on-the-fly generation. The target product is not complete until that requirement is met. PC-10 explores the hand-sign concept; PC-11 preserves adaptive difficulty. Voice and generated art can improve the experience without becoming mandatory for scoring or continuity.

Minimum demo acceptance: three independent browsers join → all contribute → all load and play V1 → winner/middle/loser are shown → middle-player edit is rejected → winner and loser each add one mechanic → all play V2 with earlier rules intact → unanimous end → durable save → fresh-browser replay of V2 → new remix with ancestry → fresh game without inherited history.

Also verify ties, duplicate/stale commands, disconnect/reconnect, incomplete rounds, end votes, invalid combinations, generation failure, deck exhaustion, missing artifacts and storage outages. Run all exact [QUALITY.md](./QUALITY.md) gates for implementation changes, preserve the legacy golden-flow tests, and add real Worker/database and multi-browser checks. An in-memory room fixture cannot establish online correctness.

Scope cuts: visual polish, deck breadth, voice, live image generation, shared physics and the second demo can move later. Removing separate-browser play, repeated rounds, both editor privileges or saved-game reuse breaks the accepted premise. Presets can prove the party loop, but must remain labeled as a generation fallback.

## 10. Reconciliation and repository boundary

The [v0.2 PRD](./archive/2026-09-13-mechanic-lab/PRD-v0.2-mechanic-lab.md) and [v0.2 plan](./archive/2026-09-13-mechanic-lab/PLAN-v0.2-mechanic-lab.md) preserve the earlier mechanic-design lab. Its G1–G4 Returnal dash routes remain a regression-protected fallback. Its one-hypothesis/one-changed-rule experiment invariant applies there; two cumulative party additions are a different product behavior.

The imported [ModeShift reference](./archive/2026-09-13-mechanic-lab/mechanic-forge-product-reconciliation.md) contributes a concrete playable artifact and meaningful perspective changes. Its authored 3D puzzle does not provide an arbitrary game generator, authoritative online room, or this mashup runtime. The older [concept exploration](./archive/2026-09-13-mechanic-lab/mechanic-forge-concept-directions.md) and [MFH candidate backlog](./archive/2026-09-13-mechanic-lab/mechanic-forge-split.md) are historical inputs, not the active delivery queue.

This revision updates product/planning documents only. No new online play, generation, persistence or camera capability is claimed as implemented.
