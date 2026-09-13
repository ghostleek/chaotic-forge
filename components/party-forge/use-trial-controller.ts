'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type {
  FrozenRound,
  RoomSnapshot,
  RuntimeSnapshot,
  PartyRuntime,
} from '../../lib/party-forge/contracts.ts';
import { RoomClient } from '../../lib/party-forge/client/room-client.ts';
import { TrialInputCapture } from '../../lib/party-forge/client/trial-input.ts';

type Status =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'countdown'
  | 'running'
  | 'complete'
  | 'sending'
  | 'accepted'
  | 'incomplete'
  | 'error';
export type TrialView = {
  status: Status;
  snapshot: RuntimeSnapshot | null;
  message: string;
  countdown: number;
  seconds: number;
  feedback: string;
};
const EMPTY: TrialView = {
  status: 'idle',
  snapshot: null,
  message: '',
  countdown: 0,
  seconds: 60,
  feedback: '',
};

/** One owner per mounted room; view changes cannot reset or add a simulation clock. */
class TrialController {
  private client: RoomClient;
  private state: TrialView = EMPTY;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private unsubscribe: (() => void) | undefined;
  private active = false;
  private generation = 0;
  private roundId: string | null = null;
  private runtime: PartyRuntime | null = null;
  private capture: TrialInputCapture | null = null;
  private round: FrozenRound | null = null;
  private attemptId = '';
  private receiptId: string | undefined;
  private submitted = false;
  private staleSubmissionRetries = 0;
  constructor(client: RoomClient) {
    this.client = client;
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.state;
  serverSnapshot = () => EMPTY;
  private update(value: Partial<TrialView>) {
    this.state = { ...this.state, ...value };
    this.listeners.forEach((fn) => fn());
  }
  start() {
    this.active = true;
    this.unsubscribe = this.client.subscribe(() => this.observe());
    this.observe();
    this.timer = setInterval(() => this.tick(), 25);
  }
  stop() {
    this.active = false;
    this.generation++;
    this.unsubscribe?.();
    clearInterval(this.timer);
    this.clearInput();
    if (this.state.status === 'loading') this.roundId = null;
    if (this.capture && this.capture.frames.length < 3600)
      this.update({
        status: 'incomplete',
        message:
          'This attempt was interrupted. Ask the host to abort and prepare a new round.',
      });
  }
  private async load(room: RoomSnapshot) {
    if (room.build.status !== 'playable' || !room.round) return;
    const generation = ++this.generation;
    this.roundId = room.round.roundId;
    this.capture = null;
    this.runtime = null;
    this.round = null;
    this.submitted = false;
    this.staleSubmissionRetries = 0;
    this.receiptId = this.client.snapshot().lastReceipt?.receipt.commandId;
    this.update({
      ...EMPTY,
      status: 'loading',
      message: 'Loading your game…',
    });
    try {
      const { createRetainedRuntime } =
        await import('../../lib/party-forge/runtime-registry.ts');
      const runtime = await createRetainedRuntime(
        room.build.manifest,
        room.round.seed,
      );
      if (!this.active || generation !== this.generation) return;
      const current = this.client.snapshot().room;
      if (current?.round?.roundId !== this.roundId || current.phase !== 'ready')
        throw new Error(
          'The round started before this browser finished loading. Ask the host to abort it.',
        );
      this.runtime = runtime;
      this.update({
        status: 'ready',
        snapshot: runtime.snapshot(),
        seconds: runtime.snapshot().state.kind === 'dino' ? 30 : 60,
        feedback: runtime.snapshot().state.kind === 'dino' ? 'JUMP · STOMP · EAT' : '',
        message:
          'Ready when you are.',
      });
    } catch (error) {
      if (this.active && generation === this.generation)
        this.update({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Executable loading failed.',
        });
    }
  }
  private observe() {
    if (!this.active) return;
    const clientState = this.client.snapshot();
    const room = clientState.room;
    if (!room) return;
    const receipt = clientState.lastReceipt;
    if (
      receipt?.type === 'submit-trial' &&
      receipt.roundId === room.round?.roundId &&
      receipt.receipt.commandId !== this.receiptId
    ) {
      this.receiptId = receipt.receipt.commandId;
      if (receipt.receipt.status === 'accepted')
        this.update({
          status: 'accepted',
          message:
            'Score confirmed. Waiting for the other players.',
        });
      else {
        // A known revision rejection can resend the same captured attempt against the fresh snapshot.
        // Unknown outcomes retain their original command identity in RoomClient.
        if (receipt.receipt.reason === 'stale-revision' && this.staleSubmissionRetries < 2) {
          this.staleSubmissionRetries++;
          this.submitted = false;
        }
        this.update({
          status:
            (this.capture?.frames.length === 3600 || this.runtime?.snapshot().state.gameOver === true) ? 'complete' : 'incomplete',
          message: `Submission rejected: ${receipt.receipt.reason}. The captured attempt has not been restarted.`,
        });
      }
    }
    if (room.phase === 'ready' && room.round?.roundId !== this.roundId) {
      void this.load(room);
      return;
    }
    if (
      room.phase === 'playing' &&
      this.capture &&
      room.round?.roundId !== this.round?.roundId
    ) {
      this.generation++;
      this.capture = null;
      this.runtime = null;
      this.round = null;
      this.update({
        status: 'incomplete',
        message:
          'This browser missed preparation for the new round. Ask the host to abort and retry.',
      });
      return;
    }
    if (room.phase !== 'playing') {
      if (this.capture) this.clearInput();
      return;
    }
    if (!room.round || this.capture || this.state.status === 'accepted') return;
    if (
      this.roundId !== room.round.roundId ||
      !this.runtime ||
      this.state.status !== 'ready'
    ) {
      if (this.state.status !== 'loading')
        this.update({
          status: 'incomplete',
          message:
            'This browser has no continuous attempt for the active round. Retry a pending completed submission above, or ask the host to abort the round.',
        });
      return;
    }
    const serverNow = this.client.serverNow();
    if (serverNow === null) {
      this.update({
        status: 'incomplete',
        message:
          'Could not synchronize the round clock. Ask the host to abort and retry.',
      });
      return;
    }
    if (serverNow >= room.round.startsAt) {
      this.update({
        status: 'incomplete',
        message:
          'The start was missed. No idle input or replay will be invented; ask the host to abort and retry.',
      });
      return;
    }
    this.round = room.round;
    this.attemptId = crypto.randomUUID();
    this.capture = new TrialInputCapture(
      performance.now() + room.round.startsAt - serverNow,
      this.state.snapshot?.state.kind === 'dino' ? 17 : 0,
    );
    this.update({
      status: 'countdown',
      message: this.state.snapshot?.state.kind === 'dino' ? 'Starting together. Space, Up or Jump to leap.' : 'Starting together. Use the arrows or direction pad.',
    });
  }
  private tick() {
    if (
      !this.active ||
      !this.capture ||
      !this.runtime ||
      !this.round ||
      this.client.snapshot().room?.phase !== 'playing'
    )
      return;
    if (!['countdown', 'running', 'complete'].includes(this.state.status))
      return;
    const now = performance.now();
    const serverNow = this.client.serverNow();
    const projectedServer = this.round.startsAt + now - this.capture.start;
    // Pixel rounds keep the monotonic start anchor. Poll latency is not a clock interruption.
    if (!['pixel', 'dino'].includes(String(this.state.snapshot?.state.kind)) && this.capture.frames.length < 3600 && serverNow !== null && Math.abs(serverNow - projectedServer) > 500) {
      this.clearInput();
      this.update({
        status: 'incomplete',
        message:
          'The clock was interrupted or changed. This attempt cannot continue; ask the host to abort and retry.',
      });
      return;
    }
    if (serverNow !== null && serverNow >= this.round.submissionDeadline)
      this.clearInput();
    if (now < this.capture.start) {
      this.update({ countdown: Math.ceil((this.capture.start - now) / 1000) });
      return;
    }
    try {
      const due = this.capture.due(now);
      let feedback = this.state.feedback;
      while (this.capture.frames.length < due && this.runtime.snapshot().state.gameOver !== true) {
        this.runtime.input(this.capture.next());
        const step = this.runtime.step();
        if (step.state.kind === 'pixel' || step.state.kind === 'dino') feedback = String(step.state.feedback);
        else {
          const events = step.state.events as { type: string }[] | undefined;
          const last = events?.at(-1);
          if (last) feedback = last.type.replaceAll('_', ' ');
        }
      }
      const snapshot = this.runtime.snapshot();
      const complete = snapshot.completed || snapshot.state.gameOver === true;
      const gameOver = snapshot.state.gameOver === true;
      if (gameOver) this.clearInput();
      this.update({
        snapshot,
        feedback,
        status: complete ? 'complete' : 'running',
        seconds: Math.max(0, Math.ceil(((snapshot.state.kind === 'dino' ? 1800 : 3600) - snapshot.tick) / 60)),
        countdown: 0,
        message: complete
          ? 'Round complete. Confirming scores…'
          : gameOver ? 'Your score is locked. Waiting for the other players.' : '',
      });
      if (
        complete &&
        !this.submitted &&
        (gameOver || (this.client.serverNow() ?? 0) >= this.round.submissionDeadline + 250) &&
        this.client.snapshot().connected
      )
        void this.submit();
    } catch (error) {
      this.clearInput();
      this.update({
        status: 'incomplete',
        message:
          error instanceof Error
            ? error.message
            : 'Input capture failed. Abort this round.',
      });
    }
  }
  async ready() {
    const room = this.client.snapshot().room;
    if (
      !this.active ||
      this.state.status !== 'ready' ||
      !this.runtime ||
      room?.phase !== 'ready' ||
      room.build.status !== 'playable'
    )
      return;
    for (let attempt = 0; attempt < 2; attempt++) {
      await this.client.command({
        type: 'acknowledge-build',
        buildId: room.build.manifest.buildId,
        buildHash: room.build.manifest.contentHash,
      });
      const current = this.client.snapshot();
      const receipt = current.lastReceipt;
      if (!this.active || receipt?.type !== 'acknowledge-build' ||
          receipt.receipt.status !== 'rejected' || receipt.receipt.reason !== 'stale-revision' ||
          current.room?.phase !== 'ready' || current.room.build.status !== 'playable' ||
          current.room.build.manifest.contentHash !== room.build.manifest.contentHash) break;
      // Both players may press Ready together. Only a known rejected revision is retried.
    }
  }
  async submit() {
    const state = this.client.snapshot();
    if (
      !this.active ||
      !this.capture ||
      !this.round ||
      (this.capture.frames.length !== 3600 && this.runtime?.snapshot().state.gameOver !== true) ||
      state.pending ||
      state.uncertain ||
      !state.connected
    )
      return;
    if ((this.client.serverNow() ?? Infinity) > this.round.transportDeadline) {
      this.submitted = true;
      this.update({
        status: 'incomplete',
        message:
          'The original submission deadline has passed. Ask the host to abort this round.',
      });
      return;
    }
    this.submitted = true;
    this.update({
      status: 'sending',
      message: 'Confirming your score…',
    });
    await this.client.command({
      type: 'submit-trial',
      trial: this.capture.trial(this.round, this.attemptId, this.capture.frames.length < 3600),
    });
    if (this.active && this.state.status === 'sending')
      this.update({
        message:
          'Submission outcome is uncertain. Use Retry previous request; it reuses this exact attempt.',
      });
  }
  reloadBuild() {
    const room = this.client.snapshot().room;
    if (this.active && room?.phase === 'ready') void this.load(room);
  }
  private acceptsInput() {
    return (
      this.active &&
      !!this.round &&
      this.state.snapshot?.state.gameOver !== true &&
      ['running', 'countdown'].includes(this.state.status) &&
      (this.client.serverNow() ?? Infinity) < this.round.submissionDeadline
    );
  }
  buttons(value: number) {
    if (this.acceptsInput())
      this.capture?.change(performance.now(), { buttons: value });
  }
  held() {
    return this.capture?.held() ?? 0;
  }
  look(dx: number, dy: number) {
    if (this.acceptsInput()) this.capture?.look(performance.now(), dx, dy);
  }
  clearInput() {
    this.capture?.clear(performance.now());
  }
}

export function useTrialController(client: RoomClient) {
  const [controller] = useState(() => new TrialController(client));
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.serverSnapshot,
  );
  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);
  return { controller, view };
}
