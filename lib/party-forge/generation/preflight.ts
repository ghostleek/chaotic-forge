/** No network or model requests. Presence checks never disclose credential values. */
export function qualificationPreflight(
  environment: Record<string, string | undefined>,
) {
  const keyPresent = Boolean(environment.OPENAI_API_KEY?.trim());
  const blockers = [
    ...(!keyPresent ? ['OPENAI_API_KEY is not configured'] : []),
    'Actual Agents API access has not been verified',
    'Live time/spend policy and enforcement must be accepted before paid jobs',
    'A bounded isolated execution service for generated score validation is not qualified',
  ];
  return {
    packet: 'PC-09A',
    baseline: '2a842d704a0f9a9757a793d6ad7f77282f42f752',
    parentPullRequest: 'https://github.com/ghostleek/chaotic-forge/pull/41',
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
