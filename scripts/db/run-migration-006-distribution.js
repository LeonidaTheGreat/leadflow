#!/usr/bin/env node
/**
 * Migration 006: Create distribution_channels and distribution_metrics tables
 * Task: fix-distribution-loop-dedup
 * 
 * Creates tables required for distribution health checking and loop deduplication.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const pg = require('pg')

const CONNECTION_STRING = process.env.LOCAL_PG_URL
if (!CONNECTION_STRING) {
  console.error('❌ LOCAL_PG_URL not set in .env')
  process.exit(1)
}

const client = new pg.Client({ connectionString: CONNECTION_STRING })

async function runMigration() {
  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL')

    // Create distribution_channels table
    console.log('\n📋 Creating distribution_channels table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS distribution_channels (
        id            BIGSERIAL PRIMARY KEY,
        project_id    TEXT NOT NULL,
        channel_type  TEXT NOT NULL,                       -- landing_page, content, outbound, referral, paid
        name          TEXT NOT NULL,                       -- e.g. "Main landing page", "Blog", "Cold email"
        url           TEXT,
        status        TEXT NOT NULL DEFAULT 'planned',     -- planned, active, paused, deprecated
        metadata      JSONB DEFAULT '{}',
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('✅ distribution_channels table created')

    // Create index on distribution_channels
    console.log('📋 Creating index on distribution_channels...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_distribution_channels_project
        ON distribution_channels(project_id, status)
    `)
    console.log('✅ Index created')

    // Create distribution_metrics table
    console.log('\n📋 Creating distribution_metrics table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS distribution_metrics (
        id            BIGSERIAL PRIMARY KEY,
        project_id    TEXT NOT NULL,
        channel_id    BIGINT REFERENCES distribution_channels(id),
        date          DATE NOT NULL DEFAULT CURRENT_DATE,
        visitors      INTEGER NOT NULL DEFAULT 0,
        unique_visitors INTEGER NOT NULL DEFAULT 0,
        signups       INTEGER NOT NULL DEFAULT 0,
        trials        INTEGER NOT NULL DEFAULT 0,
        conversions   INTEGER NOT NULL DEFAULT 0,          -- Paid conversions
        cost_cents    INTEGER NOT NULL DEFAULT 0,          -- Spend on this channel
        metadata      JSONB DEFAULT '{}',
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(project_id, channel_id, date)
      )
    `)
    console.log('✅ distribution_metrics table created')

    // Create index on distribution_metrics
    console.log('📋 Creating index on distribution_metrics...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_distribution_metrics_project_date
        ON distribution_metrics(project_id, date DESC)
    `)
    console.log('✅ Index created')

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('distribution_channels', 'distribution_metrics')
      ORDER BY table_name
    `)

    console.log('\n✅ Migration 006 applied successfully')
    console.log(`   Tables created: ${result.rows.map(r => r.table_name).join(', ')}`)
    
    return true
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    return false
  } finally {
    await client.end()
  }
}

;(async () => {
  const success = await runMigration()
  process.exit(success ? 0 : 1)
})()
