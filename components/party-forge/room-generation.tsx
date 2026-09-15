'use client';

import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { ParticipantAccess, RoomSnapshot } from '@/lib/party-forge/contracts';
import { activeStates } from '@/lib/party-forge/generation/contracts';
import { gameBriefSchema, progressSchema } from '@/lib/party-forge/generation/progress';
import { GenerationProgress } from './creation/generation-progress';
import styles from './party-room.module.css';

const stateSchema = z.object({
  digest: z.string(), eligible: z.boolean(), available: z.boolean(), stale: z.boolean(),
  job: z.object({
    id: z.string(), status: z.string(), artifactHash: z.string().nullable(),
    progress: progressSchema, brief: gameBriefSchema.nullable(),
  }).nullable(),
});
type State = z.infer<typeof stateSchema>;

export function RoomGeneration({ room, access, disabled, onExistingBuilder }: {
  room: RoomSnapshot; access: ParticipantAccess; disabled: boolean;
  onExistingBuilder: () => void;
}) {
  const [state, setState] = useState<State | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ id: string; html: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const pending = useRef<{ requestKey: string; digest: string } | null>(null);
  const endpoint = `/api/party/rooms/${room.roomId}/generation`;
  const authorization = `Bearer ${access.capability}`;
  const storageKey = `forge-room-generation:${room.roomId}`;
  const host = room.hostId === access.participantId;
  const job = state?.job;
  const active = !!job && activeStates.includes(job.status);
  const blocked = disabled || busy || connectionError || !state;

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(endpoint, { headers: { Authorization: authorization }, signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Progress unavailable');
        const data = stateSchema.parse(await response.json());
        if (!controller.signal.aborted) { setState(data); setConnectionError(false); }
      } catch {
        if (!controller.signal.aborted) setConnectionError(true);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 3000);
      }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [endpoint, authorization, refresh]);

  async function command(action: 'generate' | 'cancel' | 'playtest') {
    if (!state) return;
    setBusy(true); setError('');
    try {
      let body: object;
      if (action === 'generate') {
        if (!pending.current) {
          try {
            const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
            if (saved?.digest === state.digest && z.uuid().safeParse(saved.requestKey).success) pending.current = saved;
          } catch { /* In-memory retry still preserves this request when storage is unavailable. */ }
        }
        if (pending.current?.digest !== state.digest) pending.current = { requestKey: crypto.randomUUID(), digest: state.digest };
        try { sessionStorage.setItem(storageKey, JSON.stringify(pending.current)); } catch { /* Optional reload recovery. */ }
        body = { action, ...pending.current };
      } else body = { action, jobId: job?.id };
      const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) {
        const failure = z.object({ error: z.string() }).safeParse(data);
        throw new Error(failure.success ? failure.data.error : 'Request failed. Try again.');
      }
      if (action === 'generate') {
        pending.current = null;
        try { sessionStorage.removeItem(storageKey); } catch { /* Optional reload recovery. */ }
        setPreview(null);
      }
      if (action === 'playtest') {
        const artifact = z.object({ html: z.string(), artifactHash: z.string() }).parse(data);
        if (artifact.artifactHash !== job?.artifactHash) throw new Error('The saved game changed. Reload its progress.');
        setPreview({ id: job.id, html: artifact.html });
      }
      setRefresh(value => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed. Retry to recover the same job.');
    } finally { setBusy(false); }
  }

  return <section aria-label="Room game generation">
    <h2>Forge your game</h2>
    <p>Generate from everyone’s confirmed cards. Forge researches unclear mechanics, proposes the rules and winner, then writes a game for this room.</p>
    <p>Experimental playtest: everyone gets the same saved game. Scores are local; generated games do not yet enter the room’s ranked rounds.</p>
    {connectionError ? <output>Progress is reconnecting. Your saved job continues; actions resume when the connection returns.</output> : !state ? <p>Checking generation availability…</p> : null}
    {state && !state.eligible ? <p>Waiting for every player to confirm a card.</p> : null}
    {state && !state.available && !active ? <p>The generation runner is offline. Your cards are saved. The host can try again when it is connected.</p> : null}
    {state?.stale ? <p>The room’s cards or players changed. The earlier job is retained, but a new generation is needed for this room.</p> : null}
    {job ? <GenerationProgress status={job.status} progress={job.progress} brief={job.brief} /> : null}
    {job?.status === 'failed' ? <output>Generation did not produce a playable result. Review any clarification above, or try again.</output> : null}
    {host && !active ? <button className={styles.primary} disabled={blocked || !state?.eligible || !state.available} onClick={() => void command('generate')}>
      {busy ? 'Sending…' : job ? 'Generate a new attempt' : 'Generate game'}
    </button> : !host && !job ? <p>The host starts generation. Progress will appear here for everyone.</p> : null}
    {host && active ? <button disabled={blocked || job.status === 'canceling'} onClick={() => void command('cancel')}>Cancel generation</button> : null}
    {job && ['preview', 'ready'].includes(job.status) && !state?.stale ? <button disabled={blocked} onClick={() => void command('playtest')}>Open shared playtest</button> : null}
    {error ? <div role="alert"><p>{error}</p>{host ? <a href={`/signin-with-chatgpt?return_to=${encodeURIComponent(`/party/${room.roomId}`)}`} target="_top">Sign in again with ChatGPT</a> : null}</div> : null}
    {preview && preview.id === job?.id && !state?.stale && !connectionError ? <div>
      <h3>Shared game · local playtest</h3>
      <p>Same executable and starting seed for everyone. The proposed winner rules above are not verified room results.</p>
      <iframe title="Generated room game playtest" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={preview.html} className={styles.generatedPlaytest} />
      <button onClick={() => setPreview(null)}>Close playtest</button>
    </div> : null}
    {host ? <details><summary>Use the existing game builder</summary>
      <p>The current builder supports a limited set of pixel mechanics and verified multiplayer rounds. Matching saved games are reused; other supported combinations may use the model. Choose this separately if you want its existing game rules.</p>
      <button disabled={blocked || active || !state?.eligible} onClick={onExistingBuilder}>Build with current pixel engine</button>
    </details> : null}
  </section>;
}
