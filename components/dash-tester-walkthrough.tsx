'use client';

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Crosshair,
  EyeOff,
  FileWarning,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DASH_DEMO_ORDER,
  buildDashDemoReport,
  recordDashDemoDecision,
  type DashDemoDecision,
  type DashDemoPreference,
} from '@/lib/mechanics/dash-demo';
import {
  DASH_ARENA,
  advanceDashPreviewRun,
  createDashPreviewRun,
  startDashPreviewRun,
  type DashRuntimeInput,
  type DashRuntimeState,
} from '@/lib/mechanics/dash-runtime';

const FRAME_MS = 50;
const MOVEMENT_CONTROLS = [
  { label: 'Move up', x: 0, y: -1, icon: ArrowUp },
  { label: 'Move left', x: -1, y: 0, icon: ArrowLeft },
  { label: 'Move down', x: 0, y: 1, icon: ArrowDown },
  { label: 'Move right', x: 1, y: 0, icon: ArrowRight },
] as const;

type WalkthroughStage = 'consent' | 'run' | 'response' | 'report';
type DemoReport = ReturnType<typeof buildDashDemoReport>;
type DemoDecisionRecord = ReturnType<typeof recordDashDemoDecision>;

function positionStyle(x: number, y: number): CSSProperties {
  return {
    left: `${(x / DASH_ARENA.width) * 100}%`,
    top: `${(y / DASH_ARENA.height) * 100}%`,
  };
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}

function axisFromKeys(keys: Set<string>): Pick<DashRuntimeInput, 'x' | 'y'> {
  const left = keys.has('arrowleft') || keys.has('a');
  const right = keys.has('arrowright') || keys.has('d');
  const up = keys.has('arrowup') || keys.has('w');
  const down = keys.has('arrowdown') || keys.has('s');

  return {
    x: left === right ? 0 : left ? -1 : 1,
    y: up === down ? 0 : up ? -1 : 1,
  };
}

export function DashTesterWalkthrough() {
  const [stage, setStage] = useState<WalkthroughStage>('consent');
  const [consented, setConsented] = useState(false);
  const [runIndex, setRunIndex] = useState(0);
  const [run, setRun] = useState(() =>
    createDashPreviewRun({ variant: DASH_DEMO_ORDER[0] }),
  );
  const [firstRun, setFirstRun] = useState<DashRuntimeState | null>(null);
  const [secondRun, setSecondRun] = useState<DashRuntimeState | null>(null);
  const [preference, setPreference] = useState<DashDemoPreference | ''>('');
  const [response, setResponse] = useState('');
  const [report, setReport] = useState<DemoReport | null>(null);
  const [decision, setDecision] = useState<DashDemoDecision>('inconclusive');
  const [rationale, setRationale] = useState('');
  const [decisionRecord, setDecisionRecord] =
    useState<DemoDecisionRecord | null>(null);
  const heldKeys = useRef(new Set<string>());
  const touchAxis = useRef<Pick<DashRuntimeInput, 'x' | 'y'>>({ x: 0, y: 0 });
  const queuedDash = useRef(false);
  const queuedAttack = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || stage !== 'run') return;
      const key = event.key.toLowerCase();
      if (
        [
          'arrowleft',
          'arrowright',
          'arrowup',
          'arrowdown',
          'w',
          'a',
          's',
          'd',
        ].includes(key)
      ) {
        event.preventDefault();
        heldKeys.current.add(key);
      }
      if (key === ' ') {
        event.preventDefault();
        queuedDash.current = true;
      }
      if (key === 'j') queuedAttack.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      heldKeys.current.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'run' || run.status !== 'running') return;

    const interval = window.setInterval(() => {
      const keyboard = axisFromKeys(heldKeys.current);
      const input: DashRuntimeInput = {
        x: touchAxis.current.x || keyboard.x,
        y: touchAxis.current.y || keyboard.y,
        dash: queuedDash.current,
        attack: queuedAttack.current,
      };
      queuedDash.current = false;
      queuedAttack.current = false;
      setRun((current) => advanceDashPreviewRun(current, FRAME_MS, input));
    }, FRAME_MS);

    return () => window.clearInterval(interval);
  }, [run.status, stage]);

  const setTouchDirection = (x: -1 | 0 | 1, y: -1 | 0 | 1) => {
    touchAxis.current = { x, y };
  };

  const continueAfterRun = () => {
    heldKeys.current.clear();
    touchAxis.current = { x: 0, y: 0 };
    queuedDash.current = false;
    queuedAttack.current = false;
    if (runIndex === 0) {
      setFirstRun(run);
      setRunIndex(1);
      setRun(
        createDashPreviewRun({
          variant: DASH_DEMO_ORDER[1],
          seed: run.seed,
        }),
      );
      return;
    }

    setSecondRun(run);
    setStage('response');
  };

  const submitResponse = () => {
    if (!firstRun || !secondRun || !preference) return;
    setReport(
      buildDashDemoReport({
        firstRun,
        secondRun,
        preference,
        response,
      }),
    );
    setStage('report');
  };

  if (stage === 'consent') {
    return (
      <section className="tester-consent" aria-labelledby="tester-title">
        <div className="tester-progress">
          <span className="is-current">1 · Consent</span>
          <span>2 · Two runs</span>
          <span>3 · Response</span>
        </div>
        <div className="consent-panel">
          <div>
            <p className="reference-kicker">
              <EyeOff aria-hidden="true" /> Blind local demo
            </p>
            <h1 id="tester-title">A two-run movement test</h1>
            <p>
              Play two 45-second runs, then choose which felt more supportive of
              aggressive movement. Rule names stay hidden until you answer.
            </p>
          </div>
          <div className="consent-facts">
            <div>
              <strong>This demo uses</strong>
              <span>Anonymous action events and one written response</span>
            </div>
            <div>
              <strong>This demo does not use</strong>
              <span>An account, external storage, or a creator inbox</span>
            </div>
          </div>
          <label className="consent-check">
            <input
              type="checkbox"
              checked={consented}
              onChange={(event) => setConsented(event.target.checked)}
            />
            <span>
              I am 18 or older and understand that this is a local interface
              demonstration, not a live research study.
            </span>
          </label>
          <Button
            type="button"
            disabled={!consented}
            onClick={() => setStage('run')}
          >
            Begin two-run demo <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </section>
    );
  }

  if (stage === 'response') {
    return (
      <section className="tester-response" aria-labelledby="response-title">
        <div className="tester-progress">
          <span>1 · Consent</span>
          <span>2 · Two runs</span>
          <span className="is-current">3 · Response</span>
        </div>
        <div className="response-panel">
          <p className="reference-kicker">
            <Check aria-hidden="true" /> Both runs complete
          </p>
          <h1 id="response-title">
            Which run better supported forward pressure?
          </h1>
          <fieldset>
            <legend>Choose one response</legend>
            {[
              ['run-1', 'Run 1'],
              ['run-2', 'Run 2'],
              ['no-preference', 'No clear preference'],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="preference"
                  value={value}
                  checked={preference === value}
                  onChange={() => setPreference(value as DashDemoPreference)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="response-reason" htmlFor="tester-response">
            <span>What made it feel different? (optional)</span>
            <Textarea
              id="tester-response"
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              placeholder="Describe a moment, not a verdict about the design."
            />
          </label>
          <Button type="button" disabled={!preference} onClick={submitResponse}>
            Submit local demo response <ChevronRight aria-hidden="true" />
          </Button>
          <p className="local-only-note">
            This response stays in the current browser tab and disappears on
            reload.
          </p>
        </div>
      </section>
    );
  }

  if (stage === 'report' && report) {
    return (
      <section className="demo-report" aria-labelledby="report-title">
        <header>
          <div>
            <p className="reference-kicker">
              <FileWarning aria-hidden="true" /> Descriptive local report
            </p>
            <h1 id="report-title">Useful for QA. Not a design verdict.</h1>
          </div>
          <div className="report-scope">
            <strong>n = {report.sampleSize}</strong>
            <span>Local demo · invalid as external evidence</span>
          </div>
        </header>

        <div className="variant-reveal">
          <div>
            <span>Run 1 revealed</span>
            <strong>{report.mapping['run-1']}</strong>
          </div>
          <div>
            <span>Run 2 revealed</span>
            <strong>{report.mapping['run-2']}</strong>
          </div>
        </div>

        <div className="demo-report-grid">
          <div className="report-table-wrap">
            <table aria-label="Local run metrics">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Dash attempts</th>
                  <th>Crossings</th>
                  <th>Eliminations</th>
                  <th>Damage</th>
                </tr>
              </thead>
              <tbody>
                {report.runs.map((result) => (
                  <tr key={result.label}>
                    <th scope="row">{result.label}</th>
                    <td>{result.dashAttempts}</td>
                    <td>{result.projectileCrossings}</td>
                    <td>{result.eliminations}</td>
                    <td>{result.damageTaken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="response-summary">
            <span>Tester response</span>
            <strong>{report.preference.replaceAll('-', ' ')}</strong>
            <blockquote>
              {report.response || 'No written context was added.'}
            </blockquote>
          </div>
        </div>

        <aside className="report-limitations">
          <FileWarning aria-hidden="true" />
          <div>
            <strong>What this report cannot support</strong>
            <ul>
              {report.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="decision-recorder" aria-labelledby="decision-title">
          <div>
            <span>Creator decision · local demo</span>
            <h2 id="decision-title">
              Record the next action, not a false winner.
            </h2>
          </div>
          <label htmlFor="demo-decision">
            <span>Decision</span>
            <select
              id="demo-decision"
              value={decision}
              onChange={(event) => {
                setDecision(event.target.value as DashDemoDecision);
                setDecisionRecord(null);
              }}
            >
              <option value="inconclusive">Inconclusive</option>
              <option value="keep">Keep</option>
              <option value="revise">Revise</option>
              <option value="reject">Reject</option>
            </select>
          </label>
          <label htmlFor="decision-rationale">
            <span>Rationale / next step</span>
            <Textarea
              id="decision-rationale"
              value={rationale}
              onChange={(event) => {
                setRationale(event.target.value);
                setDecisionRecord(null);
              }}
              placeholder="Example: Run five real sessions after durable sharing exists."
            />
          </label>
          <Button
            type="button"
            onClick={() =>
              setDecisionRecord(recordDashDemoDecision(decision, rationale))
            }
          >
            <Save aria-hidden="true" />
            {decisionRecord ? 'Local decision saved' : 'Save local decision'}
          </Button>
          {decisionRecord ? (
            <p className="decision-confirmation">
              <ShieldCheck aria-hidden="true" /> Saved only in this tab as “
              {decisionRecord.decision}”. It will disappear on reload.
            </p>
          ) : null}
        </section>
      </section>
    );
  }

  const remainingSeconds = Math.max(
    0,
    Math.ceil((DASH_ARENA.runDurationMs - run.elapsedMs) / 1_000),
  );
  const progress = (run.elapsedMs / DASH_ARENA.runDurationMs) * 100;

  return (
    <section className="blind-run" aria-labelledby="blind-run-title">
      <div className="tester-progress">
        <span>1 · Consent</span>
        <span className="is-current">2 · Two runs</span>
        <span>3 · Response</span>
      </div>
      <header>
        <div>
          <p className="reference-kicker">
            <EyeOff aria-hidden="true" /> Variant identity hidden
          </p>
          <h1 id="blind-run-title">Run {runIndex + 1} of 2</h1>
          <p>
            Move toward the pressure zone. Dash through projectiles and strike
            the target when close.
          </p>
        </div>
        <div
          className="run-clock"
          aria-label={`${remainingSeconds} seconds remaining`}
        >
          <Timer aria-hidden="true" /> <strong>{remainingSeconds}s</strong>
        </div>
      </header>
      <progress
        className="arena-progress"
        aria-label="Blind run progress"
        max={100}
        value={progress}
      />

      <div className="dash-arena tester-arena" data-status={run.status}>
        <div className="arena-grid" aria-hidden="true" />
        <div className="arena-goal" aria-hidden="true">
          PRESSURE ZONE
        </div>
        {run.projectiles.map((projectile) => (
          <span
            className="arena-projectile"
            style={positionStyle(projectile.x, projectile.y)}
            key={projectile.id}
            aria-hidden="true"
          />
        ))}
        <div
          className={`arena-player ${run.dashProtectedUntilMs > run.elapsedMs ? 'is-protected' : ''}`}
          style={positionStyle(run.player.x, run.player.y)}
          aria-label={`Player with ${run.player.hp} health`}
        >
          <span>P</span>
        </div>
        {run.enemy.respawnAtMs === null ? (
          <div
            className="arena-enemy"
            style={positionStyle(run.enemy.x, run.enemy.y)}
            aria-label={`Target with ${run.enemy.hp} health`}
          >
            <span>{run.enemy.hp}</span>
          </div>
        ) : null}

        {run.status !== 'running' ? (
          <div className="arena-overlay">
            {run.status === 'idle' ? (
              <Play aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            <strong>
              {run.status === 'idle'
                ? `Run ${runIndex + 1} ready`
                : `Run ${runIndex + 1} complete`}
            </strong>
            <p>
              The recharge rule remains hidden. Use the same controls in both
              runs.
            </p>
            {run.status === 'idle' ? (
              <Button
                type="button"
                onClick={() => setRun(startDashPreviewRun(run))}
              >
                <Play aria-hidden="true" /> Start Run {runIndex + 1}
              </Button>
            ) : (
              <Button type="button" onClick={continueAfterRun}>
                {runIndex === 0 ? 'Continue to Run 2' : 'Answer one question'}
                <ChevronRight aria-hidden="true" />
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="microplay-controls tester-controls">
        <div className="movement-pad" aria-label="Movement controls">
          {MOVEMENT_CONTROLS.map(({ label, x, y, icon: Icon }) => (
            <button
              type="button"
              aria-label={label}
              key={label}
              onPointerDown={() => setTouchDirection(x, y)}
              onPointerUp={() => setTouchDirection(0, 0)}
              onPointerLeave={() => setTouchDirection(0, 0)}
              onPointerCancel={() => setTouchDirection(0, 0)}
            >
              <Icon aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="action-controls">
          <Button
            type="button"
            disabled={run.status !== 'running' || !run.dashReady}
            onClick={() => {
              queuedDash.current = true;
            }}
          >
            <Sparkles aria-hidden="true" />
            {run.dashReady ? 'Dash · Space' : 'Dash unavailable'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={run.status !== 'running'}
            onClick={() => {
              queuedAttack.current = true;
            }}
          >
            <Crosshair aria-hidden="true" /> Strike · J
          </Button>
        </div>
      </div>
      <p className="blind-boundary">
        <ShieldCheck aria-hidden="true" /> Demo actions stay in this tab and are
        not sent to the creator.
      </p>
    </section>
  );
}
