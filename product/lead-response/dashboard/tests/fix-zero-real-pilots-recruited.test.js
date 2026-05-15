'use strict'

const fs = require('fs')
const path = require('path')
const test = require('node:test')
const assert = require('node:assert/strict')

const routePath = path.join(
  __dirname,
  '../app/api/auth/accept-invite/route.ts'
)

const routeSource = fs.readFileSync(routePath, 'utf8')

test('accept-invite writes pilot_started_at when creating real_estate_agents row', () => {
  assert.match(
    routeSource,
    /pilot_started_at\s*:\s*nowIso/,
    'accept-invite must set real_estate_agents.pilot_started_at at invite acceptance'
  )
})

test('accept-invite still creates pilot_progress signed_up record', () => {
  assert.match(
    routeSource,
    /from\('pilot_progress'\)\.insert\(/,
    'accept-invite must create pilot_progress record'
  )
  assert.match(
    routeSource,
    /stage:\s*'signed_up'/,
    'pilot_progress stage should remain signed_up'
  )
})
