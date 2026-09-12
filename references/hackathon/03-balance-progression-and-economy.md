# Balance, Progression, and Economy

## 1. Balance for decisions, not equal numbers

Two options are balanced when each becomes desirable under understandable conditions—not necessarily when damage per second is equal.

Ask:

- What context makes this option best?
- What cost prevents universal dominance?
- What information does the player need to compare options?
- What counter or failure mode keeps mastery interesting?
- Does the weaker-looking choice support a distinct strategy?

## 2. Minimum combat math

Use simple derived metrics to expose accidental dominance.

```text
damage_per_second = damage_per_hit * hit_rate * accuracy
time_to_defeat = enemy_health / effective_damage_per_second
expected_value = probability_of_success * reward - probability_of_failure * cost
resource_efficiency = useful_output / resource_spent
```

These are diagnostic models, not player experience. Position, interruption, overkill, crowd control, startup, recovery, and risk can matter more than paper DPS.

### Comparison sheet

| Option | Burst | Sustained output | Range | Commitment | Resource cost | Failure cost | Best context |
| ------ | ----: | ---------------: | ----: | ---------: | ------------: | -----------: | ------------ |
| A      |       |                  |       |            |               |              |              |
| B      |       |                  |       |            |               |              |              |
| C      |       |                  |       |            |               |              |              |

## 3. Economy: sources, stores, sinks, converters

Map every important resource:

- **Source:** creates resource.
- **Store:** holds it, often with a cap.
- **Sink:** removes it permanently or temporarily.
- **Converter:** trades one resource for another.
- **Gate:** requires a threshold or key state.
- **Leak/decay:** removes resource over time.

For each resource, answer:

```text
Why does the player want it?
How do they earn it?
What prevents hoarding?
What creates an interesting spend decision?
Can the player recover from scarcity?
What UI/feedback makes the state legible?
```

### Feedback loops

- **Positive loop:** success increases future ability to succeed. Useful for acceleration and power fantasy; dangerous for runaway leads.
- **Negative loop:** success increases resistance or failure creates help. Useful for stability; dangerous when it invalidates skill.

Hackathon rule: implement at most one obvious positive loop and one stabilizer. Make both visible.

## 4. Progression types

| Type                | What changes                          | Strength                 | Risk                         |
| ------------------- | ------------------------------------- | ------------------------ | ---------------------------- |
| Power               | larger numbers or capacity            | immediately legible      | content becomes obsolete     |
| Option              | new verbs, routes, or loadout choices | expressive builds        | complexity and tutorial load |
| Mastery             | player knowledge/execution improves   | deep with little content | can feel inaccessible        |
| Access              | new areas, encounters, or information | supports discovery       | keys can become chores       |
| Relationship/status | world or character response changes   | emotional motivation     | expensive content dependency |

Prefer option plus mastery for a short prototype: one new possibility can change strategy without requiring a long content treadmill.

## 5. Upgrade design

A useful upgrade should do at least one:

- unlock a new decision;
- change a timing or positioning pattern;
- create a synergy with an existing rule;
- convert one resource into another;
- trade reliability for upside;
- make a previously risky strategy viable.

Avoid upgrades that merely repair an intentionally unpleasant baseline. The unupgraded verb still needs to feel coherent.

### Three-upgrade structure

For a demo, offer three sharply differentiated choices:

1. **Reliable:** larger window, lower cost, safer recovery.
2. **Expressive:** cancel, redirect, chain, or alternate use.
3. **Volatile:** larger reward paired with exposure or resource risk.

This communicates a progression thesis without a full tree.

## 6. Difficulty without stat inflation

Escalate along one or two dimensions:

- less reaction time;
- more simultaneous threats;
- constrained space;
- longer planning horizon;
- reduced resource recovery;
- stronger punishment for repeated strategy;
- mixed enemy roles;
- hidden information that can be uncovered;
- optional score or efficiency target.

Expose assists on the same underlying variables when possible. Describing what a setting changes is more useful than labels such as “easy” or “hard.” Microsoft’s [XAG 108](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/108) recommends multiple difficulty options and granular configuration of core challenges.

## 7. Balance failure patterns

- **Dominant strategy:** one action wins regardless of context.
- **Degenerate loop:** repeating a safe action avoids the intended interaction.
- **Death spiral:** early failure reduces the ability to recover.
- **Runaway leader:** success compounds faster than opponents can respond.
- **Solved economy:** one conversion path dominates all spending.
- **Invisible tax:** upkeep exists but produces no interesting decision.
- **Choice overload:** the player cannot form a model before choosing.
- **Threshold cliff:** a tiny numerical change flips an option from useless to mandatory.

Fix the decision structure before adjusting decimal values.
