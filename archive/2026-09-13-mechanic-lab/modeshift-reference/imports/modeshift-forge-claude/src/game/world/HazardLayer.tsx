import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  DoubleSide,
  EdgesGeometry,
  type Group,
  type LineBasicMaterial,
  type LineSegments,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import { HAZARD, SENTRY } from "./levelData";
import { UNIT_BOX, UNIT_PLANE, getChevronTexture, getHatchTexture } from "./materials";
import { presentation } from "../presentation";
import { sentryYaw } from "../controllers/playerSystem";
import { state } from "../gameState";
import { useArtStyle } from "./artStyles";

const SIZE: [number, number, number] = [
  HAZARD.max[0] - HAZARD.min[0],
  HAZARD.max[1] - HAZARD.min[1],
  HAZARD.max[2] - HAZARD.min[2],
];
const CENTER: [number, number, number] = [
  (HAZARD.min[0] + HAZARD.max[0]) / 2,
  (HAZARD.min[1] + HAZARD.max[1]) / 2,
  (HAZARD.min[2] + HAZARD.max[2]) / 2,
];

const CONE_RADIUS = SENTRY.range * Math.tan(SENTRY.halfAngle);

export function HazardLayer() {
  const style = useArtStyle();
  const volume = useRef<Mesh>(null);
  const outline = useRef<LineSegments>(null);
  const floor = useRef<Mesh>(null);
  const route = useRef<Mesh>(null);
  const cone = useRef<Group>(null);
  const coneMesh = useRef<Mesh>(null);
  const edges = useMemo(() => new EdgesGeometry(UNIT_BOX), []);

  const hatch = useMemo(() => {
    const t = getHatchTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(SIZE[0] / 2.4, SIZE[2] / 2.4);
    return t;
  }, []);

  const chevrons = useMemo(() => {
    const t = getChevronTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(5, 1);
    return t;
  }, []);

  useFrame(({ clock }) => {
    const r = presentation.hazardReveal;
    if (volume.current) {
      (volume.current.material as MeshBasicMaterial).opacity = 0.03 + 0.075 * r;
      volume.current.visible = r > 0.02;
    }
    if (outline.current) {
      const m = outline.current.material as LineBasicMaterial;
      m.opacity = 0.12 + 0.75 * r;
    }
    if (floor.current) {
      (floor.current.material as MeshBasicMaterial).opacity = 0.12 + 0.5 * r;
    }
    if (route.current) {
      const m = route.current.material as MeshBasicMaterial;
      m.opacity = 0.82 * r;
      route.current.visible = r > 0.05;
      chevrons.offset.x = -clock.elapsedTime * 0.12;
    }
    if (cone.current) {
      cone.current.rotation.y = sentryYaw(state.metrics.elapsedMs / 1000);
    }
    if (coneMesh.current) {
      (coneMesh.current.material as MeshBasicMaterial).opacity = 0.05 + 0.26 * r;
    }
  });

  return (
    <group>
      <mesh ref={volume} geometry={UNIT_BOX} position={CENTER} scale={SIZE}>
        <meshBasicMaterial color={style.hazard} transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <lineSegments ref={outline} geometry={edges} position={CENTER} scale={SIZE}>
        <lineBasicMaterial color={style.hazard} transparent opacity={0.5} />
      </lineSegments>

      {/* Hazard footprint hatching — texture pattern, not colour alone. */}
      <mesh
        ref={floor}
        geometry={UNIT_PLANE}
        position={[CENTER[0], 0.02, CENTER[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[SIZE[0], SIZE[2], 1]}
      >
        <meshBasicMaterial
          map={hatch}
          color={style.hazard}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Low-exposure lane, revealed in Command. */}
      <mesh
        ref={route}
        geometry={UNIT_PLANE}
        position={[31, 0.03, -6]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[10, 3.4, 1]}
      >
        <meshBasicMaterial
          map={chevrons}
          color={style.safeRoute}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>

      {/* Deterministic sweeping sentry. */}
      <group position={SENTRY.origin}>
        <mesh geometry={UNIT_BOX} scale={[0.5, 2.4, 0.5]} position={[0, -0.3, 0]}>
          <meshStandardMaterial
            color={style.structure.color}
            emissive={style.hazard}
            emissiveIntensity={0.5}
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
        <group ref={cone}>
          <mesh ref={coneMesh} position={[0, 0, -SENTRY.range / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[CONE_RADIUS, SENTRY.range, 24, 1, true]} />
            <meshBasicMaterial
              color={style.hazard}
              transparent
              opacity={0.16}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Cyan seam on the hidden face of the facade. Invisible from the side view. */
export function PassageMarker() {
  const style = useArtStyle();
  const plane = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const r = presentation.passageReveal;
    const pulse = 0.55 + Math.sin(clock.elapsedTime * 2.4) * 0.18;
    if (plane.current) {
      const m = plane.current.material as MeshBasicMaterial;
      m.opacity = r * pulse;
      plane.current.visible = r > 0.02;
    }
    if (glow.current) {
      const m = glow.current.material as MeshBasicMaterial;
      m.opacity = r * 0.28;
      glow.current.visible = r > 0.02;
    }
  });

  return (
    <group>
      <mesh
        ref={plane}
        geometry={UNIT_PLANE}
        position={[15, 3.4, -2.78]}
        rotation={[0, Math.PI, 0]}
        scale={[1.6, 7, 1]}
      >
        <meshBasicMaterial color={style.passage} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh
        ref={glow}
        geometry={UNIT_PLANE}
        position={[16.6, 0.04, -5]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[6, 5, 1]}
      >
        <meshBasicMaterial color={style.passage} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <pointLight
        position={[16.6, 2.2, -5]}
        color={style.passage}
        intensity={9}
        distance={11}
        decay={2}
      />
    </group>
  );
}
