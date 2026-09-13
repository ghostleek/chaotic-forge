/**
 * Deterministic headless replay of the Perspective Forging demo path.
 *
 * Runs the real simulation modules (no browser, no rendering) at a fixed
 * timestep and asserts the sequence the 90-second demo depends on. This is the
 * check that must stay green; the browser pass is for how it looks.
 */
import {
  FOCUS,
  bridge,
  endTransition,
  focus,
  player,
  resetRun,
  setMode,
  state,
} from "../src/game/gameState";
import { stepGame, type FrameInput } from "../src/game/controllers/playerSystem";
import { collidesAt, isProjectedSolid, nearestSafeLane } from "../src/game/controllers/physics";
import {
  CORES,
  DEPTH_LANES,
  FRAGMENTS,
  JUMP_RANGE,
  PLAYER,
  PORTAL,
  SOLIDS,
  SPAN,
  SPAWN,
} from "../src/game/world/levelData";
import { MODE_CONFIGS } from "../src/shared/game-contract";

const FRAME = 1 / 60;

let failures = 0;
let checks = 0;

function check(label: string, ok: boolean, detail = "") {
  checks += 1;
  if (ok) {
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const NEUTRAL: FrameInput = {
  axisX: 0,
  axisY: 0,
  jump: false,
  sprint: false,
  lookDx: 0,
  lookDy: 0,
};

let simTime = 0;

/** Advance the simulation, holding the given input. */
function run(frames: number, fi: Partial<FrameInput> = {}) {
  for (let i = 0; i < frames; i += 1) {
    simTime += FRAME;
    stepGame(FRAME, simTime, { ...NEUTRAL, ...fi, jump: i === 0 ? (fi.jump ?? false) : false });
  }
}

/** Hold input until a predicate holds or we give up. */
function until(pred: () => boolean, fi: Partial<FrameInput>, maxFrames = 900): boolean {
  for (let i = 0; i < maxFrames; i += 1) {
    if (pred()) return true;
    simTime += FRAME;
    stepGame(FRAME, simTime, { ...NEUTRAL, ...fi, jump: i === 0 ? (fi.jump ?? false) : false });
  }
  return pred();
}

/** Settle into a mode the way a player would, then hand back control. */
function enter(mode: "platformer" | "firstPerson" | "tactical") {
  setMode(mode);
  endTransition();
}

/** Yaw that makes axisY=+1 walk along +X / +Z in Inhabit. */
const YAW_PLUS_X = -Math.PI / 2;
const YAW_PLUS_Z = Math.PI;

function fresh(mode: "platformer" | "firstPerson" | "tactical" = "firstPerson") {
  resetRun(true);
  enter(mode);
  state.status = "playing";
  focus.value = FOCUS.max;
  simTime = 0;
}

console.log("\nmode configuration: three rule spaces, not three cameras");
check("only Traverse solidifies a projection", MODE_CONFIGS.platformer.solidifiesProjection);
check("Inhabit solidifies nothing", !MODE_CONFIGS.firstPerson.solidifiesProjection);
check("Command solidifies nothing", !MODE_CONFIGS.tactical.solidifiesProjection);
check("only Command freezes world time", MODE_CONFIGS.tactical.freezesWorld);
check("Traverse costs Focus per second", MODE_CONFIGS.platformer.focusDrainPerS > 0);
check("Inhabit is free", MODE_CONFIGS.firstPerson.focusDrainPerS === 0);
check("platformer locks depth", MODE_CONFIGS.platformer.depthLock);
check("firstPerson frees depth", !MODE_CONFIGS.firstPerson.depthLock);

console.log("\nlevel integrity: the gap is genuinely impossible");
const gapWidth = SPAN.maxX - SPAN.minX;
const needed = gapWidth - PLAYER.radius * 2;
check(
  "no jump clears the gap",
  needed > JUMP_RANGE,
  `needs ${needed.toFixed(2)}m, jump reaches ${JUMP_RANGE.toFixed(2)}m`,
);
check("spawn is not inside geometry", !collidesAt(SPAWN[0], SPAWN[1], SPAWN[2]));
check("spawn is on the near side of the gap", SPAWN[0] < SPAN.minX);
check(
  "every fragment really is somewhere else in depth",
  FRAGMENTS.every((f) => Math.abs(f.rest[2] - f.aligned[2]) > 1),
);
check(
  "fragments are not level with each other at rest",
  new Set(FRAGMENTS.map((f) => f.rest[1])).size > 1,
);
check("aligned fragments are level", new Set(FRAGMENTS.map((f) => f.aligned[1])).size === 1);

// A hole in the span would be a fall the player cannot read.
const ordered = [...FRAGMENTS].sort((a, b) => a.aligned[0] - b.aligned[0]);
const first = ordered[0];
const last = ordered[ordered.length - 1];
let contiguous =
  Math.abs(first.aligned[0] - first.s[0] / 2 - SPAN.minX) < 0.02 &&
  Math.abs(last.aligned[0] + last.s[0] / 2 - SPAN.maxX) < 0.02;
for (let i = 1; i < ordered.length; i += 1) {
  const prevMax = ordered[i - 1].aligned[0] + ordered[i - 1].s[0] / 2;
  const curMin = ordered[i].aligned[0] - ordered[i].s[0] / 2;
  if (curMin > prevMax + 0.001) contiguous = false;
}
check("the aligned span has no holes and meets both lips", contiguous);
check("facade still blocks the main lane", collidesAt(14, 0.05, 0) && collidesAt(14, 6, 0));
check("facade does not block the hidden lane", !collidesAt(14, 0.05, -5));
check(
  "hidden lane is standable at the corridor",
  !collidesAt(16.6, 0.05, -5) && !collidesAt(18, 0.05, -5),
);

console.log("\n1. Inhabit: the fragments are real, the floor is not");
fresh("firstPerson");
check("no projection is open in Inhabit", !isProjectedSolid());
const midFrag = FRAGMENTS[1];
check(
  "the aligned plane is empty in Inhabit",
  !collidesAt(midFrag.aligned[0], midFrag.aligned[1] + 0.2, midFrag.aligned[2]),
);
player.x = SPAN.minX + 1.5;
player.y = 0.05;
player.z = 0;
player.vy = 0;
run(40, {});
check(
  "walking over the gap in Inhabit falls",
  player.y < -1,
  `y=${player.y.toFixed(2)}`,
);

console.log("\n2. Traverse: the projection solidifies and carries the player");
fresh("platformer");
check("the projection is open in Traverse", isProjectedSolid());
check(
  "the aligned plane is solid in Traverse",
  collidesAt(midFrag.aligned[0], midFrag.aligned[1] + 0.2, midFrag.aligned[2]),
);
const focusAtEntry = focus.value;
until(() => player.x > 0, { axisX: 1 }, 400);
check("standing over the void, mid-span", player.onGround && player.y > -1, `y=${player.y.toFixed(2)}`);
check("the ground underfoot is a projection", player.onProjectedGround);
// The body can overhang the real lip by up to a radius and still be supported,
// so the invariant is that lastSafe stayed behind at real geometry instead of
// tracking the player out over the void.
check(
  "a projected surface is never recorded as safe",
  player.lastSafe[0] < SPAN.minX + PLAYER.radius && player.x - player.lastSafe[0] > 3,
  `player x=${player.x.toFixed(2)}, lastSafe x=${player.lastSafe[0].toFixed(2)}, span from ${SPAN.minX}`,
);
check("Focus is being spent to hold it", focus.value < focusAtEntry, `${focus.value.toFixed(1)}%`);
until(() => player.x > 7, { axisX: 1 }, 400);
run(30, {});
check("crossed the impossible gap", player.x > 6.5 && player.y > -1, `x=${player.x.toFixed(2)}`);
check("no fall", state.metrics.falls === 0);
check("collected core 1 mid-span", state.collected.has("core-1"));
check("registered the crossing", state.discoveries.has("forged-span"));
check("back on real ground", player.onGround && !player.onProjectedGround);
check("depth stayed locked", Math.abs(player.z) < 0.01, `z=${player.z.toFixed(3)}`);

console.log("\n3. Focus accounting");
fresh("platformer");
const before = focus.value;
run(60, {});
const drained = before - focus.value;
check(
  "Traverse drains about the configured rate",
  Math.abs(drained - MODE_CONFIGS.platformer.focusDrainPerS) < 1.5,
  `${drained.toFixed(1)}% in 1s`,
);
fresh("firstPerson");
focus.value = 50;
run(60, {});
check("Inhabit never drains", focus.value >= 50, `${focus.value.toFixed(1)}%`);
check(
  "Inhabit on real ground trickles back",
  focus.value > 50,
  `+${(focus.value - 50).toFixed(1)}%`,
);
// The camera fly-in is not billed: you are not projecting until it lands.
fresh("firstPerson");
focus.value = 80;
setMode("platformer");
run(20, {});
check("mid-transition is not billed", focus.value === 80, `${focus.value.toFixed(1)}%`);
endTransition();
fresh("firstPerson");
focus.value = 10;
state.collected.clear();
until(() => state.collected.has("core-1"), { axisX: 0 }, 1);
player.x = CORES[0].p[0];
player.y = 0.05;
player.z = 0;
enter("platformer");
focus.value = 10;
run(4, {});
check(
  "a core pays Focus back",
  focus.value > 10,
  `${focus.value.toFixed(1)}% after collecting`,
);

console.log("\n4. Collapse: running dry drops the span, not the player's progress");
fresh("platformer");
until(() => player.x > 0, { axisX: 1 }, 400);
const safeBeforeCollapse = [...player.lastSafe];
state.collected.add("core-1");
focus.value = 0.4;
run(10, {});
check("collapsed into Inhabit", state.mode === "firstPerson", `mode=${state.mode}`);
check("collapse was counted", state.metrics.projectionCollapses === 1);
check("a collapse is not a player mode switch", state.metrics.modeSwitches === 1);
check("the projection is gone", !isProjectedSolid());
endTransition();
until(() => player.y < PLAYER.fallY, {}, 400);
run(4, {});
check("the fall was counted", state.metrics.falls === 1);
check(
  "respawned on real ground, not in the void",
  Math.abs(player.x - safeBeforeCollapse[0]) < 0.01 && player.y > -1,
  `x=${player.x.toFixed(2)} y=${player.y.toFixed(2)}`,
);
check("cores survived the collapse", state.collected.has("core-1"));
check("Focus recovers after a collapse", (run(120, {}), focus.value > 0), `${focus.value.toFixed(1)}%`);

console.log("\n5. Command: world time frozen");
fresh("firstPerson");
until(() => player.x > -8, { axisY: 1, sprint: true }, 200);
player.yaw = YAW_PLUS_X;
enter("tactical");
const frozenAt = {
  x: player.x,
  z: player.z,
  elapsed: state.metrics.elapsedMs,
  exposure: state.metrics.hazardExposureMs,
};
run(60, { axisX: 1, axisY: 1 });
check("the body does not move in Command", Math.abs(player.x - frozenAt.x) < 0.001);
check("the clock does not advance in Command", state.metrics.elapsedMs === frozenAt.elapsed);
check("no exposure accrues in Command", state.metrics.hazardExposureMs === frozenAt.exposure);
check(
  "time in Command is still measured",
  state.metrics.modeTimeMs.tactical > 0,
  `${state.metrics.modeTimeMs.tactical.toFixed(0)}ms`,
);
check("Command spends no Focus by standing there", focus.value === FOCUS.max);
check("Command reveals hazards", MODE_CONFIGS.tactical.reveals.includes("hazards"));
check("Command reveals patrol cones", MODE_CONFIGS.tactical.reveals.includes("patrol-cones"));

console.log("\n6. Traverse re-entry returns to a safe lane");
fresh("firstPerson");
player.x = 19;
player.y = 0.05;
player.z = -5;
enter("platformer");
const expectedLane = nearestSafeLane(player.x, player.y, player.z, DEPTH_LANES);
run(60, {});
check(
  "eased onto a depth lane",
  Math.abs(player.z - expectedLane) < 0.05,
  `z=${player.z.toFixed(2)} lane=${expectedLane}`,
);
check("lane is one of the authored lanes", DEPTH_LANES.includes(expectedLane));

console.log("\n7. Full path: span, passage, pedestal, portal");
fresh("platformer");
// Cross the forged span.
until(() => player.x > 7, { axisX: 1, sprint: true }, 600);
check("span crossed", player.x > 6.5, `x=${player.x.toFixed(2)}`);
// Inhabit the rest: the facade is only passable in depth. deck-2 is only 5m
// deep, so reach mid-deck before turning into the corridor lane.
enter("firstPerson");
player.yaw = YAW_PLUS_X;
until(() => player.x > 12, { axisY: 1, sprint: true }, 600);
check("reached the deck that spans both lanes", player.x > 12, `x=${player.x.toFixed(2)}`);
player.yaw = 0; // faces -Z
until(() => player.z < -4.8, { axisY: 1 }, 600);
check("moved off the locked lane", player.z < -4.5, `z=${player.z.toFixed(2)}`);
player.yaw = YAW_PLUS_X;
until(() => state.collected.has("core-2"), { axisY: 1, sprint: true }, 900);
check("collected core 2 behind the facade", state.collected.has("core-2"));
check("registered the passage discovery", state.discoveries.has("hidden-passage"));
// Command reveals the hazard; Inhabit is what takes the core.
enter("tactical");
run(20, {});
enter("firstPerson");
until(() => player.x > 30.6, { axisY: 1, sprint: true }, 900);
player.yaw = YAW_PLUS_Z;
until(() => player.z > 3.2, { axisY: 1 }, 600);
let peakY = player.y;
for (let i = 0; i < 300; i += 1) {
  simTime += FRAME;
  stepGame(FRAME, simTime, {
    ...NEUTRAL,
    axisY: 1,
    jump: i === 0 || (i % 60 === 0 && player.onGround),
  });
  peakY = Math.max(peakY, player.y);
  if (state.collected.has("core-3")) break;
}
check("climbed onto the pedestal in Inhabit", peakY > 1.4, `peak y=${peakY.toFixed(2)}`);
check("collected core 3", state.collected.has("core-3"));
check("hazard exposure accrued from real position", state.metrics.hazardExposureMs > 0);
check("all three cores held", state.collected.size === CORES.length);
// Portal: the pedestal sits at z=5, past the portal deck's far edge, so the
// last approach goes back through Traverse and its depth lock.
enter("platformer");
focus.value = FOCUS.max;
run(60, {});
check("Traverse pulled the body back onto a lane", DEPTH_LANES.some((l) => Math.abs(player.z - l) < 0.2), `z=${player.z.toFixed(2)}`);
for (let i = 0; i < 600; i += 1) {
  simTime += FRAME;
  stepGame(FRAME, simTime, {
    ...NEUTRAL,
    axisX: 1,
    sprint: true,
    jump: player.onGround && player.y < 1,
  });
  if (state.status === "completed") break;
}
check(
  "run completed at the portal",
  state.status === "completed",
  `status=${state.status} x=${player.x.toFixed(1)}`,
);
check(
  "metrics are non-zero and real",
  state.metrics.elapsedMs > 1000 && state.metrics.pathLength > 40,
  `t=${(state.metrics.elapsedMs / 1000).toFixed(1)}s path=${state.metrics.pathLength.toFixed(0)}m`,
);
check("discoveries were recorded", state.metrics.discoveries >= 2, `${state.metrics.discoveries}`);
check(
  "time was spent in more than one perspective",
  state.metrics.modeTimeMs.platformer > 0 && state.metrics.modeTimeMs.firstPerson > 0,
);

console.log("\n8. Portal will not complete without all cores");
fresh("firstPerson");
player.x = PORTAL.p[0];
player.y = 1.6;
player.z = 0;
run(30, {});
check("locked portal does not complete", state.status !== "completed");

console.log("\n9. Falls reset position only");
fresh("firstPerson");
state.collected.add("core-1");
const elapsedAtFall = state.metrics.elapsedMs;
player.y = -20;
run(2, {});
check("fall counted", state.metrics.falls === 1);
check("cores survived the fall", state.collected.has("core-1"));
check("elapsed time survived the fall", state.metrics.elapsedMs >= elapsedAtFall);
check("returned above the void", player.y > -5, `y=${player.y.toFixed(2)}`);

console.log("\n10. Repeated 1 -> 2 -> 3 -> 1 switching");
fresh("firstPerson");
until(() => player.x > -8, { axisY: 1, sprint: true }, 300);
player.yaw = YAW_PLUS_X;
const beforeSwitching = { x: player.x, switches: state.metrics.modeSwitches };
for (let i = 0; i < 4; i += 1) {
  enter("platformer");
  run(10, {});
  enter("firstPerson");
  run(10, {});
  enter("tactical");
  run(10, {});
  focus.value = FOCUS.max;
}
enter("platformer");
run(20, {});
check("survives 13 switches", state.metrics.modeSwitches === beforeSwitching.switches + 13);
check(
  "player did not teleport",
  Math.abs(player.x - beforeSwitching.x) < 2,
  `x=${player.x.toFixed(2)}`,
);
check("back in Traverse on a lane", DEPTH_LANES.some((l) => Math.abs(player.z - l) < 0.05));
check("no collapse from ordinary switching", state.metrics.projectionCollapses === 0);

console.log("\n11. Bridge snapshot contract");
let received = 0;
const off = bridge.subscribe(() => {
  received += 1;
});
setMode("firstPerson");
const snap = bridge.getSnapshot();
off();
check("subscribers are notified", received > 0);
check("snapshot reports mode", snap.mode === "firstPerson");
check("snapshot reports core total", snap.totalCores === CORES.length);
check("snapshot metrics are a copy", snap.metrics !== state.metrics);
check(
  "snapshot per-mode time is a copy",
  snap.metrics.modeTimeMs !== state.metrics.modeTimeMs,
);
check("snapshot reports Focus", snap.focusMax === FOCUS.max && typeof snap.focus === "number");
check("snapshot reports projection stability", typeof snap.projectionStable === "boolean");

console.log("\n12. Reset clears the pivot state too");
state.metrics.projectionCollapses = 3;
focus.value = 5;
resetRun(true);
check("Focus restored on reset", focus.value === FOCUS.max);
check("collapses cleared on reset", state.metrics.projectionCollapses === 0);
check("per-mode time cleared on reset", state.metrics.modeTimeMs.platformer === 0);
check("spawn restored", player.x === SPAWN[0] && player.z === SPAWN[2]);
check("solids untouched by the pivot", SOLIDS.some((s) => s.id === "facade"));

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
