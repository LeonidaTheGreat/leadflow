#!/usr/bin/env node

/**
 * Check for stuck pilots and send Telegram alerts
 * Called from heartbeat executor periodically
 *
 * A pilot is "stuck" if they've been in the same stage for >24 hours
 * and haven't moved to "paid" status yet
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const { Pool } = require('pg')

// Configuration
const DATABASE_URL = process.env.LOCAL_PG_URL || process.env.DATABASE_URL
const BOT_TOKEN = process.env.ORCHESTRATOR_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

if (!DATABASE_URL) {
  console.error('❌ LOCAL_PG_URL not configured')
  process.exit(1)
}

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn('⚠️ Telegram not configured, skipping alerts')
  process.exit(0)
}

const pool = new Pool({ connectionString: DATABASE_URL })

/**
 * Send a message via Telegram Bot API
 */
function sendTelegramMessage(text, topicId) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
      ...(topicId && { message_thread_id: topicId }),
    })

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (d) => {
        body += d
      })
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('   ✅ Stuck pilot alert sent to Telegram')
          resolve(true)
        } else {
          console.error(`   ⚠️ Telegram send failed (${res.statusCode})`)
          resolve(false)
        }
      })
    })

    req.on('error', (err) => {
      console.error(`   ⚠️ Telegram error: ${err.message}`)
      resolve(false)
    })

    req.setTimeout(5000, () => {
      req.destroy()
      resolve(false)
    })

    req.write(payload)
    req.end()
  })
}

/**
 * Check for stuck pilots and alert
 */
async function checkStuckPilots() {
  console.log('🔍 Checking for stuck pilots...')

  try {
    const result = await pool.query(`
      SELECT
        pp.id,
        pp.agent_id,
        pp.stage,
        pp.stage_entered_at,
        pp.stuck_since,
        pp.last_contact_at,
        pp.last_contact_type,
        ra.email,
        ra.first_name,
        ra.last_name,
        EXTRACT(EPOCH FROM (NOW() - pp.stage_entered_at)) / 3600 AS hours_in_stage
      FROM pilot_progress pp
      JOIN real_estate_agents ra ON pp.agent_id = ra.id
      WHERE pp.stage != 'paid'
        AND (NOW() - pp.stage_entered_at) > INTERVAL '24 hours'
        AND pp.stuck_since IS NULL
      ORDER BY pp.stage_entered_at ASC
    `)

    if (result.rows.length === 0) {
      console.log('   ✅ No stuck pilots detected')
      return
    }

    console.log(`   ⚠️ Found ${result.rows.length} stuck pilot(s)`)

    // Process each stuck pilot
    for (const pilot of result.rows) {
      const agentName = `${pilot.first_name} ${pilot.last_name}`
      const hoursStuck = Math.round(pilot.hours_in_stage)
      const dashboardUrl = 'https://stojanadmins-mac-mini.tail3ca16c.ts.net/admin/pilots'

      const lastContactInfo =
        pilot.last_contact_at && pilot.last_contact_type
          ? `${new Date(pilot.last_contact_at).toLocaleDateString()} via ${pilot.last_contact_type}`
          : 'No contact'

      const message = `⚠️ <b>Stuck Pilot Alert</b>

<b>${agentName}</b> has been in <b>'${pilot.stage}'</b> for <b>${hoursStuck}h</b>

Last contact: ${lastContactInfo}

<a href="${dashboardUrl}">View Dashboard</a>`

      await sendTelegramMessage(message)

      // Mark as alerted
      await pool.query(
        'UPDATE pilot_progress SET stuck_since = NOW() WHERE id = $1',
        [pilot.id]
      )
      console.log(`   ✓ Marked pilot ${pilot.id} as stuck`)
    }
  } catch (error) {
    console.error('❌ Error checking stuck pilots:', error)
  }
}

/**
 * Generate and send daily cohort digest
 */
async function sendCohortDigest() {
  console.log('📊 Generating daily cohort digest...')

  try {
    const result = await pool.query(`
      SELECT
        stage,
        COUNT(*) AS count,
        array_agg(CONCAT(ra.first_name, ' ', ra.last_name)) AS agents
      FROM pilot_progress pp
      JOIN real_estate_agents ra ON pp.agent_id = ra.id
      GROUP BY stage
      ORDER BY CASE stage
        WHEN 'signed_up' THEN 1
        WHEN 'email_verified' THEN 2
        WHEN 'fub_connected' THEN 3
        WHEN 'first_lead_responded' THEN 4
        WHEN 'aha_moment' THEN 5
        WHEN 'trial_started' THEN 6
        WHEN 'paid' THEN 7
      END
    `)

    const totalResult = await pool.query('SELECT COUNT(*) FROM pilot_progress')
    const totalPilots = parseInt(totalResult.rows[0].count)

    // Build stage breakdown
    const stageLines = result.rows
      .map((row) => `${row.stage}: <b>${row.count}</b>`)
      .join('\n')

    // Get stuck pilots
    const stuckResult = await pool.query(`
      SELECT CONCAT(ra.first_name, ' ', ra.last_name) AS name
      FROM pilot_progress pp
      JOIN real_estate_agents ra ON pp.agent_id = ra.id
      WHERE (NOW() - pp.stage_entered_at) > INTERVAL '24 hours'
        AND pp.stage != 'paid'
    `)
    const stuckAgents = stuckResult.rows.map((r) => `• ${r.name}`)

    // Get recent conversions (last 24h advanced to paid or trial)
    const recentResult = await pool.query(`
      SELECT CONCAT(ra.first_name, ' ', ra.last_name) AS name
      FROM pilot_progress pp
      JOIN real_estate_agents ra ON pp.agent_id = ra.id
      WHERE pp.stage IN ('trial_started', 'paid')
        AND pp.stage_entered_at > NOW() - INTERVAL '24 hours'
    `)
    const recentConversions = recentResult.rows.map((r) => `✅ ${r.name}`)

    const stuckLine = stuckAgents.length > 0 ? `\n\n⚠️ <b>Stuck (>24h):</b>\n${stuckAgents.join('\n')}` : ''
    const conversionLine =
      recentConversions.length > 0 ? `\n\n🎉 <b>Recent Conversions:</b>\n${recentConversions.join('\n')}` : ''

    const message = `📊 <b>Pilot Cohort Daily Digest</b>

<b>Total Pilots:</b> ${totalPilots}

<b>By Stage:</b>
${stageLines}${stuckLine}${conversionLine}`

    await sendTelegramMessage(message)
    console.log('   ✅ Cohort digest sent')
  } catch (error) {
    console.error('❌ Error generating digest:', error)
  }
}

/**
 * Main entry point
 */
async function main() {
  const command = process.argv[2] || 'stuck'

  try {
    if (command === 'stuck') {
      await checkStuckPilots()
    } else if (command === 'digest') {
      await sendCohortDigest()
    } else if (command === 'all') {
      await checkStuckPilots()
      await sendCohortDigest()
    } else {
      console.log('Usage: node check-stuck-pilots.js [stuck|digest|all]')
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
