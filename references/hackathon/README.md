# Hackathon Game Design Field Guide

Use this pack to make decisions quickly, not to make the project larger. Start here, choose one mechanic pattern, then open the specialist file only when the prototype exposes a problem.

## The 60-second pitch

Fill this in before opening the engine:

> **You are** `[role]` who must `[verb]` to `[immediate goal]`, but every use of `[core mechanic]` creates `[cost, risk, or new problem]`.

If the sentence needs multiple “and” clauses, split or cut the idea.

## The hackathon scope contract

Ship one complete loop with:

- one primary verb;
- one meaningful resource, risk, or constraint;
- one escalation rule;
- one readable success state;
- one quick failure and restart path;
- one memorable audiovisual signature.

Treat menus, accounts, inventories, procedural generation, online multiplayer, narrative branching, and generalized editors as optional until the complete loop works.

## Recommended build order

1. **Gray-box the verb.** Player input changes visible world state.
2. **Add consequence.** The verb spends something, creates exposure, or changes future choices.
3. **Add one opponent or obstacle.** It should test the verb, not demand a second system.
4. **Close the loop.** Add win, loss, and restart.
5. **Tune readability.** Telegraphs, hit confirmation, resource state, and objective clarity.
6. **Add feel.** Animation timing, camera response, particles, audio, hit stop, and trails.
7. **Playtest cold.** Watch someone play without explanation.
8. **Polish the first 30 seconds and the final payoff.** These frame the demo.

## Which file do I need?

| If the problem is…                            | Open…                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| The idea sounds interesting but play is flat  | [01-design-pillars-and-core-loop.md](./01-design-pillars-and-core-loop.md)       |
| The mechanic works but feels weak or unfair   | [02-mechanics-and-game-feel.md](./02-mechanics-and-game-feel.md)                 |
| Numbers, upgrades, or difficulty are unstable | [03-balance-progression-and-economy.md](./03-balance-progression-and-economy.md) |
| The room, enemies, or pacing feel random      | [04-encounters-levels-and-pacing.md](./04-encounters-levels-and-pacing.md)       |
| You need to test, triage, or prepare the demo | [05-playtesting-scope-and-demo.md](./05-playtesting-scope-and-demo.md)           |
| You need a mechanic with clear tuning knobs   | [06-mechanic-pattern-cards.md](./06-mechanic-pattern-cards.md)                   |
| You need the Astra build story and submission | [07-astra-build-and-submission.md](./07-astra-build-and-submission.md)           |

## Five questions before adding a feature

1. Does it strengthen the primary verb?
2. Does it create a new decision, not merely a new animation or number?
3. Can a judge understand its effect without explanation?
4. Can it be tested independently in under two minutes?
5. Can it be removed without breaking the complete loop?

If the first three answers are not “yes,” cut it. If the last answer is “no,” isolate it behind a flag until the core is stable.

## Minimal evidence sheet

Record this after every external playtest:

```text
Build / timestamp:
Hypothesis:
First action the player attempted:
Where they hesitated:
First failure and inferred cause:
Did they notice the core resource or risk?
Did their strategy change by attempt two?
One change for the next build:
```

## Source boundary

The design rules in this pack are working heuristics unless a source is explicitly linked. The [MDA paper](https://www.cs.northwestern.edu/~hunicke/MDA.pdf) is the main decomposition reference. Microsoft’s [Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/xbox/accessibility/guidelines) are the main accessibility reference.
