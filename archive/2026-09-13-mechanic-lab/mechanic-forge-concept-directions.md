# Forge: reconciling the divergent concepts

> **Historical planning, superseded 13 September 2026:** The active direction is [PRD v0.3](./PRD.md), with the [Kahhow/Lance delivery plan](./PLAN.md). The accepted loop now generates a game from everyone's initial cards, then both the winner and loser add one mechanic per completed round. Own-browser play and saving the finished game are in scope. Earlier proposals and restrictions below are preserved as history, not the current queue.

**Date:** 13 September 2026. **Status:** Product exploration. Latest user direction establishes game cards as the premise, cumulative contributions through a Forge, and a finished game that everyone can replay. Card structure and round rules below are proposed designs.

**Source:** [User-supplied summary and transcript](./references/product-discovery/2026-09-13-forge-ideation.txt), copied unchanged from the attachment. The discussion leaves concept selection open. Its deadline units, “Fauna House” name, “new bats” comparison, and API reference are ambiguous; this review does not resolve them into facts or implementation requirements.

**Context:** [Earlier ModeShift reconciliation](./mechanic-forge-product-reconciliation.md), [PRD](./PRD.md), [delivery plan](./PLAN.md), and [PR sense-check](./mechanic-forge-pr-review.md). This is a direction brief, not an implementation handoff. No product changes, deployment, assignments, or fresh runtime verification are part of this review.

## Latest refinement: game cards become a replayable game

**User direction:** The finished creation is replayable after everyone has added their contribution. A Forge remains central. Cards represent recognizable game concepts, with examples including a 2D jump quest, typing race, first-person shooter, Candy Crush, pinball, Snake, Pac-Man, and Tap Tap Revenge.

**Proposed promise:** “Play your game cards. Forge something together. Keep playing what you made.”

The end product is a playable game with a settled rule set. Judging and the reveal are events around it; they do not consume or discard it. This adds a second reason to stay: enjoy another attempt at the finished game, as well as begin another creation round.

### The premise card and the contribution cards

Use two roles for cards:

- **Game card:** establishes the starting game's space, controls, objective, and recognizable core loop. It supplies the premise: “We are making a ___, but…”.
- **Mechanic card:** contributes a specific playable rule to that premise. It names what carries over from its source concept and what it will change in this particular game.

The same familiar concept can inspire either role. A Pinball game card starts a pinball table; a Pinball mechanic card might add launching bumpers to a platformer. Playing the mechanic card does not silently replace the whole platformer with a pinball game. The participant sees and chooses the supported interpretation before committing.

Proposed concept deck drawn from the user's examples; these are design vocabulary, not newly implemented templates:

| Game-card premise | Example rule it could contribute elsewhere |
| --- | --- |
| **2D Jump Quest** | Jumping and traversable platforms |
| **Typing Race** | Completing a word triggers an action |
| **First-Person Shooter** | Aim-and-hit target interaction |
| **Match Three** — the user's Candy Crush reference | Matching three items triggers a reward or transformation |
| **Pinball** | Bumpers launch or ricochet a moving object |
| **Growing Trail** — Snake | Collecting items extends a trailing body |
| **Maze Chase** — the user's Pac-Man reference | Pursuit through corridors and collectible routes |
| **Rhythm Tap** — the user's Tap Tap Revenge reference | Timing an action to a beat changes its result |

These concepts mix camera/space, input, goals, and world rules. They cannot all be treated as interchangeable modifiers. Each supported pairing needs a concrete meaning: how the card changes the active game, how its input works, and which existing rules it preserves or alters. Unsupported combinations should remain ideas or be offered a clearly explained alternative, rather than silently becoming a different promise.

### The Forge is where the combination becomes real

The proposed Forge contains the base game, the accumulated cards, and a playable preview. On receiving the creation, a participant adds one supported mechanic, sees its effect, and passes the result onward. Earlier contributions remain consequential. Keep author identities and the full history for the reveal while making current gameplay rules inspectable.

An illustrative three-card recipe is:

```text
Game card: 2D Jump Quest — reach the exit.
Contribution: Pinball — bumpers launch the character.
Contribution: Rhythm Tap — a jump on the beat receives a boost.
Finished game: reach the exit through bouncing, beat-timed jumps.
```

This is a proposed combination to assess, not a claim that the current software can assemble it. The Forge must support the interactions, not merely produce a title and a description for them.

### Revised round and ending

```text
Choose a game card
  → everyone contributes a mechanic through the Forge
  → finalize the recipe
  → everyone plays the finished game
  → judge and reveal the contribution chain
  → replay this game OR remix a new version OR start a new round
```

Every participant receives an equal contribution budget and an opportunity to play the final result. Parallel pass-along chains can reduce waiting, but that round format is still a proposal. This supersedes the earlier sketch in which the judge sat out creation and was the main person to play the results. A rotating judge or group verdict can celebrate a jointly authored creation; it cannot be presented as an independent judgment of that judge's own contributions. No award grants stronger mechanics next round.

After everyone commits, finalize the rule set and the instructions. **Play again** resets run state while keeping that recipe. **Remix** creates a new editable version, leaving the finished recipe available. **New round** starts with a new premise. Any randomness in a replay follows the declared recipe; it does not draw new mechanic cards or regenerate the game's rules without the player's choice.

Replay is part of the requested concept. Availability after reload, stored collections, downloadable builds, and remote sharing are separate implementation decisions; none is established by the current local demo. A round should at least keep its completed game replayable within that session. A later build brief must resolve longer-term retention explicitly.

### What carries forward from the fairness discussion

The creation game gives everyone comparable tools and influence. The finished game may still reward skills such as typing speed, aiming, or rhythm, as the user's premises suggest. That is compatible with this direction as long as being good at the resulting game does not grant more authorship or better cards. Keep creation awards separate from any optional high-score challenge.

The next concept test must examine both payoffs: whether adding and revealing contributions is enjoyable, and whether anyone chooses to replay the final game once its surprise is known. A fun reveal alone does not establish a replayable game. These are proposed product checks, not observed outcomes or an instruction to implement all eight game families.

## Earlier round proposal: make, pass, mutate, play, reveal

**User direction:** Explore the competitive creation game with Cards Against Humanity-like judging and Gartic-like cumulative transformation. Everyone adds to the result; the intended appeal is surprising shared fun with less advantage from mastering a fixed competitive system. This advances the competitive branch beyond the earlier recommendation to begin with a solo creative playground.

**Proposed promise:** “Start a game. Pass it around. Play what your friends turned it into.”

The central artifact is now a game with several authors. The creator cannot fully plan its final form because other people add consequential rules. Competition can supply anticipation and a round verdict, while shared creation and the reveal supply the reason to enjoy the session even without a personal win.

The references contribute different mechanisms. Cards Against Humanity combines a shared prompt, concealed submissions, and a judge who selects a favorite, with the judge changing between rounds. See its [official basic rules](https://s3.amazonaws.com/cah/CAH_MainGame.pdf). For the user's pass-along interpretation of Gartic, the closer specific reference is [Gartic Phone](https://garticphone.com/), whose official introduction describes writing, receiving another person's sentence to draw, describing a drawing, and seeing the resulting chain. This is an interpretation of the user's design cue, not a claim that every Gartic game uses that loop.

### One concrete four-person round

1. **Set the challenge.** One rotating judge announces a prompt and the award criterion, such as “the most surprising thing that still worked.” The three creators receive separate copies of the same tiny playable starting game and the same menu of supported modifiers.
2. **Add one rule.** Each creator gets the same time and one-change budget. A short preview shows the consequence before committing. Simultaneous choices from a shared menu are not depleted by another player's pick.
3. **Pass and add again.** Pass each game to the next creator, twice. Each final game contains one contribution from each creator, and every creator has taken an early, middle, and final turn across the three games. Recipients can inspect current rules; the full history and author labels stay hidden until the reveal.
4. **Play the results.** Present the three completed games without author labels. The judge plays each for the same allotted time while the others watch; optional group attempts are for experiencing the result, not points for mechanical skill. Rotate presentation order across rounds.
5. **Judge, then reveal.** The judge selects a favorite creation using the announced criterion. Reveal the contribution chain afterward, showing which addition caused each surprising consequence.
6. **Rotate and reset.** The next player judges. Complete a judge rotation for equal opportunities. Use a fresh prompt and starting state; awards do not grant stronger cards or extra edits.

For the first concept test, award the **creation**, with credit to all contributors, rather than assigning the whole game to its first or last editor. A round can have a favorite without a persistent personal leaderboard. If individual competition proves essential, separately test judging a specific anonymous contribution; do not silently equate a collectively authored game with one person's win.

### What the chaos could feel like

Illustrative cards for a future supported template—not implemented capabilities:

```text
Starting game: collect three coins.
First contribution: coins run away when approached.
Second contribution: jumping attracts nearby coins.
Third contribution: collecting a coin briefly makes you giant.
Result: a coin chase becomes a jumping, growing scramble.
```

The additions should interact with what came before. They should leave earlier contributions consequential, rather than let the last person replace the whole game. The reveal answers “Who made that happen?” as well as “Which result did we like?”

### Fair contribution, surprising results

Unpredictability does not establish fairness. Skilled improvisers and people who know the judge's tastes may still have an advantage. The achievable design goal is that every participant has comparable influence, understandable choices, and a reason to enjoy a round regardless of the verdict.

| Proposed rule | Purpose |
| --- | --- |
| Same modifier access, edit count, time, and preview opportunity | Avoid advantages from scarce tools or technical authoring skill |
| Wins grant recognition, with no extra creative power | Avoid a winner becoming better equipped to win again |
| Everyone contributes at each stage across the parallel chains | Distribute the influence of the first and final edits |
| Rotate judging, with authorship withheld until the verdict | Reduce persistent judge advantage and identity-based judging; anonymity cannot eliminate inference or favoritism |
| Preserve a playable objective, input, and reset | Make unexpected interactions enjoyable rather than softlocks |
| Offer only supported combinations and permit revision of an invalid addition | Keep failures understandable; do not silently alter the submitted rule |
| Judge an announced expressive criterion; do not score playthrough speed | Keep motor skill from deciding who gets creative recognition |

The creation procedure should stay clear and stable. Surprise belongs in the combinations and other people's choices. Avoid changing the scoring rule after players commit or treating arbitrary punishment as fairness.

This revises the older loop from `compete → earn stronger parts → assemble` toward **`prompt → add → pass → mutate → play → judge → reveal`**. The user's desired cumulative chaos is the core experience, rather than a reward after several conventional competitive mini-games.

### What to learn next

Use a facilitated local round to test this concept before choosing an implementation. Observe whether creators respond to incoming changes, whether the combinations remain playable, whether the reveal is enjoyable for everyone, and whether people want another round without stronger cards as a prize. Watch for dominant final edits, long waits, deliberately broken games, and verdicts that make contributors feel their part did not matter.

The remaining concept choice is the depth of personal scoring: shared round awards or individual contribution points. The former is the proposed starting point because every resulting game has several authors. These are design proposals, not measured outcomes or changes to the current Returnal delivery scope. Cumulative creative rounds also do not establish one-rule causal evidence; any formal microplay test still needs its own single-change contract.

## Earlier reconciliation: what the transcript changed

The previous reconciliation treated ModeShift as the playable output of a professional design-decision workspace. The new discussion introduces another source of value: **playing, discovering, and making a game can be the experience people come for.** A production decision or export may be unnecessary for those users.

That warrants reconsidering the audience, rather than treating fun, voice, or competition as presentation improvements to the existing tool. The current PRD remains the accepted delivery baseline; the recommendation below is a candidate change in product direction.

## Three promises, three reasons to return

| Direction | Primary user job | Successful first session | Reason to return |
| --- | --- | --- | --- |
| **Mechanic lab** | A designer needs to decide whether a mechanic change is worth building | Compare a supported rule change and leave with a justified next action | Another real project decision |
| **Creative playground** | A curious player or creator wants to discover how games work and make something their own | Play a mechanic, understand it, change it, and feel the consequence | Another idea to try or remix to improve |
| **Competitive creation game** | Friends want a social contest in which making games is part of the game | Finish a round of earning/drafting, building, playing, and judging | Another round with friends |

All three can use mechanic cards and bounded playable templates. Shared ingredients do not establish a single customer or a single success metric. The playground is the most direct fit for the transcript's verbalize-to-play and learn-by-playing ideas. Competition adds a separate reason to play and a different session structure. The lab adds a stronger evidence obligation.

## Which ideas fit together

| Idea from the discussion | Role in the experience | Proposed treatment |
| --- | --- | --- |
| Say what you want to play | An input method for expressing intent | Let typed intent and guided choices reach the same supported changes; voice can join that flow when functional |
| Enter an open world | A way to present and navigate experiences | Begin with a small playable scene; explore a larger world only if moving through it adds value |
| Surface mechanic cards | A way to translate experience into understandable choices | Show a few relevant cards with an effect, a cost, and a playable example |
| Start in 2D or 3D | A preference affecting comfort, controls, and available content | Describe the actual starter experience before entry; offer alternatives only where they exist |
| Learn mechanics through play | The core value of a creative playground | Put a legible mechanic encounter before demanding design vocabulary |
| Earn components by winning mini-games | Progression and competition rules | Keep as an alternative social concept to test, rather than a prerequisite for creation |
| Assemble collected mechanics | A constrained authoring system | Begin with a supported change in one template; broader combinations need explicit compatibility rules |
| Compete over whose game is better | A social evaluation loop | Define a criterion and who judges; preference votes are not proof of design quality |

Voice does not determine whether this is a tool or a game. An open-world setting does not require unbounded generation. Cards can be guidance, editable rules, or competitive rewards, but those roles should be legible rather than silently interchangeable.

## Earlier proposed direction: creative playground

**A playable creative playground: learn a mechanic by playing it, change it, and make a version you want to play again.**

This is a proposed shift toward curious creators, including beginners. It preserves the concrete agency of the professional Forge concept and the experiential strength of ModeShift. It also takes the party-game suggestion seriously: making choices and seeing consequences should be enjoyable even before competition is added.

The shared loop becomes:

```text
Play a mechanic → notice its rule → choose a change → play your version → keep or revise
```

An experienced user can enter at “choose a change” by describing an intent or selecting a reference. A newcomer can gain the vocabulary through play. Both paths converge on the same visible rule choice.

The roles are now **player → creator → player → curator of their own version**. A professional may continue as a reviewer of evidence. A social session may continue as a challenger or host. Those are distinct continuations; neither must be forced into every first session.

## What the user sees on entry

Proposed first-screen copy: **“Play a mechanic. Make it yours.”**

Show one short playable encounter with its objective and controls visible, a primary **Play** action, and a secondary **Describe your idea** entry. Keep the starter and its available changes visible so an empty prompt does not imply unlimited support. Do not require voice input or a first-person camera to enter the product.

After the first encounter, surface a rule card answering “What made that happen?” It should explain a consequence the user just experienced. Reference and interpretation details remain available on that card. Then offer a small set of changes the selected template actually supports. Guidance appears at the moment it helps the user act.

For the approved dash content, a proposed example journey is:

1. **Play:** experience the timer-based dash in the existing encounter.
2. **Notice:** the card explains that the dash recharges after three seconds; the recharge rule is Forge-defined, while the linked Returnal source supports projectile-phasing behavior.
3. **Choose:** select “Recharge when I eliminate an enemy” and see the one-rule diff and recovery risk.
4. **Play again:** start a fresh matched variant run and experience that consequence. Free experimentation can be exploratory, but a comparison must reset to its declared conditions.
5. **Own the choice:** keep or revise the version, with a plain-language reason. A personal preference is a valid creative choice and should be labelled as such.

This example is a proposed reordering around existing capabilities, not a claim that this onboarding flow already exists. The current tester walkthrough is fixed and cannot be presented as receiving arbitrary creator choices.

## How to preserve the competitive idea

The competitive concept has a coherent independent loop:

```text
Play challenges → earn draft priority → choose compatible rules → build → swap and play → judge
```

Its strongest idea is that players experience mechanics before using them as building material. Its hardest requirement is that the available pieces can form enjoyable, playable results under a short time limit. Choosing a large API does not settle those composition rules.

A bounded concept test could use one shared template, one editable rule slot per participant, and a small compatible rule deck, with local turn-taking or a facilitator. Everybody receives a playable starting kit. Winning grants draft priority or an optional modifier; it should not deny losing players the capabilities needed to finish a game. The group agrees what it is judging, such as “most surprising route” or “most enjoyable challenge,” before play.

That version would test whether the social draft-and-remix loop is enjoyable without assuming arbitrary game generation or online multiplayer. It remains proposed work outside the current hackathon delivery scope.

**Preserve:** experience → understand → choose → remix, and the possibility of exchanging challenges.

**Defer from the first playground loop:** multiple preliminary mini-games, ranked reward inventories, timed multi-rule assembly, multiplayer coordination, and a universal “best game” score.

If the fun depends mainly on winning scarce components, the party concept may deserve to be the primary product. In that case, its session structure should lead the design rather than be fitted onto the lab workflow.

Keep this direction under consideration if participants want another round and enjoy both making and playing. Cut or rethink it if the round is dominated by waiting, explaining compatibility, or repairing unplayable combinations. Those are proposed qualitative decision criteria; no study result or numerical threshold is claimed.

## Keep creation, preference, and evidence distinct

The playground can end with “I prefer this version.” A party session can end with “This group voted for that challenge.” A professional test asks a different question: “What observations support changing this rule?”

Every microplay test still needs one hypothesis, one changed rule, a fixed baseline, matched conditions, and explicit provenance. If later creative tools allow several edits, comparing the whole result cannot isolate any one edit's effect. A new controlled test must first choose the single difference being evaluated. This does not expand today's supported editor.

Source / Forge interpretation / User decision remains useful in every direction. So does separating local creator play, automated checks, preference responses, and external test evidence. ModeShift's immersive presentation should inform the quality of the encounter; its single-run threshold result does not replace the evidence contract.

## Earlier audience decision and implementation boundary

Choose the primary successful session: **a useful design decision, a satisfying act of creation, or a complete social contest**. My proposed default for exploring these notes is the satisfying act of creation, with the professional and competitive concepts assessed as separate continuations.

The subsequent user message focuses the current exploration on the competitive creation branch; the latest section above records that steering. The earlier recommendation is retained as context, rather than the active default for this discussion.

For a next concept walkthrough, observe whether a newcomer can explain the mechanic after playing, make an intentional supported change, and want another attempt without being promised points or prizes. Compare that with the existing designer-led journey using the intended audience. If learning and remixing do not motivate another attempt, test the social loop on its own merits rather than assuming competition will repair it.

These are proposed observation questions, not a completed study or replacements for the roadmap's evidence gates. The transcript does not establish demand, accepted priorities, a submission choice, or a reliable remaining time budget. Select the audience and one end-to-end demonstration before choosing implementation packets. Protect the current Returnal path while that decision is open.

## Review record

The initial pass used the supplied notes and existing local product analysis, with a separate agent critique of the audience assumptions, first-session flow, and competitive branch. The follow-up incorporates the user's cumulative-creation and judging direction, a separate critique of fairness and round incentives, and the official Cards Against Humanity rules and Gartic Phone introduction linked above. No market demand, API capability, or time estimate was verified. No application tests were rerun for these planning edits. The earlier ModeShift 90/90 result remains a historical automated check of that imported source, not validation of these new concepts.
