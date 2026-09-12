import assert from 'node:assert/strict';
import test from 'node:test';

import { VALIDATION_CORPUS } from '../lib/mechanics/corpus.ts';
import {
  buildComparisonRows,
  searchMechanicCards,
} from '../lib/mechanics/query.ts';
import {
  COMPARISON_DIMENSIONS,
  MECHANIC_SCHEMA_VERSION,
  validateMechanicCorpus,
} from '../lib/mechanics/schema.ts';

test('validation corpus has ten unique, versioned implementation cards', () => {
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

test('every causal and comparison claim resolves to visible source metadata', () => {
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

test('behavior search is case-insensitive and supports design-problem language', () => {
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

test('all documented discovery filter dimensions compose predictably', () => {
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

test('dependency filters require every requested dependency', () => {
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

test('comparison output preserves every dimension and its provenance', () => {
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
  assert.throws(
    () => buildComparisonRows(VALIDATION_CORPUS.slice(0, 1)),
    /between two and four/,
  );
  assert.throws(
    () => buildComparisonRows(VALIDATION_CORPUS.slice(0, 5)),
    /between two and four/,
  );
});

test('runtime validation rejects schema drift and broken attribution', () => {
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

test('runtime validation rejects duplicate implementation identifiers', () => {
  const duplicate = structuredClone(VALIDATION_CORPUS[0]);
  const issues = validateMechanicCorpus([VALIDATION_CORPUS[0], duplicate]);

  assert.ok(
    issues.some((issue) => issue.message === `duplicates ${duplicate.id}`),
  );
});
