import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {createDinoMarioGame, stepDinoMarioGame, dinoPlayerSize, dinoScore} from '../lib/party-forge/demos/dino-mario.ts';
import {createDinoBuild, DINO_RESOURCE} from '../lib/party-forge/runtimes/dino-runner-v2/manifest.ts';
import {createRetainedRuntime} from '../lib/party-forge/runtime-registry.ts';
import {resolveInstructionRequest} from '../lib/party-forge/server/pixel-generation.ts';
const start = (patch={}) => ({...createDinoMarioGame(),status:'playing',...patch});
const at = (kind, id=99) => ({kind,id,x:130});
const presses = new Set([143,293,543,693,977,1127,1393]);
export const dinoCards = (titles=['Chrome offline Dino run','Mario']) => titles.map((text,ordinal)=>({id:`dino-card-${ordinal}`,participantId:`player-${ordinal}`,ordinal,kind:'initial',choice:{slot:'instruction',cardId:'instruction',text},provenance:{source:{kind:'user-concept',reference:text},forgeInterpretation:'User requested reference',userDecision:{participantId:`player-${ordinal}`,decisionId:`decision-${ordinal}`}}}));
void test('three starting lives, meat grows collision box and adds one life capped at four',()=>{
 const initial=start({encounters:[at('meat')]});
 const grown=stepDinoMarioGame(initial);
 assert.equal(initial.lives,3);assert.equal(initial.big,false);
 assert.equal(grown.lives,4);assert.equal(grown.big,true);assert.equal(grown.meat,1);
 assert.ok(dinoPlayerSize(grown).width>dinoPlayerSize(initial).width);
 const again=stepDinoMarioGame({...grown,encounters:[at('meat',100)]});
 assert.equal(again.lives,4);assert.equal(again.meat,2);
});
void test('hazard costs one life, shrinks player and protects against repeated damage',()=>{
 let g=stepDinoMarioGame(start({big:true,lives:4,encounters:[at('block'),at('block',100)]}));
 assert.equal(g.lives,3);assert.equal(g.big,false);assert.equal(g.hits,1);assert.equal(g.status,'playing');
 for(let i=0;i<20;i++)g=stepDinoMarioGame(g);
 assert.equal(g.lives,3);assert.equal(g.hits,1);
 const lost=stepDinoMarioGame(start({lives:1,encounters:[at('block')]}));
 assert.equal(lost.status,'lost');assert.equal(lost.lives,0);assert.equal(stepDinoMarioGame(lost,true),lost);
});
void test('full seven-jump v2 course collects three meats and four stomps without damage',()=>{
 let g=start();while(g.status==='playing')g=stepDinoMarioGame(g,presses.has(g.tick));
 assert.equal(g.status,'won');assert.equal(g.hits,0);assert.equal(g.lives,4);assert.equal(g.meat,3);assert.equal(g.stomps,4);assert.equal(dinoScore(g),1750);
});
void test('both card orders resolve an authored retained game without database or model calls',async()=>{
 for(const titles of [['Chrome offline Dino run','Mario'],['Mario','Dino'],['Dino','Mario','Dino']]){
  const result=await resolveInstructionRequest({contributions:dinoCards(titles)},{prepare(){throw Error('No paid job');}},'dino-test');
  assert.equal(result.status,'playable');assert.equal(result.manifest.origin.kind,'preset');
  const a=await createRetainedRuntime(result.manifest,73),b=await createRetainedRuntime(result.manifest,73);
  while(!a.isComplete()){const tick=a.snapshot().tick,frame={tick,buttons:presses.has(tick)?16:0,yaw:0,pitch:0};a.input(frame);b.input(frame);assert.deepEqual(a.step(),b.step());}
  assert.equal(a.snapshot().points,1750);
 }
 const bytes=await readFile(new URL('../lib/party-forge/runtimes/dino-runner-v2/retained/engine.js',import.meta.url));
 assert.equal('sha256:'+createHash('sha256').update(bytes).digest('hex'),DINO_RESOURCE.hash);
});
void test('custom initial modifiers do not silently select the authored game',async()=>{
 assert.equal(await createDinoBuild(dinoCards(['Dino with lasers','Mario'])),null);
});
void test('party scoring accepts only exact terminal replay and rejects truncation or extra frames',async()=>{
 const build=await createDinoBuild(dinoCards());const run=await createRetainedRuntime(build,73),frames=[];
 while(!run.isComplete()){const tick=frames.length,frame={tick,buttons:presses.has(tick)?16:0,yaw:0,pitch:0};frames.push(frame);run.input(frame);run.step();}
 const trial={buildId:build.buildId,buildHash:build.contentHash,seed:73,endedEarly:true,frames};
 assert.equal(run.validateScore(build,trial).points,1750);
 assert.throws(()=>run.validateScore(build,{...trial,frames:frames.slice(0,-1)}),/replay-verified/);
 assert.throws(()=>run.validateScore(build,{...trial,frames:[...frames,{tick:1800,buttons:0,yaw:0,pitch:0}]}),/Invalid runner input/);
});

void test('two-player room scores terminal traces, retains replay and accepts both ordered additions', async()=>{
 const {createRoomRecord,createArchiveRoomRecord,joinRoom,reduceRoom}=await import('../lib/party-forge/room-reducer.ts');
 let now=100000,commandId=0;
 let record=joinRoom(createRoomRecord('dino-room','one','One',now),'two','Two',now);
 const apply=async(actor,type,fields={})=>{
  const result=await reduceRoom(record,actor,{protocolVersion:'party-forge/1',commandId:`dino-${++commandId}`,expectedRevision:record.snapshot.revision,type,...fields},now,{resolve:async request=>({status:'playable',manifest:await createDinoBuild(request.contributions,request.previous ? {buildId:request.previous.buildId,contentHash:request.previous.contentHash}:null)})});
  assert.equal(result.receipt.status,'accepted',JSON.stringify(result.receipt)); record=result.record;
 };
 for(const [actor,text] of [['one','Chrome offline Dino run'],['two','Mario']])await apply(actor,'choose-initial',{choice:{slot:'instruction',cardId:'instruction',text}});
 await apply('one','retry-forge');
 const original=record.snapshot.build.manifest;
 for(const actor of ['one','two'])await apply(actor,'acknowledge-build',{buildId:original.buildId,buildHash:original.contentHash});
 await apply('one','start-round');
 const round=record.snapshot.round; assert.equal(round.startsAt,now+6000); now=round.startsAt+30_000;
 for(const actor of ['one','two']){
  const run=await createRetainedRuntime(original,round.seed),frames=[];
  while(!run.isComplete()){const tick=frames.length,frame={tick,buttons:actor==='one'&&presses.has(tick)?16:0,yaw:0,pitch:0};frames.push(frame);run.input(frame);run.step();}
  await apply(actor,'submit-trial',{trial:{protocolVersion:'party-forge/1',roundId:round.roundId,buildId:round.buildId,buildHash:round.buildHash,seed:round.seed,attemptId:`dino-attempt-${actor}`,endedEarly:true,frames}});
 }
 assert.equal(record.snapshot.phase,'results');
 assert.deepEqual(record.snapshot.lastCompleted.editors,{winner:'one',loser:'two',order:['one','two']});
 const {validateArchive}=await import('../lib/party-forge/archive.ts');
 const archive={protocolVersion:'party-forge/1',archiveId:'dino-archive',savedAt:now,parentArchiveId:null,forkSetup:null,finalBuild:original,builds:[original],history:[{status:'completed',result:record.snapshot.lastCompleted}],traceRetentionDays:0};
 await validateArchive(archive);
 const saved=joinRoom(createArchiveRoomRecord('saved-dino','new-one','New One',now,archive,'play-again'),'new-two','New Two',now);
 assert.equal(saved.snapshot.phase,'ready');
 assert.equal(saved.snapshot.build.manifest.contentHash,original.contentHash);
 await assert.rejects(validateArchive({...archive,savedAt:now-1}),/precede saving/);
 const completed=record; await apply('two','replay-round');
 assert.equal(record.snapshot.build.manifest.contentHash,original.contentHash);
 const replayBuild=record.snapshot.build.manifest;
 for(const actor of ['one','two'])await apply(actor,'acknowledge-build',{buildId:replayBuild.buildId,buildHash:replayBuild.contentHash});
 await apply('one','start-round');
 const round2=record.snapshot.round;
 assert.ok(round2.startsAt<round.submissionDeadline);
 now=round2.startsAt+30_000;
 for(const actor of ['one','two']) {
  const run=await createRetainedRuntime(replayBuild,round2.seed),frames=[];
  while(!run.isComplete()){const frame={tick:frames.length,buttons:0,yaw:0,pitch:0};frames.push(frame);run.input(frame);run.step();}
  await apply(actor,'submit-trial',{trial:{protocolVersion:'party-forge/1',roundId:round2.roundId,buildId:round2.buildId,buildHash:round2.buildHash,seed:round2.seed,attemptId:`replay-${actor}`,endedEarly:true,frames}});
 }
 await validateArchive({...archive,savedAt:now,history:[...archive.history,{status:'completed',result:record.snapshot.lastCompleted}]});
 record=completed; await apply('one','vote',{vote:'continue'});
 await apply('one','add-mechanic',{cardId:'instruction',text:'Double stomp points'});
 await apply('two','add-mechanic',{cardId:'instruction',text:'Double meat points'});
 assert.equal(record.snapshot.phase,'ready');
 const next=record.snapshot.build.manifest;
 assert.deepEqual(next.runnerRules,{stompBonus:100,meatBonus:50,finishBonus:0});
 assert.deepEqual(next.contributions.slice(0,2),original.contributions);
 assert.equal(next.parent.buildId,original.buildId);
});

void test('runner capture preserves a short jump tap without changing continuous controls',async()=>{
 const {TrialInputCapture}=await import('../lib/party-forge/client/trial-input.ts');
 for(const mask of [0,17]) {
  const capture=new TrialInputCapture(1000,mask);
  capture.change(1001,{buttons:16}); capture.clear(1002);
  assert.equal(capture.next().buttons,0);
  assert.equal(capture.next().buttons,mask ? 16 : 0);
  assert.equal(capture.next().buttons,0);
 }
});
