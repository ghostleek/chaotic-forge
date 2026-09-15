'use client';

import Link from 'next/link';
import { drawDino, drawDinoSpike, drawPterodactyl } from '@/lib/party-forge/presentation/dino-view';
import { useEffect, useRef, useState } from 'react';
import {
  createDinoMarioGame,
  stepDinoMarioGame,
  dinoScore,
  dinoSpeed,
  dinoDistance,
  DINO_MARIO as C,
} from '@/lib/party-forge/demos/dino-mario-progressive';
import { DemoIntroduction, DemoProvenance } from './demo-introduction';
import { useDinoSprites } from './use-dino-sprites';
import styles from './dino-mario.module.css';

export function DinoMarioDemo() {
  const { sprites, failed: spritesFailed } = useDinoSprites();
  const [game, setGame] = useState(createDinoMarioGame);
  const [paused, setPaused] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const spikeLegend = useRef<HTMLCanvasElement>(null);
  const enemyLegend = useRef<HTMLCanvasElement>(null);
  const input = useRef({ held: false, pulse: false });
  const running = game.status === 'playing' && !paused;

  function pause() {
    input.current = { held: false, pulse: false };
    setPaused(true);
  }
  function leaveControl() {
    // Focus moves on taps and browser chrome interactions; it is not a pause command.
    input.current = { held: false, pulse: false };
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
    };
    const hidden = () => {
      if (document.hidden) { blur(); setPaused(true); }
    };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  useEffect(() => {
    if (canvas.current) drawDino(canvas.current, game, dinoDistance(game.tick), Infinity, sprites);
  }, [game, sprites]);

  useEffect(() => {
    const ctx = spikeLegend.current?.getContext('2d');
    if (ctx) { ctx.clearRect(0, 0, 28, 38); drawDinoSpike(ctx, 0, 0); }
  }, []);

  useEffect(() => {
    const ctx = enemyLegend.current?.getContext('2d');
    if (ctx && sprites) {
      ctx.clearRect(0, 0, 56, 56);
      drawPterodactyl(ctx, 12, 16, 'fly', 0, sprites);
    }
  }, [sprites]);

  const message =
    game.status === 'ready'
      ? spritesFailed ? 'Sprites could not load. Reload to try again.' : !sprites ? 'Loading sprites…' : 'Ready when you are. Start the course, then jump.'
      : game.status === 'won'
        ? 'Course complete! Same jump, two uses.'
        : game.status === 'lost'
          ? 'No lives left. Restart for another run.'
          : paused
            ? 'Paused. Resume when you are ready.'
            : (game.beamTicks ?? 0) > 0 ? `ATOMIC BEAM! ${(game.beamTicks! / 60).toFixed(1)}s · ${game.beamDestroyed} objects cleared.` : game.protection > 0 ? 'Ouch! One life lost. Keep running.' : game.growth === 2 ? 'Fully grown! Spiny giant, maximum size.' : game.big ? 'First growth! Eat again to become a spiny giant.' : 'Jump over spikes. Stomp pterodactyls. Eat meat to grow.';

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
              TIME <b>{Math.floor(game.tick / 60)} s</b>
            </span>
            <span>
              LOCAL STOMPS <b data-testid="stomps">{game.stomps}</b>
            </span>
            <span>LIVES <b data-testid="lives" aria-label={`${game.lives} lives`}>{'♥'.repeat(game.lives)}{'♡'.repeat(C.maxLives - game.lives)}</b></span>
            <span>SPEED <b data-testid="speed">{(dinoSpeed(game.tick) / C.speed).toFixed(2)}×</b></span>
            <span>SCORE <b data-testid="score">{dinoScore(game)}</b></span>
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
            data-big={game.big}
            data-growth={game.growth}
            data-beam-ticks={game.beamTicks}
            data-beam-destroyed={game.beamDestroyed}
            data-lives={game.lives}
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
              <button type="button" className={styles.primary} disabled={!sprites} onClick={start} onBlur={leaveControl}>
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
                  canvas.current?.focus();
                  input.current = { held: true, pulse: true };
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
                    canvas.current?.focus();
                    input.current.pulse = true;
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
            Run. Eat.
            <br />
            Grow. Compete.
          </h2>
          <div className={styles.rule}>
            <canvas ref={spikeLegend} className={styles.spikeSymbol} width={28} height={38} aria-label="Red spike trap" />
            <p>
              <b>Dino / Dodge the spikes</b>Keep running: speed increases continuously, with no cap, and spikes arrive more often. Time your jump to pass
              over the red spike traps.
            </p>
          </div>
          <div className={styles.rule}>
            <canvas ref={enemyLegend} width={56} height={56} aria-label="Pixel pterodactyl enemy" />
            <p>
              <b>Mario / Stomp &amp; bounce</b>Pterodactyls crawl or fly toward you. Land on their backs while falling.
              It disappears; you bounce over the next spike trap.
            </p>
          </div>
          <p className={styles.disclosure}>
            Start with three lives. Eat meat to grow twice: first bigger, then a spiny giant. Each meat adds one life, up to four; further meat keeps you at maximum size. A hit shrinks you one stage and costs one life. Brief protection prevents repeated damage.
          </p>
          <p className={styles.disclosure}>
            This prepared game does not call AI or generate a new game.
          </p>
          <p className={styles.disclosure}>At 1,000 points, automatically fire a two-second beam once per run. It destroys visible spikes, pterodactyls and meat ahead without awarding pickup or stomp points. Endless demo score: 10 points per second, 100 per stomp and 50 per meat. Survive as long as you can; the run ends when no lives remain.</p>
<p className={styles.disclosure}>For online competition, open a room and choose the Chrome Dino and Mario starters. Each player confirms a card before the shared round.</p>
          <DemoProvenance />
        </aside>
      </div>
      <footer className={styles.footer}>
        <span>ONE JUMP. A NEW WAY THROUGH.</span>
        <Link href="/">Compete with friends →</Link>
      </footer>
    </main>
  );
}
