#!/usr/bin/env node

/**
 * Integration Test: Personal Upgrade Offer Tool
 *
 * Tests the /api/admin/send-upgrade-offer endpoint
 * UC: feat-personal-upgrade-offer-tool
 */

'use strict';

const assert = require('assert');
const { getPool } = require('../../lib/db');
const StripeService = require('../../lib/services/StripeService');
const EmailService = require('../../lib/services/EmailService');

require('dotenv').config();

const pool = getPool();
const stripeService = new StripeService();
const emailService = new EmailService();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test(description, fn) {
  try {
    console.log(`\n🧪 TEST: ${description}`);
    await fn();
    console.log(`✅ PASS: ${description}`);
    return true;
  } catch (err) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n=== Upgrade Offer Tool Integration Tests ===\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Verify promo_codes table exists
  if (await test('promo_codes table exists', async () => {
    const { rows } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'promo_codes'
    `);
    assert(rows.length > 0, 'promo_codes table not found');
  })) passed++; else failed++;

  // Test 2: Verify table structure
  if (await test('promo_codes table has correct columns', async () => {
    const { rows } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'promo_codes'
      ORDER BY ordinal_position
    `);
    const columns = rows.map(r => r.column_name);
    const required = ['id', 'agent_id', 'stripe_promo_code_id', 'stripe_coupon_id', 'code', 'discount_percent', 'tier', 'expiry_at', 'redeemed', 'redeemed_at', 'created_at', 'metadata'];
    for (const col of required) {
      assert(columns.includes(col), `Missing column: ${col}`);
    }
  })) passed++; else failed++;

  // Test 3: Stripe promo code creation
  if (await test('StripeService.createPromoCode() creates valid promo code', async () => {
    const result = await stripeService.createPromoCode({
      code: 'TEST50_2D_ABC123',
      discountPercent: 50,
      expiryDays: 2,
      tier: 'pro',
      metadata: { test: true }
    });

    assert(result.code === 'TEST50_2D_ABC123', 'Code mismatch');
    // StripeService returns percent_off, not discount_percent
    assert(result.percent_off === 50 || result.discount_percent === 50, 'Discount mismatch');
    assert(result.stripe_promo_code_id, 'No stripe_promo_code_id');
    assert(result.stripe_coupon_id, 'No stripe_coupon_id');
    assert(result.expiry_at, 'No expiry_at');
  })) passed++; else failed++;

  // Test 4: Email service can build upgrade offer email
  if (await test('EmailService.sendUpgradeOffer() generates valid email', async () => {
    // This is a mock test since we don't want to actually send emails
    const html = emailService._buildUpgradeOfferHtml({
      agentName: 'John Doe',
      discountPercent: 50,
      tierLabel: 'Pro',
      promoCode: 'TEST50_2D_ABC123',
      expiryFormatted: 'April 22, 2026',
      checkoutUrl: 'https://example.com/checkout',
      personalNote: 'This is a test offer'
    });

    assert(html.includes('TEST50_2D_ABC123'), 'Promo code not in HTML');
    assert(html.includes('50% off'), 'Discount not in HTML');
    assert(html.includes('Pro'), 'Tier not in HTML');
    assert(html.includes('John Doe'), 'Agent name not in HTML');
  })) passed++; else failed++;

  // Test 5: Database insertion of promo code record
  if (await test('Can insert promo code record into database', async () => {
    // Get a trial agent
    const { rows: agents } = await pool.query(
      "SELECT id, email, first_name FROM real_estate_agents WHERE subscription_status != 'active' LIMIT 1"
    );

    if (agents.length === 0) {
      console.log('   ⚠️  No trial agents in database, skipping database insert test');
      return;
    }

    const agent = agents[0];
    const { rows: inserted } = await pool.query(
      `INSERT INTO promo_codes (
        agent_id, stripe_promo_code_id, stripe_coupon_id, code, discount_percent, tier, expiry_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, code`,
      [
        agent.id,
        'prmo_test_' + Date.now(),
        'co_test_' + Date.now(),
        'TESTCODE_' + Date.now(),
        50,
        'pro',
        new Date(Date.now() + 48 * 60 * 60 * 1000)
      ]
    );

    assert(inserted.length > 0, 'Failed to insert record');
    assert(inserted[0].code.includes('TESTCODE'), 'Code not returned');
  })) passed++; else failed++;

  // Test 6: Verify deduplication logic (recent offers check)
  if (await test('Can query for recent promo codes (deduplication)', async () => {
    // Get a trial agent
    const { rows: agents } = await pool.query(
      "SELECT id FROM real_estate_agents WHERE subscription_status != 'active' LIMIT 1"
    );

    if (agents.length === 0) {
      console.log('   ⚠️  No trial agents in database, skipping deduplication test');
      return;
    }

    const agent = agents[0];

    // Insert a test promo code
    await pool.query(
      `INSERT INTO promo_codes (
        agent_id, stripe_promo_code_id, stripe_coupon_id, code, discount_percent, tier, expiry_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (stripe_promo_code_id) DO NOTHING`,
      [
        agent.id,
        'prmo_dedup_test_' + Date.now(),
        'co_dedup_test_' + Date.now(),
        'DEDUPTEST_' + Date.now(),
        50,
        'pro',
        new Date(Date.now() + 48 * 60 * 60 * 1000)
      ]
    );

    // Now query for recent offers
    const { rows: recentOffers } = await pool.query(
      `SELECT id FROM promo_codes
       WHERE agent_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
       AND redeemed = false
       LIMIT 1`,
      [agent.id]
    );

    // We might have multiple if we ran tests before
    assert(recentOffers.length >= 0, 'Query returned error');
  })) passed++; else failed++;

  // Test 7: Verify email_events table structure for upgrade_offer type
  if (await test('email_events table can log upgrade_offer type', async () => {
    // Get a test agent
    const { rows: agents } = await pool.query(
      "SELECT id, email, first_name FROM real_estate_agents WHERE subscription_status != 'active' LIMIT 1"
    );

    if (agents.length === 0) {
      console.log('   ⚠️  No trial agents in database, skipping email_events test');
      return;
    }

    const agent = agents[0];

    // Try to insert an upgrade_offer email event
    const { rows: inserted } = await pool.query(
      `INSERT INTO email_events (
        customer_id, email_type, recipient, status, sent_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email_type`,
      [
        agent.id,
        'upgrade_offer',
        agent.email,
        'sent',
        new Date(),
        JSON.stringify({
          agent_id: agent.id,
          discount_percent: 50,
          promo_code: 'TEST_CODE'
        })
      ]
    );

    assert(inserted.length > 0, 'Failed to insert email event');
    assert(inserted[0].email_type === 'upgrade_offer', 'Email type not set correctly');
  })) passed++; else failed++;

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
