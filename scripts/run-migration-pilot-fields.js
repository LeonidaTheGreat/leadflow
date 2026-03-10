#!/usr/bin/env node
/**
 * Migration: Add pilot onboarding fields to real_estate_agents table
 * 
 * Adds:
 * - plan_tier (text, default 'pilot')
 * - pilot_started_at (timestamptz, nullable)
 * - pilot_expires_at (timestamptz, nullable)
 */

const { Client } = require('pg');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'product/lead-response/dashboard/.env.local') });

// Also try ~/.env as fallback
try {
  require('dotenv').config({ path: path.join(require('os').homedir(), '.env') });
} catch (e) { /* ignore */ }

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !dbPassword) {
    console.error('Missing SUPABASE_URL or SUPABASE_DB_PASSWORD');
    process.exit(1);
  }

  // Extract host from supabase URL
  const refMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!refMatch) {
    console.error('Cannot parse Supabase ref from URL:', supabaseUrl);
    process.exit(1);
  }
  const ref = refMatch[1];
  const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add plan_tier column if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'real_estate_agents' AND column_name = 'plan_tier'
        ) THEN
          ALTER TABLE real_estate_agents ADD COLUMN plan_tier text DEFAULT 'pilot';
          RAISE NOTICE 'Added plan_tier column';
        ELSE
          RAISE NOTICE 'plan_tier column already exists';
        END IF;
      END $$;
    `);
    console.log('✅ plan_tier column handled');

    // Add pilot_started_at column if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'real_estate_agents' AND column_name = 'pilot_started_at'
        ) THEN
          ALTER TABLE real_estate_agents ADD COLUMN pilot_started_at timestamptz;
          RAISE NOTICE 'Added pilot_started_at column';
        ELSE
          RAISE NOTICE 'pilot_started_at column already exists';
        END IF;
      END $$;
    `);
    console.log('✅ pilot_started_at column handled');

    // Add pilot_expires_at column if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'real_estate_agents' AND column_name = 'pilot_expires_at'
        ) THEN
          ALTER TABLE real_estate_agents ADD COLUMN pilot_expires_at timestamptz;
          RAISE NOTICE 'Added pilot_expires_at column';
        ELSE
          RAISE NOTICE 'pilot_expires_at column already exists';
        END IF;
      END $$;
    `);
    console.log('✅ pilot_expires_at column handled');

    // Verify columns exist
    const { rows } = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'real_estate_agents'
        AND column_name IN ('plan_tier', 'pilot_started_at', 'pilot_expires_at')
      ORDER BY column_name;
    `);
    console.log('\nVerification — pilot columns:');
    rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (default: ${r.column_default || 'null'})`));

    if (rows.length === 3) {
      console.log('\n✅ Migration complete — all 3 pilot columns present');
    } else {
      console.error(`\n❌ Expected 3 columns, found ${rows.length}`);
      process.exit(1);
    }

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
