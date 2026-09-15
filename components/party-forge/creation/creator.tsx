'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ForgeHeader } from '../forge-header';
import { Billing, type BillingStatus } from './billing';
import { z } from 'zod';
import { CONCEPTS } from '@/lib/party-forge/generation/contracts';
import styles from './creation.module.css';
type SavedJob = {
  id: string;
  cards: string[];
  parent: string | null;
  status: string;
  error: string | null;
  model: string | null;
  artifactHash: string | null;
};
const billingSchema = z.object({
  trial: z.boolean(),
  remaining: z.number(),
  hasKey: z.boolean(),
  email: z.string(),
  userId: z.string(),
  admin: z.boolean(),
});
const accessSchema = z.object({
  billing: billingSchema.optional(),
  csrf: z.string(),
  available: z.boolean(),
});
const jobSchema = z.object({
  id: z.uuid(),
  cards: z.array(z.string()),
  parent: z.string().nullable(),
  status: z.string(),
  error: z.string().nullable(),
  model: z.string().nullable(),
  artifactHash: z.string().nullable(),
});
const active = new Set([
  'queued',
  'dispatching',
  'building',
  'validating',
  'canceling',
  'recovery',
]);
export function Creator({ signedIn = false }: { signedIn?: boolean }) {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [code, setCode] = useState('');
  const [csrf, setCsrf] = useState('');
  const [available, setAvailable] = useState(false);
  const [cards, setCards] = useState<string[]>(['snake', 'invaders']);
  const [parent, setParent] = useState<SavedJob | null>(null);
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [playing, setPlaying] = useState<SavedJob | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [completedRun, setCompletedRun] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestKey, setRequestKey] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const access = await fetch('/api/forge/access', {
          signal: controller.signal,
        });
        if (!access.ok) {
          if (access.status === 401) setCsrf('');
          return;
        }
        const session = accessSchema.parse(await access.json());
        setCsrf(session.csrf);
        setBilling(session.billing ?? null);
        setAvailable(session.available);
        const response = await fetch('/api/forge/generations', {
          signal: controller.signal,
        });
        if (response.ok)
          setJobs(
            z.object({ jobs: z.array(jobSchema) }).parse(await response.json())
              .jobs,
          );
      } catch {
        /* An interrupted poll must not discard choices or a playable build. */
      }
    }
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 5000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  async function call(path: string, body?: unknown, method = 'POST') {
    const response = await fetch(`/api/forge/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Forge-CSRF': csrf },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        z.object({ error: z.string() }).safeParse(result).data?.error ??
          'Request failed. Try again.',
      );
    return result;
  }
  async function unlock(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const result = accessSchema.parse(await call('access', { code }));
      setCode('');
      setCsrf(result.csrf);
      setAvailable(result.available);
      setNotice('Creator unlocked. Choose your concepts.');
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Could not unlock creation.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setNotice('');
    const key = requestKey || crypto.randomUUID();
    setRequestKey(key);
    try {
      const job = jobSchema.parse(
        await call('generations', {
          requestKey: key,
          cards,
          ...(parent ? { parent: parent.id } : {}),
        }),
      );
      setJobs((previous) => [job, ...previous.filter((j) => j.id !== job.id)]);
      setRequestKey('');
      setNotice('Your build is queued. You can play the demo while it works.');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not submit. Your choices are preserved.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    setBusy(true);
    try {
      const job = jobSchema.parse(await call(`generations/${id}/cancel`));
      setJobs((previous) => previous.map((j) => (j.id === id ? job : j)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not cancel.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <ForgeHeader><Link href="/play/snake-space-invaders">Play the public demo</Link></ForgeHeader>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>THE GAME IS YOURS TO MAKE</p>
        <h1>
          Two ideas.
          <br />
          <span>Something new.</span>
        </h1>
        <p>
          Choose the rules for an experimental game. Live generation uses GPT-6
          Astra through the Agents API when the service is enabled.
        </p>
      </div>
      <div className={styles.creator}>
        {signedIn && !csrf && (
          <p className={styles.notice}>
            Loading your creator access. The public demo is playable now.
          </p>
        )}
        {signedIn && billing && (
          <Billing
            status={billing}
            csrf={csrf}
            refresh={async () => {
              const response = await fetch('/api/forge/billing');
              if (response.ok)
                setBilling(billingSchema.parse(await response.json()));
            }}
          />
        )}
        {!csrf ? (
          <form className={styles.card} onSubmit={unlock} hidden={signedIn}>
            <h2>
              {signedIn
                ? 'Loading your creator session'
                : 'Unlock game creation'}
            </h2>
            <p>
              Creation is limited to invited creators. Everyone can play the
              saved demo without a code.
            </p>
            <label htmlFor="creator-code">Creator access code</label>
            <input
              id="creator-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              maxLength={256}
              required
            />
            <button className={styles.primary} disabled={busy}>
              {busy ? 'Checking…' : 'Unlock creator'}
            </button>
          </form>
        ) : (
          <section className={styles.card}>
            <h2>
              {parent
                ? 'Add a rule to your game'
                : 'Pick your collision of ideas'}
            </h2>
            <p>
              {parent
                ? 'Earlier concepts stay. Add a new concept to create a separate version.'
                : 'Select at least two concepts. These are experimental generated games, with local scores.'}
            </p>
            {!available && (
              <p className={styles.notice}>
                Live creation is offline until the generation runner is ready.
                Your choices stay here, and the public demo is playable now.
              </p>
            )}
            <div className={styles.choices}>
              {CONCEPTS.map((c) => (
                <button
                  key={c.id}
                  aria-pressed={cards.includes(c.id)}
                  disabled={busy || !!parent?.cards.includes(c.id)}
                  onClick={() => {
                    setCards((previous) =>
                      previous.includes(c.id)
                        ? previous.filter((id) => id !== c.id)
                        : [...previous, c.id],
                    );
                    setRequestKey('');
                  }}
                >
                  {c.title}
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                disabled={
                  busy ||
                  !available ||
                  (signedIn &&
                    !billing?.hasKey &&
                    !billing?.admin &&
                    !(billing?.trial && billing.remaining > 0)) ||
                  cards.length < 2 ||
                  jobs.some((j) => active.has(j.status)) ||
                  (!!parent && cards.length <= parent.cards.length)
                }
                onClick={generate}
              >
                {busy
                  ? 'Submitting…'
                  : parent
                    ? 'Generate remix'
                    : 'Generate game'}
              </button>
              {parent && (
                <button
                  onClick={() => {
                    setParent(null);
                    setCards(['snake', 'invaders']);
                    setRequestKey('');
                  }}
                >
                  Start fresh
                </button>
              )}
              {!signedIn && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await call('access', undefined, 'DELETE');
                      setCsrf('');
                      setJobs([]);
                      setPlaying(null);
                    } catch {
                      setNotice('Could not lock the creator. Try again.');
                    }
                  }}
                >
                  Lock creator
                </button>
              )}
            </div>
          </section>
        )}
        {notice && <output className={styles.notice}>{notice}</output>}
        <section className={styles.card}>
          <h2>Play without waiting.</h2>
          <p>
            Snake × Space Invaders replays the saved remix. No sign-in, no
            generation request, just play.
          </p>
          <Link className={styles.textLink} href="/play/snake-space-invaders">
            Play demo →
          </Link>
        </section>
        {jobs.length > 0 && (
          <section className={styles.card}>
            <h2>Your builds</h2>
            <p className={styles.muted}>
              Saved executable versions. Reloading a ready build never
              regenerates it.
            </p>
            <ul className={styles.history}>
              {jobs.map((job) => (
                <li key={job.id}>
                  <strong>
                    {job.cards
                      .map(
                        (id) => CONCEPTS.find((c) => c.id === id)?.title ?? id,
                      )
                      .join(' × ')}
                  </strong>
                  <p>
                    Status:{' '}
                    {job.status === 'dispatching' ? 'starting' : job.status}
                  </p>
                  {job.error && <p className={styles.error}>{job.error}</p>}
                  {['ready', 'preview'].includes(job.status) ? (
                    <>
                      <p className={styles.muted}>
                        Generated with {job.model}. Browser smoke checked;
                        gameplay quality is experimental.
                      </p>
                      <div className={styles.actions}>
                        <button
                          onClick={() => {
                            setPlaying(job);
                            setChecked([]);
                            setCompletedRun(false);
                          }}
                        >
                          Play saved build
                        </button>
                        {job.status === 'ready' &&
                          job.cards.length < CONCEPTS.length && (
                            <button
                              onClick={() => {
                                setParent(job);
                                setCards(job.cards);
                                setRequestKey('');
                              }}
                            >
                              Remix this game
                            </button>
                          )}
                      </div>
                    </>
                  ) : (
                    active.has(job.status) && (
                      <button
                        disabled={busy || job.status === 'canceling'}
                        onClick={() => cancel(job.id)}
                      >
                        Cancel build
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {playing && (
          <section className={styles.card}>
            <h2>Your playable build</h2>
            <p>
              Experimental generated game · local score · saved version{' '}
              {playing.artifactHash?.slice(0, 8)}
            </p>
            <iframe
              key={playing.id}
              className={styles.player}
              title="Generated game"
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              allow="camera 'none'; microphone 'none'; geolocation 'none'"
              src={`/api/forge/generations/${playing.id}/artifact`}
            />
            {playing.status === 'preview' && (
              <div>
                <p>
                  Play a complete run, then confirm what you observed. These are
                  your playtest decisions, not automated test results.
                </p>
                {playing.cards.map((id) => (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={checked.includes(id)}
                      onChange={(e) =>
                        setChecked((previous) =>
                          e.target.checked
                            ? [...previous, id]
                            : previous.filter((c) => c !== id),
                        )
                      }
                    />{' '}
                    {CONCEPTS.find((c) => c.id === id)?.title}: I observed this
                    mechanic working.
                  </label>
                ))}
                <label>
                  <input
                    type="checkbox"
                    checked={completedRun}
                    onChange={(e) => setCompletedRun(e.target.checked)}
                  />{' '}
                  I completed a run with a win or loss.
                </label>
                <button
                  disabled={
                    busy ||
                    !completedRun ||
                    checked.length !== playing.cards.length
                  }
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const result = jobSchema.parse(
                        await call(`generations/${playing.id}/accept`, {
                          completedRun: true,
                          checkedConcepts: checked,
                        }),
                      );
                      setPlaying(result);
                      setJobs((previous) =>
                        previous.map((j) => (j.id === result.id ? result : j)),
                      );
                    } catch (error) {
                      setNotice(
                        error instanceof Error
                          ? error.message
                          : 'Could not save acceptance.',
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Keep this build
                </button>
              </div>
            )}
            <button onClick={() => setPlaying(null)}>Close game</button>
          </section>
        )}
      </div>
    </main>
  );
}
