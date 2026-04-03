#!/usr/bin/env node

/**
 * Test script to verify actionable_rate metric is healthy
 *
 * This script checks if the PM review actionable_rate metric meets the
 * minimum threshold of 30%. The metric is calculated as:
 *   (completed reviews with resulting_uc_ids) / (total completed reviews)
 *
 * Exit codes:
 *   0 = metric passes threshold (healthy)
 *   1 = metric fails threshold (breach)
 */

const fs = require('fs');
const path = require('path');

// Import the project config loader
const { getProjectConfig } = require(path.join(__dirname, '..', 'project-config-loader.js'));

async function testActionableRate() {
  try {
    // Load project config and Supabase client
    const projectConfig = await getProjectConfig();
    const supabaseUrl = projectConfig.supabase.url;
    const supabaseKey = projectConfig.supabase.service_role_key;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration in project.config.json');
    }

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('\n📊 Testing PM Review Actionable Rate Metric');
    console.log('──────────────────────────────────────────────────\n');

    // Calculate 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Query for completed reviews from last 7 days
    const { data: reviews, error } = await supabase
      .from('product_reviews')
      .select('id, status, resulting_uc_ids')
      .eq('project_id', 'leadflow')
      .eq('status', 'completed')
      .gte('created_at', sevenDaysAgoISO);

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }

    if (!reviews || reviews.length === 0) {
      console.error('❌ No completed reviews found in the last 7 days');
      process.exit(1);
    }

    // Calculate actionable rate
    const totalCompleted = reviews.length;
    const reviewsWithUcs = reviews.filter(
      (r) => r.resulting_uc_ids && r.resulting_uc_ids.length > 0
    ).length;

    const actionableRate = reviewsWithUcs / totalCompleted;
    const threshold = 0.30; // 30%

    // Display results
    console.log('Metric Details:');
    console.log(`  Total completed reviews (7d):  ${totalCompleted}`);
    console.log(`  Reviews with UCs:               ${reviewsWithUcs}`);
    console.log(`  Actionable rate:                ${(actionableRate * 100).toFixed(2)}%`);
    console.log(`  Threshold:                      ${(threshold * 100).toFixed(2)}%\n`);

    console.log('Threshold Check:', actionableRate >= threshold ? '✅ PASS' : '❌ FAIL');
    console.log(`  ${(actionableRate * 100).toFixed(2)}% ${actionableRate >= threshold ? '>=' : '<'} ${(threshold * 100).toFixed(2)}%\n`);

    if (actionableRate >= threshold) {
      console.log('✅ TEST PASSED: actionable_rate meets threshold');
      console.log('──────────────────────────────────────────────────\n');
      process.exit(0);
    } else {
      console.error('❌ TEST FAILED: actionable_rate below threshold');
      console.log('──────────────────────────────────────────────────\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testActionableRate();
