/**
 * E2E Test: LeadSatisfactionCard no longer uses hardcoded test-agent-id
 * UC: fix-leadsatisfactioncard-uses-hardcoded-test-agent-id
 *
 * Verifies:
 * 1. dashboard/page.tsx uses LeadSatisfactionCardWrapper (not hardcoded agentId)
 * 2. LeadSatisfactionCardWrapper reads agentId from localStorage/sessionStorage
 * 3. profile/page.tsx reads agentId from localStorage (not hardcoded)
 * 4. No production component files contain "test-agent-id" as a literal value
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')

function readFile(relPath) {
  return fs.readFileSync(path.join(DASHBOARD_DIR, relPath), 'utf-8')
}

// AC-1: dashboard/page.tsx must NOT pass agentId="test-agent-id" to any component
{
  const dashboardPage = readFile('app/dashboard/page.tsx')
  assert.ok(
    !dashboardPage.includes('"test-agent-id"'),
    'FAIL AC-1: dashboard/page.tsx still contains hardcoded "test-agent-id"'
  )
  assert.ok(
    !dashboardPage.includes("'test-agent-id'"),
    'FAIL AC-1: dashboard/page.tsx still contains hardcoded test-agent-id (single quotes)'
  )
  console.log('PASS AC-1: dashboard/page.tsx has no hardcoded test-agent-id')
}

// AC-2: dashboard/page.tsx must use LeadSatisfactionCardWrapper
{
  const dashboardPage = readFile('app/dashboard/page.tsx')
  assert.ok(
    dashboardPage.includes('LeadSatisfactionCardWrapper'),
    'FAIL AC-2: dashboard/page.tsx does not use LeadSatisfactionCardWrapper'
  )
  console.log('PASS AC-2: dashboard/page.tsx uses LeadSatisfactionCardWrapper')
}

// AC-3: LeadSatisfactionCardWrapper must read agentId from localStorage/sessionStorage
{
  const wrapper = readFile('components/dashboard/LeadSatisfactionCardWrapper.tsx')
  assert.ok(
    wrapper.includes('localStorage'),
    'FAIL AC-3: LeadSatisfactionCardWrapper does not read from localStorage'
  )
  assert.ok(
    wrapper.includes('sessionStorage'),
    'FAIL AC-3: LeadSatisfactionCardWrapper does not fall back to sessionStorage'
  )
  assert.ok(
    !wrapper.includes('"test-agent-id"') && !wrapper.includes("'test-agent-id'"),
    'FAIL AC-3: LeadSatisfactionCardWrapper still has hardcoded test-agent-id'
  )
  // Must pass agentId prop to LeadSatisfactionCard
  assert.ok(
    wrapper.includes('agentId={agentId}'),
    'FAIL AC-3: LeadSatisfactionCardWrapper does not pass agentId to LeadSatisfactionCard'
  )
  console.log('PASS AC-3: LeadSatisfactionCardWrapper reads agentId from authenticated storage')
}

// AC-4: profile/page.tsx SatisfactionPingToggle must use authenticated agentId (not hardcoded)
{
  const profilePage = readFile('app/profile/page.tsx')
  assert.ok(
    !profilePage.includes('"test-agent-id"') && !profilePage.includes("'test-agent-id'"),
    'FAIL AC-4: profile/page.tsx has hardcoded test-agent-id'
  )
  // Must read from storage
  assert.ok(
    profilePage.includes('localStorage') || profilePage.includes('sessionStorage'),
    'FAIL AC-4: profile/page.tsx does not read agentId from storage'
  )
  // SatisfactionPingToggle must use the state variable, not a literal
  assert.ok(
    profilePage.includes('agentId={agentId}') || profilePage.includes('<SatisfactionPingToggle agentId={agentId}'),
    'FAIL AC-4: SatisfactionPingToggle in profile/page.tsx not receiving dynamic agentId'
  )
  console.log('PASS AC-4: profile/page.tsx uses authenticated agentId for SatisfactionPingToggle')
}

// AC-5: LeadSatisfactionCard component itself must accept agentId as a prop
{
  const card = readFile('components/dashboard/LeadSatisfactionCard.tsx')
  assert.ok(
    card.includes('agentId'),
    'FAIL AC-5: LeadSatisfactionCard does not have agentId prop'
  )
  console.log('PASS AC-5: LeadSatisfactionCard accepts agentId prop')
}

console.log('\nAll checks passed. LeadSatisfactionCard fix verified.')
