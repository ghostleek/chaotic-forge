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
    {build?.runnerRules ? <div className={styles.gameRules}>
      <span className={styles.eyebrow}>SIMULATED AUTHORED REMIX · NO AI CALL</span><h3>Dino × Mario</h3><p>{build.objective}</p>
      <ol>{build.effects.map(e=><li key={e.contributionId}>{e.explanation}</li>)}</ol>
      <p>Three starting lives; meat adds a life up to four. Finish the 30-second course or stop at zero lives. Score: 10/sec, {100 + build.runnerRules.stompBonus}/stomp, {50 + build.runnerRules.meatBonus}/meat, {500 + build.runnerRules.finishBonus} for finishing plus 100/life.</p>
      <p>Next round: winner and loser may each add one unused modifier — Double stomp points, Double meat points, or Finish bonus.</p>
    </div> : null}
    {build?.pixelRules ? <div className={styles.gameRules}>
      <span className={styles.eyebrow}>YOUR GAME</span><h3>{build.pixelRules.title}</h3><p>{build.objective}</p>
      <ol>{build.effects.map(e=><li key={e.contributionId}>{e.explanation}</li>)}</ol>
      <p><strong>Stop:</strong> {build.runtime.version === 'pixel-arcade-v2' ? '3 lives or 60 seconds. At zero lives, your score freezes.' : '60 seconds.'} <strong>Winner:</strong> highest score; fewer hits breaks a tie. Food +{build.pixelRules.foodPoints}{build.pixelRules.shooting&&build.pixelRules.invaders?` · invader +${build.pixelRules.alienPoints}`:''}{build.pixelRules.survivalPoints?` · survival +${build.pixelRules.survivalPoints}/sec`:''}{build.pixelRules.hitPenalty?` · hit −${build.pixelRules.hitPenalty}`:''}.</p>
    </div> : null}
  </section>;
}
