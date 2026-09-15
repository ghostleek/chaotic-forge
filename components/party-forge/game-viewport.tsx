'use client';
import { useEffect, useRef } from 'react';
import { drawDino } from '../../lib/party-forge/presentation/dino-view.ts';
import type { DinoMarioState } from '../../lib/party-forge/demos/dino-mario.ts';
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
  const dino = view.snapshot?.state.kind === 'dino';
  const canvas = useRef<HTMLCanvasElement>(null);
  const region = useRef<HTMLElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (canvas.current && dino) drawDino(canvas.current, view.snapshot!.state as unknown as DinoMarioState);
    if (ctx && view.snapshot?.state.kind === 'pixel') renderPixel(ctx, view.snapshot as PixelSnapshot);
  }, [view.snapshot, dino]);
  useEffect(() => {
    if (view.status === 'countdown') canvas.current?.focus({ preventScroll: true });
  }, [view.status]);
  useEffect(() => {
    const directions = dino ? {ArrowUp:1, KeyW:1, Space:16} as Record<string, number> : DIRECTIONS;
    const keys = new Set<string>();
    const sync = () => controller.buttons([...keys].reduce((bits, k) => bits | directions[k], 0));
    const down = (e: KeyboardEvent) => {
      if (!region.current?.contains(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey || !directions[e.code]) return;
      e.preventDefault(); keys.add(e.code); sync();
    };
    const up = (e: KeyboardEvent) => { if (keys.delete(e.code)) sync(); };
    const clear = () => { keys.clear(); controller.clearInput(); };
    const hidden = () => { if (document.hidden) clear(); };
    const focus = () => { if (!region.current?.contains(document.activeElement)) clear(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', hidden); document.addEventListener('focusin', focus);
    return () => { clear(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', hidden); document.removeEventListener('focusin', focus); };
  }, [controller, dino]);
  const pixelState=view.snapshot?.state;
  const hasLives=typeof pixelState?.lives === 'number';
  const gameOver=pixelState?.gameOver === true;
  return <section className={styles.game} ref={region} aria-label={dino ? "Competitive Dino Mario game" : "Generated pixel game"}>
    <TrialHud view={view} />
    <div className={styles.viewport}>
      <canvas ref={canvas} data-runner={dino || undefined} width={dino ? 720 : 256} height={dino ? 320 : 192} tabIndex={0} aria-label={dino ? "Dino arena. Space or Up to jump." : "Pixel arena. Arrow keys to steer."} aria-describedby="trial-controls" onPointerDown={() => canvas.current?.focus({ preventScroll: true })} />
      {view.status === 'countdown' && view.countdown > 0 ? <div className={styles.countdown}>{view.countdown}</div> : null}
      {gameOver ? <div className={styles.overlay}>{dino && pixelState?.status === 'won' ? 'COURSE COMPLETE' : 'GAME OVER · 0 LIVES'}<br/>Waiting for other players</div> : null}
      {view.status === 'ready' ? <div className={styles.overlay}>READY, PLAYER?</div> : null}
      {['loading', 'incomplete', 'error'].includes(view.status) ? <div className={styles.overlay}>{view.message}</div> : null}
    </div>
    <div className={styles.controlRow}>
      <div id="trial-controls" className={styles.controls}>
        <p>{dino ? <><strong>SPACE / UP / JUMP</strong> to leap. Dodge spikes, stomp walkers and eat meat to grow.</> : <><strong>ARROWS / WASD</strong> to steer. Shooting and movement follow your generated rules.</>}</p>
        <p>{dino ? '3 starting lives; meat adds a life, up to 4. Finish the 30-second course or stop at zero lives.' : hasLives ? '3 lives. Lose one per hit. Your run stops at zero lives or 60 seconds.' : '60 seconds.'} Results appear when everyone finishes. Most points wins; fewer hits breaks a tie.</p>
        <p className={styles.feedback}>{view.feedback || 'EAT. GROW. ZAP. REPEAT.'}</p>
      </div>
      <div className={styles.dpad} aria-label="Touch direction pad">
        {(dino ? [['Jump', 16, 'Jump']] as const : [['↑', 1, 'Up'], ['←', 4, 'Left'], ['↓', 2, 'Down'], ['→', 8, 'Right']] as const).map(([glyph, bit, label]) => <button key={label} type="button" disabled={gameOver} aria-label={dino ? "Jump" : `Steer ${label.toLowerCase()}`} data-dir={label} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); controller.buttons(bit); }} onPointerUp={() => controller.clearInput()} onPointerCancel={() => controller.clearInput()} onLostPointerCapture={() => controller.clearInput()} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); controller.buttons(bit); } }} onKeyUp={() => controller.clearInput()}>{glyph}</button>)}
      </div>
    </div>
    <output aria-live="polite">{view.message}</output>
  </section>;
}
export function GameViewport(props: Props) {
  return props.view.snapshot && !['pixel', 'dino'].includes(String(props.view.snapshot.state.kind))
    ? <KitchenViewport controller={props.controller} view={{ ...props.view, snapshot: props.view.snapshot as KitchenPartySnapshot }} />
    : <PixelViewport {...props} />;
}
