import { actualForMetric, metricLabel, type ModeProposal } from "../ai/proposals";
import { resetRun, setMode } from "../game/gameState";
import { DISCOVERY_ZONES } from "../game/world/levelData";
import { MODE_LABELS, MODE_ORDER, type GameSnapshot } from "../shared/game-contract";
import { formatClock } from "./useGameSnapshot";

export function Results({
  snap,
  proposal,
}: {
  snap: GameSnapshot;
  proposal: ModeProposal;
}) {
  const actual = actualForMetric(proposal.primaryMetric, snap.metrics, snap.focus);
  const held =
    proposal.expected.direction === "increase"
      ? actual.value >= proposal.expected.value
      : actual.value <= proposal.expected.value;

  const alternate = snap.mode === "tactical" ? "firstPerson" : "tactical";
  const totalModeMs = MODE_ORDER.reduce((sum, m) => sum + snap.metrics.modeTimeMs[m], 0) || 1;

  return (
    <div className="overlay">
      <div className="panel panel--results" role="dialog" aria-label="Run complete">
        <header className="panel__head">
          <span className="panel__index">07</span>
          <h2>Run complete</h2>
        </header>

        <div className="results-grid mono">
          <Row label="Completion time" value={formatClock(snap.metrics.elapsedMs)} />
          <Row label="Focus remaining" value={`${Math.round(snap.focus)}%`} />
          <Row label="Falls" value={String(snap.metrics.falls)} />
          <Row label="Projection collapses" value={String(snap.metrics.projectionCollapses)} />
          <Row label="Mode switches" value={String(snap.metrics.modeSwitches)} />
          <Row label="Path length" value={`${snap.metrics.pathLength.toFixed(0)} m`} />
          <Row
            label="Hazard exposure"
            value={`${(snap.metrics.hazardExposureMs / 1000).toFixed(1)} s`}
          />
          <Row
            label="Discoveries"
            value={`${snap.metrics.discoveries}/${DISCOVERY_ZONES.length}`}
          />
        </div>

        <header className="panel__head panel__head--sub">
          <span className="panel__index">08</span>
          <h2>Time per perspective</h2>
        </header>

        {/* Which rule space the run actually lived in — the read that says
            whether Focus is doing its job or one mode is dominating. */}
        <div className="perspectives">
          {MODE_ORDER.map((mode) => {
            const ms = snap.metrics.modeTimeMs[mode];
            const share = (ms / totalModeMs) * 100;
            return (
              <div key={mode} className="perspective">
                <span className="perspective__name">{MODE_LABELS[mode].name}</span>
                <span className="perspective__bar" aria-hidden="true">
                  <span
                    className="perspective__fill"
                    style={{
                      width: `${share.toFixed(1)}%`,
                      background: MODE_LABELS[mode].accent,
                    }}
                  />
                </span>
                <span className="perspective__value mono">
                  {(ms / 1000).toFixed(1)}s · {share.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>

        <header className="panel__head panel__head--sub">
          <span className="panel__index">09</span>
          <h2>Prediction vs actual</h2>
        </header>

        <p className="verdict">
          <span className={`verdict__mark ${held ? "is-held" : "is-missed"}`}>
            {held ? "HELD" : "MISSED"}
          </span>
          {metricLabel(proposal.primaryMetric)} — predicted{" "}
          {proposal.expected.direction === "increase" ? "≥" : "≤"} {proposal.expected.value}{" "}
          {proposal.expected.unit}, measured{" "}
          <strong>
            {actual.value.toFixed(actual.unit === "s" || actual.unit === "s exposed" ? 1 : 0)}{" "}
            {actual.unit}
          </strong>
          .
        </p>
        <p className="verdict-note">
          Measured from real play events only. {proposal.playtestQuestion}
        </p>

        <div className="row row--actions">
          <button type="button" className="btn btn--primary" onClick={() => resetRun(true)}>
            Replay
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              resetRun(true);
              setMode(alternate);
            }}
          >
            Replay in {MODE_LABELS[alternate].name}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="results-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
