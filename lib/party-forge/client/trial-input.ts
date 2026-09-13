import {
  DEMO_POLICY,
  PROTOCOL_VERSION,
  type FrozenRound,
  type RuntimeInput,
  type TrialInput,
} from '../contracts.ts';
import { BUTTONS } from '../runtimes/kitchen-chaos-v1/retained/engine.js';

export const KEY_BUTTONS: Readonly<Record<string, number>> = {
  KeyW: BUTTONS.forward,
  ArrowUp: BUTTONS.forward,
  KeyS: BUTTONS.back,
  ArrowDown: BUTTONS.back,
  KeyA: BUTTONS.left,
  KeyD: BUTTONS.right,
  Space: BUTTONS.shoot,
  KeyE: BUTTONS.interact,
};
export const wrapYaw = (yaw: number) =>
  Math.atan2(Math.sin(yaw), Math.cos(yaw));
const clampPitch = (pitch: number) =>
  Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
type Controls = Omit<RuntimeInput, 'tick'>;

/** Sample control changes at fixed tick boundaries, never backfill a stall with new input. */
export class TrialInputCapture {
  private current: Controls = { buttons: 0, yaw: 0, pitch: 0 };
  private sampled: Controls = { ...this.current };
  private changes = new Map<number, Controls>();
  readonly frames: RuntimeInput[] = [];
  readonly start: number;
  constructor(start: number) {
    this.start = start;
  }
  change(at: number, controls: Partial<Controls>) {
    this.current = { ...this.current, ...controls };
    this.current.yaw = wrapYaw(this.current.yaw);
    this.current.pitch = clampPitch(this.current.pitch);
    const tick = Math.max(
      this.frames.length,
      0,
      Math.ceil(((at - this.start) * 60) / 1000),
    );
    if (tick < DEMO_POLICY.trialTicks)
      this.changes.set(tick, { ...this.current });
  }
  clear(at: number) {
    this.change(at, { buttons: 0 });
  }
  look(at: number, dx: number, dy: number) {
    this.change(at, {
      yaw: this.current.yaw + dx,
      pitch: this.current.pitch + dy,
    });
  }
  held() {
    return this.current.buttons;
  }
  due(at: number) {
    return Math.min(
      DEMO_POLICY.trialTicks,
      Math.max(0, Math.floor(((at - this.start) * 60) / 1000)),
    );
  }
  next(): RuntimeInput {
    const tick = this.frames.length;
    if (tick >= DEMO_POLICY.trialTicks)
      throw new Error('This trace is complete.');
    const change = this.changes.get(tick);
    if (change) {
      this.sampled = change;
      this.changes.delete(tick);
    }
    const frame = { tick, ...this.sampled };
    this.frames.push(frame);
    return frame;
  }
  trial(round: FrozenRound, attemptId: string, endedEarly = false): TrialInput {
    if (this.frames.length !== DEMO_POLICY.trialTicks && !(endedEarly && this.frames.length > 0))
      throw new Error('An incomplete trace cannot be submitted.');
    return {
      protocolVersion: PROTOCOL_VERSION,
      roundId: round.roundId,
      buildId: round.buildId,
      buildHash: round.buildHash,
      attemptId,
      seed: round.seed,
      ...(endedEarly ? {endedEarly: true as const} : {}),
      frames: this.frames.map((frame) => ({ ...frame })),
    };
  }
}
