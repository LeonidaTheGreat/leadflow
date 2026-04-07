#!/usr/bin/env node

/**
 * Create dashboard views required by dashboard API routes.
 *
 * Views created:
 * - dashboard_stats: single-row aggregate metrics derived from leads + messages
 * - lead_summary: per-lead summary with message/activity rollups
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
const os = require('os')

function loadEnv() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(os.homedir(), '.env')
  ]

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath, override: false })
    }
  }
}

const SQL = `
CREATE OR REPLACE VIEW dashboard_stats AS
WITH base AS (
  SELECT
    COUNT(*)::int AS total_leads,
    COUNT(*) FILTER (WHERE l.created_at >= CURRENT_DATE)::int AS new_today,
    COUNT(*) FILTER (WHERE l.status = 'qualified')::int AS qualified_leads,
    COUNT(*) FILTER (
      WHERE l.last_contact_at >= NOW() - INTERVAL '7 days'
    )::int AS active_conversations,
    COUNT(*) FILTER (WHERE l.responded_at >= CURRENT_DATE)::int AS responses_today,
    AVG(
      CASE
        WHEN l.responded_at IS NOT NULL
             AND l.created_at IS NOT NULL
             AND l.responded_at >= l.created_at
        THEN EXTRACT(EPOCH FROM (l.responded_at - l.created_at)) / 60
      END
    ) AS avg_response_time_minutes
  FROM leads l
)
SELECT
  total_leads,
  new_today,
  qualified_leads,
  active_conversations,
  responses_today,
  CASE
    WHEN total_leads > 0
    THEN ROUND((qualified_leads::numeric / total_leads::numeric) * 100, 2)
    ELSE 0::numeric
  END AS qualification_rate,
  COALESCE(ROUND(avg_response_time_minutes::numeric, 2), 0::numeric) AS avg_response_time_minutes
FROM base;

CREATE OR REPLACE VIEW lead_summary AS
SELECT
  l.id,
  l.agent_id,
  l.name,
  l.source,
  l.status,
  l.timeline,
  COALESCE(l.budget, CONCAT_WS('-', l.budget_min::text, l.budget_max::text)) AS budget,
  l.location,
  l.created_at,
  l.last_contact_at,
  l.responded_at,
  COUNT(m.id)::int AS response_count,
  MAX(m.created_at) AS last_message_at
FROM leads l
LEFT JOIN messages m ON m.lead_id = l.id
GROUP BY l.id;
`

async function main() {
  loadEnv()

  const connectionString = process.env.LOCAL_PG_URL || process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('Missing LOCAL_PG_URL or DATABASE_URL in environment')
  }

  const pool = new Pool({ connectionString, max: 1 })

  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(SQL)
      await client.query('COMMIT')
      console.log('✅ Created/updated views: dashboard_stats, lead_summary')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error('❌ Failed to create dashboard views:', error.message)
  process.exit(1)
})
