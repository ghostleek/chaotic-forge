import { MODE_CONFIGS, MODE_LABELS, type GameSnapshot } from "../shared/game-contract";
import { FOCUS } from "../game/gameState";

type Level = "stable" | "unstable" | "collapsed";

function levelOf(snap: GameSnapshot): Level {
  if (snap.focus <= 0) return "collapsed";
  return snap.projectionStable ? "stable" : "unstable";
}

const WORD: Record<Level, string> = {
  stable: "Stable",
  unstable: "Unstable",
  collapsed: "Collapsed",
};

const NOTE: Record<Level, string> = {
  stable: "Projections hold.",
  unstable: "The span is flickering — get off it.",
  collapsed: "No projection will solidify. Stand on real ground to recover.",
};

/** What the current perspective is doing to the meter, right now. */
function rateFor(snap: GameSnapshot): string {
  const config = MODE_CONFIGS[snap.mode];
  if (config.focusDrainPerS > 0) return `−${config.focusDrainPerS}%/s`;
  if (config.freezesWorld) return "world time frozen";
  return `+${FOCUS.groundRechargePerS}%/s on real ground`;
}

export function FocusMeter({ snap }: { snap: GameSnapshot }) {
  const level = levelOf(snap);
  const pct = Math.max(0, Math.min(100, (snap.focus / snap.focusMax) * 100));

  return (
    <section className="panel panel--focus" aria-label="Focus">
      <header className="panel__head">
        <span className="panel__index">03</span>
        <h2>Focus</h2>
      </header>

      <div className="focus" data-level={level}>
        <div className="focus__row">
          <span className="focus__value mono">
            {Math.round(snap.focus)}
            <em>%</em>
          </span>
          {/* Word plus fill pattern: never colour alone. */}
          <span className="focus__state">{WORD[level]}</span>
        </div>

        <div
          className="focus__track"
          role="meter"
          aria-valuenow={Math.round(snap.focus)}
          aria-valuemin={0}
          aria-valuemax={snap.focusMax}
          aria-valuetext={`${Math.round(snap.focus)} percent, ${WORD[level]}`}
          aria-label="Focus remaining"
        >
          <div className="focus__fill" style={{ width: `${pct}%` }} />
          <span className="focus__threshold" style={{ left: `${FOCUS.unstableBelow}%` }} />
        </div>

        <p className="focus__rate mono">
          {MODE_LABELS[snap.mode].name} · {rateFor(snap)}
        </p>
        <p className="focus__note">{NOTE[level]}</p>
      </div>
    </section>
  );
}
