'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import styles from './party-room.module.css';
import { Billing } from './creation/billing';

const sessionSchema = z.object({
  csrf: z.string(),
  billing: z.object({
    trial: z.boolean(), remaining: z.number(), hasKey: z.boolean(),
    email: z.string(), userId: z.string(), admin: z.boolean(),
  }).optional(),
});

export function RoomAccess({ nickname, disabled, onContinue, onCancel }: {
  nickname: string;
  disabled: boolean;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const [session, setSession] = useState<z.infer<typeof sessionSchema> | null>(null);
  const [state, setState] = useState<'loading' | 'signin' | 'ready' | 'error'>('loading');
  async function refresh(signal?: AbortSignal) {
    try {
      const response = await fetch('/api/forge/access', { signal });
      if (response.status === 401) { setSession(null); setState('signin'); return; }
      if (!response.ok) throw new Error('Access unavailable');
      setSession(sessionSchema.parse(await response.json()));
      setState('ready');
    } catch {
      if (!signal?.aborted) setState('error');
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/forge/access', { signal: controller.signal }).then(async response => {
      if (response.status === 401) { setState('signin'); return; }
      if (!response.ok) throw new Error('Access unavailable');
      const result = sessionSchema.parse(await response.json());
      if (!controller.signal.aborted) { setSession(result); setState('ready'); }
    }).catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, []);
  const returnTo = `/?startRoom=1&nickname=${encodeURIComponent(nickname)}`;
  const funded = session?.billing?.admin || session?.billing?.hasKey;
  return <section aria-label="Live room access" aria-live="polite">
    <h2>Start a live room</h2>
    {state === 'loading' && <p>Checking your access…</p>}
    {state === 'signin' && <>
      <p>Sign in to set up API access for your room. Friends can join without signing in.</p>
      <a className={`${styles.actionLink} ${styles.primary}`} href={`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`} target="_top">Sign in with ChatGPT</a>
    </>}
    {state === 'error' && <>
      <p role="alert">Could not check your access. Please try again.</p>
      <button type="button" onClick={() => { setState('loading'); void refresh(); }}>Retry access check</button>
    </>}
    {state === 'ready' && session?.billing && <Billing roomSetup returnTo={returnTo} status={session.billing} csrf={session.csrf} refresh={() => refresh()} />}
    {state === 'ready' && !session?.billing && <p>Sign-in and API access are unavailable. Please try again later.</p>}
    <button type="button" disabled={disabled || state !== 'ready' || !funded || !nickname.trim()} onClick={onContinue}>Create live room</button>
    <button type="button" disabled={disabled} onClick={onCancel}>Back</button>
  </section>;
}
