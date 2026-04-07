#!/usr/bin/env node
/**
 * Query project_metadata from Supabase and verify dashboard header data
 */

const { createClient } = require('../../lib/db-client')
require('dotenv').config()

const db = createClient(
  process.env.NEXT_PUBLIC_API_URL,
  process.env.API_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkProjectMetadata() {
  console.log('🔍 Checking project_metadata table...\n')
  
  // Query project_metadata
  const { data: metadata, error } = await db
    .from('project_metadata')
    .select('*')
    .eq('project_id', 'bo2026')
    .single()
  
  if (error) {
    console.error('❌ Error querying project_metadata:', error.message)
    return
  }
  
  if (!metadata) {
    console.log('⚠️ No project_metadata found for bo2026')
    console.log('📝 Inserting default data...')
    
    const { error: insertError } = await db
      .from('project_metadata')
      .insert({
        project_id: 'bo2026',
        project_name: 'LeadFlow Real Estate AI',
        goal: '$20K MRR within 60 days',
        goal_value_usd: 20000,
        deadline_days: 60,
        overall_status: 'ACTIVE',
        status_color: '🟢',
        start_date: '2026-02-15'
      })
    
    if (insertError) {
      console.error('❌ Failed to insert:', insertError.message)
      return
    }
    
    console.log('✅ Default data inserted')
    return
  }
  
  console.log('✅ project_metadata found:')
  console.log(JSON.stringify(metadata, null, 2))
  
  // Calculate current day
  const startDate = new Date(metadata.start_date || '2026-02-15')
  const today = new Date()
  const dayNum = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24))
  
  console.log(`\n📅 Current day: ${dayNum} of ${metadata.deadline_days || 60}`)
  console.log(`🎯 Goal: ${metadata.goal}`)
  console.log(`📊 Status: ${metadata.status_color} ${metadata.overall_status}`)
}

checkProjectMetadata().catch(console.error)
