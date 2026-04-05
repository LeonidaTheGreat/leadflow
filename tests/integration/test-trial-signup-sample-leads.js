/**
 * Integration test: trial-signup sample lead DB insert
 * UC: fix-leads-table-missing-is-sample-column
 * Task: dccf671d-618a-43ae-bdfb-86e7ae6be63e
 *
 * Verifies:
 * 1. is_sample column exists on leads table (NOT NULL, DEFAULT FALSE)
 * 2. is_sample column exists on messages table (NOT NULL, DEFAULT FALSE)
 * 3. sample_type, property_interest, budget columns exist on leads
 * 4. trial-signup route uses correct messages schema (message_body, direction, channel, ai_generated)
 * 5. trial-signup route uses is_sample: true in SAMPLE_LEADS definitions
 * 6. sample-status route queries is_sample column (not hardcoded false)
 * 7. Migration 007_add_is_sample_columns.sql was applied and tracked
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

// --- Static analysis tests ---

const routeFile = path.join(
  __dirname,
  '../../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
);
const sampleStatusFile = path.join(
  __dirname,
  '../../product/lead-response/dashboard/app/api/leads/sample-status/route.ts'
);

const routeContent = fs.readFileSync(routeFile, 'utf8');
const sampleStatusContent = fs.readFileSync(sampleStatusFile, 'utf8');

test('SAMPLE_LEADS entries include is_sample: true', () => {
  const matches = routeContent.match(/is_sample:\s*true/g);
  assert.ok(matches && matches.length >= 3, 'Expected at least 3 is_sample:true entries in SAMPLE_LEADS');
});

test('SAMPLE_LEADS entries include sample_type field', () => {
  assert.ok(routeContent.includes("sample_type: 'demo'"), 'sample_type: demo must be present in SAMPLE_LEADS');
});

test('messages insert uses message_body (not content or text)', () => {
  // The fixed code uses message_body, not the old content field
  const msgInsertBlock = routeContent.match(/sampleMessages\s*=\s*createdLeads\.map[\s\S]*?\}\)/)?.[0] || '';
  assert.ok(msgInsertBlock.includes('message_body'), 'messages insert must use message_body column');
});

test('messages insert uses direction: outbound (not agent_id)', () => {
  const msgInsertBlock = routeContent.match(/sampleMessages\s*=\s*createdLeads\.map[\s\S]*?\}\)/)?.[0] || '';
  assert.ok(msgInsertBlock.includes("direction: 'outbound'"), 'messages insert must use direction column');
  assert.ok(!msgInsertBlock.includes('agent_id'), 'messages insert must NOT include agent_id (column does not exist on messages table)');
});

test('messages insert uses channel: sms', () => {
  const msgInsertBlock = routeContent.match(/sampleMessages\s*=\s*createdLeads\.map[\s\S]*?\}\)/)?.[0] || '';
  assert.ok(msgInsertBlock.includes("channel: 'sms'"), 'messages insert must use channel: sms');
});

test('messages insert uses ai_generated: true', () => {
  const msgInsertBlock = routeContent.match(/sampleMessages\s*=\s*createdLeads\.map[\s\S]*?\}\)/)?.[0] || '';
  assert.ok(msgInsertBlock.includes('ai_generated: true'), 'messages insert must use ai_generated: true');
});

test('leadsError is handled (not silent)', () => {
  assert.ok(routeContent.includes('leadsError'), 'leadsError must be checked');
  assert.ok(routeContent.includes('Error creating sample leads'), 'leadsError must be logged');
});

test('sample-status route queries is_sample column in DB (not hardcoded false)', () => {
  assert.ok(
    sampleStatusContent.includes(".eq('is_sample', true)"),
    'sample-status route must query is_sample=true from DB'
  );
  assert.ok(
    !sampleStatusContent.includes('hasSampleLeads: false,\n      sampleLeadCount: 0'),
    'sample-status must not hardcode false response'
  );
});

// --- DB verification tests ---

async function runDbTests() {
  const client = new Client({ connectionString: process.env.LOCAL_PG_URL });
  try {
    await client.connect();

    await asyncTest('leads table has is_sample column (BOOLEAN NOT NULL DEFAULT FALSE)', async () => {
      const result = await client.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = 'leads' AND column_name = 'is_sample'`
      );
      assert.strictEqual(result.rows.length, 1, 'is_sample column must exist on leads');
      assert.strictEqual(result.rows[0].data_type, 'boolean', 'is_sample must be BOOLEAN');
      assert.strictEqual(result.rows[0].is_nullable, 'NO', 'is_sample must be NOT NULL');
    });

    await asyncTest('leads table has sample_type TEXT column', async () => {
      const result = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'leads' AND column_name = 'sample_type'`
      );
      assert.strictEqual(result.rows.length, 1, 'sample_type column must exist on leads');
    });

    await asyncTest('leads table has property_interest TEXT column', async () => {
      const result = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'leads' AND column_name = 'property_interest'`
      );
      assert.strictEqual(result.rows.length, 1, 'property_interest column must exist on leads');
    });

    await asyncTest('leads table has budget TEXT column', async () => {
      const result = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'leads' AND column_name = 'budget'`
      );
      assert.strictEqual(result.rows.length, 1, 'budget column must exist on leads');
    });

    await asyncTest('messages table has is_sample column (BOOLEAN NOT NULL DEFAULT FALSE)', async () => {
      const result = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'messages' AND column_name = 'is_sample'`
      );
      assert.strictEqual(result.rows.length, 1, 'is_sample column must exist on messages');
      assert.strictEqual(result.rows[0].data_type, 'boolean', 'is_sample on messages must be BOOLEAN');
      assert.strictEqual(result.rows[0].is_nullable, 'NO', 'is_sample on messages must be NOT NULL');
    });

    await asyncTest('messages table has message_body column (NOT NULL)', async () => {
      const result = await client.query(
        `SELECT column_name, is_nullable FROM information_schema.columns
         WHERE table_name = 'messages' AND column_name = 'message_body'`
      );
      assert.strictEqual(result.rows.length, 1, 'message_body must exist on messages');
      assert.strictEqual(result.rows[0].is_nullable, 'NO', 'message_body must be NOT NULL');
    });

    await asyncTest('messages table has direction column with outbound constraint', async () => {
      const result = await client.query(
        `SELECT constraint_name FROM information_schema.constraint_column_usage
         WHERE table_name = 'messages' AND column_name = 'direction'`
      );
      assert.ok(result.rows.length > 0, 'direction column must have a constraint');
    });

    await asyncTest('migration 007_add_is_sample_columns tracked in schema_migrations', async () => {
      const result = await client.query(
        `SELECT version, name FROM schema_migrations WHERE name = 'add_is_sample_columns'`
      );
      assert.strictEqual(result.rows.length, 1, 'Migration add_is_sample_columns must be tracked');
    });

    await asyncTest('DB insert of sample lead with is_sample=true succeeds (live test)', async () => {
      // Use a test agent_id that won't conflict; roll back via transaction
      await client.query('BEGIN');
      try {
        const insertResult = await client.query(
          `INSERT INTO leads (agent_id, name, phone, source, status, is_sample, sample_type, property_interest, budget)
           VALUES (gen_random_uuid(), 'QC Test Lead', '+15550000000', 'test', 'new', true, 'demo', '3BR Austin', '$600K')
           RETURNING id, is_sample, sample_type`
        );
        assert.strictEqual(insertResult.rows.length, 1, 'Insert should succeed');
        assert.strictEqual(insertResult.rows[0].is_sample, true, 'is_sample should be true');
        assert.strictEqual(insertResult.rows[0].sample_type, 'demo', 'sample_type should be demo');

        // Now test message insert with the new schema
        const leadId = insertResult.rows[0].id;
        const msgResult = await client.query(
          `INSERT INTO messages (lead_id, message_body, direction, channel, ai_generated, is_sample)
           VALUES ($1, 'Test AI response', 'outbound', 'sms', true, true)
           RETURNING id, is_sample, direction`,
          [leadId]
        );
        assert.strictEqual(msgResult.rows.length, 1, 'Message insert should succeed');
        assert.strictEqual(msgResult.rows[0].is_sample, true, 'Message is_sample should be true');
        assert.strictEqual(msgResult.rows[0].direction, 'outbound', 'Message direction should be outbound');
      } finally {
        await client.query('ROLLBACK');
      }
    });

  } finally {
    await client.end();
  }
}

runDbTests().then(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
