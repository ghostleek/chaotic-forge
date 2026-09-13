'use client';
import { useEffect, useRef, useState } from 'react';
import { KEY_BUTTONS } from '../../lib/party-forge/client/trial-input.ts';
import { renderKitchen } from '../../lib/party-forge/presentation/kitchen-view.ts';
import { TrialHud } from './trial-hud.tsx';
import type { useTrialController } from './use-trial-controller.ts';
import styles from './trial.module.css';

type Props = ReturnType<typeof useTrialController>;
export function GameViewport({ controller, view }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [aimMode, setAimMode] = useState(
    'Click the viewport to capture your mouse.',
  );
  useEffect(() => {
    const surface = canvas.current;
    if (!surface || !view.snapshot) return;
    const draw = () => {
      const width = Math.min(
        960,
        Math.max(320, Math.round(surface.getBoundingClientRect().width)),
      );
      const height = Math.round((width * 9) / 16);
      if (surface.width !== width || surface.height !== height) {
        surface.width = width;
        surface.height = height;
      }
      const context = surface.getContext('2d');
      if (context && view.snapshot)
        renderKitchen(context, view.snapshot, width, height);
    };
    draw();
    const resize = new ResizeObserver(draw);
    resize.observe(surface);
    return () => resize.disconnect();
  }, [view.snapshot]);
  useEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    const keys = new Set<string>();
    let mouseHeld = false;
    const focused = () =>
      document.activeElement === surface ||
      document.pointerLockElement === surface;
    const sync = () =>
      controller.buttons(
        [...keys].reduce(
          (buttons, key) => buttons | (KEY_BUTTONS[key] ?? 0),
          mouseHeld ? 16 : 0,
        ),
      );
    const clear = () => {
      keys.clear();
      mouseHeld = false;
      controller.clearInput();
    };
    const down = (event: KeyboardEvent) => {
      if (!focused() || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code in KEY_BUTTONS) {
        event.preventDefault();
        keys.add(event.code);
        sync();
      }
      if (['ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
        controller.look(event.code === 'ArrowLeft' ? -0.12 : 0.12, 0);
      }
    };
    const up = (event: KeyboardEvent) => {
      keys.delete(event.code);
      sync();
    };
    const move = (event: MouseEvent) => {
      if (
        document.pointerLockElement === surface ||
        (event.target === surface && event.buttons & 2)
      )
        controller.look(event.movementX * 0.0025, -event.movementY * 0.0025);
    };
    const mouseDown = (event: MouseEvent) => {
      if (event.target === surface && event.button === 0) {
        mouseHeld = true;
        sync();
      }
    };
    const mouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        mouseHeld = false;
        sync();
      }
    };
    const lock = () => {
      clear();
      setAimMode(
        document.pointerLockElement === surface
          ? 'Mouse captured · Esc releases it. The clock keeps running.'
          : 'Mouse released · right-drag to aim, or use ← / →.',
      );
    };
    const lockError = () =>
      setAimMode('Mouse capture unavailable. Right-drag to aim, or use ← / →.');
    document.addEventListener('pointerlockerror', lockError);
    const hidden = () => {
      if (document.hidden) clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', mouseDown);
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('blur', clear);
    document.addEventListener('pointerlockchange', lock);
    document.addEventListener('visibilitychange', hidden);
    surface.addEventListener('blur', clear);
    return () => {
      clear();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mouseup', mouseUp);
      window.removeEventListener('blur', clear);
      document.removeEventListener('pointerlockchange', lock);
      document.removeEventListener('pointerlockerror', lockError);
      document.removeEventListener('visibilitychange', hidden);
      surface.removeEventListener('blur', clear);
      if (document.pointerLockElement === surface) document.exitPointerLock();
    };
  }, [controller]);
  async function captureMouse() {
    const surface = canvas.current;
    if (!surface || document.pointerLockElement === surface) return;
    try {
      await surface.requestPointerLock();
    } catch {
      setAimMode('Mouse capture unavailable. Right-drag to aim, or use ← / →.');
    }
  }
  return (
    <section
      className={styles.game}
      aria-label="Kitchen Chaos first-person game"
    >
      <TrialHud view={view} />
      <div className={styles.viewport}>
        <canvas
          ref={canvas}
          width={960}
          height={540}
          tabIndex={0}
          aria-label="First-person kitchen viewport"
          aria-describedby="trial-controls"
          onClick={() => void captureMouse()}
          onContextMenu={(event) => event.preventDefault()}
        />
        {view.status === 'countdown' && view.countdown > 0 ? (
          <div className={styles.countdown}>{view.countdown}</div>
        ) : null}
        {['loading', 'incomplete', 'error'].includes(view.status) ? (
          <div className={styles.overlay}>{view.message}</div>
        ) : null}
      </div>
      <div id="trial-controls" className={styles.controls}>
        <p>
          <strong>WASD</strong> move · <strong>Mouse</strong> aim ·{' '}
          <strong>Click / Space</strong> repel · <strong>E</strong> interact
        </p>
        <p>{aimMode}</p>
        <p>
          One 60-second trial. Leaving focus clears input; time continues. Most
          delivered orders wins, then fewest failures. Scores shown here are
          local until the server checks your trace.
        </p>
      </div>
      <output aria-live="polite">{view.message}</output>
    </section>
  );
}
