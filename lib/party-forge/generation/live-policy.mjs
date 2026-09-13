export const LIVE_POLICY = Object.freeze({
  model: 'gpt-6-astra',
  reasoning: 'medium',
  totalStopUsd: 15,
  jobStopUsd: 5,
  jobSeconds: 900,
  maxJobs: 3,
  maxRepairs: 0,
  maxBlindUsageSeconds: 60,
  sandboxReserveUsd: 1.92,
  costKind: 'conservative-monitoring-estimate-not-final-bill',
});
export function estimateObservedCost(usage) {
  if (
    !usage ||
    !Number.isSafeInteger(usage.input_tokens) ||
    usage.input_tokens < 0 ||
    !Number.isSafeInteger(usage.output_tokens) ||
    usage.output_tokens < 0
  )
    return null;
  // Cache writes replace input charges; charge every observed input token at
  // the higher write price, without double counting reasoning/cached subsets.
  // Use the highest standard long-context rates throughout, since usage can
  // arrive late and cannot establish the size of each individual model call.
  return (
    LIVE_POLICY.sandboxReserveUsd +
    (usage.input_tokens * 25) / 1_000_000 +
    (usage.output_tokens * 75) / 1_000_000
  );
}
export function liveStopReason({ elapsedMs, estimatedUsd, blindUsageMs }) {
  if (elapsedMs >= LIVE_POLICY.jobSeconds * 1000) return 'time-stop';
  if (estimatedUsd !== null && estimatedUsd >= LIVE_POLICY.jobStopUsd)
    return 'cost-stop';
  if (blindUsageMs >= LIVE_POLICY.maxBlindUsageSeconds * 1000)
    return 'usage-unobservable';
  return null;
}
