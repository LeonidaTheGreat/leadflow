/**
 * E2E Test for feat-start-free-trial-cta
 * Tests the /api/auth/trial-signup endpoint
 * 
 * Acceptance Criteria:
 * - AC-2: Frictionless signup with email + password only
 * - AC-3: Trial account state (plan_tier='trial', trial_ends_at=30 days)
 * - AC-6: Source attribution (source='trial_cta')
 * - AC-7: Error handling (duplicate email, invalid email, etc.)
 */

import { createClient } from '@supabase/supabase-js'
import assert from 'assert'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const API_URL = process.env.API_URL || 'http://localhost:3000'

// Test helpers
async function cleanupTestUser(email: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: user } = await supabase
    .from('real_estate_agents')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()
  
  if (user?.id) {
    await supabase.from('agent_settings').delete().eq('agent_id', user.id)
    await supabase.from('real_estate_agents').delete().eq('id', user.id)
  }
}

async function fetchTrialSignup(body: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/api/auth/trial-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response
}

// Tests
async function runTests() {
  console.log('\n🧪 E2E Test: feat-start-free-trial-cta')
  console.log('=====================================\n')

  const results = { passed: 0, failed: 0, total: 0 }
  const testEmail = `trial-test-${Date.now()}@example.com`

  // Test 1: Successful trial signup with minimal fields (AC-2)
  async function testMinimalSignup() {
    console.log('Test 1: Successful trial signup with email + password only')
    results.total++
    
    try {
      const response = await fetchTrialSignup({
        email: testEmail,
        password: 'SecurePass123!'
      })

      assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`)
      
      const data = await response.json()
      assert.strictEqual(data.success, true, 'Response should have success=true')
      assert.ok(data.agentId, 'Response should have agentId')
      assert.strictEqual(data.redirectTo, '/dashboard/onboarding', 'Should redirect to onboarding')
      
      // Verify cookie was set
      const setCookie = response.headers.get('set-cookie')
      assert.ok(setCookie?.includes('auth-token'), 'Should set auth-token cookie')
      
      console.log('  ✅ PASS: Trial signup with minimal fields works')
      results.passed++
    } catch (err: any) {
      console.log(`  ❌ FAIL: ${err.message}`)
      results.failed++
    }
  }

  // Test 2: Verify trial account state in database (AC-3)
  async function testTrialAccountState() {
    console.log('Test 2: Trial account state in database')
    results.total++
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.log('  ⏭️  SKIP: No Supabase credentials')
      return
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
      const { data: agent, error } = await supabase
        .from('real_estate_agents')
        .select('plan_tier, trial_ends_at, source, mrr, email_verified')
        .eq('email', testEmail.toLowerCase())
        .single()

      if (error) throw new Error(`DB error: ${error.message}`)
      if (!agent) throw new Error('Agent not found in database')

      // AC-3: plan_tier should be 'trial'
      assert.strictEqual(agent.plan_tier, 'trial', 'plan_tier should be trial')
      
      // AC-3: trial_ends_at should be ~30 days from now
      const trialEnd = new Date(agent.trial_ends_at!)
      const now = new Date()
      const daysDiff = Math.round((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      assert.ok(daysDiff >= 29 && daysDiff <= 30, `trial_ends_at should be ~30 days from now, got ${daysDiff} days`)
      
      // AC-3: mrr should be 0
      assert.strictEqual(agent.mrr, 0, 'mrr should be 0 for trial')
      
      // AC-6: source should be 'trial_cta'
      assert.strictEqual(agent.source, 'trial_cta', 'source should be trial_cta')
      
      // Email should be verified (no gate per PRD)
      assert.strictEqual(agent.email_verified, true, 'email_verified should be true')
      
      console.log('  ✅ PASS: Trial account state is correct')
      results.passed++
    } catch (err: any) {
      console.log(`  ❌ FAIL: ${err.message}`)
      results.failed++
    }
  }

  // Test 3: Signup with UTM parameters (AC-6)
  async function testUtmCapture() {
    console.log('Test 3: UTM parameter capture')
    results.total++
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.log('  ⏭️  SKIP: No Supabase credentials')
      return
    }

    const utmEmail = `utm-test-${Date.now()}@example.com`
    
    try {
      const response = await fetchTrialSignup({
        email: utmEmail,
        password: 'SecurePass123!',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'pilot-launch'
      })

      assert.strictEqual(response.status, 200)
      
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
      const { data: agent, error } = await supabase
        .from('real_estate_agents')
        .select('utm_source, utm_medium, utm_campaign')
        .eq('email', utmEmail.toLowerCase())
        .single()

      if (error) throw new Error(`DB error: ${error.message}`)
      
      assert.strictEqual(agent?.utm_source, 'google', 'utm_source should be google')
      assert.strictEqual(agent?.utm_medium, 'cpc', 'utm_medium should be cpc')
      assert.strictEqual(agent?.utm_campaign, 'pilot-launch', 'utm_campaign should be pilot-launch')
      
      // Cleanup
      await cleanupTestUser(utmEmail)
      
      console.log('  ✅ PASS: UTM parameters captured correctly')
      results.passed++
    } catch (err: any) {
      console.log(`  ❌ FAIL: ${err.message}`)
      results.failed++
    }
  }

  // Test 4: Duplicate email returns 409 (AC-7)
  async function testDuplicateEmail() {
    console.log('Test 4: Duplicate email error handling')
    results.total++
    
    try {
      const response = await fetchTrialSignup({
        email: testEmail, // Same email from test 1
        password: 'AnotherPass123!'
      })

      assert.strictEqual(response.status, 409, `Expected 409, got ${response.status}`)
      
      const data = await response.json()
      assert.ok(data.error.includes('already exists'), 'Error should mention email already exists')
      assert.ok(data.error.includes('Sign in instead'), 'Error should suggest signing in')
      
      console.log('  ✅ PASS: Duplicate email returns 409 with helpful message')
      results.passed++
    } catch (err: any) {
      console.log(`  ❌ FAIL: ${err.message}`)
      results.failed++
    }
  }

  // Test 5: Invalid email validation (AC-7)
  async function testInvalidEmail() {
    console.log('Test 5: Invalid email validation')
    results.total++
    
    try {
      const response = await fetchTrialSignup({
        email: 'not-an-email',
        password: 'SecurePass123!'
      })

      assert.strictEqual(response.status, 400, `Expected 400, got ${response.status}`)
      
      const data = await response.json()
      assert.ok(data.error.includes('valid email'), 'Error should mention valid email')
      
      console.log('  ✅ PASS: Invalid email returns 400')
      results.passed++
    } catch (err: any) {
      console.log(`  ❌ FAIL: ${err.message}`)
      results.failed++
    }
  }

  // Test 6: Short password validation (AC-7)
  async function testShortPassword() {
    console.log('Test 6: Short password validation')
    results.total++
    
    try {
      const response = await fetchTrialSignup({
        email: 'test@example.com',
        password: 'short' // Less than 8 chars
      })

      assert.strictEqual(response.status, 400, `Expected 400, got ${response.status}`)
      
      const data = await response.json()
      assert.ok(data.error.includes('8 characters'), 'Error should mention 8 characters')
      
      console.log('  ✅ PASS: Short password returns 400')
      results.passed++
    } catch (err: any) {
      console.log(`  ❌ FAIL: ${err.message}`)
      results.failed++
    }
  }

  // Test 7: Missing required fields (AC-7)
  async function testMissingFields() {
    console.log('Test 7: Missing required fields validation')
    results.total++
    
    try {
      const response = await fetchTrialSignup({
        email: '',
        password: ''
      })

      assert.strictEqual(response.status, 400, `Expected 400, got ${response.status}`)
      
      const data = await response.json()
      assert.ok(data.error, 'Should have error message')
      
      console.log('  ✅ PASS: Missing fields returns 400')
      results.passed++
    } catch (err: any) {
      console.log(`  ❌ FAIL: ${err.message}`)
      results.failed++
    }
  }

  // Test 8: Signup with optional name field
  async function testSignupWithName() {
    console.log('Test 8: Signup with optional name field')
    results.total++
    
    const nameEmail = `name-test-${Date.now()}@example.com`
    
    try {
      const response = await fetchTrialSignup({
        email: nameEmail,
        password: 'SecurePass123!',
        name: 'John Smith'
      })

      assert.strictEqual(response.status, 200)
      
      if (SUPABASE_URL && SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
        const { data: agent } = await supabase
          .from('real_estate_agents')
          .select('first_name, last_name')
          .eq('email', nameEmail.toLowerCase())
          .single()
        
        assert.strictEqual(agent?.first_name, 'John', 'first_name should be John')
        assert.strictEqual(agent?.last_name, 'Smith', 'last_name should be Smith')
        
        // Cleanup
        await cleanupTestUser(nameEmail)
      }
      
      console.log('  ✅ PASS: Signup with name works correctly')
      results.passed++
    } catch (err: any) {
      console.log(`  ❌ FAIL: ${err.message}`)
      results.failed++
    }
  }

  // Run all tests
  await testMinimalSignup()
  await testTrialAccountState()
  await testUtmCapture()
  await testDuplicateEmail()
  await testInvalidEmail()
  await testShortPassword()
  await testMissingFields()
  await testSignupWithName()

  // Cleanup
  await cleanupTestUser(testEmail)

  // Summary
  console.log('\n📊 Test Results')
  console.log('===============')
  console.log(`Passed: ${results.passed}/${results.total}`)
  console.log(`Failed: ${results.failed}/${results.total}`)
  
  if (results.failed > 0) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
