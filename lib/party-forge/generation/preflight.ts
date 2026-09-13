/** No network or model requests. Presence checks never disclose credential values. */
export function qualificationPreflight(
  environment: Record<string, string | undefined>,
) {
  const keyPresent = Boolean(environment.OPENAI_API_KEY?.trim());
  const blockers = [
    ...(!keyPresent ? ['OPENAI_API_KEY is not configured'] : []),
    'This offline check cannot verify Agents API access; consult the recorded live run',
    'This offline check cannot verify accepted time/spend policy or its enforcement',
    'Production CPU/memory isolation and independent score validation remain unqualified',
  ];
  return {
    packet: 'PC-09A',
    baseline: '7666e96ac22d0a9588ca159c15cd87457671a7e8',
    parentPullRequest: 'https://github.com/ghostleek/chaotic-forge/pull/42',
    apiKeyPresent: keyPresent,
    modelRequestsMade: 0,
    readyForLiveGeneration: false,
    blockers,
    integrationBlockers: [
      'Production party-forge/1 accepts only the preset card enums and at most six contributions; the novel benchmark needs seven',
      'A versioned general contribution contract requires a separate accepted shared-file handoff',
    ],
  };
}
