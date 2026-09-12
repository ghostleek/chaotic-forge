import type { DashRechargeOptionId } from './dash-experiment';

export const DASH_ARENA = {
  width: 800,
  height: 420,
  runDurationMs: 45_000,
  protectedWindowMs: 220,
  controlRechargeMs: 3_000,
  dashDistance: 110,
  seed: 4127,
} as const;

export type DashPreviewVariant = 'control' | 'mutation';
export type DashRunStatus = 'idle' | 'running' | 'complete';
export type DashRuntimeEventType =
  | 'run_started'
  | 'dash_used'
  | 'dash_recharged'
  | 'projectile_crossed'
  | 'damage_taken'
  | 'enemy_eliminated'
  | 'run_completed';

export type DashRuntimeEvent = {
  type: DashRuntimeEventType;
  atMs: number;
  detail?: string;
  preview: true;
};

export type DashProjectile = {
  id: number;
  x: number;
  y: number;
};

export type DashRuntimeState = {
  seed: number;
  variant: DashPreviewVariant;
  mutationId: DashRechargeOptionId;
  status: DashRunStatus;
  elapsedMs: number;
  player: { x: number; y: number; hp: number };
  enemy: { x: number; y: number; hp: number; respawnAtMs: number | null };
  projectiles: DashProjectile[];
  nextProjectileAtMs: number;
  projectileSequence: number;
  dashReady: boolean;
  dashProtectedUntilMs: number;
  dashRechargeAtMs: number | null;
  attackReadyAtMs: number;
  metrics: {
    dashAttempts: number;
    projectileCrossings: number;
    eliminations: number;
    damageTaken: number;
  };
  events: DashRuntimeEvent[];
  preview: true;
};

export type DashRuntimeInput = {
  x?: -1 | 0 | 1;
  y?: -1 | 0 | 1;
  dash?: boolean;
  attack?: boolean;
};

const PLAYER_RADIUS = 18;
const PROJECTILE_RADIUS = 9;
const ENEMY_X = 670;
const ENEMY_Y = 210;
const MOVE_SPEED_PER_MS = 0.18;
const PROJECTILE_SPEED_PER_MS = 0.22;
const ATTACK_RANGE = 112;
const ATTACK_COOLDOWN_MS = 420;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function distance(
  first: { x: number; y: number },
  second: { x: number; y: number },
) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function projectileLane(seed: number, sequence: number) {
  const value = (seed * 9_301 + sequence * 49_297 + 23_333) % 233_280;
  return 70 + (value / 233_280) * (DASH_ARENA.height - 140);
}

function appendEvent(
  events: DashRuntimeEvent[],
  type: DashRuntimeEventType,
  atMs: number,
  detail?: string,
) {
  return [...events, { type, atMs, detail, preview: true as const }];
}

export function createDashPreviewRun({
  variant = 'control',
  mutationId = 'elimination',
  seed = DASH_ARENA.seed,
}: {
  variant?: DashPreviewVariant;
  mutationId?: DashRechargeOptionId;
  seed?: number;
} = {}): DashRuntimeState {
  return {
    seed,
    variant,
    mutationId,
    status: 'idle',
    elapsedMs: 0,
    player: { x: 125, y: DASH_ARENA.height / 2, hp: 3 },
    enemy: { x: ENEMY_X, y: ENEMY_Y, hp: 3, respawnAtMs: null },
    projectiles: [],
    nextProjectileAtMs: 900,
    projectileSequence: 0,
    dashReady: true,
    dashProtectedUntilMs: 0,
    dashRechargeAtMs: null,
    attackReadyAtMs: 0,
    metrics: {
      dashAttempts: 0,
      projectileCrossings: 0,
      eliminations: 0,
      damageTaken: 0,
    },
    events: [],
    preview: true,
  };
}

export function startDashPreviewRun(state: DashRuntimeState) {
  if (state.status !== 'idle') return state;

  return {
    ...state,
    status: 'running' as const,
    events: appendEvent(state.events, 'run_started', 0, state.variant),
  };
}

function mutationRechargeMatches(
  mutationId: DashRechargeOptionId,
  event: 'elimination' | 'close-range-elimination' | 'projectile-crossing',
) {
  return mutationId === event;
}

function rechargeDash(state: DashRuntimeState, atMs: number, detail: string) {
  if (state.dashReady) return state;

  return {
    ...state,
    dashReady: true,
    dashRechargeAtMs: null,
    events: appendEvent(state.events, 'dash_recharged', atMs, detail),
  };
}

export function advanceDashPreviewRun(
  state: DashRuntimeState,
  deltaMs: number,
  input: DashRuntimeInput = {},
): DashRuntimeState {
  if (state.status !== 'running' || deltaMs <= 0) return state;

  const elapsedMs = Math.min(
    DASH_ARENA.runDurationMs,
    state.elapsedMs + deltaMs,
  );
  const directionX = input.x ?? 0;
  const directionY = input.y ?? 0;
  const magnitude = Math.hypot(directionX, directionY) || 1;
  const normalizedX = directionX / magnitude;
  const normalizedY = directionY / magnitude;
  const moving = directionX !== 0 || directionY !== 0;

  let next: DashRuntimeState = {
    ...state,
    elapsedMs,
    player: {
      ...state.player,
      x: clamp(
        state.player.x + normalizedX * MOVE_SPEED_PER_MS * deltaMs,
        PLAYER_RADIUS,
        DASH_ARENA.width - PLAYER_RADIUS,
      ),
      y: clamp(
        state.player.y + normalizedY * MOVE_SPEED_PER_MS * deltaMs,
        PLAYER_RADIUS,
        DASH_ARENA.height - PLAYER_RADIUS,
      ),
    },
    projectiles: state.projectiles.map((projectile) => ({
      ...projectile,
      x: projectile.x - PROJECTILE_SPEED_PER_MS * deltaMs,
    })),
  };

  if (input.dash && next.dashReady) {
    const dashX = moving ? normalizedX : 1;
    const dashY = moving ? normalizedY : 0;
    next = {
      ...next,
      player: {
        ...next.player,
        x: clamp(
          next.player.x + dashX * DASH_ARENA.dashDistance,
          PLAYER_RADIUS,
          DASH_ARENA.width - PLAYER_RADIUS,
        ),
        y: clamp(
          next.player.y + dashY * DASH_ARENA.dashDistance,
          PLAYER_RADIUS,
          DASH_ARENA.height - PLAYER_RADIUS,
        ),
      },
      dashReady: false,
      dashProtectedUntilMs: elapsedMs + DASH_ARENA.protectedWindowMs,
      dashRechargeAtMs:
        next.variant === 'control'
          ? elapsedMs + DASH_ARENA.controlRechargeMs
          : null,
      metrics: {
        ...next.metrics,
        dashAttempts: next.metrics.dashAttempts + 1,
      },
      events: appendEvent(next.events, 'dash_used', elapsedMs),
    };
  }

  if (
    next.variant === 'control' &&
    !next.dashReady &&
    next.dashRechargeAtMs !== null &&
    elapsedMs >= next.dashRechargeAtMs
  ) {
    next = rechargeDash(next, elapsedMs, 'timer');
  }

  if (elapsedMs >= next.nextProjectileAtMs) {
    const sequence = next.projectileSequence + 1;
    next = {
      ...next,
      projectileSequence: sequence,
      nextProjectileAtMs: next.nextProjectileAtMs + 1_200,
      projectiles: [
        ...next.projectiles,
        {
          id: sequence,
          x: ENEMY_X - 22,
          y: projectileLane(next.seed, sequence),
        },
      ],
    };
  }

  const survivingProjectiles: DashProjectile[] = [];
  for (const projectile of next.projectiles) {
    if (projectile.x < -PROJECTILE_RADIUS) continue;

    if (distance(projectile, next.player) > PLAYER_RADIUS + PROJECTILE_RADIUS) {
      survivingProjectiles.push(projectile);
      continue;
    }

    if (elapsedMs <= next.dashProtectedUntilMs) {
      next = {
        ...next,
        metrics: {
          ...next.metrics,
          projectileCrossings: next.metrics.projectileCrossings + 1,
        },
        events: appendEvent(next.events, 'projectile_crossed', elapsedMs),
      };
      if (
        next.variant === 'mutation' &&
        mutationRechargeMatches(next.mutationId, 'projectile-crossing')
      ) {
        next = rechargeDash(next, elapsedMs, 'projectile-crossing');
      }
      continue;
    }

    next = {
      ...next,
      player: { ...next.player, hp: Math.max(0, next.player.hp - 1) },
      metrics: {
        ...next.metrics,
        damageTaken: next.metrics.damageTaken + 1,
      },
      events: appendEvent(next.events, 'damage_taken', elapsedMs),
    };
  }
  next = { ...next, projectiles: survivingProjectiles };

  if (
    input.attack &&
    elapsedMs >= next.attackReadyAtMs &&
    next.enemy.respawnAtMs === null &&
    distance(next.player, next.enemy) <= ATTACK_RANGE
  ) {
    const enemyHp = next.enemy.hp - 1;
    next = {
      ...next,
      attackReadyAtMs: elapsedMs + ATTACK_COOLDOWN_MS,
      enemy: { ...next.enemy, hp: enemyHp },
    };

    if (enemyHp <= 0) {
      const closeRange = distance(next.player, next.enemy) <= 72;
      next = {
        ...next,
        enemy: { ...next.enemy, hp: 0, respawnAtMs: elapsedMs + 800 },
        metrics: {
          ...next.metrics,
          eliminations: next.metrics.eliminations + 1,
        },
        events: appendEvent(
          next.events,
          'enemy_eliminated',
          elapsedMs,
          closeRange ? 'close-range' : 'standard-range',
        ),
      };

      if (
        next.variant === 'mutation' &&
        (mutationRechargeMatches(next.mutationId, 'elimination') ||
          (closeRange &&
            mutationRechargeMatches(
              next.mutationId,
              'close-range-elimination',
            )))
      ) {
        next = rechargeDash(
          next,
          elapsedMs,
          closeRange ? 'close-range-elimination' : 'elimination',
        );
      }
    }
  }

  if (next.enemy.respawnAtMs !== null && elapsedMs >= next.enemy.respawnAtMs) {
    next = {
      ...next,
      enemy: { x: ENEMY_X, y: ENEMY_Y, hp: 3, respawnAtMs: null },
    };
  }

  if (elapsedMs >= DASH_ARENA.runDurationMs) {
    next = {
      ...next,
      status: 'complete',
      events: appendEvent(next.events, 'run_completed', elapsedMs),
    };
  }

  return next;
}

export function runDashPreviewToCompletion(
  initialState: DashRuntimeState,
  inputs: DashRuntimeInput[] = [],
) {
  let state = startDashPreviewRun(initialState);
  let frame = 0;

  while (state.status === 'running') {
    state = advanceDashPreviewRun(state, 50, inputs[frame] ?? {});
    frame += 1;
  }

  return state;
}
