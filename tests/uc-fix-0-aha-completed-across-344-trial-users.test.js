/**
 * E2E/static verification for fix-0-aha-completed-across-344-trial-users
 * Task ID: db32d700-a83c-4bb4-a162-688fc384f3e4
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DASHBOARD = path.join(ROOT, 'product', 'lead-response', 'dashboard')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS ${name}`)
    passed++
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(`  ${error.message}`)
    failed++
  }
}

function read(relPath) {
  const fullPath = path.join(ROOT, relPath)
  assert(fs.existsSync(fullPath), `Missing file: ${relPath}`)
  return fs.readFileSync(fullPath, 'utf8')
}

const simulatorRoute = read('product/lead-response/dashboard/app/api/onboarding/simulator/route.ts')
const completeRoute = read('product/lead-response/dashboard/app/api/onboarding/complete/route.ts')
const onboardingPage = read('product/lead-response/dashboard/app/dashboard/onboarding/page.tsx')
const simulatorStep = read('product/lead-response/dashboard/app/onboarding/steps/simulator.tsx')
const confirmationStep = read('product/lead-response/dashboard/app/onboarding/steps/confirmation.tsx')

test('simulator route authenticates user before routing simulator actions', () => {
  assert(simulatorRoute.includes("import { getAuthUserId } from '@/lib/auth'"), 'simulator route must import getAuthUserId')
  assert(simulatorRoute.includes('const authenticatedId = await getAuthUserId(request)'), 'simulator route must resolve authenticated user id')
  assert(simulatorRoute.includes('const effectiveAgentId = authenticatedId || agentId'), 'simulator route must prefer authenticated id over client value')
})

test('simulator route uses effectiveAgentId for all actions', () => {
  assert(simulatorRoute.includes('return await startSimulation(effectiveAgentId, finalSessionId!)'), 'start action must use effectiveAgentId')
  assert(simulatorRoute.includes('return await getSimulationStatus(effectiveAgentId, sessionId!)'), 'status action must use effectiveAgentId')
  assert(simulatorRoute.includes('return await skipSimulation(effectiveAgentId, sessionId!, reason)'), 'skip action must use effectiveAgentId')
})

test('onboarding completion route still persists aha fields on authenticated real_estate_agents row', () => {
  assert(completeRoute.includes('const authenticatedId = await getAuthUserId(request)'), 'complete route must authenticate')
  assert(completeRoute.includes(".from('real_estate_agents')"), 'complete route must update real_estate_agents')
  assert(completeRoute.includes(".eq('id', authenticatedId)"), 'complete route must update authenticated user row')
  assert(completeRoute.includes('updateData.aha_completed = completionPayload.ahaCompleted'), 'complete route must persist aha_completed')
  assert(completeRoute.includes('updateData.aha_response_time_ms = completionPayload.ahaResponseTimeMs'), 'complete route must persist aha_response_time_ms')
})

test('onboarding UI still forwards aha completion data to completion route', () => {
  assert(onboardingPage.includes("fetch('/api/onboarding/complete'"), 'onboarding page must call completion endpoint')
  assert(onboardingPage.includes('ahaCompleted: agentData.ahaCompleted'), 'onboarding page must submit ahaCompleted')
  assert(onboardingPage.includes('ahaResponseTimeMs: agentData.ahaResponseTimeMs'), 'onboarding page must submit ahaResponseTimeMs')
})

test('simulator UI marks ahaCompleted after success', () => {
  assert(simulatorStep.includes("if (data.state.status === 'success')"), 'simulator UI must detect success status')
  assert(simulatorStep.includes('ahaCompleted: true'), 'simulator UI must set ahaCompleted true on success')
  assert(simulatorStep.includes('ahaResponseTimeMs: data.state.response_time_ms'), 'simulator UI must store response time from simulation')
})

test('confirmation UI still surfaces aha status to user', () => {
  assert(confirmationStep.includes('agentData.ahaCompleted'), 'confirmation UI must read ahaCompleted')
  assert(confirmationStep.includes('Saw AI respond in'), 'confirmation UI must show response timing when aha completed')
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
