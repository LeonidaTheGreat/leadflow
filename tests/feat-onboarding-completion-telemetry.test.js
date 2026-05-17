'use strict'
const fs = require('fs'), path = require('path')
const projectRoot = path.join(__dirname, '..')
const dashboardRoot = path.join(projectRoot, 'product/lead-response/dashboard')
describe('Onboarding completion telemetry', () => {
  const telemetry = require('../lib/onboarding-telemetry')
  test('exports logOnboardingEvent', () => { expect(typeof telemetry.logOnboardingEvent).toBe('function') })
  test('exports getFunnelStatus', () => { expect(typeof telemetry.getFunnelStatus).toBe('function') })
  test('exports checkAndAlertStuckAgents', () => { expect(typeof telemetry.checkAndAlertStuckAgents).toBe('function') })
  test('STEP_INDEX has all 5 steps', () => {
    const { STEP_INDEX } = telemetry
    expect(STEP_INDEX.email_verified).toBe(1)
    expect(STEP_INDEX.fub_connected).toBe(2)
    expect(STEP_INDEX.phone_configured).toBe(3)
    expect(STEP_INDEX.sms_verified).toBe(4)
    expect(STEP_INDEX.aha_completed).toBe(5)
  })
  test('logOnboardingEvent rejects invalid step', async () => {
    const mock = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({}) }) }) }) }
    const r = await telemetry.logOnboardingEvent(mock, 'x', 'bad_step', 'completed')
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/Invalid step/)
  })
  test('dashboard telemetry lib exists', () => {
    expect(fs.existsSync(path.join(dashboardRoot, 'lib/onboarding-telemetry.js'))).toBe(true)
  })
  test('log-event API route exists', () => {
    expect(fs.existsSync(path.join(dashboardRoot, 'app/api/onboarding/log-event/route.ts'))).toBe(true)
  })
  test('stuck agents cron route exists', () => {
    expect(fs.existsSync(path.join(dashboardRoot, 'app/api/cron/check-stuck-agents/route.ts'))).toBe(true)
  })
  test('012 telemetry migration exists', () => {
    const p = path.join(dashboardRoot, 'supabase/migrations/012_onboarding_completion_telemetry.sql')
    expect(fs.existsSync(p)).toBe(true)
    expect(fs.readFileSync(p, 'utf8')).toMatch(/onboarding_step/)
  })
  test('useOnboardingTelemetry hook exists', () => {
    expect(fs.existsSync(path.join(dashboardRoot, 'hooks/useOnboardingTelemetry.ts'))).toBe(true)
  })
})
