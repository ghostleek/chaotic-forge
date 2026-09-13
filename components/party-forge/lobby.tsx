'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRoom } from '../../lib/party-forge/client/use-room.ts';
import { nextAddition } from '../../lib/party-forge/client/demo-path.ts';
import { CARDS } from '../../lib/party-forge/cards.ts';
import {
  RoomStatus,
  CAT_AVATARS,
  type RoomStatusParticipant,
} from './room-status.tsx';
import { CardPicker } from './card-picker.tsx';
import { GameViewport } from './game-viewport.tsx';
import { useTrialController } from './use-trial-controller.ts';
import { RecipeSummary } from './recipe-summary.tsx';
import styles from './party-room.module.css';

export function Lobby({ roomId }: { roomId?: string }) {
  const {
    client,
    room,
    access,
    pending,
    uncertain,
    connected,
    terminal,
    error,
  } = useRoom(roomId);
  const [nickname, setNickname] = useState('');
  const [onboarding, setOnboarding] = useState(true);
  const [swatted, setSwatted] = useState(false);
  const { controller, view } = useTrialController(client);
  const help = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (access && !roomId) window.location.replace(`/party/${access.roomId}`);
  }, [access, roomId]);
  const disabled = pending || uncertain || !connected;
  const me = access?.participantId;
  const editor = room?.editSlots.find((s) => s.resolution.status === 'pending');
  const addition = room ? nextAddition(room) : null;
  const players: RoomStatusParticipant[] =
    room?.participants.map((p) => ({
      id: p.id,
      name: p.nickname,
      avatar:
        CAT_AVATARS[
          Array.from(p.id).reduce(
            (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
            0,
          ) % CAT_AVATARS.length
        ].id,
      presence: p.presence === 'present' ? 'present' : 'away',
      contribution:
        room.phase === 'additions'
          ? room.editSlots.find((s) => s.participantId === p.id)?.resolution
              .status === 'pending'
            ? editor?.participantId === p.id
              ? 'deciding'
              : 'up-next'
            : room.editSlots.some((s) => s.participantId === p.id)
              ? 'chosen'
              : 'watching'
          : room.contributions.some((c) => c.participantId === p.id)
            ? 'chosen'
            : room.phase === 'lobby'
              ? 'deciding'
              : 'watching',
    })) ?? [];
  return (
    <main className={styles.root}>
      <header>
        <Link href="/party" className={styles.wordmark}>
          CHAOTIC
          <br />
          FORGE /
        </Link>
        <span>AUTHORED DEMO</span>
        <button type="button" ref={help} onClick={() => setOnboarding(true)}>
          How to play
        </button>
      </header>
      <div
        className={styles.hero}
        data-swatted={swatted}
        hidden={room?.phase === 'playing' || room?.phase === 'ready'}
      >
        <Image
          src="/party-forge/world.svg"
          width={760}
          height={430}
          alt="An illustrated floating world where different ideas meet"
          unoptimized
        />
        {swatted ? (
          <button type="button" onClick={() => setSwatted(false)}>
            Restore the world
          </button>
        ) : null}
      </div>
      {onboarding && !['ready', 'playing'].includes(room?.phase ?? '') ? (
        <aside className={styles.onboarding} aria-label="How to play">
          <h1>Strange ideas. One shared game.</h1>
          <p>
            Invite two friends. Each person contributes one card, then confirms
            readiness for the same build. After a round, the winner and loser
            take turns adding the next twist.
          </p>
          <button
            type="button"
            onClick={() => {
              setOnboarding(false);
              help.current?.focus();
            }}
          >
            Got it
          </button>
        </aside>
      ) : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      {terminal && !uncertain ? (
        <button type="button" onClick={() => client.forgetAccess()}>
          Clear access and rejoin
        </button>
      ) : null}
      {uncertain ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void client.retry()}
        >
          Retry previous request
        </button>
      ) : null}
      {!access ? (
        <section>
          <h2>{roomId ? 'Join your friends' : 'Make a little chaos'}</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void client.enroll(nickname);
            }}
          >
            <label>
              Your name
              <input
                name="nickname"
                required
                maxLength={32}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              className={styles.primary}
              disabled={pending || uncertain || !nickname.trim()}
            >
              {pending ? 'Connecting…' : roomId ? 'Join room' : 'Create room'}
            </button>
          </form>
        </section>
      ) : null}
      {room && access ? (
        <>
          <section className={styles.invite}>
            <span>Invite two friends</span>
            <Link href={`/party/${room.roomId}`}>Room {room.roomId}</Link>
            <output aria-live="polite">
              {connected
                ? `${room.participants.length}/3 players · ${room.phase}`
                : 'Reconnecting · last known room'}
            </output>
          </section>
          {['lobby', 'additions'].includes(room.phase) ? (
            <RoomStatus
              participants={players}
              expectedContributions={room.phase === 'lobby' ? 3 : 2}
              localParticipantId={me}
              roundNumber={room.round?.number ?? 1}
              phase={room.phase === 'additions' ? 'additions' : 'initial'}
              connection={connected ? 'connected' : 'reconnecting'}
              avatarAction={
                players[1]
                  ? {
                      participantId: players[1].id,
                      label: swatted
                        ? 'Restore the world'
                        : 'Swat the illustrated world',
                      onActivate: () => setSwatted((value) => !value),
                    }
                  : undefined
              }
            />
          ) : null}
          {room.phase === 'lobby' ? (
            <CardPicker
              room={room}
              participantId={access.participantId}
              disabled={disabled}
              onConfirm={(choice) =>
                void client.command({ type: 'choose-initial', choice })
              }
            />
          ) : null}
          <RecipeSummary room={room} />
          {room.phase === 'forging' ? (
            <section>
              <h2>
                {room.build.status === 'forging'
                  ? 'Preparing your demo…'
                  : 'The build needs attention'}
              </h2>
              {'reason' in room.build ? <p>{room.build.reason}</p> : null}
              {room.hostId === me ? (
                <>
                  <button
                    disabled={disabled || room.build.status === 'forging'}
                    onClick={() => void client.command({ type: 'retry-forge' })}
                  >
                    Retry build
                  </button>
                  <button
                    disabled={disabled}
                    onClick={() =>
                      void client.command({ type: 'cancel-forge' })
                    }
                  >
                    Cancel build
                  </button>
                </>
              ) : (
                <p>The host can retry or cancel.</p>
              )}
            </section>
          ) : null}
          {room.phase === 'lobby' &&
          room.build.status === 'playable' &&
          room.hostId === me ? (
            <button
              disabled={disabled || room.participants.length !== 3}
              onClick={() => void client.command({ type: 'start-round' })}
            >
              Prepare a new round after interruption
            </button>
          ) : null}
          {['ready', 'playing'].includes(room.phase) ? (
            <GameViewport controller={controller} view={view} />
          ) : null}
          {room.phase === 'ready' && room.build.status === 'playable' ? (
            <section>
              <h2>Your game is ready</h2>
              <p>
                {room.acknowledgments.length}/3 players ready for this build.
              </p>
              <button
                disabled={disabled || view.status !== 'ready'}
                onClick={() => void controller.ready()}
              >
                Ready to play
              </button>
              {view.status === 'error' ? (
                <button
                  disabled={disabled}
                  onClick={() => controller.reloadBuild()}
                >
                  Retry executable loading
                </button>
              ) : null}
              {room.hostId === me ? (
                <button
                  className={styles.primary}
                  disabled={
                    disabled ||
                    view.status !== 'ready' ||
                    room.acknowledgments.length !== 3 ||
                    room.participants.some((p) => p.presence !== 'present')
                  }
                  onClick={() => void client.command({ type: 'start-round' })}
                >
                  Start 60-second round
                </button>
              ) : (
                <p>The host starts when all three players are ready.</p>
              )}
              <p>
                Readiness expires after 30 seconds. Confirm again if the host
                cannot start.
              </p>
            </section>
          ) : null}
          {room.phase === 'playing' ? (
            <section>
              {view.status === 'complete' ? (
                <button
                  disabled={disabled}
                  onClick={() => void controller.submit()}
                >
                  Submit captured attempt
                </button>
              ) : null}
              {room.hostId === me ? (
                <button
                  disabled={disabled}
                  onClick={() => void client.command({ type: 'abort-round' })}
                >
                  Abort interrupted round
                </button>
              ) : null}
            </section>
          ) : null}
          {room.lastCompleted &&
          ['results', 'end-vote', 'additions', 'ended'].includes(room.phase) ? (
            <section>
              <h2>Round results</h2>
              <ol>
                {room.lastCompleted.results.map((result) => (
                  <li key={result.participantId}>
                    {
                      room.participants.find(
                        (p) => p.id === result.participantId,
                      )?.nickname
                    }
                    : {result.completedOrders} orders · {result.failedOrders}{' '}
                    failed · rank {result.rank}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {['results', 'end-vote'].includes(room.phase) ? (
            <section>
              <h2>One more round?</h2>
              <button
                disabled={disabled}
                onClick={() =>
                  void client.command({ type: 'vote', vote: 'continue' })
                }
              >
                Continue
              </button>
              <button
                disabled={disabled}
                onClick={() =>
                  void client.command({ type: 'vote', vote: 'end' })
                }
              >
                Vote to end
              </button>
              <p>
                {room.votes.filter((v) => v.vote === 'end').length}/3 votes to
                end. Everyone must agree to end.
              </p>
            </section>
          ) : null}
          {room.phase === 'additions' ? (
            <section>
              <h2>The next twist</h2>
              <p>
                {
                  room.participants.find((p) => p.id === editor?.participantId)
                    ?.nickname
                }{' '}
                chooses next · {editor?.role}
              </p>
              {addition ? (
                <article className={styles.card}>
                  <h3>{CARDS[addition].title}</h3>
                  <p>{CARDS[addition].interpretation}</p>
                  <button
                    disabled={disabled || editor?.participantId !== me}
                    onClick={() =>
                      void client.command({
                        type: 'add-mechanic',
                        cardId: addition,
                      })
                    }
                  >
                    Confirm next twist
                  </button>
                </article>
              ) : (
                <button
                  disabled={disabled || editor?.participantId !== me}
                  onClick={() => void client.command({ type: 'pass' })}
                >
                  Pass · all twists are included
                </button>
              )}
            </section>
          ) : null}
          {room.phase === 'ended' ? (
            <h2>That’s our game. Thanks for playing.</h2>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
