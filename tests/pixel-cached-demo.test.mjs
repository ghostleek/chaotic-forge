import assert from 'node:assert/strict';
import { test } from 'node:test';
import { performance } from 'node:perf_hooks';
import { cachedInstructionDemo } from '../lib/party-forge/server/cached-instruction-demo.ts';
import { resolveInstructionRequest } from '../lib/party-forge/server/pixel-generation.ts';
import { createRetainedRuntime } from '../lib/party-forge/runtime-registry.ts';
import { contributionHistorySchema } from '../lib/party-forge/contracts.ts';
function cards(titles){return titles.map((text,ordinal)=>({id:`card-${ordinal}`,participantId:`player-${ordinal}`,ordinal,kind:'initial',choice:{slot:'instruction',cardId:'instruction',text},provenance:{source:{kind:'user-concept',reference:text},forgeInterpretation:'Awaiting generated interpretation',userDecision:{participantId:`player-${ordinal}`,decisionId:`decision-${ordinal}`}}}));}
void test('cached pair works in either order without database or model access',async()=>{
  for(const titles of [['Snake','Space Invaders'],['  SPACE  INVADERS ','snake']]){
    const contributions=cards(titles);
    const started=performance.now();
    const result=await resolveInstructionRequest({contributions},{prepare(){throw new Error('Cache must not access generation jobs');}},'cache-room');
    assert.equal(result.status,'playable');
    const build=result.manifest;
    assert.equal(build.origin.reuse.kind,'cached-demo');
    assert.equal(build.origin.jobId,'resp_0f3e85ea9a091678016aa655c219dc87d0ad0522dfff422a99');
    assert.deepEqual(build.contributions,contributionHistorySchema.parse(contributions));
    const snakeIndex=titles.findIndex(t=>t.trim().toLowerCase()==='snake');
    assert.ok(build.pixelRules.interpretations.find(i=>i.instructionIndex===snakeIndex).ruleFields.includes('growTail'));
    const runtime=await createRetainedRuntime(build,73);
    for(let tick=0;tick<3600;tick++){runtime.input({tick,buttons:0,yaw:0,pitch:0});runtime.step();}
    assert.equal(runtime.isComplete(),true);
    assert.ok(runtime.snapshot().state.metrics.invaderHits>0);
    console.log(`Cached build and full replay: ${Math.round(performance.now()-started)}ms`);
  }
});
void test('custom modifiers, extra players and different references never reuse the pair cache',async()=>{
 for(const titles of [['Snake with wrapping','Space Invaders'],['Snake','Bounce'],['Snake','Space Invaders','More food']]) assert.equal(await cachedInstructionDemo(cards(titles)),null);
});
