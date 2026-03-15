/**
 * E2E Tests for feat-admin-pilot-invite-flow
 * Tests the complete admin pilot invite flow including:
 * - API endpoint protection
 * - Invite creation and persistence
 * - Email sending
 * - Magic link acceptance
 * - Agent activation
 */

const fetch = require('node-fetch')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'test-admin-secret-123'

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

let testsPassed = 0
let testsFailed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`${colors.green}✓${colors.reset} ${name}`)
    testsPassed++
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`)
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`)
    testsFailed++
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`)
  }
}

async function postInvite(email, name, message = null, adminToken = ADMIN_SECRET) {
  const response = await fetch(`${BASE_URL}/api/admin/invite-pilot`, {
    method: 'POST',
    headers: {
      'x-admin-token': adminToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      name,
      message
    })
  })

  const data = await response.json()
  return { status: response.status, data }
}

async function getInvites(adminToken = ADMIN_SECRET) {
  const response = await fetch(`${BASE_URL}/api/admin/invite-pilot?action=list`, {
    method: 'GET',
    headers: {
      'x-admin-token': adminToken,
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()
  return { status: response.status, data }
}

async function acceptInvite(token) {
  const response = await fetch(`${BASE_URL}/api/auth/accept-invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  })

  const data = await response.json()
  return { status: response.status, data }
}

async function runTests() {
  console.log(`${colors.blue}Starting feat-admin-pilot-invite-flow E2E tests...${colors.reset}\n`)

  // AC-1: Admin auth check
  console.log('--- AC-1: Endpoint Auth Protection ---')
  
  await test('Reject request without admin token', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/invite-pilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User'
      })
    })
    assertEquals(response.status, 401, 'Should return 401 without token')
  })

  await test('Reject request with invalid admin token', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/invite-pilot`, {
      method: 'POST',
      headers: {
        'x-admin-token': 'invalid-token-xyz',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User'
      })
    })
    assertEquals(response.status, 401, 'Should return 401 with invalid token')
  })

  // AC-2: Input validation
  console.log('\n--- AC-2: Input Validation ---')
  
  await test('Reject missing email', async () => {
    const { status, data } = await postInvite(null, 'Test User')
    assertEquals(status, 400, 'Should reject missing email')
    assert(data.error, 'Should include error message')
  })

  await test('Reject missing name', async () => {
    const { status, data } = await postInvite('test@example.com', null)
    assertEquals(status, 400, 'Should reject missing name')
    assert(data.error, 'Should include error message')
  })

  await test('Reject invalid email format', async () => {
    const { status, data } = await postInvite('not-an-email', 'Test User')
    assertEquals(status, 400, 'Should reject invalid email')
  })

  // AC-3: Successful invite creation
  console.log('\n--- AC-3: Successful Invite Creation ---')
  
  const testEmail = `invite-${uuidv4()}@test.local`
  const testName = 'Jane Smith'
  const testMessage = 'Great fit for your team'
  
  let inviteUrl, inviteToken, agentId

  await test('Create pilot invite successfully', async () => {
    const { status, data } = await postInvite(testEmail, testName, testMessage)
    assertEquals(status, 200, 'Should return 200')
    assert(data.success, 'Should have success flag')
    assert(data.inviteUrl, 'Should include invite URL')
    assert(data.agentId, 'Should include agent ID')
    assert(data.expiresAt, 'Should include expiration')
    
    inviteUrl = data.inviteUrl
    agentId = data.agentId
    
    // Extract token from URL
    const match = inviteUrl.match(/token=([^&]+)/)
    inviteToken = match ? match[1] : null
    assert(inviteToken, 'Should extract token from URL')
  })

  await test('Invite URL includes token parameter', async () => {
    assert(inviteUrl.includes('accept-invite'), 'Should point to /accept-invite')
    assert(inviteUrl.includes('token='), 'Should include token param')
  })

  await test('Invitation expires in 7 days', async () => {
    const now = new Date()
    const expiresAt = new Date(inviteUrl.match(/expiresAt=([^&]+)/) ? JSON.parse(decodeURIComponent(inviteUrl.match(/expiresAt=([^&]+)/)[1])) : 0)
    
    // Check that expiration is approximately 7 days from now
    const expectedExpiration = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const diffInHours = Math.abs(expectedExpiration - expiresAt) / (1000 * 60 * 60)
    assert(diffInHours < 1, `Expiration should be ~7 days, got ${diffInHours} hours difference`)
  })

  // AC-4: Prevent duplicate pending invites
  console.log('\n--- AC-4: Duplicate Invite Handling ---')
  
  await test('Return existing invite if already pending', async () => {
    const { status, data } = await postInvite(testEmail, testName, 'Another message')
    assertEquals(status, 200, 'Should return 200')
    assert(data.success, 'Should succeed')
    assertEquals(data.inviteUrl, inviteUrl, 'Should return same URL')
  })

  // AC-5: List invites
  console.log('\n--- AC-5: Invite Listing ---')
  
  await test('List invites requires auth', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/invite-pilot?action=list`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    assertEquals(response.status, 401, 'Should require auth for listing')
  })

  await test('List all invites successfully', async () => {
    const { status, data } = await getInvites()
    assertEquals(status, 200, 'Should return 200')
    assert(Array.isArray(data.invites), 'Should return array of invites')
    
    const createdInvite = data.invites.find(inv => inv.email === testEmail)
    assert(createdInvite, 'Should include created invite')
    assertEquals(createdInvite.name, testName, 'Should have correct name')
    assertEquals(createdInvite.message, testMessage, 'Should have correct message')
    assertEquals(createdInvite.status, 'pending', 'Should be pending')
    assertEquals(createdInvite.agent_id, agentId, 'Should have agent ID')
  })

  // AC-6: Accept invite
  console.log('\n--- AC-6: Accept Invite ---')
  
  let acceptedData

  await test('Accept invite with valid token', async () => {
    const { status, data } = await acceptInvite(inviteToken)
    assertEquals(status, 200, 'Should return 200')
    assert(data.success, 'Should have success flag')
    assertEquals(data.agentId, agentId, 'Should return agent ID')
    acceptedData = data
  })

  await test('Reject accept if token is missing', async () => {
    const { status } = await acceptInvite(null)
    assertEquals(status, 400, 'Should return 400 for missing token')
  })

  await test('Reject accept if token is invalid', async () => {
    const { status } = await acceptInvite(uuidv4())
    assertEquals(status, 404, 'Should return 404 for invalid token')
  })

  await test('Reject if invite already accepted', async () => {
    const { status, data } = await acceptInvite(inviteToken)
    assertEquals(status, 409, 'Should return 409 if already accepted')
    assert(data.error, 'Should include error message')
  })

  // AC-7: Verify invite status update
  console.log('\n--- AC-7: Invite Status Updates ---')
  
  await test('Invite status updated to accepted', async () => {
    const { status, data } = await getInvites()
    const updatedInvite = data.invites.find(inv => inv.email === testEmail)
    assertEquals(updatedInvite.status, 'accepted', 'Should be marked as accepted')
    assert(updatedInvite.accepted_at, 'Should have accepted_at timestamp')
  })

  // Summary
  console.log(`\n${colors.blue}Test Summary${colors.reset}`)
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`)
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`)

  if (testsFailed > 0) {
    process.exit(1)
  }
}

// Run all tests
runTests().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err)
  process.exit(1)
})
