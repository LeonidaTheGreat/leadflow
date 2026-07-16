// E2E test: PR #1885 — mission_metrics Day 119 update
// Verifies: Trial to Paid Conversion = 0 (not NULL), Weekly New Customers exists with correct config
const assert = require('assert');
const { Client } = require('pg');

const DB_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';

async function run() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    const res = await client.query(
      `SELECT name, current_value, target, unit, direction, weight, status
       FROM mission_metrics
       WHERE project_id = 'leadflow'
         AND name IN ('Trial to Paid Conversion', 'Weekly New Customers')
       ORDER BY name`
    );

    const rows = res.rows;
    assert.strictEqual(rows.length, 2, `Expected 2 metrics, got ${rows.length}`);

    const trialConversion = rows.find(r => r.name === 'Trial to Paid Conversion');
    assert.ok(trialConversion, 'Trial to Paid Conversion metric missing');
    assert.strictEqual(Number(trialConversion.current_value), 0,
      `Trial to Paid Conversion current_value should be 0, got ${trialConversion.current_value}`);
    assert.strictEqual(trialConversion.status, 'active');

    const weeklyCustomers = rows.find(r => r.name === 'Weekly New Customers');
    assert.ok(weeklyCustomers, 'Weekly New Customers metric missing');
    assert.strictEqual(Number(weeklyCustomers.current_value), 0,
      `Weekly New Customers current_value should be 0, got ${weeklyCustomers.current_value}`);
    assert.strictEqual(Number(weeklyCustomers.target), 3,
      `Weekly New Customers target should be 3, got ${weeklyCustomers.target}`);
    assert.strictEqual(weeklyCustomers.unit, 'customers/week');
    assert.strictEqual(weeklyCustomers.direction, 'higher_is_better');
    assert.strictEqual(Number(weeklyCustomers.weight), 15);
    assert.strictEqual(weeklyCustomers.status, 'active');

    console.log('PASS: Trial to Paid Conversion current_value =', Number(trialConversion.current_value));
    console.log('PASS: Weekly New Customers target =', Number(weeklyCustomers.target), 'unit =', weeklyCustomers.unit);
    console.log('All assertions passed.');
  } finally {
    await client.end();
  }
}

run().catch(err => { console.error('FAIL:', err.message); process.exit(1); });
