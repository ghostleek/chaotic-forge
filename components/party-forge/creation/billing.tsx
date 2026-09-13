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
}: {
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
  return (
    <section className={styles.card}>
      <h2>
        {status.admin
          ? 'Admin API access'
          : status.trial && status.remaining > 0
            ? 'Verified trial access'
            : 'Bring your own API key'}
      </h2>
      <p>
        Signed in as {status.email}.{' '}
        {status.admin
          ? 'You can create games using the site API key.'
          : status.trial && status.remaining > 0
            ? `${status.remaining} sponsored creations remaining.`
            : 'Your OpenAI API usage is billed to your own API project. ChatGPT sign-in does not provide API credits.'}
      </p>
      <p className={styles.muted}>
        Your key is encrypted on the server and used by the generation service.
        It is never sent to the generated game. Removing it prevents future use.
        A pixel-game request already sent to OpenAI may finish; queued Agents
        builds are canceled and active Agents builds receive a cancellation
        request.
      </p>
      <p>
        <Link href="/">Create or join a pixel game →</Link>
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
        {/* Dispatch owns sign-out; it requires a top-level navigation. */}
        {/* eslint-disable-next-line nextjs/no-html-link-for-pages */}
        <a
          href="/signout-with-chatgpt?return_to=%2Fforge%2Fcreate"
          target="_top"
        >
          Sign out
        </a>
      </div>
      <p className={styles.muted}>Your creator ID: {status.userId}</p>
      {notice && <output>{notice}</output>}
    </section>
  );
}
