#!/usr/bin/env node
/**
 * Unit test: generate-services-docs.js and generate-api-docs.js
 *
 * Verifies that both scripts:
 * 1. Run without errors
 * 2. Produce non-empty output files
 * 3. Generated files contain correct headers and structural markers
 */

'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const PROJECT_DIR = path.join(__dirname, '..', '..')
const SERVICES_MD = path.join(PROJECT_DIR, 'SERVICES.md')
const API_MD = path.join(PROJECT_DIR, 'API.md')

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

console.log('\n🧪 generate-docs tests\n')

// Run the scripts
let servicesOutput, apiOutput
check('generate-services-docs.js runs without error', () => {
  servicesOutput = execSync(`node ${path.join(PROJECT_DIR, 'scripts', 'generate-services-docs.js')}`, {
    encoding: 'utf8',
    cwd: PROJECT_DIR
  })
})

check('generate-api-docs.js runs without error', () => {
  apiOutput = execSync(`node ${path.join(PROJECT_DIR, 'scripts', 'generate-api-docs.js')}`, {
    encoding: 'utf8',
    cwd: PROJECT_DIR
  })
})

// SERVICES.md checks
check('SERVICES.md exists after generation', () => {
  assert.ok(fs.existsSync(SERVICES_MD), 'SERVICES.md does not exist')
})

check('SERVICES.md is not empty', () => {
  const content = fs.readFileSync(SERVICES_MD, 'utf8')
  assert.ok(content.length > 100, 'SERVICES.md is too short')
})

check('SERVICES.md has auto-generated header', () => {
  const content = fs.readFileSync(SERVICES_MD, 'utf8')
  assert.ok(content.includes('AUTO-GENERATED'), 'Missing AUTO-GENERATED header')
})

check('SERVICES.md has # Services Reference heading', () => {
  const content = fs.readFileSync(SERVICES_MD, 'utf8')
  assert.ok(content.includes('# Services Reference'), 'Missing Services Reference heading')
})

check('SERVICES.md contains at least one service entry', () => {
  const content = fs.readFileSync(SERVICES_MD, 'utf8')
  assert.ok(content.includes('## '), 'No service sections found')
  assert.ok(content.includes('lib/services/'), 'No service file references found')
})

check('SERVICES.md contains known service CalcomWebhookHandler', () => {
  const content = fs.readFileSync(SERVICES_MD, 'utf8')
  assert.ok(content.includes('CalcomWebhookHandler'), 'CalcomWebhookHandler not found in SERVICES.md')
})

// API.md checks
check('API.md exists after generation', () => {
  assert.ok(fs.existsSync(API_MD), 'API.md does not exist')
})

check('API.md is not empty', () => {
  const content = fs.readFileSync(API_MD, 'utf8')
  assert.ok(content.length > 100, 'API.md is too short')
})

check('API.md has auto-generated header', () => {
  const content = fs.readFileSync(API_MD, 'utf8')
  assert.ok(content.includes('AUTO-GENERATED'), 'Missing AUTO-GENERATED header')
})

check('API.md has # API Reference heading', () => {
  const content = fs.readFileSync(API_MD, 'utf8')
  assert.ok(content.includes('# API Reference'), 'Missing API Reference heading')
})

check('API.md contains at least one route entry', () => {
  const content = fs.readFileSync(API_MD, 'utf8')
  assert.ok(
    content.includes('**GET**') || content.includes('**POST**') || content.includes('**PUT**'),
    'No HTTP method entries found in API.md'
  )
})

check('API.md contains routes/ source reference', () => {
  const content = fs.readFileSync(API_MD, 'utf8')
  assert.ok(content.includes('routes/'), 'No routes/ reference found in API.md')
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
