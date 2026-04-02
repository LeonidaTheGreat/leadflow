#!/usr/bin/env node
/**
 * Test script to verify actionable_rate metric
 * Checks: (reviews with >=1 UC) / (total completed reviews) >= 30%
 */

const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(require('os').homedir(), '.env') });

const { Client } = require('pg');

async function testActionableRate() {
  const client = new Client({
    connectionString: process.env.LOCAL_PG_URL || process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Query completed reviews
    const result = await client.query(`
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

    const { total, with_ucs } = result.rows[0];
    const actionableRate = with_ucs / total;

    console.log('📊 Actionable Rate Metric');
    console.log(`   Total completed reviews: ${total}`);
    console.log(`   Reviews with UCs: ${with_ucs}`);
    console.log(`   Actionable rate: ${(actionableRate * 100).toFixed(2)}%`);
    console.log(`   Threshold: 30%`);
    
    if (actionableRate >= 0.30) {
      console.log('\n✅ PASS: actionable_rate >= 30% threshold');
      process.exit(0);
    } else {
      console.log(`\n❌ FAIL: actionable_rate ${(actionableRate * 100).toFixed(2)}% < 30% threshold`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testActionableRate();
