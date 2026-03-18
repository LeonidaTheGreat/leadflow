#!/usr/bin/env node
/**
 * Run migration 013: Fix satisfaction schema column mismatch
 *
 * - Adds satisfaction_ping_enabled to real_estate_agents (customer table)
 * - Fixes lead_satisfaction_events.agent_id FK to reference real_estate_agents(id)
 * - Rebuilds satisfaction_summary view to join on real_estate_agents
 *
 * Usage: node scripts/run-migration-013.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_DB_PASSWORD || !SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_DB_PASSWORD or SUPABASE_URL in .env');
  process.exit(1);
}

const match = SUPABASE_URL.match(/https:\/\/(\w+)\.supabase\.co/);
if (!match) {
  console.error('❌ Could not extract database reference from SUPABASE_URL:', SUPABASE_URL);
  process.exit(1);
}

const dbRef = match[1];
const connectionString = `postgresql://postgres:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@db.${dbRef}.supabase.co:5432/postgres`;

const migrationPath = path.join(
  __dirname,
  '../product/lead-response/dashboard/supabase/migrations/013_fix_satisfaction_schema.sql'
);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

async function runMigration() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('📋 Applying migration 013_fix_satisfaction_schema.sql...');
    await client.query(migrationSql);
    console.log('✅ Migration SQL executed\n');

    // Verify schema
    console.log('🔍 Verifying schema...');
    const checks = [
      {
        name: 'satisfaction_ping_enabled in real_estate_agents',
        query: `SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'real_estate_agents'
            AND column_name = 'satisfaction_ping_enabled'
        )`,
      },
      {
        name: 'lead_satisfaction_events FK references real_estate_agents',
        query: `SELECT EXISTS (
          SELECT 1 FROM information_schema.referential_constraints rc
          JOIN information_schema.key_column_usage kcu
            ON rc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage ccu
            ON rc.unique_constraint_name = ccu.constraint_name
          WHERE kcu.table_name = 'lead_satisfaction_events'
            AND kcu.column_name = 'agent_id'
            AND ccu.table_name = 'real_estate_agents'
        )`,
      },
      {
        name: 'satisfaction_summary view exists',
        query: `SELECT EXISTS (
          SELECT 1 FROM information_schema.views
          WHERE table_name = 'satisfaction_summary'
        )`,
      },
    ];

    let allPassed = true;
    for (const check of checks) {
      const result = await client.query(check.query);
      const exists = result.rows[0].exists;
      const icon = exists ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}`);
      if (!exists) allPassed = false;
    }

    if (allPassed) {
      console.log('\n✅ Migration 013 complete — all schema objects verified!');
      process.exit(0);
    } else {
      console.error('\n❌ Some schema checks failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
