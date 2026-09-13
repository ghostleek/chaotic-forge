'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { DINO_MARIO_PROVENANCE as provenance } from '@/lib/party-forge/demos/dino-mario';
import styles from './dino-mario.module.css';

const DISMISSED = 'forge/dino-mario-introduction/2';
let dismissedInMemory = false;

export function DemoProvenance() {
  return (
    <details className={styles.provenance}>
      <summary>Source, interpretation &amp; decision</summary>
      <dl>
        <dt>Source</dt>
        <dd>{provenance.source}</dd>
        <dt>Forge interpretation</dt>
        <dd>{provenance.interpretation}</dd>
        <dt>User decision</dt>
        <dd>{provenance.decision}</dd>
      </dl>
    </details>
  );
}

function RemixSketch() {
  return (
    <svg className={styles.sketch} viewBox="0 0 600 175" aria-hidden="true">
      <path d="M0 142H600" stroke="currentColor" strokeWidth="2" />
      <path
        d="M92 124V96H108V65H139V91H154V101H123V117H112V132H102V124Z"
        fill="#456850"
      />
      <path d="M93 111H78V99H84V105H95" fill="#456850" />
      <rect x="130" y="72" width="4" height="4" fill="#f7f4e9" />
      <path
        d="M172 113Q228 -8 281 108"
        fill="none"
        stroke="#456850"
        strokeWidth="2"
        strokeDasharray="5 6"
      />
      <path
        d="M273 99L282 111L285 96"
        fill="none"
        stroke="#456850"
        strokeWidth="2"
      />
      <path d="M196 142L203 112L210 142L218 112L225 142Z" fill="#b72e32" />
      <path
        d="M275 142V131H270V121L279 113H297L306 121V131H301V142H294V135H282V142Z"
        fill="#79648b"
      />
      <path d="M280 123H284M294 123H298" stroke="#f7f4e9" strokeWidth="3" />
      <path
        d="M315 106Q371 -13 428 107"
        fill="none"
        stroke="#79648b"
        strokeWidth="2"
        strokeDasharray="5 6"
      />
      <path
        d="M420 98L429 111L432 96"
        fill="none"
        stroke="#79648b"
        strokeWidth="2"
      />
      <path d="M354 142L361 112L368 142L376 112L383 142Z" fill="#b72e32" />
      <path d="M473 142V77H512L497 92H473" fill="#456850" />
    </svg>
  );
}

export function DemoIntroduction({
  autoOpen = false,
  inGame = false,
  onOpen,
}: {
  autoOpen?: boolean;
  inGame?: boolean;
  onOpen?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!autoOpen) return;
    let dismissed = dismissedInMemory;
    try {
      dismissed ||= sessionStorage.getItem(DISMISSED) === 'yes';
    } catch {
      /* Memory fallback. */
    }
    if (!dismissed) {
      dialog.current?.showModal();
      action.current?.focus();
    }
  }, [autoOpen]);

  function changeStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>('h2')?.focus());
  }

  function close() {
    remember();
    dialog.current?.close();
  }
  function remember() {
    dismissedInMemory = true;
    try {
      sessionStorage.setItem(DISMISSED, 'yes');
    } catch {
      /* Dismissal still works. */
    }
  }

  return (
    <>
      <button
        ref={opener}
        className={styles.textButton}
        type="button"
        aria-haspopup="dialog"
        aria-controls={id}
        onClick={() => {
          setStep(0);
          onOpen?.();
          dialog.current?.showModal();
          action.current?.focus();
        }}
      >
        How this remix works <span aria-hidden="true">↗</span>
      </button>
      <dialog
        ref={dialog}
        id={id}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onClose={() => {
          remember();
          opener.current?.focus();
        }}
        onCancel={remember}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key !== 'Tab') return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button, a[href], summary',
            ),
          ).filter((element) => element.getClientRects().length > 0);
          const first = controls[0],
            last = controls.at(-1);
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
        }}
      >
        <div className={styles.introduction}>
          <div className={styles.introTop}>
            <span className={styles.eyebrow}>A SMALL EXAMPLE OF FORGE</span>
            <button
              className={styles.close}
              type="button"
              aria-label="Close introduction"
              onClick={close}
            >
              ×
            </button>
          </div>
          <p className={styles.badge}>{provenance.origin}</p>
          <p className={styles.stepLabel} aria-live="polite">{step === 0 ? '1 / 2 · YOUR IDEAS' : '2 / 2 · THE REMIX'}</p>
          {step === 0 ? <>
            <h2 tabIndex={-1} id={`${id}-title`}>Two players.<br />One remix.</h2>
            <p className={styles.introLead}>Bring different ideas. Play what they become.</p>
            <figure className={styles.contributionDiagram} aria-label="Player one contributes Chrome offline Dino run. Player two contributes Mario. Forge combines both into one playable remix.">
              <div className={styles.contributionCards}>
                <article><span>PLAYER 1</span><h3>Chrome offline<br />Dino run</h3><p>Keep running.<br />Jump over danger.</p></article>
                <span className={styles.combineSign} aria-hidden="true">+</span>
                <article><span>PLAYER 2</span><h3>Mario</h3><p>Stomp enemies.<br />Eat to grow.</p></article>
              </div>
              <div className={styles.mergeLines} aria-hidden="true">↘ &nbsp; ↙</div>
              <figcaption><strong>FORGE REMIXES THE RULES</strong><span>One running game. Both players’ ideas.</span></figcaption>
            </figure>
            <p id={`${id}-description`} className={styles.disclosure}>An illustrated example of players contributing ideas. The next screen shows their prepared remix; this walkthrough does not make an AI call.</p>
          </> : <>
          <h2 tabIndex={-1} id={`${id}-title`}>
            Dino <span>×</span> Mario
          </h2>
          <p className={styles.introLead}>Run. Stomp. Eat. Grow.</p>
          <RemixSketch />
          <div className={styles.rulePair}>
            <p>
              <b>01 / CLEAR</b> Jump over red spike traps.
            </p>
            <p>
              <b>02 / BOUNCE</b> Land on walkers to bounce ahead.
            </p>
          </div>
          <p id={`${id}-description`} className={styles.disclosure}>
            This prepared example runs locally. Playing it does not generate a
            game or call AI. Start with three lives; meat makes you bigger and adds a life. Space or Jump is all you need.
          </p>
          </>}
          <DemoProvenance />
          <div className={styles.actions}>
            {step === 0 ? <button className={styles.primary} type="button" onClick={() => changeStep(1)}>See the remix <span aria-hidden="true">→</span></button> : inGame ? (
              <button
                ref={action}
                className={styles.primary}
                type="button"
                onClick={close}
              >
                Back to demo
              </button>
            ) : (
              <Link
                className={styles.primary}
                href="/play/dino-mario"
                onClick={close}
              >
                Try simulated demo <span aria-hidden="true">→</span>
              </Link>
            )}
            {step === 1 ? <button className={styles.secondary} type="button" onClick={() => changeStep(0)}>Back</button> : null}
            <button
              ref={inGame && step === 1 ? undefined : action}
              className={styles.secondary}
              type="button"
              onClick={close}
            >
              Skip introduction
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
