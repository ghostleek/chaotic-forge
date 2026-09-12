# Mechanic Pattern Cards

Choose one pattern that expresses the fantasy and can be tested in a single room. Each card distinguishes the intended behavior from the implementation suggestion.

## Quick selection matrix

| Desired behavior                      | Start with                                     |
| ------------------------------------- | ---------------------------------------------- |
| Move toward danger instead of kiting  | Dash through danger; rally recovery            |
| Study and interrupt opponents         | Timed parry; stance matching                   |
| Alternate bursts with restraint       | Heat/overload; stamina pulse                   |
| Express mastery beyond survival       | Style/combo meter; perfect timing tiers        |
| Make information a resource           | Noise/visibility; scan with exposure           |
| Create spatial improvisation          | Tether/magnet; ricochet/redirect               |
| Make failure strategically reversible | Limited rewind; recoverable loss               |
| Make greed visible                    | Push-your-luck cash-out; extraction checkpoint |

## 1. Dash through danger

- **Behavior:** commit through a threat rather than retreat from it.
- **Core rule:** a short directional burst changes collision or damage response for a bounded interval.
- **Trade-off:** cooldown, endpoint exposure, fixed distance, or resource cost.
- **Knobs:** startup, duration, distance, steering, invulnerability window, charges, recovery.
- **Failure modes:** dash becomes universal escape; endpoint is unreadable; invulnerability exceeds animation.
- **Fast test:** projectile wall followed by a target that rewards correct endpoint positioning.

## 2. Timed parry into counter

- **Behavior:** read an attack and convert defense into initiative.
- **Core rule:** defensive input during a narrow attack phase interrupts or exposes the attacker.
- **Trade-off:** missed parry has greater recovery or damage than blocking/dodging.
- **Knobs:** telegraph, active window, input buffer, recovery, stun, counter window, reward tier.
- **Failure modes:** timing cannot be inferred; spam is safer than reading; reward is not worth the risk.
- **Fast test:** one enemy with three clearly distinct attack timings.

## 3. Rally or recoverable loss

- **Behavior:** respond to recent failure with controlled aggression.
- **Core rule:** part of a lost resource remains recoverable for a short window and is restored by a risky action.
- **Trade-off:** re-engagement can compound the original loss.
- **Knobs:** recoverable fraction, expiry, recovery per hit, eligible actions, interruption rules.
- **Failure modes:** players do not notice the buffer; recovery is automatic; optimal play becomes reckless spam.
- **Fast test:** one readable enemy and a health bar that clearly separates permanent and recoverable loss.

## 4. Heat or overload

- **Behavior:** alternate burst output with restraint and repositioning.
- **Core rule:** actions add heat; efficiency falls or the system locks when a threshold is crossed.
- **Trade-off:** maximizing burst creates future vulnerability.
- **Knobs:** heat per action, passive decay, active vent, threshold, overheat penalty, bonus bands.
- **Failure modes:** heat is merely another ammo bar; waiting is boring; overheat feels arbitrary.
- **Fast test:** targets appear in waves with short reposition windows between them.

## 5. Stamina pulse or active recovery

- **Behavior:** maintain rhythm instead of waiting passively for a resource.
- **Core rule:** a timed input after an action restores part of the spent resource.
- **Trade-off:** attention shifts from threat reading to recovery timing.
- **Knobs:** timing window, recovery curve, visual cue, movement allowance, penalty on miss.
- **Failure modes:** mandatory busywork; cue lost in effects; perfect timing removes all resource pressure.
- **Fast test:** short attack string followed by one obvious counterattack cue.

## 6. Style or variety meter

- **Behavior:** vary actions and maintain initiative beyond simply winning.
- **Core rule:** effective variety increases a temporary score tier; repetition, inactivity, or damage reduces it.
- **Trade-off:** expressive play may be less safe than the dominant action.
- **Knobs:** repetition decay, tier thresholds, damage penalty, cash-out rewards, grace period.
- **Failure modes:** meter rewards noise rather than skill; scoring rules are opaque; optimal rotation feels scripted.
- **Fast test:** three verbs, two enemy types, and a score breakdown after 30 seconds.

## 7. Stance or mode matching

- **Behavior:** read context and deliberately reconfigure the moveset.
- **Core rule:** modes alter attack properties and are effective against different defenses or spaces.
- **Trade-off:** switching has attention, timing, or resource cost.
- **Knobs:** number of modes, switch latency, matchup advantage, overlap, lock-in, feedback.
- **Failure modes:** hard rock-paper-scissors; one stance remains acceptable everywhere; icons replace understanding.
- **Fast test:** two enemy defense types with visibly different responses to two stances.

## 8. Noise and visibility

- **Behavior:** choose how much information and attention an action creates.
- **Core rule:** actions emit signals that change detection state over time and space.
- **Trade-off:** fast or powerful actions reveal position; quiet actions cost time or opportunity.
- **Knobs:** signal radius, occlusion, persistence, suspicion decay, propagation delay, false signals.
- **Failure modes:** detection feels binary; player cannot predict who received the signal; waiting dominates.
- **Fast test:** one patrol, one loud shortcut, one slow quiet route, and a visible suspicion state.

## 9. Tether, magnet, or polarity

- **Behavior:** manipulate relationships between objects rather than acting on them independently.
- **Core rule:** two entities attract, repel, constrain, or transfer force/resource while linked.
- **Trade-off:** changing one object changes the risk around the other.
- **Knobs:** range, force curve, break threshold, eligible surfaces, mass ratio, cooldown.
- **Failure modes:** physics instability; unclear link ownership; brute force solves every puzzle.
- **Fast test:** traverse a gap, redirect a hazard, then combine both under time pressure.

## 10. Limited rewind

- **Behavior:** take informed risks and reinterpret failure as information.
- **Core rule:** the player can restore selected recent state while some cost or world state persists.
- **Trade-off:** limited charges, anchored hazards, score loss, or escalating instability.
- **Knobs:** rewind horizon, restored entities, input recording, charge recovery, immutable state.
- **Failure modes:** state desynchronization; unlimited trial removes tension; player cannot predict what rewinds.
- **Fast test:** one dangerous route with visible snapshots and one persistent consequence.

## 11. Push-your-luck cash-out

- **Behavior:** decide when to secure progress versus pursue a multiplier.
- **Core rule:** continued success raises potential reward and potential loss until the player banks it.
- **Trade-off:** cashing out ends momentum or consumes an opportunity.
- **Knobs:** multiplier curve, failure loss, bank locations, warning thresholds, partial insurance.
- **Failure modes:** correct cash-out point is mathematically fixed; stakes are hidden; early loss ends the run.
- **Fast test:** 60-second loop with three escalating risk zones and instant restart.

## 12. Adaptive counterpressure

- **Behavior:** notice when a repeated strategy is becoming unsafe and switch plans.
- **Core rule:** enemies or hazards respond to repeated player behavior with a readable counter.
- **Trade-off:** adaptation takes time, creates another vulnerability, or can be baited.
- **Knobs:** repetition threshold, memory decay, response delay, counter strength, reset condition.
- **Failure modes:** game appears to cheat; counter triggers before pattern is established; all strategies are punished.
- **Fast test:** one enemy with two responses and an explicit tell when adaptation occurs.

## Pattern review questions

Before committing:

1. Can the intended behavior be observed in under two minutes?
2. Is there a credible alternative action?
3. Is the trade-off visible before or immediately after commitment?
4. Are the primary knobs exposed in one place?
5. Can failure teach the next attempt?
6. Can the mechanic be demonstrated with one enemy, room, or puzzle?
7. What would falsify the claim that this pattern supports the intended behavior?
