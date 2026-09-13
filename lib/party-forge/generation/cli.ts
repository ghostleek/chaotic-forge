import { open, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  BENCHMARK_STAGES,
  buildBenchmarkPrompt,
  parseQualificationBudget,
} from './benchmark.ts';
import { inspectCandidate, MAX_CANDIDATE_BYTES, sha256 } from './candidate.ts';
import { qualificationPreflight } from './preflight.ts';
import { probeAgentReadAccess } from './access-probe.ts';

async function readBounded(path: string, limit: number) {
  // Reject a FIFO/device through the opened handle without blocking before stat.
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > limit)
      throw new Error('Expected a bounded regular file');
    const bytes = Buffer.alloc(limit + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await file.read(
        bytes,
        offset,
        bytes.length - offset,
        null,
      );
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > limit) throw new Error('File exceeds byte limit');
    return bytes.subarray(0, offset);
  } finally {
    await file.close();
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'probe-access' && args.length === 0) {
    const report = await probeAgentReadAccess(process.env.OPENAI_API_KEY);
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'read-access-verified') process.exitCode = 2;
    return;
  }
  if (command === 'preflight' && args.length === 0) {
    console.log(JSON.stringify(qualificationPreflight(process.env), null, 2));
    process.exitCode = 2;
    return;
  }
  if (command === 'prepare' && args.length === 2) {
    const [budgetPath, destination] = args;
    const budget = parseQualificationBudget(
      JSON.parse((await readBounded(budgetPath, 8192)).toString('utf8')),
    );
    const directory = resolve(destination);
    await mkdir(directory, { recursive: false });
    await writeFile(
      join(directory, 'plan.json'),
      JSON.stringify(
        {
          ...qualificationPreflight(process.env),
          budget,
          budgetEnforcement: 'planning-only',
          stages: BENCHMARK_STAGES,
        },
        null,
        2,
      ),
      { flag: 'wx' },
    );
    await writeFile(
      join(directory, 'initial-prompt.txt'),
      buildBenchmarkPrompt('initial'),
      { flag: 'wx' },
    );
    console.log(
      JSON.stringify({
        status: 'prepared-offline',
        directory,
        paidRequests: 0,
        note: 'Remix prompts require the exact retained parent file. This command does not start a generation job.',
      }),
    );
    return;
  }
  if (command === 'inspect' && (args.length === 2 || args.length === 3)) {
    const [stageId, path, parentPath] = args;
    const bytes = await readBounded(path, MAX_CANDIDATE_BYTES);
    const parent = parentPath
      ? await readBounded(parentPath, MAX_CANDIDATE_BYTES)
      : undefined;
    console.log(
      JSON.stringify(inspectCandidate(bytes, stageId, parent).report, null, 2),
    );
    return;
  }
  if (command === 'remix-prompt' && (args.length === 3 || args.length === 4)) {
    const [stageId, parentPath, destination, grandparentPath] = args;
    const stage = BENCHMARK_STAGES.find((item) => item.id === stageId);
    if (!stage?.parentStageId) throw new Error('Expected a remix stage');
    const parent = await readBounded(parentPath, MAX_CANDIDATE_BYTES);
    const grandparent = grandparentPath
      ? await readBounded(grandparentPath, MAX_CANDIDATE_BYTES)
      : undefined;
    inspectCandidate(parent, stage.parentStageId, grandparent);
    const prompt = buildBenchmarkPrompt(stage.id, sha256(parent));
    // The exact parent JSON is supplied as data; no candidate code is run in the operator process.
    await writeFile(
      destination,
      JSON.stringify(
        {
          prompt,
          parentArtifactHash: sha256(parent),
          parentCandidate: JSON.parse(parent.toString('utf8')),
          status: 'prepared-unverified-parent',
          requiresIndependentParentAcceptance: true,
        },
        null,
        2,
      ),
      { flag: 'wx' },
    );
    console.log(
      JSON.stringify({ status: 'prepared-offline', paidRequests: 0 }),
    );
    return;
  }
  throw new Error(
    'Usage: preflight | probe-access | prepare <budget.json> <new-output-dir> | inspect <stage> <candidate.json> [parent.json] | remix-prompt <stage> <parent.json> <new-output.json> [grandparent.json]',
  );
}

main().catch((error: unknown) => {
  // Candidate/schema errors can contain arbitrary source or secrets. Print no input values.
  const usage =
    error instanceof Error && error.message.startsWith('Usage:')
      ? error.message
      : undefined;
  console.error(
    JSON.stringify({
      status: 'failed',
      reason:
        usage ??
        'Input rejected or filesystem operation failed; no job started',
    }),
  );
  process.exitCode = 1;
});
