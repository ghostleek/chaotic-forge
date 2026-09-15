'use client';
import { useState } from 'react';
import type {
  InitialCard,
  RoomSnapshot,
} from '../../lib/party-forge/contracts.ts';
import { LegacyCardPicker } from './legacy-card-picker.tsx';
import { PixelSprite } from './pixel-sprite.tsx';
import { unsupportedInstructionReason } from '../../lib/party-forge/instruction-policy.ts';
import styles from './party-room.module.css';
import { INSTRUCTION_STARTERS } from '../../lib/party-forge/instruction-starters.ts';
export function InstructionEditor({
  initial = '',
  disabled,
  onConfirm,
  label = 'Your instruction',
  confirmed = false,
}: {
  initial?: string;
  disabled: boolean;
  onConfirm: (text: string) => void;
  label?: string;
  confirmed?: boolean;
}) {
  const [text, setText] = useState(initial);
  const unsupported = unsupportedInstructionReason([text]);
  return (
    <form
      className={styles.editor}
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && !unsupported && text.trim()) onConfirm(text.trim());
      }}
    >
      <label className={styles.eyebrow} htmlFor="instruction-text">
        {label}
      </label>
      <textarea
        id="instruction-text"
        maxLength={240}
        required
        rows={4}
        placeholder="What should happen in our game?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        aria-invalid={!!unsupported}
        aria-describedby={unsupported ? 'instruction-feedback' : undefined}
      />
      {unsupported ? (
        <p id="instruction-feedback" role="alert">
          {unsupported}
        </p>
      ) : null}
      <div className={styles.editorFooter}>
        <span>{text.length}/240</span>
        <button
          className={styles.primary}
          disabled={disabled || !text.trim() || !!unsupported}
        >
          {disabled
            ? 'Saving…'
            : confirmed
              ? 'Update instruction'
              : 'Confirm instruction'}
        </button>
      </div>
      <details>
        <summary>Need an idea? Pick a starter.</summary>
        <div className={styles.starters}>
          {INSTRUCTION_STARTERS.map(
            ({ title, text: instruction, sprite, hint }) => (
              <button
                type="button"
                key={title}
                title={hint}
                onClick={() => setText(instruction)}
                disabled={disabled}
              >
                <PixelSprite kind={sprite} size={24} />
                <span>{title}</span>
                <small>{hint}</small>
              </button>
            ),
          )}
        </div>
        <p>
          Starters only prefill your card; confirm it when ready. The exact
          Snake + Space Invaders pair, in either order (including a repeated
          third card), reuses the saved demo. Chrome Dino + Mario selects the authored runner. Only the listed Dino scoring modifiers match its remix. Other edits and combinations need
          API access.
        </p>
      </details>
    </form>
  );
}
export function CardPicker(props: {
  room: RoomSnapshot;
  participantId: string;
  disabled: boolean;
  onConfirm: (choice: InitialCard) => void;
}) {
  const { room, participantId, disabled, onConfirm } = props;
  if (
    room.contributions.some(
      (c) => c.kind === 'initial' && c.choice.slot !== 'instruction',
    )
  )
    return <LegacyCardPicker {...props} />;
  const mine = room.contributions.find(
    (c) => c.participantId === participantId && c.kind === 'initial',
  );
  const initial =
    mine?.kind === 'initial' && mine.choice.slot === 'instruction'
      ? mine.choice.text
      : '';
  return (
    <section aria-labelledby="hand-title">
      <div className={styles.sectionHeading}>
        <h2 id="hand-title">One person. One rule.</h2>
        <span>
          {room.contributions.length}/{Math.max(2, room.participants.length)} IN
        </span>
      </div>
      <InstructionEditor
        initial={initial}
        confirmed={!!mine}
        disabled={disabled}
        onConfirm={(text) =>
          onConfirm({ slot: 'instruction', cardId: 'instruction', text })
        }
      />
    </section>
  );
}
