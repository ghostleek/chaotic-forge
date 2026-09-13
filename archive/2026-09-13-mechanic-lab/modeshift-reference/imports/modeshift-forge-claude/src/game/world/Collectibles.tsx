import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { CORES, PORTAL } from "./levelData";
import {
  CORE_GEO,
  CORE_HALO_GEO,
  PORTAL_DISC_GEO,
  PORTAL_RING_GEO,
  UNIT_BOX,
} from "./materials";
import { state } from "../gameState";
import { useArtStyle } from "./artStyles";

export function Cores() {
  const style = useArtStyle();
  const groups = useRef<Array<Group | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    CORES.forEach((core, i) => {
      const g = groups.current[i];
      if (!g) return;
      const taken = state.collected.has(core.id);
      const targetScale = taken ? 0 : 1;
      g.scale.setScalar(g.scale.x + (targetScale - g.scale.x) * 0.14);
      g.visible = g.scale.x > 0.02;
      if (!g.visible) return;
      g.rotation.y = t * 0.9 + i;
      g.rotation.x = Math.sin(t * 0.7 + i) * 0.25;
      g.position.y = core.p[1] + Math.sin(t * 1.6 + i * 1.3) * 0.12;
    });
  });

  return (
    <group>
      {CORES.map((core, i) => (
        <group
          key={core.id}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={core.p}
        >
          <mesh geometry={CORE_GEO}>
            <meshStandardMaterial
              color={style.core.color}
              emissive={style.core.emissive}
              emissiveIntensity={2.4}
              roughness={0.2}
              metalness={0.1}
            />
          </mesh>
          <mesh geometry={CORE_HALO_GEO} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color={style.core.halo} transparent opacity={0.55} />
          </mesh>
          <pointLight color={style.core.emissive} intensity={7} distance={6} decay={2} />
        </group>
      ))}
    </group>
  );
}

export function Portal() {
  const style = useArtStyle();
  const ring = useRef<Mesh>(null);
  const disc = useRef<Mesh>(null);
  const pips = useRef<Array<Mesh | null>>([]);
  const totals = useMemo(() => [0, 1, 2], []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const unlocked = state.collected.size === CORES.length;
    if (ring.current) {
      ring.current.rotation.z = t * 0.35;
      const m = ring.current.material as MeshStandardMaterial;
      m.emissiveIntensity = unlocked ? 2.6 + Math.sin(t * 3) * 0.6 : 0.5;
      m.color.set(unlocked ? style.portal.color : style.structure.color);
    }
    if (disc.current) {
      const m = disc.current.material as MeshBasicMaterial;
      m.opacity = unlocked ? 0.3 + Math.sin(t * 2.2) * 0.12 : 0.05;
      disc.current.scale.setScalar(unlocked ? 1 + Math.sin(t * 2.2) * 0.03 : 0.97);
    }
    totals.forEach((i) => {
      const p = pips.current[i];
      if (!p) return;
      const filled = state.collected.size > i;
      const m = p.material as MeshStandardMaterial;
      m.emissiveIntensity = filled ? 2.2 : 0.12;
      m.color.set(filled ? style.portal.color : style.structure.color);
      p.scale.setScalar(filled ? 1 : 0.62);
    });
  });

  return (
    <group position={PORTAL.p}>
      <mesh ref={ring} geometry={PORTAL_RING_GEO}>
        <meshStandardMaterial
          color={style.portal.color}
          emissive={style.portal.emissive}
          emissiveIntensity={2.4}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>
      <mesh ref={disc} geometry={PORTAL_DISC_GEO}>
        <meshBasicMaterial color={style.portal.disc} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <pointLight color={style.portal.emissive} intensity={16} distance={12} decay={2} />
      {/* Three pips: portal gating is legible without relying on colour alone. */}
      <group position={[0, 2.1, 0]}>
        {totals.map((i) => (
          <mesh
            key={i}
            geometry={UNIT_BOX}
            scale={[0.22, 0.22, 0.22]}
            position={[(i - 1) * 0.55, 0, 0]}
            ref={(el) => {
              pips.current[i] = el;
            }}
          >
            <meshStandardMaterial
              color={style.structure.color}
              emissive={style.portal.color}
              emissiveIntensity={0.1}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
