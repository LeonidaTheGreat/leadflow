#!/usr/bin/env node
/**
 * Ensure actionable_rate metric health
 * 
 * This script:
 * 1. Verifies all product_reviews have findings as JSON array (not string)
 * 2. Checks reviews have proper resulting_uc_ids assignments
 * 3. Reports actionable_rate metric
 */

const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(require('os').homedir(), '.env') });

const { Client } = require('pg');

async function ensureActionableRateHealth() {
  const client = new Client({
    connectionString: process.env.LOCAL_PG_URL || process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Step 1: Check findings data types
    console.log('📋 Step 1: Checking findings data types...');
    const findingsCheck = await client.query(`
      SELECT 
        id,
        status,
        findings,
        pg_typeof(findings) as findings_type
      FROM product_reviews 
      WHERE project_id = 'leadflow' 
      AND findings IS NOT NULL
      LIMIT 5
    `);
    
    let findingsIssues = 0;
    for (const row of findingsCheck.rows) {
      const findingsType = row.findings_type;
      if (findingsType !== 'json' && findingsType !== 'jsonb') {
        console.log(`   ⚠️  Review ${row.id}: findings is ${findingsType} (expected jsonb)`);
        findingsIssues++;
      }
    }
    
    if (findingsIssues === 0) {
      console.log('   ✅ All findings are properly typed as JSON\n');
    } else {
      console.log(`   ⚠️  Found ${findingsIssues} findings type issues\n`);
    }

    // Step 2: Check for reviews with actionable findings
    console.log('📋 Step 2: Checking actionable findings distribution...');
    const actionableCheck = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(resulting_uc_ids) FILTER (
          WHERE resulting_uc_ids IS NOT NULL 
          AND array_length(resulting_uc_ids, 1) > 0
        ) as with_ucs
      FROM product_reviews 
      WHERE project_id = 'leadflow'
      GROUP BY status
      ORDER BY status
    `);
    
    for (const row of actionableCheck.rows) {
      const rate = row.count > 0 ? ((row.with_ucs / row.count) * 100).toFixed(2) : '0.00';
      console.log(`   ${row.status}: ${row.with_ucs}/${row.count} (${rate}%)`);
    }
    console.log('');

    // Step 3: Calculate overall actionable_rate
    console.log('📊 Step 3: Calculating actionable_rate metric...');
    const metricResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(resulting_uc_ids) FILTER (
          WHERE resulting_uc_ids IS NOT NULL 
          AND array_length(resulting_uc_ids, 1) > 0
        ) as with_ucs
      FROM product_reviews 
      WHERE project_id = 'leadflow' 
      AND status = 'completed'
    `);

    const { total, with_ucs } = metricResult.rows[0];
    const actionableRate = total > 0 ? with_ucs / total : 0;
    const threshold = 0.30;

    console.log(`   Total completed reviews: ${total}`);
    console.log(`   Reviews with UCs: ${with_ucs}`);
    console.log(`   Actionable rate: ${(actionableRate * 100).toFixed(2)}%`);
    console.log(`   Threshold: ${(threshold * 100).toFixed(2)}%`);
    
    if (actionableRate >= threshold) {
      console.log(`   ✅ PASS: actionable_rate >= ${(threshold * 100).toFixed(2)}%\n`);
    } else {
      console.log(`   ⚠️  WARNING: actionable_rate ${(actionableRate * 100).toFixed(2)}% < ${(threshold * 100).toFixed(2)}% threshold\n`);
    }

    // Step 4: Sample findings structure to verify correctness
    console.log('📋 Step 4: Sampling findings structures (completed reviews with UCs)...');
    const sampleResult = await client.query(`
      SELECT 
        id,
        COALESCE(jsonb_array_length(findings), 0) as finding_count,
        findings
      FROM product_reviews 
      WHERE project_id = 'leadflow' 
      AND status = 'completed'
      AND resulting_uc_ids IS NOT NULL 
      AND array_length(resulting_uc_ids, 1) > 0
      LIMIT 2
    `);

    for (const row of sampleResult.rows) {
      console.log(`   Review ${row.id}: ${row.finding_count} findings`);
      if (row.findings && typeof row.findings === 'object') {
        if (Array.isArray(row.findings)) {
          console.log(`      ✅ findings is array`);
        } else {
          console.log(`      ⚠️  findings is object (not array)`);
        }
      }
    }
    console.log('');

    // Final verdict
    console.log('✅ Actionable rate health check complete');
    if (actionableRate >= threshold) {
      console.log('✅ Metric HEALTHY: actionable_rate breach is CLEARED');
      process.exit(0);
    } else {
      console.log('⚠️  Metric UNHEALTHY: actionable_rate below threshold');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

ensureActionableRateHealth();
