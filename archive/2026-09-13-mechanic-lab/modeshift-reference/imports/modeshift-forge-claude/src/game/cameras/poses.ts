import { Camera, Euler, Quaternion, Vector3 } from "three";
import type { GameMode } from "../../shared/game-contract";
import { PLAYER } from "../world/levelData";

/**
 * One perspective camera serves all three modes. The two "orthographic" views
 * are a long lens pulled far back (16-18 deg FOV at 55-62 units), which is
 * visually orthographic but lets us slerp/lerp a single camera into first
 * person instead of cross-fading two different projections.
 */
export const LENS = {
  side: { fov: 20, distance: 62, lead: 2.2, height: 1.4 },
  // Wide enough that the whole hazard field and its safe lane are in frame
  // from anywhere the player can stand on it.
  top: { fov: 26, distance: 58, lead: 2.0 },
  first: { fov: 76 },
} as const;

export type Pose = { pos: Vector3; quat: Quaternion; fov: number };

export function makePose(): Pose {
  return { pos: new Vector3(), quat: new Quaternion(), fov: 50 };
}

/** Must be a Camera: Object3D.lookAt aims +Z at the target, a camera aims -Z. */
const dummy = new Camera();
const euler = new Euler(0, 0, 0, "YXZ");
const TOP_UP = new Vector3(0, 0, -1);
const DEFAULT_UP = new Vector3(0, 1, 0);

export type FocusPoint = { x: number; y: number; z: number };

export function computeTargetPose(
  mode: GameMode,
  focus: FocusPoint,
  yaw: number,
  pitch: number,
  out: Pose,
): Pose {
  if (mode === "platformer") {
    const l = LENS.side;
    out.pos.set(focus.x + l.lead, focus.y + l.height + 1.2, focus.z + l.distance);
    dummy.up.copy(DEFAULT_UP);
    dummy.position.copy(out.pos);
    dummy.lookAt(focus.x + l.lead, focus.y + l.height, focus.z);
    out.quat.copy(dummy.quaternion);
    out.fov = l.fov;
    return out;
  }

  if (mode === "tactical") {
    const l = LENS.top;
    out.pos.set(focus.x + 0.4, focus.y + l.distance, focus.z - l.lead);
    dummy.up.copy(TOP_UP);
    dummy.position.copy(out.pos);
    dummy.lookAt(focus.x + 0.4, focus.y, focus.z - l.lead);
    out.quat.copy(dummy.quaternion);
    dummy.up.copy(DEFAULT_UP);
    out.fov = l.fov;
    return out;
  }

  out.pos.set(focus.x, focus.y + PLAYER.eye, focus.z);
  euler.set(pitch, yaw, 0, "YXZ");
  out.quat.setFromEuler(euler);
  out.fov = LENS.first.fov;
  return out;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
