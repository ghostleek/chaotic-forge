import { z } from 'zod';

export const progressLabels = {
  started: 'Generation session started',
  research: 'Looking up game mechanics',
  researched: 'Web lookup completed',
  command: 'Working on game files or checks',
  commandDone: 'Sandbox command completed',
  commandFailed: 'Sandbox command needs attention',
  scoped: 'Game brief received',
  validating: 'Checking the executable in an isolated browser',
  preview: 'Browser smoke checks passed — ready to playtest',
  failed: 'Generation could not produce a validated preview',
} as const;
export const progressEntrySchema = z.strictObject({
  id: z.string().min(1).max(200),
  kind: z.enum(
    Object.keys(progressLabels) as [
      keyof typeof progressLabels,
      ...(keyof typeof progressLabels)[],
    ],
  ),
  at: z.number().int().nonnegative(),
});
export const progressSchema = z.array(progressEntrySchema).max(80);
export type ProgressEntry = z.infer<typeof progressEntrySchema>;
const text = z.string().trim().min(1).max(700);
export const gameBriefSchema = z.strictObject({
  title: z.string().trim().min(1).max(100),
  disposition: z.enum(['build', 'needs_clarification']),
  summary: text,
  controls: text,
  rules: z.array(text).min(1).max(12),
  winner: text,
  ties: text,
  endCondition: text,
  contributions: z
    .array(
      z.strictObject({
        input: z.string().min(1).max(300),
        mechanics: text,
        acceptance: text,
      }),
    )
    .min(2)
    .max(5),
  sources: z
    .array(
      z.strictObject({
        title: z.string().min(1).max(200),
        url: z
          .url()
          .max(1500)
          .refine((value) => /^https?:\/\//.test(value), 'Web sources only'),
      }),
    )
    .max(12),
  adaptations: z.array(text).max(8),
  questions: z.array(text).max(3),
});
export type GameBrief = z.infer<typeof gameBriefSchema>;

/** Expose only allowlisted metadata, never commands, reasoning, tool output or credentials. */
export function itemProgress(
  item: {
    id?: string;
    type?: string;
    status?: string;
    exit_code?: number | null;
  },
  at = Date.now(),
): ProgressEntry | null {
  if (!item.id || item.id.length > 160) return null;
  let kind: ProgressEntry['kind'];
  if (item.type === 'web_search_call')
    kind = item.status === 'completed' ? 'researched' : 'research';
  else if (item.type === 'command_execution') {
    kind =
      item.status === 'completed'
        ? item.exit_code === 0
          ? 'commandDone'
          : 'commandFailed'
        : 'command';
  } else return null;
  return { id: `${item.id}:${kind}`, kind, at };
}
export function mergeProgress(
  previous: ProgressEntry[],
  incoming: ProgressEntry[],
) {
  const entries = new Map(previous.map((entry) => [entry.id, entry]));
  for (const entry of incoming)
    if (!entries.has(entry.id)) entries.set(entry.id, entry);
  return [...entries.values()].slice(-80);
}
export function publicProgress(evidence: string | null) {
  let value;
  try {
    value = JSON.parse(evidence ?? '{}');
  } catch {
    value = {};
  }
  return {
    progress: progressSchema.safeParse(value.progress).data ?? [],
    brief: gameBriefSchema.safeParse(value.brief).data ?? null,
  };
}
