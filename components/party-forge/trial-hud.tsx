import type { TrialView } from './use-trial-controller.ts';
import { RULES } from '../../lib/party-forge/runtimes/kitchen-chaos-v1/retained/engine.js';
import styles from './trial.module.css';

export function TrialHud({ view }: { view: TrialView }) {
  const state = view.snapshot?.state;
  const carry = state?.player.carry;
  const stove = state?.stove;
  return (
    <div className={styles.hud}>
      <div>
        <span className={styles.label}>Kitchen Chaos · authored demo</span>
        <h2>Cook. Deliver. Stay alive.</h2>
      </div>
      <div className={styles.scores}>
        <span>
          <strong>{view.seconds}s</strong> remaining
        </span>
        <span>
          <strong>{state?.metrics.completedOrders ?? 0}</strong> orders
        </span>
        <span>
          <strong>{state?.metrics.failedOrders ?? 0}</strong> failed
        </span>
      </div>
      <p>
        Carry:{' '}
        <strong>
          {carry
            ? `${carry.portions} ${carry.kind === 'dish' ? 'cooked dish' : carry.kind === 'prepared' ? 'prepared portion' : 'raw ingredient'}`
            : 'empty hands'}
        </strong>{' '}
        · Stove:{' '}
        {stove?.readyAtTick
          ? state && state.tick >= stove.readyAtTick
            ? 'ready — collect it'
            : 'cooking'
          : 'empty'}
      </p>
      {carry?.kind === 'dish' &&
      state?.recipe.additions.includes('hot-potato') ? (
        <p>
          Hot potato: deliver within{' '}
          {Math.max(
            0,
            Math.ceil(
              (carry.acquiredAtTick + RULES.hotPotatoCarryTicks - state.tick) /
                60,
            ),
          )}
          s.
        </p>
      ) : null}
      <p className={styles.feedback} aria-live="polite">
        {view.feedback ||
          'Collect an ingredient → prepare → cook → collect → deliver. Press E near each station.'}
      </p>
    </div>
  );
}
