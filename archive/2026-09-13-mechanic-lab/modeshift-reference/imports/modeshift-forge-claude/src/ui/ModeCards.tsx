import { MODE_LABELS, MODE_ORDER, type GameMode } from "../shared/game-contract";
import { setMode } from "../game/gameState";

const KEY_FOR: Record<GameMode, string> = {
  platformer: "1",
  firstPerson: "2",
  tactical: "3",
};

/** The verb each perspective grants, and what holding it costs. */
const VERBS: Record<GameMode, string> = {
  platformer: "Connect · depth collapses · −12%/s",
  firstPerson: "Interact · collects cores · no cost",
  tactical: "Plan · time frozen · reconfigure next",
};

export function ModeCards({ active, disabled }: { active: GameMode; disabled: boolean }) {
  return (
    <div className="mode-cards" role="group" aria-label="Game modes">
      {MODE_ORDER.map((mode) => {
        const label = MODE_LABELS[mode];
        const isActive = mode === active;
        return (
          <button
            key={mode}
            type="button"
            className={`mode-card ${isActive ? "is-active" : ""}`}
            style={{ ["--accent" as string]: label.accent }}
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => setMode(mode)}
          >
            <span className="mode-card__key" aria-hidden="true">
              {KEY_FOR[mode]}
            </span>
            <span className="mode-card__body">
              <span className="mode-card__name">
                {label.name}
                {isActive && <em className="mode-card__state">active</em>}
              </span>
              <span className="mode-card__reveals">{VERBS[mode]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
