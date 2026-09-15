'use client';
import { useEffect, useRef, useState, type FocusEvent } from 'react';
import Link from 'next/link';
import { ForgeHeader } from '../forge-header';
import type { BuildManifest } from '@/lib/party-forge/contracts';
import { createPixelRuntime } from '@/lib/party-forge/runtimes/pixel-arcade-v2/retained/engine.js';
import { renderPixel } from '@/lib/party-forge/presentation/pixel-view';
import { SAVED_SNAKE_SEED } from '@/lib/party-forge/demos/saved-snake-seed';
import styles from './creation.module.css';
const KEYS: Record<string, number> = {
  ArrowUp: 1,
  KeyW: 1,
  ArrowDown: 2,
  KeyS: 2,
  ArrowLeft: 4,
  KeyA: 4,
  ArrowRight: 8,
  KeyD: 8,
};

export function SnakeDemo({ build }: { build: BuildManifest }) {
  const runtime = useRef<ReturnType<typeof createPixelRuntime> | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const buttons = useRef(0);
  const [snapshot, setSnapshot] = useState(() =>
    createPixelRuntime(build, SAVED_SNAKE_SEED).snapshot(),
  );
  const [status, setStatus] = useState<'ready' | 'playing' | 'finished'>(
    'ready',
  );
  const [paused, setPaused] = useState(false);
  const running = status === 'playing' && !paused;
  function pause() {
    buttons.current = 0;
    setPaused(true);
  }
  function leaveControl(e: FocusEvent<HTMLElement>) {
    buttons.current = 0;
    if (!e.currentTarget.closest('section')?.contains(e.relatedTarget)) pause();
  }
  function start() {
    runtime.current = createPixelRuntime(build, SAVED_SNAKE_SEED);
    setSnapshot(runtime.current.snapshot());
    buttons.current = 0;
    setStatus('playing');
    setPaused(false);
    canvas.current?.focus();
  }
  function togglePause() {
    buttons.current = 0;
    setPaused((p) => !p);
    canvas.current?.focus();
  }
  useEffect(() => {
    if (!running) return;
    let last = performance.now(),
      elapsed = 0;
    const timer = window.setInterval(() => {
      const now = performance.now();
      elapsed += Math.min(now - last, 100);
      last = now;
      const game = runtime.current;
      if (!game) return;
      let next = game.snapshot();
      while (elapsed >= 1000 / 60 && !next.completed && !next.state.gameOver) {
        game.input({
          tick: next.tick,
          buttons: buttons.current,
          yaw: 0,
          pitch: 0,
        });
        next = game.step();
        elapsed -= 1000 / 60;
      }
      setSnapshot(next);
      if (next.completed || next.state.gameOver) {
        buttons.current = 0;
        setStatus('finished');
      }
    }, 1000 / 60);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx) renderPixel(ctx, snapshot);
  }, [snapshot]);
  const message =
    status === 'ready'
      ? 'The saved remix is ready to play.'
      : status === 'finished'
        ? snapshot.state.gameOver
          ? 'Game over. No lives left.'
          : '60 seconds complete.'
        : paused
          ? 'Paused. Resume when ready.'
          : 'Eat 10. Blast 25. Auto-fire follows your direction.';
  return (
    <main className={styles.page}>
      <ForgeHeader><Link href="/">Play with friends</Link></ForgeHeader>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>SAVED REMIX</p>
        <h1>{build.pixelRules!.title}</h1>
        <p>{build.objective}</p>
      </div>
      <div className={styles.playLayout}>
        <section
          className={styles.gamePanel}
          aria-label="Saved Snake Space Invaders game"
        >
          <div className={styles.scorebar}>
            <span>
              SCORE <b>{snapshot.points}</b>
            </span>
            <span>
              LIVES <b data-testid="snake-lives">{snapshot.state.lives}</b>
            </span>
            <span>
              TIME <b>{Math.floor(snapshot.tick / 60)} / 60 s</b>
            </span>
          </div>
          <canvas
            ref={canvas}
            onBlur={leaveControl}
            width={256}
            height={192}
            tabIndex={0}
            data-tick={snapshot.tick}
            data-runtime={build.runtime.version}
            data-shots={snapshot.state.metrics.shots}
            aria-label="Saved pixel arena. Arrows or WASD steer. Auto-fire follows your direction. Escape pauses."
            onKeyDown={(e) => {
              if (KEYS[e.code]) {
                e.preventDefault();
                if (running) buttons.current = KEYS[e.code];
              }
              if (e.key === 'Escape' && !e.repeat && status === 'playing') {
                e.preventDefault();
                togglePause();
              }
            }}
            onKeyUp={(e) => {
              if (KEYS[e.code] === buttons.current) buttons.current = 0;
            }}
          />
          <div className={styles.gameFooter}>
            <output>{message}</output>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                onBlur={leaveControl}
                onClick={start}
              >
                {status === 'ready' ? 'Play demo' : 'Restart'}
              </button>
              {status === 'playing' ? (
                <button onBlur={leaveControl} onClick={togglePause}>
                  {paused ? 'Resume' : 'Pause'}
                </button>
              ) : null}
            </div>
          </div>
          <div className={styles.actions} aria-label="Touch direction pad">
            {(
              [
                ['↑', 1, 'up'],
                ['←', 4, 'left'],
                ['↓', 2, 'down'],
                ['→', 8, 'right'],
              ] as const
            ).map(([glyph, bit, label]) => (
              <button
                key={label}
                aria-label={`Steer ${label}`}
                disabled={!running}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  buttons.current = bit;
                }}
                onPointerUp={() => {
                  buttons.current = 0;
                }}
                onPointerCancel={() => {
                  buttons.current = 0;
                }}
                onLostPointerCapture={() => {
                  buttons.current = 0;
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    buttons.current = bit;
                  }
                }}
                onKeyUp={() => {
                  buttons.current = 0;
                }}
                onBlur={leaveControl}
              >
                {glyph}
              </button>
            ))}
          </div>
        </section>
        <aside className={styles.sidebar}>
          <span className={styles.badge}>SAVED REMIX · NO API USAGE</span>
          <h2>Eat 10. Blast 25.</h2>
          <article>
            <h3>Snake</h3>
            <p>{build.pixelRules!.interpretations[0].interpretation}</p>
          </article>
          <article>
            <h3>Space Invaders</h3>
            <p>{build.pixelRules!.interpretations[1].interpretation}</p>
          </article>
          <div className={styles.controls}>
            <b>ARROWS / WASD / TOUCH BUTTONS</b>
            <p>
              Steer the snake. Firing is automatic in your travel direction.
              Three lives; one lost per collision. Stop at zero lives or 60
              seconds.
            </p>
          </div>
          <p className={styles.muted}>
            Reuses the existing saved rules and the party demo’s retained
            three-life engine. No sign-in, key or new model call. Restart
            repeats the same seed; scores stay in this run.
          </p>
          <details>
            <summary>Source, interpretation &amp; decision</summary>
            <p>
              Source: the retained Snake + Space Invaders recipe from OpenAI
              Responses, GPT-6 Astra.
            </p>
            <p>
              Forge interpretation: generated rule configuration executed by the
              retained pixel engine, not newly generated game code.
            </p>
            <p>
              User decision: restore this saved remix as the public demo. The
              two source cards are presented here without creating players or a
              room.
            </p>
            {build.origin.kind === 'generated' && build.origin.reuse ? (
              <p>Saved source build: {build.origin.reuse.sourceBuildId}</p>
            ) : null}
          </details>
        </aside>
      </div>
    </main>
  );
}
