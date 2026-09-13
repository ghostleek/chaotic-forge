import {
  DEMO_POLICY,
  PROTOCOL_VERSION,
  archiveSchema,
  completedResultSchema,
  forkSetupSchema,
  gameHistorySchema,
  legalAdditions,
  isPixelChoice,
  isPixelHistory,
  rankResults,
  roomCommandSchema,
  roomSnapshotSchema,
  type BuildManifest,
  type CommandReceipt,
  type ForkSetup,
  type GameArchive,
  type RoomCommand,
  type RoomSnapshot,
} from './contracts.ts';
import { CARDS, type Contribution } from './cards.ts';
import { resolveBuild } from './resolve-build.ts';
import { resolveArchiveFork, resolveArchiveEvolution } from './archive.ts';
import { scoreTrial } from './score.ts';
import type { z } from 'zod';

export type GameHistory = z.infer<typeof gameHistorySchema>;
type Submission = Awaited<ReturnType<typeof scoreTrial>> & { participantId: string };
type Rejection = Extract<CommandReceipt, { status: 'rejected' }>['reason'];

/** Current state is bounded. Historical rounds and command receipts belong in D1. */
export interface RoomRecord {
  snapshot: RoomSnapshot;
  submissions: Submission[];
  lastPlayedBuild: BuildManifest | null;
  retryBuild: BuildManifest | null;
  roundCounter: number;
  historyCount: number;
  recovery: boolean;
  editDecisions: { participantId: string; commandId: string; contributionId: string }[];
  parentArchiveId: string | null;
  sourceBuild: BuildManifest | null;
  forkSetup: ForkSetup | null;
}

export class RoomTransitionError extends Error {
  reason: Rejection;
  constructor(reason: Rejection, message: string) {
    super(message);
    this.name = 'RoomTransitionError';
    this.reason = reason;
  }
}

// Matches the archive contract's disclosed history capacity; reaching it never
// silently ends a room or drops history. An existing completed game may still end.
export const ROOM_HISTORY_LIMIT = 10_000;
export const ROUND_START_LEAD_MS = 1_000;

function requireCondition(condition: unknown, reason: Rejection, message: string): asserts condition {
  if (!condition) throw new RoomTransitionError(reason, message);
}

function assertTime(record: RoomRecord, now: number) {
  requireCondition(Number.isSafeInteger(now) && now >= record.snapshot.updatedAt,
    'unavailable', 'Trusted time must not move backward');
}

function finish(record: RoomRecord, now: number) {
  record.snapshot.revision += 1;
  record.snapshot.updatedAt = now;
  roomSnapshotSchema.parse(record.snapshot);
  return record;
}

export function createRoomRecord(roomId: string, participantId: string, nickname: string, now: number): RoomRecord {
  return {
    snapshot: roomSnapshotSchema.parse({
      protocolVersion: PROTOCOL_VERSION, roomId, revision: 0, hostId: participantId,
      participants: [{ id: participantId, nickname, presence: 'present', lastSeenAt: now }],
      phase: 'lobby', build: { status: 'empty' }, contributions: [], round: null,
      lastCompleted: null, acknowledgments: [], votes: [], editSlots: [], updatedAt: now,
    }),
    submissions: [], lastPlayedBuild: null, retryBuild: null,
    roundCounter: 0, historyCount: 0, recovery: false, editDecisions: [],
    parentArchiveId: null, sourceBuild: null, forkSetup: null,
  };
}

/** The service validates retained resources before creating a new archive room. */
export function createArchiveRoomRecord(
  roomId: string, participantId: string, nickname: string, now: number,
  value: GameArchive, mode: 'play-again' | 'remix',
): RoomRecord {
  const archive = archiveSchema.parse(value);
  const record = createRoomRecord(roomId, participantId, nickname, now);
  requireCondition(!archive.finalBuild.contributions.some(c => c.participantId === participantId) &&
    !archive.history.some(h => h.status !== 'evolution-aborted' &&
      (h.status === 'completed' ? h.result.round : h.round).roster.includes(participantId)),
    'unauthorized', 'A saved game starts with a fresh participant identity');
  record.parentArchiveId = archive.archiveId;
  record.sourceBuild = structuredClone(archive.finalBuild);
  record.snapshot.fork = {
    sourceArchiveId: archive.archiveId, sourceBuild: structuredClone(archive.finalBuild), mode, decisions: [],
  };
  record.snapshot.contributions = structuredClone(archive.finalBuild.contributions);
  if (mode === 'play-again') record.snapshot.build = { status: 'playable', manifest: structuredClone(archive.finalBuild) };
  roomSnapshotSchema.parse(record.snapshot);
  return record;
}

/** Invitation transport creates a fresh identity; it cannot claim an existing ID. */
export function joinRoom(record: RoomRecord, participantId: string, nickname: string, now: number): RoomRecord {
  assertTime(record, now);
  const next = structuredClone(record);
  const room = next.snapshot;
  requireCondition(room.participants.length < DEMO_POLICY.players, 'unavailable', 'This room supports at most three players');
  requireCondition(['lobby', 'results', 'end-vote', 'additions'].includes(room.phase),
    'invalid-phase', 'Join at a round boundary');
  requireCondition(!room.participants.some(p => p.id === participantId), 'unauthorized', 'An invitation cannot reclaim a participant');
  requireCondition(!next.sourceBuild?.contributions.some(c => c.participantId === participantId),
    'unauthorized', 'Historical contribution identities cannot become new-room authority');
  room.participants.push({ id: participantId, nickname: nickname.trim(), presence: 'present', lastSeenAt: now });
  room.votes = []; // A newly active participant must participate in any End decision.
  if (room.phase === 'end-vote') room.phase = 'results';
  if (room.phase === 'lobby' && room.fork?.mode === 'play-again' &&
      room.build.status === 'playable' && room.participants.length === DEMO_POLICY.players) {
    prepareRound(next, room.build.manifest, now);
  }
  return finish(next, now);
}

/**
 * The service overlays independently persisted capability heartbeats first.
 * Updating lastSeenAt alone does not change the command revision; a visible
 * availability or host transition does. No process timer establishes authority.
 */
export function refreshPresence(record: RoomRecord, actorId: string | null, now: number): RoomRecord {
  assertTime(record, now);
  const next = structuredClone(record);
  const room = next.snapshot;
  let changed = false;
  for (const participant of room.participants) {
    if (participant.id === actorId) participant.lastSeenAt = now;
    const presence = now - participant.lastSeenAt >= DEMO_POLICY.hostGraceMs ? 'unavailable' : 'present';
    changed ||= participant.presence !== presence;
    participant.presence = presence;
  }
  const host = room.participants.find(p => p.id === room.hostId)!;
  if (host.presence === 'unavailable') {
    const successor = room.participants.find(p => p.presence === 'present');
    if (successor && successor.id !== room.hostId) {
      room.hostId = successor.id;
      changed = true;
    }
  }
  return changed ? finish(next, now) : next;
}

function appendHistory(record: RoomRecord, history: GameHistory[], entry: GameHistory) {
  requireCondition(record.historyCount < ROOM_HISTORY_LIMIT, 'unavailable', 'The disclosed history capacity is reached; end and preserve the completed game');
  history.push(gameHistorySchema.parse(entry));
  record.historyCount += 1;
}

function activeBuild(record: RoomRecord): BuildManifest {
  const build = record.snapshot.build;
  requireCondition(build.status === 'playable', 'invalid-phase', 'A validated playable build is required');
  return build.manifest;
}

function minimumPlayers(room: RoomSnapshot) { return isPixelHistory(room.contributions) ? 2 : DEMO_POLICY.players; }

function prepareRound(record: RoomRecord, manifest: BuildManifest, now: number) {
  const room = record.snapshot;
  requireCondition(room.participants.length >= minimumPlayers(room), 'unavailable', `Wait for ${minimumPlayers(room)} participants before a trial`);
  requireCondition(record.historyCount < ROOM_HISTORY_LIMIT, 'unavailable', 'The disclosed history capacity is reached');
  const startsAt = now + DEMO_POLICY.readyWindowMs;
  record.roundCounter += 1;
  room.round = {
    roundId: crypto.randomUUID(), number: (room.lastCompleted?.round.number ?? 0) + 1,
    buildId: manifest.buildId, buildHash: manifest.contentHash,
    roster: room.participants.map(p => p.id), seed: crypto.getRandomValues(new Uint32Array(1))[0],
    scoringVersion: manifest.scoringVersion, ticks: DEMO_POLICY.trialTicks,
    ticksPerSecond: DEMO_POLICY.ticksPerSecond, startsAt,
    submissionDeadline: startsAt + 60_000,
    transportDeadline: startsAt + 60_000 + DEMO_POLICY.transportGraceMs,
    tieCursor: (room.lastCompleted?.nextTieCursor ?? 0) % room.participants.length,
  };
  room.phase = 'ready';
  room.build = { status: 'playable', manifest };
  room.contributions = structuredClone(manifest.contributions);
  room.acknowledgments = [];
  room.editSlots = [];
  room.votes = [];
  record.submissions = [];
  record.editDecisions = [];
  record.recovery = false;
  record.retryBuild = null;
}

function provenance(participantId: string, commandId: string, cardId: keyof typeof CARDS, instruction?: string): Contribution['provenance'] {
  if (cardId === 'instruction') {
    if (!instruction) throw new Error('An instruction requires its submitted text');
    return { source: { kind: 'user-concept', reference: instruction }, forgeInterpretation: 'Awaiting generated interpretation',
      userDecision: { participantId, decisionId: commandId } };
  }
  return {
    source: { kind: 'authored-demo' as const, reference: `Kitchen Chaos authored demo deck: ${CARDS[cardId].title}` },
    forgeInterpretation: CARDS[cardId].interpretation,
    userDecision: { participantId, decisionId: commandId },
  };
}

function evolutionContributions(record: RoomRecord): Contribution[] {
  const room = record.snapshot;
  const contributions = structuredClone(room.contributions);
  for (const slot of room.editSlots) {
    if (slot.resolution.status !== 'chosen') continue;
    const decision = record.editDecisions.find(item => item.participantId === slot.participantId)!;
    contributions.push({
      id: decision.contributionId, participantId: slot.participantId, ordinal: contributions.length,
      kind: 'addition', cardId: slot.resolution.cardId,
      ...(slot.resolution.text !== undefined ? { text: slot.resolution.text } : {}),
      afterRoundId: room.lastCompleted!.round.roundId, editorRole: slot.role,
      provenance: provenance(slot.participantId, decision.commandId, slot.resolution.cardId, slot.resolution.text),
    });
  }
  return contributions;
}

async function forge(record: RoomRecord, now: number, resolve: typeof resolveBuild) {
  const room = record.snapshot;
  requireCondition(room.participants.length >= minimumPlayers(room), 'unavailable', `Wait for ${minimumPlayers(room)} participants before preparing the next trial`);
  if (!room.lastCompleted && isPixelHistory(room.contributions)) requireCondition(room.contributions.length === room.participants.length && room.participants.every(p => room.contributions.some(c => c.participantId === p.id)), 'unavailable', 'Every connected participant must submit an instruction before generation');
  const previous = record.lastPlayedBuild;
  const contributions = room.lastCompleted ? evolutionContributions(record) : room.contributions;
  const jobId = crypto.randomUUID();
  const contributionRevision = room.revision + 1;
  room.phase = 'forging';
  room.build = { status: 'forging', jobId, contributionRevision, previous };
  // Resolution is a bounded operation. The service commits the entire
  // result by expected-revision CAS, so obsolete work cannot overwrite new state.
  try {
    const result = await resolve({ contributions, previous });
    if (result.status === 'playable') {
      prepareRound(record, result.manifest, now);
    } else {
      room.build = {
        status: 'incompatible', jobId, contributionRevision, previous,
        affectedContributionIds: contributions.filter(c => !previous?.contributions.some(p => p.id === c.id)).map(c => c.id),
        reason: result.reason.slice(0, 1000) || 'The game could not be generated or validated',
      };
    }
  } catch {
    room.build = {
      status: 'failed', jobId, contributionRevision, previous,
      affectedContributionIds: contributions.filter(c => !previous?.contributions.some(p => p.id === c.id)).map(c => c.id),
      reason: 'The game could not be generated or validated. Retry or revise the pending instructions.',
    };
  }
}

async function forgeFork(record: RoomRecord, now: number, resolve: typeof resolveArchiveFork) {
  const room = record.snapshot;
  const fork = room.fork;
  requireCondition(fork && record.sourceBuild && record.parentArchiveId, 'invalid-phase', 'A retained source game is required');
  requireCondition(room.participants.length === record.sourceBuild.contributions.filter(c => c.kind === 'initial').length &&
    room.participants.every(p => fork.decisions.some(d => d.participantId === p.id)),
    'unavailable', 'Each new participant must choose an inherited initial contribution');
  const setup = forkSetupSchema.parse({
    protocolVersion: PROTOCOL_VERSION, sourceArchiveId: record.parentArchiveId,
    sourceBuildId: record.sourceBuild.buildId, sourceBuildHash: record.sourceBuild.contentHash,
    decisions: fork.decisions,
  });
  const jobId = crypto.randomUUID();
  const contributionRevision = room.revision + 1;
  const previous = record.sourceBuild;
  room.phase = 'forging';
  room.build = { status: 'forging', jobId, contributionRevision, previous };
  try {
    const resolved = await resolve(previous, setup);
    record.forkSetup = structuredClone(resolved.setup);
    fork.mode = resolved.kind;
    prepareRound(record, resolved.manifest, now);
  } catch {
    room.build = {
      status: 'failed', jobId, contributionRevision, previous,
      affectedContributionIds: fork.decisions.filter(d => d.selection.kind === 'replace').map(d => d.selection.inheritedContributionId),
      reason: 'The saved game could not be loaded or its fork validated. Retained choices remain available for retry or revision.',
    };
  }
}

function restoreCompleted(record: RoomRecord) {
  const room = record.snapshot;
  requireCondition(record.lastPlayedBuild && room.lastCompleted, 'invalid-phase', 'No completed game is available');
  room.build = { status: 'playable', manifest: record.lastPlayedBuild };
  room.contributions = structuredClone(record.lastPlayedBuild.contributions);
  room.phase = 'results';
  room.round = room.lastCompleted.round;
  room.acknowledgments = [];
  room.editSlots = [];
  room.votes = [];
  record.editDecisions = [];
  record.submissions = [];
  record.recovery = true;
}

function recordEvolutionAbort(record: RoomRecord, history: GameHistory[], now: number, reason: string) {
  appendHistory(record, history, {
    status: 'evolution-aborted', evolutionId: crypto.randomUUID(),
    afterRoundId: record.snapshot.lastCompleted!.round.roundId,
    pendingRevision: record.snapshot.revision, reason, abortedAt: now,
  });
  record.retryBuild = null;
  restoreCompleted(record);
}

function hostOnly(room: RoomSnapshot, actorId: string) {
  requireCondition(room.hostId === actorId, 'unauthorized', 'Only the current host coordinates this action');
}

function retryRound(record: RoomRecord, now: number) {
  prepareRound(record, record.retryBuild ?? activeBuild(record), now);
}

/** Pure state transition: no database, clocks, network, or process-owned room map. */
export async function reduceRoom(
  record: RoomRecord,
  actorId: string,
  value: RoomCommand,
  now: number,
  services: { resolve?: typeof resolveBuild; resolveFork?: typeof resolveArchiveFork } = {},
): Promise<{ record: RoomRecord; history: GameHistory[]; receipt: CommandReceipt }> {
  const command = roomCommandSchema.parse(value);
  const next = structuredClone(record);
  const room = next.snapshot;
  const history: GameHistory[] = [];
  try {
    assertTime(record, now);
    requireCondition(room.participants.some(p => p.id === actorId), 'unauthorized', 'A current room capability is required');
    requireCondition(command.expectedRevision === room.revision, 'stale-revision', 'Reload the current revision');
    requireCondition(room.phase !== 'ended', 'invalid-phase', 'An ended game is immutable');
    const actor = room.participants.find(p => p.id === actorId)!;
    actor.lastSeenAt = now;
    actor.presence = 'present';

    switch (command.type) {
      case 'choose-fork': {
        requireCondition(room.fork && next.sourceBuild && room.fork.mode === 'remix' &&
          (room.phase === 'lobby' || (room.phase === 'forging' && !room.lastCompleted && room.build.status !== 'forging')),
          'invalid-phase', 'Choose inherited slots during the new remix setup');
        requireCondition(room.build.status !== 'playable', 'invalid-phase', 'The accepted recipe is frozen');
        const inherited = next.sourceBuild.contributions.find(c => c.id === command.selection.inheritedContributionId);
        requireCondition(inherited?.kind === 'initial', 'invalid-choice', 'Claim an inherited initial concept slot');
        requireCondition(!room.fork.decisions.some(d => d.participantId !== actorId &&
          d.selection.inheritedContributionId === inherited.id), 'invalid-choice', 'Another participant has claimed this inherited slot');
        requireCondition(!isPixelHistory(next.sourceBuild.contributions) || command.selection.kind === 'keep', 'invalid-choice', 'Saved instruction replacements require a new generated game; Play again retains the existing game');
        const choice = command.selection.kind === 'replace' ? command.selection.choice : inherited.choice;
        requireCondition(choice.slot === inherited.choice.slot &&
          (command.selection.kind === 'keep' || choice.cardId !== inherited.choice.cardId),
          'invalid-choice', 'Choose Keep or the other supported variant in that slot');
        room.fork.decisions = room.fork.decisions.filter(d => d.participantId !== actorId);
        room.fork.decisions.push({ participantId: actorId, selection: command.selection,
          provenance: provenance(actorId, command.commandId, choice.cardId, choice.slot === 'instruction' ? choice.text : undefined) });
        room.phase = 'lobby';
        room.build = { status: 'empty' };
        next.forkSetup = null;
        if (room.fork.decisions.length === next.sourceBuild.contributions.filter(c => c.kind === 'initial').length) await forgeFork(next, now, services.resolveFork ?? resolveArchiveFork);
        break;
      }
      case 'choose-initial': {
        requireCondition(!room.fork, 'invalid-phase', 'Saved games use the explicit inherited-slot setup');
        requireCondition(room.phase === 'lobby' || (room.phase === 'forging' && !room.lastCompleted && room.build.status !== 'forging'),
          'invalid-phase', 'Initial choices are editable before the first build is accepted');
        requireCondition(room.build.status !== 'playable', 'invalid-phase', 'The accepted recipe is frozen');
        requireCondition(command.choice.slot === 'instruction' || !room.contributions.some(c => c.kind === 'initial' && c.choice.slot === command.choice.slot && c.participantId !== actorId),
          'invalid-choice', 'Another participant has claimed this concept slot');
        requireCondition(!room.contributions.some(c => c.kind === 'initial' && c.participantId !== actorId &&
          isPixelChoice(c.choice) !== isPixelChoice(command.choice)), 'invalid-choice', 'Every player must use the same game family');
        const existing = room.contributions.findIndex(c => c.participantId === actorId);
        const contribution: Contribution = {
          id: crypto.randomUUID(), participantId: actorId,
          ordinal: existing === -1 ? room.contributions.length : existing,
          kind: 'initial', choice: command.choice,
          provenance: provenance(actorId, command.commandId, command.choice.cardId, command.choice.slot === 'instruction' ? command.choice.text : undefined),
        };
        if (existing === -1) room.contributions.push(contribution);
        else room.contributions[existing] = contribution;
        room.phase = 'lobby';
        room.build = { status: 'empty' };
        if (room.contributions.length === DEMO_POLICY.players && !isPixelHistory(room.contributions)) await forge(next, now, services.resolve ?? (next.sourceBuild && next.lastPlayedBuild ? resolveArchiveEvolution : resolveBuild));
        break;
      }
      case 'acknowledge-build': {
        requireCondition(room.phase === 'ready' && room.round, 'invalid-phase', 'Acknowledge the available build in Ready');
        const manifest = activeBuild(next);
        requireCondition(command.buildId === manifest.buildId && command.buildHash === manifest.contentHash,
          'invalid-choice', 'Acknowledge the exact current artifact');
        if (now > room.round.startsAt) {
          room.acknowledgments = [];
          room.round.startsAt = now + DEMO_POLICY.readyWindowMs;
          room.round.submissionDeadline = room.round.startsAt + 60_000;
          room.round.transportDeadline = room.round.submissionDeadline + DEMO_POLICY.transportGraceMs;
        }
        room.acknowledgments = room.acknowledgments.filter(a => a.participantId !== actorId);
        room.acknowledgments.push({ participantId: actorId, buildId: command.buildId, buildHash: command.buildHash });
        break;
      }
      case 'start-round': {
        hostOnly(room, actorId);
        requireCondition(room.participants.length >= minimumPlayers(room), 'unavailable', `Wait for ${minimumPlayers(room)} participants before a trial`);
        if ((room.phase === 'lobby' && room.build.status === 'playable') ||
            (['results', 'end-vote'].includes(room.phase) && next.recovery)) {
          retryRound(next, now);
          break;
        }
        requireCondition(room.phase === 'ready' && room.round, 'invalid-phase', 'Prepare a playable build before starting');
        requireCondition(now <= room.round.startsAt, 'deadline', 'Ready expired; acknowledge again to reopen the window');
        requireCondition(room.acknowledgments.length === room.round.roster.length && room.participants.every(p =>
          p.presence === 'present' && now - p.lastSeenAt < DEMO_POLICY.hostGraceMs), 'unavailable', 'Every participant in the frozen roster must be present and acknowledge');
        const startsAt = now + (room.build.status === 'playable' && room.build.manifest.catalogVersion === 'pixel-arcade/1' ? 6000 : ROUND_START_LEAD_MS);
        room.round.startsAt = startsAt;
        room.round.submissionDeadline = startsAt + 60_000;
        room.round.transportDeadline = startsAt + 60_000 + DEMO_POLICY.transportGraceMs;
        room.phase = 'playing';
        break;
      }
      case 'submit-trial': {
        requireCondition(room.phase === 'playing' && room.round, 'invalid-phase', 'No active scored trial');
        requireCondition(room.round.roster.includes(actorId), 'unauthorized', 'The active roster is frozen');
        requireCondition(now >= (command.trial.endedEarly ? room.round.startsAt + Math.ceil(command.trial.frames.length * 1000 / room.round.ticksPerSecond) : room.round.submissionDeadline) && now <= room.round.transportDeadline,
          'deadline', 'Submit only after the captured play time and within the transport grace');
        requireCondition(!next.submissions.some(s => s.participantId === actorId || s.attemptId === command.trial.attemptId),
          'incomplete-attempt', 'Only one accepted attempt per participant and round');
        let score: Awaited<ReturnType<typeof scoreTrial>>;
        try { score = await scoreTrial(activeBuild(next), room.round, command.trial); }
        catch { throw new RoomTransitionError('incomplete-attempt', 'The complete trace must match the frozen runtime, seed and input bounds'); }
        next.submissions.push({ participantId: actorId, ...score });
        if (next.submissions.length === room.round.roster.length) {
          const ranked = rankResults(room.round, next.submissions);
          const result = completedResultSchema.parse({
            protocolVersion: PROTOCOL_VERSION, round: room.round,
            results: next.submissions.map(s => ({ ...s, rank: ranked.ranks[s.participantId] })),
            editors: ranked.editors, nextTieCursor: ranked.nextTieCursor,
          });
          appendHistory(next, history, { status: 'completed', result });
          next.lastPlayedBuild = activeBuild(next);
          room.lastCompleted = result;
          room.phase = 'results';
          room.acknowledgments = [];
          next.submissions = [];
          next.recovery = false;
          next.retryBuild = null;
        }
        break;
      }
      case 'replay-round': {
        requireCondition(['results', 'end-vote'].includes(room.phase) && isPixelHistory(room.contributions), 'invalid-phase', 'Replay a completed pixel game');
        retryRound(next, now);
        break;
      }
      case 'vote': {
        requireCondition(['results', 'end-vote'].includes(room.phase), 'invalid-phase', 'Vote at completed results before any additions');
        room.votes = room.votes.filter(v => v.participantId !== actorId);
        room.votes.push({ participantId: actorId, vote: command.vote });
        if (command.vote === 'continue') {
          requireCondition(next.historyCount < ROOM_HISTORY_LIMIT, 'unavailable', 'The disclosed history capacity is reached; end and preserve the completed game');
          if (next.recovery) retryRound(next, now);
          else {
            const result = room.lastCompleted!;
            requireCondition(result.editors.order.every(id => room.participants.some(p => p.id === id)),
              'unavailable', 'An editor is no longer available; abort the evolution before retrying');
            room.phase = 'additions';
            room.votes = [];
            room.editSlots = result.editors.order.map(id => ({
              participantId: id, role: id === result.editors.winner ? 'winner' : 'loser',
              resolution: { status: 'pending' },
            }));
          }
        } else if (room.participants.every(p => room.votes.some(v => v.participantId === p.id && v.vote === 'end'))) room.phase = 'ended';
        else room.phase = 'end-vote';
        break;
      }
      case 'add-mechanic':
      case 'pass': {
        const revising = room.phase === 'forging' && room.build.status !== 'forging';
        requireCondition(room.phase === 'additions' || revising, 'invalid-phase', 'Contribute during the announced additions phase');
        const slot = room.editSlots.find(s => s.participantId === actorId);
        requireCondition(slot, 'unauthorized', 'Only the winner and loser may add a mechanic');
        if (!revising) requireCondition(room.editSlots.find(s => s.resolution.status === 'pending') === slot,
          'unauthorized', 'Resolve exactly one editor slot in the announced order');
        const available = legalAdditions(room.contributions).filter(card => card === 'instruction'
          ? room.contributions.length + room.editSlots.filter(s => s !== slot && s.resolution.status === 'chosen').length < 5
          : !room.editSlots.some(s => s !== slot && s.resolution.status === 'chosen' && s.resolution.cardId === card));
        if (!('cardId' in command)) {
          requireCondition(available.length === 0, 'invalid-choice', 'Pass is available only when the compatible deck is exhausted');
          slot.resolution = { status: 'passed', reason: 'no-legal-addition' };
        } else {
          requireCondition(available.includes(command.cardId), 'invalid-choice', 'This card is already present or pending');
          slot.resolution = { status: 'chosen', cardId: command.cardId, ...(command.text !== undefined ? { text: command.text } : {}) };
          next.editDecisions = next.editDecisions.filter(d => d.participantId !== actorId);
          next.editDecisions.push({ participantId: actorId, commandId: command.commandId, contributionId: crypto.randomUUID() });
        }
        if (room.editSlots.every(s => s.resolution.status !== 'pending') && room.participants.length >= minimumPlayers(room)) {
          await forge(next, now, services.resolve ?? (next.sourceBuild && next.lastPlayedBuild ? resolveArchiveEvolution : resolveBuild));
        }
        break;
      }
      case 'retry-forge': {
        hostOnly(room, actorId);
        requireCondition((room.phase === 'lobby' && room.build.status === 'empty' && room.contributions.length >= 2 && room.contributions.length === room.participants.length && isPixelHistory(room.contributions)) ||
          (room.phase === 'forging' && room.build.status !== 'forging') ||
          (room.phase === 'additions' && room.editSlots.every(s => s.resolution.status !== 'pending')),
          'invalid-phase', 'Retry the retained failed or pending choices');
        if (room.fork && !room.lastCompleted) await forgeFork(next, now, services.resolveFork ?? resolveArchiveFork);
        else await forge(next, now, services.resolve ?? (next.sourceBuild && next.lastPlayedBuild ? resolveArchiveEvolution : resolveBuild));
        break;
      }
      case 'cancel-forge': {
        hostOnly(room, actorId);
        requireCondition(room.phase === 'forging' && 'previous' in room.build, 'invalid-phase', 'No pending forge to cancel');
        room.build = {
          status: 'canceled', jobId: room.build.jobId, contributionRevision: room.build.contributionRevision,
          previous: room.build.previous, affectedContributionIds: [],
          reason: 'The host canceled this forge. Accepted rules and pending choices remain available for retry or revision.',
        };
        break;
      }
      case 'abort-round': {
        hostOnly(room, actorId);
        requireCondition(['ready', 'playing'].includes(room.phase) && room.round, 'invalid-phase', 'Only an uncompleted round can be aborted');
        appendHistory(next, history, { status: 'aborted', round: room.round, reason: 'The host explicitly aborted the incomplete round; no ranks or edit rights were awarded.', abortedAt: now });
        const retryBuild = activeBuild(next);
        if (room.lastCompleted) {
          restoreCompleted(next);
          next.retryBuild = retryBuild;
        } else {
          room.phase = 'lobby';
          room.round = null;
          room.acknowledgments = [];
          next.submissions = [];
          next.recovery = true;
        }
        break;
      }
      case 'abort-evolution': {
        hostOnly(room, actorId);
        requireCondition(room.phase === 'additions' || (room.phase === 'forging' && room.lastCompleted), 'invalid-phase', 'No pending evolution to abort');
        requireCondition(room.participants.length < minimumPlayers(room) ||
          room.editSlots.some(slot => (slot.resolution.status === 'pending' || room.phase === 'forging') && (!room.participants.some(p => p.id === slot.participantId) || room.participants.some(p =>
            p.id === slot.participantId && now - p.lastSeenAt >= DEMO_POLICY.hostGraceMs))),
          'unavailable', 'Preserve each pending editor slot throughout the disclosed absence grace');
        recordEvolutionAbort(next, history, now, room.participants.length < minimumPlayers(room)
          ? 'The host explicitly aborted the unplayed evolution because fewer than the required participants remain; the last completed game was preserved.'
          : 'The host explicitly aborted an evolution after an editor exceeded the absence grace; no edit privilege was transferred.');
        break;
      }
      case 'leave':
      case 'remove-unavailable': {
        const pendingFork = room.fork && !room.lastCompleted && room.phase === 'forging' && room.build.status !== 'forging';
        requireCondition(['lobby', 'results', 'end-vote', 'additions'].includes(room.phase) || pendingFork,
          'invalid-phase', 'Membership changes only at a round boundary');
        const targetId = 'participantId' in command ? command.participantId : actorId;
        if (command.type === 'remove-unavailable') hostOnly(room, actorId);
        const target = room.participants.find(p => p.id === targetId);
        requireCondition(target, 'invalid-choice', 'Participant is not in this room');
        requireCondition(room.participants.length > 1, 'unavailable', 'The final participant may wait or abandon the room; no finished game is invented');
        if (command.type === 'remove-unavailable') requireCondition(now - target.lastSeenAt >= DEMO_POLICY.hostGraceMs,
          'unavailable', 'Wait through the disclosed absence grace before removal');
        requireCondition(!room.editSlots.some(slot => slot.participantId === targetId),
          'invalid-phase', 'Explicitly abort the pending evolution before removing an editor');
        const losesEditor = !next.recovery && room.lastCompleted?.editors.order.includes(targetId);
        if (losesEditor) {
          // Results precede any unplayed draft. Invalidate the departed editor's
          // rights without inventing an evolution history entry, including when
          // the room has reached its disclosed history capacity and must end.
          next.retryBuild = null;
          restoreCompleted(next);
        }
        room.participants = room.participants.filter(p => p.id !== targetId);
        if (pendingFork) {
          room.phase = 'lobby';
          room.build = { status: 'empty' };
          next.forkSetup = null;
        }
        room.acknowledgments = [];
        room.votes = [];
        if (room.phase === 'end-vote') room.phase = 'results';
        if (room.hostId === targetId) room.hostId = room.participants[0].id;
        if (room.phase === 'lobby' && room.build.status === 'empty') {
          if (room.fork) room.fork.decisions = room.fork.decisions.filter(d => d.participantId !== targetId);
          else room.contributions = room.contributions.filter(c => c.participantId !== targetId).map((c, ordinal) => ({ ...c, ordinal }));
        }
        break;
      }
      case 'save-game':
        throw new RoomTransitionError('unavailable', 'A save requires the durable archive service');
    }
    finish(next, now);
    return { record: next, history, receipt: { protocolVersion: PROTOCOL_VERSION, commandId: command.commandId, status: 'accepted', revision: room.revision } };
  } catch (error) {
    if (!(error instanceof RoomTransitionError)) throw error;
    return {
      record, history: [],
      receipt: { protocolVersion: PROTOCOL_VERSION, commandId: command.commandId, status: 'rejected', reason: error.reason, current: record.snapshot },
    };
  }
}
