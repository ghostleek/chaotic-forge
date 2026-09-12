'use client';

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Crosshair,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { Button } from '@/components/ui/button';
import {
  DASH_BASELINE,
  getDashRechargeOption,
  type DashRechargeOptionId,
} from '@/lib/mechanics/dash-experiment';
import {
  DASH_ARENA,
  advanceDashPreviewRun,
  createDashPreviewRun,
  startDashPreviewRun,
  type DashPreviewVariant,
  type DashRuntimeInput,
} from '@/lib/mechanics/dash-runtime';

const FRAME_MS = 50;

function positionStyle(x: number, y: number): CSSProperties {
  return {
    left: `${(x / DASH_ARENA.width) * 100}%`,
    top: `${(y / DASH_ARENA.height) * 100}%`,
  };
}

function keyAxis(keys: Set<string>): Pick<DashRuntimeInput, 'x' | 'y'> {
  const left = keys.has('arrowleft') || keys.has('a');
  const right = keys.has('arrowright') || keys.has('d');
  const up = keys.has('arrowup') || keys.has('w');
  const down = keys.has('arrowdown') || keys.has('s');

  return {
    x: left === right ? 0 : left ? -1 : 1,
    y: up === down ? 0 : up ? -1 : 1,
  };
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}

export function DashMicroplayPreview({
  goal,
  mutationId,
}: {
  goal: string;
  mutationId: DashRechargeOptionId;
}) {
  const [run, setRun] = useState(() =>
    createDashPreviewRun({ variant: 'control', mutationId }),
  );
  const heldKeys = useRef(new Set<string>());
  const touchAxis = useRef<Pick<DashRuntimeInput, 'x' | 'y'>>({ x: 0, y: 0 });
  const queuedDash = useRef(false);
  const queuedAttack = useRef(false);
  const mutation = useMemo(
    () => getDashRechargeOption(mutationId),
    [mutationId],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
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
      if (key === 'j') {
        queuedAttack.current = true;
      }
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
  }, []);

  useEffect(() => {
    if (run.status !== 'running') return;

    const interval = window.setInterval(() => {
      const keyboard = keyAxis(heldKeys.current);
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
  }, [run.status]);

  const selectVariant = (variant: DashPreviewVariant) => {
    heldKeys.current.clear();
    touchAxis.current = { x: 0, y: 0 };
    queuedDash.current = false;
    queuedAttack.current = false;
    setRun(createDashPreviewRun({ variant, mutationId, seed: run.seed }));
  };

  const resetRun = () => selectVariant(run.variant);
  const queueDash = () => {
    queuedDash.current = true;
  };
  const queueAttack = () => {
    queuedAttack.current = true;
  };
  const setTouchDirection = (x: -1 | 0 | 1, y: -1 | 0 | 1) => {
    touchAxis.current = { x, y };
  };
  const rechargeLabel =
    run.variant === 'control' ? DASH_BASELINE.label : mutation.label;
  const remainingSeconds = Math.max(
    0,
    Math.ceil((DASH_ARENA.runDurationMs - run.elapsedMs) / 1_000),
  );
  const progress = (run.elapsedMs / DASH_ARENA.runDurationMs) * 100;

  return (
    <>
      <header className="microplay-hero">
        <div>
          <p className="reference-kicker">
            <Sparkles aria-hidden="true" /> Creator preview
          </p>
          <h1>Feel the rule change before you share it.</h1>
          <p>{goal}</p>
        </div>
        <div className="preview-exclusion">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Preview only</strong>
            <span>Events are excluded from evidence.</span>
          </div>
        </div>
      </header>

      <section className="preview-sequence" aria-label="Preview sequence">
        <div>
          <span>Preview sequentially</span>
          <strong>Same arena · seed {run.seed} · one rule changed</strong>
        </div>
        <div className="variant-tabs">
          <Button
            type="button"
            variant={run.variant === 'control' ? 'default' : 'outline'}
            aria-pressed={run.variant === 'control'}
            onClick={() => selectVariant('control')}
          >
            1 · Control A
          </Button>
          <Button
            type="button"
            variant={run.variant === 'mutation' ? 'default' : 'outline'}
            aria-pressed={run.variant === 'mutation'}
            onClick={() => selectVariant('mutation')}
          >
            2 · Variant B
          </Button>
        </div>
      </section>

      <section className="microplay-stage" aria-labelledby="stage-title">
        <header>
          <div>
            <span>
              {run.variant === 'control' ? 'Control A' : 'Variant B'} · Dash
              recharge
            </span>
            <h2 id="stage-title">{rechargeLabel}</h2>
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
          aria-label="Preview run progress"
          max={100}
          value={progress}
        />

        <div className="dash-arena" data-status={run.status}>
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
              {run.status === 'complete' ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <Play aria-hidden="true" />
              )}
              <strong>
                {run.status === 'complete'
                  ? `${run.variant === 'control' ? 'Control A' : 'Variant B'} complete`
                  : `Start ${run.variant === 'control' ? 'Control A' : 'Variant B'}`}
              </strong>
              <p>
                Move into pressure, dash through projectiles, and strike within
                range.
              </p>
              {run.status === 'idle' ? (
                <Button
                  type="button"
                  onClick={() => setRun(startDashPreviewRun(run))}
                >
                  <Play aria-hidden="true" /> Start 45-second preview
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    selectVariant(
                      run.variant === 'control' ? 'mutation' : 'control',
                    )
                  }
                >
                  Preview{' '}
                  {run.variant === 'control' ? 'Variant B' : 'Control A'}
                </Button>
              )}
            </div>
          ) : null}
        </div>

        <div className="microplay-controls">
          <div className="movement-pad" aria-label="Movement controls">
            <button
              type="button"
              aria-label="Move up"
              onPointerDown={() => setTouchDirection(0, -1)}
              onPointerUp={() => setTouchDirection(0, 0)}
              onPointerLeave={() => setTouchDirection(0, 0)}
              onPointerCancel={() => setTouchDirection(0, 0)}
            >
              <ArrowUp aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Move left"
              onPointerDown={() => setTouchDirection(-1, 0)}
              onPointerUp={() => setTouchDirection(0, 0)}
              onPointerLeave={() => setTouchDirection(0, 0)}
              onPointerCancel={() => setTouchDirection(0, 0)}
            >
              <ArrowLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Move down"
              onPointerDown={() => setTouchDirection(0, 1)}
              onPointerUp={() => setTouchDirection(0, 0)}
              onPointerLeave={() => setTouchDirection(0, 0)}
              onPointerCancel={() => setTouchDirection(0, 0)}
            >
              <ArrowDown aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Move right"
              onPointerDown={() => setTouchDirection(1, 0)}
              onPointerUp={() => setTouchDirection(0, 0)}
              onPointerLeave={() => setTouchDirection(0, 0)}
              onPointerCancel={() => setTouchDirection(0, 0)}
            >
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
          <div className="action-controls">
            <Button
              type="button"
              disabled={run.status !== 'running' || !run.dashReady}
              onClick={queueDash}
            >
              <Sparkles aria-hidden="true" />
              {run.dashReady ? 'Dash · Space' : 'Dash recharging'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={run.status !== 'running'}
              onClick={queueAttack}
            >
              <Crosshair aria-hidden="true" /> Strike · J
            </Button>
            <Button type="button" variant="ghost" onClick={resetRun}>
              <RotateCcw aria-hidden="true" /> Reset same seed
            </Button>
          </div>
        </div>
        <p className="keyboard-hint">
          Keyboard: move with arrows or WASD · dash with Space · strike with J
        </p>
      </section>

      <section className="preview-readout" aria-label="Preview event readout">
        <div className="preview-metrics">
          <div>
            <span>Dash attempts</span>
            <strong>{run.metrics.dashAttempts}</strong>
          </div>
          <div>
            <span>Crossings</span>
            <strong>{run.metrics.projectileCrossings}</strong>
          </div>
          <div>
            <span>Eliminations</span>
            <strong>{run.metrics.eliminations}</strong>
          </div>
          <div>
            <span>Damage taken</span>
            <strong>{run.metrics.damageTaken}</strong>
          </div>
        </div>
        <div className="preview-events">
          <header>
            <div>
              <span>Local event trace</span>
              <strong>{run.events.length} preview events</strong>
            </div>
            <em>Not evidence</em>
          </header>
          {run.events.length === 0 ? (
            <p>Start a run to inspect deterministic event capture.</p>
          ) : (
            <ol>
              {run.events
                .slice(-5)
                .reverse()
                .map((event, index) => (
                  <li key={`${event.atMs}-${event.type}-${index}`}>
                    <span>{(event.atMs / 1_000).toFixed(1)}s</span>
                    <strong>{event.type.replaceAll('_', ' ')}</strong>
                  </li>
                ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
}
