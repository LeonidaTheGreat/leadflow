'use strict'

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const ROOT = path.join(__dirname, '..')

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

function test(name, fn) {
  try {
    fn()
    process.stdout.write(`PASS ${name}\n`)
  } catch (err) {
    process.stderr.write(`FAIL ${name}: ${err.message}\n`)
    process.exitCode = 1
  }
}

const ga4 = read('lib/analytics/ga4.ts')
const landingPage = read('app/page.tsx')
const trialForm = read('components/trial-signup-form.tsx')
const eventsRoute = read('app/api/events/track/route.ts')

test('ga4 helper mirrors CTA and trial-start events to server endpoint', () => {
  assert(ga4.includes("fetch('/api/events/track'"), 'expected /api/events/track fetch helper')
  assert(ga4.includes("trackServerEvent('trial_cta_clicked'"), 'expected trial_cta_clicked server tracking')
  assert(ga4.includes("trackServerEvent('trial_signup_started'"), 'expected trial_signup_started server tracking')
})

test('landing page emits landing page view event', () => {
  assert(landingPage.includes('trackLandingPageView'), 'expected trackLandingPageView import/use')
  assert(landingPage.includes("trackLandingPageView('home')"), 'expected homepage landing view tracking call')
})

test('trial signup form emits trial signup started event', () => {
  assert(trialForm.includes("trackFormEvent('trial_signup_started'"), 'expected trial_signup_started call on submit')
})

test('events tracking route allowlist accepts landing page view event', () => {
  assert(eventsRoute.includes("'landing_page_viewed'"), 'expected landing_page_viewed in event allowlist')
})

if (process.exitCode) {
  process.exit(process.exitCode)
}
