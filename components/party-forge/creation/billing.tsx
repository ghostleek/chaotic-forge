'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './creation.module.css';
export type BillingStatus = {
  trial: boolean;
  remaining: number;
  hasKey: boolean;
  email: string;
  userId: string;
  admin: boolean;
};
export function Billing({
  status,
  csrf,
  refresh,
  roomSetup = false,
  returnTo = '/forge/create',
}: {
  roomSetup?: boolean;
  returnTo?: string;
  status: BillingStatus;
  csrf: string;
  refresh: () => Promise<void>;
}) {
  const [key, setKey] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  async function update(path: string, body: unknown, method = 'POST') {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(`/api/forge/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Forge-CSRF': csrf },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok)
        throw new Error('Could not save. Check your input and try again.');
      setKey('');
      await refresh();
      setNotice('Saved.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
  const funded = status.admin || status.hasKey;
  const settings = (
    <>
      {!status.admin && (
        <>
          <p className={styles.muted}>
            Your key is encrypted on the server and never sent to the game.
            Removing it prevents future use; requests already sent may finish.
          </p>
          <label htmlFor="openai-key">
            OpenAI application API key {status.hasKey ? '(saved)' : ''}
          </label>
          <input
            id="openai-key"
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            maxLength={256}
          />
          <div className={styles.actions}>
            <button
              disabled={busy || key.length < 20}
              onClick={() => update('billing', { key })}
            >
              Save key
            </button>
            {status.hasKey && (
              <button
                disabled={busy}
                onClick={() => update('billing', null, 'DELETE')}
              >
                Remove key
              </button>
            )}
          </div>
        </>
      )}
      <p className={styles.muted}>Your creator ID: {status.userId}</p>
      <a
        className={styles.outlineButton}
        href={`/signout-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`}
        target="_top"
      >
        Sign out
      </a>
    </>
  );
  return (
    <section className={styles.card}>
      <h2>{funded ? 'You’re ready to create' : 'Add your API key'}</h2>
      <p>
        Signed in as {status.email}.{' '}
        {status.admin
          ? 'Your admin access covers game creation.'
          : status.hasKey
            ? 'Your saved API key is ready. Generation is billed to your OpenAI API project.'
            : 'Game generation is billed to your OpenAI API project. ChatGPT sign-in does not include API credits.'}
      </p>
      {funded ? (
        <details>
          <summary>Account and API settings</summary>
          {settings}
        </details>
      ) : (
        settings
      )}
      {!roomSetup && (
        <p>
          <Link href="/">Create or join a pixel game →</Link>
        </p>
      )}
      {notice && <output>{notice}</output>}
    </section>
  );
}
