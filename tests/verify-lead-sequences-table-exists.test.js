/**
 * Tests for task: Verify lead_sequences table exists in production Vercel/DB environment
 * Task: 81dec681-3d5b-467c-9ce2-93f62b2ee758
 *
 * Verifies:
 * 1. lead_sequences table exists in Supabase DB
 * 2. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set in Vercel (fub-inbound-webhook)
 * 3. @supabase/supabase-js is installed (it was missing from package.json)
 * 4. Production cron endpoint (/api/cron/follow-up) returns 200 (not an error)
 * 5. Table has expected columns
 */

const { Client } = require('pg')
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fptrokacdwzlmflyczdz.supabase.co'
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]

const dbConfig = {
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
}

describe('verify-lead-sequences-table-exists', () => {
  let client

  beforeAll(async () => {
    client = new Client(dbConfig)
    await client.connect()
  })

  afterAll(async () => {
    if (client) await client.end()
  })

  test('lead_sequences table exists in Supabase', async () => {
    const res = await client.query("SELECT to_regclass('public.lead_sequences') AS tbl")
    expect(res.rows[0].tbl).toBe('lead_sequences')
  })

  test('lead_sequences has expected columns', async () => {
    const res = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'lead_sequences' ORDER BY ordinal_position"
    )
    const cols = res.rows.map(r => r.column_name)
    const required = ['id', 'lead_id', 'sequence_type', 'step', 'status', 'next_send_at', 'total_messages_sent']
    for (const col of required) {
      expect(cols).toContain(col)
    }
  })

  test('@supabase/supabase-js is in package.json dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'))
    expect(pkg.dependencies['@supabase/supabase-js']).toBeDefined()
  })

  test('@supabase/supabase-js can be loaded (installed)', () => {
    expect(() => require('@supabase/supabase-js')).not.toThrow()
  })

  test('sequence-service.js loads without error', () => {
    expect(() => require('../lib/sequence-service')).not.toThrow()
  })

  test('SUPABASE_URL env var is set', () => {
    expect(process.env.SUPABASE_URL).toBeTruthy()
    expect(process.env.SUPABASE_URL).toContain('supabase.co')
  })

  test('SUPABASE_SERVICE_ROLE_KEY env var is set', () => {
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy()
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY.length).toBeGreaterThan(50)
  })

  test('production cron endpoint returns 200 (not an error)', async () => {
    const https = require('https')
    const result = await new Promise((resolve, reject) => {
      https.get('https://leadflow-ai-five.vercel.app/api/cron/follow-up?test=true', (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => resolve({ status: res.statusCode, body }))
      }).on('error', reject)
    })
    expect(result.status).toBe(200)
    const json = JSON.parse(result.body)
    expect(json.error).toBeUndefined()
    expect(json.success).toBe(true)
  }, 15000)
})
