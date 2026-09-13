import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CAT_AVATARS,
  RoomStatus,
  type CatAvatarId,
  type RoomStatusParticipant,
} from '../../../components/party-forge/room-status';

const initialPlayers: RoomStatusParticipant[] = [
  {
    id: 'a',
    name: 'Kahhow',
    avatar: 'marmalade',
    presence: 'present',
    contribution: 'deciding',
  },
  {
    id: 'b',
    name: 'Mira',
    avatar: 'lilac',
    presence: 'present',
    contribution: 'chosen',
  },
  {
    id: 'c',
    name: 'Lance',
    avatar: 'tuxedo',
    presence: 'reconnecting',
    contribution: 'deciding',
  },
];

function Preview() {
  const [scenario, setScenario] = useState('mixed');
  const [avatar, setAvatar] = useState<CatAvatarId>('marmalade');
  const [submission, setSubmission] = useState<
    'idle' | 'pending' | 'accepted' | 'rejected'
  >('idle');
  const [count, setCount] = useState('3');
  const [indicator, setIndicator] = useState<'badge' | 'ring'>('badge');
  const roster =
    count === '3'
      ? initialPlayers
      : [
          ...initialPlayers,
          ...['Jo', 'Noor', 'Sam'].map(
            (name, i): RoomStatusParticipant => ({
              id: `extra-${i}`,
              name,
              avatar: CAT_AVATARS[i + 3].id,
              presence: 'present',
              contribution: 'deciding',
            }),
          ),
        ];
  const participants = roster.map((player, i): RoomStatusParticipant => {
    let contribution = player.contribution;
    let presence = player.presence;
    if (scenario === 'all') {
      contribution = 'chosen';
      presence = 'present';
    }
    if (scenario === 'saved') contribution = i === 1 ? 'deciding' : 'chosen';
    if (scenario === 'editors') {
      presence = 'present';
      contribution = i === 0 ? 'deciding' : i === 2 ? 'up-next' : 'watching';
    }
    if (scenario === 'offline') presence = 'present';
    if (i === 0 && submission === 'accepted') contribution = 'chosen';
    if (i === 2 && scenario === 'editors' && submission === 'accepted')
      contribution = 'deciding';
    return {
      ...player,
      avatar: i === 0 ? avatar : player.avatar,
      contribution,
      presence,
    };
  });
  return (
    <>
      <div className="preview-controls">
        <strong>Component preview · simulated players</strong>
        <label>
          Scenario{' '}
          <select
            value={scenario}
            onChange={(event) => {
              setScenario(event.target.value);
              setSubmission('idle');
            }}
          >
            <option value="mixed">Mixed states</option>
            <option value="all">Everyone chosen</option>
            <option value="saved">Disconnected after choosing</option>
            <option value="editors">Next editors</option>
            <option value="offline">Your connection lost</option>
          </select>
        </label>
        <label>
          Players{' '}
          <select
            value={count}
            onChange={(event) => setCount(event.target.value)}
          >
            <option>3</option>
            <option>6</option>
          </select>
        </label>
        <label>
          Indicator{' '}
          <select
            value={indicator}
            onChange={(event) =>
              setIndicator(event.target.value === 'ring' ? 'ring' : 'badge')
            }
          >
            <option value="badge">Badge</option>
            <option value="ring">Ring</option>
          </select>
        </label>
        {submission === 'pending' ? (
          <>
            <button type="button" onClick={() => setSubmission('accepted')}>
              Simulate room acceptance
            </button>
            <button type="button" onClick={() => setSubmission('rejected')}>
              Simulate room rejection
            </button>
          </>
        ) : null}
      </div>
      <RoomStatus
        participants={participants}
        localParticipantId="a"
        roundNumber={scenario === 'editors' ? 2 : 1}
        phase={scenario === 'editors' ? 'additions' : 'initial'}
        connection={scenario === 'offline' ? 'reconnecting' : 'connected'}
        indicator={indicator}
        selection={{
          label: 'Jump quest',
          submitting: submission === 'pending',
          error:
            submission === 'rejected'
              ? 'Choice rejected. Try again.'
              : undefined,
          onConfirm: () => setSubmission('pending'),
        }}
        onAvatarChange={setAvatar}
      />
    </>
  );
}

const element = document.getElementById('preview-root');
if (element) createRoot(element).render(<Preview />);
