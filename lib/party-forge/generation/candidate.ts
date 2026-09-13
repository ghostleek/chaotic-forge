import { createHash } from 'node:crypto';
import { z } from 'zod';
import { DEMO_POLICY, inputFrameSchema } from '../contracts.ts';
import {
  BENCHMARK_STAGES,
  QUALIFICATION_PROTOCOL_VERSION,
} from './benchmark.ts';

export const MAX_CANDIDATE_BYTES = 4 * 1024 * 1024;
export const MAX_SOURCE_BYTES = 256 * 1024;
const hashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const framesSchema = z
  .array(inputFrameSchema)
  .length(DEMO_POLICY.trialTicks)
  .refine(
    (frames) => frames.every((frame, index) => frame.tick === index),
    'Every simulation tick must appear exactly once in order',
  );
const candidateSchema = z.strictObject({
  protocolVersion: z.literal(QUALIFICATION_PROTOCOL_VERSION),
  stageId: z.enum(['initial', 'remix-1', 'remix-2']),
  parentArtifactHash: hashSchema.nullable(),
  source: z
    .string()
    .min(1)
    .refine(
      (source) => Buffer.byteLength(source, 'utf8') <= MAX_SOURCE_BYTES,
      'Source exceeds the qualification byte limit',
    ),
  witnessTraceProposals: z
    .array(
      z.strictObject({
        contributionId: z.string().min(1).max(96),
        witnessId: z.string().min(1).max(96),
        frames: framesSchema,
      }),
    )
    .min(3)
    .max(7),
  completingTraceProposal: z.strictObject({ frames: framesSchema }),
});
export type QualificationCandidate = z.infer<typeof candidateSchema>;
export function sha256(bytes: string | Uint8Array): string {
  return 'sha256:' + createHash('sha256').update(bytes).digest('hex');
}

/** Intake only. Never imports, evals, or executes candidate source or trusts its claims. */
export function inspectCandidate(
  bytes: Uint8Array,
  expectedStage: string,
  parentBytes?: Uint8Array,
) {
  if (bytes.byteLength > MAX_CANDIDATE_BYTES)
    throw new Error('Candidate exceeds 4 MiB');
  const stage = BENCHMARK_STAGES.find((item) => item.id === expectedStage);
  if (!stage) throw new Error('Unknown benchmark stage');
  const candidate = candidateSchema.parse(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
  );
  if (candidate.stageId !== stage.id)
    throw new Error('Candidate stage mismatch');
  if (stage.parentStageId === null) {
    if (parentBytes !== undefined || candidate.parentArtifactHash !== null) {
      throw new Error('Initial candidate cannot have a parent');
    }
  } else {
    if (
      !parentBytes ||
      parentBytes.byteLength > MAX_CANDIDATE_BYTES ||
      candidate.parentArtifactHash !== sha256(parentBytes)
    )
      throw new Error('Exact parent artifact required');
    const parent = candidateSchema.parse(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(parentBytes)),
    );
    if (parent.stageId !== stage.parentStageId)
      throw new Error('Parent stage mismatch');
  }
  const expected = stage.contributions.map((item) => ({
    contributionId: item.id,
    witnessId: item.witness.id,
  }));
  if (
    candidate.witnessTraceProposals.length !== expected.length ||
    expected.some(
      (item) =>
        candidate.witnessTraceProposals.filter(
          (proposal) =>
            proposal.contributionId === item.contributionId &&
            proposal.witnessId === item.witnessId,
        ).length !== 1,
    )
  ) {
    throw new Error(
      'Every retained and new contribution needs its exact witness proposal',
    );
  }
  return {
    candidate,
    report: {
      status: 'structurally-valid-unverified' as const,
      stageId: stage.id,
      artifactHash: sha256(bytes),
      sourceHash: sha256(candidate.source),
      sourceBytes: Buffer.byteLength(candidate.source, 'utf8'),
      witnessProposals: expected.length,
      sourceExecuted: false,
      behavioralAcceptance: false,
      generationOriginVerified: false,
      productionContractCompatible: false,
    },
  };
}
