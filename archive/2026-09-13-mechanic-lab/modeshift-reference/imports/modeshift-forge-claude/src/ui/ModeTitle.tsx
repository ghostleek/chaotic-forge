import { useEffect, useRef, useState } from "react";
import { MODE_LABELS } from "../shared/game-contract";
import type { GameMode } from "../shared/game-contract";

/** Short full-screen mode title on every switch. */
export function ModeTitle({ mode }: { mode: GameMode }) {
  const [shown, setShown] = useState<{ mode: GameMode; key: number } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setShown({ mode, key: 0 });
    } else {
      setShown({ mode, key: Date.now() });
    }
    const t = setTimeout(() => setShown(null), 1500);
    return () => clearTimeout(t);
  }, [mode]);

  if (!shown) return null;
  const label = MODE_LABELS[shown.mode];
  return (
    <div className="mode-title" key={shown.key} style={{ ["--accent" as string]: label.accent }}>
      <div className="mode-title__rule" />
      <div className="mode-title__name">{label.name}</div>
      <div className="mode-title__hint">{label.hint}</div>
    </div>
  );
}
