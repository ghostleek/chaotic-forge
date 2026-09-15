'use client';
import {
  progressLabels,
  type ProgressEntry,
  type GameBrief,
} from '@/lib/party-forge/generation/progress';
import styles from './creation.module.css';

export function GenerationProgress({
  status,
  progress,
  brief,
}: {
  status: string;
  progress: ProgressEntry[];
  brief: GameBrief | null;
}) {
  const latest = progress.at(-1);
  const active = [
    'queued',
    'dispatching',
    'building',
    'validating',
    'recovery',
    'canceling',
  ].includes(status);
  const stage =
    status === 'queued'
      ? 'Waiting for a runner'
      : status === 'dispatching'
        ? 'Starting generation'
        : status === 'canceling'
          ? 'Canceling — waiting for confirmation'
          : status === 'recovery'
            ? 'Reconnecting to the saved job'
            : status === 'failed'
              ? 'Needs attention'
              : status === 'canceled'
                ? 'Canceled'
                : status === 'validating'
                  ? 'Testing the game'
                  : ['preview', 'ready'].includes(status)
                    ? 'Ready to playtest'
                    : brief
                      ? 'Building your game'
                      : 'Generating your game';
  return (
    <div className={styles.progressPanel}>
      <div className={styles.progressHeading}>
        <span
          className={active ? styles.activityDot : styles.completeDot}
          aria-hidden="true"
        />
        <output>{stage}</output>
      </div>
      <p className={styles.muted}>
        {latest
          ? progressLabels[latest.kind]
          : 'Activity will appear when the runner starts.'}
      </p>
      {active && (
        <p className={styles.muted}>
          Updates every few seconds. The full game brief arrives after
          generation. You can reload and return to this same job.
        </p>
      )}
      {progress.length > 0 && (
        <details open={active}>
          <summary>
            Generation activity · {progress.length} recent events
          </summary>
          <ol className={styles.activityLog} aria-label="Generation activity">
            {progress.map((entry) => (
              <li key={entry.id}>
                <time dateTime={new Date(entry.at).toISOString()}>
                  {new Date(entry.at).toISOString().slice(11, 19)} UTC
                </time>
                <span>{progressLabels[entry.kind]}</span>
              </li>
            ))}
          </ol>
          <p className={styles.muted}>
            Times show when Forge received each update. Command completion alone
            does not prove gameplay correctness.
          </p>
        </details>
      )}
      {brief && (
        <section className={styles.brief} aria-label="Game brief">
          <p className={styles.eyebrow}>FORGE INTERPRETATION</p>
          <h3>{brief.title}</h3>
          <p>{brief.summary}</p>
          {brief.questions.length > 0 && (
            <div className={styles.notice}>
              <strong>Clarification needed</strong>
              <ul>
                {brief.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
              <p>Revise your inputs and generate a new attempt.</p>
            </div>
          )}
          <dl>
            <dt>Controls</dt>
            <dd>{brief.controls}</dd>
            <dt>Round ends</dt>
            <dd>{brief.endCondition}</dd>
            <dt>Winner</dt>
            <dd>{brief.winner}</dd>
            <dt>Ties</dt>
            <dd>{brief.ties}</dd>
          </dl>
          <details>
            <summary>Rules and player contributions</summary>
            <ul>
              {brief.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            {brief.contributions.map((entry, index) => (
              <p key={index}>
                <strong>{entry.input}</strong>
                <br />
                {entry.mechanics}
                <br />
                <small>Playtest check: {entry.acceptance}</small>
              </p>
            ))}
            {brief.adaptations.length > 0 && (
              <>
                <h4>Adaptations and assumptions</h4>
                <ul>
                  {brief.adaptations.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </>
            )}
          </details>
          <details>
            <summary>Source references · {brief.sources.length}</summary>
            {brief.sources.length ? (
              <ul>
                {brief.sources.map((source, index) => (
                  <li key={index}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                No source links were supplied. The brief is a model
                interpretation.
              </p>
            )}
          </details>
          <p className={styles.muted}>
            Proposed rules from the generator. Playtesting and your acceptance
            are recorded separately; scores are local in this MVP.
          </p>
        </section>
      )}
    </div>
  );
}
