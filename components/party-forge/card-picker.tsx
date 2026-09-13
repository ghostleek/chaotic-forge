import { useState } from 'react';
import { CARDS } from '../../lib/party-forge/cards.ts';
import { INITIAL_PATH } from '../../lib/party-forge/client/demo-path.ts';
import type {
  InitialCard,
  RoomSnapshot,
} from '../../lib/party-forge/contracts.ts';
import styles from './party-room.module.css';

export function CardPicker({
  room,
  participantId,
  disabled,
  onConfirm,
}: {
  room: RoomSnapshot;
  participantId: string;
  disabled: boolean;
  onConfirm: (choice: InitialCard) => void;
}) {
  const [selected, setSelected] = useState<InitialCard | null>(null);
  const chosen = room.contributions.some(
    (c) => c.participantId === participantId,
  );
  const claimed = (choice: InitialCard) =>
    room.contributions.some(
      (c) => c.kind === 'initial' && c.choice.slot === choice.slot,
    );
  return (
    <section aria-labelledby="hand-title">
      <h2 id="hand-title">One card. Your contribution.</h2>
      <p>
        Choose an available card. Together, these three ideas make Kitchen
        Chaos.
      </p>
      <div className={styles.hand}>
        {INITIAL_PATH.map((choice) => (
          <article
            className={styles.card}
            key={choice.cardId}
            data-selected={selected?.cardId === choice.cardId}
          >
            <span className={styles.eyebrow}>{choice.slot}</span>
            <h3>{CARDS[choice.cardId].title}</h3>
            <p>{CARDS[choice.cardId].interpretation}</p>
            <details>
              <summary>See how it works</summary>
              <p>
                {choice.slot === 'fps'
                  ? 'Aim → shoot → push a zombie away.'
                  : choice.slot === 'zombies'
                    ? 'Move near a zombie → it follows → protect the cooking station.'
                    : 'Prepare → cook → collect → deliver.'}
              </p>
            </details>
            <button
              type="button"
              disabled={disabled || chosen || claimed(choice)}
              aria-pressed={selected?.cardId === choice.cardId}
              onClick={() => setSelected(choice)}
            >
              {claimed(choice)
                ? 'Contributed'
                : selected?.cardId === choice.cardId
                  ? 'Selected'
                  : `Select ${CARDS[choice.cardId].title}`}
            </button>
          </article>
        ))}
      </div>
      <button
        className={styles.primary}
        type="button"
        disabled={disabled || chosen || !selected || claimed(selected)}
        onClick={() => selected && onConfirm(selected)}
      >
        {chosen
          ? 'Contribution confirmed'
          : disabled
            ? 'Waiting for room updates'
            : 'Confirm contribution'}
      </button>
    </section>
  );
}
