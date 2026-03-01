#!/usr/bin/env node
/**
 * LeadFlow Onboarding E2E Test Runner
 * 
 * This script runs the comprehensive E2E test suite and generates a report.
 * 
 * Usage:
 *   node run-e2e-tests.js [options]
 * 
 * Options:
 *   --headed       Run tests in headed mode (show browser)
 *   --mobile       Run only mobile tests
 *   --api          Run only API integration tests
 *   --validation   Run only validation tests
 *   --error        Run only error handling tests
 *   --success      Run only success flow tests
 *   --navigation   Run only navigation tests
 *   --report       Generate HTML report after tests
 *   --env=<url>    Set test environment URL
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const options = {
  headed: args.includes('--headed'),
  mobile: args.includes('--mobile'),
  api: args.includes('--api'),
  validation: args.includes('--validation'),
  error: args.includes('--error'),
  success: args.includes('--success'),
  navigation: args.includes('--navigation'),
  report: args.includes('--report'),
  env: args.find(a => a.startsWith('--env='))?.split('=')[1] || 'https://leadflow-ai-five.vercel.app',
}

// Build filter based on options
let filter = ''
if (options.mobile) filter = '--grep "@mobile"'
else if (options.api) filter = '--grep "@api"'
else if (options.validation) filter = '--grep "@validation"'
else if (options.error) filter = '--grep "@error"'
else if (options.success) filter = '--grep "@happy-path @e2e"'
else if (options.navigation) filter = '--grep "@navigation"'

const headed = options.headed ? '--headed' : ''
const reporters = options.report ? '--reporter=html,json,line' : '--reporter=list'

console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║     LeadFlow Onboarding E2E Test Suite                      ║')
console.log('╚══════════════════════════════════════════════════════════════╝')
console.log()
console.log(`Test Environment: ${options.env}`)
console.log(`Filter: ${filter || 'All tests'}`)
console.log(`Mode: ${options.headed ? 'Headed' : 'Headless'}`)
console.log()

// Set environment variable
process.env.TEST_BASE_URL = options.env

const testDir = path.join(__dirname, 'tests')
const configFile = path.join(__dirname, 'playwright.config.ts')

// Check if playwright is installed
try {
  execSync('npx playwright --version', { stdio: 'ignore' })
} catch {
  console.log('Installing Playwright...')
  execSync('npm install', { cwd: __dirname, stdio: 'inherit' })
  execSync('npx playwright install chromium firefox webkit', { cwd: __dirname, stdio: 'inherit' })
}

// Run tests
const command = `npx playwright test ${filter} ${headed} ${reporters} --config="${configFile}"`

console.log(`Running: ${command}`)
console.log()

try {
  execSync(command, { 
    cwd: __dirname, 
    stdio: 'inherit',
    env: { ...process.env, TEST_BASE_URL: options.env }
  })
  
  console.log()
  console.log('✅ All tests passed!')
  
  if (options.report) {
    console.log()
    console.log('📊 Opening test report...')
    execSync('npx playwright show-report', { cwd: __dirname, stdio: 'inherit' })
  }
} catch (error) {
  console.log()
  console.log('❌ Some tests failed. Check the output above for details.')
  
  if (options.report && fs.existsSync(path.join(__dirname, 'playwright-report'))) {
    console.log()
    console.log('📊 Opening test report...')
    execSync('npx playwright show-report', { cwd: __dirname, stdio: 'inherit' })
  }
  
  process.exit(1)
}
