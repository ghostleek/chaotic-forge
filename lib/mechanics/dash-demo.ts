import type { DashRuntimeState } from './dash-runtime';

export const DASH_DEMO_ORDER = ['mutation', 'control'] as const;

export type DashDemoPreference = 'run-1' | 'run-2' | 'no-preference';
export type DashDemoDecision = 'keep' | 'revise' | 'reject' | 'inconclusive';

export function buildDashDemoReport({
  firstRun,
  secondRun,
  preference,
  response,
}: {
  firstRun: DashRuntimeState;
  secondRun: DashRuntimeState;
  preference: DashDemoPreference;
  response: string;
}) {
  return {
    scope: 'local-demo',
    sampleSize: 1,
    validExternalEvidence: false,
    order: DASH_DEMO_ORDER,
    mapping: {
      'run-1': 'Variant B — on enemy elimination',
      'run-2': 'Control A — after 3 seconds',
    },
    preference,
    response: response.trim(),
    runs: [
      { label: 'Run 1', ...firstRun.metrics },
      { label: 'Run 2', ...secondRun.metrics },
    ],
    limitations: [
      'One local demonstration cannot establish a winner.',
      'No durable participant identity, duplicate detection, or balanced assignment was used.',
      'The response and telemetry never left this browser tab or reached a creator inbox.',
      'Preview and demo events are excluded from production evidence.',
    ],
  } as const;
}

export function recordDashDemoDecision(
  decision: DashDemoDecision,
  rationale: string,
) {
  return {
    decision,
    rationale: rationale.trim(),
    recordedAt: new Date().toISOString(),
    scope: 'local-demo',
    durable: false,
  } as const;
}
