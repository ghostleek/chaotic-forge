import type { RoomSnapshot } from '../../lib/party-forge/contracts.ts';
import { CARDS, cardIdFor } from '../../lib/party-forge/cards.ts';
import styles from './party-room.module.css';
export function RecipeSummary({room}:{room:RoomSnapshot}){
  const build=room.build.status==='playable'?room.build.manifest:'previous' in room.build?room.build.previous:null;
  if(!room.contributions.length)return null;
  return <section className={styles.brief} aria-labelledby="recipe-title">
    <div className={styles.sectionHeading}><h2 id="recipe-title">Our instructions.</h2><span>{room.contributions.length} CARDS</span></div>
    <ol>{room.contributions.map(c=><li className={styles.card} key={c.id}>
      <span className={styles.eyebrow}>{room.participants.find(p=>p.id===c.participantId)?.nickname??'Original contributor'}</span>
      <p>{c.kind==='initial'&&c.choice.slot==='instruction'?c.choice.text:c.kind==='addition'&&c.cardId==='instruction'?c.text:CARDS[cardIdFor(c)].title}</p>
      <details><summary>Source & interpretation</summary><p>Source: {c.provenance.source.reference}</p><p>Forge: {build?.effects.find(e=>e.contributionId===c.id)?.explanation??c.provenance.forgeInterpretation}</p><small>Decision: {c.provenance.userDecision.decisionId}</small></details>
    </li>)}</ol>
    {build?.pixelRules ? <div className={styles.gameRules}>
      <span className={styles.eyebrow}>YOUR GAME</span><h3>{build.pixelRules.title}</h3><p>{build.objective}</p>
      <ol>{build.effects.map(e=><li key={e.contributionId}>{e.explanation}</li>)}</ol>
      <p><strong>Stop:</strong> {build.runtime.version === 'pixel-arcade-v2' ? '3 lives or 60 seconds. At zero lives, your score freezes.' : '60 seconds.'} <strong>Winner:</strong> highest score; fewer hits breaks a tie. Food +{build.pixelRules.foodPoints}{build.pixelRules.shooting&&build.pixelRules.invaders?` · invader +${build.pixelRules.alienPoints}`:''}{build.pixelRules.survivalPoints?` · survival +${build.pixelRules.survivalPoints}/sec`:''}{build.pixelRules.hitPenalty?` · hit −${build.pixelRules.hitPenalty}`:''}.</p>
    </div> : null}
  </section>;
}
