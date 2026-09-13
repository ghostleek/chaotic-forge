# Fixed demo combinations

Latest user decision: drop mixed-hand dealing and swapping for simplicity. Use the existing authored demo choices and backend rules. This bounds recipes without assigning a category to a particular player.

## Initial round: 8 recipes

| # | FPS | Zombies | Cooking |
|---|---|---|---|
| 1 | knockback | pursuers | quick-orders |
| 2 | knockback | pursuers | batch-orders |
| 3 | knockback | noise-seekers | quick-orders |
| 4 | knockback | noise-seekers | batch-orders |
| 5 | counter-ricochet | pursuers | quick-orders |
| 6 | counter-ricochet | pursuers | batch-orders |
| 7 | counter-ricochet | noise-seekers | quick-orders |
| 8 | counter-ricochet | noise-seekers | batch-orders |

**Bound:** 2 × 2 × 2 = 8 distinct initial recipes. With three distinct contributors, 3! × 8 = 48 player-to-card assignments. Choice/arrival order, nicknames, avatars, command IDs and seeds are not additional card recipes; they still require their own behavioral tests where relevant.

## Selection rule

Show the same six fixed options. Each participant contributes once; the final recipe has exactly one FPS, one zombie and one cooking choice. No dealing, shuffle, redraw, swap, or custom-card submission. Anyone can claim any currently unclaimed category. Once a server-accepted contribution claims it, show that category as taken for the other participants. Remaining choice counts are 6 → 4 → 2 for the other contributors. A simultaneous claim is resolved by the existing revision/receipt authority, never optimistic success. Changing a local selection before confirmation is still allowed.

The local study uses these exact six IDs and has no swap paths. It is not connected to PC-03 yet, so it does not simulate remote category claims or call a local click server acceptance. The conceptual blank remains disabled and adds zero combinations.

## Later rounds are a separate bound

The current backend has three singleton additions: Dinner bell, Hot potato, Zombie pantry. Winner and loser each add one, with Pass only once the available pool is exhausted. Under successful normal continuation, the active addition sets have sizes 0, 2, then 3. Therefore the rule-set bound is 8 × (1 + 3 + 1) = **40** across initial and evolved versions. This counts equivalent rule sets, not distinct ordered histories, participants, seeds or manifest hashes. Failed/pending builds do not become extra playable combinations. Testing only the eight initial recipes does not establish later-round acceptance.

## Scope and evidence

The simple first selection surface is bounded to the eight initial recipes. Preserve the existing later-round contract for later UI integration; do not invent a new deck or silently remove both editors. The inventory is enumerated locally from the six accepted IDs; it is not a new runtime qualification or a generated-game claim. See `demo-combinations.json` for the reusable list.
