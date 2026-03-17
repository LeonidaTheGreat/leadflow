/**
 * Test: Pilot Engagement Metrics Component
 * FR-4: Session analytics integration in dashboard UI
 *
 * Verifies:
 * - API endpoint is accessible
 * - Data is fetched and displayed correctly
 * - Error handling works properly
 * - Data structure is correct
 */

const fetch = require('node-fetch')
const assert = require('assert')

// Test configuration
const BASE_URL = process.env.VERCEL_URL || 'http://localhost:3000'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ============================================
// TEST RUNNER
// ============================================

async function runTests() {
  console.log('\n🧪 Starting Pilot Engagement Metrics Tests (FR-4)\n')
  console.log(`Base URL: ${BASE_URL}\n`)

  let passed = 0
  let failed = 0
  let skipped = 0
  const errors = []

  const testFuncs = [
    {
      name: 'Pilot Usage API endpoint is accessible',
      async fn() {
        if (!SUPABASE_SERVICE_ROLE_KEY) {
          console.log('⚠️  SKIP: SUPABASE_SERVICE_ROLE_KEY not set')
          return 'skipped'
        }

        const response = await fetch(`${BASE_URL}/api/internal/pilot-usage`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        })

        if (response.status !== 200) {
          throw new Error(
            `Expected status 200, got ${response.status}`
          )
        }

        const data = await response.json()
        if (!data.pilots || !Array.isArray(data.pilots)) {
          throw new Error('Response missing pilots array')
        }

        if (!data.generatedAt) {
          throw new Error('Response missing generatedAt timestamp')
        }

        console.log(`  ✓ API endpoint is accessible (${data.pilots.length} pilots found)`)
      },
    },
    {
      name: 'Pilot Usage API requires authorization',
      async fn() {
        const response = await fetch(`${BASE_URL}/api/internal/pilot-usage`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.status !== 401) {
          throw new Error(
            `Expected status 401 (Unauthorized), got ${response.status}`
          )
        }

        const data = await response.json()
        if (!data.error) {
          throw new Error('API should return error message for unauthorized requests')
        }

        console.log('  ✓ API correctly requires authorization')
      },
    },
    {
      name: 'Pilot data structure is correct',
      async fn() {
        if (!SUPABASE_SERVICE_ROLE_KEY) {
          console.log('⚠️  SKIP: SUPABASE_SERVICE_ROLE_KEY not set')
          return 'skipped'
        }

        const response = await fetch(`${BASE_URL}/api/internal/pilot-usage`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        })

        const data = await response.json()
        if (data.pilots.length === 0) {
          console.log('  ⓘ No pilots in database - structure validation skipped')
          return 'skipped'
        }

        const pilot = data.pilots[0]
        const requiredFields = [
          'agentId',
          'name',
          'email',
          'planTier',
          'lastLogin',
          'sessionsLast7d',
          'topPage',
          'inactiveHours',
          'atRisk',
        ]

        for (const field of requiredFields) {
          if (!(field in pilot)) {
            throw new Error(`Missing required field: ${field}`)
          }
        }

        // Verify field types
        if (typeof pilot.agentId !== 'string') throw new Error('agentId should be string')
        if (typeof pilot.name !== 'string') throw new Error('name should be string')
        if (typeof pilot.email !== 'string') throw new Error('email should be string')
        if (typeof pilot.planTier !== 'string') throw new Error('planTier should be string')
        if (typeof pilot.sessionsLast7d !== 'number') throw new Error('sessionsLast7d should be number')
        if (typeof pilot.atRisk !== 'boolean') throw new Error('atRisk should be boolean')

        console.log('  ✓ Pilot data structure is correct')
      },
    },
    {
      name: 'Pilot risk calculation is correct',
      async fn() {
        if (!SUPABASE_SERVICE_ROLE_KEY) {
          console.log('⚠️  SKIP: SUPABASE_SERVICE_ROLE_KEY not set')
          return 'skipped'
        }

        const response = await fetch(`${BASE_URL}/api/internal/pilot-usage`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        })

        const data = await response.json()
        if (data.pilots.length === 0) {
          console.log('  ⓘ No pilots in database - risk calculation validation skipped')
          return 'skipped'
        }

        for (const pilot of data.pilots) {
          if (pilot.inactiveHours !== null && pilot.inactiveHours !== undefined) {
            const shouldBeAtRisk = pilot.inactiveHours > 72
            if (pilot.atRisk !== shouldBeAtRisk) {
              throw new Error(
                `Pilot ${pilot.email}: atRisk=${pilot.atRisk} but inactiveHours=${pilot.inactiveHours} (expected atRisk=${shouldBeAtRisk})`
              )
            }
          } else if (pilot.inactiveHours === null || pilot.inactiveHours === undefined) {
            if (pilot.atRisk !== false) {
              throw new Error(
                `Pilot ${pilot.email}: never logged in so atRisk should be false`
              )
            }
          }
        }

        console.log('  ✓ Risk calculations are correct')
      },
    },
    {
      name: 'Component integrates with analytics dashboard',
      async fn() {
        const response = await fetch(`${BASE_URL}/dashboard/analytics`, {
          method: 'GET',
          headers: { 'Content-Type': 'text/html' },
        })

        if (response.status !== 200) {
          throw new Error(`Analytics page returned status ${response.status}`)
        }

        const html = await response.text()
        if (!html || html.length === 0) {
          throw new Error('Analytics page returned empty response')
        }

        console.log('  ✓ Component integrates with analytics dashboard')
      },
    },
  ]

  for (const test of testFuncs) {
    try {
      const result = await test.fn()
      if (result === 'skipped') {
        skipped++
      } else {
        passed++
        console.log(`✅ PASS: ${test.name}`)
      }
    } catch (error) {
      failed++
      console.error(`❌ FAIL: ${test.name}`)
      console.error(`  ${error.message}`)
      errors.push({ test: test.name, error: error.message })
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 TEST SUMMARY')
  console.log(`${'='.repeat(60)}`)
  console.log(`✅ Passed:  ${passed}`)
  console.log(`❌ Failed:  ${failed}`)
  console.log(`⚠️  Skipped: ${skipped}`)
  const total = passed + failed
  if (total > 0) {
    console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`)
  }
  console.log(`${'='.repeat(60)}\n`)

  if (failed > 0) {
    console.log('Error Details:')
    for (const err of errors) {
      console.log(`  • ${err.test}: ${err.error}`)
    }
  }

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((error) => {
  console.error('Test suite error:', error)
  process.exit(1)
})
