import assert from 'node:assert/strict';
import test from 'node:test';
import { RoomClient } from '../lib/party-forge/client/room-client.ts';
import { createRoomRecord,joinRoom,reduceRoom } from '../lib/party-forge/room-reducer.ts';
import { cachedInstructionDemo } from '../lib/party-forge/server/cached-instruction-demo.ts';
void test('pixel start allows network delivery and active polls cannot shift its monotonic clock',async()=>{
 let now=100000;
 let record=joinRoom(createRoomRecord('clock-room','one','One',now),'two','Two',now);
 let commandId=0;
 const apply=async(actor,type,fields={})=>{
  const result=await reduceRoom(record,actor,{protocolVersion:'party-forge/1',commandId:`clock-${++commandId}`,expectedRevision:record.snapshot.revision,type,...fields},now,{resolve:async request=>({status:'playable',manifest:await cachedInstructionDemo(request.contributions)})});
  assert.equal(result.receipt.status,'accepted');record=result.record;
 };
 await apply('one','choose-initial',{choice:{slot:'instruction',cardId:'instruction',text:'Snake'}});
 await apply('two','choose-initial',{choice:{slot:'instruction',cardId:'instruction',text:'Space invader'}});
 await apply('one','retry-forge');
 const ready=record.snapshot;
 for(const actor of ['one','two'])await apply(actor,'acknowledge-build',{buildId:ready.build.manifest.buildId,buildHash:ready.build.manifest.contentHash});
 await apply('one','start-round');
 assert.equal(record.snapshot.round.startsAt,now+6000);
 let snapshot=ready,serverTime=now;
 const access={roomId:'clock-room',participantId:'one',capability:'a'.repeat(64)};
 const client=new RoomClient('clock-room',async()=>new Response(JSON.stringify({snapshot}),{headers:{'x-party-server-time':String(serverTime)}}));
 const storage={getItem:()=>JSON.stringify({access,request:null}),setItem(){},removeItem(){}};
 client.start(storage);await new Promise(resolve=>setTimeout(resolve,0));
 try{
  const anchored=client.serverNow();assert.ok(Math.abs(anchored-now)<100);
  snapshot=record.snapshot;
  for(const jitter of [8000,-5000,2000]){serverTime=now+jitter;await client.poll();assert.ok(Math.abs(client.serverNow()-anchored)<150,'Slow response must not re-anchor a running game');}
 }finally{client.stop();}
 now=record.snapshot.round.submissionDeadline;
 for(const actor of ['one','two']){
  const round=record.snapshot.round;
  await apply(actor,'submit-trial',{trial:{protocolVersion:'party-forge/1',roundId:round.roundId,buildId:round.buildId,buildHash:round.buildHash,seed:round.seed,attemptId:`attempt-${actor}`,frames:Array.from({length:3600},(_,tick)=>({tick,buttons:0,yaw:0,pitch:0}))}});
 }
 const completed=record;assert.equal(completed.snapshot.phase,'results');
 for(const actor of ['one','two']){
  record=completed;await apply(actor,'replay-round');
  assert.equal(record.snapshot.phase,'ready');
  assert.equal(record.snapshot.build.manifest.contentHash,completed.snapshot.build.manifest.contentHash);
  assert.notEqual(record.snapshot.round.roundId,completed.snapshot.round.roundId);
  assert.deepEqual(record.snapshot.acknowledgments,[]);
 }
});
