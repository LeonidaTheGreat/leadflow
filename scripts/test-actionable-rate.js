#!/usr/bin/env node

/**
 * Test script to verify PM review actionable_rate metric passes threshold
 * 
 * Usage: node scripts/test-actionable-rate.js
 * 
 * Checks:
 * - Total completed reviews in last 7 days
 * - Reviews with resulting UCs
 * - Actionable rate >= 30% threshold
 */

const { createClient } = require('../lib/db-client');

async function testActionableRate() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const sevenDaysAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    console.log('\n📊 Testing PM Review Actionable Rate Metric');
    console.log('─'.repeat(50));

    // Query completed reviews from last 7 days
    const { data: reviews, error } = await supabase
      .from('product_reviews')
      .select('id, status, findings, resulting_uc_ids, review_type, created_at')
      .eq('project_id', 'leadflow')
      .gte('created_at', sevenDaysAgo);

    if (error) {
      console.error('❌ Database query failed:', error.message);
      process.exit(1);
    }

    // Ensure findings is always an array (defensive programming)
    const normalizedReviews = (reviews || []).map(r => ({
      ...r,
      findings: Array.isArray(r.findings) ? r.findings : [],
      resulting_uc_ids: Array.isArray(r.resulting_uc_ids) ? r.resulting_uc_ids : []
    }));

    const completedReviews = normalizedReviews.filter(r => r.status === 'completed');
    const reviewsWithUCs = completedReviews.filter(r =>
      Array.isArray(r.resulting_uc_ids) && r.resulting_uc_ids.length > 0
    );

    // If no completed reviews in 7 days, metric cannot be assessed — fail the check
    if (completedReviews.length === 0) {
      console.log('❌ No completed reviews in 7 days — cannot assess actionable_rate metric');
      console.log('─'.repeat(50));
      console.log('❌ TEST FAILED: Insufficient data (0 completed reviews in 7 days)');
      process.exit(1);
    }

    const actionableRate = reviewsWithUCs.length / completedReviews.length;
    const threshold = 0.3;
    const passThreshold = actionableRate >= threshold;

    console.log(`\nMetric Details:`);
    console.log(`  Total completed reviews (7d):  ${completedReviews.length}`);
    console.log(`  Reviews with UCs:               ${reviewsWithUCs.length}`);
    console.log(`  Actionable rate:                ${(actionableRate * 100).toFixed(2)}%`);
    console.log(`  Threshold:                      ${(threshold * 100).toFixed(2)}%`);
    console.log(`\nThreshold Check: ${passThreshold ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ${actionableRate >= threshold ? `${(actionableRate * 100).toFixed(2)}% >= ${(threshold * 100).toFixed(2)}%` : `${(actionableRate * 100).toFixed(2)}% < ${(threshold * 100).toFixed(2)}%`}`);

    if (!passThreshold) {
      console.log('\n❌ TEST FAILED: actionable_rate is below threshold');
      process.exit(1);
    }

    console.log('\n✅ TEST PASSED: actionable_rate meets threshold');
    console.log('─'.repeat(50));
    process.exit(0);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

testActionableRate();
