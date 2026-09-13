import Link from 'next/link';
import type { RoomSnapshot } from '../../lib/party-forge/contracts.ts';
import styles from './round-results.module.css';

export function RoundResults({room,me,disabled,onReplay}:{room:RoomSnapshot;me?:string;disabled:boolean;onReplay:()=>void}) {
  const completed=room.lastCompleted;
  if(!completed)return null;
  const results=[...completed.results].sort((a,b)=>a.rank-b.rank);
  const leaders=results.filter(result=>result.rank===1);
  const name=(id:string)=>room.participants.find(player=>player.id===id)?.nickname??'Player';
  const celebrate=leaders.some(result=>result.participantId===me);
  return <section className={styles.results} aria-labelledby="round-results-title">
    {celebrate ? <div className={styles.confetti} aria-hidden="true">{Array.from({length:28},(_,index)=><i key={index} style={{left:`${(index*37)%100}%`,animationDelay:`${(index%7)*.12}s`,background:['#a5ce68','#ee9eb1','#eace7a','#79c8cf'][index%4]}} />)}</div> : null}
    <h2 id="round-results-title">Round results</h2>
    <p className={styles.verdict}>{leaders.length>1?'It’s a tie!':`${name(leaders[0].participantId)} wins!`}</p>
    <div className={styles.comparison}>
      {results.map(result=><article key={result.participantId} className={styles.scorecard} data-winner={result.rank===1}>
        <span>{result.rank===1?(leaders.length>1?'TIED FIRST':'WINNER'):`RANK ${result.rank}`}{result.participantId===me?' · YOU':''}</span>
        <h3>{name(result.participantId)}</h3>
        <strong>{result.points??result.completedOrders}</strong><span>FINAL POINTS</span>
        <p>{result.hits??result.failedOrders} hits</p>
      </article>)}
    </div>
    {['results','end-vote'].includes(room.phase) ? <div className={styles.actions}>
      <button type="button" disabled={disabled} onClick={onReplay}>Replay</button>
      <Link href="/">New mesh</Link>
    </div> : null}
  </section>;
}
