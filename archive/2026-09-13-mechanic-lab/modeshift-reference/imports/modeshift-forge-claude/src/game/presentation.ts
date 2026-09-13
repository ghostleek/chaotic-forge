import { Color } from "three";
import type { GameMode } from "../shared/game-contract";

/**
 * Values the scene reads for presentation only. Never authoritative for
 * gameplay — the simulation does not branch on any of these. Initialised to the
 * opening mode (Inhabit) so the first frame does not flash another mode's look.
 */
export const presentation = {
  /** lerped accent for the current mode */
  accent: new Color("#49e2ff"),
  fogColor: new Color("#04090f"),
  fogDensity: 0.019,
  /** 0..1 how strongly the hazard layer is revealed */
  hazardReveal: 0,
  /** 0..1 how strongly the hidden passage marker is revealed */
  passageReveal: 1,
  /** 0..1 avatar mesh visibility (0 in first person, to avoid clipping) */
  avatarOpacity: 0,
  /**
   * 0..1 how far the fragments have been pulled from their real resting depths
   * into the aligned plane. 1 is a fully forged span.
   */
  projectionStrength: 0,
};

export const MODE_ACCENT: Record<GameMode, string> = {
  platformer: "#ffb648",
  firstPerson: "#49e2ff",
  tactical: "#ff5fd2",
};

/**
 * The wide lenses sit ~60 units back, so their fog has to be an order of
 * magnitude thinner than first person's or the whole chamber greys out.
 */
export const MODE_FOG: Record<GameMode, { color: string; density: number }> = {
  platformer: { color: "#070a14", density: 0.0038 },
  firstPerson: { color: "#04090f", density: 0.019 },
  tactical: { color: "#09071a", density: 0.0032 },
};

export const MODE_TARGETS: Record<
  GameMode,
  {
    hazardReveal: number;
    passageReveal: number;
    avatarOpacity: number;
    projectionStrength: number;
  }
> = {
  // Traverse is the only projection that solidifies, so it is the only one
  // allowed to look fully forged.
  platformer: { hazardReveal: 0.12, passageReveal: 0, avatarOpacity: 1, projectionStrength: 1 },
  firstPerson: { hazardReveal: 0.3, passageReveal: 1, avatarOpacity: 0, projectionStrength: 0 },
  // Command sees the alignment as a plan it could commit to, not as a floor.
  tactical: { hazardReveal: 1, passageReveal: 0.35, avatarOpacity: 1, projectionStrength: 0.35 },
};
