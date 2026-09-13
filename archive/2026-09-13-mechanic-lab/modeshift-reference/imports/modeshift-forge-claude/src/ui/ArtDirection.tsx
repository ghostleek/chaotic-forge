import { ART_STYLES, ART_STYLE_ORDER, setArtStyle, useArtStyle } from "../game/world/artStyles";

/**
 * Art direction is the second lever in the laboratory: same world, same
 * simulation, a different visual hypothesis about how it should read.
 */
export function ArtDirection() {
  const active = useArtStyle();

  return (
    <section className="panel panel--art" aria-label="Art direction">
      <header className="panel__head">
        <span className="panel__index">06</span>
        <h2>Art direction</h2>
      </header>

      <div className="art-cards" role="group">
        {ART_STYLE_ORDER.map((id) => {
          const style = ART_STYLES[id];
          const isActive = id === active.id;
          return (
            <button
              key={id}
              type="button"
              className={`art-card ${isActive ? "is-active" : ""}`}
              aria-pressed={isActive}
              onClick={() => setArtStyle(id)}
            >
              <span className="art-card__swatch" aria-hidden="true">
                {style.swatch.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </span>
              <span className="art-card__body">
                <span className="art-card__name">
                  {style.name}
                  {isActive && <em>active</em>}
                </span>
                <span className="art-card__tagline">{style.tagline}</span>
                <span className="art-card__technique mono">{style.technique}</span>
              </span>
              <span className="art-card__key" aria-hidden="true">
                {style.key}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
