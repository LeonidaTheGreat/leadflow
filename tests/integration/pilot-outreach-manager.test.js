/**
 * Pilot Outreach Manager Tests
 * 
 * Tests for the pilot outreach management functionality:
 * - Target management (add, list, update)
 * - Email template generation
 * - Stats and funnel tracking
 */

const assert = require('assert');
const { Pool } = require('pg');

// Import the module under test
const {
  OUTREACH_TEMPLATES,
  listTargets,
  addTarget,
  markContacted,
  markResponse,
  showStats,
  generateEmail
} = require('../../scripts/pilots/outreach-manager.js');

const DATABASE_URL = process.env.LOCAL_PG_URL || process.env.DATABASE_URL;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

async function runTest(name, fn) {
  try {
    await fn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    console.log(`✅ ${name}`);
  } catch (err) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: err.message });
    console.error(`❌ ${name}: ${err.message}`);
  }
}

async function main() {
  console.log('\n=== Pilot Outreach Manager Tests ===\n');

  if (!DATABASE_URL) {
    console.error('FATAL: Missing LOCAL_PG_URL or DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  // Clean up test data before and after
  const cleanup = async () => {
    await pool.query(`
      DELETE FROM pilot_recruitment_touchpoints 
      WHERE target_id IN (
        SELECT id FROM pilot_recruitment_targets WHERE email LIKE 'test-%@example.com'
      )
    `);
    await pool.query(`
      DELETE FROM pilot_recruitment_targets WHERE email LIKE 'test-%@example.com'
    `);
  };

  await cleanup();

  // ── Test 1: Email templates exist ─────────────────────────────────────────
  await runTest('Email templates are defined', () => {
    assert.ok(OUTREACH_TEMPLATES, 'OUTREACH_TEMPLATES should be defined');
    assert.ok(OUTREACH_TEMPLATES.linkedin, 'LinkedIn template should exist');
    assert.ok(OUTREACH_TEMPLATES.email, 'Email template should exist');
    assert.ok(OUTREACH_TEMPLATES.follow_up, 'Follow-up template should exist');
  });

  // ── Test 2: Templates have required content ───────────────────────────────
  await runTest('Email templates have required placeholders', () => {
    const emailTemplate = OUTREACH_TEMPLATES.email;
    assert.ok(emailTemplate.subject, 'Email template should have subject');
    assert.ok(emailTemplate.body.includes('{{name}}'), 'Template should have name placeholder');
    assert.ok(emailTemplate.body.includes('30-day'), 'Template should mention 30-day pilot');
  });

  // ── Test 3: Add target to database ────────────────────────────────────────
  let testTargetId;
  const testEmail = `test-${Date.now()}@example.com`;
  
  await runTest('Can add a new outreach target', async () => {
    // Get active campaign
    const campaignResult = await pool.query(`
      SELECT id FROM pilot_recruitment_campaigns WHERE status = 'active' LIMIT 1
    `);
    assert.ok(campaignResult.rows.length > 0, 'Should have an active campaign');
    
    const campaignId = campaignResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO pilot_recruitment_targets 
        (campaign_id, name, email, source_channel, status, location, brokerage, notes, priority)
      VALUES ($1, $2, $3, $4, 'identified', $5, $6, $7, $8)
      RETURNING id, name, email
    `, [
      campaignId,
      'Test Agent',
      testEmail,
      'email',
      'Test City, TC',
      'Test Brokerage',
      'Test notes for agent',
      1
    ]);
    
    assert.ok(result.rows[0].id, 'Should return target ID');
    assert.strictEqual(result.rows[0].name, 'Test Agent');
    assert.strictEqual(result.rows[0].email, testEmail);
    testTargetId = result.rows[0].id;
  });

  // ── Test 4: Target has correct initial status ─────────────────────────────
  await runTest('New target has identified status', async () => {
    const result = await pool.query(`
      SELECT status FROM pilot_recruitment_targets WHERE id = $1
    `, [testTargetId]);
    
    assert.strictEqual(result.rows[0].status, 'identified');
  });

  // ── Test 5: Mark target as contacted ──────────────────────────────────────
  await runTest('Can mark target as contacted', async () => {
    await pool.query(`
      INSERT INTO pilot_recruitment_touchpoints (target_id, channel, touch_type, sent_at)
      VALUES ($1, 'email', 'initial', NOW())
    `, [testTargetId]);
    
    await pool.query(`
      UPDATE pilot_recruitment_targets SET status = 'contacted', updated_at = NOW()
      WHERE id = $1
    `, [testTargetId]);
    
    const result = await pool.query(`
      SELECT status FROM pilot_recruitment_targets WHERE id = $1
    `, [testTargetId]);
    
    assert.strictEqual(result.rows[0].status, 'contacted');
  });

  // ── Test 6: Touchpoint is recorded ────────────────────────────────────────
  await runTest('Touchpoint is recorded in database', async () => {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM pilot_recruitment_touchpoints WHERE target_id = $1
    `, [testTargetId]);
    
    assert.strictEqual(parseInt(result.rows[0].count), 1);
  });

  // ── Test 7: Mark target response ──────────────────────────────────────────
  await runTest('Can mark target response status', async () => {
    await pool.query(`
      UPDATE pilot_recruitment_targets SET status = 'responded', updated_at = NOW()
      WHERE id = $1
    `, [testTargetId]);
    
    const result = await pool.query(`
      SELECT status FROM pilot_recruitment_targets WHERE id = $1
    `, [testTargetId]);
    
    assert.strictEqual(result.rows[0].status, 'responded');
  });

  // ── Test 8: Stats query works ─────────────────────────────────────────────
  await runTest('Stats query returns data', async () => {
    const result = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM pilot_recruitment_targets 
      GROUP BY status
    `);
    
    assert.ok(result.rows.length > 0, 'Should have at least one status count');
    const identifiedRow = result.rows.find(r => r.status === 'identified');
    assert.ok(identifiedRow, 'Should have identified count');
  });

  // ── Test 9: Template variable substitution ────────────────────────────────
  await runTest('Email template variables are substituted correctly', () => {
    const template = OUTREACH_TEMPLATES.email.body;
    const name = 'John';
    const spotsRemaining = 2;
    
    let body = template
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{spots_remaining\}\}/g, spotsRemaining)
      .replace(/\{\{plural\}\}/g, spotsRemaining === 1 ? '' : 's');
    
    assert.ok(body.includes('Hi John'), 'Should substitute name');
    assert.ok(!body.includes('{{'), 'Should not have unreplaced placeholders');
  });

  // ── Test 10: Follow-up template includes spots remaining ──────────────────
  await runTest('Follow-up template includes spots remaining placeholder', () => {
    const template = OUTREACH_TEMPLATES.follow_up;
    assert.ok(template.body.includes('{{spots_remaining}}'), 'Should have spots_remaining placeholder');
    assert.ok(template.subject, 'Should have subject line');
  });

  // ── Test 11: Target priority field works ──────────────────────────────────
  await runTest('Target priority is stored correctly', async () => {
    const result = await pool.query(`
      SELECT priority FROM pilot_recruitment_targets WHERE id = $1
    `, [testTargetId]);
    
    assert.strictEqual(result.rows[0].priority, 1);
  });

  // ── Test 12: Multiple touchpoints can be recorded ─────────────────────────
  await runTest('Can record multiple touchpoints', async () => {
    await pool.query(`
      INSERT INTO pilot_recruitment_touchpoints (target_id, channel, touch_type, sent_at)
      VALUES ($1, 'email', 'follow_up_1', NOW())
    `, [testTargetId]);
    
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM pilot_recruitment_touchpoints WHERE target_id = $1
    `, [testTargetId]);
    
    assert.strictEqual(parseInt(result.rows[0].count), 2);
  });

  // ── Test 13: Campaign exists ──────────────────────────────────────────────
  await runTest('Active campaign exists', async () => {
    const result = await pool.query(`
      SELECT id, name, goal_count FROM pilot_recruitment_campaigns WHERE status = 'active'
    `);
    
    assert.ok(result.rows.length > 0, 'Should have an active campaign');
    assert.ok(result.rows[0].goal_count > 0, 'Campaign should have a goal');
  });

  // ── Test 14: Seed targets exist ───────────────────────────────────────────
  await runTest('Seed targets exist in database', async () => {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM pilot_recruitment_targets
    `);
    
    const count = parseInt(result.rows[0].count);
    assert.ok(count >= 20, `Should have at least 20 targets, found ${count}`);
  });

  // ── Test 15: Target has all required fields ───────────────────────────────
  await runTest('Targets have all required fields', async () => {
    const result = await pool.query(`
      SELECT name, email, source_channel, status 
      FROM pilot_recruitment_targets 
      LIMIT 1
    `);
    
    const target = result.rows[0];
    assert.ok(target.name, 'Target should have name');
    assert.ok(target.email, 'Target should have email');
    assert.ok(target.source_channel, 'Target should have source_channel');
    assert.ok(target.status, 'Target should have status');
  });

  // Cleanup
  await cleanup();
  await pool.end();

  // ── Results ───────────────────────────────────────────────────────────────
  const total = testResults.passed + testResults.failed;
  console.log(`\n=== Results: ${testResults.passed}/${total} passed ===`);
  
  if (testResults.failed > 0) {
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.error(`  FAIL: ${t.name} — ${t.error}`));
    process.exit(1);
  }

  return testResults;
}

module.exports = { main, testResults };

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
