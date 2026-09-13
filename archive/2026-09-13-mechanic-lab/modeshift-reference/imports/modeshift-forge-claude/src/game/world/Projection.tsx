import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  EdgesGeometry,
  LineBasicMaterial,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PointLight,
} from "three";
import { FRAGMENTS, SPAN } from "./levelData";
import { UNIT_BOX, UNIT_PLANE, getChevronTexture } from "./materials";
import { presentation } from "../presentation";
import { FOCUS, focus } from "../gameState";
import { useArtStyle } from "./artStyles";

/**
 * The fragments over the impossible gap, and the span they become.
 *
 * These slabs are real geometry at real depths — Traverse does not conjure
 * them, it collapses the depth between them. So they render in every mode: at
 * rest they read as inert debris scattered through the void, and only as the
 * projection takes hold do they slide into one plane and light up as a floor.
 * Everything here is presentation; the colliders live in physics.ts.
 */
export function Projection() {
  const style = useArtStyle();
  const slabs = useRef<Array<Mesh | null>>([]);
  const seam = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);

  const edges = useMemo(() => new EdgesGeometry(UNIT_BOX), []);
  const edgeMaterials = useMemo(
    () => FRAGMENTS.map(() => new LineBasicMaterial({ transparent: true, opacity: 0.3 })),
    [],
  );

  const restColor = useMemo(() => new Color(), []);
  const liveColor = useMemo(() => new Color(), []);
  const mix = useMemo(() => new Color(), []);

  const chevrons = useMemo(() => {
    const t = getChevronTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(8, 1);
    return t;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const k = presentation.projectionStrength;

    // Below the unstable threshold the span is still load-bearing, but it says
    // so: two detuned sines give an irregular stutter rather than a clean pulse.
    const unstable = focus.value <= FOCUS.unstableBelow;
    const flicker = unstable ? 0.5 + 0.5 * Math.abs(Math.sin(t * 19) * Math.sin(t * 6.7)) : 1;

    restColor.set(style.structure.color);
    liveColor.set(style.projection);
    mix.copy(restColor).lerp(liveColor, k);

    FRAGMENTS.forEach((frag, i) => {
      const m = slabs.current[i];
      if (!m) return;
      m.position.set(
        frag.rest[0] + (frag.aligned[0] - frag.rest[0]) * k,
        frag.rest[1] + (frag.aligned[1] - frag.rest[1]) * k,
        frag.rest[2] + (frag.aligned[2] - frag.rest[2]) * k,
      );
      // A slab drifts while it is loose and holds dead still once forged.
      const drift = (1 - k) * 0.12;
      m.position.y += Math.sin(t * 0.9 + i * 2.1) * drift;
      m.rotation.z = Math.sin(t * 0.6 + i) * drift * 0.4;

      const mat = m.material as MeshStandardMaterial;
      mat.color.copy(mix);
      if (mat.emissive) {
        mat.emissive.copy(liveColor);
        mat.emissiveIntensity = (0.08 + 2.2 * k) * flicker;
      }

      const em = edgeMaterials[i];
      em.color.copy(liveColor);
      em.opacity = (0.3 + 0.6 * k) * flicker;
    });

    if (seam.current) {
      const m = seam.current.material as MeshBasicMaterial;
      m.color.copy(liveColor);
      m.opacity = 0.7 * k * flicker;
      seam.current.visible = k > 0.03;
      chevrons.offset.x = -t * 0.08;
    }
    if (light.current) {
      light.current.color.copy(liveColor);
      light.current.intensity = 14 * k * flicker;
      light.current.visible = k > 0.03;
    }
  });

  return (
    <group>
      {FRAGMENTS.map((frag, i) => (
        <mesh
          key={frag.id}
          ref={(el) => {
            slabs.current[i] = el;
          }}
          position={frag.rest}
          scale={frag.s}
          geometry={UNIT_BOX}
        >
          <meshStandardMaterial
            color={style.structure.color}
            emissive={style.projection}
            emissiveIntensity={0.08}
            roughness={0.3}
            metalness={0.5}
          />
          <lineSegments geometry={edges} material={edgeMaterials[i]} />
        </mesh>
      ))}

      {/* The seam: a running line down the forged surface, so the span reads as
          one continuous floor rather than three slabs that happen to touch. */}
      <mesh
        ref={seam}
        geometry={UNIT_PLANE}
        position={[(SPAN.minX + SPAN.maxX) / 2, SPAN.top + 0.015, SPAN.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[SPAN.maxX - SPAN.minX, 1.6, 1]}
      >
        <meshBasicMaterial map={chevrons} transparent opacity={0} depthWrite={false} />
      </mesh>

      <pointLight
        ref={light}
        position={[(SPAN.minX + SPAN.maxX) / 2, SPAN.top + 2.4, SPAN.z]}
        distance={16}
        decay={2}
        intensity={0}
      />
    </group>
  );
}
