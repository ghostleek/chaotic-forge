/** Single keyboard source of truth. Controllers read it; none of them own it. */

const pressed = new Set<string>();
let jumpQueuedAt = -1;
let pointerDx = 0;
let pointerDy = 0;

const JUMP_CODES = new Set(["Space", "ArrowUp", "KeyW"]);
const PREVENT = new Set([
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

function onKeyDown(e: KeyboardEvent) {
  if (isTypingTarget(e.target)) return;
  if (PREVENT.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  pressed.add(e.code);
  if (JUMP_CODES.has(e.code)) jumpQueuedAt = performance.now();
}

function onKeyUp(e: KeyboardEvent) {
  pressed.delete(e.code);
}

function clearAll() {
  pressed.clear();
  jumpQueuedAt = -1;
}

/** True while the player is dragging to look, used where pointer lock is blocked. */
let dragLooking = false;

function onMouseMove(e: MouseEvent) {
  if (document.pointerLockElement || dragLooking) {
    pointerDx += e.movementX;
    pointerDy += e.movementY;
  }
}

let installed = false;

export function installInput(): () => void {
  if (installed) return () => {};
  installed = true;
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearAll);
  window.addEventListener("mousemove", onMouseMove);
  return () => {
    installed = false;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clearAll);
    window.removeEventListener("mousemove", onMouseMove);
    clearAll();
  };
}

export const input = {
  isDown: (code: string) => pressed.has(code),
  /** -1 = left / forward-negative, +1 = right */
  axisX(): number {
    let v = 0;
    if (pressed.has("KeyA") || pressed.has("ArrowLeft")) v -= 1;
    if (pressed.has("KeyD") || pressed.has("ArrowRight")) v += 1;
    return v;
  },
  /** +1 = forward (W), -1 = back (S) */
  axisY(): number {
    let v = 0;
    if (pressed.has("KeyW") || pressed.has("ArrowUp")) v += 1;
    if (pressed.has("KeyS") || pressed.has("ArrowDown")) v -= 1;
    return v;
  },
  sprinting: () => pressed.has("ShiftLeft") || pressed.has("ShiftRight"),
  /** Consumes a buffered jump within the window. */
  takeJump(windowMs = 140): boolean {
    if (jumpQueuedAt < 0) return false;
    if (performance.now() - jumpQueuedAt > windowMs) {
      jumpQueuedAt = -1;
      return false;
    }
    jumpQueuedAt = -1;
    return true;
  },
  takePointerDelta(): [number, number] {
    const d: [number, number] = [pointerDx, pointerDy];
    pointerDx = 0;
    pointerDy = 0;
    return d;
  },
  reset: clearAll,
  isDragLooking: () => dragLooking,
  setDragLook(active: boolean) {
    dragLooking = active;
    pointerDx = 0;
    pointerDy = 0;
  },
  debugPressed: () => [...pressed],
};
