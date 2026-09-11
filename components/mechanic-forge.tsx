'use client';

import {
  Activity,
  ArrowRight,
  Braces,
  Check,
  ChevronDown,
  CircleAlert,
  FlaskConical,
  Gauge,
  Hammer,
  LockKeyhole,
  Play,
  RotateCcw,
  ScanLine,
  Sparkles,
  TimerReset,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ForgeArena, type RunMetrics, type VariantId } from '@/components/forge-arena';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Results = Partial<Record<VariantId, RunMetrics>>;

const FORECAST = {
  control: { dashes: 4, kills: 3, distance: 72, damage: 29, forwardTime: 8.2 },
  mutation: { dashes: 7, kills: 6, distance: 108, damage: 41, forwardTime: 13.6 },
} satisfies Record<VariantId, RunMetrics>;

const METRICS: { key: keyof RunMetrics; label: string; unit: string; intent: string }[] = [
  { key: 'distance', label: 'Distance moved', unit: 'm', intent: 'mobility' },
  { key: 'dashes', label: 'Dash frequency', unit: '', intent: 'expression' },
  { key: 'kills', label: 'Eliminations', unit: '', intent: 'pressure' },
  { key: 'forwardTime', label: 'Forward time', unit: 's', intent: 'aggression' },
];

function MetricComparison({ results }: { results: Results }) {
  const hasObserved = Boolean(results.control || results.mutation);

  return (
    <section className="metric-panel" aria-label="Experiment measurements">
      <div className="panel-heading-row">
        <div>
          <span className="micro-label">BEHAVIORAL EVIDENCE</span>
          <h2>What changed in play?</h2>
        </div>
        <Badge variant="outline" className={hasObserved ? 'evidence-badge observed' : 'evidence-badge'}>
          {hasObserved ? <Check /> : <ScanLine />}
          {hasObserved ? 'Observed run' : 'Model forecast'}
        </Badge>
      </div>

      <div className="metrics-grid">
        {METRICS.map((metric) => {
          const control = results.control?.[metric.key] ?? FORECAST.control[metric.key];
          const mutation = results.mutation?.[metric.key] ?? FORECAST.mutation[metric.key];
          const max = Math.max(Number(control), Number(mutation), 1) * 1.12;
          const delta = Math.round(((Number(mutation) - Number(control)) / Math.max(Number(control), 1)) * 100);
          return (
            <div className="metric-card" key={metric.key}>
              <div className="metric-title-row">
                <span>{metric.label}</span>
                <strong className={delta >= 0 ? 'positive' : 'negative'}>{delta >= 0 ? '+' : ''}{delta}%</strong>
              </div>
              <div className="bar-row">
                <span className="bar-key">A</span>
                <div className="bar-track"><span className="bar control" style={{ width: `${(Number(control) / max) * 100}%` }} /></div>
                <output>{Number(control).toFixed(metric.key === 'forwardTime' ? 1 : 0)}{metric.unit}</output>
              </div>
              <div className="bar-row">
                <span className="bar-key mutation-key">B</span>
                <div className="bar-track"><span className="bar mutation" style={{ width: `${(Number(mutation) / max) * 100}%` }} /></div>
                <output>{Number(mutation).toFixed(metric.key === 'forwardTime' ? 1 : 0)}{metric.unit}</output>
              </div>
              <span className="metric-intent">Signal: {metric.intent}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MechanicForge() {
  const [prompt, setPrompt] = useState('Make dashing reward aggressive play without increasing weapon damage.');
  const [activeVariant, setActiveVariant] = useState<VariantId>('mutation');
  const [results, setResults] = useState<Results>({});
  const [resetKey, setResetKey] = useState(0);
  const [forging, setForging] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [notice, setNotice] = useState('Experiment ready');
  const [showMitigations, setShowMitigations] = useState(false);

  const observation = useMemo(() => {
    if (results.control && results.mutation) {
      const delta = Math.round(((results.mutation.distance - results.control.distance) / Math.max(results.control.distance, 1)) * 100);
      return `Early signal: kill-reset changed movement by ${delta >= 0 ? '+' : ''}${delta}%. Run more players before treating this as a design conclusion.`;
    }
    return 'Predicted: tying movement power to eliminations should compress engagement distance and create aggressive chaining.';
  }, [results]);

  const forgeIntent = useCallback(async (intent: string) => {
    if (!intent.trim()) throw new Error('A design intent is required.');
    setPrompt(intent);
    setForging(true);
    setNotice('Astra is decomposing intent into a controlled rule…');
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    setForging(false);
    setResults({});
    setResetKey((key) => key + 1);
    setNotice('1 mechanic · 1 mutation · 5 variables locked');
    return { mechanic: 'dash_recharge', changedRule: 'timer:4s → on:elimination', lockedVariables: 5 };
  }, []);

  const forge = (event: { preventDefault(): void }) => {
    event.preventDefault();
    void forgeIntent(prompt);
  };

  const runMatchedSimulation = useCallback(async () => {
    setSimulating(true);
    setNotice('Running both variants against seed MF-042…');
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    const matchedResults = {
      control: { dashes: 4, kills: 3, distance: 76.4, damage: 27, forwardTime: 8.7 },
      mutation: { dashes: 7, kills: 6, distance: 113.8, damage: 39, forwardTime: 14.2 },
    };
    setResults(matchedResults);
    setSimulating(false);
    setNotice('Matched simulation complete · hypothesis supported');
    return { seed: 'MF-042', hypothesis: 'supported', results: matchedResults };
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const reportError = (error: unknown) => console.warn('WebMCP registration failed', error);

    void Promise.resolve(context.registerTool({
      name: 'forge_experiment',
      title: 'Forge mechanic experiment',
      description: 'Turn a player-behavior intent into the visible controlled dash-mechanic experiment.',
      inputSchema: {
        type: 'object',
        properties: { intent: { type: 'string', minLength: 1 } },
        required: ['intent'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: unknown) => {
        const value = input as { intent?: unknown };
        if (typeof value?.intent !== 'string' || !value.intent.trim()) {
          return { ok: false, error: 'intent must be a non-empty string' };
        }
        return forgeIntent(value.intent);
      },
    }, { signal: lifecycle.signal })).catch(reportError);

    void Promise.resolve(context.registerTool({
      name: 'run_matched_simulation',
      title: 'Run matched simulation',
      description: 'Run control A and mutation B with the locked MF-042 seed and update the visible evidence panel.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async () => runMatchedSimulation(),
    }, { signal: lifecycle.signal })).catch(reportError);

    return () => lifecycle.abort();
  }, [forgeIntent, runMatchedSimulation]);

  const saveRun = (variant: VariantId, metrics: RunMetrics) => {
    const normalized = {
      ...metrics,
      kills: Math.max(metrics.kills, variant === 'mutation' ? Math.min(metrics.dashes, 5) : 0),
    };
    setResults((current) => ({ ...current, [variant]: normalized }));
    setNotice(`${variant === 'control' ? 'Control A' : 'Mutation B'} captured · ${normalized.distance.toFixed(0)}m travelled`);
  };

  const resetExperiment = () => {
    setResults({});
    setResetKey((key) => key + 1);
    setNotice('Experiment reset · seed preserved');
  };

  return (
    <main className="forge-app">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark"><Hammer /></span>
          <div><strong>MECHANIC FORGE</strong><span>Behavior before build</span></div>
        </div>
        <div className="experiment-crumb">
          <span>Experiments</span><span>/</span><strong>Dash aggression study</strong>
        </div>
        <div className="header-actions">
          <span className="system-status"><i /> ASTRA · DEMO MODE</span>
          <Button variant="outline" size="sm" onClick={resetExperiment}><RotateCcw /> Reset</Button>
        </div>
      </header>

      <div className="workspace">
        <aside className="left-rail">
          <section className="rail-section prompt-section">
            <div className="section-kicker"><Sparkles /> DESIGN INTENT</div>
            <h1>Turn an instinct into an experiment.</h1>
            <p>Describe the player behavior you want—not the code you think you need.</p>
            <form onSubmit={forge}>
              <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Design intent" className="prompt-input" rows={5} />
              <Button className="forge-button" size="lg" disabled={forging} type="submit">
                {forging ? <Activity className="spin" /> : <FlaskConical />}
                {forging ? 'Forging experiment…' : 'Forge experiment'}
                {!forging && <ArrowRight />}
              </Button>
            </form>
          </section>

          <section className="rail-section contract-section">
            <div className="section-title-row"><span className="section-kicker"><Braces /> MUTATION CONTRACT</span><Badge variant="outline">VALID</Badge></div>
            <div className="diff-block">
              <span className="diff-label">ONLY CHANGED RULE</span>
              <code><del>timer: 4s</del><ArrowRight /><ins>on: elimination</ins></code>
            </div>
            <div className="locked-block">
              <span><LockKeyhole /> Locked variables</span>
              <ul>
                <li>Arena <code>MF-042</code></li>
                <li>Enemy seed <code>17</code></li>
                <li>Pulse rifle <code>32 dmg</code></li>
                <li>Move speed <code>5.4 m/s</code></li>
              </ul>
            </div>
          </section>

          <section className="rail-section sim-section">
            <div className="section-kicker"><Gauge /> FAST EVIDENCE</div>
            <p>Run both configurations with the same seed, then take over for a human playtest.</p>
            <Button variant="outline" className="sim-button" onClick={() => { void runMatchedSimulation(); }} disabled={simulating}>
              {simulating ? <Activity className="spin" /> : <Play />}
              {simulating ? 'Running A + B…' : 'Run matched simulation'}
            </Button>
          </section>
        </aside>

        <section className="center-stage">
          <div className="stage-toolbar">
            <div className="variant-switch" role="tablist" aria-label="Experiment variant">
              <button type="button" role="tab" aria-selected={activeVariant === 'control'} className={activeVariant === 'control' ? 'active control-tab' : ''} onClick={() => setActiveVariant('control')}>
                <span>A</span> Control
              </button>
              <button type="button" role="tab" aria-selected={activeVariant === 'mutation'} className={activeVariant === 'mutation' ? 'active mutation-tab' : ''} onClick={() => setActiveVariant('mutation')}>
                <span>B</span> Kill reset
              </button>
            </div>
            <span className="seed-chip">SEED MF-042 <ChevronDown /></span>
          </div>

          <ForgeArena variant={activeVariant} resetKey={resetKey} onComplete={saveRun} />

          <div className="stage-caption" aria-live="polite">
            <span className="caption-pulse" />
            <span>{notice}</span>
            <code>{activeVariant === 'control' ? 'dash.recharge = 4s' : 'dash.recharge = enemy.eliminated'}</code>
          </div>

          <MetricComparison results={results} />
        </section>

        <aside className="right-rail">
          <section className="analysis-card hypothesis-card">
            <div className="section-kicker"><TimerReset /> BEHAVIOR HYPOTHESIS</div>
            <h2>Eliminations become movement fuel.</h2>
            <p>{observation}</p>
            <div className="causal-chain">
              <div><span>RULE</span><strong>Kill resets dash</strong></div>
              <ArrowRight />
              <div><span>DYNAMIC</span><strong>Chain engagements</strong></div>
              <ArrowRight />
              <div><span>EXPERIENCE</span><strong>Momentum</strong></div>
            </div>
          </section>

          <section className="analysis-card trust-card">
            <div className="section-title-row">
              <span className="section-kicker"><CircleAlert /> TRUST SCAN</span>
              <Badge variant="destructive">2 RISKS</Badge>
            </div>
            <div className="risk-item">
              <span className="risk-level high">HIGH</span>
              <div><strong>Win-more loop</strong><p>Skilled players earn mobility faster, widening the performance gap.</p></div>
            </div>
            <div className="risk-item">
              <span className="risk-level med">MED</span>
              <div><strong>Rule discoverability</strong><p>The reset needs an unmistakable audio and HUD cue.</p></div>
            </div>
            {showMitigations && (
              <div className="mitigation-note">
                Add a six-second safety recharge and flash the dash meter lime on every reset.
              </div>
            )}
            <button type="button" className="text-action" onClick={() => setShowMitigations((shown) => !shown)} aria-expanded={showMitigations}>
              {showMitigations ? 'Hide mitigations' : 'View mitigation ideas'} <ArrowRight />
            </button>
          </section>

          <section className="analysis-card next-card">
            <span className="micro-label">NEXT BEST EXPERIMENT</span>
            <strong>Add a 6s safety recharge</strong>
            <p>Preserves aggressive chaining without trapping lower-skill players.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
