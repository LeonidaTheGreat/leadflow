'use strict'
const fs=require('fs'),path=require('path'),pr=path.join(__dirname,'..'),dr=path.join(pr,'product/lead-response/dashboard')
describe('Onboarding completion telemetry',()=>{
  const t=require('../lib/onboarding-telemetry')
  test('exports logOnboardingEvent',()=>{expect(typeof t.logOnboardingEvent).toBe('function')})
  test('exports checkAndAlertStuckAgents',()=>{expect(typeof t.checkAndAlertStuckAgents).toBe('function')})
  test('STEP_INDEX correct',()=>{expect(t.STEP_INDEX.email_verified).toBe(1);expect(t.STEP_INDEX.aha_completed).toBe(5)})
  test('invalid step rejected',async()=>{const m={from:()=>({insert:()=>({select:()=>({single:async()=>({})})})})}; const r=await t.logOnboardingEvent(m,'x','bad','done');expect(r.success).toBe(false)})
  test('dashboard telemetry lib exists',()=>{expect(fs.existsSync(path.join(dr,'lib/onboarding-telemetry.js'))).toBe(true)})
  test('log-event API route exists',()=>{expect(fs.existsSync(path.join(dr,'app/api/onboarding/log-event/route.ts'))).toBe(true)})
  test('stuck agents cron route exists',()=>{expect(fs.existsSync(path.join(dr,'app/api/cron/check-stuck-agents/route.ts'))).toBe(true)})
  test('012 migration exists',()=>{const p=path.join(dr,'supabase/migrations/012_onboarding_completion_telemetry.sql');expect(fs.existsSync(p)).toBe(true);expect(fs.readFileSync(p,'utf8')).toMatch(/onboarding_step/)})
  test('useOnboardingTelemetry hook exists',()=>{expect(fs.existsSync(path.join(dr,'hooks/useOnboardingTelemetry.ts'))).toBe(true)})
})
