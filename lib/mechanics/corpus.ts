import {
  COMPARISON_DIMENSIONS,
  MECHANIC_SCHEMA_VERSION,
  assertValidMechanicCorpus,
  type ComparisonDimension,
  type ComparisonScore,
  type MechanicImplementationCard,
  type SourceReference,
  type SourcedStatement,
} from './schema.ts';

const ACCESSED_AT = '2026-09-12';

const SOURCES = {
  bloodborne: {
    id: 'playstation-bloodborne-survival',
    title: 'Bloodborne: 24 Tips for Survival',
    publisher: 'PlayStation Blog',
    url: 'https://blog.playstation.com/2015/03/23/bloodborne-24-tips-for-survival/',
    kind: 'publisher',
    confidence: 'high',
    accessedAt: ACCESSED_AT,
    rights: 'link-and-summary-only',
  },
  sekiroMechanics: {
    id: 'activision-sekiro-mechanics',
    title: 'Sekiro: Shadows Die Twice Game Mechanics',
    publisher: 'Activision Support',
    url: 'https://support.activision.com/sekiro/articles/sekiro-shadows-die-twice-game-mechanics',
    kind: 'publisher',
    confidence: 'high',
    accessedAt: ACCESSED_AT,
    rights: 'link-and-summary-only',
  },
  sekiroStrategies: {
    id: 'activision-sekiro-strategies',
    title: 'Sekiro: Shadows Die Twice Strategies',
    publisher: 'Activision',
    url: 'https://blog.activision.com/sekiro/2019-03/Sekiro-Shadows-Die-Twice-Strategies-Surviving-Your-First-Few-Hours-as-the-One-Armed-Wolf',
    kind: 'publisher',
    confidence: 'high',
    accessedAt: ACCESSED_AT,
    rights: 'link-and-summary-only',
  },
  nioh: {
    id: 'playstation-nioh-2-tips',
    title: 'Survive Nioh 2’s Opening Hours with 9 Gameplay Tips',
    publisher: 'PlayStation Blog',
    url: 'https://blog.playstation.com/2020/03/11/survive-nioh-2s-opening-hours-with-9-gameplay-tips/',
    kind: 'publisher',
    confidence: 'high',
    accessedAt: ACCESSED_AT,
    rights: 'link-and-summary-only',
  },
  ghost: {
    id: 'playstation-ghost-katana',
    title: 'Ghost of Tsushima: Mastering the Katana',
    publisher: 'PlayStation Blog / Sucker Punch Productions',
    url: 'https://blog.playstation.com/2020/06/23/ghost-of-tsushima-mastering-the-katana/',
    kind: 'developer',
    confidence: 'high',
    accessedAt: ACCESSED_AT,
    rights: 'link-and-summary-only',
  },
  returnal: {
    id: 'playstation-returnal-preview',
    title: 'Returnal: Hands-on Preview',
    publisher: 'PlayStation Blog',
    url: 'https://blog.playstation.com/2021/04/01/returnal-hands-on-preview/',
    kind: 'publisher',
    confidence: 'high',
    accessedAt: ACCESSED_AT,
    rights: 'link-and-summary-only',
  },
} satisfies Record<string, SourceReference>;

const sourced = (text: string, sourceId: string): SourcedStatement => ({
  text,
  origin: 'source',
  sourceIds: [sourceId],
});

const synthesis = (text: string, sourceId: string): SourcedStatement => ({
  text,
  origin: 'product-synthesis',
  sourceIds: [sourceId],
});

type ComparisonDraft = Record<
  ComparisonDimension,
  [score: ComparisonScore, label: string, note: string]
>;

const comparison = (
  sourceId: string,
  draft: ComparisonDraft,
): MechanicImplementationCard['comparison'] =>
  Object.fromEntries(
    COMPARISON_DIMENSIONS.map((dimension) => {
      const [score, label, note] = draft[dimension];
      return [dimension, { score, label, note: synthesis(note, sourceId) }];
    }),
  ) as MechanicImplementationCard['comparison'];

export const VALIDATION_CORPUS: MechanicImplementationCard[] = [
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'bloodborne-rally',
    patternId: 'recoverable-health-counterattack',
    patternName: 'Recoverable health through counterattack',
    implementationName: 'Rally window',
    game: {
      name: 'Bloodborne',
      releaseYear: 2015,
      genres: ['action-rpg', 'soulslike'],
      platforms: ['PlayStation'],
      sourceIds: [SOURCES.bloodborne.id],
    },
    summary: sourced(
      'After taking damage, the player has a short window to regain lost health by landing attacks.',
      SOURCES.bloodborne.id,
    ),
    causal: {
      intent: synthesis(
        'Turn recent damage into a prompt for controlled counteraggression.',
        SOURCES.bloodborne.id,
      ),
      trigger: sourced(
        'The player takes recoverable damage.',
        SOURCES.bloodborne.id,
      ),
      guard: sourced(
        'The regain window remains open for only a few seconds.',
        SOURCES.bloodborne.id,
      ),
      transform: sourced(
        'Successful blows restore some of the recently lost health.',
        SOURCES.bloodborne.id,
      ),
      interaction: synthesis(
        'The damaged player must re-engage an enemy at attack range.',
        SOURCES.bloodborne.id,
      ),
      feedback: synthesis(
        'The recoverable portion of health and successful restoration must be readable.',
        SOURCES.bloodborne.id,
      ),
      risk: synthesis(
        'Greedy retaliation can expose the player to another hit.',
        SOURCES.bloodborne.id,
      ),
      invariant: synthesis(
        'Only recent recoverable damage can be restored during the bounded window.',
        SOURCES.bloodborne.id,
      ),
      evidence: synthesis(
        'Measure regain attempted, health recovered, and damage taken during the window.',
        SOURCES.bloodborne.id,
      ),
    },
    discovery: {
      behaviors: [
        'reward counteraggression',
        'recover after taking damage',
        'maintain offensive pressure',
      ],
      systemFamilies: ['resource-recovery', 'pressure-reward'],
      genres: ['action-rpg', 'soulslike'],
      platforms: ['PlayStation'],
      timescale: 'moment',
      context: 'single-player',
      complexity: 'medium',
      dependencies: [
        'recoverable-health buffer',
        'melee hit confirmation',
        'health feedback',
      ],
      risks: ['greed spiral', 'unclear recovery window'],
    },
    tunables: [
      {
        name: 'Rally window',
        unit: 'seconds',
        note: 'Time in which recent damage can be recovered.',
      },
      {
        name: 'Recovery per hit',
        unit: 'health',
        note: 'Amount of buffered health restored by a confirmed hit.',
      },
    ],
    comparison: comparison(SOURCES.bloodborne.id, {
      agency: [
        3,
        'High',
        'The player chooses whether and how aggressively to contest recent damage.',
      ],
      executionDemand: [
        2,
        'Medium',
        'Recovery asks for quick but not frame-perfect retaliation.',
      ],
      failureCost: [
        3,
        'High',
        'A failed counterattack risks compounding the original damage.',
      ],
      counterplayWindow: [
        2,
        'Bounded',
        'The short regain window limits when recovery is available.',
      ],
      feedbackClarity: [
        3,
        'Strong',
        'The health bar can expose both recoverable health and restoration.',
      ],
      implementationComplexity: [
        2,
        'Medium',
        'It requires buffered damage, expiry, and hit attribution.',
      ],
      evidenceBurden: [
        2,
        'Medium',
        'A test must separate useful aggression from reckless follow-up damage.',
      ],
    }),
    matchTerms: [
      'rally',
      'lifesteal alternative',
      'temporary health loss',
      'aggression reward',
    ],
    sources: [SOURCES.bloodborne],
  },
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'bloodborne-firearm-parry',
    patternId: 'timed-interrupt-riposte',
    patternName: 'Timed interrupt into high-value counter',
    implementationName: 'Firearm stun and Visceral Strike',
    game: {
      name: 'Bloodborne',
      releaseYear: 2015,
      genres: ['action-rpg', 'soulslike'],
      platforms: ['PlayStation'],
      sourceIds: [SOURCES.bloodborne.id],
    },
    summary: sourced(
      'A well-timed firearm shot during an enemy attack briefly stuns the target and enables a Visceral Strike.',
      SOURCES.bloodborne.id,
    ),
    causal: {
      intent: synthesis(
        'Reward reading an attack with a decisive offensive defense.',
        SOURCES.bloodborne.id,
      ),
      trigger: sourced(
        'The player fires as an enemy attack is arriving.',
        SOURCES.bloodborne.id,
      ),
      guard: synthesis(
        'The shot must land inside the attack-specific interrupt window.',
        SOURCES.bloodborne.id,
      ),
      transform: sourced(
        'The enemy becomes briefly stunned and vulnerable to a close-range strike.',
        SOURCES.bloodborne.id,
      ),
      interaction: synthesis(
        'A ranged timing check creates a short close-range punish opportunity.',
        SOURCES.bloodborne.id,
      ),
      feedback: synthesis(
        'The stun and riposte opening must be distinct from ordinary firearm damage.',
        SOURCES.bloodborne.id,
      ),
      risk: synthesis(
        'A mistimed shot spends ammunition and leaves the attack unresolved.',
        SOURCES.bloodborne.id,
      ),
      invariant: synthesis(
        'The high-value riposte requires the timed stun, not any firearm hit.',
        SOURCES.bloodborne.id,
      ),
      evidence: synthesis(
        'Measure attempts, successful interrupts, riposte conversion, and damage received.',
        SOURCES.bloodborne.id,
      ),
    },
    discovery: {
      behaviors: [
        'reward precise defensive timing',
        'convert defense into offense',
        'read enemy attacks',
      ],
      systemFamilies: ['timing-defense', 'pressure-reward'],
      genres: ['action-rpg', 'soulslike'],
      platforms: ['PlayStation'],
      timescale: 'moment',
      context: 'single-player',
      complexity: 'medium',
      dependencies: [
        'attack phase windows',
        'ammunition economy',
        'stun state',
        'riposte action',
      ],
      risks: ['opaque timing', 'binary punishment'],
    },
    tunables: [
      {
        name: 'Interrupt window',
        unit: 'milliseconds',
        note: 'Valid timing around the incoming strike.',
      },
      {
        name: 'Stun duration',
        unit: 'seconds',
        note: 'Time available to convert the interrupt into a riposte.',
      },
    ],
    comparison: comparison(SOURCES.bloodborne.id, {
      agency: [
        3,
        'High',
        'Players choose the safer dodge or the riskier interrupt attempt.',
      ],
      executionDemand: [
        3,
        'High',
        'Success depends on reading and timing a narrow attack phase.',
      ],
      failureCost: [
        3,
        'High',
        'Failure can cost ammunition and incoming health.',
      ],
      counterplayWindow: [
        1,
        'Narrow',
        'The interrupt is tied to a brief point in the enemy attack.',
      ],
      feedbackClarity: [
        3,
        'Strong',
        'A distinct stun communicates the successful timing outcome.',
      ],
      implementationComplexity: [
        2,
        'Medium',
        'It needs attack windows, projectile attribution, stun, and follow-up state.',
      ],
      evidenceBurden: [
        2,
        'Medium',
        'Timing success and punish conversion can be observed in short encounters.',
      ],
    }),
    matchTerms: [
      'parry',
      'riposte',
      'visceral',
      'gun counter',
      'perfect timing',
    ],
    sources: [SOURCES.bloodborne],
  },
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'sekiro-deflection-posture',
    patternId: 'deflection-pressure-meter',
    patternName: 'Deflection advances an offensive break meter',
    implementationName: 'Deflection and Posture',
    game: {
      name: 'Sekiro: Shadows Die Twice',
      releaseYear: 2019,
      genres: ['action-adventure', 'soulslike'],
      platforms: ['PC', 'PlayStation', 'Xbox'],
      sourceIds: [SOURCES.sekiroMechanics.id],
    },
    summary: sourced(
      'Timed deflections damage enemy Posture; breaking Posture exposes the enemy to a Deathblow.',
      SOURCES.sekiroMechanics.id,
    ),
    causal: {
      intent: synthesis(
        'Make active defense sustain offensive pressure.',
        SOURCES.sekiroMechanics.id,
      ),
      trigger: sourced(
        'The player guards immediately before an enemy blow lands.',
        SOURCES.sekiroMechanics.id,
      ),
      guard: synthesis(
        'The input must fall within the deflection timing window.',
        SOURCES.sekiroMechanics.id,
      ),
      transform: sourced(
        'The attack is deflected and enemy Posture increases.',
        SOURCES.sekiroMechanics.id,
      ),
      interaction: synthesis(
        'Enemy attack timing becomes the player’s route to a finishing opportunity.',
        SOURCES.sekiroMechanics.id,
      ),
      feedback: sourced(
        'Posture bars show progress toward breaking each combatant’s stance.',
        SOURCES.sekiroMechanics.id,
      ),
      risk: synthesis(
        'Poor timing can turn a deflection attempt into damage or player Posture pressure.',
        SOURCES.sekiroMechanics.id,
      ),
      invariant: sourced(
        'A Posture break creates only a momentary Deathblow opening.',
        SOURCES.sekiroMechanics.id,
      ),
      evidence: synthesis(
        'Measure deflection rate, Posture pressure, breaks, and Deathblow conversion.',
        SOURCES.sekiroMechanics.id,
      ),
    },
    discovery: {
      behaviors: [
        'convert defense into offense',
        'stay engaged under pressure',
        'learn attack rhythm',
      ],
      systemFamilies: ['timing-defense', 'pressure-reward'],
      genres: ['action-adventure', 'soulslike'],
      platforms: ['PC', 'PlayStation', 'Xbox'],
      timescale: 'encounter',
      context: 'single-player',
      complexity: 'high',
      dependencies: [
        'attack phase windows',
        'posture meter',
        'deathblow state',
        'vitality coupling',
      ],
      risks: ['opaque timing', 'meter snowball'],
    },
    tunables: [
      {
        name: 'Deflection window',
        unit: 'milliseconds',
        note: 'Timing tolerance before impact.',
      },
      {
        name: 'Posture damage',
        unit: 'meter',
        note: 'Pressure added by a successful deflection.',
      },
      {
        name: 'Posture recovery',
        unit: 'meter/second',
        note: 'Recovery rate influenced by remaining Vitality.',
      },
    ],
    comparison: comparison(SOURCES.sekiroMechanics.id, {
      agency: [
        3,
        'High',
        'Players can attack, deflect, disengage, or mix those responses.',
      ],
      executionDemand: [
        3,
        'High',
        'Repeated attack-specific timing is central to success.',
      ],
      failureCost: [
        3,
        'High',
        'Misses can damage health and the player’s own Posture.',
      ],
      counterplayWindow: [
        1,
        'Narrow',
        'Each deflection depends on a brief pre-impact window.',
      ],
      feedbackClarity: [
        3,
        'Strong',
        'Visible Posture bars connect timing success to encounter progress.',
      ],
      implementationComplexity: [
        3,
        'High',
        'The loop couples attack phases, two Posture states, Vitality, and finishers.',
      ],
      evidenceBurden: [
        3,
        'High',
        'Tests must separate timing mastery, enemy familiarity, and meter tuning.',
      ],
    }),
    matchTerms: [
      'posture',
      'deflect',
      'deathblow',
      'active defense',
      'combat rhythm',
    ],
    sources: [SOURCES.sekiroMechanics],
  },
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'sekiro-mikiri-counter',
    patternId: 'attack-specific-risk-counter',
    patternName: 'Attack-specific high-risk counter',
    implementationName: 'Mikiri Counter',
    game: {
      name: 'Sekiro: Shadows Die Twice',
      releaseYear: 2019,
      genres: ['action-adventure', 'soulslike'],
      platforms: ['PC', 'PlayStation', 'Xbox'],
      sourceIds: [SOURCES.sekiroStrategies.id],
    },
    summary: sourced(
      'A correctly timed step into an enemy thrust deals substantial Posture damage; a mistimed attempt can dodge into the attack.',
      SOURCES.sekiroStrategies.id,
    ),
    causal: {
      intent: synthesis(
        'Reward attack recognition and commitment with a large break-meter advantage.',
        SOURCES.sekiroStrategies.id,
      ),
      trigger: sourced(
        'The enemy begins a thrust attack and the player uses Step Dodge.',
        SOURCES.sekiroStrategies.id,
      ),
      guard: sourced(
        'The input is neutral or toward the enemy at the moment the thrust lands.',
        SOURCES.sekiroStrategies.id,
      ),
      transform: sourced(
        'The player steps on the weapon and deals large Posture damage.',
        SOURCES.sekiroStrategies.id,
      ),
      interaction: synthesis(
        'The player counters by entering the line of a dangerous thrust.',
        SOURCES.sekiroStrategies.id,
      ),
      feedback: synthesis(
        'The weapon step and Posture increase confirm the specialized counter.',
        SOURCES.sekiroStrategies.id,
      ),
      risk: sourced(
        'Mistiming can move the player into the attack and cause serious damage.',
        SOURCES.sekiroStrategies.id,
      ),
      invariant: synthesis(
        'The counter applies to readable thrusts rather than every incoming attack.',
        SOURCES.sekiroStrategies.id,
      ),
      evidence: synthesis(
        'Measure recognized thrusts, attempts, success timing, Posture gain, and damage on failure.',
        SOURCES.sekiroStrategies.id,
      ),
    },
    discovery: {
      behaviors: [
        'reward attack recognition',
        'take calculated risk',
        'convert defense into offense',
      ],
      systemFamilies: ['timing-defense', 'pressure-reward'],
      genres: ['action-adventure', 'soulslike'],
      platforms: ['PC', 'PlayStation', 'Xbox'],
      timescale: 'moment',
      context: 'single-player',
      complexity: 'medium',
      dependencies: [
        'attack telegraph taxonomy',
        'directional dodge',
        'posture meter',
      ],
      risks: ['binary punishment', 'telegraph confusion'],
    },
    tunables: [
      {
        name: 'Counter window',
        unit: 'milliseconds',
        note: 'Tolerance around thrust impact.',
      },
      {
        name: 'Posture reward',
        unit: 'meter',
        note: 'Break pressure earned for correct recognition.',
      },
    ],
    comparison: comparison(SOURCES.sekiroStrategies.id, {
      agency: [
        3,
        'High',
        'The player chooses between retreating and a committed specialist response.',
      ],
      executionDemand: [
        3,
        'High',
        'Recognition, direction, and timing all affect the result.',
      ],
      failureCost: [
        3,
        'High',
        'Failure explicitly carries the player into a damaging thrust.',
      ],
      counterplayWindow: [
        1,
        'Narrow',
        'The valid response is tied to the thrust impact.',
      ],
      feedbackClarity: [
        3,
        'Strong',
        'The weapon-step animation makes success distinct.',
      ],
      implementationComplexity: [
        2,
        'Medium',
        'It depends on tagged attacks, direction, timing, and Posture.',
      ],
      evidenceBurden: [
        2,
        'Medium',
        'Short repeated thrust trials can expose recognition and timing.',
      ],
    }),
    matchTerms: [
      'mikiri',
      'thrust counter',
      'perilous attack',
      'risk reward defense',
    ],
    sources: [SOURCES.sekiroStrategies],
  },
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'nioh-2-ki-pulse',
    patternId: 'timed-stamina-recovery',
    patternName: 'Timed recovery after resource spending',
    implementationName: 'Ki Pulse',
    game: {
      name: 'Nioh 2',
      releaseYear: 2020,
      genres: ['action-rpg', 'soulslike'],
      platforms: ['PC', 'PlayStation'],
      sourceIds: [SOURCES.nioh.id],
    },
    summary: sourced(
      'A timed input after an attack restores Ki, allowing the player to stay offensive for longer.',
      SOURCES.nioh.id,
    ),
    causal: {
      intent: synthesis(
        'Make stamina recovery an expressive part of the attack rhythm.',
        SOURCES.nioh.id,
      ),
      trigger: sourced(
        'An attack completes and the Ki recovery cue appears.',
        SOURCES.nioh.id,
      ),
      guard: sourced(
        'The player presses the pulse input with the recovery cue.',
        SOURCES.nioh.id,
      ),
      transform: sourced(
        'The player immediately regains a significant amount of Ki.',
        SOURCES.nioh.id,
      ),
      interaction: synthesis(
        'A self-resource timing action extends pressure against the current enemy.',
        SOURCES.nioh.id,
      ),
      feedback: sourced(
        'A blue glow and filling white bar communicate the timing.',
        SOURCES.nioh.id,
      ),
      risk: sourced(
        'Exhausting Ki prevents attacking or avoiding an incoming blade.',
        SOURCES.nioh.id,
      ),
      invariant: synthesis(
        'The pulse restores spent Ki but does not remove the need to manage expenditure.',
        SOURCES.nioh.id,
      ),
      evidence: synthesis(
        'Measure pulse timing, Ki restored, combo extension, and exhausted-state frequency.',
        SOURCES.nioh.id,
      ),
    },
    discovery: {
      behaviors: [
        'maintain offensive pressure',
        'master combat rhythm',
        'actively manage stamina',
      ],
      systemFamilies: ['resource-recovery', 'pressure-reward'],
      genres: ['action-rpg', 'soulslike'],
      platforms: ['PC', 'PlayStation'],
      timescale: 'moment',
      context: 'single-player',
      complexity: 'medium',
      dependencies: [
        'stamina resource',
        'attack recovery phases',
        'timing feedback',
      ],
      risks: ['input overload', 'mandatory rhythm'],
    },
    tunables: [
      {
        name: 'Pulse timing curve',
        unit: 'milliseconds',
        note: 'Recovery reward across the post-attack window.',
      },
      {
        name: 'Ki restored',
        unit: 'stamina',
        note: 'Immediate resource returned on a pulse.',
      },
    ],
    comparison: comparison(SOURCES.nioh.id, {
      agency: [
        3,
        'High',
        'Players decide whether to pulse, reposition, or change stance.',
      ],
      executionDemand: [
        2,
        'Medium',
        'A visible cue supports the repeated timing action.',
      ],
      failureCost: [
        2,
        'Medium',
        'A missed pulse loses tempo and can lead to exhaustion.',
      ],
      counterplayWindow: [
        2,
        'Bounded',
        'The opportunity follows each attack recovery.',
      ],
      feedbackClarity: [
        3,
        'Strong',
        'Glow and meter fill directly expose the timing window.',
      ],
      implementationComplexity: [
        2,
        'Medium',
        'It couples animation phases, a resource refund, and graded timing.',
      ],
      evidenceBurden: [
        2,
        'Medium',
        'Pulse rate and resulting combo duration are directly observable.',
      ],
    }),
    matchTerms: [
      'ki pulse',
      'active reload stamina',
      'combo sustain',
      'post-attack timing',
    ],
    sources: [SOURCES.nioh],
  },
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'nioh-2-combat-stances',
    patternId: 'stance-tradeoff-selection',
    patternName: 'Switchable combat stance trade-offs',
    implementationName: 'High, middle, and low stances',
    game: {
      name: 'Nioh 2',
      releaseYear: 2020,
      genres: ['action-rpg', 'soulslike'],
      platforms: ['PC', 'PlayStation'],
      sourceIds: [SOURCES.nioh.id],
    },
    summary: sourced(
      'Each weapon supports offensive high, balanced middle, and defensive low stances selected during combat.',
      SOURCES.nioh.id,
    ),
    causal: {
      intent: synthesis(
        'Let players adapt the same weapon to changing pressure and opportunity.',
        SOURCES.nioh.id,
      ),
      trigger: sourced(
        'The player selects a stance with the stance-switch input.',
        SOURCES.nioh.id,
      ),
      guard: synthesis(
        'A weapon and valid combat state must support the selected stance.',
        SOURCES.nioh.id,
      ),
      transform: sourced(
        'The active weapon moveset changes among high, middle, and low profiles.',
        SOURCES.nioh.id,
      ),
      interaction: synthesis(
        'The stance changes how the player approaches the current enemy and opening.',
        SOURCES.nioh.id,
      ),
      feedback: synthesis(
        'Pose, move set, and HUD state should expose the selected stance.',
        SOURCES.nioh.id,
      ),
      risk: synthesis(
        'A profile chosen for the wrong pressure can trade away needed speed, defense, or force.',
        SOURCES.nioh.id,
      ),
      invariant: synthesis(
        'Each stance preserves the weapon identity while changing its tactical profile.',
        SOURCES.nioh.id,
      ),
      evidence: synthesis(
        'Measure stance switches, enemy context, hit success, damage received, and Ki efficiency.',
        SOURCES.nioh.id,
      ),
    },
    discovery: {
      behaviors: [
        'adapt to enemy pressure',
        'express combat style',
        'make contextual choices',
      ],
      systemFamilies: ['stance-adaptation', 'resource-recovery'],
      genres: ['action-rpg', 'soulslike'],
      platforms: ['PC', 'PlayStation'],
      timescale: 'encounter',
      context: 'single-player',
      complexity: 'high',
      dependencies: [
        'multiple move sets',
        'stance input',
        'weapon animation set',
        'stamina economy',
      ],
      risks: ['choice overload', 'dominant stance'],
    },
    tunables: [
      {
        name: 'Stance switch latency',
        unit: 'milliseconds',
        note: 'Delay before the selected profile is active.',
      },
      {
        name: 'Profile multipliers',
        unit: 'ratio',
        note: 'Relative speed, force, defense, and Ki costs per stance.',
      },
    ],
    comparison: comparison(SOURCES.nioh.id, {
      agency: [
        3,
        'High',
        'Three on-demand profiles create frequent tactical choice.',
      ],
      executionDemand: [
        3,
        'High',
        'Players manage stance, attacks, defense, and Ki together.',
      ],
      failureCost: [
        2,
        'Medium',
        'A poor stance loses efficiency but does not itself consume the run.',
      ],
      counterplayWindow: [
        3,
        'Wide',
        'Selection can respond to broad encounter state rather than one frame.',
      ],
      feedbackClarity: [
        2,
        'Moderate',
        'Moves and pose communicate stance but require learned distinctions.',
      ],
      implementationComplexity: [
        3,
        'High',
        'Each weapon needs multiple balanced movesets and transitions.',
      ],
      evidenceBurden: [
        3,
        'High',
        'Usage must be segmented by weapon, enemy, skill, and encounter state.',
      ],
    }),
    matchTerms: [
      'stance switch',
      'high stance',
      'low stance',
      'adaptive moveset',
    ],
    sources: [SOURCES.nioh],
  },
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'ghost-tiered-parry',
    patternId: 'graded-timing-defense',
    patternName: 'Graded defense rewards precise timing',
    implementationName: 'Block, parry, and perfect parry',
    game: {
      name: 'Ghost of Tsushima',
      releaseYear: 2020,
      genres: ['action-adventure', 'open-world'],
      platforms: ['PC', 'PlayStation'],
      sourceIds: [SOURCES.ghost.id],
    },
    summary: sourced(
      'Holding guard blocks, later timing parries and opens a counter, while an upgraded perfect parry can stun and grant more Resolve.',
      SOURCES.ghost.id,
    ),
    causal: {
      intent: synthesis(
        'Give defensive timing a readable ladder from safety to mastery.',
        SOURCES.ghost.id,
      ),
      trigger: sourced(
        'The player guards as an enemy attack approaches.',
        SOURCES.ghost.id,
      ),
      guard: synthesis(
        'Outcome tier depends on how close the input is to impact and unlocked capability.',
        SOURCES.ghost.id,
      ),
      transform: sourced(
        'A parry exposes the attacker; a perfect parry adds a stronger stun and Resolve reward.',
        SOURCES.ghost.id,
      ),
      interaction: synthesis(
        'The incoming melee attack becomes a tiered counter opportunity.',
        SOURCES.ghost.id,
      ),
      feedback: synthesis(
        'Block, parry, and perfect parry need visibly distinct impact and reward cues.',
        SOURCES.ghost.id,
      ),
      risk: synthesis(
        'Waiting for the stronger timing tier reduces the safety margin.',
        SOURCES.ghost.id,
      ),
      invariant: synthesis(
        'Basic blocking remains available while precision improves the outcome.',
        SOURCES.ghost.id,
      ),
      evidence: synthesis(
        'Measure timing tier, counter conversion, Resolve gain, and damage avoided.',
        SOURCES.ghost.id,
      ),
    },
    discovery: {
      behaviors: [
        'reward precise defensive timing',
        'support mastery progression',
        'convert defense into offense',
      ],
      systemFamilies: ['timing-defense', 'pressure-reward'],
      genres: ['action-adventure', 'open-world'],
      platforms: ['PC', 'PlayStation'],
      timescale: 'moment',
      context: 'single-player',
      complexity: 'medium',
      dependencies: [
        'attack phase windows',
        'guard state',
        'resolve meter',
        'counter opening',
      ],
      risks: ['unclear timing tiers', 'safe option dominance'],
    },
    tunables: [
      {
        name: 'Parry windows',
        unit: 'milliseconds',
        note: 'Nested timing thresholds for block, parry, and perfect parry.',
      },
      {
        name: 'Resolve reward',
        unit: 'meter',
        note: 'Resource earned at each precision tier.',
      },
    ],
    comparison: comparison(SOURCES.ghost.id, {
      agency: [
        3,
        'High',
        'Players choose a safe hold or increasingly precise timings.',
      ],
      executionDemand: [
        2,
        'Scalable',
        'The ladder supports basic safety and advanced mastery.',
      ],
      failureCost: [
        2,
        'Medium',
        'Late precision attempts can turn a block into damage.',
      ],
      counterplayWindow: [
        2,
        'Nested',
        'Multiple windows create graded outcomes around impact.',
      ],
      feedbackClarity: [
        3,
        'Strong',
        'Distinct counter and Resolve rewards can mark each success tier.',
      ],
      implementationComplexity: [
        2,
        'Medium',
        'It requires nested timing windows, unlock state, and graded outcomes.',
      ],
      evidenceBurden: [
        2,
        'Medium',
        'Tier frequencies and follow-up actions expose the learning curve.',
      ],
    }),
    matchTerms: [
      'perfect parry',
      'graded timing',
      'resolve',
      'accessible mastery',
    ],
    sources: [SOURCES.ghost],
  },
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'ghost-enemy-matched-stances',
    patternId: 'enemy-matched-stance',
    patternName: 'Match a combat stance to an enemy archetype',
    implementationName: 'Enemy-matched sword stances',
    game: {
      name: 'Ghost of Tsushima',
      releaseYear: 2020,
      genres: ['action-adventure', 'open-world'],
      platforms: ['PC', 'PlayStation'],
      sourceIds: [SOURCES.ghost.id],
    },
    summary: sourced(
      'Switchable stances are each designed to be particularly effective against a subset of enemy types.',
      SOURCES.ghost.id,
    ),
    causal: {
      intent: synthesis(
        'Turn enemy recognition into an immediate offensive adaptation.',
        SOURCES.ghost.id,
      ),
      trigger: sourced(
        'The player identifies an enemy type and switches stance.',
        SOURCES.ghost.id,
      ),
      guard: synthesis(
        'The chosen stance must be available and mapped to the enemy archetype.',
        SOURCES.ghost.id,
      ),
      transform: sourced(
        'Switching to a stance suited to the enemy type amplifies the player’s effectiveness.',
        SOURCES.ghost.id,
      ),
      interaction: synthesis(
        'Player stance and enemy defense type form a readable matchup.',
        SOURCES.ghost.id,
      ),
      feedback: synthesis(
        'Stance presentation and stagger response should confirm the matchup.',
        SOURCES.ghost.id,
      ),
      risk: synthesis(
        'A mismatched stance slows the opening and gives other enemies more time to attack.',
        SOURCES.ghost.id,
      ),
      invariant: synthesis(
        'Matching improves defense breaking without removing the need to execute attacks.',
        SOURCES.ghost.id,
      ),
      evidence: synthesis(
        'Measure stance choice by archetype, switch latency, and time to stagger.',
        SOURCES.ghost.id,
      ),
    },
    discovery: {
      behaviors: [
        'read enemy archetypes',
        'adapt to enemy pressure',
        'switch tactics mid-fight',
      ],
      systemFamilies: ['stance-adaptation', 'pressure-reward'],
      genres: ['action-adventure', 'open-world'],
      platforms: ['PC', 'PlayStation'],
      timescale: 'encounter',
      context: 'single-player',
      complexity: 'high',
      dependencies: [
        'enemy archetype tags',
        'stagger meter',
        'multiple move sets',
        'stance selector',
      ],
      risks: ['rock-paper-scissors rigidity', 'choice interruption'],
    },
    tunables: [
      {
        name: 'Matched stagger multiplier',
        unit: 'ratio',
        note: 'Efficiency advantage against the intended archetype.',
      },
      {
        name: 'Switch time',
        unit: 'milliseconds',
        note: 'Friction when adapting during multi-enemy combat.',
      },
    ],
    comparison: comparison(SOURCES.ghost.id, {
      agency: [
        3,
        'High',
        'Players can switch at any point in response to the target.',
      ],
      executionDemand: [
        2,
        'Medium',
        'Recognition and selection matter more than frame precision.',
      ],
      failureCost: [
        2,
        'Medium',
        'Mismatch slows stagger and increases exposure to the group.',
      ],
      counterplayWindow: [
        3,
        'Wide',
        'The choice spans target selection and encounter positioning.',
      ],
      feedbackClarity: [
        2,
        'Moderate',
        'The player must learn archetype-to-stance mappings.',
      ],
      implementationComplexity: [
        3,
        'High',
        'Four movesets, archetype tags, and matchup balance are required.',
      ],
      evidenceBurden: [
        3,
        'High',
        'Tests need varied enemy mixes and switch behavior across encounters.',
      ],
    }),
    matchTerms: [
      'stone stance',
      'water stance',
      'enemy counter',
      'matchup system',
      'stagger',
    ],
    sources: [SOURCES.ghost],
  },
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'returnal-projectile-dash',
    patternId: 'invulnerable-reposition',
    patternName: 'Timed dash through danger',
    implementationName: 'Projectile-phasing dash',
    game: {
      name: 'Returnal',
      releaseYear: 2021,
      genres: ['third-person-shooter', 'roguelite'],
      platforms: ['PC', 'PlayStation'],
      sourceIds: [SOURCES.returnal.id],
    },
    summary: sourced(
      'Dash-dodges cross gaps, avoid attacks, and can pass through enemy projectiles.',
      SOURCES.returnal.id,
    ),
    causal: {
      intent: synthesis(
        'Make spatial commitment and timing the answer to dense projectile pressure.',
        SOURCES.returnal.id,
      ),
      trigger: sourced(
        'The player activates dash while moving through traversal or combat space.',
        SOURCES.returnal.id,
      ),
      guard: synthesis(
        'Dash availability and direction must satisfy the movement state.',
        SOURCES.returnal.id,
      ),
      transform: sourced(
        'The player rapidly changes position and can pass through projectiles.',
        SOURCES.returnal.id,
      ),
      interaction: synthesis(
        'The player crosses a dangerous trajectory instead of only moving away from it.',
        SOURCES.returnal.id,
      ),
      feedback: synthesis(
        'Motion, invulnerability timing, and directional haptics make the dash legible.',
        SOURCES.returnal.id,
      ),
      risk: synthesis(
        'A poor endpoint can trade one projectile lane for another or a corner.',
        SOURCES.returnal.id,
      ),
      invariant: synthesis(
        'The dash avoids defined hazards but does not erase spatial positioning costs.',
        SOURCES.returnal.id,
      ),
      evidence: synthesis(
        'Measure dash timing, projectile intersections, endpoint danger, and damage avoided.',
        SOURCES.returnal.id,
      ),
    },
    discovery: {
      behaviors: [
        'move through danger',
        'reposition under pressure',
        'reward spatial timing',
      ],
      systemFamilies: ['mobility', 'timing-defense'],
      genres: ['third-person-shooter', 'roguelite'],
      platforms: ['PC', 'PlayStation'],
      timescale: 'moment',
      context: 'single-player',
      complexity: 'medium',
      dependencies: [
        'movement state',
        'projectile collision layers',
        'dash availability',
        'hazard telegraphs',
      ],
      risks: ['invulnerability ambiguity', 'unsafe endpoint'],
    },
    tunables: [
      {
        name: 'Dash duration',
        unit: 'milliseconds',
        note: 'Time spent in rapid displacement.',
      },
      {
        name: 'Hazard-ignore window',
        unit: 'milliseconds',
        note: 'Part of the motion that can cross defined projectiles.',
      },
      {
        name: 'Recovery',
        unit: 'milliseconds',
        note: 'Delay before normal action resumes.',
      },
    ],
    comparison: comparison(SOURCES.returnal.id, {
      agency: [
        3,
        'High',
        'Direction and endpoint remain under player control.',
      ],
      executionDemand: [
        2,
        'Medium',
        'Success combines projectile reading with spatial timing.',
      ],
      failureCost: [
        3,
        'High',
        'An unsafe endpoint can expose the player inside dense fire.',
      ],
      counterplayWindow: [
        2,
        'Bounded',
        'The dash provides a short hazard-crossing window.',
      ],
      feedbackClarity: [
        3,
        'Strong',
        'Rapid movement and directional feedback clearly mark the action.',
      ],
      implementationComplexity: [
        2,
        'Medium',
        'It needs swept movement, hazard-layer rules, and recovery state.',
      ],
      evidenceBurden: [
        2,
        'Medium',
        'Projectile intersections and endpoint outcomes are instrumentable.',
      ],
    }),
    matchTerms: [
      'dash',
      'dodge',
      'iframe',
      'bullet hell mobility',
      'phase through projectile',
    ],
    sources: [SOURCES.returnal],
  },
  {
    schemaVersion: MECHANIC_SCHEMA_VERSION,
    id: 'returnal-adrenaline',
    patternId: 'no-hit-escalation',
    patternName: 'No-hit performance escalation',
    implementationName: 'Adrenaline tiers',
    game: {
      name: 'Returnal',
      releaseYear: 2021,
      genres: ['third-person-shooter', 'roguelite'],
      platforms: ['PC', 'PlayStation'],
      sourceIds: [SOURCES.returnal.id],
    },
    summary: sourced(
      'Dealing damage without being hit builds up to five Adrenaline levels with new benefits; one hit resets the meter.',
      SOURCES.returnal.id,
    ),
    causal: {
      intent: synthesis(
        'Turn sustained clean play into escalating capability and tension.',
        SOURCES.returnal.id,
      ),
      trigger: sourced(
        'The player deals damage while continuing to avoid incoming damage.',
        SOURCES.returnal.id,
      ),
      guard: sourced(
        'The chain persists only while the player remains unhit.',
        SOURCES.returnal.id,
      ),
      transform: sourced(
        'Adrenaline advances through five levels that unlock combat enhancements.',
        SOURCES.returnal.id,
      ),
      interaction: synthesis(
        'Every enemy and projectile threatens accumulated temporary power.',
        SOURCES.returnal.id,
      ),
      feedback: synthesis(
        'The tier meter and newly unlocked effects expose rising value and risk.',
        SOURCES.returnal.id,
      ),
      risk: sourced(
        'Receiving any damage resets the Adrenaline meter.',
        SOURCES.returnal.id,
      ),
      invariant: synthesis(
        'The escalation rewards avoided damage rather than merely time survived.',
        SOURCES.returnal.id,
      ),
      evidence: synthesis(
        'Measure tier reached, time at tier, damage-free streak, reset cause, and behavior change.',
        SOURCES.returnal.id,
      ),
    },
    discovery: {
      behaviors: [
        'reward mastery streaks',
        'increase tension while succeeding',
        'avoid damage proactively',
      ],
      systemFamilies: ['pressure-reward', 'resource-recovery'],
      genres: ['third-person-shooter', 'roguelite'],
      platforms: ['PC', 'PlayStation'],
      timescale: 'encounter',
      context: 'single-player',
      complexity: 'medium',
      dependencies: [
        'damage attribution',
        'streak meter',
        'tiered modifiers',
        'reset feedback',
      ],
      risks: ['win-more spiral', 'loss aversion'],
    },
    tunables: [
      {
        name: 'Tier thresholds',
        unit: 'successful actions',
        note: 'Clean-play progress required for each level.',
      },
      {
        name: 'Tier benefits',
        unit: 'effect set',
        note: 'Capability unlocked at each level.',
      },
      {
        name: 'Reset rule',
        unit: 'event',
        note: 'Damage event that removes accumulated levels.',
      },
    ],
    comparison: comparison(SOURCES.returnal.id, {
      agency: [
        2,
        'Medium',
        'The player influences the streak through movement and target decisions.',
      ],
      executionDemand: [
        3,
        'High',
        'Maintaining benefits requires sustained damage avoidance.',
      ],
      failureCost: [
        3,
        'High',
        'One hit removes all accumulated temporary benefits.',
      ],
      counterplayWindow: [
        3,
        'Persistent',
        'Every damaging threat can end the streak.',
      ],
      feedbackClarity: [
        3,
        'Strong',
        'Five explicit tiers communicate buildup and reset.',
      ],
      implementationComplexity: [
        2,
        'Medium',
        'It needs a streak counter, tier modifiers, and reliable reset attribution.',
      ],
      evidenceBurden: [
        3,
        'High',
        'Skill, encounter density, and benefit-driven behavior must be separated.',
      ],
    }),
    matchTerms: [
      'adrenaline',
      'no-hit bonus',
      'streak reward',
      'temporary escalation',
    ],
    sources: [SOURCES.returnal],
  },
];

assertValidMechanicCorpus(VALIDATION_CORPUS);
