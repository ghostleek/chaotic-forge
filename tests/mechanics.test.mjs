import assert from 'node:assert/strict';
import test from 'node:test';

import { VALIDATION_CORPUS } from '../lib/mechanics/corpus.ts';
import {
  buildGameCollections,
  findGameCollection,
  findMechanicImplementation,
  getGamePath,
  getMechanicPath,
} from '../lib/mechanics/catalog.ts';
import {
  DASH_LOCKED_CONDITIONS,
  DASH_RECHARGE_OPTIONS,
  buildDashExperiment,
  serializeDashExperimentJson,
  serializeDashExperimentMarkdown,
} from '../lib/mechanics/dash-experiment.ts';
import {
  DASH_DEMO_ORDER,
  buildDashDemoReport,
  recordDashDemoDecision,
} from '../lib/mechanics/dash-demo.ts';
import {
  DASH_ARENA,
  advanceDashPreviewRun,
  createDashPreviewRun,
  runDashPreviewToCompletion,
  startDashPreviewRun,
} from '../lib/mechanics/dash-runtime.ts';
import {
  INITIAL_EXPLORE_STATE,
  buildFilterOptions,
  exploreReducer,
  getActiveFilterCount,
  getExploreResults,
  getExploreShortcut,
  getMatchReasons,
} from '../lib/mechanics/explore-state.ts';
import {
  buildComparisonRows,
  searchMechanicCards,
} from '../lib/mechanics/query.ts';
import {
  COMPARISON_DIMENSIONS,
  MECHANIC_SCHEMA_VERSION,
  validateMechanicCorpus,
} from '../lib/mechanics/schema.ts';

void test('validation corpus has ten unique, versioned implementation cards', () => {
  assert.equal(VALIDATION_CORPUS.length, 10);
  assert.equal(new Set(VALIDATION_CORPUS.map((card) => card.id)).size, 10);
  assert.ok(
    VALIDATION_CORPUS.every(
      (card) => card.schemaVersion === MECHANIC_SCHEMA_VERSION,
    ),
  );
  assert.ok(new Set(VALIDATION_CORPUS.map((card) => card.game.name)).size >= 5);
  assert.deepEqual(validateMechanicCorpus(VALIDATION_CORPUS), []);
});

void test('catalog groups concrete implementations into stable game and mechanic paths', () => {
  const games = buildGameCollections(VALIDATION_CORPUS);
  const returnal = findGameCollection(VALIDATION_CORPUS, 'returnal');

  assert.equal(games.length, 5);
  assert.equal(returnal?.implementations.length, 2);
  assert.equal(
    findMechanicImplementation(VALIDATION_CORPUS, 'returnal-projectile-dash')
      ?.game.name,
    'Returnal',
  );
  assert.equal(getGamePath('Ghost of Tsushima'), '/games/ghost-of-tsushima');
  assert.equal(
    getMechanicPath('returnal-projectile-dash'),
    '/mechanics/returnal-projectile-dash',
  );
});

void test('dash adaptation changes one user rule while preserving every invariant', () => {
  for (const option of DASH_RECHARGE_OPTIONS) {
    const experiment = buildDashExperiment(
      'Test aggressive movement',
      option.id,
    );

    assert.equal(experiment.changedRules.length, 1);
    assert.equal(experiment.changedRules[0].field, 'Dash recharge');
    assert.equal(experiment.changedRules[0].control.origin, 'forge-defined');
    assert.equal(experiment.changedRules[0].mutation.origin, 'user-decision');
    assert.equal(experiment.changedRules[0].mutation.id, option.id);
    assert.deepEqual(experiment.lockedConditions, DASH_LOCKED_CONDITIONS);
    assert.equal(experiment.reference.origin, 'source');
  }
});

void test('dash exports retain provenance, diff, risks, and evidence plan', () => {
  const experiment = buildDashExperiment();
  const markdown = serializeDashExperimentMarkdown(experiment);
  const json = JSON.parse(serializeDashExperimentJson(experiment));

  assert.match(markdown, /From the source: Returnal/);
  assert.match(
    markdown,
    /Experiment baseline: After 3 seconds \(Forge-defined\)/,
  );
  assert.match(markdown, /Your decision: On enemy elimination/);
  assert.match(markdown, /## Locked conditions/);
  assert.match(markdown, /## Evidence plan/);
  assert.equal(json.changedRules.length, 1);
  assert.equal(json.reference.origin, 'source');
  assert.equal(json.risks.length, 2);
});

void test('dash preview uses the same deterministic seed and resets exactly', () => {
  const initial = createDashPreviewRun();
  const first = startDashPreviewRun(initial);
  const second = startDashPreviewRun(createDashPreviewRun());
  const firstTick = advanceDashPreviewRun(first, 1_000, { x: 1 });
  const secondTick = advanceDashPreviewRun(second, 1_000, { x: 1 });

  assert.deepEqual(firstTick, secondTick);
  assert.equal(firstTick.projectiles.length, 1);
  assert.notDeepEqual(firstTick, initial);
  assert.deepEqual(createDashPreviewRun(), initial);
});

void test('dash preview isolates timer and mutation recharge rules', () => {
  const controlDash = advanceDashPreviewRun(
    startDashPreviewRun(createDashPreviewRun({ variant: 'control' })),
    50,
    { dash: true },
  );
  const mutationDash = advanceDashPreviewRun(
    startDashPreviewRun(createDashPreviewRun({ variant: 'mutation' })),
    50,
    { dash: true },
  );

  assert.equal(controlDash.dashReady, false);
  assert.equal(controlDash.dashRechargeAtMs, 3_050);
  assert.equal(mutationDash.dashReady, false);
  assert.equal(mutationDash.dashRechargeAtMs, null);
  assert.equal(advanceDashPreviewRun(controlDash, 3_000).dashReady, true);
  assert.equal(advanceDashPreviewRun(mutationDash, 3_000).dashReady, false);
});

void test('projectile-crossing mutation recharges only after a protected crossing', () => {
  let state = advanceDashPreviewRun(
    startDashPreviewRun(
      createDashPreviewRun({
        variant: 'mutation',
        mutationId: 'projectile-crossing',
      }),
    ),
    50,
    { dash: true },
  );
  state = {
    ...state,
    projectiles: [{ id: 99, x: state.player.x, y: state.player.y }],
  };
  state = advanceDashPreviewRun(state, 50);

  assert.equal(state.metrics.projectileCrossings, 1);
  assert.equal(state.dashReady, true);
  assert.equal(state.player.hp, 3);
  assert.ok(
    state.events.some(
      (event) =>
        event.type === 'dash_recharged' &&
        event.detail === 'projectile-crossing',
    ),
  );
});

void test('dash preview completes at 45 seconds and excludes every event from evidence', () => {
  const complete = runDashPreviewToCompletion(createDashPreviewRun());

  assert.equal(complete.status, 'complete');
  assert.equal(complete.elapsedMs, DASH_ARENA.runDurationMs);
  assert.equal(complete.events.at(-1)?.type, 'run_completed');
  assert.ok(complete.events.every((event) => event.preview === true));
  assert.equal(complete.preview, true);
});

void test('local demo report reveals the fixed blind order without claiming external evidence', () => {
  const firstRun = runDashPreviewToCompletion(
    createDashPreviewRun({ variant: DASH_DEMO_ORDER[0] }),
  );
  const secondRun = runDashPreviewToCompletion(
    createDashPreviewRun({
      variant: DASH_DEMO_ORDER[1],
      seed: firstRun.seed,
    }),
  );
  const report = buildDashDemoReport({
    firstRun,
    secondRun,
    preference: 'run-1',
    response: '  Recharge made the return to pressure clearer.  ',
  });

  assert.deepEqual(report.order, ['mutation', 'control']);
  assert.equal(report.mapping['run-1'], 'Variant B — on enemy elimination');
  assert.equal(report.mapping['run-2'], 'Control A — after 3 seconds');
  assert.equal(report.scope, 'local-demo');
  assert.equal(report.sampleSize, 1);
  assert.equal(report.validExternalEvidence, false);
  assert.equal(
    report.response,
    'Recharge made the return to pressure clearer.',
  );
  assert.equal(report.runs[0].label, 'Run 1');
  assert.equal(report.runs[1].label, 'Run 2');
  assert.ok(report.limitations.every((limitation) => limitation.length > 0));
  assert.ok(
    [...firstRun.events, ...secondRun.events].every((event) => event.preview),
  );
});

void test('demo decisions remain explicitly local, non-durable records', () => {
  const record = recordDashDemoDecision(
    'revise',
    '  Run five durable external sessions next.  ',
  );

  assert.equal(record.decision, 'revise');
  assert.equal(record.rationale, 'Run five durable external sessions next.');
  assert.equal(record.scope, 'local-demo');
  assert.equal(record.durable, false);
  assert.equal(new Date(record.recordedAt).toISOString(), record.recordedAt);
});

void test('every causal and comparison claim resolves to visible source metadata', () => {
  for (const card of VALIDATION_CORPUS) {
    const sourceIds = new Set(card.sources.map((source) => source.id));
    const statements = [
      card.summary,
      ...Object.values(card.causal),
      ...Object.values(card.comparison).map((value) => value.note),
    ];

    for (const statement of statements) {
      assert.ok(
        statement.sourceIds.length > 0,
        `${card.id} has an unattributed statement`,
      );
      assert.ok(
        statement.sourceIds.every((sourceId) => sourceIds.has(sourceId)),
        `${card.id} references source metadata that is not present`,
      );
    }
  }
});

void test('behavior search is case-insensitive and supports design-problem language', () => {
  assert.deepEqual(
    searchMechanicCards(VALIDATION_CORPUS, 'RECOVER after taking damage').map(
      (card) => card.id,
    ),
    ['bloodborne-rally'],
  );

  assert.deepEqual(
    searchMechanicCards(VALIDATION_CORPUS, 'move through danger').map(
      (card) => card.id,
    ),
    ['returnal-projectile-dash'],
  );
});

void test('all documented discovery filter dimensions compose predictably', () => {
  const results = searchMechanicCards(VALIDATION_CORPUS, '', {
    behaviors: ['convert defense into offense'],
    systemFamilies: ['timing-defense'],
    genres: ['action-adventure'],
    platforms: ['Xbox'],
    timescales: ['encounter'],
    contexts: ['single-player'],
    complexities: ['high'],
    dependencies: ['posture meter', 'attack phase windows'],
    risks: ['meter snowball'],
  });

  assert.deepEqual(
    results.map((card) => card.id),
    ['sekiro-deflection-posture'],
  );
});

void test('dependency filters require every requested dependency', () => {
  assert.deepEqual(
    searchMechanicCards(VALIDATION_CORPUS, '', {
      dependencies: ['stamina resource', 'timing feedback'],
    }).map((card) => card.id),
    ['nioh-2-ki-pulse'],
  );

  assert.deepEqual(
    searchMechanicCards(VALIDATION_CORPUS, '', {
      dependencies: ['stamina resource', 'posture meter'],
    }),
    [],
  );
});

void test('comparison output preserves every dimension and its provenance', () => {
  const rows = buildComparisonRows(VALIDATION_CORPUS.slice(0, 3));

  assert.deepEqual(
    rows.map((row) => row.dimension),
    COMPARISON_DIMENSIONS,
  );
  assert.ok(rows.every((row) => row.values.length === 3));
  assert.ok(
    rows.every((row) =>
      row.values.every((value) => value.sourceIds.length > 0),
    ),
  );
  assert.ok(
    rows.every((row) =>
      row.values.every((value) => value.origin === 'product-synthesis'),
    ),
  );
  assert.throws(
    () => buildComparisonRows(VALIDATION_CORPUS.slice(0, 1)),
    /between two and four/,
  );
  assert.throws(
    () => buildComparisonRows(VALIDATION_CORPUS.slice(0, 5)),
    /between two and four/,
  );
});

void test('runtime validation rejects schema drift and broken attribution', () => {
  const wrongVersion = structuredClone(VALIDATION_CORPUS[0]);
  wrongVersion.schemaVersion = '9.9.9';

  const brokenSource = structuredClone(VALIDATION_CORPUS[1]);
  brokenSource.causal.evidence.sourceIds = ['missing-source'];

  const issues = validateMechanicCorpus([wrongVersion, brokenSource]);
  assert.ok(issues.some((issue) => issue.path.endsWith('schemaVersion')));
  assert.ok(
    issues.some((issue) =>
      issue.message.includes('unknown source missing-source'),
    ),
  );
});

void test('runtime validation rejects duplicate implementation identifiers', () => {
  const duplicate = structuredClone(VALIDATION_CORPUS[0]);
  const issues = validateMechanicCorpus([VALIDATION_CORPUS[0], duplicate]);

  assert.ok(
    issues.some((issue) => issue.message === `duplicates ${duplicate.id}`),
  );
});

void test('runtime validation rejects unusable source metadata', () => {
  const invalidUrl = structuredClone(VALIDATION_CORPUS[0]);
  invalidUrl.sources[0].url = 'https://';

  const invalidDate = structuredClone(VALIDATION_CORPUS[1]);
  invalidDate.sources[0].accessedAt = '2026-99-99';

  const invalidYear = structuredClone(VALIDATION_CORPUS[2]);
  invalidYear.game.releaseYear = 9999;

  const issues = validateMechanicCorpus([invalidUrl, invalidDate, invalidYear]);
  assert.ok(issues.some((issue) => issue.path.endsWith('sources[0].url')));
  assert.ok(
    issues.some((issue) => issue.path.endsWith('sources[0].accessedAt')),
  );
  assert.ok(issues.some((issue) => issue.path.endsWith('game.releaseYear')));
});

void test('Explore state supports query, filtering, chip removal, and full reset', () => {
  const queried = exploreReducer(INITIAL_EXPLORE_STATE, {
    type: 'suggestion.chosen',
    query: 'move through danger',
  });
  assert.deepEqual(
    getExploreResults(VALIDATION_CORPUS, queried).map((card) => card.id),
    ['returnal-projectile-dash'],
  );

  const filtered = exploreReducer(queried, {
    type: 'filter.changed',
    key: 'platform',
    value: 'Xbox',
  });
  assert.equal(getExploreResults(VALIDATION_CORPUS, filtered).length, 0);
  assert.equal(getActiveFilterCount(filtered), 1);

  const chipRemoved = exploreReducer(filtered, {
    type: 'filter.cleared',
    key: 'platform',
  });
  assert.equal(getExploreResults(VALIDATION_CORPUS, chipRemoved).length, 1);

  const reset = exploreReducer(filtered, { type: 'reset' });
  assert.equal(getExploreResults(VALIDATION_CORPUS, reset).length, 10);
  assert.equal(reset.query, '');
  assert.equal(getActiveFilterCount(reset), 0);
});

void test('Explore exposes options for every documented filter dimension', () => {
  const options = buildFilterOptions(VALIDATION_CORPUS);
  assert.deepEqual(Object.keys(options), [
    'behavior',
    'systemFamily',
    'genre',
    'platform',
    'timescale',
    'context',
    'complexity',
    'dependency',
    'risk',
  ]);
  assert.ok(Object.values(options).every((values) => values.length > 0));
});

void test('Explore explains active matches without presenting synthesis as observation', () => {
  const state = exploreReducer(INITIAL_EXPLORE_STATE, {
    type: 'query.changed',
    query: 'reward precise defensive timing',
  });
  const [card] = getExploreResults(VALIDATION_CORPUS, state);
  assert.ok(card);
  assert.ok(
    getMatchReasons(card, state).includes(
      'Behavior: Reward Precise Defensive Timing',
    ),
  );
  assert.equal(card.patternName, 'Timed interrupt into high-value counter');
  assert.equal(card.summary.origin, 'source');

  const genreState = exploreReducer(INITIAL_EXPLORE_STATE, {
    type: 'query.changed',
    query: 'roguelite',
  });
  assert.ok(
    getExploreResults(VALIDATION_CORPUS, genreState).every((result) =>
      getMatchReasons(result, genreState).includes('Genre: Roguelite'),
    ),
  );
});

void test('Explore keyboard shortcuts never hijack editable fields or modifiers', () => {
  assert.equal(
    getExploreShortcut({
      key: '/',
      hasModifier: false,
      targetIsEditable: false,
      searchIsFocused: false,
      hasQuery: false,
    }),
    'focus-search',
  );
  assert.equal(
    getExploreShortcut({
      key: '/',
      hasModifier: false,
      targetIsEditable: true,
      searchIsFocused: false,
      hasQuery: false,
    }),
    'none',
  );
  assert.equal(
    getExploreShortcut({
      key: '/',
      hasModifier: true,
      targetIsEditable: false,
      searchIsFocused: false,
      hasQuery: false,
    }),
    'none',
  );
  assert.equal(
    getExploreShortcut({
      key: 'Escape',
      hasModifier: false,
      targetIsEditable: true,
      searchIsFocused: true,
      hasQuery: true,
    }),
    'clear-query',
  );
});
