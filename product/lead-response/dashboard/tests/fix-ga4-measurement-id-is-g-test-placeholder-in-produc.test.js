#!/usr/bin/env node
const assert = require('assert')
const { spawnSync } = require('child_process')
const path = require('path')

const dashboardDir = path.resolve(__dirname, '..')
const scriptPath = path.join(dashboardDir, 'scripts', 'validate-env.js')

function runValidation(envOverrides) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: dashboardDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      NEXT_PUBLIC_APP_URL: 'https://example.com',
      NEXT_PUBLIC_API_URL: 'https://api.example.com',
      NEXT_PUBLIC_API_KEY: 'public-test-key',
      API_SECRET_KEY: 'secret-test-key',
      RESEND_API_KEY: 're_test_key',
      ...envOverrides,
    },
    encoding: 'utf8',
  })

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }
}

function expectFailure(envOverrides, expectedText) {
  const result = runValidation(envOverrides)
  assert.notStrictEqual(result.status, 0, `expected failure, got success:\n${result.stdout}`)
  const combined = `${result.stdout}\n${result.stderr}`
  assert(
    combined.includes(expectedText),
    `expected output to include ${JSON.stringify(expectedText)}, got:\n${combined}`
  )
}

function expectSuccess(envOverrides) {
  const result = runValidation(envOverrides)
  assert.strictEqual(result.status, 0, `expected success, got:\n${result.stdout}\n${result.stderr}`)
  assert(
    result.stdout.includes('Env validation passed'),
    `expected success message, got:\n${result.stdout}`
  )
}

expectFailure(
  { NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-TEST-PLACEHOLDER' },
  'PLACEHOLDER: NEXT_PUBLIC_GA4_MEASUREMENT_ID contains a placeholder value'
)

expectFailure(
  { NEXT_PUBLIC_GA4_MEASUREMENT_ID: '' },
  'MISSING: NEXT_PUBLIC_GA4_MEASUREMENT_ID is required for production builds'
)

expectSuccess({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-REAL123ABC' })

console.log('PASS fix-ga4-measurement-id-is-g-test-placeholder-in-produc.test.js')
