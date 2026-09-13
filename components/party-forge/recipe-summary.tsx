import type { RoomSnapshot } from '../../lib/party-forge/contracts.ts';
import { CARDS, cardIdFor } from '../../lib/party-forge/cards.ts';
import styles from './party-room.module.css';
export function RecipeSummary({room}:{room:RoomSnapshot}){
  const build=room.build.status==='playable'?room.build.manifest:'previous' in room.build?room.build.previous:null;
  const cached=build?.origin.kind==='generated' && build.origin.reuse?.kind==='cached-demo';
  if(!room.contributions.length)return null;
  return <section className={styles.brief} aria-labelledby="recipe-title">
    <div className={styles.sectionHeading}><h2 id="recipe-title">Our instructions.</h2><span>{room.contributions.length} CARDS</span></div>
    <ol>{room.contributions.map(c=><li className={styles.card} key={c.id}>
      <span className={styles.eyebrow}>{room.participants.find(p=>p.id===c.participantId)?.nickname??'Original contributor'}</span>
      <p>{c.kind==='initial'&&c.choice.slot==='instruction'?c.choice.text:c.kind==='addition'&&c.cardId==='instruction'?c.text:CARDS[cardIdFor(c)].title}</p>
      <details><summary>Source & interpretation</summary><p>Source: {c.provenance.source.reference}</p><p>Forge: {build?.effects.find(e=>e.contributionId===c.id)?.explanation??c.provenance.forgeInterpretation}</p><small>Decision: {c.provenance.userDecision.decisionId}</small></details>
    </li>)}</ol>
    {build?.pixelRules ? <div className={styles.gameRules}>
      <span className={styles.eyebrow}>{cached ? 'CACHED AI-GENERATED DEMO' : 'YOUR GENERATED RULES'}</span><h3>{build.pixelRules.title}</h3><p>{build.objective}</p>
      {cached ? <p>Previously generated and verified. These saved rules load without a new AI request.</p> : null}
      <ol>{build.effects.map(e=><li key={e.contributionId}>{e.explanation}</li>)}</ol>
      <p><strong>Winner:</strong> highest score after 60 seconds; fewer hits breaks a tie. Food +{build.pixelRules.foodPoints}{build.pixelRules.shooting&&build.pixelRules.invaders?` · invader +${build.pixelRules.alienPoints}`:''}{build.pixelRules.survivalPoints?` · survival +${build.pixelRules.survivalPoints}/sec`:''}{build.pixelRules.hitPenalty?` · hit −${build.pixelRules.hitPenalty}`:''}.</p>
    </div> : null}
    {build?<details><summary>Game version & provenance</summary><p>{build.origin.kind==='generated'?`${build.origin.service} · ${build.origin.modelVersion}`:'Authored demo'}</p><p>{build.validation.limitations.join(' ')}</p><code>{build.contentHash}</code></details>:null}
  </section>;
}
