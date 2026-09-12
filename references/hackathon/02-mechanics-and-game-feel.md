# Mechanics and Game Feel

## 1. Treat every action as a causal chain

```text
Intent -> input -> validation -> action start -> effect -> feedback -> recovery -> next choice
```

When an action feels bad, find the broken link rather than adding particles blindly.

| Symptom                  | Likely cause                                | First experiment                                 |
| ------------------------ | ------------------------------------------- | ------------------------------------------------ |
| “The button did nothing” | input lost, guard unclear, feedback late    | input buffer; explicit unavailable cue           |
| “It feels sluggish”      | long startup, delayed animation, camera lag | front-load motion; shorten startup               |
| “I was robbed”           | poor telegraph or collision mismatch        | extend anticipation; visualize hurtboxes         |
| “Hits lack impact”       | no pause, weak audio, no displacement       | tiny hit stop; pitch/volume layer; knockback     |
| “Movement is slippery”   | slow deceleration or visual drift           | stronger braking; facing cue; dust/trail         |
| “I spam the best move”   | weak commitment or no contextual trade-off  | recovery, heat, positioning cost, enemy response |

## 2. Time anatomy

For an attack, dash, parry, jump, or interaction, expose these phases:

- **Startup:** input to active effect.
- **Active:** interval during which the action can produce its primary outcome.
- **Recovery:** interval before neutral control returns.
- **Buffer:** early input remembered for a later legal moment.
- **Cancel window:** phase in which another action may replace recovery.
- **Grace window:** tolerance added around human timing or collision.

The interesting feel often comes from asymmetry. A parry may have short startup, a narrow active window, and severe recovery; a dodge may have a broad escape outcome but surrender position.

### Useful forgiveness tools

- coyote time after leaving a ledge;
- jump input buffering before landing;
- aim magnetism or target friction;
- generous pickup/interact volumes;
- late-jump collision forgiveness near corners;
- early combo buffering;
- cooldown feedback before the action is ready;
- priority rules when two inputs arrive together.

Forgiveness should preserve the intended decision while reducing accidental failure.

## 3. Telegraph, outcome, recovery

Every dangerous event needs three readable moments:

1. **Telegraph:** what is about to happen and where?
2. **Outcome:** what connected, missed, blocked, or changed?
3. **Recovery:** when can each actor act again?

Use different channels for critical information:

- motion/pose;
- shape or silhouette;
- color/value;
- audio onset and impact;
- particles/trails;
- controller haptics;
- UI state.

Never make color, sound, or haptics the only carrier of essential information. Microsoft recommends redundant sensory channels for game-critical cues and configurable haptics. See [XAG 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103) and [XAG 110](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/110).

## 4. Impact stack

Add impact from cheapest to most expensive:

1. accurate collision and timing;
2. clear pose change;
3. hit flash or material response;
4. directional particles or trail;
5. layered sound with distinct transient;
6. tiny hit stop or time dilation;
7. target displacement/recoil;
8. restrained camera impulse;
9. persistent world mark, debris, or state change.

Do not stack maximum intensity on ordinary actions. Reserve contrast for critical hits, perfect timing, finishers, or danger.

## 5. Movement feel worksheet

| Variable          | Question                                                             |
| ----------------- | -------------------------------------------------------------------- |
| Acceleration      | How quickly does intent become motion?                               |
| Maximum speed     | Is traversal readable at the camera scale?                           |
| Deceleration      | Can the player stop where expected?                                  |
| Turn rate         | Does direction change instantly or communicate mass?                 |
| Air control       | How much can a committed jump be corrected?                          |
| Gravity profile   | Is rise/fall symmetric? Should descent be faster?                    |
| Collision         | Do slopes, ledges, corners, and small obstacles behave consistently? |
| Camera lead       | Can the player see the space they are moving toward?                 |
| Resource/cooldown | What stops movement from becoming a dominant escape?                 |

Change one variable family at a time. Record the previous value so tuning remains reversible.

## 6. Input accessibility as mechanic quality

Audit the physical demand of the mechanic:

- Can actions be remapped?
- Does success require rapid repetition, simultaneous presses, long holds, or fine analog control?
- Can hold become toggle?
- Can mash become hold or a slower cadence?
- Can timing windows, game speed, aim assistance, and camera sensitivity be adjusted?
- Is every action available through keyboard-only or controller-only use where appropriate?

Remapping does not solve speed, duration, or multi-input complexity by itself. See [XAG 107: Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107).

## 7. Fast tuning protocol

1. Pick one target behavior, such as “dash late through danger.”
2. Identify the two variables most likely to govern it.
3. Make three deliberately different presets: forgiving, intended, punishing.
4. Test in the same 20–40 second scenario.
5. Observe behavior, not preference words.
6. Choose a direction, then make smaller changes.

Do not tune ten variables by feel in one session. You will lose causal knowledge.
