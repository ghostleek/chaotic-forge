import type { RoomSnapshot } from '../../lib/party-forge/contracts.ts';
import { CARDS, cardIdFor } from '../../lib/party-forge/cards.ts';

export function RecipeSummary({ room }: { room: RoomSnapshot }) {
  const build =
    room.build.status === 'playable'
      ? room.build.manifest
      : 'previous' in room.build
        ? room.build.previous
        : null;
  return (
    <section aria-labelledby="recipe-title">
      <h2 id="recipe-title">Our game</h2>
      <ol>
        {room.contributions.map((c) => (
          <li key={c.id}>
            <strong>{CARDS[cardIdFor(c)].title}</strong> ·{' '}
            {room.participants.find((p) => p.id === c.participantId)
              ?.nickname ?? c.participantId}
            <details>
              <summary>Contribution details</summary>
              <p>
                Source: {c.provenance.source.kind} ·{' '}
                {c.provenance.source.reference}
              </p>
              <p>Forge interpretation: {c.provenance.forgeInterpretation}</p>
              <p>User decision: {c.provenance.userDecision.decisionId}</p>
            </details>
          </li>
        ))}
      </ol>
      {build ? (
        <details>
          <summary>
            Build {build.buildId} ·{' '}
            {build.origin.kind === 'preset'
              ? 'Authored demo'
              : 'Generated build'}
          </summary>
          <p>{build.objective}</p>
          <p>
            Identity: <code>{build.contentHash}</code>
          </p>
          <p>{build.validation.limitations.join(' ')}</p>
        </details>
      ) : (
        <p>{room.contributions.length}/3 contributions confirmed</p>
      )}
    </section>
  );
}
