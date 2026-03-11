#!/usr/bin/env node
/**
 * Migration: Onboarding Simulator (Aha Moment)
 * Creates onboarding_simulations table for tracking lead simulations during onboarding
 * 
 * Use Case: feat-aha-moment-lead-simulator
 * Task: 04295ed1-a43b-4469-89af-33da5d983c21
 */

const { Client } = require('pg')
const path = require('path')
const fs = require('fs')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD
const DB_REF = 'fptrokacdwzlmflyczdz'

if (!DB_PASSWORD) {
  console.error('❌ Missing SUPABASE_DB_PASSWORD')
  process.exit(1)
}

const connectionString = `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${DB_REF}.supabase.co:5432/postgres`

async function run() {
  const client = new Client({ connectionString })
  await client.connect()
  console.log('✅ Connected to Supabase DB')

  try {
    // Read and execute the SQL migration
    const sqlPath = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'supabase', 'migrations', '011_onboarding_simulator.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    await client.query(sql)
    console.log('✅ Migration 011_onboarding_simulator.sql executed successfully')

    // Verify table exists
    const { rows } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'onboarding_simulations'
      ORDER BY ordinal_position;
    `)
    
    console.log('\n📋 Table schema:')
    rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

    console.log('\n🎉 Migration complete!')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
