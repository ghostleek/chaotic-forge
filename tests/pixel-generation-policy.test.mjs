import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outputSchema, generationFailureReason, shouldRecoverLegacyOutputFailure, shouldRecoverReferenceConflict, LEGACY_OUTPUT_FAILURE } from '../lib/party-forge/server/pixel-generation-policy.ts';

void test('unsupported rhythm/audio cards can be explained without inventing a game', () => {
  const response = outputSchema.parse({supported:false,reason:'Rhythm lanes and timed audio muting are not supported.',recipe:null});
  assert.equal(response.recipe,null);
  assert.equal(response.supported,false);
});
void test('response limits are distinguished from other provider failures', () => {
  assert.match(generationFailureReason({status:'incomplete',incomplete_details:{reason:'max_output_tokens'}}),/response budget/);
  assert.doesNotMatch(generationFailureReason({status:'incomplete',incomplete_details:{reason:'content_filter'}}),/budget/);
  assert.doesNotMatch(generationFailureReason({status:'failed'}),/budget/);
  assert.equal(generationFailureReason({status:'completed'}),null);
});
void test('only the known old terminal output failure gets a new bounded job key', () => {
  const result=JSON.stringify({reason:LEGACY_OUTPUT_FAILURE});
  assert.equal(shouldRecoverLegacyOutputFailure({status:'failed',result}),true);
  for(const status of ['running','complete']) assert.equal(shouldRecoverLegacyOutputFailure({status,result}),false);
  assert.equal(shouldRecoverLegacyOutputFailure({status:'failed',result:JSON.stringify({reason:'Unsupported rules'})}),false);
  assert.equal(shouldRecoverLegacyOutputFailure(null),false);
});

void test('a mistaken movement conflict can retry without duplicating completed or uncertain generations', () => {
  const result=JSON.stringify({reason:'Space Invaders ship movement and Snake grid movement require conflicting movement modes and cannot both be implemented in one game.'});
  assert.equal(shouldRecoverReferenceConflict({status:'failed',result}),true);
  for(const status of ['running','complete']) assert.equal(shouldRecoverReferenceConflict({status,result}),false);
  assert.equal(shouldRecoverReferenceConflict({status:'failed',result:JSON.stringify({reason:'Rhythm audio is unavailable.'})}),false);
  assert.equal(shouldRecoverReferenceConflict({status:'failed',result:JSON.stringify({reason:'Snake cannot play audio while fighting invaders.'})}),false);
});
