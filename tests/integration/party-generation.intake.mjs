import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BENCHMARK_STAGES,
  QUALIFICATION_PROTOCOL_VERSION,
} from '../../lib/party-forge/generation/benchmark.ts';
import {
  inspectCandidate,
  MAX_CANDIDATE_BYTES,
  MAX_SOURCE_BYTES,
  sha256,
} from '../../lib/party-forge/generation/candidate.ts';
import { qualificationPreflight } from '../../lib/party-forge/generation/preflight.ts';
import { probeAgentReadAccess } from '../../lib/party-forge/generation/access-probe.ts';

// Authored intake fixtures: neither source nor traces claim generated/playable evidence.
function candidate(stageId = 'initial', parent) {
  const stage = BENCHMARK_STAGES.find((item) => item.id === stageId);
  const frames = Array.from({ length: 3600 }, (_, tick) => ({
    tick,
    buttons: 0,
    yaw: 0,
    pitch: 0,
  }));
  return {
    protocolVersion: QUALIFICATION_PROTOCOL_VERSION,
    stageId,
    parentArtifactHash: parent ? sha256(parent) : null,
    source: 'throw new Error("fixture must never execute");',
    witnessTraceProposals: stage.contributions.map((item) => ({
      contributionId: item.id,
      witnessId: item.witness.id,
      frames,
    })),
    completingTraceProposal: { frames },
  };
}
const encode = (value) => Buffer.from(JSON.stringify(value));

void test('CLI rejects a FIFO before reading instead of waiting indefinitely for a writer', () => {
  const directory = mkdtempSync(join(tmpdir(), 'pc09a-intake-'));
  try {
    const fifo = join(directory, 'candidate.json');
    execFileSync('mkfifo', [fifo]);
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL('../../lib/party-forge/generation/cli.ts', import.meta.url),
        ),
        'inspect',
        'initial',
        fifo,
      ],
      { encoding: 'utf8', timeout: 3000 },
    );
    assert.equal(
      result.error,
      undefined,
      'intake must return without a subprocess timeout',
    );
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).status, 'failed');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

void test('candidate intake hashes exact bytes while retaining every evidence limitation', () => {
  const bytes = encode(candidate());
  const { report } = inspectCandidate(bytes, 'initial');
  assert.equal(report.artifactHash, sha256(bytes));
  assert.equal(report.status, 'structurally-valid-unverified');
  for (const key of [
    'sourceExecuted',
    'behavioralAcceptance',
    'generationOriginVerified',
    'productionContractCompatible',
  ]) {
    assert.equal(report[key], false);
  }
  assert.equal(report.witnessProposals, 3);
});

void test('each successive intake requires its exact predecessor and every retained/new witness', () => {
  const initial = encode(candidate());
  const first = encode(candidate('remix-1', initial));
  const second = encode(candidate('remix-2', first));
  assert.equal(
    inspectCandidate(first, 'remix-1', initial).report.witnessProposals,
    5,
  );
  assert.equal(
    inspectCandidate(second, 'remix-2', first).report.witnessProposals,
    7,
  );
  assert.throws(
    () => inspectCandidate(second, 'remix-2', initial),
    /Exact parent/,
  );
  assert.throws(() => inspectCandidate(first, 'remix-1'), /Exact parent/);
  assert.throws(
    () => inspectCandidate(initial, 'initial', initial),
    /cannot have a parent/,
  );
  const wrongStage = candidate('remix-2', initial);
  assert.throws(
    () => inspectCandidate(encode(wrongStage), 'remix-2', initial),
    /Parent stage/,
  );
  for (const mutate of [
    (value) => {
      value.witnessTraceProposals.pop();
    },
    (value) => {
      value.witnessTraceProposals[0] = value.witnessTraceProposals[1];
    },
    (value) => {
      value.witnessTraceProposals[0].witnessId = 'invented';
    },
  ]) {
    const value = candidate('remix-2', first);
    mutate(value);
    assert.throws(
      () => inspectCandidate(encode(value), 'remix-2', first),
      /exact witness/,
    );
  }
});

void test('intake rejects oversized bytes, invalid UTF8, extra claims, and incomplete/out-of-range traces', () => {
  assert.throws(
    () => inspectCandidate(Buffer.alloc(MAX_CANDIDATE_BYTES + 1), 'initial'),
    /4 MiB/,
  );
  assert.throws(() => inspectCandidate(Buffer.from([0xff]), 'initial'));
  for (const mutate of [
    (value) => {
      value.source = 'é'.repeat(MAX_SOURCE_BYTES);
    },
    (value) => {
      value.accepted = true;
    },
    (value) => {
      value.completingTraceProposal.frames.pop();
    },
    (value) => {
      value.witnessTraceProposals[0].frames[2].tick = 1;
    },
    (value) => {
      value.witnessTraceProposals[0].frames[0].buttons = 64;
    },
  ]) {
    const value = candidate();
    mutate(value);
    assert.throws(() => inspectCandidate(encode(value), 'initial'));
  }
});

void test('preflight never treats key presence as actual API/generation acceptance or exposes the key', () => {
  const without = qualificationPreflight({});
  const withKey = qualificationPreflight({
    OPENAI_API_KEY: 'fixture-not-a-real-key',
  });
  assert.equal(without.apiKeyPresent, false);
  assert.equal(withKey.apiKeyPresent, true);
  assert.equal(withKey.readyForLiveGeneration, false);
  assert.equal(withKey.modelRequestsMade, 0);
  assert.ok(!JSON.stringify(withKey).includes('fixture-not-a-real-key'));
});

void test('access probe makes no request without credentials and strips unrelated session contents', async () => {
  let requests = 0;
  const fetchFixture = async (url, options) => {
    requests++;
    assert.equal(
      url,
      'https://api.openai.com/v1/agents/sessions?limit=1&order=desc',
    );
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['OpenAI-Beta'], 'agents=v1');
    return new Response(
      JSON.stringify({
        object: 'list',
        has_more: false,
        data: [
          { id: 'do-not-retain', agent: { instructions: 'private content' } },
        ],
      }),
      { headers: { 'x-request-id': 'req-fixture' } },
    );
  };
  assert.equal(
    (await probeAgentReadAccess(undefined, fetchFixture)).status,
    'blocked',
  );
  assert.equal(requests, 0);
  const report = await probeAgentReadAccess('fixture-key', fetchFixture);
  assert.equal(requests, 1);
  assert.equal(report.status, 'read-access-verified');
  assert.equal(report.inferenceAccessVerified, false);
  assert.equal(report.sessionsReturned, 1);
  assert.ok(!JSON.stringify(report).includes('private content'));
  assert.ok(!JSON.stringify(report).includes('fixture-key'));
  assert.ok(!JSON.stringify(report).includes('do-not-retain'));
});

void test('access probe fails closed on HTTP/transport/schema/size failures without logging response bodies', async () => {
  const fixtures = [
    async () => new Response('fixture-secret', { status: 403 }),
    async () => {
      throw new Error('fixture-secret');
    },
    async () => new Response(JSON.stringify({ accepted: true })),
    async () => new Response('a'.repeat(256 * 1024 + 1)),
  ];
  for (const fetchFixture of fixtures) {
    const report = await probeAgentReadAccess('fixture-key', fetchFixture);
    assert.equal(report.status, 'blocked');
    assert.ok(!JSON.stringify(report).includes('fixture-secret'));
  }
});
