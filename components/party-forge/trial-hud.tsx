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
      <span><small>{typeof view.snapshot?.state.lives === 'number' ? 'LIVES' : 'HITS'}</small><strong>{typeof view.snapshot?.state.lives === 'number' ? `${view.snapshot.state.lives}/${typeof view.snapshot.state.maxLives === 'number' ? view.snapshot.state.maxLives : 3}` : String(state?.hits ?? 0).padStart(2, '0')}</strong></span>
    </div>
  </div>;
}
