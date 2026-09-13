// The table adapter mounts the actual reusable component.
// Peers remain examples: no request or timer invents their contributions.
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { RoomStatus } from '../../../components/party-forge/room-status.tsx';

const mounts = new WeakMap();

export function renderPlayerWait(container, localChosen, onSwat) {
  let mount = mounts.get(container);
  if (!mount) {
    container.className = 'player-wait';
    const disclosure = document.createElement('p');
    disclosure.className = 'pw-preview-note';
    disclosure.textContent =
      'Local preview · Mira and Lance are example players.';
    const target = document.createElement('div');
    const hint = document.createElement('p');
    hint.className = 'pw-swat-hint';
    container.replaceChildren(disclosure, target, hint);
    mount = { root: createRoot(target), avatar: 'marmalade', hint };
    mounts.set(container, mount);
  }
  container.dataset.waiting = String(localChosen);
  mount.hint.textContent = localChosen
    ? 'Mira looks mischievous. Tap her cat to swat the world.'
    : 'Choose your card first. Mira has a trick up her sleeve.';
  flushSync(() =>
    mount.root.render(
      createElement(RoomStatus, {
        participants: [
          {
            id: 'you',
            name: 'Kahhow',
            avatar: mount.avatar,
            presence: 'present',
            contribution: localChosen ? 'chosen' : 'deciding',
          },
          {
            id: 'mira',
            name: 'Mira',
            avatar: 'lilac',
            presence: 'present',
            contribution: 'deciding',
          },
          {
            id: 'lance',
            name: 'Lance',
            avatar: 'tuxedo',
            presence: 'present',
            contribution: 'deciding',
          },
        ],
        localParticipantId: 'you',
        roundNumber: 1,
        headingId: 'wait-title',
        layout: 'table',
        className: 'table-room-status',
        onAvatarChange(avatar) {
          mount.avatar = avatar;
          renderPlayerWait(container, localChosen, onSwat);
        },
        avatarAction: {
          participantId: 'mira',
          label: "Make Mira's cat swat the world",
          disabled: !localChosen,
          onActivate: onSwat,
        },
      }),
    ),
  );
}
