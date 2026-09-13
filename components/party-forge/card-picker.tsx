'use client';
import { useState } from 'react';
import type { InitialCard, RoomSnapshot } from '../../lib/party-forge/contracts.ts';
import { LegacyCardPicker } from './legacy-card-picker.tsx';
import { PixelSprite } from './pixel-sprite.tsx';
import styles from './party-room.module.css';
const STARTERS = [
  ['Snake', 'Steer a snake around the board. Collect food to grow your tail.', 'snake'],
  ['Invaders', 'Move a ship left and right and shoot descending pixel invaders.', 'alien'],
  ['Bounce', 'Bounce a ball between platforms and collect food. Steer left and right.', 'bounce'],
  ['Wraparound', 'Let the player wrap around the edges instead of hitting a wall.', 'bounce'],
  ['A little chaos', 'Add slow descending invaders as obstacles to avoid.', 'alien'],
  ['High stakes', 'Make collecting food valuable, but deduct points each time we get hit.', 'food'],
] as const;
export function InstructionEditor({initial='',disabled,onConfirm,label='Your instruction',confirmed=false}:{initial?:string;disabled:boolean;onConfirm:(text:string)=>void;label?:string;confirmed?:boolean}) {
  const [text,setText]=useState(initial);
  return <form className={styles.editor} onSubmit={e=>{e.preventDefault();if(text.trim())onConfirm(text.trim());}}>
    <label className={styles.eyebrow} htmlFor="instruction-text">{label}</label>
    <textarea id="instruction-text" maxLength={240} required rows={4} placeholder="What should happen in our game?" value={text} onChange={e=>setText(e.target.value)} disabled={disabled}/>
    <p>Build around Snake, Invaders or Bounce. Add food, enemies, wrapping or scoring rules. Rhythm and audio are not supported yet.</p>
    <div className={styles.editorFooter}><span>{text.length}/240</span><button className={styles.primary} disabled={disabled||!text.trim()}>{disabled?'Saving…':confirmed?'Update instruction':'Confirm instruction'}</button></div>
    <details><summary>Need an idea? Pick a starter.</summary><div className={styles.starters}>{STARTERS.map(([title,instruction,sprite])=><button type="button" key={title} onClick={()=>setText(instruction)} disabled={disabled}><PixelSprite kind={sprite} size={24}/><span>{title}</span></button>)}</div><p>Starters fill your card. Change any words before confirming.</p></details>
  </form>;
}
export function CardPicker(props:{room:RoomSnapshot;participantId:string;disabled:boolean;onConfirm:(choice:InitialCard)=>void}){
  const {room,participantId,disabled,onConfirm}=props;
  if(room.contributions.some(c=>c.kind==='initial'&&c.choice.slot!=='instruction'))return <LegacyCardPicker {...props}/>;
  const mine=room.contributions.find(c=>c.participantId===participantId&&c.kind==='initial');
  const initial=mine?.kind==='initial'&&mine.choice.slot==='instruction'?mine.choice.text:'';
  return <section aria-labelledby="hand-title"><div className={styles.sectionHeading}><h2 id="hand-title">One person. One rule.</h2><span>{room.contributions.length}/{Math.max(2, room.participants.length)} IN</span></div><InstructionEditor initial={initial} confirmed={!!mine} disabled={disabled} onConfirm={text=>onConfirm({slot:'instruction',cardId:'instruction',text})}/></section>;
}
