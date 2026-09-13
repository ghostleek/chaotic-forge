import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  writeFile,
  appendFile,
  rename,
} from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BENCHMARK_STAGES, buildBenchmarkPrompt } from './benchmark.ts';
import { inspectCandidate, sha256, MAX_CANDIDATE_BYTES } from './candidate.ts';
import { createAgentApi, AgentApiError } from './live-api.mjs';
import {
  LIVE_POLICY,
  estimateObservedCost,
  liveStopReason,
} from './live-policy.mjs';

const id = (value) => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(value))
    throw new Error('invalid-service-id');
  return value;
};
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const safeError = (error) =>
  error instanceof AgentApiError
    ? {
        category: 'api-rejected',
        httpStatus: error.status,
        code: error.code,
        requestId: error.requestId,
      }
    : {
        category: 'local-or-transport-failure',
        reason:
          error instanceof Error && /^[a-z0-9-]{1,80}$/.test(error.message)
            ? error.message
            : 'details-withheld',
      };

export async function runLiveStage(
  stageId,
  rootPath,
  apiKey,
  dependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const pause = dependencies.wait ?? wait;
  const stage = BENCHMARK_STAGES.find((item) => item.id === stageId);
  if (!stage) throw new Error('invalid-stage');
  if (!apiKey?.trim()) throw new Error('missing-api-key');
  const root = resolve(rootPath);
  await mkdir(root, { recursive: true });
  const directory = join(root, stageId);
  // Exclusive directory is an enduring dispatch marker, including failed or
  // unknown outcomes. Re-running cannot silently purchase a replacement job.
  await mkdir(directory);
  let parent;
  if (stage.parentStageId) {
    parent = await readFile(join(root, stage.parentStageId, 'candidate.json'));
    const accepted = await json(
      join(root, stage.parentStageId, 'acceptance.json'),
    );
    if (
      accepted.artifactHash !== sha256(parent) ||
      accepted.status !== 'independently-accepted'
    ) {
      throw new Error('parent-not-independently-accepted');
    }
  }
  const previous = [];
  for (const prior of BENCHMARK_STAGES.slice(
    0,
    BENCHMARK_STAGES.indexOf(stage),
  )) {
    const record = await json(join(root, prior.id, 'run.json'));
    if (
      record.status !== 'candidate-downloaded-unverified' ||
      !Number.isFinite(record.estimatedUsd) ||
      record.cleanupConfirmed !== true
    ) {
      throw new Error('previous-job-not-qualified');
    }
    previous.push(record.estimatedUsd);
  }
  if (
    previous.reduce((sum, cost) => sum + cost, 0) + LIVE_POLICY.jobStopUsd >
    LIVE_POLICY.totalStopUsd
  ) {
    throw new Error('total-budget-exhausted');
  }
  const started = now();
  const run = {
    runId: randomUUID(),
    stageId,
    policy: LIVE_POLICY,
    startedAt: new Date(started).toISOString(),
    status: 'dispatch-intent',
    sessionId: null,
    environmentId: null,
    turnId: null,
    artifactHash: null,
    sourceHash: null,
    estimatedUsd: null,
    usage: null,
    modelVersion: 'gpt-6-astra alias; service snapshot not yet reported',
    writeAccessVerified: false,
    inferenceAccessVerified: false,
    sandboxAccessVerified: false,
    cancellationConfirmed: false,
    cleanupConfirmed: false,
    errors: [],
    parentArtifactHash: parent ? sha256(parent) : null,
  };
  const persist = async () => {
    await writeFile(
      join(directory, 'run.json.tmp'),
      JSON.stringify(run, null, 2),
      { mode: 0o600 },
    );
    await rename(join(directory, 'run.json.tmp'), join(directory, 'run.json'));
  };
  const request = (dependencies.createApi ?? createAgentApi)(
    apiKey,
    (receipt) =>
      appendFile(
        join(directory, 'receipts.jsonl'),
        JSON.stringify({ at: new Date().toISOString(), ...receipt }) + '\n',
        { mode: 0o600 },
      ),
  );
  const observeUsage = (resources) => {
    const usage =
      resources
        .map((resource) => resource?.usage)
        .filter((item) => estimateObservedCost(item) !== null)
        .sort((a, b) => estimateObservedCost(b) - estimateObservedCost(a))[0] ??
      null;
    const estimate = estimateObservedCost(usage);
    if (estimate !== null) {
      if (estimate >= (run.estimatedUsd ?? 0)) {
        run.usage = {
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
        };
      }
      run.estimatedUsd = Math.max(run.estimatedUsd ?? 0, estimate);
      if (usage.input_tokens || usage.output_tokens)
        run.inferenceAccessVerified = true;
    }
    return usage;
  };
  await persist();
  let submitted = false;
  const cancel = async () => {
    if (!run.sessionId) return;
    run.cancellationRequestedAt = new Date(now()).toISOString();
    try {
      await persist();
    } catch (error) {
      run.errors.push(safeError(error));
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await request('/agents/sessions/' + run.sessionId + '/events', {
          method: 'POST',
          idempotencyKey: run.runId + '-cancel',
          body: { events: [{ type: 'agent.session.input.cancel' }] },
        });
        break;
      } catch (error) {
        run.errors.push(safeError(error));
        if (
          error instanceof AgentApiError &&
          error.status >= 400 &&
          error.status < 500 &&
          ![408, 409, 429].includes(error.status)
        )
          break;
        if (attempt < 2) await pause(2000);
      }
    }
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const turns = await request(
          '/agents/sessions/' + run.sessionId + '/turns?limit=100&order=asc',
        );
        if (Array.isArray(turns.data)) observeUsage(turns.data);
        if (
          Array.isArray(turns.data) &&
          !turns.has_more &&
          turns.data.length &&
          turns.data.every((turn) =>
            ['completed', 'cancelled', 'failed'].includes(turn.status),
          )
        ) {
          run.cancellationConfirmed = true;
          run.terminalTurns = turns.data.map((turn) => ({
            id: id(turn.id),
            status: turn.status,
          }));
          try {
            await persist();
          } catch (error) {
            run.errors.push(safeError(error));
          }
          return;
        }
      } catch (error) {
        run.errors.push(safeError(error));
      }
      await pause(2000);
    }
    throw new Error('cancellation-not-confirmed');
  };
  // Signals request cancellation rather than merely closing the HTTP stream.
  // Bounded reconciliation failures remain explicit and block later stages.
  let interrupted = false;
  const onSignal = () => {
    interrupted = true;
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  try {
    const prompt = buildBenchmarkPrompt(
      stage.id,
      parent ? sha256(parent) : undefined,
    );
    await writeFile(join(directory, 'prompt.txt'), prompt, {
      flag: 'wx',
      mode: 0o600,
    });
    // No initial input: an unknown create response cannot start model work.
    const session = await request('/agents/sessions', {
      method: 'POST',
      body: {
        metadata: { pc09a_run_id: run.runId, stage: stage.id },
        agent: {
          model: LIVE_POLICY.model,
          reasoning: { effort: LIVE_POLICY.reasoning },
          multi_agent: { enabled: false },
          service_tier: 'default',
          instructions:
            'Use the hosted sandbox shell to implement and test the requested game. Keep all data and code inside /workspace. No external services, dependencies, web search, MCP tools, image generation, subagents, or network. Use Node/Python built-ins to write full trace arrays instead of emitting them as chat text. Never claim independently verified results.',
        },
        environment: {
          type: 'openai_hosted',
          network: { access: 'disabled' },
          files: [
            {
              type: 'inline',
              path: '/workspace/qualification.txt',
              data: Buffer.from(prompt).toString('base64'),
            },
            ...(parent
              ? [
                  {
                    type: 'inline',
                    path: '/workspace/parent-candidate.json',
                    data: parent.toString('base64'),
                  },
                ]
              : []),
          ],
        },
        stream: false,
      },
    });
    run.sessionId = id(session.id);
    run.environmentId = id(session.environment?.id);
    run.writeAccessVerified = true;
    run.status = 'provisioning';
    await persist();
    let connected = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (interrupted || now() - started >= LIVE_POLICY.jobSeconds * 1000)
        throw new Error('time-stop');
      const environment = await request(
        '/agents/environments/' + run.environmentId,
      );
      if (environment.status === 'connected') {
        connected = true;
        break;
      }
      if (['failed', 'expired', 'disconnected'].includes(environment.status))
        throw new Error('sandbox-unavailable');
      await pause(2000);
    }
    if (!connected) throw new Error('sandbox-setup-timeout');
    run.sandboxAccessVerified = true;
    run.status = 'submitting';
    await persist();
    if (interrupted || now() - started >= LIVE_POLICY.jobSeconds * 1000)
      throw new Error('time-stop');
    // Mark before POST: an uncertain input result still needs cancellation.
    submitted = true;
    await request('/agents/sessions/' + run.sessionId + '/events', {
      method: 'POST',
      idempotencyKey: run.runId + '-input',
      body: {
        events: [
          {
            type: 'agent.session.input.message',
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text:
                      'Read /workspace/qualification.txt' +
                      (parent
                        ? ' and the exact retained /workspace/parent-candidate.json'
                        : '') +
                      '. Implement the full scenario and all required traces. Write the single JSON candidate to /workspace/outputs/candidate.json using scripts to construct the arrays. Verify your proposed traces by running your implementation. Do not print the large JSON in chat. Finish within 12 minutes; no repair follow-up is available. Your final message should only report the output path and any remaining limitation.',
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    run.status = 'in-progress';
    await persist();
    let lastUsageAt = now();
    let lastUsageSignature = '';
    let lastProgressAt = 0;
    while (true) {
      if (interrupted) throw new Error('interrupted');
      const sessionState = await request('/agents/sessions/' + run.sessionId);
      const turns = await request(
        '/agents/sessions/' + run.sessionId + '/turns?limit=100&order=asc',
      );
      if (!Array.isArray(turns.data) || turns.has_more || turns.data.length > 1)
        throw new Error('unexpected-turn-history');
      const turn = turns.data[0];
      if (turn) run.turnId = id(turn.id);
      // These are alternative cumulative accounting views, never additive.
      const usage = observeUsage([sessionState, turn]);
      if (usage !== null) {
        const signature = JSON.stringify([
          usage.input_tokens,
          usage.output_tokens,
        ]);
        if (signature !== lastUsageSignature) {
          lastUsageAt = now();
          lastUsageSignature = signature;
        }
      }
      const stop = liveStopReason({
        elapsedMs: now() - started,
        estimatedUsd: run.estimatedUsd,
        blindUsageMs: now() - lastUsageAt,
      });
      if (stop) throw new Error(stop);
      if (turn?.status === 'completed') {
        run.inferenceAccessVerified = true;
        if (run.estimatedUsd === null)
          throw new Error('completed-usage-missing');
        break;
      }
      if (
        ['failed', 'cancelled'].includes(turn?.status) ||
        ['failed', 'requires_action'].includes(sessionState.status)
      ) {
        throw new Error('generation-failed');
      }
      await persist();
      if (now() - lastProgressAt >= 30_000) {
        console.log(
          JSON.stringify({
            stageId,
            status: turn?.status ?? sessionState.status,
            elapsedSeconds: Math.round((now() - started) / 1000),
            estimatedUsd: run.estimatedUsd,
          }),
        );
        lastProgressAt = now();
      }
      await pause(2000);
    }
    const artifacts = [];
    let after = '';
    for (let page = 0; page < 10; page++) {
      const list = await request(
        '/agents/sessions/' +
          run.sessionId +
          '/artifacts?limit=100&order=asc' +
          after,
      );
      if (!Array.isArray(list.data)) throw new Error('invalid-artifact-list');
      artifacts.push(
        ...list.data.filter(
          (artifact) =>
            artifact.turn_id === run.turnId &&
            artifact.path === '/workspace/outputs/candidate.json',
        ),
      );
      if (!list.has_more) break;
      if (page === 9) throw new Error('artifact-page-limit');
      after = '&after=' + id(list.last_id);
    }
    if (
      artifacts.length !== 1 ||
      !Number.isSafeInteger(artifacts[0].size_bytes) ||
      artifacts[0].size_bytes < 0 ||
      artifacts[0].size_bytes > MAX_CANDIDATE_BYTES
    )
      throw new Error('artifact-missing-or-oversized');
    const artifact = artifacts[0];
    const bytes = await request(
      '/agents/sessions/' +
        run.sessionId +
        '/artifacts/' +
        id(artifact.id) +
        '/content',
      { bytes: true, limit: MAX_CANDIDATE_BYTES },
    );
    await writeFile(join(directory, 'candidate.json'), bytes, {
      flag: 'wx',
      mode: 0o600,
    });
    const intake = inspectCandidate(bytes, stage.id, parent);
    Object.assign(run, {
      artifactHash: intake.report.artifactHash,
      sourceHash: intake.report.sourceHash,
      status: 'candidate-downloaded-unverified',
      artifactId: artifact.id,
      timeToArtifactSeconds: (now() - started) / 1000,
    });
    await writeFile(
      join(directory, 'intake.json'),
      JSON.stringify(intake.report, null, 2),
      { flag: 'wx', mode: 0o600 },
    );
  } catch (error) {
    const createRejected =
      error instanceof AgentApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 408;
    run.status = run.sessionId
      ? 'failed'
      : createRejected
        ? 'create-rejected'
        : 'create-outcome-unresolved';
    run.errors.push(safeError(error));
    try {
      await persist();
    } catch (persistError) {
      run.errors.push(safeError(persistError));
    }
    if (!run.sessionId && !createRejected) {
      // Never repeat session creation. Find only this run's unique marker;
      // unrelated session contents are neither logged nor changed.
      try {
        let after = '';
        const matches = [];
        for (let page = 0; page < 10; page++) {
          const list = await request(
            '/agents/sessions?limit=100&order=desc' + after,
          );
          if (!Array.isArray(list.data))
            throw new Error('invalid-session-list');
          matches.push(
            ...list.data.filter(
              (item) => item.metadata?.pc09a_run_id === run.runId,
            ),
          );
          if (!list.has_more) break;
          after = '&after=' + id(list.last_id);
        }
        if (matches.length === 1) {
          run.sessionId = id(matches[0].id);
          run.status = 'create-recovered-without-dispatch';
          run.writeAccessVerified = true;
        }
      } catch (recoveryError) {
        run.errors.push(safeError(recoveryError));
      }
    }
    if (run.sessionId && submitted) {
      try {
        await cancel();
      } catch (cancelError) {
        run.errors.push(safeError(cancelError));
      }
    }
  } finally {
    // Retained files are read before destroying the hosted environment. No
    // session outside this run is ever deleted; failures remain visible.
    if (run.sessionId) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await request('/agents/sessions/' + run.sessionId, {
            method: 'DELETE',
          });
          run.cleanupConfirmed = true;
          break;
        } catch (error) {
          if (
            !(error instanceof AgentApiError) ||
            error.status !== 409 ||
            attempt === 2
          ) {
            run.errors.push(safeError(error));
            break;
          }
          await pause(2000);
        }
      }
    }
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    run.finishedAt = new Date(now()).toISOString();
    await persist();
  }
  return run;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [stage, directory] = process.argv.slice(2);
  if (!stage || !directory || process.argv.length !== 4) {
    console.error(
      'Usage: node --env-file=<private.env> live.mjs <stage> <run-directory>',
    );
    process.exitCode = 1;
  } else {
    try {
      const result = await runLiveStage(
        stage,
        directory,
        process.env.OPENAI_API_KEY,
      );
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== 'candidate-downloaded-unverified')
        process.exitCode = 2;
    } catch (error) {
      console.error(JSON.stringify(safeError(error)));
      process.exitCode = 2;
    }
  }
}
