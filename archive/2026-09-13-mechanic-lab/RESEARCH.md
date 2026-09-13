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
7. Riot Games, [Your First Game](https://nexus.leagueoflegends.com/en-us/2009/10/your-first-game/).
8. Riot Games, [League of Legends — Game Overview](https://www.leagueoflegends.com/en-us/).
9. Nexon, [MapleStory Growth Guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/377).
10. Nexon Japan, [MapleStory Level-up Guide](https://maplestory.nexon.co.jp/gameguide/tip/levelup/).
11. Nexon, [MapleStory Equipment Transfer Guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/414).
12. Nexon, [MapleStory Boss Reward Guide](https://maplestory.nexon.com/Guide/N23GameInformation/Articles/459).
13. Riot Games, [League of Legends VFX Style Guide](https://nexus.leagueoflegends.com/wp-content/uploads/2017/10/VFX_Styleguide_final_public_hidpjqwx7lqyx0pjj3ss.pdf).
14. Flowise, [Introduction](https://docs.flowiseai.com/) — visual-builder product reference, not game-design theory.

## Sample decomposition: MapleStory

### Natural-language principles

- **Repetition becomes visible growth.** Hunting, quests, and content award EXP and resources, so the immediate combat loop continuously advances the character.
- **Guidance keeps the grind legible.** The Maple Guide points toward level-appropriate fields and quests; level difference changes reward efficiency and combat effectiveness.
- **Milestones change the verb set.** Levels award stat and skill choices, while job advancement and later systems expand how the same player acts.
- **Progress nests across time scales.** Gear transfer, boss rewards, Link Skills, and Union let one session feed equipment, character, and account-wide goals.

### Mechanic Forge translation

`lasting mastery → suitable field → hunt → reward emission → EXP meter → level threshold → specialization → gear growth → harder content → next hunt`

The graph also branches specialization into account-wide roster growth and sends both short-loop and long-loop events into a mastery-cadence metric. This is a product synthesis based on Nexon's documentation, not a claim that Nexon models MapleStory with this exact graph.

## Sample decomposition: League of Legends

### Natural-language principles

- **One objective organizes every sub-goal.** The enemy Nexus is the win condition; lanes, fights, and structures matter because they change the path to it.
- **Power is earned and converted locally.** Last-hits and kills create gold, nearby deaths create experience, and recall converts stored gold into items at the opportunity cost of map time.
- **Space turns combat into progress.** Minion waves let teams pressure turrets, so winning a local interaction can become durable map progress.
- **Roles distribute attention and agency.** Five positions and different champion styles split responsibilities, while competitive clarity helps players anticipate actions.

### Mechanic Forge translation

`Nexus objective → map role → minion wave → last-hit → gold/XP → recall → items/levels → contest space → push with wave → structure → Nexus`

The evidence atom measures advantage-to-objective conversion. This makes the graph useful for mutation: a designer can change one conversion rule—recall access, wave timing, structure gating, or reward rate—and state the player behavior and fairness risk it should alter.

## MVP implications

- Nodes must be inspectable and independently editable.
- Edges must distinguish events, state dependencies, and evidence flow.
- A graph run should return a trace, a behavior prediction, a trust risk, and a proposed metric.
- Generated percentages must be labeled as model estimates until backed by real playtest telemetry.
- Reusable economy nodes should follow Machinations' established vocabulary rather than inventing near-synonyms.
