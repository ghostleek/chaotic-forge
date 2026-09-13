import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { GameRuntime } from "./GameRuntime";
import { Backdrop } from "./world/Backdrop";
import { WorldGeometry } from "./world/WorldGeometry";
import { Cores, Portal } from "./world/Collectibles";
import { HazardLayer, PassageMarker } from "./world/HazardLayer";
import { Projection } from "./world/Projection";
import { Avatar } from "./world/Avatar";
import { beginPlaying, capabilities, markPointerLockUnavailable, resume, state } from "./gameState";
import { input } from "./controllers/input";
import { loadSheets } from "./world/assets";
import { prewarmTiles } from "./world/tiledFaces";

/**
 * The WebGL surface. Everything product-facing stays in the DOM layer above it.
 */
export function GameViewport() {
  const canvasHost = useRef<HTMLDivElement>(null);

  // Composite the authored tile textures while the browser is idle. Doing it
  // lazily on the first style switch cost a visible hitch mid-demo.
  useEffect(() => {
    let cancelled = false;
    const idle =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 800));
    void loadSheets(["tiles", "characters", "backgrounds"]).then(() => {
      if (!cancelled) idle(() => prewarmTiles());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const stop = () => input.setDragLook(false);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      input.setDragLook(false);
    };
  }, []);

  const onPointerDown = useCallback(() => {
    beginPlaying();
    resume();
    if (state.mode !== "firstPerson") return;
    const canvas = canvasHost.current?.querySelector("canvas");
    if (!canvas) return;

    if (!capabilities.pointerLock) {
      input.setDragLook(true);
      return;
    }
    if (document.pointerLockElement === canvas) return;

    const fallback = () => {
      markPointerLockUnavailable();
      input.setDragLook(true);
    };
    try {
      // Chrome returns a promise here; older engines return undefined. A
      // rejection must never surface as an unhandled error in the console.
      const request = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (request && typeof request.catch === "function") request.catch(fallback);
    } catch {
      fallback();
    }
  }, []);

  return (
    <div className="viewport" ref={canvasHost} onPointerDown={onPointerDown}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 76, near: 0.08, far: 640, position: [-9, 1.6, 0] }}
      >
        <GameRuntime />
        <Backdrop />
        <WorldGeometry />
        <Projection />
        <PassageMarker />
        <HazardLayer />
        <Cores />
        <Portal />
        <Avatar />
      </Canvas>
    </div>
  );
}
