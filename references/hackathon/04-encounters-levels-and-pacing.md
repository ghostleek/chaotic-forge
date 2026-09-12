# Encounters, Levels, and Pacing

## 1. An encounter is a question

Write the question before placing enemies or obstacles:

- Can the player use vertical movement under pressure?
- Will they spend the shield now or save it for the elite?
- Can they recognize which threat controls space?
- Will they risk a shortcut for a better time?

If the room asks no question, it is scenery or repetition.

## 2. Teach, test, combine, twist

Use this reliable sequence:

1. **Introduce:** present one element safely.
2. **Test:** require the intended response.
3. **Combine:** pair it with an understood element.
4. **Twist:** change space, timing, orientation, or stakes.
5. **Release:** give a low-pressure moment to absorb success.
6. **Mastery:** offer an optional optimization or stylish solution.

In a short game, one room can teach and test; a second can combine; a final room can twist.

## 3. Enemy and obstacle roles

Design roles by the decision they force:

| Role          | Pressure created                 | Useful counter-question                          |
| ------------- | -------------------------------- | ------------------------------------------------ |
| Chaser        | removes safe waiting             | can the player redirect or interrupt it?         |
| Zoner         | denies an area or route          | can the player flank, reflect, or disable it?    |
| Turret/sniper | creates timing windows           | is the telegraph readable off-screen?            |
| Tank/blocker  | delays direct progress           | is bypass or resource conversion possible?       |
| Support       | makes another threat urgent      | can support priority be recognized quickly?      |
| Swarm         | taxes attention and area control | does crowd response feel distinct from dueling?  |
| Mimic/counter | punishes a repeated habit        | does the player receive enough warning to adapt? |
| Hazard        | changes the spatial rules        | can it hurt enemies or create opportunity too?   |

Avoid adding roles whose only difference is health and damage.

## 4. Composition rules

Good combinations create tension between answers:

- chaser + zoner: move now, but route choice matters;
- blocker + sniper: deal with cover or expose yourself;
- swarm + slow heavy attack: crowd management creates a punish window;
- support + fragile damage dealer: target priority competes with immediate danger;
- moving hazard + stationary objective: timing competes with position.

Bad combinations demand incompatible precision without readable sequencing. When testing a new role, pair it with something already understood.

## 5. Space as a mechanic

Audit:

- **Sight lines:** what can be seen before commitment?
- **Approach routes:** are there at least two meaningfully different paths?
- **Safe zones:** are they temporary, earned, or abusable?
- **Choke points:** who benefits and how can the state change?
- **Verticality:** does height change information, safety, or capability?
- **Traversal time:** how long does it take to re-enter the decision?
- **Edge safety:** can the player predict falls, walls, and collision?
- **Landmarks:** can they orient after action or camera movement?

Gray-box with primitives. Decorative detail can hide scale and pathing problems.

## 6. Pacing as contrast

Intensity has several components:

```text
threat density + decision rate + execution demand + uncertainty + failure cost
```

Changing only enemy count often produces noise, not better pacing. Alternate pressure with recovery, anticipation, or choice.

### Simple five-beat demo arc

1. **Hook:** let the player perform the fantasy immediately.
2. **Understanding:** show the cost or constraint.
3. **Escalation:** introduce an obstacle that exploits the constraint.
4. **Payoff:** provide a situation where mastery is spectacular.
5. **Closure:** show a result, transformation, or score worth discussing.

## 7. Checkpoint and restart design

For a hackathon:

- restart in one input;
- return to meaningful control quickly;
- preserve learned information even when state resets;
- avoid replaying noninteractive intros;
- place checkpoints before comprehension turns into repetition;
- use failure text only when the world feedback cannot explain the cause.

Short iteration loops make both player learning and developer tuning faster.

## 8. Encounter review card

```markdown
### Encounter name

- Question asked:
- Mechanic being tested:
- Information visible before commitment:
- Primary threat role:
- Secondary pressure:
- Intended strategy change:
- Likely degenerate strategy:
- Success feedback:
- Failure lesson:
- What can be removed:
```
