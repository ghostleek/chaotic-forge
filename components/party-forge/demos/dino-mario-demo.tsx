'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FocusEvent } from 'react';
import {
  createDinoMarioGame,
  stepDinoMarioGame,
  encounterSize,
  DINO_MARIO as C,
  type DinoMarioState,
} from '@/lib/party-forge/demos/dino-mario';
import { DemoIntroduction, DemoProvenance } from './demo-introduction';
import styles from './dino-mario.module.css';

function draw(canvas: HTMLCanvasElement, game: DinoMarioState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#f7f4e9';
  ctx.fillRect(0, 0, C.width, C.height);
  ctx.strokeStyle = '#e2dfd2';
  ctx.lineWidth = 1;
  for (let x = 0; x < C.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.ground);
    ctx.stroke();
  }
  for (let y = 18; y < C.ground; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#384c3f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, C.ground);
  ctx.lineTo(C.width, C.ground);
  ctx.stroke();
  ctx.fillStyle = '#d5d2c3';
  for (let x = -((game.tick * C.speed) % 64); x < C.width; x += 64)
    ctx.fillRect(x, C.ground + 13, 18, 2);
  for (const e of game.encounters) {
    const size = encounterSize(e.kind),
      y = C.ground - size.height;
    if (e.x > C.width) continue;
    if (e.kind === 'block') {
      ctx.fillStyle = '#ba7841';
      ctx.fillRect(e.x, y, size.width, size.height);
      ctx.strokeStyle = '#f7f4e9';
      ctx.lineWidth = 1;
      ctx.strokeRect(e.x + 5, y + 5, size.width - 10, size.height - 10);
    } else {
      ctx.fillStyle = '#79648b';
      ctx.fillRect(e.x + 5, y, 20, 5);
      ctx.fillRect(e.x, y + 5, size.width, 17);
      ctx.fillRect(e.x + 3, y + 22, 8, 6);
      ctx.fillRect(e.x + 19, y + 22, 8, 6);
      ctx.fillStyle = '#f7f4e9';
      ctx.fillRect(e.x + 7, y + 9, 4, 4);
      ctx.fillRect(e.x + 19, y + 9, 4, 4);
    }
  }
  const x = C.playerX,
    y = game.feet - C.playerHeight;
  ctx.fillStyle = game.status === 'lost' ? '#a14c3b' : '#456850';
  ctx.fillRect(x + 8, y, 20, 18);
  ctx.fillRect(x + 2, y + 14, 19, 19);
  ctx.fillRect(x, y + 30, 8, 10);
  ctx.fillRect(x + 15, y + 30, 7, 10);
  ctx.fillStyle = '#f7f4e9';
  ctx.fillRect(x + 20, y + 5, 4, 4);
  const finishX = C.playerX + (C.finishTick - game.tick) * C.speed;
  if (finishX < C.width) {
    ctx.fillStyle = '#456850';
    ctx.fillRect(finishX, C.ground - 85, 3, 85);
    ctx.fillRect(finishX, C.ground - 85, 30, 18);
  }
}

export function DinoMarioDemo() {
  const [game, setGame] = useState(createDinoMarioGame);
  const [paused, setPaused] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef({ held: false, pulse: false });
  const running = game.status === 'playing' && !paused;

  function pause() {
    input.current = { held: false, pulse: false };
    setPaused(true);
  }
  function leaveControl(event: FocusEvent<HTMLElement>) {
    input.current.held = false;
    if (!event.currentTarget.closest('section')?.contains(event.relatedTarget)) pause();
  }
  function start() {
    input.current = { held: false, pulse: false };
    setGame({ ...createDinoMarioGame(), status: 'playing' });
    setPaused(false);
    canvas.current?.focus();
  }
  function togglePause() {
    input.current = { held: false, pulse: false };
    setPaused((p) => !p);
    canvas.current?.focus();
  }

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let elapsed = 0;
    const timer = window.setInterval(() => {
      const now = performance.now();
      // Browser timers round fractional delays. Accumulate time, keeping physics fixed.
      elapsed += Math.min(now - last, 100);
      last = now;
      while (elapsed + 1e-7 >= C.stepMs) {
        const down = input.current.held || input.current.pulse;
        input.current.pulse = false;
        setGame((s) => stepDinoMarioGame(s, down));
        elapsed -= C.stepMs;
      }
    }, C.stepMs);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    const blur = () => {
      input.current = { held: false, pulse: false };
      setPaused(true);
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  useEffect(() => {
    if (canvas.current) draw(canvas.current, game);
  }, [game]);

  const message =
    game.status === 'ready'
      ? 'Ready when you are. Start the course, then jump.'
      : game.status === 'won'
        ? 'Course complete! Same jump, two uses.'
        : game.status === 'lost'
          ? 'You hit an obstacle. Restart and try a different jump timing.'
          : paused
            ? 'Paused. Resume when you are ready.'
            : 'Jump over blocks. Land on walkers from above.';

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/">
          FORGE <span aria-hidden="true">/</span>
        </Link>
        <DemoIntroduction inGame onOpen={pause} />
      </nav>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>THE SMALLEST PLAYABLE REMIX / 001</p>
        <h1>
          Dino <span>×</span> Mario<span className={styles.period}>.</span>
        </h1>
        <p>
          One jump to get out of trouble.
          <br />
          One landing to turn it into momentum.
        </p>
      </header>
      <div className={styles.playLayout}>
        <section className={styles.gamePanel} aria-label="Dino Mario game">
          <div className={styles.scorebar}>
            <span>
              COURSE <b>{Math.min(30, Math.floor(game.tick / 60))} / 30 s</b>
            </span>
            <span>
              LOCAL STOMPS <b data-testid="stomps">{game.stomps}</b>
            </span>
            <span className={styles.version}>AUTHORED v1</span>
          </div>
          <canvas
            ref={canvas}
            className={styles.canvas}
            width={C.width}
            height={C.height}
            tabIndex={0}
            onBlur={leaveControl}
            data-tick={game.tick}
            data-feet={game.feet.toFixed(2)}
            data-status={game.status}
            aria-label="Dino Mario course. Space jumps. Escape pauses. A Jump button is available below."
            onKeyDown={(event) => {
              if (event.code === 'Space') {
                event.preventDefault();
                if (running && !event.repeat) {
                  input.current.held = true;
                  input.current.pulse = true;
                }
              }
              if (
                event.key === 'Escape' &&
                !event.repeat &&
                game.status === 'playing'
              ) {
                event.preventDefault();
                togglePause();
              }
            }}
            onKeyUp={(event) => {
              if (event.code === 'Space') {
                event.preventDefault();
                input.current.held = false;
              }
            }}
          />
          <div className={styles.gameFooter}>
            <output className={styles.status}>{message}</output>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={start} onBlur={leaveControl}>
                {game.status === 'ready' ? 'Start' : 'Restart'}
              </button>
              {game.status === 'playing' ? (
                <button
                  type="button"
                  className={styles.secondary}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={togglePause}
                  onBlur={leaveControl}
                >
                  {paused ? 'Resume' : 'Pause'}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.jump}
                disabled={!running}
                onBlur={leaveControl}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  input.current = { held: true, pulse: true };
                  canvas.current?.focus();
                }}
                onPointerUp={() => {
                  input.current.held = false;
                }}
                onPointerCancel={() => {
                  input.current.held = false;
                }}
                onLostPointerCapture={() => {
                  input.current.held = false;
                }}
                onClick={(e) => {
                  if (e.detail === 0) {
                    input.current.pulse = true;
                    canvas.current?.focus();
                  }
                }}
              >
                Jump <span aria-hidden="true">↑</span>
              </button>
            </div>
          </div>
        </section>
        <aside className={styles.sidebar}>
          <p className={styles.badge}>
            Simulated demo · fixed authored example
          </p>
          <h2>
            Two ideas.
            <br />
            One new rule.
          </h2>
          <div className={styles.rule}>
            <span className={styles.blockSymbol} aria-hidden="true" />
            <p>
              <b>Dino / Clear the blocks</b>Keep moving. Time your jump to pass
              over every block.
            </p>
          </div>
          <div className={styles.rule}>
            <span className={styles.walkerSymbol} aria-hidden="true" />
            <p>
              <b>Mario / Stomp &amp; bounce</b>Land on a walker while falling.
              It disappears; you bounce over the next block.
            </p>
          </div>
          <p className={styles.disclosure}>
            Space or Jump. Side contact loses. Reach the end to win. Results
            stay in this run; restarting uses the same course.
          </p>
          <p className={styles.disclosure}>
            This prepared game does not call AI or generate a new game.
          </p>
          <DemoProvenance />
        </aside>
      </div>
      <footer className={styles.footer}>
        <span>ONE JUMP. A NEW WAY THROUGH.</span>
        <Link href="/party">Explore the separate party experience →</Link>
      </footer>
    </main>
  );
}
