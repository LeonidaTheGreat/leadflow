'use strict';

const assert = require('assert');
const {
  cleanupTestData,
} = require('../../scripts/db/cleanup-test-data');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

class FakeClient {
  constructor() {
    this.calls = [];
  }

  async query(sql, params) {
    const normalizedSql = String(sql).replace(/\s+/g, ' ').trim();
    this.calls.push({ sql: normalizedSql, params });

    if (normalizedSql === 'BEGIN' || normalizedSql === 'ROLLBACK' || normalizedSql === 'COMMIT') {
      return { rows: [], rowCount: null };
    }

    if (normalizedSql.includes('SELECT id, email FROM real_estate_agents')) {
      return { rows: [] };
    }

    if (
      normalizedSql.includes('SELECT count(*) FROM agent_survey_schedule') &&
      normalizedSql.includes('NOT EXISTS')
    ) {
      return { rows: [{ count: '341' }] };
    }

    if (
      normalizedSql.includes('DELETE FROM agent_survey_schedule') &&
      normalizedSql.includes('NOT EXISTS')
    ) {
      return { rowCount: 341, rows: [] };
    }

    throw new Error(`Unexpected query: ${normalizedSql}`);
  }
}

async function run() {
  console.log('\n=== cleanup-test-data orphan cleanup tests ===\n');

  await test('dry run still checks orphan rows when no test agents exist', async () => {
    const client = new FakeClient();
    const logs = [];

    await cleanupTestData({
      client,
      dryRun: true,
      log: (line) => logs.push(line),
    });

    const hasOrphanCountQuery = client.calls.some((c) =>
      c.sql.includes('SELECT count(*) FROM agent_survey_schedule') && c.sql.includes('NOT EXISTS')
    );
    assert.ok(hasOrphanCountQuery, 'Expected orphan count query in dry run');

    const loggedOrphanDeletion = logs.some((line) =>
      line.includes('Would delete 341 orphan rows from agent_survey_schedule')
    );
    assert.ok(loggedOrphanDeletion, 'Expected dry-run orphan deletion log');
  });

  await test('apply mode deletes orphan rows when no test agents exist', async () => {
    const client = new FakeClient();
    const logs = [];

    await cleanupTestData({
      client,
      dryRun: false,
      log: (line) => logs.push(line),
    });

    const hasDeleteQuery = client.calls.some((c) =>
      c.sql.includes('DELETE FROM agent_survey_schedule') && c.sql.includes('NOT EXISTS')
    );
    assert.ok(hasDeleteQuery, 'Expected orphan delete query in apply mode');

    const loggedDeletion = logs.some((line) =>
      line.includes('Deleted 341 orphan rows from agent_survey_schedule')
    );
    assert.ok(loggedDeletion, 'Expected apply orphan deletion log');
  });

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
