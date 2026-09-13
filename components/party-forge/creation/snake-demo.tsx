'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BOARD,
  newSnakeGame,
  stepSnakeGame,
  type Direction,
} from '@/lib/party-forge/generation/snake-demo';
import styles from './creation.module.css';

export function SnakeDemo() {
  const [game, setGame] = useState(newSnakeGame);
  const [paused, setPaused] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const turn = useRef<Direction | undefined>(undefined);
  const firing = useRef(false);
  const keys: Record<string, Direction> = {
    ArrowUp: 'up',
    w: 'up',
    ArrowDown: 'down',
    s: 'down',
    ArrowLeft: 'left',
    a: 'left',
    ArrowRight: 'right',
    d: 'right',
  };
  useEffect(() => {
    if (game.status !== 'playing' || paused) return;
    const timer = setInterval(() => {
      setGame((g) => stepSnakeGame(g, turn.current, firing.current));
      turn.current = undefined;
    }, 145);
    return () => clearInterval(timer);
  }, [game.status, paused]);
  useEffect(() => {
    const blur = () => {
      firing.current = false;
      setPaused(true);
    };
    window.addEventListener('blur', blur);
    const hidden = () => {
      if (document.hidden) blur();
    };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const cell = 20;
    ctx.fillStyle = '#101b25';
    ctx.fillRect(0, 0, 560, 560);
    ctx.strokeStyle = '#1c2a36';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= BOARD; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, 560);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(560, i * cell);
      ctx.stroke();
    }
    game.snake.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? '#ecff7a' : '#8aa63b';
      ctx.fillRect(p.x * cell + 2, p.y * cell + 2, 16, 16);
    });
    game.enemies.forEach((p) => {
      ctx.fillStyle = '#e8a2fc';
      ctx.fillRect(p.x * cell + 2, p.y * cell + 4, 16, 12);
      ctx.fillStyle = '#101b25';
      ctx.fillRect(p.x * cell + 5, p.y * cell + 7, 3, 3);
      ctx.fillRect(p.x * cell + 12, p.y * cell + 7, 3, 3);
    });
    ctx.fillStyle = '#fbc464';
    ctx.beginPath();
    ctx.arc(
      game.pickup.x * cell + 10,
      game.pickup.y * cell + 10,
      6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = '#f4ffb0';
    game.shots.forEach((p) => ctx.fillRect(p.x * cell + 8, p.y * cell, 4, 12));
    ctx.fillStyle = '#ff786f';
    game.bombs.forEach((p) =>
      ctx.fillRect(p.x * cell + 8, p.y * cell + 4, 5, 10),
    );
  }, [game]);
  function start() {
    setGame({ ...newSnakeGame(), status: 'playing' });
    turn.current = undefined;
    firing.current = false;
    setPaused(false);
    canvas.current?.focus();
  }
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/">FORGE /</Link>
        <Link href="/forge/create">Create a game ↗</Link>
      </nav>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>PLAYABLE REMIX / 001</p>
        <h1>
          Snake.
          <br />
          <span>Meet Space Invaders.</span>
        </h1>
        <p>
          Grow your trail. Clear the fleet. Try not to become your own worst
          enemy.
        </p>
      </div>
      <div className={styles.playLayout}>
        <section
          className={styles.gamePanel}
          aria-label="Snake Space Invaders game"
        >
          <div className={styles.scorebar}>
            <span>
              LOCAL SCORE <b>{game.score.toString().padStart(5, '0')}</b>
            </span>
            <span>
              FLEET <b>{game.enemies.length}/18</b>
            </span>
            <span>
              TRAIL <b>{game.snake.length}</b>
            </span>
          </div>
          <canvas
            ref={canvas}
            width={560}
            height={560}
            tabIndex={0}
            aria-label="Game board. Arrow keys or WASD turn. Hold Space to fire. Escape pauses."
            onKeyDown={(e) => {
              const direction = keys[e.key];
              if (direction || e.key === ' ' || e.key === 'Escape')
                e.preventDefault();
              if (direction && !turn.current) turn.current = direction;
              if (e.key === ' ') firing.current = true;
              if (e.key === 'Escape' && !e.repeat) setPaused((p) => !p);
            }}
            onKeyUp={(e) => {
              if (e.key === ' ') firing.current = false;
            }}
            onBlur={() => {
              firing.current = false;
              setPaused(true);
            }}
          />
          <div className={styles.gameFooter}>
            <output>
              {game.status === 'ready'
                ? 'Your first collision of ideas starts here.'
                : game.status === 'playing'
                  ? paused
                    ? 'Paused. Take a breath.'
                    : 'Clear the fleet before it reaches row 22.'
                  : game.reason}
            </output>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={start}>
                {game.status === 'ready' ? 'Play demo' : 'Restart'}
              </button>
              {game.status === 'playing' && (
                <button
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setPaused((p) => !p);
                    canvas.current?.focus();
                  }}
                >
                  {paused ? 'Resume' : 'Pause'}
                </button>
              )}
            </div>
          </div>
        </section>
        <aside className={styles.sidebar}>
          <span className={styles.badge}>AUTHORED DEMO · NO CODE NEEDED</span>
          <h2>
            Two familiar rules.
            <br />
            One strange game.
          </h2>
          <article>
            <span>01 / SNAKE</span>
            <h3>Your trail is your obstacle.</h3>
            <p>
              Collect amber energy to grow. Avoid the boundary and your own
              body.
            </p>
          </article>
          <article>
            <span>02 / SPACE INVADERS</span>
            <h3>The fleet is closing in.</h3>
            <p>
              Fire upward to clear 18 invaders. Dodge red shots and keep the
              fleet away.
            </p>
          </article>
          <div className={styles.controls}>
            <b>DESKTOP CONTROLS</b>
            <p>
              ↑ ↓ ← → / WASD — turn
              <br />
              Space — hold to fire
              <br />
              Esc — pause
            </p>
          </div>
          <p className={styles.muted}>
            This is a fixed, authored game. Playing and restarting do not call
            AI. Scores stay in this browser run.
          </p>
          <Link className={styles.textLink} href="/forge/create">
            Have a creator code? Make something new →
          </Link>
        </aside>
      </div>
    </main>
  );
}
