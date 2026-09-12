# Design Pillars, Player Decisions, and the Core Loop

## 1. Start with intended experience, then work backward

The MDA framework separates:

- **Mechanics:** explicit rules, inputs, resources, entities, and state transitions.
- **Dynamics:** behavior that emerges while those rules interact over time.
- **Aesthetics:** the player experience you want the dynamics to produce.

For a hackathon, use MDA backward:

```text
Desired experience -> observable player behavior -> smallest rule set
```

Example:

```text
Experience: desperate but skillful survival
Behavior: player moves toward danger to recover from mistakes
Rules: recent damage becomes recoverable; attacks restore it briefly
```

Do not treat an emotion as implemented merely because it appears in the pitch. Name the behavior you expect to observe.

Source: [MDA: A Formal Approach to Game Design and Game Research](https://www.cs.northwestern.edu/~hunicke/MDA.pdf).

## 2. Write three design pillars

A pillar is a decision filter, not a genre label. Good pillars are specific enough to reject work.

Weak:

- fun combat;
- immersive world;
- strategic choices.

Useful:

- **Movement is defense:** standing still should become unsafe.
- **Every attack creates exposure:** offense is never free.
- **Failure teaches timing:** the player can identify why they were hit.

For each pillar, define:

| Field        | Question                                      |
| ------------ | --------------------------------------------- |
| Promise      | What should the player repeatedly feel or do? |
| Proof        | What behavior would demonstrate the pillar?   |
| Mechanic     | Which rule creates that behavior?             |
| Anti-feature | What tempting addition would weaken it?       |

## 3. Build a core-loop sentence

Use this grammar:

> The player **reads** `[state]`, **chooses** `[action]`, **executes** `[input]`, receives **feedback**, and enters a changed state with a new decision.

Example:

> Read an enemy wind-up, choose parry or dodge, execute within different timing windows, see the resulting stagger or displacement, then decide whether to cash out damage or reset spacing.

A loop is incomplete if it stops at “press button, effect happens.” It needs a consequence that changes the next decision.

## 4. Test whether a decision matters

A meaningful decision usually has at least three of these properties:

- **Legible:** the player can perceive enough state to choose.
- **Consequential:** options create meaningfully different future states.
- **Contextual:** the best option changes with timing, position, resources, or opponent behavior.
- **Comparable:** the player can understand the trade-off between options.
- **Committed:** at least some choices create temporary opportunity cost or exposure.
- **Learnable:** failure reveals information that improves the next attempt.

### False choices

Watch for:

- one option dominates across all states;
- two weapons differ only cosmetically;
- an upgrade is mandatory rather than expressive;
- random outcomes overwhelm player preparation;
- a choice is offered before the player understands its consequences;
- the safe strategy is also the fastest and most rewarding.

## 5. Separate challenge dimensions

“Hard” can mean several different burdens:

| Dimension            | Typical tuning knobs                                        |
| -------------------- | ----------------------------------------------------------- |
| Reaction             | Telegraph duration, projectile speed, surprise frequency    |
| Precision            | Target size, aim assist, timing window, collision tolerance |
| Planning             | Look-ahead, hidden information, branching options           |
| Memory               | Objective reminders, state persistence, pattern length      |
| Endurance            | Encounter length, checkpoint spacing, resource attrition    |
| Execution complexity | Simultaneous inputs, sequence length, cancellation rules    |
| Knowledge            | Tutorial quality, terminology, discoverability              |

Tune the dimension that supports the fantasy. Do not make every dimension difficult at once.

Microsoft’s accessibility guidance treats difficulty as the interaction between player ability and game barriers, and recommends exposing individual challenge variables where possible. See [XAG 108: Game difficulty options](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/108).

## 6. Add escalation without adding a new game

Escalate by recombining known rules:

1. **Teach:** isolate the verb with low punishment.
2. **Confirm:** require the verb in a predictable situation.
3. **Pressure:** shorten time, add space pressure, or introduce resource tension.
4. **Combine:** pair two already understood elements.
5. **Twist:** invert one assumption while preserving the learned language.
6. **Mastery:** let the player express speed, efficiency, or style.

Prefer changing context over adding controls. A dash can be tested by a gap, a projectile wall, a pursuit enemy, a collapsing floor, and a resource race without becoming five mechanics.

## 7. Mechanic contract template

```markdown
### Mechanic name

- Intended player behavior:
- Trigger/input:
- Preconditions:
- State transformation:
- Cost or exposure:
- Player-readable feedback:
- Failure state:
- What remains invariant:
- Primary tuning knobs:
- One observation that would support the design:
- One observation that would falsify it:
```

## 8. Cut list for tonight

Cut or postpone a feature when it:

- adds content before the core loop is enjoyable twice in a row;
- fixes confusion with instructions instead of feedback;
- needs persistent data to prove a local interaction;
- cannot be demonstrated inside the judge’s likely attention window;
- creates more failure modes than decisions;
- exists mainly because the asset or library is available.
