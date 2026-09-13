import type { TrialView } from './use-trial-controller.ts';
import type { PixelSnapshot } from '../../lib/party-forge/runtimes/pixel-arcade-v1/engine.ts';
import styles from './trial.module.css';
export function TrialHud({ view }: { view: TrialView }) {
  const state = (view.snapshot as PixelSnapshot | null)?.state;
  return <div className={styles.hud}>
    <div><span className={styles.label}>YOUR GAME / LIVE ROUND</span><h2>{state?.title ?? 'YOUR PIXEL GAME'}</h2></div>
    <div className={styles.scores}>
      <span><small>TIME</small><strong>{String(view.seconds).padStart(2, '0')}</strong></span>
      <span><small>SCORE</small><strong>{String(state?.points ?? 0).padStart(4, '0')}</strong></span>
      <span><small>HITS</small><strong>{String(state?.hits ?? 0).padStart(2, '0')}</strong></span>
    </div>
  </div>;
}
