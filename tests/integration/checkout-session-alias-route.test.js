'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = '/Users/clawdbot/projects/leadflow'
const aliasRoutePath = path.join(ROOT, 'product/lead-response/dashboard/app/api/checkout/session/route.ts')

function test(name, fn) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`)
    process.exitCode = 1
  }
}

test('checkout session alias route exists', () => {
  assert.ok(fs.existsSync(aliasRoutePath), 'Expected app/api/checkout/session/route.ts to exist')
})

test('checkout session alias re-exports billing create-checkout-session POST handler', () => {
  const source = fs.readFileSync(aliasRoutePath, 'utf8')
  assert.ok(
    source.includes("export { POST } from '@/app/api/billing/create-checkout-session/route'"),
    'Expected alias route to re-export POST handler from create-checkout-session route'
  )
})
