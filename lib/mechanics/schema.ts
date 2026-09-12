export const MECHANIC_SCHEMA_VERSION = '0.1.0' as const;

export const SYSTEM_FAMILIES = [
  'mobility',
  'timing-defense',
  'resource-recovery',
  'pressure-reward',
  'stance-adaptation',
] as const;

export const LOOP_TIMESCALES = ['moment', 'encounter', 'run'] as const;
export const PLAY_CONTEXTS = [
  'single-player',
  'competitive-multiplayer',
] as const;
export const COMPLEXITY_LEVELS = ['low', 'medium', 'high'] as const;
export const SOURCE_KINDS = [
  'developer',
  'publisher',
  'official-manual',
] as const;
export const SOURCE_CONFIDENCE = ['medium', 'high'] as const;

export const COMPARISON_DIMENSIONS = [
  'agency',
  'executionDemand',
  'failureCost',
  'counterplayWindow',
  'feedbackClarity',
  'implementationComplexity',
  'evidenceBurden',
] as const;

export const COMPARISON_LABELS: Record<ComparisonDimension, string> = {
  agency: 'Player agency',
  executionDemand: 'Execution demand',
  failureCost: 'Failure cost',
  counterplayWindow: 'Counterplay window',
  feedbackClarity: 'Feedback clarity',
  implementationComplexity: 'Implementation complexity',
  evidenceBurden: 'Evidence burden',
};

type ValueOf<T extends readonly string[]> = T[number];

export type SystemFamily = ValueOf<typeof SYSTEM_FAMILIES>;
export type LoopTimescale = ValueOf<typeof LOOP_TIMESCALES>;
export type PlayContext = ValueOf<typeof PLAY_CONTEXTS>;
export type ComplexityLevel = ValueOf<typeof COMPLEXITY_LEVELS>;
export type SourceKind = ValueOf<typeof SOURCE_KINDS>;
export type SourceConfidence = ValueOf<typeof SOURCE_CONFIDENCE>;
export type ComparisonDimension = ValueOf<typeof COMPARISON_DIMENSIONS>;
export type ComparisonScore = 1 | 2 | 3;
export type ClaimOrigin = 'source' | 'product-synthesis';

export type SourceReference = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: SourceKind;
  confidence: SourceConfidence;
  accessedAt: string;
  rights: 'link-and-summary-only';
};

export type SourcedStatement = {
  text: string;
  origin: ClaimOrigin;
  sourceIds: string[];
};

export type CausalContract = {
  intent: SourcedStatement;
  trigger: SourcedStatement;
  guard: SourcedStatement;
  transform: SourcedStatement;
  interaction: SourcedStatement;
  feedback: SourcedStatement;
  risk: SourcedStatement;
  invariant: SourcedStatement;
  evidence: SourcedStatement;
};

export type ComparisonValue = {
  score: ComparisonScore;
  label: string;
  note: SourcedStatement;
};

export type MechanicImplementationCard = {
  schemaVersion: typeof MECHANIC_SCHEMA_VERSION;
  id: string;
  patternId: string;
  patternName: string;
  implementationName: string;
  game: {
    name: string;
    releaseYear: number;
    genres: string[];
    platforms: string[];
    sourceIds: string[];
  };
  summary: SourcedStatement;
  causal: CausalContract;
  discovery: {
    behaviors: string[];
    systemFamilies: SystemFamily[];
    genres: string[];
    platforms: string[];
    timescale: LoopTimescale;
    context: PlayContext;
    complexity: ComplexityLevel;
    dependencies: string[];
    risks: string[];
  };
  tunables: Array<{
    name: string;
    unit: string;
    note: string;
  }>;
  comparison: Record<ComparisonDimension, ComparisonValue>;
  matchTerms: string[];
  sources: SourceReference[];
};

export type MechanicFilters = Partial<{
  behaviors: string[];
  systemFamilies: SystemFamily[];
  genres: string[];
  platforms: string[];
  timescales: LoopTimescale[];
  contexts: PlayContext[];
  complexities: ComplexityLevel[];
  dependencies: string[];
  risks: string[];
}>;

export type ValidationIssue = {
  path: string;
  message: string;
};

const CAUSAL_FIELDS = [
  'intent',
  'trigger',
  'guard',
  'transform',
  'interaction',
  'feedback',
  'risk',
  'invariant',
  'evidence',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);

function validateStatement(
  value: unknown,
  path: string,
  sourceIds: Set<string>,
  issues: ValidationIssue[],
) {
  if (!isRecord(value)) {
    issues.push({ path, message: 'must be a sourced statement' });
    return;
  }

  if (!isNonEmptyString(value.text)) {
    issues.push({
      path: `${path}.text`,
      message: 'must be a non-empty string',
    });
  }

  if (value.origin !== 'source' && value.origin !== 'product-synthesis') {
    issues.push({
      path: `${path}.origin`,
      message: 'must identify source or product synthesis',
    });
  }

  if (!isStringArray(value.sourceIds)) {
    issues.push({
      path: `${path}.sourceIds`,
      message: 'must cite at least one source',
    });
    return;
  }

  for (const id of value.sourceIds) {
    if (!sourceIds.has(id)) {
      issues.push({
        path: `${path}.sourceIds`,
        message: `references unknown source ${id}`,
      });
    }
  }
}

function validateStringList(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
) {
  if (!isStringArray(value)) {
    issues.push({ path, message: 'must contain at least one non-empty value' });
  }
}

export function validateMechanicCard(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return [{ path: '$', message: 'must be an object' }];
  }

  if (value.schemaVersion !== MECHANIC_SCHEMA_VERSION) {
    issues.push({
      path: 'schemaVersion',
      message: `must equal ${MECHANIC_SCHEMA_VERSION}`,
    });
  }

  for (const field of [
    'id',
    'patternId',
    'patternName',
    'implementationName',
  ] as const) {
    if (!isNonEmptyString(value[field])) {
      issues.push({ path: field, message: 'must be a non-empty string' });
    }
  }

  if (
    isNonEmptyString(value.id) &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)
  ) {
    issues.push({
      path: 'id',
      message: 'must be a lowercase kebab-case identifier',
    });
  }

  const sources = Array.isArray(value.sources) ? value.sources : [];
  const sourceIds = new Set<string>();
  if (sources.length === 0) {
    issues.push({
      path: 'sources',
      message: 'must contain at least one source',
    });
  }

  sources.forEach((source, index) => {
    const path = `sources[${index}]`;
    if (!isRecord(source)) {
      issues.push({ path, message: 'must be an object' });
      return;
    }

    if (!isNonEmptyString(source.id)) {
      issues.push({
        path: `${path}.id`,
        message: 'must be a non-empty string',
      });
    } else if (sourceIds.has(source.id)) {
      issues.push({
        path: `${path}.id`,
        message: 'must be unique within the card',
      });
    } else {
      sourceIds.add(source.id);
    }

    for (const field of ['title', 'publisher'] as const) {
      if (!isNonEmptyString(source[field])) {
        issues.push({
          path: `${path}.${field}`,
          message: 'must be a non-empty string',
        });
      }
    }

    if (!isNonEmptyString(source.url) || !source.url.startsWith('https://')) {
      issues.push({ path: `${path}.url`, message: 'must be an HTTPS URL' });
    }
    if (!SOURCE_KINDS.includes(source.kind as SourceKind)) {
      issues.push({
        path: `${path}.kind`,
        message: 'must be a supported source kind',
      });
    }
    if (!SOURCE_CONFIDENCE.includes(source.confidence as SourceConfidence)) {
      issues.push({
        path: `${path}.confidence`,
        message: 'must be medium or high',
      });
    }
    if (
      !isNonEmptyString(source.accessedAt) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(source.accessedAt)
    ) {
      issues.push({
        path: `${path}.accessedAt`,
        message: 'must use YYYY-MM-DD',
      });
    }
    if (source.rights !== 'link-and-summary-only') {
      issues.push({
        path: `${path}.rights`,
        message: 'must preserve the link-and-summary-only boundary',
      });
    }
  });

  if (!isRecord(value.game)) {
    issues.push({ path: 'game', message: 'must be an object' });
  } else {
    if (!isNonEmptyString(value.game.name)) {
      issues.push({ path: 'game.name', message: 'must be a non-empty string' });
    }
    if (
      !Number.isInteger(value.game.releaseYear) ||
      Number(value.game.releaseYear) < 1970
    ) {
      issues.push({
        path: 'game.releaseYear',
        message: 'must be a valid release year',
      });
    }
    validateStringList(value.game.genres, 'game.genres', issues);
    validateStringList(value.game.platforms, 'game.platforms', issues);
    if (!isStringArray(value.game.sourceIds)) {
      issues.push({
        path: 'game.sourceIds',
        message: 'must cite at least one source',
      });
    } else {
      for (const id of value.game.sourceIds) {
        if (!sourceIds.has(id)) {
          issues.push({
            path: 'game.sourceIds',
            message: `references unknown source ${id}`,
          });
        }
      }
    }
  }

  validateStatement(value.summary, 'summary', sourceIds, issues);

  if (!isRecord(value.causal)) {
    issues.push({ path: 'causal', message: 'must be an object' });
  } else {
    for (const field of CAUSAL_FIELDS) {
      validateStatement(
        value.causal[field],
        `causal.${field}`,
        sourceIds,
        issues,
      );
    }
  }

  if (!isRecord(value.discovery)) {
    issues.push({ path: 'discovery', message: 'must be an object' });
  } else {
    for (const field of [
      'behaviors',
      'genres',
      'platforms',
      'dependencies',
      'risks',
    ] as const) {
      validateStringList(value.discovery[field], `discovery.${field}`, issues);
    }
    if (
      !Array.isArray(value.discovery.systemFamilies) ||
      value.discovery.systemFamilies.length === 0 ||
      !value.discovery.systemFamilies.every((item) =>
        SYSTEM_FAMILIES.includes(item as SystemFamily),
      )
    ) {
      issues.push({
        path: 'discovery.systemFamilies',
        message: 'must contain supported system families',
      });
    }
    if (!LOOP_TIMESCALES.includes(value.discovery.timescale as LoopTimescale)) {
      issues.push({
        path: 'discovery.timescale',
        message: 'must be a supported timescale',
      });
    }
    if (!PLAY_CONTEXTS.includes(value.discovery.context as PlayContext)) {
      issues.push({
        path: 'discovery.context',
        message: 'must be a supported play context',
      });
    }
    if (
      !COMPLEXITY_LEVELS.includes(value.discovery.complexity as ComplexityLevel)
    ) {
      issues.push({
        path: 'discovery.complexity',
        message: 'must be a supported complexity level',
      });
    }
  }

  if (!Array.isArray(value.tunables) || value.tunables.length === 0) {
    issues.push({
      path: 'tunables',
      message: 'must contain at least one tuning surface',
    });
  } else {
    value.tunables.forEach((tunable, index) => {
      if (!isRecord(tunable)) {
        issues.push({
          path: `tunables[${index}]`,
          message: 'must be an object',
        });
        return;
      }
      for (const field of ['name', 'unit', 'note'] as const) {
        if (!isNonEmptyString(tunable[field])) {
          issues.push({
            path: `tunables[${index}].${field}`,
            message: 'must be a non-empty string',
          });
        }
      }
    });
  }

  if (!isRecord(value.comparison)) {
    issues.push({ path: 'comparison', message: 'must be an object' });
  } else {
    for (const dimension of COMPARISON_DIMENSIONS) {
      const comparison = value.comparison[dimension];
      const path = `comparison.${dimension}`;
      if (!isRecord(comparison)) {
        issues.push({ path, message: 'must be an object' });
        continue;
      }
      if (
        comparison.score !== 1 &&
        comparison.score !== 2 &&
        comparison.score !== 3
      ) {
        issues.push({ path: `${path}.score`, message: 'must be 1, 2, or 3' });
      }
      if (!isNonEmptyString(comparison.label)) {
        issues.push({
          path: `${path}.label`,
          message: 'must be a non-empty string',
        });
      }
      validateStatement(comparison.note, `${path}.note`, sourceIds, issues);
    }
  }

  validateStringList(value.matchTerms, 'matchTerms', issues);
  return issues;
}

export function validateMechanicCorpus(
  values: readonly unknown[],
): ValidationIssue[] {
  const issues = values.flatMap((value, index) =>
    validateMechanicCard(value).map((issue) => ({
      path: `[${index}].${issue.path}`,
      message: issue.message,
    })),
  );
  const ids = new Set<string>();

  values.forEach((value, index) => {
    if (!isRecord(value) || !isNonEmptyString(value.id)) return;
    if (ids.has(value.id)) {
      issues.push({ path: `[${index}].id`, message: `duplicates ${value.id}` });
    }
    ids.add(value.id);
  });

  return issues;
}

export function assertValidMechanicCorpus(
  values: readonly unknown[],
): asserts values is readonly MechanicImplementationCard[] {
  const issues = validateMechanicCorpus(values);
  if (issues.length > 0) {
    const detail = issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid mechanic corpus:\n${detail}`);
  }
}
