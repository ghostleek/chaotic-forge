import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import type { FogExp2, PointLight } from "three";
import { player } from "../gameState";
import { presentation } from "../presentation";
import { useArtStyle } from "./artStyles";
import { Sky } from "./Sky";

export function Backdrop() {
  const style = useArtStyle();
  const fog = useRef<FogExp2>(null);
  const accentLight = useRef<PointLight>(null);
  const rimLight = useRef<PointLight>(null);

  useFrame(() => {
    if (fog.current) {
      fog.current.color.copy(presentation.fogColor);
      fog.current.density = presentation.fogDensity;
    }
    if (accentLight.current) {
      accentLight.current.color.copy(presentation.accent);
      accentLight.current.position.set(player.x, player.y + 3.2, player.z + 1.6);
    }
    if (rimLight.current) {
      rimLight.current.color.copy(presentation.accent);
      rimLight.current.position.set(player.x - 6, player.y + 1.2, player.z - 5);
    }
  });

  return (
    <>
      <fogExp2 ref={fog} attach="fog" args={[style.fogColor, presentation.fogDensity]} />
      <Sky style={style} />

      <ambientLight intensity={style.lights.ambient.intensity} color={style.lights.ambient.color} />
      <hemisphereLight
        args={[style.lights.hemi.sky, style.lights.hemi.ground, style.lights.hemi.intensity]}
        key={`hemi-${style.id}`}
      />
      <directionalLight
        position={[-18, 26, 22]}
        intensity={style.lights.key.intensity}
        color={style.lights.key.color}
      />
      <directionalLight
        position={[26, 14, -22]}
        intensity={style.lights.fill.intensity}
        color={style.lights.fill.color}
      />
      <pointLight
        ref={accentLight}
        intensity={style.lights.accentIntensity}
        distance={20}
        decay={2}
      />
      <pointLight
        ref={rimLight}
        intensity={style.lights.accentIntensity * 0.46}
        distance={16}
        decay={2}
      />

      {style.stars && (
        <Stars radius={160} depth={70} count={2200} factor={4.5} saturation={0} fade speed={0.25} />
      )}
    </>
  );
}
