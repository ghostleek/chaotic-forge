'use client';

import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Braces,
  Check,
  CircleDot,
  Command,
  Database,
  ExternalLink,
  GitBranch,
  Hammer,
  LoaderCircle,
  Maximize2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Trash2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type AtomKind =
  | 'intent'
  | 'actum'
  | 'guard'
  | 'state'
  | 'tactum'
  | 'factum'
  | 'economy'
  | 'feedback'
  | 'trust'
  | 'evidence';

type Atom = {
  id: string;
  kind: AtomKind;
  title: string;
  summary: string;
  rule: string;
  x: number;
  y: number;
  sources: number[];
  anatomy: {
    verb: string;
    input: string;
    output: string;
    risk: string;
  };
};

type Edge = {
  id: string;
  from: string;
  to: string;
  label: string;
  type: 'event' | 'state' | 'evidence';
};

type GameSampleId = 'maplestory' | 'league';
type GraphId = 'starter' | GameSampleId;

type GameSample = {
  id: GameSampleId;
  name: string;
  subtitle: string;
  intent: string;
  thesis: string;
  principles: Array<{ title: string; text: string; sources: number[] }>;
  atoms: Atom[];
  edges: Edge[];
};

type RunProfile = {
  summary: string;
  detail: string;
  metrics: Array<{ label: string; value: string; note: string; risk?: boolean }>;
  riskTitle: string;
  riskDetail: string;
};

type PaletteAtom = Omit<Atom, 'id' | 'x' | 'y'> & {
  icon: LucideIcon;
  category: 'Interaction' | 'Logic' | 'Economy' | 'Evidence';
};

const NODE_WIDTH = 236;
const NODE_HEIGHT = 144;

const SOURCES = [
  {
    id: 1,
    author: 'Raph Koster',
    title: 'An Atomic Theory of Fun Game Design',
    note: 'Atoms can be linked, nested, and modeled as directed graphs; Koster also emphasizes challenge, variable feedback, mastery, and failure cost.',
    url: 'https://www.raphkoster.com/2012/01/24/an-atomic-theory-of-fun-game-design/',
  },
  {
    id: 2,
    author: 'Hunicke, LeBlanc & Zubek',
    title: 'MDA: A Formal Approach to Game Design and Game Research',
    note: 'Mechanics are data and algorithms; their interaction over time produces dynamics and player-facing aesthetics.',
    url: 'https://www.cs.northwestern.edu/~hunicke/MDA.pdf',
  },
  {
    id: 3,
    author: 'Salen & Zimmerman',
    title: 'Rules of Play',
    note: 'Separates rules into constitutive, operational, and implicit levels, a useful distinction for implementation and player communication.',
    url: 'https://mitpress.mit.edu/9780262299930/rules-of-play/',
  },
  {
    id: 4,
    author: 'Frédéric Séraphine',
    title: 'Ludophrases: Ludics Before Mechanics',
    note: 'Defines actum, tactum, and factum as player-triggered reactions, player-object interactions, and world-state interactions.',
    url: 'https://www.fredericseraphine.com/index.php/2016/08/19/ludophrases/',
  },
  {
    id: 5,
    author: 'Miguel Sicart',
    title: 'Defining Game Mechanics',
    note: 'Frames mechanics as methods invoked by agents to interact with game state—useful for code generation boundaries.',
    url: 'https://www.gamestudies.org/0802/articles/sicart',
  },
  {
    id: 6,
    author: 'Machinations',
    title: 'Framework Basics',
    note: 'Provides a specialized vocabulary for game economies: sources, pools, drains, converters, traders, gates, and two connection types.',
    url: 'https://machinations.gitbook.io/docs/getting-started/framework-basics',
  },
  {
    id: 7,
    author: 'Riot Games',
    title: 'Your First Game',
    note: 'Explains League’s Nexus win condition, five positions, gold and experience loops, recall purchases, minion waves, and turret progression.',
    url: 'https://nexus.leagueoflegends.com/en-us/2009/10/your-first-game/',
  },
  {
    id: 8,
    author: 'Riot Games',
    title: 'League of Legends — Game Overview',
    note: 'Frames the current game as a 5v5 MOBA built around lanes, team fights, champion roles, and destroying the opposing Nexus.',
    url: 'https://www.leagueoflegends.com/en-us/',
  },
  {
    id: 9,
    author: 'Nexon',
    title: 'MapleStory Growth Guide',
    note: 'Documents EXP from hunting and quests, level-sensitive rewards, AP/SP allocation, skills, and later progression systems.',
    url: 'https://maplestory.nexon.com/Guide/N23GameInformation/Articles/377',
  },
  {
    id: 10,
    author: 'Nexon Japan',
    title: 'MapleStory Level-up Guide',
    note: 'Shows Maple Guide routing, hunting and quest progression, runes, combo rewards, Monster Park, Link Skills, and Union support.',
    url: 'https://maplestory.nexon.co.jp/gameguide/tip/levelup/',
  },
  {
    id: 11,
    author: 'Nexon',
    title: 'MapleStory Equipment Transfer Guide',
    note: 'Shows how equipment enhancement and potential can carry forward, turning gear replacement into a nested long-term progression decision.',
    url: 'https://maplestory.nexon.com/Guide/N23GameInformation/Articles/414',
  },
  {
    id: 12,
    author: 'Nexon',
    title: 'MapleStory Boss Reward Guide',
    note: 'Documents bosses as repeatable content checkpoints with distinct reward pools and party reward rules.',
    url: 'https://maplestory.nexon.com/Guide/N23GameInformation/Articles/459',
  },
  {
    id: 13,
    author: 'Riot Games',
    title: 'League of Legends VFX Style Guide',
    note: 'States that visual clarity is essential to a competitive experience so players can understand and anticipate gameplay.',
    url: 'https://nexus.leagueoflegends.com/wp-content/uploads/2017/10/VFX_Styleguide_final_public_hidpjqwx7lqyx0pjj3ss.pdf',
  },
];

const KIND_META: Record<AtomKind, { label: string; icon: LucideIcon }> = {
  intent: { label: 'Design intent', icon: Sparkles },
  actum: { label: 'Actum', icon: CircleDot },
  guard: { label: 'Guard', icon: GitBranch },
  state: { label: 'State rule', icon: Braces },
  tactum: { label: 'Tactum', icon: Zap },
  factum: { label: 'Factum', icon: Activity },
  economy: { label: 'Economy', icon: Database },
  feedback: { label: 'Feedback', icon: Activity },
  trust: { label: 'Invariant', icon: ShieldCheck },
  evidence: { label: 'Evidence', icon: TimerReset },
};

const PALETTE: PaletteAtom[] = [
  {
    kind: 'actum', category: 'Interaction', icon: CircleDot, title: 'Player input',
    summary: 'Translate a player input into an in-game reaction.', rule: 'input.pressed → invoke(action)', sources: [4, 5],
    anatomy: { verb: 'Invoke', input: 'Input event', output: 'Action event', risk: 'Opportunity cost' },
  },
  {
    kind: 'tactum', category: 'Interaction', icon: Zap, title: 'Object interaction',
    summary: 'Resolve contact between the player object and another entity.', rule: 'overlap(a, b) → interaction', sources: [4, 5],
    anatomy: { verb: 'Resolve', input: 'Two entities', output: 'Contact event', risk: 'Exposure' },
  },
  {
    kind: 'factum', category: 'Interaction', icon: Activity, title: 'World event',
    summary: 'Update state through non-player objects or simulation time.', rule: 'world.tick → update(system)', sources: [4],
    anatomy: { verb: 'Update', input: 'World state', output: 'System event', risk: 'System pressure' },
  },
  {
    kind: 'guard', category: 'Logic', icon: GitBranch, title: 'Condition gate',
    summary: 'Permit or reject a transition using an explicit precondition.', rule: 'if predicate = true → pass', sources: [1, 3],
    anatomy: { verb: 'Check', input: 'State predicate', output: 'Pass / fail', risk: 'Blocked action' },
  },
  {
    kind: 'state', category: 'Logic', icon: Braces, title: 'State transform',
    summary: 'Apply one constitutive rule to the current game state.', rule: 'state.before → state.after', sources: [2, 3, 5],
    anatomy: { verb: 'Transform', input: 'Current state', output: 'Next state', risk: 'State cost' },
  },
  {
    kind: 'trust', category: 'Logic', icon: ShieldCheck, title: 'Trust invariant',
    summary: 'Bound a mechanic to preserve counterplay or legibility.', rule: 'assert(boundary) before commit', sources: [1, 2],
    anatomy: { verb: 'Constrain', input: 'Proposed state', output: 'Safe state', risk: 'Rejected transition' },
  },
  {
    kind: 'economy', category: 'Economy', icon: ArrowUpFromLine, title: 'Resource source',
    summary: 'Introduce a typed resource into the system.', rule: 'source → pool + amount', sources: [6],
    anatomy: { verb: 'Create', input: 'Activation', output: 'Resource', risk: 'Inflation' },
  },
  {
    kind: 'economy', category: 'Economy', icon: ArrowDownToLine, title: 'Resource drain',
    summary: 'Consume a resource as the cost of an action.', rule: 'pool - cost → action', sources: [6],
    anatomy: { verb: 'Consume', input: 'Resource', output: 'Paid action', risk: 'Depletion' },
  },
  {
    kind: 'feedback', category: 'Evidence', icon: Activity, title: 'Player feedback',
    summary: 'Expose the state change through readable audiovisual feedback.', rule: 'state.changed → signal(player)', sources: [1, 2],
    anatomy: { verb: 'Signal', input: 'State change', output: 'Perceived cue', risk: 'Unreadable state' },
  },
  {
    kind: 'evidence', category: 'Evidence', icon: TimerReset, title: 'Playtest metric',
    summary: 'Attach an observable measure to a behavioral hypothesis.', rule: 'observe(event) → aggregate(metric)', sources: [2],
    anatomy: { verb: 'Measure', input: 'Telemetry event', output: 'Metric', risk: 'Proxy mismatch' },
  },
];

const INITIAL_ATOMS: Atom[] = [
  {
    id: 'intent', kind: 'intent', title: 'Reward aggressive movement',
    summary: 'Increase forward pressure without increasing weapon damage.', rule: 'desired_dynamic = forward_pressure', x: 42, y: 58, sources: [1, 2],
    anatomy: { verb: 'Frame', input: 'Design goal', output: 'Behavior hypothesis', risk: 'Unmeasurable intent' },
  },
  {
    id: 'dash', kind: 'actum', title: 'Dash', summary: 'Player commits to a fast directional burst.',
    rule: 'Shift + move → dash.requested', x: 312, y: 58, sources: [4, 5],
    anatomy: { verb: 'Dash', input: 'Shift + direction', output: 'Dash request', risk: 'Position commitment' },
  },
  {
    id: 'available', kind: 'guard', title: 'Charge available?', summary: 'Reject the action when no dash charge remains.',
    rule: 'dash.charges > 0', x: 582, y: 58, sources: [1, 3],
    anatomy: { verb: 'Check', input: 'Dash request', output: 'Pass / reject', risk: 'Lost timing window' },
  },
  {
    id: 'spend', kind: 'state', title: 'Spend dash charge', summary: 'Consume one charge and apply the movement impulse.',
    rule: 'charges -= 1; velocity += 12', x: 852, y: 58, sources: [2, 3, 5],
    anatomy: { verb: 'Consume', input: 'Valid request', output: 'Velocity impulse', risk: 'Lose escape resource' },
  },
  {
    id: 'pressure', kind: 'tactum', title: 'Enter threat radius', summary: 'Dash moves the player into close enemy interaction range.',
    rule: 'distance(player, enemy) < 6m', x: 852, y: 274, sources: [4, 5],
    anatomy: { verb: 'Close distance', input: 'Player + enemy', output: 'Threat contact', risk: 'Incoming damage' },
  },
  {
    id: 'elimination', kind: 'factum', title: 'Enemy eliminated', summary: 'The combat system emits an elimination world event.',
    rule: 'enemy.hp <= 0 → enemy.eliminated', x: 582, y: 274, sources: [4],
    anatomy: { verb: 'Resolve', input: 'Enemy health', output: 'Elimination event', risk: 'Target survives' },
  },
  {
    id: 'restore', kind: 'state', title: 'Restore dash charge', summary: 'An elimination replenishes the movement resource.',
    rule: 'on elimination → charges = 1', x: 312, y: 274, sources: [1, 2, 3],
    anatomy: { verb: 'Restore', input: 'Elimination event', output: 'One dash charge', risk: 'Positive feedback loop' },
  },
  {
    id: 'limit', kind: 'trust', title: 'Cap chain at three', summary: 'Break indefinite snowballing while preserving the reward loop.',
    rule: 'if chain >= 3 → cooldown = 2s', x: 42, y: 490, sources: [1, 2],
    anatomy: { verb: 'Constrain', input: 'Chain count', output: 'Cooldown gate', risk: 'Reduced expression' },
  },
  {
    id: 'metric', kind: 'evidence', title: 'Measure forward pressure', summary: 'Compare forward-time, dash cadence, damage taken, and deaths.',
    rule: 'group_by(variant, seed)', x: 582, y: 490, sources: [2],
    anatomy: { verb: 'Measure', input: 'Matched telemetry', output: 'A/B evidence', risk: 'Metric misses intent' },
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1', from: 'intent', to: 'dash', label: 'requires', type: 'state' },
  { id: 'e2', from: 'dash', to: 'available', label: 'request', type: 'event' },
  { id: 'e3', from: 'available', to: 'spend', label: 'true', type: 'state' },
  { id: 'e4', from: 'spend', to: 'pressure', label: 'impulse', type: 'event' },
  { id: 'e5', from: 'pressure', to: 'elimination', label: 'combat', type: 'event' },
  { id: 'e6', from: 'elimination', to: 'restore', label: 'on event', type: 'event' },
  { id: 'e7', from: 'restore', to: 'dash', label: 'loop', type: 'state' },
  { id: 'e8', from: 'restore', to: 'limit', label: 'chain +1', type: 'state' },
  { id: 'e9', from: 'restore', to: 'metric', label: 'observe', type: 'evidence' },
  { id: 'e10', from: 'limit', to: 'metric', label: 'compare', type: 'evidence' },
];

const GAME_SAMPLES: Record<GameSampleId, GameSample> = {
  maplestory: {
    id: 'maplestory',
    name: 'MapleStory',
    subtitle: 'Persistent mastery loop',
    intent: 'Make repeated combat feel like a lasting journey of identity, power, and access.',
    thesis: 'MapleStory turns a simple hunt verb into long-term identity. Every field feeds persistent progression, while levels, jobs, gear, and account systems keep opening a larger version of the same loop.',
    principles: [
      {
        title: 'Repetition becomes visible growth',
        text: 'Hunting, quests, and content award EXP and resources, so the immediate combat loop continuously advances the character.',
        sources: [9],
      },
      {
        title: 'Guidance keeps the grind legible',
        text: 'The Maple Guide points toward level-appropriate fields and quests; level difference also changes reward efficiency and combat effectiveness.',
        sources: [9, 10],
      },
      {
        title: 'Milestones change the verb set',
        text: 'Levels award stat and skill choices, while job advancement and later systems expand how the same player acts in the world.',
        sources: [9, 10],
      },
      {
        title: 'Progress nests across time scales',
        text: 'Gear transfer, boss rewards, Link Skills, and Union let one session feed equipment, character, and account-wide goals.',
        sources: [10, 11, 12],
      },
    ],
    atoms: [
      { id: 'ms-intent', kind: 'intent', title: 'Promise lasting mastery', summary: 'Every short combat loop should advance a persistent character journey.', rule: 'session_action → persistent_progress', x: 42, y: 58, sources: [9, 10], anatomy: { verb: 'Frame', input: 'Growth fantasy', output: 'Progression promise', risk: 'Progress feels invisible' } },
      { id: 'ms-traverse', kind: 'actum', title: 'Enter a suitable field', summary: 'The player moves to a map matched to the current level band.', rule: 'choose(field) where level_fit = true', x: 312, y: 58, sources: [9, 10], anatomy: { verb: 'Traverse', input: 'Map choice', output: 'Combat field', risk: 'Poor routing' } },
      { id: 'ms-hunt', kind: 'tactum', title: 'Hunt monsters', summary: 'Movement and skills repeatedly resolve against groups of enemies.', rule: 'skill × monster → damage', x: 582, y: 58, sources: [9], anatomy: { verb: 'Hunt', input: 'Skill + target', output: 'Damage / defeat', risk: 'Time and health' } },
      { id: 'ms-reward', kind: 'economy', title: 'Emit EXP and rewards', summary: 'Defeated enemies and completed content create progression resources.', rule: 'defeat → EXP + mesos + drops', x: 852, y: 58, sources: [9, 12], anatomy: { verb: 'Reward', input: 'Defeat event', output: 'EXP + resources', risk: 'Reward drought' } },
      { id: 'ms-xp', kind: 'state', title: 'Fill the EXP meter', summary: 'Accumulated experience makes progress toward the next threshold visible.', rule: 'character.exp += earned_exp', x: 852, y: 274, sources: [9], anatomy: { verb: 'Accumulate', input: 'Earned EXP', output: 'Meter progress', risk: 'Slow cadence' } },
      { id: 'ms-level', kind: 'guard', title: 'Reach level threshold?', summary: 'Crossing the threshold converts repetition into a discrete milestone.', rule: 'if exp ≥ next_level → level_up', x: 582, y: 274, sources: [9], anatomy: { verb: 'Check', input: 'EXP total', output: 'Level event', risk: 'Milestone delay' } },
      { id: 'ms-specialize', kind: 'state', title: 'Specialize the character', summary: 'Spend AP/SP or advance a job to change power and available skills.', rule: 'level_up → AP + SP + unlocks', x: 312, y: 274, sources: [9, 10], anatomy: { verb: 'Specialize', input: 'Level event', output: 'Stats + skills', risk: 'Regretful choice' } },
      { id: 'ms-gear', kind: 'economy', title: 'Carry gear power forward', summary: 'Equipment systems preserve and compound investment across upgrades.', rule: 'old_gear.power → new_gear.power', x: 42, y: 274, sources: [11], anatomy: { verb: 'Upgrade', input: 'Gear + mesos', output: 'Persistent power', risk: 'Loss or cost' } },
      { id: 'ms-challenge', kind: 'guard', title: 'Unlock harder content', summary: 'New fields and bosses test whether accumulated power is sufficient.', rule: 'power ≥ content_gate → access', x: 42, y: 490, sources: [9, 12], anatomy: { verb: 'Qualify', input: 'Level + gear', output: 'Content access', risk: 'Progress wall' } },
      { id: 'ms-account', kind: 'state', title: 'Strengthen the roster', summary: 'Link Skills and Union let one character contribute to account-wide growth.', rule: 'character_growth → roster_bonus', x: 312, y: 490, sources: [10], anatomy: { verb: 'Compound', input: 'Character progress', output: 'Roster bonus', risk: 'System overload' } },
      { id: 'ms-metric', kind: 'evidence', title: 'Measure mastery cadence', summary: 'Track time-to-level, field changes, milestone use, and return intent.', rule: 'observe(loop) → mastery_cadence', x: 582, y: 490, sources: [2, 9], anatomy: { verb: 'Measure', input: 'Progress events', output: 'Cadence metrics', risk: 'Grind proxy mismatch' } },
    ],
    edges: [
      { id: 'ms-e1', from: 'ms-intent', to: 'ms-traverse', label: 'frames', type: 'state' },
      { id: 'ms-e2', from: 'ms-traverse', to: 'ms-hunt', label: 'engage', type: 'event' },
      { id: 'ms-e3', from: 'ms-hunt', to: 'ms-reward', label: 'defeat', type: 'event' },
      { id: 'ms-e4', from: 'ms-reward', to: 'ms-xp', label: 'add EXP', type: 'state' },
      { id: 'ms-e5', from: 'ms-xp', to: 'ms-level', label: 'threshold', type: 'state' },
      { id: 'ms-e6', from: 'ms-level', to: 'ms-specialize', label: 'level up', type: 'event' },
      { id: 'ms-e7', from: 'ms-specialize', to: 'ms-gear', label: 'build', type: 'state' },
      { id: 'ms-e8', from: 'ms-gear', to: 'ms-challenge', label: 'qualify', type: 'state' },
      { id: 'ms-e9', from: 'ms-challenge', to: 'ms-traverse', label: 'next loop', type: 'event' },
      { id: 'ms-e10', from: 'ms-specialize', to: 'ms-account', label: 'share power', type: 'state' },
      { id: 'ms-e11', from: 'ms-account', to: 'ms-metric', label: 'observe', type: 'evidence' },
      { id: 'ms-e12', from: 'ms-hunt', to: 'ms-metric', label: 'measure', type: 'evidence' },
    ],
  },
  league: {
    id: 'league',
    name: 'League of Legends',
    subtitle: 'Match-local power conversion',
    intent: 'Turn small resource advantages into coordinated spatial pressure toward one clear team objective.',
    thesis: 'League makes one team objective legible, then surrounds it with nested economies and spatial decisions. Players repeatedly convert farm into power, power into pressure, and pressure into structures until the Nexus becomes reachable.',
    principles: [
      {
        title: 'One objective organizes every sub-goal',
        text: 'The enemy Nexus is the win condition; lanes, fights, and structures are valuable because they change the path to that objective.',
        sources: [7, 8],
      },
      {
        title: 'Power is earned and converted locally',
        text: 'Last-hits and kills create gold, nearby deaths create experience, and recall converts saved gold into items at the cost of map time.',
        sources: [7],
      },
      {
        title: 'Space turns combat into progress',
        text: 'Minion waves let teams pressure turrets, so winning a local interaction can become durable control of the map.',
        sources: [7],
      },
      {
        title: 'Roles distribute attention and agency',
        text: 'Five positions and distinct champion styles split responsibilities, while competitive clarity lets teammates and opponents anticipate actions.',
        sources: [7, 8, 13],
      },
    ],
    atoms: [
      { id: 'lol-intent', kind: 'intent', title: 'Destroy the enemy Nexus', summary: 'One visible team objective organizes every smaller decision.', rule: 'enemy.nexus.hp ≤ 0 → victory', x: 42, y: 58, sources: [7, 8], anatomy: { verb: 'Frame', input: 'Team objective', output: 'Victory condition', risk: 'Goal obscurity' } },
      { id: 'lol-role', kind: 'actum', title: 'Assume a map role', summary: 'A position and champion shape where attention and resources are spent.', rule: 'player → top | jungle | mid | bot | support', x: 312, y: 58, sources: [7, 8], anatomy: { verb: 'Commit', input: 'Champion + position', output: 'Team responsibility', risk: 'Composition gap' } },
      { id: 'lol-wave', kind: 'factum', title: 'Advance minion waves', summary: 'Autonomous waves create recurring windows of safety and pressure.', rule: 'timer.tick → spawn(minion_wave)', x: 582, y: 58, sources: [7], anatomy: { verb: 'Advance', input: 'World timer', output: 'Lane pressure', risk: 'Wave lost' } },
      { id: 'lol-farm', kind: 'tactum', title: 'Secure a last-hit', summary: 'Timing an attack on a minion converts lane attention into income.', rule: 'player deals killing blow → gold', x: 852, y: 58, sources: [7], anatomy: { verb: 'Last-hit', input: 'Attack + minion', output: 'Gold event', risk: 'Missed income' } },
      { id: 'lol-income', kind: 'economy', title: 'Accumulate gold and XP', summary: 'Farming and combat fill match-local pools that enable power spikes.', rule: 'events → gold_pool + xp_pool', x: 852, y: 274, sources: [7], anatomy: { verb: 'Accumulate', input: 'Farm + combat', output: 'Gold + XP', risk: 'Resource deficit' } },
      { id: 'lol-recall', kind: 'guard', title: 'Trade tempo for recall', summary: 'Leaving the map temporarily makes stored gold spendable at base.', rule: 'recall.complete → shop_access', x: 582, y: 274, sources: [7], anatomy: { verb: 'Recall', input: 'Safe channel', output: 'Shop access', risk: 'Lost map time' } },
      { id: 'lol-power', kind: 'state', title: 'Convert resources to power', summary: 'Items, levels, and ability ranks increase the champion’s options.', rule: 'gold + xp → items + levels + skills', x: 312, y: 274, sources: [7], anatomy: { verb: 'Convert', input: 'Gold + XP', output: 'Combat power', risk: 'Bad purchase timing' } },
      { id: 'lol-contest', kind: 'tactum', title: 'Contest space as a team', summary: 'Players use their power windows to win lane or team-fight position.', rule: 'team_power × position → pressure', x: 42, y: 274, sources: [7, 8, 13], anatomy: { verb: 'Contest', input: 'Team + terrain', output: 'Map pressure', risk: 'Counter-engage' } },
      { id: 'lol-push', kind: 'guard', title: 'Push behind a wave', summary: 'Friendly minions create the safer window for attacking a turret.', rule: 'friendly_wave.present → turret_window', x: 42, y: 490, sources: [7], anatomy: { verb: 'Time', input: 'Wave state', output: 'Siege window', risk: 'Turret retaliation' } },
      { id: 'lol-structure', kind: 'state', title: 'Remove a structure', summary: 'Turret progress makes the final objective more reachable.', rule: 'turret.hp ≤ 0 → path_open', x: 312, y: 490, sources: [7], anatomy: { verb: 'Demolish', input: 'Siege damage', output: 'Opened path', risk: 'Overextension' } },
      { id: 'lol-nexus', kind: 'factum', title: 'Open the Nexus', summary: 'Accumulated structure progress exposes the match-ending target.', rule: 'path_open → nexus.targetable', x: 582, y: 490, sources: [7, 8], anatomy: { verb: 'Expose', input: 'Structure state', output: 'Nexus access', risk: 'Failed conversion' } },
      { id: 'lol-metric', kind: 'evidence', title: 'Measure conversion rate', summary: 'Track how often gold or fight advantages become objectives.', rule: 'advantage → objective within 90s', x: 852, y: 490, sources: [2, 7], anatomy: { verb: 'Measure', input: 'Economy + objective events', output: 'Conversion rate', risk: 'Context loss' } },
    ],
    edges: [
      { id: 'lol-e1', from: 'lol-intent', to: 'lol-role', label: 'organizes', type: 'state' },
      { id: 'lol-e2', from: 'lol-role', to: 'lol-wave', label: 'occupy lane', type: 'event' },
      { id: 'lol-e3', from: 'lol-wave', to: 'lol-farm', label: 'timing', type: 'event' },
      { id: 'lol-e4', from: 'lol-farm', to: 'lol-income', label: 'earn', type: 'state' },
      { id: 'lol-e5', from: 'lol-income', to: 'lol-recall', label: 'bank', type: 'state' },
      { id: 'lol-e6', from: 'lol-recall', to: 'lol-power', label: 'purchase', type: 'event' },
      { id: 'lol-e7', from: 'lol-power', to: 'lol-contest', label: 'power spike', type: 'state' },
      { id: 'lol-e8', from: 'lol-contest', to: 'lol-push', label: 'win space', type: 'event' },
      { id: 'lol-e9', from: 'lol-push', to: 'lol-structure', label: 'siege', type: 'event' },
      { id: 'lol-e10', from: 'lol-structure', to: 'lol-nexus', label: 'open path', type: 'state' },
      { id: 'lol-e11', from: 'lol-structure', to: 'lol-wave', label: 'next lane', type: 'event' },
      { id: 'lol-e12', from: 'lol-nexus', to: 'lol-metric', label: 'evaluate', type: 'evidence' },
      { id: 'lol-e13', from: 'lol-income', to: 'lol-metric', label: 'compare', type: 'evidence' },
    ],
  },
};

const RUN_PROFILES: Record<GraphId, RunProfile> = {
  starter: {
    summary: 'The behavior hypothesis is measurable.',
    detail: 'Mechanics are expected to increase forward pressure, with a bounded snowball risk.',
    metrics: [
      { label: 'FORWARD-TIME', value: '+31%', note: 'model estimate' },
      { label: 'DASH CADENCE', value: '+42%', note: 'model estimate' },
      { label: 'DAMAGE TAKEN', value: '+18%', note: 'counter-risk', risk: true },
    ],
    riskTitle: 'Invariant catches a win-more loop',
    riskDetail: 'Cap the chain at three, then test whether aggression remains expressive.',
  },
  maplestory: {
    summary: 'The persistent mastery loop is measurable.',
    detail: 'Combat should feel worthwhile when short reward beats arrive before the next large progression milestone.',
    metrics: [
      { label: 'LOOP UPTIME', value: '+24%', note: 'model estimate' },
      { label: 'MILESTONE USE', value: '+16%', note: 'model estimate' },
      { label: 'GRIND FATIGUE', value: '+11%', note: 'counter-risk', risk: true },
    ],
    riskTitle: 'Layered growth can obscure agency',
    riskDetail: 'Test whether players can name the next meaningful milestone and why their last action advanced it.',
  },
  league: {
    summary: 'The advantage-conversion loop is measurable.',
    detail: 'Resource leads should matter most when teams can translate them into readable spatial progress.',
    metrics: [
      { label: 'OBJECTIVE RATE', value: '+19%', note: 'model estimate' },
      { label: 'GOLD CONVERSION', value: '+14%', note: 'model estimate' },
      { label: 'SNOWBALL RISK', value: '+9%', note: 'counter-risk', risk: true },
    ],
    riskTitle: 'Power can erase counterplay',
    riskDetail: 'Track whether the trailing team still has readable, achievable decisions before each structure falls.',
  },
};

function edgePath(edge: Edge, atoms: Atom[]) {
  const from = atoms.find((atom) => atom.id === edge.from);
  const to = atoms.find((atom) => atom.id === edge.to);
  if (!from || !to) return '';

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const direction = dx >= 0 ? 1 : -1;
    const sx = from.x + (direction > 0 ? NODE_WIDTH : 0);
    const sy = from.y + NODE_HEIGHT / 2;
    const tx = to.x + (direction > 0 ? 0 : NODE_WIDTH);
    const ty = to.y + NODE_HEIGHT / 2;
    const bend = Math.max(48, Math.abs(tx - sx) * 0.45);
    return `M ${sx} ${sy} C ${sx + bend * direction} ${sy}, ${tx - bend * direction} ${ty}, ${tx} ${ty}`;
  }

  const direction = dy >= 0 ? 1 : -1;
  const sx = from.x + NODE_WIDTH / 2;
  const sy = from.y + (direction > 0 ? NODE_HEIGHT : 0);
  const tx = to.x + NODE_WIDTH / 2;
  const ty = to.y + (direction > 0 ? 0 : NODE_HEIGHT);
  const bend = Math.max(48, Math.abs(ty - sy) * 0.45);
  return `M ${sx} ${sy} C ${sx} ${sy + bend * direction}, ${tx} ${ty - bend * direction}, ${tx} ${ty}`;
}

const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function MechanicForge() {
  const [atoms, setAtoms] = useState<Atom[]>(INITIAL_ATOMS);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [activeGraphId, setActiveGraphId] = useState<GraphId>('starter');
  const [previewSampleId, setPreviewSampleId] = useState<GameSampleId | null>(null);
  const [selectedId, setSelectedId] = useState('restore');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [intent, setIntent] = useState('Make dashing reward aggressive play without increasing weapon damage.');
  const [search, setSearch] = useState('');
  const [forging, setForging] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [zoom, setZoom] = useState(0.88);
  const [notice, setNotice] = useState('Graph ready · nine atoms are connected');
  const nextId = useRef(10);
  const drag = useRef<{ id: string; pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);

  const selected = atoms.find((atom) => atom.id === selectedId) ?? atoms[0];
  const selectedSources = SOURCES.filter((source) => selected?.sources.includes(source.id));
  const previewSample = previewSampleId ? GAME_SAMPLES[previewSampleId] : null;
  const graphTitle = activeGraphId === 'starter' ? 'Dash aggression loop' : `${GAME_SAMPLES[activeGraphId].name} · ${GAME_SAMPLES[activeGraphId].subtitle}`;
  const runProfile = RUN_PROFILES[activeGraphId];

  const filteredPalette = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? PALETTE.filter((atom) => `${atom.title} ${atom.category} ${KIND_META[atom.kind].label}`.toLowerCase().includes(query))
      : PALETTE;
  }, [search]);

  const updateAtom = (id: string, patch: Partial<Atom>) => {
    setAtoms((current) => current.map((atom) => atom.id === id ? { ...atom, ...patch } : atom));
    setNotice('Rule updated · graph needs a new run');
  };

  const addAtom = useCallback((kind: AtomKind) => {
    const template = PALETTE.find((item) => item.kind === kind) ?? PALETTE[0];
    const anchor = atoms.find((atom) => atom.id === selectedId) ?? atoms[atoms.length - 1];
    const id = `${kind}-${nextId.current++}`;
    const nextX = anchor ? (anchor.x < 820 ? anchor.x + 270 : 42) : 42;
    const nextY = anchor ? (anchor.x < 820 ? anchor.y : Math.min(anchor.y + 216, 690)) : 58;
    const newAtom: Atom = { ...template, id, x: nextX, y: nextY };
    setAtoms((current) => [...current, newAtom]);
    if (anchor) {
      setEdges((current) => [...current, { id: `e-${id}`, from: anchor.id, to: id, label: 'next', type: kind === 'evidence' ? 'evidence' : 'event' }]);
    }
    setSelectedId(id);
    setPreviewSampleId(null);
    setNotice(anchor ? `${template.title} added after ${anchor.title}` : `${template.title} added as the first atom`);
    return { ok: true, atom: { id, kind, title: template.title }, connectedFrom: anchor?.id ?? null };
  }, [atoms, selectedId]);

  const forgeGraph = useCallback(async (nextIntent?: string) => {
    const value = (nextIntent ?? intent).trim();
    if (!value) return { ok: false, error: 'intent must be a non-empty string' };
    setForging(true);
    setNotice('Astra is decomposing intent into atomic rules…');
    await pause(650);
    setAtoms((current) => current.map((atom) => atom.kind === 'intent' ? { ...atom, summary: value } : atom));
    setPreviewSampleId(null);
    setSelectedId((current) => atoms.some((atom) => atom.id === current) ? current : (atoms.find((atom) => atom.kind === 'intent')?.id ?? atoms[0]?.id ?? ''));
    setForging(false);
    setNotice(`Graph forged · one mechanic, ${atoms.length} inspectable atoms`);
    return { ok: true, intent: value, atomCount: atoms.length, invariants: 1, evidenceNodes: 1 };
  }, [atoms, intent]);

  const runGraph = useCallback(async () => {
    if (running) return { ok: false, error: 'graph is already running' };
    setRunning(true);
    setRunOpen(true);
    setNotice('Evaluating rule stack with seed MF-042…');
    const trace = atoms.map((atom) => atom.id);
    for (const id of trace) {
      setActiveId(id);
      await pause(145);
    }
    setActiveId(null);
    setRunning(false);
    setNotice('Run complete · behavior hypothesis is testable');
    return {
      ok: true,
      seed: 'MF-042',
      atomsEvaluated: atoms.length,
      prediction: Object.fromEntries(runProfile.metrics.map((metric) => [metric.label, metric.value])),
      risk: runProfile.riskTitle,
      metric: runProfile.metrics[0].label,
    };
  }, [atoms, runProfile, running]);

  const autoLayout = () => {
    setAtoms((current) => current.map((atom, index) => {
      const row = Math.floor(index / 4);
      const column = index % 4;
      const visualColumn = row % 2 === 0 ? column : 3 - column;
      return { ...atom, x: 42 + visualColumn * 270, y: 58 + row * 216 };
    }));
    setNotice('Graph auto-arranged');
  };

  const resetGraph = () => {
    setAtoms(INITIAL_ATOMS);
    setEdges(INITIAL_EDGES);
    setActiveGraphId('starter');
    setPreviewSampleId(null);
    setIntent('Make dashing reward aggressive play without increasing weapon damage.');
    setSelectedId('restore');
    setRunOpen(false);
    setNotice('Graph reset to the researched starter loop');
  };

  const removeAtomById = useCallback((id: string) => {
    const target = atoms.find((atom) => atom.id === id);
    if (!target) return { ok: false, error: 'atom not found' };
    const fallback = atoms.find((atom) => atom.id !== id)?.id ?? '';
    setAtoms((current) => current.filter((atom) => atom.id !== id));
    setEdges((current) => current.filter((edge) => edge.from !== id && edge.to !== id));
    setSelectedId((current) => current === id ? fallback : current);
    setNotice(`${target.title} removed with its connected links`);
    return { ok: true, removed: id };
  }, [atoms]);

  const loadSampleGame = useCallback((id: GameSampleId) => {
    const sample = GAME_SAMPLES[id];
    if (!sample) return { ok: false, error: 'sample must be maplestory or league' };
    setAtoms(sample.atoms.map((atom) => ({ ...atom, anatomy: { ...atom.anatomy }, sources: [...atom.sources] })));
    setEdges(sample.edges.map((edge) => ({ ...edge })));
    setActiveGraphId(id);
    setPreviewSampleId(null);
    setSourcesOpen(false);
    setIntent(sample.intent);
    setSelectedId(sample.atoms[0].id);
    setRunOpen(false);
    setNotice(`${sample.name} loaded · ${sample.atoms.length} atomic rules`);
    return { ok: true, sample: id, atomCount: sample.atoms.length, edgeCount: sample.edges.length };
  }, []);

  const startDrag = (event: ReactPointerEvent<HTMLElement>, atom: Atom) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: atom.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: atom.x, y: atom.y };
    setSelectedId(atom.id);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const x = Math.max(8, current.x + (event.clientX - current.startX) / zoom);
    const y = Math.max(8, current.y + (event.clientY - current.startY) / zoom);
    setAtoms((items) => items.map((atom) => atom.id === current.id ? { ...atom, x, y } : atom));
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null;
      setNotice('Atom position saved');
    }
  };

  const toolActions = useRef({ forgeGraph, addAtom, runGraph, loadSampleGame, removeAtomById });

  useEffect(() => {
    toolActions.current = { forgeGraph, addAtom, runGraph, loadSampleGame, removeAtomById };
  }, [addAtom, forgeGraph, loadSampleGame, removeAtomById, runGraph]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const reportError = (error: unknown) => console.warn('WebMCP registration failed', error);

    void Promise.resolve(context.registerTool({
      name: 'forge_rule_graph',
      title: 'Forge rule graph',
      description: 'Decompose a game-design intent into the visible stack of inspectable game atoms.',
      inputSchema: {
        type: 'object', properties: { intent: { type: 'string', minLength: 1 } }, required: ['intent'], additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: unknown) => {
        const value = input as { intent?: unknown };
        if (typeof value?.intent !== 'string' || !value.intent.trim()) return { ok: false, error: 'intent must be a non-empty string' };
        setIntent(value.intent);
        return toolActions.current.forgeGraph(value.intent);
      },
    }, { signal: lifecycle.signal })).catch(reportError);

    void Promise.resolve(context.registerTool({
      name: 'add_game_atom',
      title: 'Add game atom',
      description: 'Add and connect one rule atom after the currently selected atom in the visible graph.',
      inputSchema: {
        type: 'object',
        properties: { kind: { type: 'string', enum: ['actum', 'guard', 'state', 'tactum', 'factum', 'economy', 'feedback', 'trust', 'evidence'] } },
        required: ['kind'], additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: unknown) => {
        const value = input as { kind?: AtomKind };
        if (!value?.kind || !PALETTE.some((atom) => atom.kind === value.kind)) return { ok: false, error: 'kind must be a supported game atom type' };
        return toolActions.current.addAtom(value.kind);
      },
    }, { signal: lifecycle.signal })).catch(reportError);

    void Promise.resolve(context.registerTool({
      name: 'run_rule_graph',
      title: 'Run rule graph',
      description: 'Evaluate the visible rule stack and return its behavior prediction, risk, and playtest metric.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async () => toolActions.current.runGraph(),
    }, { signal: lifecycle.signal })).catch(reportError);

    void Promise.resolve(context.registerTool({
      name: 'load_sample_game',
      title: 'Load sample game',
      description: 'Load a researched MapleStory or League of Legends decomposition as editable atomic cards on the visible graph.',
      inputSchema: {
        type: 'object',
        properties: { sample: { type: 'string', enum: ['maplestory', 'league'] } },
        required: ['sample'], additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: unknown) => {
        const value = input as { sample?: GameSampleId };
        if (value?.sample !== 'maplestory' && value?.sample !== 'league') return { ok: false, error: 'sample must be maplestory or league' };
        return toolActions.current.loadSampleGame(value.sample);
      },
    }, { signal: lifecycle.signal })).catch(reportError);

    void Promise.resolve(context.registerTool({
      name: 'delete_game_atom',
      title: 'Delete game atom',
      description: 'Delete one visible game-atom card and every graph link connected to it.',
      inputSchema: {
        type: 'object', properties: { atomId: { type: 'string', minLength: 1 } }, required: ['atomId'], additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: unknown) => {
        const value = input as { atomId?: unknown };
        if (typeof value?.atomId !== 'string' || !value.atomId.trim()) return { ok: false, error: 'atomId must be a non-empty string' };
        return toolActions.current.removeAtomById(value.atomId);
      },
    }, { signal: lifecycle.signal })).catch(reportError);

    return () => lifecycle.abort();
  }, []);

  const submitForge = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    void forgeGraph();
  };

  return (
    <main className="flow-app">
      <header className="flow-header">
        <div className="flow-brand"><span><Hammer /></span><strong>Mechanic Forge</strong><em>LAB</em></div>
        <div className="project-switcher">{graphTitle}</div>
        <div className="flow-actions">
          <span className="draft-status"><i /> {notice}</span>
          <Button variant="ghost" size="sm" onClick={() => setSourcesOpen(true)}><BookOpen /> Sources · {SOURCES.length}</Button>
          <Button variant="outline" size="sm" onClick={autoLayout}><Maximize2 /> Auto-layout</Button>
          <Button size="sm" onClick={() => { void runGraph(); }} disabled={running}>
            {running ? <LoaderCircle className="spin" /> : <Play />}{running ? 'Evaluating' : 'Run graph'}
          </Button>
        </div>
      </header>

      <section className="flow-shell">
        <aside className="atom-library">
          <form className="intent-composer" onSubmit={submitForge}>
            <span className="panel-label"><Sparkles /> DESIGN INTENT</span>
            <Textarea value={intent} onChange={(event) => setIntent(event.target.value)} aria-label="Game-design intent" rows={3} />
            <Button type="submit" size="sm" disabled={forging}>
              {forging ? <LoaderCircle className="spin" /> : <Sparkles />}{forging ? 'Forging atoms…' : 'Forge atom chain'}
            </Button>
            <small>Astra-assisted decomposition · deterministic demo</small>
          </form>

          <section className="sample-picker">
            <div className="library-title-row"><span className="panel-label">SAMPLE DECOMPOSITIONS</span><span>RESEARCHED</span></div>
            <div className="sample-buttons">
              {(Object.values(GAME_SAMPLES) as GameSample[]).map((sample) => (
                <button
                  className={activeGraphId === sample.id ? 'active' : ''}
                  key={sample.id}
                  onClick={() => {
                    setSourcesOpen(false);
                    setPreviewSampleId(sample.id);
                    setNotice(`${sample.name} brief open · review principles before loading`);
                  }}
                  type="button"
                >
                  <strong>{sample.name}</strong>
                  <small>{sample.subtitle}</small>
                </button>
              ))}
            </div>
          </section>

          <div className="library-head">
            <div className="library-title-row"><span className="panel-label">ATOM LIBRARY</span><span>{filteredPalette.length}</span></div>
            <div className="atom-search"><Search /><Input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search game atoms" placeholder="Search atoms" /></div>
          </div>

          <div className="palette-scroll">
            {(['Interaction', 'Logic', 'Economy', 'Evidence'] as const).map((category) => {
              const items = filteredPalette.filter((atom) => atom.category === category);
              if (!items.length) return null;
              return (
                <section className="palette-group" key={category}>
                  <h2>{category}</h2>
                  {items.map(({ title, kind, icon: Icon }) => (
                    <button key={`${title}-${kind}`} className="palette-item" type="button" onClick={() => addAtom(kind)}>
                      <span className={`palette-icon kind-${kind}`}><Icon /></span>
                      <span><strong>{title}</strong><small>{KIND_META[kind].label}</small></span>
                      <Plus />
                    </button>
                  ))}
                </section>
              );
            })}
          </div>

          <div className="library-tip"><Command /><span><strong>One atom, one state decision.</strong> Compose loops by passing events and state between atoms.</span></div>
        </aside>

        <section className="rule-canvas" aria-label="Game atom flow canvas">
          <div className="canvas-toolbar">
            <div><span className="live-indicator" /><strong>{graphTitle.toUpperCase()}</strong><span>{atoms.length} atoms · {edges.length} links</span></div>
            <div className="zoom-control">
              <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.66, value - 0.08))}><Minus /></button>
              <output>{Math.round(zoom * 100)}%</output>
              <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.12, value + 0.08))}><Plus /></button>
              <button type="button" aria-label="Reset graph" onClick={resetGraph}><RotateCcw /></button>
            </div>
          </div>

          <div className="canvas-scroll">
            <div className="canvas-world" style={{ transform: `scale(${zoom})` }}>
              <svg className="connection-layer" viewBox="0 0 1160 820" aria-hidden="true">
                <defs>
                  <marker id="arrow-event" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" /></marker>
                  <marker id="arrow-state" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" /></marker>
                  <marker id="arrow-evidence" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" /></marker>
                </defs>
                {edges.map((edge) => <path key={edge.id} className={`edge-${edge.type}`} d={edgePath(edge, atoms)} markerEnd={`url(#arrow-${edge.type})`} />)}
              </svg>

              {atoms.map((atom) => {
                const meta = KIND_META[atom.kind];
                const Icon = meta.icon;
                return (
                  <div
                    className={`atom-card atom-${atom.kind} ${selectedId === atom.id ? 'selected' : ''} ${activeId === atom.id ? 'running' : ''}`}
                    key={atom.id}
                    style={{ left: atom.x, top: atom.y }}
                  >
                    <span className="atom-port port-left" /><span className="atom-port port-right" /><span className="atom-port port-top" /><span className="atom-port port-bottom" />
                    <button
                      aria-label={`${meta.label}: ${atom.title}`}
                      className="atom-drag-surface"
                      onPointerDown={(event) => startDrag(event, atom)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                      type="button"
                    >
                      <span className="atom-card-head"><span className={`atom-icon kind-${atom.kind}`}><Icon /></span><span>{meta.label}</span><b>{atom.sources.map((id) => `[${id}]`).join(' ')}</b></span>
                      <strong>{atom.title}</strong>
                      <span className="atom-summary">{atom.summary}</span>
                      <code>{atom.rule}</code>
                    </button>
                    <button
                      aria-label={`Delete ${atom.title}`}
                      className="atom-delete"
                      onClick={() => { removeAtomById(atom.id); }}
                      onPointerDown={(event) => event.stopPropagation()}
                      title="Delete atom"
                      type="button"
                    ><Trash2 /></button>
                    {activeId === atom.id && <span className="run-pulse" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="canvas-legend"><span><i className="state-line" /> state</span><span><i className="event-line" /> event</span><span><i className="evidence-line" /> evidence</span><span>drag atoms to rearrange</span></div>

          {runOpen && (
            <section className="run-result" aria-live="polite">
              <button type="button" className="close-result" aria-label="Close run results" onClick={() => setRunOpen(false)}><X /></button>
              <div className="run-summary">
                <span className={`run-status ${running ? 'is-running' : ''}`}>{running ? <LoaderCircle className="spin" /> : <Check />}{running ? 'EVALUATING GRAPH' : 'RUN COMPLETE · SEED MF-042'}</span>
                <strong>{running ? 'Tracing atom dependencies…' : runProfile.summary}</strong>
                <p>{runProfile.detail}</p>
              </div>
              <div className="run-metrics">
                {runProfile.metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong className={metric.risk ? 'risk-value' : ''}>{metric.value}</strong><small>{metric.note}</small></div>)}
              </div>
              <div className="run-risk"><ShieldCheck /><span><strong>{runProfile.riskTitle}</strong>{runProfile.riskDetail}</span></div>
            </section>
          )}
        </section>

        <aside className={`atom-inspector ${sourcesOpen ? 'show-sources' : ''}`}>
          {sourcesOpen ? (
            <>
              <div className="inspector-head"><span className="panel-label">RESEARCH BASIS</span><button type="button" onClick={() => setSourcesOpen(false)} aria-label="Close research sources"><X /></button></div>
              <div className="research-note"><BookOpen /><p><strong>A synthesis, not one canonical grammar.</strong> Koster’s atoms, Séraphine’s ludophrases, MDA, rule levels, and Machinations each describe a different layer. Mechanic Forge combines them while preserving provenance.</p></div>
              <div className="source-list">
                {SOURCES.map((source) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                    <span>[{source.id}] {source.author}<ExternalLink /></span>
                    <strong>{source.title}</strong>
                    <p>{source.note}</p>
                  </a>
                ))}
              </div>
            </>
          ) : previewSample ? (
            <>
              <div className="inspector-head"><span className="panel-label">REFERENCE DECOMPOSITION</span><button type="button" onClick={() => setPreviewSampleId(null)} aria-label="Close sample brief"><X /></button></div>
              <section className="sample-overview">
                <span>{previewSample.subtitle}</span>
                <h2>{previewSample.name}</h2>
                <p>{previewSample.thesis}</p>
              </section>
              <section className="principle-list">
                <span className="panel-label">GAME PRINCIPLES · NATURAL LANGUAGE</span>
                {previewSample.principles.map((principle) => (
                  <article key={principle.title}>
                    <strong>{principle.title}</strong>
                    <p>{principle.text}</p>
                    <div>{principle.sources.map((id) => {
                      const source = SOURCES.find((item) => item.id === id);
                      return source ? <a href={source.url} target="_blank" rel="noreferrer" key={id}>[{id}] {source.author}<ExternalLink /></a> : null;
                    })}</div>
                  </article>
                ))}
              </section>
              <section className="sample-translation">
                <span className="panel-label"><GitBranch /> MECHANIC FORGE TRANSLATION</span>
                <p>{previewSample.atoms.length} atomic cards · {previewSample.edges.length} typed links · fully editable after loading.</p>
                <Button size="sm" onClick={() => { loadSampleGame(previewSample.id); }}><GitBranch /> Load atomic graph</Button>
              </section>
            </>
          ) : selected ? (
            <>
              <div className="inspector-head"><span className="panel-label">INSPECTOR</span><span className={`kind-pill kind-${selected.kind}`}>{KIND_META[selected.kind].label}</span></div>
              <section className="inspector-section">
                <label htmlFor="atom-name">Name</label>
                <Input id="atom-name" value={selected.title} onChange={(event) => updateAtom(selected.id, { title: event.target.value })} />
                <label htmlFor="atom-description">Purpose</label>
                <Textarea id="atom-description" value={selected.summary} onChange={(event) => updateAtom(selected.id, { summary: event.target.value })} rows={3} />
                <label htmlFor="atom-rule">Rule expression</label>
                <Input id="atom-rule" className="rule-input" value={selected.rule} onChange={(event) => updateAtom(selected.id, { rule: event.target.value })} />
              </section>

              <section className="inspector-section">
                <span className="panel-label">ATOM CONTRACT</span>
                <dl className="anatomy-list">
                  <div><dt>Verb</dt><dd>{selected.anatomy.verb}</dd></div>
                  <div><dt>Input</dt><dd>{selected.anatomy.input}</dd></div>
                  <div><dt>Output</dt><dd>{selected.anatomy.output}</dd></div>
                  <div><dt>Failure / risk</dt><dd>{selected.anatomy.risk}</dd></div>
                </dl>
              </section>

              <section className="inspector-section hypothesis-box">
                <span className="panel-label"><Sparkles /> DYNAMIC INFERENCE</span>
                <strong>{selected.kind === 'trust' ? 'Counterplay remains recoverable.' : 'This atom changes the next decision.'}</strong>
                <p>{selected.kind === 'state' ? 'State transforms compound into the run-time behavior MDA calls dynamics.' : 'Trace the output into the next atom, then attach evidence to test the claim.'}</p>
              </section>

              <section className="inspector-section citation-section">
                <div className="section-row"><span className="panel-label">GROUNDED BY</span><button type="button" onClick={() => setSourcesOpen(true)}>View all</button></div>
                {selectedSources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>[{source.id}] {source.author}<ExternalLink /></a>)}
              </section>

              <div className="inspector-actions">
                <Button variant="outline" size="sm" onClick={() => { removeAtomById(selected.id); }}><Trash2 /> Delete atom</Button>
              </div>
            </>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
