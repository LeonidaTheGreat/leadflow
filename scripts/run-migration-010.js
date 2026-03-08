#!/usr/bin/env node
/**
 * Migration 010: Lead Experience Simulator tables
 * Creates lead_simulations and demo_tokens tables
 *
 * Usage: node scripts/run-migration-010.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const SQL = `
-- Lead Simulations table (stores dry-run simulator results)
CREATE TABLE IF NOT EXISTS lead_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lead_name TEXT NOT NULL,
  lead_phone TEXT,
  property_interest TEXT,
  conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcome TEXT DEFAULT 'completed' CHECK (outcome IN ('completed', 'error')),
  triggered_by TEXT DEFAULT 'stojan'
);

-- Demo Tokens table (for share links)
CREATE TABLE IF NOT EXISTS demo_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_count INTEGER DEFAULT 0,
  created_by TEXT DEFAULT 'stojan'
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_demo_tokens_token ON demo_tokens(token);
CREATE INDEX IF NOT EXISTS idx_lead_simulations_created_at ON lead_simulations(created_at DESC);
`

async function runMigration() {
  console.log('🔄 Running migration 010 via pg...')

  const { Pool } = require('pg')
  const pool = new Pool({
    connectionString: `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.fptrokacdwzlmflyczdz.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false }
  })

  const client = await pool.connect()
  try {
    await client.query(SQL)
    console.log('✅ Migration 010 complete: lead_simulations and demo_tokens tables created')
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})
