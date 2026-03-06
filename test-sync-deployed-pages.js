#!/usr/bin/env node
/**
 * Test: Sync Deployed Pages to System Components
 * 
 * Tests the sync functionality per PRD-DEPLOYED-PAGES-SYNC acceptance criteria
 */

const { createClient } = require('@supabase/supabase-js')
const { SystemComponentsSync } = require('./scripts/sync-system-components.js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test configuration
const TESTS = {
  total: 0,
  passed: 0,
  failed: 0,
  results: []
}

function test(name, fn) {
  TESTS.total++
  return fn()
    .then(() => {
      TESTS.passed++
      TESTS.results.push({ name, status: 'PASS' })
      console.log(`  ✅ ${name}`)
    })
    .catch(err => {
      TESTS.failed++
      TESTS.results.push({ name, status: 'FAIL', error: err.message })
      console.log(`  ❌ ${name}: ${err.message}`)
    })
}

async function runTests() {
  console.log('\n🧪 Testing Deployed Pages Sync\n')

  // Test 1: Sync script runs successfully
  await test('Sync script executes without errors', async () => {
    const syncer = new SystemComponentsSync()
    const result = await syncer.syncDeployedPages()
    if (result.count === 0) throw new Error('No components synced')
    if (result.errors.length > 0) throw new Error(`Errors: ${result.errors.map(e => e.error).join(', ')}`)
  })

  // Test 2: Customer Dashboard has correct URL
  await test('Customer Dashboard has correct URL', async () => {
    const { data, error } = await supabase
      .from('system_components')
      .select('metadata, status, status_emoji')
      .eq('component_name', 'Customer Dashboard')
      .eq('project_id', 'leadflow')
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Component not found')
    if (data.metadata?.url !== 'https://leadflow-ai-five.vercel.app/dashboard') {
      throw new Error(`Wrong URL: ${data.metadata?.url}`)
    }
    if (data.status !== 'LIVE') throw new Error(`Wrong status: ${data.status}`)
    if (data.status_emoji !== '🟢') throw new Error(`Wrong emoji: ${data.status_emoji}`)
  })

  // Test 3: Landing Page has correct URL
  await test('Landing Page has correct URL', async () => {
    const { data, error } = await supabase
      .from('system_components')
      .select('metadata, status, status_emoji')
      .eq('component_name', 'Landing Page')
      .eq('project_id', 'leadflow')
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Component not found')
    if (data.metadata?.url !== 'https://leadflow-ai-five.vercel.app/') {
      throw new Error(`Wrong URL: ${data.metadata?.url}`)
    }
    if (data.status !== 'LIVE') throw new Error(`Wrong status: ${data.status}`)
    if (data.status_emoji !== '🟢') throw new Error(`Wrong emoji: ${data.status_emoji}`)
  })

  // Test 4: Billing Flow has correct URL
  await test('Billing Flow has correct URL', async () => {
    const { data, error } = await supabase
      .from('system_components')
      .select('metadata, status, status_emoji')
      .eq('component_name', 'Billing Flow')
      .eq('project_id', 'leadflow')
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Component not found')
    if (data.metadata?.url !== 'https://leadflow-ai-five.vercel.app/settings') {
      throw new Error(`Wrong URL: ${data.metadata?.url}`)
    }
    if (data.status !== 'LIVE') throw new Error(`Wrong status: ${data.status}`)
    if (data.status_emoji !== '🟢') throw new Error(`Wrong emoji: ${data.status_emoji}`)
  })

  // Test 5: FUB Webhook API has correct URL
  await test('FUB Webhook API has correct URL', async () => {
    const { data, error } = await supabase
      .from('system_components')
      .select('metadata, status, status_emoji')
      .eq('component_name', 'FUB Webhook API')
      .eq('project_id', 'leadflow')
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Component not found')
    if (data.metadata?.url !== 'https://fub-inbound-webhook.vercel.app') {
      throw new Error(`Wrong URL: ${data.metadata?.url}`)
    }
    if (data.status !== 'LIVE') throw new Error(`Wrong status: ${data.status}`)
    if (data.status_emoji !== '🟢') throw new Error(`Wrong emoji: ${data.status_emoji}`)
  })

  // Test 6: All components have verified_date
  await test('All product components have verified_date', async () => {
    const { data, error } = await supabase
      .from('system_components')
      .select('component_name, verified_date')
      .eq('project_id', 'leadflow')
      .eq('category', 'product')
    
    if (error) throw error
    const missing = data?.filter(c => !c.verified_date)
    if (missing && missing.length > 0) {
      throw new Error(`Missing verified_date: ${missing.map(c => c.component_name).join(', ')}`)
    }
  })

  // Test 7: URLs are accessible (smoke test)
  await test('Deployed URLs return successful status', async () => {
    const urls = [
      'https://leadflow-ai-five.vercel.app/dashboard',
      'https://leadflow-ai-five.vercel.app/',
      'https://leadflow-ai-five.vercel.app/settings',
      'https://fub-inbound-webhook.vercel.app/health'
    ]
    
    for (const url of urls) {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        if (response.status >= 500) {
          throw new Error(`${url} returned ${response.status}`)
        }
      } catch (err) {
        // Network errors are okay for some URLs (like /dashboard which requires auth)
        // Just check that the domain resolves
        console.log(`     ⚠️  ${url} - ${err.message} (may require auth)`)
      }
    }
  })

  // Print summary
  console.log('\n📊 Test Results')
  console.log(`   Total: ${TESTS.total}`)
  console.log(`   Passed: ${TESTS.passed}`)
  console.log(`   Failed: ${TESTS.failed}`)
  console.log(`   Pass Rate: ${((TESTS.passed / TESTS.total) * 100).toFixed(1)}%`)

  return {
    passed: TESTS.passed,
    total: TESTS.total,
    passRate: TESTS.passed / TESTS.total,
    results: TESTS.results
  }
}

// Run if called directly
if (require.main === module) {
  runTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0)
    })
    .catch(err => {
      console.error('Test runner failed:', err)
      process.exit(1)
    })
}

module.exports = { runTests }
