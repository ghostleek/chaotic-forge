import { z } from 'zod';
import {
  PROTOCOL_VERSION,
  roomSnapshotSchema,
  commandReceiptSchema,
  type ParticipantAccess,
  type CommandReceipt,
  type RoomCommand,
  type RoomSnapshot,
} from '../contracts.ts';

export type Action = RoomCommand extends infer C
  ? C extends RoomCommand
    ? Omit<C, 'protocolVersion' | 'commandId' | 'expectedRevision'>
    : never
  : never;
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Pending = { url: string; capability: string; body: unknown };
export type ClientState = {
  room: RoomSnapshot | null;
  access: ParticipantAccess | null;
  pending: boolean;
  uncertain: boolean;
  connected: boolean;
  terminal: boolean;
  lastReceipt: {
    type: RoomCommand['type'];
    roundId: string | null;
    receipt: CommandReceipt;
  } | null;
  error: string | null;
};
const replySchema = z.object({
  snapshot: roomSnapshotSchema.optional(),
  receipt: commandReceiptSchema.optional(),
  error: z.string().optional(),
  access: z
    .object({
      roomId: z.string(),
      participantId: z.string(),
      capability: z.string(),
    })
    .optional(),
});
const EMPTY: ClientState = {
  room: null,
  access: null,
  pending: false,
  uncertain: false,
  connected: false,
  terminal: false,
  lastReceipt: null,
  error: null,
};

/** Capabilities stay in tab-scoped storage, never invitation URLs or snapshots. */
export class RoomClient {
  state = EMPTY;
  private listeners = new Set<() => void>();
  private storage: Storage | null = null;
  private key: string;
  private request: Pending | null = null;
  private active = false;
  private polling = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private controllers = new Set<AbortController>();
  private roomId?: string;
  private transport: typeof fetch;
  private clock: { server: number; local: number } | null = null;
  serverNow = () =>
    this.clock
      ? this.clock.server + performance.now() - this.clock.local
      : null;
  constructor(
    roomId?: string,
    transport: typeof fetch = (...args) => fetch(...args),
  ) {
    this.roomId = roomId;
    this.transport = transport;
    this.key = `party-forge/1:${roomId ?? 'enrollment'}`;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.state;
  serverSnapshot = () => EMPTY;
  private update(value: Partial<ClientState>) {
    this.state = { ...this.state, ...value };
    this.listeners.forEach((fn) => fn());
  }
  private persist() {
    this.storage?.setItem(
      this.key,
      JSON.stringify({ access: this.state.access, request: this.request }),
    );
  }
  start(storage: Storage) {
    this.storage = storage;
    this.active = true;
    try {
      const saved = JSON.parse(storage.getItem(this.key) ?? 'null');
      if (
        saved?.access &&
        saved.access.roomId === this.roomId &&
        typeof saved.access.capability === 'string'
      )
        this.update({ access: saved.access });
      if (saved?.request) {
        this.request = saved.request;
        this.update({
          uncertain: true,
          error: 'An earlier request needs confirmation. Retry it safely.',
        });
      }
    } catch {
      this.update({
        error: 'Browser storage is unavailable. Reconnect cannot be retained.',
      });
    }
    void this.poll();
  }
  stop() {
    this.active = false;
    clearTimeout(this.timer);
    this.controllers.forEach((c) => c.abort());
    this.update({ pending: false });
  }
  private accept(value: unknown) {
    const room = roomSnapshotSchema.parse(value);
    if (this.roomId && room.roomId !== this.roomId)
      throw new Error('Room identity mismatch.');
    if (!this.state.room || room.revision >= this.state.room.revision)
      this.update({ room });
  }
  private async http(url: string, capability: string, body?: unknown) {
    const controller = new AbortController();
    this.controllers.add(controller);
    const sentAt = performance.now();
    const timeout = setTimeout(() => controller.abort(), body ? 70_000 : 15_000);
    try {
      const response = await this.transport(url, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${capability}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
        signal: controller.signal,
      });
      const data = replySchema.parse(await response.json());
      // GET refreshes this participant's server heartbeat. The midpoint bounds request latency.
      const seen =
        !body &&
        data.snapshot?.participants.find(
          (p) => p.id === this.state.access?.participantId,
        )?.lastSeenAt;
      const pixel = data.snapshot?.build.status === 'playable' && data.snapshot.build.manifest.catalogVersion === 'pixel-arcade/1';
      const serverTime = Number(response.headers.get('x-party-server-time'));
      // Processing time is not network transit. Anchor to response time, then keep
      // the active pixel round's monotonic clock fixed despite slow later polls.
      if (pixel && Number.isSafeInteger(serverTime) && serverTime > 0) {
        if (!this.clock || data.snapshot?.phase !== 'playing')
          this.clock = {server: serverTime, local: performance.now()};
      } else if (response.ok && typeof seen === 'number' && !(pixel && data.snapshot?.phase === 'playing' && this.clock)) {
        this.clock = { server: seen, local: (sentAt + performance.now()) / 2 };
      }
      return { response, data };
    } finally {
      clearTimeout(timeout);
      this.controllers.delete(controller);
    }
  }
  async poll() {
    if (!this.active || this.polling || !this.state.access) return;
    this.polling = true;
    clearTimeout(this.timer);
    try {
      const { response, data } = await this.http(
        `/api/party/rooms/${this.state.access.roomId}`,
        this.state.access.capability,
      );
      if (!this.active) return;
      if (response.status === 403 || response.status === 404)
        this.update({ terminal: true });
      if (!response.ok)
        throw new Error(data.error ?? `Room unavailable (${response.status}).`);
      this.accept(data.snapshot);
      this.update({ connected: true });
    } catch (error) {
      if (this.active)
        this.update({
          connected: false,
          error:
            error instanceof Error
              ? error.message
              : 'Room updates interrupted.',
        });
    } finally {
      this.polling = false;
      if (this.active && !this.state.terminal)
        this.timer = setTimeout(
          () => void this.poll(),
          this.state.room?.phase === 'ready'
            ? 300
            : this.state.room?.phase === 'playing'
              ? 1000
              : 4000,
        );
    }
  }
  forgetAccess() {
    if (this.request || this.state.pending) return;
    try {
      this.storage?.removeItem(this.key);
      this.update({ ...EMPTY });
    } catch {
      this.update({ error: 'Cannot clear browser storage.' });
    }
  }
  async enroll(nickname: string) {
    if (!this.active || this.state.pending || this.request) return;
    const capability = Array.from(
      crypto.getRandomValues(new Uint8Array(32)),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    this.request = {
      url: `/api/party/rooms${this.roomId ? `/${this.roomId}` : ''}`,
      capability,
      body: {
        protocolVersion: PROTOCOL_VERSION,
        commandId: crypto.randomUUID(),
        nickname,
        ...(!this.roomId ? { setup: { kind: 'fresh' } } : {}),
      },
    };
    await this.retry();
  }
  async command(action: Action) {
    if (
      !this.active ||
      this.state.pending ||
      this.request ||
      !this.state.access ||
      !this.state.room ||
      !this.state.connected
    )
      return;
    this.request = {
      url: `/api/party/rooms/${this.state.access.roomId}/commands`,
      capability: this.state.access.capability,
      body: {
        ...action,
        protocolVersion: PROTOCOL_VERSION,
        commandId: crypto.randomUUID(),
        expectedRevision: this.state.room.revision,
      },
    };
    await this.retry();
  }
  async retry() {
    if (!this.active || !this.request || this.state.pending) return;
    this.update({ pending: true, error: null });
    try {
      this.persist(); // Do not send if recovery storage cannot retain the exact request.
      const { response, data } = await this.http(
        this.request.url,
        this.request.capability,
        this.request.body,
      );
      if (!this.active) return;
      if (data.receipt) {
        const receipt = commandReceiptSchema.parse(data.receipt);
        if (receipt.commandId !== (this.request.body as RoomCommand).commandId)
          throw new Error('Receipt identity mismatch.');
        if (data.snapshot) this.accept(data.snapshot);
        this.storage?.setItem(
          this.key,
          JSON.stringify({ access: this.state.access, request: null }),
        );
        const command = this.request.body as RoomCommand;
        const type = command.type;
        const roundId =
          command.type === 'submit-trial' ? command.trial.roundId : null;
        this.request = null;
        this.update({
          lastReceipt: { type, roundId, receipt },
          uncertain: false,
          connected: true,
          error:
            receipt.status === 'rejected'
              ? `Not accepted: ${receipt.reason}. Review the current room and choose again.`
              : null,
        });
      } else if (response.ok && data.access) {
        this.accept(data.snapshot);
        const access = data.access as ParticipantAccess;
        if (
          access.capability !== this.request.capability ||
          access.roomId !== this.state.room?.roomId
        )
          throw new Error('Enrollment identity mismatch.');
        const nextKey = `party-forge/1:${access.roomId}`;
        this.storage?.setItem(
          nextKey,
          JSON.stringify({ access, request: null }),
        );
        if (nextKey !== this.key) this.storage?.removeItem(this.key);
        this.roomId = access.roomId;
        this.key = nextKey;
        this.request = null;
        this.update({ access, uncertain: false, connected: true });
      } else if (response.status >= 400 && response.status < 500) {
        this.storage?.setItem(
          this.key,
          JSON.stringify({ access: this.state.access, request: null }),
        );
        this.request = null;
        this.update({
          uncertain: false,
          error: data.error ?? `Not accepted (${response.status}).`,
        });
      } else throw new Error(data.error ?? 'Request outcome unknown.');
    } catch (error) {
      if (this.active)
        this.update({
          uncertain: true,
          error: `${error instanceof Error ? error.message : 'Connection interrupted.'} Retry the same request.`,
        });
    } finally {
      if (this.active) {
        this.update({ pending: false });
        void this.poll();
      }
    }
  }
}
