#!/usr/bin/env node
/**
 * Migration: Lead Experience Simulator tables
 * Creates lead_simulations and demo_tokens tables
 */

const { Client } = require('pg')
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD
const DB_REF = 'fptrokacdwzlmflyczdz'

if (!DB_PASSWORD) {
  console.error('Missing SUPABASE_DB_PASSWORD')
  process.exit(1)
}

const connectionString = `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${DB_REF}.supabase.co:5432/postgres`

async function run() {
  const client = new Client({ connectionString })
  await client.connect()
  console.log('✅ Connected to Supabase DB')

  try {
    // Create lead_simulations table
    await client.query(`
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
    `)
    console.log('✅ lead_simulations table created/verified')

    // Create demo_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS demo_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_by TEXT DEFAULT 'stojan',
        label TEXT
      );
    `)
    console.log('✅ demo_tokens table created/verified')

    // Add indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_simulations_created_at ON lead_simulations(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_demo_tokens_token ON demo_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_demo_tokens_expires_at ON demo_tokens(expires_at);
    `)
    console.log('✅ Indexes created')

    console.log('\n🎉 Migration complete!')
  } finally {
    await client.end()
  }
}

run().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
