import { CORES, DISCOVERY_ZONES } from "../game/world/levelData";
import type { GameSnapshot } from "../shared/game-contract";
import { formatClock } from "./useGameSnapshot";

const CONTROLS: Record<string, string[]> = {
  platformer: ["A / D or ← →  move", "Space  jump", "Shift  run"],
  firstPerson: ["Click  capture mouse", "W A S D  move", "Space  jump", "Esc  release pointer"],
  tactical: ["World time frozen", "Planning view — no movement", "1 / 2  leave Command"],
};

const FIRST_PERSON_DRAG = ["Drag  look around", "W A S D  move", "Space  jump", "Shift  run"];

function controlsFor(snap: GameSnapshot): string[] {
  if (snap.mode === "firstPerson" && !snap.pointerLockAvailable) return FIRST_PERSON_DRAG;
  return CONTROLS[snap.mode] ?? [];
}

export function Objective({ snap }: { snap: GameSnapshot }) {
  const collected = snap.collectedCoreIds.length;
  const unlocked = collected === snap.totalCores;
  return (
    <section className="panel panel--hud" aria-label="Objective and run metrics">
      <header className="panel__head">
        <span className="panel__index">04</span>
        <h2>Objective</h2>
      </header>

      <div className="cores" aria-label={`${collected} of ${snap.totalCores} cores collected`}>
        {CORES.map((core) => {
          const has = snap.collectedCoreIds.includes(core.id);
          return (
            <span key={core.id} className={`core-pip ${has ? "is-on" : ""}`}>
              <span className="core-pip__mark" aria-hidden="true">
                {has ? "◆" : "◇"}
              </span>
              {core.label}
            </span>
          );
        })}
      </div>

      <p className={`gate ${unlocked ? "is-open" : ""}`}>
        Portal {unlocked ? "open" : "locked"} · {collected}/{snap.totalCores} cores
      </p>

      <header className="panel__head panel__head--sub">
        <span className="panel__index">05</span>
        <h2>Run</h2>
      </header>

      <div className="metrics">
        <Metric label="Time" value={formatClock(snap.metrics.elapsedMs)} wide />
        <Metric label="Falls" value={String(snap.metrics.falls)} />
        <Metric label="Switches" value={String(snap.metrics.modeSwitches)} />
        <Metric label="Path" value={`${snap.metrics.pathLength.toFixed(0)} m`} />
        <Metric label="Exposure" value={`${(snap.metrics.hazardExposureMs / 1000).toFixed(1)} s`} />
        <Metric label="Collapses" value={String(snap.metrics.projectionCollapses)} />
        <Metric
          label="Discoveries"
          value={`${snap.metrics.discoveries}/${DISCOVERY_ZONES.length}`}
        />
      </div>

      {snap.discoveryLog.length > 0 && (
        <ul className="discoveries">
          {snap.discoveryLog.map((id) => (
            <li key={id}>{DISCOVERY_ZONES.find((z) => z.id === id)?.label ?? id}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Metric({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`metric ${wide ? "metric--wide" : ""}`}>
      <span className="metric__label">{label}</span>
      <span className="metric__value mono">{value}</span>
    </div>
  );
}

export function ControlBar({ snap }: { snap: GameSnapshot }) {
  return (
    <div className="controls" aria-label="Controls">
      <ul>
        {controlsFor(snap).map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <ul className="controls__global">
        <li>1 2 3 modes</li>
        <li>4 5 6 art style</li>
        <li>R reset · H hide UI</li>
      </ul>
    </div>
  );
}

export function StatusBanner({ snap }: { snap: GameSnapshot }) {
  if (snap.status === "ready") {
    return (
      <div className="banner">
        <strong>Ready</strong> — look around, then walk to the edge of the gap
      </div>
    );
  }
  if (snap.status === "paused") {
    return (
      <div className="banner banner--paused">
        <strong>Paused</strong> — pointer released. Click the world to look again.
      </div>
    );
  }
  if (snap.metrics.projectionCollapses > 0 && snap.focus <= 0) {
    return (
      <div className="banner banner--paused">
        <strong>Projection collapsed</strong> — Focus ran out. Stand on real ground to recover.
      </div>
    );
  }
  if (snap.mode === "firstPerson" && !snap.pointerLocked) {
    return (
      <div className="banner">
        <strong>Inhabit</strong> —{" "}
        {snap.pointerLockAvailable
          ? "click the world to capture the mouse"
          : "pointer lock is blocked here; drag the world to look"}
      </div>
    );
  }
  return null;
}
