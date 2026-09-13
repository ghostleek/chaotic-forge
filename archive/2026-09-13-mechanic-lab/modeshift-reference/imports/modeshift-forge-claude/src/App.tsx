import { useCallback, useEffect, useState } from "react";
import { GameViewport } from "./game/GameViewport";
import { resetRun, setMode } from "./game/gameState";
import { isTypingTarget } from "./game/controllers/input";
import { MODE_KEYS, MODE_LABELS } from "./shared/game-contract";
import { ART_STYLE_KEYS, setArtStyle, useArtStyle } from "./game/world/artStyles";
import { DesignIntent, INITIAL_PROPOSAL, type ProposalState } from "./ui/DesignIntent";
import { ModeCards } from "./ui/ModeCards";
import { ArtDirection } from "./ui/ArtDirection";
import { FocusMeter } from "./ui/FocusMeter";
import { ControlBar, Objective, StatusBanner } from "./ui/Hud";
import { ModeTitle } from "./ui/ModeTitle";
import { Results } from "./ui/Results";
import { useGameSnapshot } from "./ui/useGameSnapshot";

export default function App() {
  const snap = useGameSnapshot();
  const artStyle = useArtStyle();
  const [proposalState, setProposalState] = useState<ProposalState>(INITIAL_PROPOSAL);
  const [panelsHidden, setPanelsHidden] = useState(false);

  const onKey = useCallback((e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const mode = MODE_KEYS[e.code];
    if (mode) {
      setMode(mode);
      return;
    }
    const style = ART_STYLE_KEYS[e.code];
    if (style) {
      setArtStyle(style);
      return;
    }
    if (e.code === "KeyR") resetRun(true);
    if (e.code === "KeyH") setPanelsHidden((v) => !v);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const accent = MODE_LABELS[snap.mode].accent;

  return (
    <div
      className="app"
      style={{ ["--accent" as string]: accent }}
      data-mode={snap.mode}
      data-world-tone={artStyle.worldTone}
    >
      <GameViewport />

      <div className={`layer ${panelsHidden ? "is-hidden" : ""}`}>
        <header className="brand">
          <h1>
            Mechanic<span>Forge</span>
          </h1>
          <p className="brand__tagline">One World. Three Versions of Real.</p>
          <p className="brand__line">
            Each perspective is its own rule space. If two surfaces align in a projection they
            connect while it holds — and holding one costs Focus.
          </p>
        </header>

        <div className="rail rail--left">
          <DesignIntent proposalState={proposalState} setProposalState={setProposalState} />
        </div>

        <div className="rail rail--right">
          <FocusMeter snap={snap} />
          <Objective snap={snap} />
          <ArtDirection />
        </div>

        <footer className="dock">
          <ModeCards active={snap.mode} disabled={snap.status === "completed"} />
          <ControlBar snap={snap} />
        </footer>
      </div>

      <div className="layer layer--always">
        <ModeTitle mode={snap.mode} />
        <div className="banner-slot">
          <StatusBanner snap={snap} />
        </div>
        {snap.status === "completed" && <Results snap={snap} proposal={proposalState.proposal} />}
      </div>

      {panelsHidden && <div className="hidden-hint">Panels hidden — press H</div>}
    </div>
  );
}
