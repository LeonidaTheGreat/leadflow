#!/usr/bin/env node
/**
 * Migration: password_reset_tokens table
 * UC: fix-no-forgot-password-flow
 *
 * Creates the password_reset_tokens table and indexes.
 * Idempotent — safe to run multiple times.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const SQL = `
-- Migration: password_reset_tokens
-- Create table for storing password reset tokens (hashed)

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_agent_id ON password_reset_tokens(agent_id);
`

async function run() {
  console.log('Running password_reset_tokens migration...')

  // Use Supabase rpc to run raw SQL via the pg extension
  // Note: Supabase REST API doesn't support DDL directly; use pg via the
  // postgres PostgREST /rpc approach — or use the pg npm module if available.
  // We'll use the @supabase/supabase-js rpc with a raw SQL function if available,
  // otherwise fall back to direct pg connection.

  const pg = (() => {
    try { return require('pg') } catch { return null }
  })()

  if (pg && process.env.SUPABASE_DB_PASSWORD) {
    const ref = new URL(supabaseUrl).hostname.split('.')[0]
    const client = new pg.Client({
      host: `db.${ref}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    })
    await client.connect()
    console.log('Connected via pg (direct)')
    try {
      await client.query(SQL)
      console.log('✅ Migration complete')
    } finally {
      await client.end()
    }
    return
  }

  // Fallback: try Supabase RPC if exec_sql function exists
  const { error } = await supabase.rpc('exec_sql', { sql: SQL })
  if (error) {
    console.error('❌ Migration failed via RPC:', error.message)
    console.log('\nManual SQL to run in Supabase SQL editor:')
    console.log(SQL)
    process.exit(1)
  }
  console.log('✅ Migration complete via RPC')
}

run().catch(err => {
  console.error('❌ Migration error:', err.message)
  process.exit(1)
})
