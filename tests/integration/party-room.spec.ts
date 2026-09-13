import { expect, test, type Page } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  PROTOCOL_VERSION,
  commandReceiptSchema,
  gameHistorySchema,
  roomSnapshotSchema,
  type BuildManifest,
  type CommandReceipt,
  type FrozenRound,
  type ParticipantAccess,
  type RoomCommand,
  type RoomSnapshot,
  type TrialInput,
} from '../../lib/party-forge/contracts.ts';
import { recipeFromContributions } from '../../lib/party-forge/cards.ts';
import {
  createRuntime,
  replayRuntime,
  stepRuntime,
} from '../../lib/party-forge/runtimes/kitchen-chaos-v1/engine.ts';
import { createCompletingWitness } from '../fixtures/party-builds/kitchen-chaos-v1.mjs';
import {
  migrateLocal,
  prepareHostConfig,
  startHost,
  hostEnvironment,
} from '../../scripts/party-host-process.mjs';

type HttpReply<T> = { status: number; body: T };
type CommandResponse = { receipt: CommandReceipt; snapshot: RoomSnapshot };
type RoomResponse = {
  snapshot: RoomSnapshot;
  history: ReturnType<typeof gameHistorySchema.parse>[];
  historyCount: number;
  historyCursor: number | null;
};
type AccessResponse = { access: ParticipantAccess; snapshot: RoomSnapshot };
type CommandAction = RoomCommand extends infer Command
  ? Command extends RoomCommand
    ? Omit<Command, 'protocolVersion' | 'commandId' | 'expectedRevision'>
    : never
  : never;

/** Requests execute in each isolated browser, against the built production routes. */
async function http<T>(
  page: Page,
  path: string,
  method: 'GET' | 'POST',
  capability?: string,
  body?: unknown,
): Promise<HttpReply<T>> {
  return page.evaluate(
    async ({ path, method, capability, body }) => {
      const response = await fetch(path, {
        method,
        headers: {
          ...(capability ? { authorization: `Bearer ${capability}` } : {}),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: (await response.json()) as T };
    },
    { path, method, capability, body },
  );
}

function envelope(action: CommandAction, revision: number): RoomCommand {
  return {
    protocolVersion: PROTOCOL_VERSION,
    commandId: randomUUID(),
    expectedRevision: revision,
    ...action,
  };
}

async function executeLocalSql(config: string, persistTo: string, sql: string) {
  const child = spawn(
    process.execPath,
    [
      resolve('node_modules/wrangler/bin/wrangler.js'),
      'd1',
      'execute',
      'DB',
      '--local',
      '--config',
      config,
      '--persist-to',
      persistTo,
      '--command',
      sql,
    ],
    { env: hostEnvironment, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const [code] = await once(child, 'exit');
  expect(code, output).toBe(0);
}

/**
 * Authored automated local traces, never human or external playtest evidence.
 * These fixtures use only legal control frames. The server derives every score.
 */
function trialsFor(round: FrozenRound, build: BuildManifest): TrialInput[] {
  const recipe = recipeFromContributions(build.contributions);
  const completing = createCompletingWitness(recipe, round.seed).frames;
  const neutral = Array.from({ length: 3600 }, (_, tick) => ({
    tick,
    buttons: 0,
    yaw: 0,
    pitch: 0,
  }));
  let cooking = createRuntime(recipe, round.seed);
  let cookStartedAt = 0;
  for (const frame of completing) {
    cooking = stepRuntime(cooking, frame);
    if (cooking.stove.readyAtTick !== null) {
      cookStartedAt = cooking.tick;
      break;
    }
  }
  expect(cookStartedAt).toBeGreaterThan(0);
  // Leave the first order on the stove until it burns; no fabricated score.
  const burning = neutral.map((frame, tick) =>
    tick < cookStartedAt ? completing[tick] : frame,
  );
  const frames = [completing, neutral, burning];
  expect(
    frames.map((input) => {
      const { metrics } = replayRuntime(recipe, round.seed, input);
      return [metrics.completedOrders, metrics.failedOrders];
    }),
  ).toEqual([
    [1, 0],
    [0, 0],
    [0, 1],
  ]);
  return frames.map((input) => ({
    protocolVersion: PROTOCOL_VERSION,
    roundId: round.roundId,
    buildId: round.buildId,
    buildHash: round.buildHash,
    attemptId: randomUUID(),
    seed: round.seed,
    frames: input,
  }));
}

test('room authority over built Worker/D1: three browsers, actual deadlines, evolution, absence and restart', async ({
  browser,
}) => {
  test.setTimeout(300_000);
  await mkdir('.wrangler', { recursive: true });
  const directory = await mkdtemp(resolve('.wrangler/party-room-proof-'));
  const persistTo = resolve(directory, 'state');
  const config = await prepareHostConfig({ directory });
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  let host: Awaited<ReturnType<typeof startHost>> | undefined;
  const capabilities = [0, 1, 2].map(() => randomBytes(32).toString('hex'));
  const accesses: ParticipantAccess[] = [];
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  let roomPath = '';

  async function read(index: number): Promise<RoomResponse> {
    const response = await http<RoomResponse>(
      pages[index],
      roomPath,
      'GET',
      capabilities[index],
    );
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    response.body.snapshot = roomSnapshotSchema.parse(response.body.snapshot);
    response.body.history.forEach((entry) => gameHistorySchema.parse(entry));
    const publicState = JSON.stringify(response.body);
    for (const secret of capabilities)
      expect(publicState).not.toContain(secret);
    return response.body;
  }

  async function post(
    index: number,
    command: RoomCommand,
  ): Promise<HttpReply<CommandResponse>> {
    const response = await http<CommandResponse>(
      pages[index],
      `${roomPath}/commands`,
      'POST',
      capabilities[index],
      command,
    );
    if (response.status === 200 || response.status === 409) {
      response.body.snapshot = roomSnapshotSchema.parse(response.body.snapshot);
      response.body.receipt = commandReceiptSchema.parse(response.body.receipt);
    }
    return response;
  }

  async function act(
    index: number,
    action: CommandAction,
    status = 200,
  ): Promise<CommandResponse> {
    const current = await read(index);
    const response = await post(
      index,
      envelope(action, current.snapshot.revision),
    );
    expect(response.status, JSON.stringify(response.body)).toBe(status);
    expect(response.body.receipt.status).toBe(
      status === 200 ? 'accepted' : 'rejected',
    );
    return response.body;
  }

  async function waitWithPresence(deadline: number, active = [0, 1, 2]) {
    // Genuine Worker wall time is retained. Polls keep only the specified clients present.
    while (Date.now() < deadline) {
      for (const index of active) await read(index);
      const remaining = deadline - Date.now();
      if (remaining > 0)
        await new Promise((done) =>
          setTimeout(done, Math.min(4000, remaining)),
        );
    }
    for (const index of active) await read(index);
  }

  async function startRound(): Promise<{
    round: FrozenRound;
    build: BuildManifest;
  }> {
    const ready = (await read(0)).snapshot;
    expect(ready.phase).toBe('ready');
    expect(ready.build.status).toBe('playable');
    if (ready.build.status !== 'playable')
      throw new Error('Ready needs a playable build');
    const manifest = ready.build.manifest;
    const wrongAcknowledgment = await act(
      1,
      {
        type: 'acknowledge-build',
        buildId: manifest.buildId,
        buildHash: `sha256:${'0'.repeat(64)}`,
      },
      409,
    );
    expect(wrongAcknowledgment.snapshot.acknowledgments).toHaveLength(0);
    for (let index = 0; index < 3; index += 1) {
      await act(index, {
        type: 'acknowledge-build',
        buildId: manifest.buildId,
        buildHash: manifest.contentHash,
      });
    }
    await act(1, { type: 'start-round' }, 409);
    const { snapshot } = await act(0, { type: 'start-round' });
    expect(snapshot.phase).toBe('playing');
    const round = snapshot.round!;
    expect(round.roster).toEqual(
      accesses.map((access) => access.participantId),
    );
    expect(round.submissionDeadline - round.startsAt).toBe(60_000);
    expect(round.transportDeadline - round.submissionDeadline).toBe(30_000);
    for (const index of [1, 2])
      expect((await read(index)).snapshot.round).toEqual(round);
    return { round, build: manifest };
  }

  async function completeRound(
    round: FrozenRound,
    trials: TrialInput[],
    historyCount: number,
  ) {
    await waitWithPresence(round.submissionDeadline + 100);
    // Validate the frozen envelope while otherwise eligible to submit; an early
    // deadline rejection alone would not prove recipe/seed authority.
    await act(
      1,
      {
        type: 'submit-trial',
        trial: { ...trials[1], seed: (trials[1].seed + 1) >>> 0 },
      },
      409,
    );
    await act(
      1,
      {
        type: 'submit-trial',
        trial: { ...trials[1], buildHash: `sha256:${'0'.repeat(64)}` },
      },
      409,
    );
    const first = envelope(
      { type: 'submit-trial', trial: trials[0] },
      (await read(0)).snapshot.revision,
    );
    const accepted = await post(0, first);
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    await act(1, { type: 'submit-trial', trial: trials[1] });
    const finalRevision = (await read(2)).snapshot.revision;
    const finalCommands = [0, 1].map(() =>
      envelope({ type: 'submit-trial', trial: trials[2] }, finalRevision),
    );
    const raced = await Promise.all(
      finalCommands.map((command) => post(2, command)),
    );
    expect(
      raced.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([200, 409]);
    const finalCommand =
      finalCommands[raced.findIndex((response) => response.status === 200)];
    const finalReceipt = raced.find((response) => response.status === 200)!.body
      .receipt;
    const duplicate = await post(2, finalCommand);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.receipt).toEqual(finalReceipt);
    const oldDuplicate = await post(0, first);
    expect(oldDuplicate.status).toBe(200);
    expect(oldDuplicate.body.receipt).toEqual(accepted.body.receipt);
    const differentAttempt = { ...trials[0], attemptId: randomUUID() };
    await act(0, { type: 'submit-trial', trial: differentAttempt }, 409);
    const result = await read(0);
    expect(result.snapshot.phase).toBe('results');
    expect(result.historyCount).toBe(historyCount);
    expect(result.history).toHaveLength(historyCount);
    const completed = result.snapshot.lastCompleted!;
    expect(
      completed.results.map((score) => [
        score.participantId,
        score.completedOrders,
        score.failedOrders,
        score.rank,
      ]),
    ).toEqual([
      [accesses[0].participantId, 1, 0, 1],
      [accesses[1].participantId, 0, 0, 2],
      [accesses[2].participantId, 0, 1, 3],
    ]);
    expect(completed.editors.winner).toBe(accesses[0].participantId);
    expect(completed.editors.loser).toBe(accesses[2].participantId);
    for (const index of [1, 2]) {
      const observed = await read(index);
      expect(observed.snapshot.lastCompleted).toEqual(completed);
      expect(observed.history).toEqual(result.history);
    }
    return result;
  }

  try {
    await migrateLocal(config, persistTo);
    host = await startHost({ config, persistTo, port: 3109 });
    for (const page of pages) await page.goto(host.baseURL);
    const createBody = {
      protocolVersion: PROTOCOL_VERSION,
      commandId: randomUUID(),
      nickname: 'Winner',
      setup: { kind: 'fresh' },
    };
    const create = await http<AccessResponse>(
      pages[0],
      '/api/party/rooms',
      'POST',
      capabilities[0],
      createBody,
    );
    expect(create.status, JSON.stringify(create.body)).toBe(201);
    accesses.push(create.body.access);
    roomPath = `/api/party/rooms/${create.body.access.roomId}`;
    const createAgain = await http<AccessResponse>(
      pages[0],
      '/api/party/rooms',
      'POST',
      capabilities[0],
      createBody,
    );
    expect([200, 201]).toContain(createAgain.status);
    expect(createAgain.body.access).toEqual(create.body.access);
    for (const index of [1, 2]) {
      const body = {
        protocolVersion: PROTOCOL_VERSION,
        commandId: randomUUID(),
        nickname: index === 1 ? 'Middle' : 'Loser',
      };
      const join = await http<AccessResponse>(
        pages[index],
        roomPath,
        'POST',
        capabilities[index],
        body,
      );
      expect(join.status, JSON.stringify(join.body)).toBe(201);
      accesses.push(join.body.access);
      const retry = await http<AccessResponse>(
        pages[index],
        roomPath,
        'POST',
        capabilities[index],
        body,
      );
      expect([200, 201]).toContain(retry.status);
      expect(retry.body.access).toEqual(join.body.access);
    }
    expect(new Set(accesses.map((access) => access.participantId)).size).toBe(
      3,
    );
    expect((await read(0)).snapshot.participants).toHaveLength(3);

    await test.step('capabilities and strict HTTP inputs prevent impersonation', async () => {
      expect((await http(pages[0], roomPath, 'GET')).status).toBe(403);
      expect(
        (await http(pages[0], roomPath, 'GET', randomBytes(32).toString('hex')))
          .status,
      ).toBe(403);
      const otherSecret = randomBytes(32).toString('hex');
      const other = await http<AccessResponse>(
        pages[0],
        '/api/party/rooms',
        'POST',
        otherSecret,
        { ...createBody, commandId: randomUUID() },
      );
      expect(other.status).toBe(201);
      expect(
        (
          await http(
            pages[0],
            `/api/party/rooms/${other.body.access.roomId}`,
            'GET',
            capabilities[0],
          )
        ).status,
      ).toBe(403);
      expect((await http(pages[0], roomPath, 'GET', otherSecret)).status).toBe(
        403,
      );
      const revision = (await read(0)).snapshot.revision;
      const forged = await http(
        pages[1],
        `${roomPath}/commands`,
        'POST',
        capabilities[1],
        {
          ...envelope(
            {
              type: 'choose-initial',
              choice: { slot: 'fps', cardId: 'knockback' },
            },
            revision,
          ),
          participantId: accesses[0].participantId,
        },
      );
      expect(forged.status).toBe(400);
      expect((await read(0)).snapshot.revision).toBe(revision);
    });

    await test.step('revision races and replayed receipts keep one initial contribution per member', async () => {
      const revision = (await read(0)).snapshot.revision;
      const choices = [
        {
          type: 'choose-initial',
          choice: { slot: 'fps', cardId: 'knockback' },
        },
        {
          type: 'choose-initial',
          choice: { slot: 'zombies', cardId: 'pursuers' },
        },
      ] as const;
      const commands = choices.map((action) => envelope(action, revision));
      const race = await Promise.all(
        commands.map((command, index) => post(index, command)),
      );
      expect(
        race.map((response) => response.status).sort((a, b) => a - b),
      ).toEqual([200, 409]);
      const rejectedIndex = race.findIndex(
        (response) => response.status === 409,
      );
      expect(
        (await post(rejectedIndex, commands[rejectedIndex])).body.receipt,
      ).toEqual(race[rejectedIndex].body.receipt);
      await act(rejectedIndex, choices[rejectedIndex]);
      await act(2, {
        type: 'choose-initial',
        choice: { slot: 'cooking', cardId: 'quick-orders' },
      });
      const snapshot = (await read(0)).snapshot;
      expect(snapshot.phase).toBe('ready');
      expect(snapshot.contributions).toHaveLength(3);
      expect(
        new Set(
          snapshot.contributions.map(
            (contribution) => contribution.participantId,
          ),
        ).size,
      ).toBe(3);
    });

    const first = await startRound();
    const firstTrials = trialsFor(first.round, first.build);
    await test.step('only bounded traces for the frozen version, after real sixty seconds, can score', async () => {
      const early = await act(
        0,
        { type: 'submit-trial', trial: firstTrials[0] },
        409,
      );
      expect(early.receipt.status === 'rejected' && early.receipt.reason).toBe(
        'deadline',
      );
      await act(1, { type: 'add-mechanic', cardId: 'dinner-bell' }, 409);
      const revision = (await read(1)).snapshot.revision;
      const malformed = await http(
        pages[1],
        `${roomPath}/commands`,
        'POST',
        capabilities[1],
        {
          ...envelope(
            { type: 'submit-trial', trial: firstTrials[1] },
            revision,
          ),
          trial: { ...firstTrials[1], frames: firstTrials[1].frames.slice(1) },
        },
      );
      expect(malformed.status).toBe(400);
      const claimed = await http(
        pages[1],
        `${roomPath}/commands`,
        'POST',
        capabilities[1],
        {
          ...envelope(
            { type: 'submit-trial', trial: firstTrials[1] },
            revision,
          ),
          completedOrders: 999,
        },
      );
      expect(claimed.status).toBe(400);
      const changed = await act(
        1,
        {
          type: 'submit-trial',
          trial: { ...firstTrials[1], seed: (firstTrials[1].seed + 1) >>> 0 },
        },
        409,
      );
      expect(changed.snapshot.lastCompleted).toBeNull();
    });
    const firstCompleted = await completeRound(first.round, firstTrials, 1);
    expect(firstCompleted.snapshot.lastCompleted!.editors.order).toEqual([
      accesses[0].participantId,
      accesses[2].participantId,
    ]);

    await test.step('one end vote waits; continuing grants only the two ordered additions', async () => {
      const voting = await act(0, { type: 'vote', vote: 'end' });
      expect(voting.snapshot.phase).toBe('end-vote');
      expect(voting.snapshot.editSlots).toHaveLength(0);
      const continuing = await act(1, { type: 'vote', vote: 'continue' });
      expect(continuing.snapshot.phase).toBe('additions');
      await act(1, { type: 'add-mechanic', cardId: 'dinner-bell' }, 409);
      await act(2, { type: 'add-mechanic', cardId: 'hot-potato' }, 409);
      await act(0, { type: 'pass' }, 409);
      const pending = await act(0, {
        type: 'add-mechanic',
        cardId: 'dinner-bell',
      });
      expect(pending.snapshot.phase).toBe('additions');
      expect(pending.snapshot.build).toEqual({
        status: 'playable',
        manifest: first.build,
      });
      expect(pending.snapshot.contributions).toEqual(first.build.contributions);
      expect(
        pending.snapshot.editSlots.map((slot) => slot.resolution.status),
      ).toEqual(['chosen', 'pending']);
      await act(0, { type: 'add-mechanic', cardId: 'zombie-pantry' }, 409);
      const evolved = await act(2, {
        type: 'add-mechanic',
        cardId: 'hot-potato',
      });
      expect(evolved.snapshot.phase).toBe('ready');
      expect(evolved.snapshot.contributions).toHaveLength(5);
      expect(evolved.snapshot.contributions.slice(0, 3)).toEqual(
        first.build.contributions,
      );
      expect(
        evolved.snapshot.build.status === 'playable' &&
          evolved.snapshot.build.manifest.parent,
      ).toEqual({
        buildId: first.build.buildId,
        contentHash: first.build.contentHash,
      });
    });

    const second = await startRound();
    expect(second.round.roundId).not.toBe(first.round.roundId);
    expect(second.round.number).toBe(2);
    const secondTrials = trialsFor(second.round, second.build);
    await test.step('restarting the Worker preserves the running round, deadlines and separate history', async () => {
      await host!.stop();
      host = undefined;
      host = await startHost({ config, persistTo, port: 3109 });
      const recovered = await read(2);
      expect(recovered.snapshot.phase).toBe('playing');
      expect(recovered.snapshot.round).toEqual(second.round);
      expect(recovered.history).toEqual(firstCompleted.history);
      await act(0, { type: 'submit-trial', trial: firstTrials[0] }, 409);
    });
    const secondCompleted = await completeRound(second.round, secondTrials, 2);
    expect(secondCompleted.snapshot.lastCompleted!.editors.order).toEqual([
      accesses[2].participantId,
      accesses[0].participantId,
    ]);

    await test.step('host succession preserves the absent editor, and explicit abort keeps the last played build', async () => {
      await act(1, { type: 'vote', vote: 'continue' });
      await act(0, { type: 'add-mechanic', cardId: 'zombie-pantry' }, 409);
      const pending = await act(2, {
        type: 'add-mechanic',
        cardId: 'zombie-pantry',
      });
      expect(
        pending.snapshot.editSlots.map((slot) => slot.resolution.status),
      ).toEqual(['chosen', 'pending']);
      const beforeAbsence = await read(0);
      const lastSeenAt = beforeAbsence.snapshot.participants.find(
        (participant) => participant.id === accesses[0].participantId,
      )!.lastSeenAt;
      await act(0, { type: 'abort-evolution' }, 409);
      const duringGrace = await read(1);
      expect(duringGrace.snapshot.hostId).toBe(accesses[0].participantId);
      expect(duringGrace.snapshot.editSlots[1].participantId).toBe(
        accesses[0].participantId,
      );
      await waitWithPresence(lastSeenAt + 31_000, [1, 2]);
      const succeeded = await read(1);
      expect(succeeded.snapshot.hostId).toBe(accesses[1].participantId);
      expect(succeeded.snapshot.editSlots).toEqual(pending.snapshot.editSlots);
      expect(
        succeeded.snapshot.participants.find(
          (participant) => participant.id === accesses[0].participantId,
        )!.presence,
      ).toBe('unavailable');
      await act(1, { type: 'pass' }, 409);
      await act(1, { type: 'add-mechanic', cardId: 'zombie-pantry' }, 409);
      const aborted = await act(1, { type: 'abort-evolution' });
      expect(aborted.snapshot.phase).toBe('results');
      expect(aborted.snapshot.editSlots).toHaveLength(0);
      expect(aborted.snapshot.build).toEqual({
        status: 'playable',
        manifest: second.build,
      });
      expect(aborted.snapshot.contributions).toEqual(
        second.build.contributions,
      );
      const history = await read(1);
      expect(history.historyCount).toBe(3);
      expect(history.history.slice(0, 2)).toEqual(secondCompleted.history);
      expect(history.history[2].status).toBe('evolution-aborted');
      await act(1, {
        type: 'remove-unavailable',
        participantId: accesses[0].participantId,
      });
      expect(
        (await http(pages[0], roomPath, 'GET', capabilities[0])).status,
      ).toBe(403);
      expect(
        (
          await http(
            pages[0],
            '/api/party/rooms',
            'POST',
            capabilities[0],
            createBody,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await http(
            pages[0],
            `${roomPath}/commands`,
            'POST',
            capabilities[0],
            envelope(
              { type: 'vote', vote: 'end' },
              (
                await read(1)
              ).snapshot.revision,
            ),
          )
        ).status,
      ).toBe(403);
      const tooFew = await act(1, { type: 'start-round' }, 409);
      expect(
        tooFew.receipt.status === 'rejected' && tooFew.receipt.reason,
      ).toBe('unavailable');
      expect(tooFew.snapshot.participants).toHaveLength(2);
      expect(tooFew.snapshot.round?.roundId).not.toBe(first.round.roundId);
      const oneEnd = await act(1, { type: 'vote', vote: 'end' });
      expect(oneEnd.snapshot.phase).toBe('end-vote');
      const ended = await act(2, { type: 'vote', vote: 'end' });
      expect(ended.snapshot.phase).toBe('ended');
      expect(ended.snapshot.build).toEqual({
        status: 'playable',
        manifest: second.build,
      });
      await act(1, { type: 'add-mechanic', cardId: 'zombie-pantry' }, 409);
      const final = await read(2);
      expect(final.history).toEqual(history.history);
      await host!.stop();
      host = undefined;
      host = await startHost({ config, persistTo, port: 3109 });
      const recovered = await read(2);
      expect(recovered.snapshot.phase).toBe('ended');
      expect(recovered.snapshot.build).toEqual(final.snapshot.build);
      expect(recovered.history).toEqual(final.history);
    });

    await test.step('an incomplete whole round can only retry under a fresh round ID and fresh three-person readiness', async () => {
      accesses.length = 0;
      for (const index of [0, 1, 2])
        capabilities[index] = randomBytes(32).toString('hex');
      const created = await http<AccessResponse>(
        pages[0],
        '/api/party/rooms',
        'POST',
        capabilities[0],
        {
          protocolVersion: PROTOCOL_VERSION,
          commandId: randomUUID(),
          nickname: 'Incomplete host',
          setup: { kind: 'fresh' },
        },
      );
      expect(created.status).toBe(201);
      accesses.push(created.body.access);
      roomPath = `/api/party/rooms/${created.body.access.roomId}`;
      for (const index of [1, 2]) {
        const joined = await http<AccessResponse>(
          pages[index],
          roomPath,
          'POST',
          capabilities[index],
          {
            protocolVersion: PROTOCOL_VERSION,
            commandId: randomUUID(),
            nickname: `Incomplete ${index}`,
          },
        );
        expect(joined.status).toBe(201);
        accesses.push(joined.body.access);
      }
      await act(0, {
        type: 'choose-initial',
        choice: { slot: 'fps', cardId: 'knockback' },
      });
      await act(1, {
        type: 'choose-initial',
        choice: { slot: 'zombies', cardId: 'pursuers' },
      });
      await act(2, {
        type: 'choose-initial',
        choice: { slot: 'cooking', cardId: 'quick-orders' },
      });
      const incomplete = await startRound();
      // A refreshed client has no retained input trace. It neither receives a
      // result nor restarts an individual clock while the others are playing.
      await pages[2].reload();
      expect((await read(2)).snapshot.round).toEqual(incomplete.round);
      await act(2, { type: 'start-round' }, 409);
      await act(1, { type: 'abort-round' }, 409);
      const abortCommand = envelope(
        { type: 'abort-round' },
        (await read(0)).snapshot.revision,
      );
      const aborted = await post(0, abortCommand);
      expect(aborted.status).toBe(200);
      expect(aborted.body.snapshot.phase).toBe('lobby');
      expect(aborted.body.snapshot.lastCompleted).toBeNull();
      expect(aborted.body.snapshot.editSlots).toHaveLength(0);
      expect((await post(0, abortCommand)).body.receipt).toEqual(
        aborted.body.receipt,
      );
      const history = await read(0);
      expect(history.historyCount).toBe(1);
      expect(history.history[0].status).toBe('aborted');
      if (history.history[0].status === 'aborted')
        expect(history.history[0].round).toEqual(incomplete.round);
      await act(2, { type: 'add-mechanic', cardId: 'dinner-bell' }, 409);
      const retry = await act(0, { type: 'start-round' });
      expect(retry.snapshot.phase).toBe('ready');
      expect(retry.snapshot.round!.roundId).not.toBe(incomplete.round.roundId);
      expect(retry.snapshot.acknowledgments).toHaveLength(0);
      expect(retry.snapshot.build).toEqual({
        status: 'playable',
        manifest: incomplete.build,
      });
      await act(0, { type: 'start-round' }, 409);
      const retried = await startRound();
      expect(retried.round.roundId).toBe(retry.snapshot.round!.roundId);
      await act(0, { type: 'abort-round' });
      await act(2, { type: 'leave' });
      const insufficient = await act(0, { type: 'start-round' }, 409);
      expect(
        insufficient.receipt.status === 'rejected' &&
          insufficient.receipt.reason,
      ).toBe('unavailable');
      expect(insufficient.snapshot.participants).toHaveLength(2);
      const final = await read(0);
      expect(final.snapshot.lastCompleted).toBeNull();
      expect(final.snapshot.editSlots).toHaveLength(0);
      expect(final.historyCount).toBe(2);
      expect(final.history.every((entry) => entry.status === 'aborted')).toBe(
        true,
      );
      await host!.stop();
      host = undefined;
      host = await startHost({ config, persistTo, port: 3109 });
      expect((await read(0)).history).toEqual(final.history);
    });

    await test.step('real unavailable D1 returns a failure and does not invent an in-memory room', async () => {
      const before = await read(0);
      // This is the disposable test database, never the production schema.
      // Removing a required table exercises the actual Worker failure boundary.
      await executeLocalSql(
        config,
        persistTo,
        'ALTER TABLE party_participants RENAME TO pc03_unavailable_participants',
      );
      try {
        expect(
          (await http(pages[0], roomPath, 'GET', capabilities[0])).status,
        ).toBe(503);
        const response = await http(
          pages[0],
          `${roomPath}/commands`,
          'POST',
          capabilities[0],
          envelope({ type: 'start-round' }, before.snapshot.revision),
        );
        expect(response.status).toBe(503);
      } finally {
        await executeLocalSql(
          config,
          persistTo,
          'ALTER TABLE pc03_unavailable_participants RENAME TO party_participants',
        );
      }
      const recovered = await read(0);
      expect(recovered.snapshot.revision).toBe(before.snapshot.revision);
      expect(recovered.snapshot.phase).toBe(before.snapshot.phase);
      expect(recovered.history).toEqual(before.history);
    });
  } finally {
    try {
      await Promise.all(contexts.map((context) => context.close()));
    } finally {
      await host?.stop();
      await rm(directory, { recursive: true, force: true });
    }
  }
});
