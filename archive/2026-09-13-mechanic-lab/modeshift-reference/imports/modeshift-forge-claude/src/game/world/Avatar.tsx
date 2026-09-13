import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import { player, state } from "../gameState";
import { presentation } from "../presentation";
import { PLAYER, SOLIDS } from "./levelData";
import { OUTLINE_MATERIAL, UNIT_PLANE } from "./materials";
import { useArtStyle } from "./artStyles";
import { spriteStrip } from "./assets";
import { useSheetsReady } from "./AssetSurfaces";

/** Green astronaut, stand and stride — the pack ships a two-frame cycle. */
const HERO_FRAMES = [0, 1];
const HERO_FPS = 9;
/** The 24px sprite is drawn a touch taller than the capsule so feet meet the deck. */
const SPRITE_W = 2;
const SPRITE_H = 2;

const DECK_TOPS = SOLIDS.map((s) => ({
  top: s.c[1] + s.s[1] / 2,
  minX: s.c[0] - s.s[0] / 2,
  maxX: s.c[0] + s.s[0] / 2,
  minZ: s.c[2] - s.s[2] / 2,
  maxZ: s.c[2] + s.s[2] / 2,
}));

/** Cheap contact shadow: nearest deck top under the player. */
function groundBelow(x: number, y: number, z: number): number | null {
  let best: number | null = null;
  for (const d of DECK_TOPS) {
    if (x < d.minX - 0.2 || x > d.maxX + 0.2 || z < d.minZ - 0.2 || z > d.maxZ + 0.2) continue;
    if (d.top > y + 0.2) continue;
    if (best === null || d.top > best) best = d.top;
  }
  return best;
}

export function Avatar() {
  const style = useArtStyle();
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const visor = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const facing = useRef<Mesh>(null);
  const sprite = useRef<Mesh>(null);
  const heading = useRef(1);

  const sheets = useSheetsReady(style.spriteAvatar);
  const useSprite = style.spriteAvatar && sheets;
  const heroMap = useMemo(() => {
    if (!useSprite) return null;
    const t = spriteStrip(HERO_FRAMES).clone();
    t.needsUpdate = true;
    return t;
  }, [useSprite]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.position.set(player.x, player.y, player.z);
    const o = presentation.avatarOpacity;
    g.visible = o > 0.02;

    // Lean into travel direction; reads well in the side and overhead views.
    const lean = Math.max(-0.22, Math.min(0.22, -player.vx * 0.022));
    // A billboard cancels its parent's rotation, so the sprite carries its own
    // lean and flips by scale instead of turning the whole group.
    g.rotation.z = useSprite ? 0 : lean;
    g.rotation.y = useSprite
      ? 0
      : state.mode === "platformer"
        ? player.vx >= 0
          ? 0
          : Math.PI
        : player.yaw;

    if (sprite.current && heroMap) {
      const speed = Math.hypot(player.vx, player.vz);
      if (Math.abs(player.vx) > 0.25) heading.current = player.vx >= 0 ? 1 : -1;
      const frame = !player.onGround
        ? 1
        : speed > 0.35
          ? Math.floor(clock.elapsedTime * HERO_FPS) % HERO_FRAMES.length
          : 0;
      heroMap.offset.x = frame / HERO_FRAMES.length;
      sprite.current.scale.set(SPRITE_W * heading.current, SPRITE_H, 1);
      sprite.current.rotation.z = lean;
      const m = sprite.current.material as MeshBasicMaterial;
      m.opacity = o;
    }

    if (body.current) {
      const m = body.current.material as MeshStandardMaterial;
      m.opacity = o;
      // Toon materials have no emissive channel; only tint the PBR one.
      if (m.emissive) {
        m.emissive.copy(presentation.accent);
        m.emissiveIntensity = 0.75 + (player.onGround ? 0 : 0.5);
      }
    }
    if (visor.current) {
      const m = visor.current.material as MeshBasicMaterial;
      m.opacity = o * 0.95;
      m.color.copy(presentation.accent);
    }
    if (facing.current) {
      const m = facing.current.material as MeshBasicMaterial;
      m.opacity = state.mode === "tactical" ? o * 0.8 : 0;
      m.color.copy(presentation.accent);
    }
    if (shadow.current) {
      const gy = groundBelow(player.x, player.y, player.z);
      if (gy === null) {
        shadow.current.visible = false;
      } else {
        const drop = Math.max(0, player.y - gy);
        shadow.current.visible = o > 0.02 && drop < 9;
        shadow.current.position.y = gy - player.y + 0.02;
        const k = 1 - Math.min(1, drop / 9);
        shadow.current.scale.setScalar(0.8 + drop * 0.07);
        (shadow.current.material as MeshBasicMaterial).opacity = 0.44 * k * o;
      }
    }
    const bob = player.onGround ? Math.sin(clock.elapsedTime * 11) * Math.min(0.05, Math.abs(player.vx) * 0.006) : 0;
    if (body.current) body.current.position.y = PLAYER.height / 2 + bob;
  });

  return (
    <group ref={group}>
      {useSprite && heroMap && (
        <Billboard position={[0, SPRITE_H / 2, 0]}>
          <mesh ref={sprite} geometry={UNIT_PLANE} scale={[SPRITE_W, SPRITE_H, 1]}>
            <meshBasicMaterial
              map={heroMap}
              transparent
              alphaTest={0.4}
              side={DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </Billboard>
      )}

      {!useSprite && style.outline && (
        <mesh
          position={[0, PLAYER.height / 2, 0]}
          material={OUTLINE_MATERIAL}
          scale={[
            1 + (style.outline.width * 2) / (PLAYER.radius * 2),
            1 + (style.outline.width * 2) / PLAYER.height,
            1 + (style.outline.width * 2) / (PLAYER.radius * 2),
          ]}
        >
          <capsuleGeometry args={[PLAYER.radius, PLAYER.height - PLAYER.radius * 2, 6, 12]} />
        </mesh>
      )}
      <mesh
        ref={body}
        visible={!useSprite}
        position={[0, PLAYER.height / 2, 0]}
        key={style.shading}
      >
        <capsuleGeometry args={[PLAYER.radius, PLAYER.height - PLAYER.radius * 2, 6, 12]} />
        {style.shading === "toon" ? (
          <meshToonMaterial color={style.avatar.body} transparent />
        ) : (
          <meshStandardMaterial
            color={style.avatar.body}
            emissive="#ffb648"
            emissiveIntensity={0.8}
            roughness={0.4}
            metalness={0.45}
            transparent
          />
        )}
      </mesh>
      <mesh
        ref={visor}
        visible={!useSprite}
        position={[0, PLAYER.height - 0.34, -PLAYER.radius * 0.82]}
      >
        <boxGeometry args={[0.34, 0.1, 0.12]} />
        <meshBasicMaterial color="#ffb648" transparent />
      </mesh>
      <mesh ref={facing} position={[0, 0.06, -0.95]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.26, 0.7, 3]} />
        <meshBasicMaterial color="#ffb648" transparent depthWrite={false} />
      </mesh>
      <mesh
        ref={shadow}
        geometry={UNIT_PLANE}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.1, 1.1, 1]}
      >
        <meshBasicMaterial color="#000308" transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  );
}
