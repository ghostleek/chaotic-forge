import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { cachedSnakeInvaders } from '../lib/party-forge/server/cached-snake-invaders.ts';
import { createInstructionBuild } from '../lib/party-forge/runtimes/pixel-arcade-v2/manifest.ts';
import { createInstructionBuild as createV1 } from '../lib/party-forge/runtimes/pixel-arcade-v1/manifest.ts';
import { createRetainedRuntime } from '../lib/party-forge/runtime-registry.ts';
const cards=['Snake','Space Invaders'].map((text,ordinal)=>({id:`life-card-${ordinal}`,participantId:`life-player-${ordinal}`,ordinal,kind:'initial',choice:{slot:'instruction',cardId:'instruction',text},provenance:{source:{kind:'user-concept',reference:text},forgeInterpretation:'Local test fixture',userDecision:{participantId:`life-player-${ordinal}`,decisionId:`life-decision-${ordinal}`}}}));
const frame=tick=>({tick,buttons:0,yaw:0,pitch:0});
void test('three collisions stop gameplay and scoring in every current movement mode',async()=>{
 for(const mode of ['snake','invaders','bounce']){
  const recipe={...cachedSnakeInvaders.pixelRules,mode,growTail:mode==='snake',survivalPoints:1,interpretations:[{instructionIndex:0,interpretation:'Local test movement',ruleFields:['mode']},{instructionIndex:1,interpretation:'Local test enemies',ruleFields:['invaders']}]};
  const build=await createInstructionBuild(cards,null,recipe,cachedSnakeInvaders.origin);
  const run=await createRetainedRuntime(build,73);
  // Position one enemy directly in the collision path, using the actual collision code.
  for(let life=2;life>=0;life--){
   const tick=run.snapshot().tick;
   const head=run.snapshot().state.snake[0];
   const direction=run.snapshot().state.direction;
   run.state.aliens=[mode==='snake'?{x:head.x+direction.x,y:head.y+direction.y}:{...head}];
   do{const t=run.snapshot().tick;run.input(frame(t));run.step();}while(run.snapshot().state.lives>life);
   assert.ok(run.snapshot().tick>tick);
   assert.equal(run.snapshot().state.lives,life);
  }
  const stopped=run.snapshot();
  assert.equal(stopped.state.gameOver,true);
  while(!run.isComplete()){const tick=run.snapshot().tick;run.input({...frame(tick),buttons:8});run.step();}
  assert.deepEqual(run.snapshot().state,stopped.state,'No movement, spawns, score, or extra hits after game over');
  assert.equal(run.snapshot().hits,3);
 }
});
void test('new no-collision games stop at the 60-second maximum; old executable stays available',async()=>{
 const recipe={...cachedSnakeInvaders.pixelRules,mode:'invaders',growTail:false,invaders:false,shooting:false,interpretations:[{instructionIndex:0,interpretation:'Local movement fixture',ruleFields:['mode']},{instructionIndex:1,interpretation:'Local food fixture',ruleFields:['foodCount']}]};
 const build=await createInstructionBuild(cards,null,recipe,cachedSnakeInvaders.origin);
 const run=await createRetainedRuntime(build,73);
 for(let tick=0;tick<3600;tick++){run.input(frame(tick));run.step();}
 assert.equal(run.isComplete(),true);assert.equal(run.snapshot().state.lives,3);
 const oldBuild=await createV1(cards,null,cachedSnakeInvaders.pixelRules,cachedSnakeInvaders.origin);
 const old=await createRetainedRuntime(oldBuild,73);
 for(let tick=0;tick<3600;tick++){old.input(frame(tick));old.step();}
 assert.ok(old.snapshot().hits>3);
 const bytes=await readFile(new URL('../lib/party-forge/runtimes/pixel-arcade-v1/retained/engine.js',import.meta.url));
 assert.equal('sha256:'+createHash('sha256').update(bytes).digest('hex'),cachedSnakeInvaders.runtime.hash);
});
