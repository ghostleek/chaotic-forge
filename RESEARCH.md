# Mechanic Forge: research basis for a game-atom graph

## Product conclusion

The engine should not claim that one theory supplies a universal game-design grammar. The useful move is to combine several distinct lenses while keeping their provenance visible:

- **Koster's game atoms** provide the graph model: systems are built from linked and nested atoms, with challenge, abilities, variable feedback, mastery, and failure cost.
- **Sicart's mechanics** provide the code boundary: a mechanic is a method invoked by an agent to interact with game state.
- **Actum / tactum / factum** provide interaction semantics: player-triggered reaction, player-object interaction, and world-object interaction. These terms come from Frédéric Séraphine's ludophrase framework, not Koster's atom model.
- **Rules of Play** distinguishes constitutive rules (underlying logic), operational rules (player-facing procedures), and implicit rules (social expectations).
- **MDA** provides the causal bridge from implemented mechanics to runtime dynamics and intended player experience.
- **Machinations** provides a specialized economy vocabulary: sources, pools, drains, converters, traders, gates, resource connections, and state connections.

Mechanic Forge therefore uses a deliberately synthesized atom contract:

1. Intent — the desired dynamic or player behavior.
2. Trigger — the agent or world event that starts the atom.
3. Guard — the precondition for the transition.
4. Transform — the smallest explicit state change.
5. Interaction — the entities and topology affected.
6. Feedback — how the player can perceive the result.
7. Risk / failure — the cost or rejected branch.
8. Invariant — the fairness or trust boundary.
9. Evidence — the observable playtest metric.

This is the product's schema, not a claim that the nine fields form an established academic standard.

## Sources

1. Raph Koster, [An Atomic Theory of Fun Game Design](https://www.raphkoster.com/2012/01/24/an-atomic-theory-of-fun-game-design/).
2. Robin Hunicke, Marc LeBlanc, and Robert Zubek, [MDA: A Formal Approach to Game Design and Game Research](https://www.cs.northwestern.edu/~hunicke/MDA.pdf).
3. Katie Salen and Eric Zimmerman, [Rules of Play](https://mitpress.mit.edu/9780262299930/rules-of-play/).
4. Frédéric Séraphine, [Ludophrases: Ludics Before Mechanics](https://www.fredericseraphine.com/index.php/2016/08/19/ludophrases/).
5. Miguel Sicart, [Defining Game Mechanics](https://www.gamestudies.org/0802/articles/sicart).
6. Machinations, [Framework Basics](https://machinations.gitbook.io/docs/getting-started/framework-basics).
7. Flowise, [Introduction](https://docs.flowiseai.com/) — visual-builder product reference, not game-design theory.

## MVP implications

- Nodes must be inspectable and independently editable.
- Edges must distinguish events, state dependencies, and evidence flow.
- A graph run should return a trace, a behavior prediction, a trust risk, and a proposed metric.
- Generated percentages must be labeled as model estimates until backed by real playtest telemetry.
- Reusable economy nodes should follow Machinations' established vocabulary rather than inventing near-synonyms.
