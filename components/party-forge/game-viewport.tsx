'use client';
import { useEffect, useRef } from 'react';
import { renderPixel } from '../../lib/party-forge/presentation/pixel-view.ts';
import type { PixelSnapshot } from '../../lib/party-forge/runtimes/pixel-arcade-v1/engine.ts';
import type { KitchenPartySnapshot } from '../../lib/party-forge/runtimes/kitchen-chaos-v1/adapter.ts';
import { KitchenViewport } from './kitchen-viewport.tsx';
import { TrialHud } from './trial-hud.tsx';
import type { useTrialController } from './use-trial-controller.ts';
import styles from './trial.module.css';
type Props = ReturnType<typeof useTrialController>;
const DIRECTIONS: Record<string, number> = { ArrowUp: 1, KeyW: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 4, KeyA: 4, ArrowRight: 8, KeyD: 8 };
function PixelViewport({ controller, view }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const region = useRef<HTMLElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx && view.snapshot?.state.kind === 'pixel') renderPixel(ctx, view.snapshot as PixelSnapshot);
  }, [view.snapshot]);
  useEffect(() => {
    if (view.status === 'countdown') canvas.current?.focus({ preventScroll: true });
  }, [view.status]);
  useEffect(() => {
    const keys = new Set<string>();
    const sync = () => controller.buttons([...keys].reduce((bits, k) => bits | DIRECTIONS[k], 0));
    const down = (e: KeyboardEvent) => {
      if (!region.current?.contains(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey || !DIRECTIONS[e.code]) return;
      e.preventDefault(); keys.add(e.code); sync();
    };
    const up = (e: KeyboardEvent) => { if (keys.delete(e.code)) sync(); };
    const clear = () => { keys.clear(); controller.clearInput(); };
    const hidden = () => { if (document.hidden) clear(); };
    const focus = () => { if (!region.current?.contains(document.activeElement)) clear(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', hidden); document.addEventListener('focusin', focus);
    return () => { clear(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', hidden); document.removeEventListener('focusin', focus); };
  }, [controller]);
  const pixelState=view.snapshot?.state;
  const hasLives=typeof pixelState?.lives === 'number';
  const gameOver=pixelState?.gameOver === true;
  return <section className={styles.game} ref={region} aria-label="Generated pixel game">
    <TrialHud view={view} />
    <div className={styles.viewport}>
      <canvas ref={canvas} width={256} height={192} tabIndex={0} aria-label="Pixel arena. Arrow keys to steer." aria-describedby="trial-controls" onPointerDown={() => canvas.current?.focus({ preventScroll: true })} />
      {view.status === 'countdown' && view.countdown > 0 ? <div className={styles.countdown}>{view.countdown}</div> : null}
      {gameOver ? <div className={styles.overlay}>GAME OVER · 0 LIVES<br/>Waiting for the round to finish</div> : null}
      {view.status === 'ready' ? <div className={styles.overlay}>READY, PLAYER?</div> : null}
      {['loading', 'incomplete', 'error'].includes(view.status) ? <div className={styles.overlay}>{view.message}</div> : null}
    </div>
    <div className={styles.controlRow}>
      <div id="trial-controls" className={styles.controls}>
        <p><strong>ARROWS / WASD</strong> to steer. Shooting and movement follow your generated rules.</p>
        <p>{hasLives ? '3 lives. Lose one per hit. Your run stops at zero lives or 60 seconds.' : '60 seconds.'} Most points wins; fewer hits breaks a tie.</p>
        <p className={styles.feedback}>{view.feedback || 'EAT. GROW. ZAP. REPEAT.'}</p>
      </div>
      <div className={styles.dpad} aria-label="Touch direction pad">
        {([['↑', 1, 'Up'], ['←', 4, 'Left'], ['↓', 2, 'Down'], ['→', 8, 'Right']] as const).map(([glyph, bit, label]) => <button key={label} type="button" disabled={gameOver} aria-label={`Steer ${label.toLowerCase()}`} data-dir={label} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); controller.buttons(bit); }} onPointerUp={() => controller.clearInput()} onPointerCancel={() => controller.clearInput()} onLostPointerCapture={() => controller.clearInput()} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); controller.buttons(bit); } }} onKeyUp={() => controller.clearInput()}>{glyph}</button>)}
      </div>
    </div>
    <output aria-live="polite">{view.message}</output>
  </section>;
}
export function GameViewport(props: Props) {
  return props.view.snapshot && props.view.snapshot.state.kind !== 'pixel'
    ? <KitchenViewport controller={props.controller} view={{ ...props.view, snapshot: props.view.snapshot as KitchenPartySnapshot }} />
    : <PixelViewport {...props} />;
}
