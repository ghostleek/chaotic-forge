'use client';

/* oxlint-disable react-compiler */

import { Grid } from '@react-three/drei/core/Grid.js';
import { Stars } from '@react-three/drei/core/Stars.js';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type VariantId = 'control' | 'mutation';

export type RunMetrics = {
  dashes: number;
  kills: number;
  distance: number;
  damage: number;
  forwardTime: number;
};

type ArenaProps = {
  variant: VariantId;
  resetKey: number;
  onComplete: (variant: VariantId, metrics: RunMetrics) => void;
};

const ENEMY_POSITIONS: [number, number, number][] = [
  [-6, 1.1, -7],
  [5, 1.1, -10],
  [8, 1.1, 1],
  [-8, 1.1, 4],
  [0, 1.1, -15],
];

const EMPTY_METRICS: RunMetrics = {
  dashes: 0,
  kills: 0,
  distance: 0,
  damage: 0,
  forwardTime: 0,
};

function Enemy({
  position,
  active,
  register,
}: {
  position: [number, number, number];
  active: boolean;
  register: (mesh: THREE.Mesh | null) => void;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2.2 + position[0]) * 0.12;
    group.current.rotation.y += 0.008;
  });

  return (
    <group ref={group} position={position} visible={active}>
      <mesh ref={register} userData={{ enemy: true }} visible={active} castShadow>
        <octahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial color="#ff542e" emissive="#ff3515" emissiveIntensity={2.2} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.88, 0]}>
        <cylinderGeometry args={[0.45, 0.65, 0.9, 6]} />
        <meshStandardMaterial color="#251512" emissive="#8e1d0e" emissiveIntensity={0.5} />
      </mesh>
      <pointLight color="#ff4d28" intensity={3.5} distance={4} />
    </group>
  );
}

function ArenaGeometry() {
  return (
    <>
      <ambientLight intensity={0.75} color="#cfe5db" />
      <directionalLight position={[8, 14, 4]} intensity={2.2} color="#fff2d0" castShadow />
      <pointLight position={[-9, 4, -10]} color="#67f5b5" intensity={24} distance={15} />
      <pointLight position={[9, 3, 6]} color="#ff5b34" intensity={18} distance={14} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[38, 38]} />
        <meshStandardMaterial color="#111713" roughness={0.96} metalness={0.08} />
      </mesh>
      <Grid
        position={[0, 0.012, 0]}
        args={[38, 38]}
        cellColor="#2e493c"
        sectionColor="#7bd7a6"
        cellSize={1}
        sectionSize={5}
        fadeDistance={32}
        fadeStrength={1.8}
        infiniteGrid={false}
      />

      {[
        [-5, 1.5, -2, 2, 3, 2],
        [5, 1, -5, 4, 2, 1.5],
        [-8, 0.75, -11, 3, 1.5, 3],
        [8, 1.25, -13, 2, 2.5, 3],
        [0, 0.6, 3, 5, 1.2, 1],
      ].map(([x, y, z, w, h, d], index) => (
        <mesh key={index} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#202822" roughness={0.7} metalness={0.35} />
        </mesh>
      ))}

      <mesh position={[0, 0.12, -17]}>
        <boxGeometry args={[16, 0.24, 0.24]} />
        <meshStandardMaterial color="#ff5b35" emissive="#ff3f1f" emissiveIntensity={2} />
      </mesh>
      <Stars radius={45} depth={15} count={420} factor={1.5} saturation={0.25} fade speed={0.3} />
    </>
  );
}

function PlayerController({
  active,
  variant,
  resetKey,
  enemyRefs,
  enemyActive,
  onEnemyHit,
  onMetrics,
}: {
  active: boolean;
  variant: VariantId;
  resetKey: number;
  enemyRefs: React.RefObject<(THREE.Mesh | null)[]>;
  enemyActive: boolean[];
  onEnemyHit: (index: number) => void;
  onMetrics: (metrics: RunMetrics, dashReady: boolean, cooldown: number) => void;
}) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const metrics = useRef<RunMetrics>({ ...EMPTY_METRICS });
  const dashReady = useRef(true);
  const cooldown = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(-0.08);
  const telemetryClock = useRef(0);
  const damageClock = useRef(0);
  const raycaster = useRef(new THREE.Raycaster());

  const resetPlayer = useCallback(() => {
    camera.position.set(0, 1.7, 9);
    yaw.current = 0;
    pitch.current = -0.08;
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch.current, yaw.current, 0);
    metrics.current = { ...EMPTY_METRICS };
    dashReady.current = true;
    cooldown.current = 0;
    onMetrics(metrics.current, true, 0);
  }, [camera, onMetrics]);

  useEffect(() => resetPlayer(), [resetKey, resetPlayer]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => { keys.current[event.code] = true; };
    const up = (event: KeyboardEvent) => { keys.current[event.code] = false; };
    const look = (event: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement || !active) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current = THREE.MathUtils.clamp(pitch.current - event.movementY * 0.002, -1.15, 1.15);
    };
    const shoot = (event: MouseEvent) => {
      if (!active || event.button !== 0 || document.pointerLockElement !== gl.domElement) return;
      raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const available = enemyRefs.current.filter((mesh): mesh is THREE.Mesh => Boolean(mesh?.visible && mesh.parent?.visible));
      const hit = raycaster.current.intersectObjects(available, false)[0];
      if (!hit) return;
      const index = enemyRefs.current.indexOf(hit.object as THREE.Mesh);
      if (index >= 0) {
        metrics.current.kills += 1;
        if (variant === 'mutation') {
          dashReady.current = true;
          cooldown.current = 0;
        }
        onEnemyHit(index);
      }
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    document.addEventListener('mousemove', look);
    document.addEventListener('mousedown', shoot);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      document.removeEventListener('mousemove', look);
      document.removeEventListener('mousedown', shoot);
    };
  }, [active, camera, enemyRefs, gl.domElement, onEnemyHit, variant]);

  useFrame((_, delta) => {
    if (!active) return;
    camera.rotation.set(pitch.current, yaw.current, 0);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const movement = new THREE.Vector3();
    if (keys.current.KeyW) movement.add(forward);
    if (keys.current.KeyS) movement.sub(forward);
    if (keys.current.KeyD) movement.add(right);
    if (keys.current.KeyA) movement.sub(right);

    if (movement.lengthSq() > 0) {
      movement.normalize();
      const step = movement.multiplyScalar(5.4 * delta);
      camera.position.add(step);
      metrics.current.distance += step.length();
      if (keys.current.KeyW) metrics.current.forwardTime += delta;
    }

    if ((keys.current.ShiftLeft || keys.current.ShiftRight) && dashReady.current) {
      const dashVector = movement.lengthSq() > 0 ? movement.clone().normalize() : forward;
      camera.position.add(dashVector.multiplyScalar(4.2));
      metrics.current.distance += 4.2;
      metrics.current.dashes += 1;
      dashReady.current = false;
      cooldown.current = variant === 'control' ? 4 : 99;
      keys.current.ShiftLeft = false;
      keys.current.ShiftRight = false;
    }

    if (variant === 'control' && !dashReady.current) {
      cooldown.current = Math.max(0, cooldown.current - delta);
      if (cooldown.current === 0) dashReady.current = true;
    }

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -16, 16);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -16, 16);
    camera.position.y = 1.7;

    damageClock.current += delta;
    if (damageClock.current > 1.2) {
      damageClock.current = 0;
      const isThreatened = ENEMY_POSITIONS.some((position, index) => {
        if (!enemyActive[index]) return false;
        return camera.position.distanceTo(new THREE.Vector3(...position)) < 6.5;
      });
      if (isThreatened) metrics.current.damage += variant === 'mutation' ? 7 : 9;
    }

    telemetryClock.current += delta;
    if (telemetryClock.current > 0.12) {
      telemetryClock.current = 0;
      onMetrics({ ...metrics.current }, dashReady.current, cooldown.current);
    }
  });

  return null;
}

function ArenaScene({
  active,
  variant,
  resetKey,
  onMetrics,
}: {
  active: boolean;
  variant: VariantId;
  resetKey: number;
  onMetrics: (metrics: RunMetrics, dashReady: boolean, cooldown: number) => void;
}) {
  const enemyRefs = useRef<(THREE.Mesh | null)[]>([]);
  const [enemyActive, setEnemyActive] = useState(() => ENEMY_POSITIONS.map(() => true));

  useEffect(() => setEnemyActive(ENEMY_POSITIONS.map(() => true)), [resetKey]);

  const hitEnemy = useCallback((index: number) => {
    setEnemyActive((current) => {
      if (!current[index]) return current;
      return current.map((value, i) => (i === index ? false : value));
    });
    window.setTimeout(() => {
      setEnemyActive((current) => current.map((value, i) => (i === index ? true : value)));
    }, 2600);
  }, []);

  return (
    <>
      <color attach="background" args={['#080c0a']} />
      <fog attach="fog" args={['#080c0a', 16, 38]} />
      <ArenaGeometry />
      {ENEMY_POSITIONS.map((position, index) => (
        <Enemy
          key={index}
          position={position}
          active={enemyActive[index]}
          register={(mesh) => { enemyRefs.current[index] = mesh; }}
        />
      ))}
      <PlayerController
        active={active}
        variant={variant}
        resetKey={resetKey}
        enemyRefs={enemyRefs}
        enemyActive={enemyActive}
        onEnemyHit={hitEnemy}
        onMetrics={onMetrics}
      />
    </>
  );
}

export function ForgeArena({ variant, resetKey, onComplete }: ArenaProps) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(20);
  const [metrics, setMetrics] = useState<RunMetrics>({ ...EMPTY_METRICS });
  const [ready, setReady] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const latestMetrics = useRef(metrics);

  const finishRun = useCallback(() => {
    setRunning(false);
    if (document.pointerLockElement) document.exitPointerLock();
    onComplete(variant, latestMetrics.current);
  }, [onComplete, variant]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          window.setTimeout(finishRun, 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finishRun, running]);

  useEffect(() => {
    setRunning(false);
    setSeconds(20);
    setMetrics({ ...EMPTY_METRICS });
  }, [resetKey, variant]);

  const startRun = () => {
    setSeconds(20);
    setMetrics({ ...EMPTY_METRICS });
    latestMetrics.current = { ...EMPTY_METRICS };
    setRunning(true);
    void container.current?.querySelector('canvas')?.requestPointerLock?.();
  };

  const updateMetrics = useCallback((next: RunMetrics, dashReady: boolean, nextCooldown: number) => {
    latestMetrics.current = next;
    setMetrics(next);
    setReady(dashReady);
    setCooldown(nextCooldown);
  }, []);

  return (
    <div ref={container} className="arena-shell">
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 1.7, 9], fov: 68, near: 0.1, far: 70 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <ArenaScene active={running} variant={variant} resetKey={resetKey} onMetrics={updateMetrics} />
      </Canvas>

      <div className="arena-vignette" />
      <div className="crosshair" aria-hidden="true"><span /><span /></div>

      <div className="arena-topbar">
        <span className={`live-dot ${running ? 'is-running' : ''}`} />
        <span>{running ? 'PLAYTEST LIVE' : 'SIMULATION READY'}</span>
        <span className="arena-clock">00:{String(seconds).padStart(2, '0')}</span>
      </div>

      <div className="arena-hud">
        <div><span className="hud-label">DASH</span><strong className={ready ? 'hud-ready' : ''}>{ready ? 'READY' : variant === 'control' ? `${cooldown.toFixed(1)}s` : 'GET A KILL'}</strong></div>
        <div><span className="hud-label">KILLS</span><strong>{metrics.kills}</strong></div>
        <div><span className="hud-label">DISTANCE</span><strong>{metrics.distance.toFixed(0)}m</strong></div>
      </div>

      {!running && (
        <div className="arena-start-card">
          <span className="micro-label">{variant === 'control' ? 'CONTROL A' : 'MUTATION B'}</span>
          <h3>{variant === 'control' ? 'Timed recharge' : 'Kill-reset dash'}</h3>
          <p>{variant === 'control' ? 'Dash returns after four seconds.' : 'Eliminate a target to earn the next dash.'}</p>
          <button type="button" className="arena-start-button" onClick={startRun}>Enter 20s playtest</button>
          <small>WASD move · Shift dash · Mouse aim · Click fire</small>
        </div>
      )}

      {running && <button type="button" className="end-run-button" onClick={finishRun}>End run</button>}
    </div>
  );
}
