#!/usr/bin/env node
/**
 * provision-phone-pool.js
 *
 * Pre-purchases Twilio phone numbers and inserts them into the phone_inventory
 * table so agents are assigned from the pool during onboarding instead of
 * triggering on-demand Twilio purchases (which can fail with "no numbers available").
 *
 * Usage:
 *   node scripts/provision-phone-pool.js
 *
 * Environment variables required:
 *   TWILIO_ACCOUNT_SID  — LeadFlow's Twilio account SID
 *   TWILIO_AUTH_TOKEN   — LeadFlow's Twilio auth token
 *   LOCAL_PG_URL        — PostgreSQL connection string
 *
 * Target pool size:
 *   US_TARGET = 10 numbers
 *   CA_TARGET = 5 numbers
 *
 * Numbers already in the pool are not re-purchased (idempotent).
 * Run manually to top up the pool whenever available count drops below target.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })
require('dotenv').config({ path: require('path').join(require('os').homedir(), '.env') })

const twilio = require('twilio')
const { Pool } = require('pg')

// Pool size targets
const US_TARGET = 10
const CA_TARGET = 5

async function main() {
  // Validate required environment
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const pgUrl = process.env.LOCAL_PG_URL

  if (!accountSid || !authToken) {
    console.error('FAIL: Missing Twilio credentials.')
    if (!accountSid) console.error('  - TWILIO_ACCOUNT_SID is not set')
    if (!authToken) console.error('  - TWILIO_AUTH_TOKEN is not set')
    process.exit(1)
  }

  if (!pgUrl) {
    console.error('FAIL: LOCAL_PG_URL is not set')
    process.exit(1)
  }

  const client = twilio(accountSid, authToken)
  const pool = new Pool({ connectionString: pgUrl })

  try {
    // Count existing available numbers per country
    const countResult = await pool.query(
      `SELECT country, COUNT(*) AS cnt
       FROM phone_inventory
       WHERE status = 'available'
       GROUP BY country`
    )

    const existing = { US: 0, CA: 0 }
    for (const row of countResult.rows) {
      if (row.country in existing) {
        existing[row.country] = parseInt(row.cnt, 10)
      }
    }

    console.log(`Current pool: US=${existing.US} available, CA=${existing.CA} available`)

    const usToBuy = Math.max(0, US_TARGET - existing.US)
    const caToBuy = Math.max(0, CA_TARGET - existing.CA)

    console.log(`Need to purchase: US=${usToBuy}, CA=${caToBuy}`)

    if (usToBuy === 0 && caToBuy === 0) {
      console.log('Pool is already at target. Nothing to purchase.')
      return
    }

    let totalPurchased = 0

    // Purchase US numbers
    if (usToBuy > 0) {
      console.log(`\nSearching for ${usToBuy} US numbers...`)
      let usNumbers = []
      try {
        usNumbers = await client.availablePhoneNumbers('US')
          .local.list({ smsEnabled: true, limit: usToBuy })
      } catch (err) {
        console.error('  Twilio US search error:', err.message)
      }

      console.log(`  Found ${usNumbers.length} available US numbers`)
      for (const num of usNumbers) {
        const purchased = await purchaseAndInsert(client, pool, num, 'US')
        if (purchased) totalPurchased++
      }
    }

    // Purchase CA numbers
    if (caToBuy > 0) {
      console.log(`\nSearching for ${caToBuy} CA numbers...`)
      let caNumbers = []
      try {
        caNumbers = await client.availablePhoneNumbers('CA')
          .local.list({ smsEnabled: true, limit: caToBuy })
      } catch (err) {
        console.error('  Twilio CA search error:', err.message)
      }

      console.log(`  Found ${caNumbers.length} available CA numbers`)
      for (const num of caNumbers) {
        const purchased = await purchaseAndInsert(client, pool, num, 'CA')
        if (purchased) totalPurchased++
      }
    }

    // Final pool status
    const finalResult = await pool.query(
      `SELECT country, COUNT(*) AS cnt
       FROM phone_inventory
       WHERE status = 'available'
       GROUP BY country`
    )
    const final = { US: 0, CA: 0 }
    for (const row of finalResult.rows) {
      if (row.country in final) final[row.country] = parseInt(row.cnt, 10)
    }

    console.log(`\nDone. Purchased ${totalPurchased} numbers.`)
    console.log(`Final pool: US=${final.US} available, CA=${final.CA} available`)

  } catch (err) {
    console.error('Fatal error:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

/**
 * Purchases a single Twilio number and inserts it into phone_inventory.
 * Returns true on success, false on failure.
 */
async function purchaseAndInsert(client, pool, availableNum, country) {
  const phoneNumber = availableNum.phoneNumber
  process.stdout.write(`  Purchasing ${phoneNumber}... `)

  let provisioned
  try {
    provisioned = await client.incomingPhoneNumbers.create({
      phoneNumber,
      friendlyName: 'LeadFlow Pool',
    })
  } catch (err) {
    console.log(`FAIL (Twilio purchase): ${err.message}`)
    return false
  }

  const areaCode = phoneNumber.replace(/\D/g, '').slice(1, 4) || null

  try {
    await pool.query(
      `INSERT INTO phone_inventory (sid, e164, area_code, country, status, created_at)
       VALUES ($1, $2, $3, $4, 'available', NOW())
       ON CONFLICT (sid) DO NOTHING`,
      [provisioned.sid, provisioned.phoneNumber, areaCode, country]
    )
    console.log(`OK (SID: ${provisioned.sid})`)
    return true
  } catch (err) {
    console.log(`FAIL (DB insert): ${err.message}`)
    // Number was purchased but DB insert failed — log for manual cleanup
    console.error(`  ORPHANED TWILIO NUMBER — SID: ${provisioned.sid}, E164: ${provisioned.phoneNumber}`)
    return false
  }
}

main()
