import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  Color,
  MathUtils,
  NoToneMapping,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";
import { computeTargetPose, easeInOutCubic, makePose } from "./cameras/poses";
import { endTransition, player, setPointerLocked, state } from "./gameState";
import { input, installInput } from "./controllers/input";
import { stepGame } from "./controllers/playerSystem";
import { MODE_ACCENT, MODE_FOG, MODE_TARGETS, presentation } from "./presentation";
import { getArtStyle, useArtStyle } from "./world/artStyles";

const damp = MathUtils.damp;

/**
 * The single ordered frame: read input -> step simulation -> place camera ->
 * update presentation. One useFrame, so the order can never drift.
 */
export function GameRuntime() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const setDpr = useThree((s) => s.setDpr);
  const artStyle = useArtStyle();
  const focus = useRef({ x: player.x, y: player.y, z: player.z });
  const target = useMemo(makePose, []);
  const from = useMemo(makePose, []);
  const fromValid = useRef(false);
  const lastTransitionStart = useRef(-1);
  const accentTarget = useMemo(() => new Color(), []);
  const fogTarget = useMemo(() => new Color(), []);
  const scratchQuat = useMemo(() => new Quaternion(), []);
  const scratchVec = useMemo(() => new Vector3(), []);

  useEffect(() => installInput(), []);

  // Pixel art is a real low-resolution render upscaled with nearest-neighbour,
  // not a post-process filter: geometry, lighting and edges all quantise.
  useEffect(() => {
    const el = gl.domElement;
    gl.toneMapping = artStyle.toneMapping === "none" ? NoToneMapping : ACESFilmicToneMapping;
    if (artStyle.renderScale) {
      setDpr(artStyle.renderScale);
      el.style.imageRendering = "pixelated";
    } else {
      setDpr(Math.min(window.devicePixelRatio || 1, 1.75));
      el.style.imageRendering = "auto";
    }
    return () => {
      el.style.imageRendering = "auto";
    };
  }, [artStyle, gl, setDpr]);

  // Dev-only inspection handle; stripped from the production bundle.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__forge = {
      camera,
      gl,
      scene,
      player,
      state,
      input,
      presentation,
      modeTargets: MODE_TARGETS,
    };
  }, [camera, gl, scene]);

  useEffect(() => {
    const el = gl.domElement;
    const onLockChange = () => setPointerLocked(document.pointerLockElement === el);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => document.removeEventListener("pointerlockchange", onLockChange);
  }, [gl]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const timeS = state.metrics.elapsedMs / 1000;

    const [lookDx, lookDy] = input.takePointerDelta();
    const looking =
      state.mode === "firstPerson" && (state.pointerLocked || input.isDragLooking());
    stepGame(dt, timeS, {
      axisX: input.axisX(),
      axisY: input.axisY(),
      jump: input.takeJump(),
      sprint: input.sprinting(),
      lookDx: looking ? lookDx : 0,
      lookDy: looking ? lookDy : 0,
    });

    // Damped focus point so the wide lenses do not jitter on every micro-step.
    const followRate = state.mode === "firstPerson" ? 40 : 7;
    focus.current.x = damp(focus.current.x, player.x, followRate, dt);
    focus.current.y = damp(focus.current.y, player.y, followRate * 0.7, dt);
    focus.current.z = damp(focus.current.z, player.z, followRate, dt);
    if (state.mode === "firstPerson") {
      focus.current.x = player.x;
      focus.current.y = player.y;
      focus.current.z = player.z;
    }

    computeTargetPose(state.mode, focus.current, player.yaw, player.pitch, target);

    const tr = state.transition;
    const cam = camera as PerspectiveCamera;

    if (tr.active) {
      if (lastTransitionStart.current !== tr.startedAt) {
        lastTransitionStart.current = tr.startedAt;
        from.pos.copy(cam.position);
        from.quat.copy(cam.quaternion);
        from.fov = cam.fov;
        fromValid.current = true;
      }
      const raw = (performance.now() - tr.startedAt) / tr.duration;
      const t = Math.min(1, Math.max(0, raw));
      const e = easeInOutCubic(t);
      if (fromValid.current) {
        cam.position.copy(scratchVec.copy(from.pos).lerp(target.pos, e));
        cam.quaternion.copy(scratchQuat.copy(from.quat).slerp(target.quat, e));
        cam.fov = MathUtils.lerp(from.fov, target.fov, e);
      } else {
        cam.position.copy(target.pos);
        cam.quaternion.copy(target.quat);
        cam.fov = target.fov;
      }
      cam.updateProjectionMatrix();
      if (t >= 1) endTransition();
    } else {
      cam.position.copy(target.pos);
      cam.quaternion.copy(target.quat);
      if (Math.abs(cam.fov - target.fov) > 0.001) {
        cam.fov = target.fov;
        cam.updateProjectionMatrix();
      }
    }

    // Presentation tweens (accent, fog, reveal layers, avatar fade).
    const rate = 6;
    accentTarget.set(MODE_ACCENT[state.mode]);
    presentation.accent.lerp(accentTarget, Math.min(1, dt * rate));
    // Mode sets how much depth cue the lens needs; art style sets the hue.
    const fog = MODE_FOG[state.mode];
    const style = getArtStyle();
    fogTarget.set(style.fogColor);
    presentation.fogColor.lerp(fogTarget, Math.min(1, dt * rate));
    presentation.fogDensity = damp(
      presentation.fogDensity,
      fog.density * style.fogScale,
      rate,
      dt,
    );
    const tgt = MODE_TARGETS[state.mode];
    presentation.hazardReveal = damp(presentation.hazardReveal, tgt.hazardReveal, rate, dt);
    presentation.passageReveal = damp(presentation.passageReveal, tgt.passageReveal, rate, dt);
    presentation.avatarOpacity = damp(
      presentation.avatarOpacity,
      tgt.avatarOpacity,
      rate * 1.6,
      dt,
    );
    // Slower than the other reveals on purpose: the fragments should still be
    // sliding into alignment as the camera lands, so the span looks forged
    // rather than switched on.
    presentation.projectionStrength = damp(
      presentation.projectionStrength,
      tgt.projectionStrength,
      5,
      dt,
    );
  });

  return null;
}
