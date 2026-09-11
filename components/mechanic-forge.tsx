'use client';

import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Braces,
  Check,
  ChevronDown,
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
    const nextX = anchor.x < 820 ? anchor.x + 270 : 42;
    const nextY = anchor.x < 820 ? anchor.y : Math.min(anchor.y + 216, 690);
    const newAtom: Atom = { ...template, id, x: nextX, y: nextY };
    setAtoms((current) => [...current, newAtom]);
    setEdges((current) => [...current, { id: `e-${id}`, from: anchor.id, to: id, label: 'next', type: kind === 'evidence' ? 'evidence' : 'event' }]);
    setSelectedId(id);
    setNotice(`${template.title} added after ${anchor.title}`);
    return { ok: true, atom: { id, kind, title: template.title }, connectedFrom: anchor.id };
  }, [atoms, selectedId]);

  const forgeGraph = useCallback(async (nextIntent?: string) => {
    const value = (nextIntent ?? intent).trim();
    if (!value) return { ok: false, error: 'intent must be a non-empty string' };
    setForging(true);
    setNotice('Astra is decomposing intent into atomic rules…');
    await pause(650);
    setAtoms((current) => current.map((atom) => atom.id === 'intent' ? { ...atom, title: 'Reward aggressive movement', summary: value } : atom));
    setSelectedId('intent');
    setForging(false);
    setNotice('Graph forged · one mechanic, nine inspectable atoms');
    return { ok: true, intent: value, atomCount: atoms.length, invariants: 1, evidenceNodes: 1 };
  }, [atoms.length, intent]);

  const runGraph = useCallback(async () => {
    if (running) return { ok: false, error: 'graph is already running' };
    setRunning(true);
    setRunOpen(true);
    setNotice('Evaluating rule stack with seed MF-042…');
    const trace = ['intent', 'dash', 'available', 'spend', 'pressure', 'elimination', 'restore', 'limit', 'metric'];
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
      prediction: { forwardTime: '+31%', dashCadence: '+42%', damageTaken: '+18%' },
      risk: 'Positive feedback may snowball after repeated eliminations',
      metric: 'forward-time percentage by matched seed',
    };
  }, [atoms.length, running]);

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
    setSelectedId('restore');
    setRunOpen(false);
    setNotice('Graph reset to the researched starter loop');
  };

  const removeSelected = () => {
    if (!selected || selected.id === 'intent') return;
    setAtoms((current) => current.filter((atom) => atom.id !== selected.id));
    setEdges((current) => current.filter((edge) => edge.from !== selected.id && edge.to !== selected.id));
    setSelectedId('intent');
    setNotice(`${selected.title} removed`);
  };

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

  const toolActions = useRef({ forgeGraph, addAtom, runGraph });

  useEffect(() => {
    toolActions.current = { forgeGraph, addAtom, runGraph };
  }, [addAtom, forgeGraph, runGraph]);

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
        <button className="project-switcher" type="button">Dash aggression loop <ChevronDown /></button>
        <div className="flow-actions">
          <span className="draft-status"><i /> {notice}</span>
          <Button variant="ghost" size="sm" onClick={() => setSourcesOpen(true)}><BookOpen /> Sources · 6</Button>
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
            <div><span className="live-indicator" /><strong>AGGRESSION LOOP</strong><span>{atoms.length} atoms · {edges.length} links</span></div>
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
                  <button
                    aria-label={`${meta.label}: ${atom.title}`}
                    className={`atom-card atom-${atom.kind} ${selectedId === atom.id ? 'selected' : ''} ${activeId === atom.id ? 'running' : ''}`}
                    key={atom.id}
                    onPointerDown={(event) => startDrag(event, atom)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    style={{ left: atom.x, top: atom.y }}
                    type="button"
                  >
                    <span className="atom-port port-left" /><span className="atom-port port-right" /><span className="atom-port port-top" /><span className="atom-port port-bottom" />
                    <div className="atom-card-head"><span className={`atom-icon kind-${atom.kind}`}><Icon /></span><span>{meta.label}</span><b>{atom.sources.map((id) => `[${id}]`).join(' ')}</b></div>
                    <strong>{atom.title}</strong>
                    <p>{atom.summary}</p>
                    <code>{atom.rule}</code>
                    {activeId === atom.id && <span className="run-pulse" />}
                  </button>
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
                <strong>{running ? 'Tracing atom dependencies…' : 'The behavior hypothesis is measurable.'}</strong>
                <p>Mechanics are expected to increase forward pressure, with a bounded snowball risk.</p>
              </div>
              <div className="run-metrics">
                <div><span>FORWARD-TIME</span><strong>+31%</strong><small>model estimate</small></div>
                <div><span>DASH CADENCE</span><strong>+42%</strong><small>model estimate</small></div>
                <div><span>DAMAGE TAKEN</span><strong className="risk-value">+18%</strong><small>counter-risk</small></div>
              </div>
              <div className="run-risk"><ShieldCheck /><span><strong>Invariant catches a win-more loop</strong> Cap the chain at three, then test whether aggression remains expressive.</span></div>
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
                <Button variant="outline" size="sm" onClick={removeSelected} disabled={selected.id === 'intent'}><Trash2 /> Delete atom</Button>
              </div>
            </>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
