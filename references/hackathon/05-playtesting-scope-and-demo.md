# Playtesting, Scope Control, and the Demo

## 1. Test a claim, not “fun”

Use a falsifiable hypothesis:

> When `[situation]`, players will `[observable behavior]` because `[mechanic]`; we will reconsider if `[counter-observation]`.

Example:

> When recently damaged, players will re-engage rather than retreat because attacks recover buffered health; reconsider if most players do not notice the buffer or repeatedly die while trying to recover it.

## 2. The smallest useful test

Keep only:

- the mechanic under test;
- the context needed to make its trade-off meaningful;
- a clear start and end;
- enough feedback to understand cause and effect;
- a quick reset.

Replace everything else with fixed values, placeholders, or a test harness.

## 3. Cold-playtest protocol

### Before

- Write the hypothesis and one primary observation.
- Reset the build and verify controls.
- Decide what you will not explain.
- Prepare a two-minute task, not a feature tour.

### During

- Ask the player to think aloud only if it does not disrupt timing-heavy play.
- Do not rescue immediately; note the hesitation first.
- Record actions, state, and timing rather than interpreting motives.
- Ask neutral prompts: “What are you trying to do?” or “What changed?”
- Separate bugs, comprehension failures, execution failures, and preference.

### After

Ask:

1. What did you think the goal was?
2. What changed when you used the main ability?
3. What felt risky?
4. What strategy did you try next?
5. What one thing would you change?

Do not treat stated enthusiasm as proof of behavior.

## 4. Observation categories

| Category        | Example                                | Typical response                      |
| --------------- | -------------------------------------- | ------------------------------------- |
| Discoverability | never tries the ability                | affordance, prompt, safe introduction |
| Comprehension   | uses it but predicts wrong result      | feedback, rule simplification         |
| Execution       | understands but cannot perform         | timing/input/grace tuning             |
| Strategy        | performs but chooses a degenerate loop | cost, counterpressure, context        |
| Affect          | behavior works but feels weak          | impact stack, stakes, pacing          |
| Reliability     | result changes unexpectedly            | state isolation, deterministic reset  |

## 5. Minimal telemetry

For a local prototype, log only events that answer the design claim:

```text
run_started
core_action_attempted
core_action_succeeded
core_action_failed(reason)
resource_changed(source, amount)
player_failed(cause)
goal_completed
run_restarted
```

Useful derived measures:

- time to first core action;
- attempts before first success;
- success rate by context;
- time between failure and restart;
- strategy change between attempt one and two;
- completion with and without the mechanic.

Logs explain what happened; observation helps explain why. Keep both modest.

## 6. Bug and scope triage

### P0 — demo blocker

- cannot start, finish, or restart;
- crash or corrupted state;
- input is lost;
- goal or failure cannot be understood;
- primary mechanic does not produce its outcome.

### P1 — mechanic blocker

- dominant exploit bypasses the intended loop;
- feedback consistently implies the wrong cause;
- common collision/camera issue makes failure feel arbitrary;
- tuning prevents most testers from reaching the payoff.

### P2 — polish

- secondary animation issue;
- minor clipping;
- optional setting or content;
- rare edge case outside the demo path.

Fix P0, contain P1, document P2. Do not let polish hide a broken loop.

## 7. 24-hour working plan

| Time remaining | Target                                                 |
| -------------- | ------------------------------------------------------ |
| 24–18h         | playable verb, consequence, win/loss/reset             |
| 18–12h         | one complete encounter and two external tests          |
| 12–8h          | tune core behavior; lock feature scope                 |
| 8–4h           | feedback, onboarding, accessibility, stability         |
| 4–2h           | build, backup, cold demo rehearsal                     |
| Final 2h       | blocker fixes only; capture fallback video/screenshots |

Keep a last-known-good build before risky integration work.

## 8. Judge-facing demo structure

1. **One sentence:** role, verb, tension.
2. **Immediate play:** show the mechanic before architecture.
3. **Decision:** demonstrate two options and their trade-off.
4. **Escalation:** show how context changes the best answer.
5. **Payoff:** execute the satisfying mastery moment.
6. **Evidence:** state what playtesting changed.
7. **Close:** name the product direction, not a backlog.

Prepare a 60–90 second fallback recording. Live demos fail for reasons unrelated to design.

## 9. Final readiness checklist

- [ ] Fresh launch works.
- [ ] Controls are visible and remappable where feasible.
- [ ] Game can be completed without developer explanation.
- [ ] Failure cause is readable.
- [ ] Restart is fast.
- [ ] Audio can be lowered or disabled.
- [ ] Critical cues do not rely on one sensory channel.
- [ ] Window/fullscreen behavior is known.
- [ ] Build and source are backed up.
- [ ] Demo has a rehearsed ending.
