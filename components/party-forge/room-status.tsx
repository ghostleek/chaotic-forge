'use client';

import { useId } from 'react';
import { PixelSprite } from './pixel-sprite.tsx';
import styles from './room-status.module.css';

export const CAT_AVATARS = [
  { id: 'marmalade', name: 'Marmalade' },
  { id: 'lilac', name: 'Lilac' },
  { id: 'tuxedo', name: 'Tuxedo' },
  { id: 'cloud', name: 'Cloud' },
  { id: 'calico', name: 'Calico' },
  { id: 'midnight', name: 'Midnight' },
] as const;

export type CatAvatarId = (typeof CAT_AVATARS)[number]['id'];

/** Presentation input, not a room protocol or a grant of contribution rights. */
export type RoomStatusParticipant = {
  id: string;
  name: string;
  avatar: CatAvatarId;
  presence: 'present' | 'away' | 'reconnecting';
  /** `chosen` must come from the accepted contribution for the current phase. */
  contribution: 'deciding' | 'chosen' | 'watching' | 'up-next';
};

export type RoomStatusProps = {
  participants: readonly RoomStatusParticipant[];
  localParticipantId?: string;
  roundNumber: number;
  expectedContributions?: number;
  phase?: 'initial' | 'additions';
  connection?: 'connected' | 'reconnecting';
  indicator?: 'badge' | 'ring';
  layout?: 'panel' | 'table';
  headingId?: string;
  /** Optional local decorative action; never grants a contribution right. */
  avatarAction?: {
    participantId: string;
    label: string;
    disabled?: boolean;
    onActivate: () => void;
  };
  /** Supply only the current viewer's selection, from a client state owner. */
  selection?: {
    label: string;
    submitting: boolean;
    error?: string;
    onConfirm: () => void;
  };
  onAvatarChange?: (avatar: CatAvatarId) => void;
  className?: string;
};

const statuses = {
  chosen: { label: 'Chosen', mark: '✓' },
  deciding: { label: 'Deciding', mark: '…' },
  sending: { label: 'Sending…', mark: '…' },
  away: { label: 'Away', mark: '!' },
  reconnecting: { label: 'Reconnecting', mark: '!' },
  watching: { label: 'Watching', mark: '—' },
  'up-next': { label: 'Up next', mark: '→' },
} as const;

const names = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

/** Decorative waiting feedback; never changes state or live-region text. */
function WaitingDots() {
  return (
    <span className={styles['fw-waiting-dots']} aria-hidden="true">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}

/** Controlled view: no timers, network calls, optimistic success, or fixture data. */
export function RoomStatus({
  participants,
  localParticipantId,
  roundNumber,
  expectedContributions,
  phase = 'initial',
  connection = 'connected',
  indicator = 'badge',
  layout = 'panel',
  headingId: suppliedHeadingId,
  avatarAction,
  selection,
  onAvatarChange,
  className,
}: RoomStatusProps) {
  const generatedHeadingId = useId();
  const headingId = suppliedHeadingId ?? generatedHeadingId;
  const avatarHeadingId = useId();
  const errorId = useId();
  const local = participants.find((player) => player.id === localParticipantId);
  const required = participants.filter(
    (player) => player.contribution !== 'watching',
  );
  const confirmed = required.filter(
    (player) => player.contribution === 'chosen',
  ).length;
  const waiting = required.filter((player) => player.contribution !== 'chosen');
  const paused = connection === 'reconnecting';
  const expected = Math.max(expectedContributions ?? required.length, required.length);
  const complete = expected > 0 && confirmed === expected;
  const sending = !!selection?.submitting && local?.contribution === 'deciding';
  const showSelection =
    !!selection && !!local && local.contribution !== 'watching';
  const canConfirm =
    !!selection?.label.trim() &&
    local?.contribution === 'deciding' &&
    local.presence === 'present' &&
    !paused &&
    !sending;
  const count = `${confirmed} / ${expected} ${phase === 'additions' ? 'additions confirmed' : 'chosen'}${paused ? ' · last known' : ''}`;
  const waitText = paused
    ? 'Checking room connection'
    : required.length === 0
      ? participants.length === 0
        ? 'No participants yet'
        : 'No choices due from this group'
      : complete
        ? 'Choices complete'
        : waiting.length ? `Waiting for ${names.format(waiting.map((player) => player.name))}` : 'Waiting for more players to join';
  const title = paused
    ? 'Room updates paused.'
    : participants.length === 0
      ? 'Waiting for players.'
      : complete
        ? 'Everyone’s idea is in.'
        : phase === 'additions'
          ? 'The next twists await.'
          : 'A little chaos, together.';
  const summary = paused
    ? 'Reconnecting you. Showing the last known choices.'
    : complete
      ? 'Choices confirmed. Next comes forging.'
      : local?.contribution === 'chosen'
        ? 'Your choice is kept. Waiting for the others.'
        : phase === 'additions'
          ? 'The next editors choose. Everyone plays again.'
          : 'Pick your card. We’ll wait for everyone.';
  const displayPlayers = participants.map((player) => {
    const status =
      player.presence !== 'present'
        ? player.presence
        : player.id === localParticipantId && sending
          ? 'sending'
          : player.contribution;
    return { ...player, status, ...statuses[status] };
  });
  const announcement = [
    sending ? 'Sending your choice.' : '',
    count,
    waitText,
    ...displayPlayers.map(
      (player) =>
        `${player.name}: ${player.label}${player.presence !== 'present' && player.contribution === 'chosen' ? ', choice saved' : ''}.`,
    ),
    local && onAvatarChange ? `Your cat: ${local.avatar}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-indicator={indicator}
      data-layout={layout}
    >
      <section className={styles['fw-surface']} aria-labelledby={headingId}>
        <div className={styles['fw-header']}>
          <span className={styles['fw-wordmark']}>FORGE /</span>
          <span className={styles['fw-round']}>
            ROUND {String(roundNumber).padStart(2, '0')} ·{' '}
            {phase === 'additions' ? 'ADDITIONS' : 'CHOOSE'}
          </span>
        </div>
        <div className={styles['fw-intro']}>
          <h2 id={headingId} tabIndex={-1}>
            {title}
          </h2>
          <p className={styles['fw-summary']}>{summary}</p>
        </div>
        <ul
          className={styles['fw-roster']}
          aria-label="Players and contribution states"
        >
          {displayPlayers.map((player) => (
            <li
              key={player.id}
              className={styles['fw-player']}
              data-player-id={player.id}
              data-status={player.status}
            >
              <div className={styles['fw-portrait']}>
                {avatarAction?.participantId === player.id ? (
                  <button
                    type="button"
                    className={styles['fw-avatar-action']}
                    aria-label={avatarAction.label}
                    disabled={avatarAction.disabled}
                    onClick={avatarAction.onActivate}
                  >
                    <PixelSprite kind="cat" size={64} />
                  </button>
                ) : (
                  <PixelSprite kind="cat" size={64} />
                )}
                <span className={styles['fw-mark']} aria-hidden="true">
                  {!paused &&
                  (player.status === 'deciding' ||
                    player.status === 'sending' ||
                    player.status === 'reconnecting') ? (
                    <WaitingDots />
                  ) : (
                    player.mark
                  )}
                </span>
              </div>
              <span className={styles['fw-name']}>
                {player.name}
                {player.id === localParticipantId ? (
                  <>
                    {' '}
                    <span className={styles['fw-you']}>you</span>
                  </>
                ) : null}
              </span>
              <span className={styles['fw-state']}>{player.label}</span>
              {player.presence !== 'present' &&
              player.contribution === 'chosen' ? (
                <span className={styles['fw-saved']}>✓ Choice saved</span>
              ) : null}
            </li>
          ))}
        </ul>
        {showSelection && selection ? (
          <div className={styles['fw-choice']}>
            <div className={styles['fw-local']}>
              <span className={styles['fw-local-label']}>
                {local.contribution === 'chosen'
                  ? 'Your contribution is confirmed'
                  : 'Your selected card · only you can see this'}
              </span>
              <span>
                {local.contribution === 'chosen'
                  ? 'Choice saved'
                  : selection.label || 'Select a card first'}
              </span>
              {selection.error && local.contribution !== 'chosen' ? (
                <p id={errorId} className={styles['fw-error']} role="alert">
                  {selection.error}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className={styles['fw-action']}
              disabled={!canConfirm}
              onClick={selection.onConfirm}
              aria-describedby={
                selection.error && local.contribution !== 'chosen'
                  ? errorId
                  : undefined
              }
              aria-label={
                paused ? 'Reconnecting…' : sending ? 'Sending…' : undefined
              }
            >
              {paused ? (
                <>
                  Reconnecting
                  <WaitingDots />
                </>
              ) : sending ? (
                <>
                  Sending
                  <WaitingDots />
                </>
              ) : local.contribution === 'chosen' ? (
                '✓ Chosen'
              ) : local.contribution === 'up-next' ? (
                'Waiting for your turn'
              ) : local.presence !== 'present' ? (
                'Waiting for connection'
              ) : (
                'Confirm my card'
              )}
            </button>
          </div>
        ) : null}
        <div className={styles['fw-bottom']}>
          <span className={styles['fw-count']}>{count}</span>
          <span className={styles['fw-wait-for']}>
            {waitText}
            {paused || waiting.length > 0 || participants.length === 0 ? (
              <WaitingDots />
            ) : null}
          </span>
        </div>
      </section>
      {onAvatarChange && local ? (
        <section
          className={styles['fw-avatar-section']}
          aria-labelledby={avatarHeadingId}
        >
          <div className={styles['fw-avatar-head']}>
            <h3 className={styles['fw-avatar-title']} id={avatarHeadingId}>
              Pick your cat
            </h3>
            <span className={styles['fw-avatar-note']}>
              Your look stays yours in every state.
            </span>
          </div>
          <div className={styles['fw-cats']}>
            {CAT_AVATARS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={styles['fw-cat-option']}
                aria-label={`Use ${cat.name} cat`}
                aria-pressed={cat.id === local.avatar}
                onClick={() => onAvatarChange(cat.id)}
              >
                <PixelSprite kind="cat" size={32} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className={styles['fw-legend']} aria-label="Status key">
        <span>
          <i
            className={styles['fw-dot']}
            data-color="green"
            aria-hidden="true"
          />
          Chosen
        </span>
        <span>
          <i
            className={styles['fw-dot']}
            data-color="orange"
            aria-hidden="true"
          />
          Deciding
        </span>
        <span>
          <i className={styles['fw-dot']} data-color="red" aria-hidden="true" />
          Away / reconnecting
        </span>
      </div>
      <output className={styles['fw-sr']} aria-live="polite" aria-atomic="true">
        {announcement}
      </output>
    </div>
  );
}
