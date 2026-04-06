const assert = require('assert')
const path = require('path')
const { execFileSync } = require('child_process')

const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'validate-env.js')

function runValidateEnv(extraEnv = {}) {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_PUBLIC_API_URL: 'https://api.example.com',
    NEXT_PUBLIC_API_KEY: 'public-test-key',
    API_SECRET_KEY: 'secret-test-key',
    RESEND_API_KEY: 're_test_key',
    ...extraEnv,
  }

  try {
    const stdout = execFileSync(process.execPath, [scriptPath], {
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    return { ok: true, output: stdout }
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout || ''}${error.stderr || ''}`,
      status: error.status,
    }
  }
}

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

test('fails production validation when GA4 measurement id is missing', () => {
  const result = runValidateEnv({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: '' })
  assert.strictEqual(result.ok, false)
  assert.match(result.output, /NEXT_PUBLIC_GA4_MEASUREMENT_ID is required for production builds/)
})

test('fails production validation when GA4 measurement id is a placeholder', () => {
  const result = runValidateEnv({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-TEST-PLACEHOLDER' })
  assert.strictEqual(result.ok, false)
  assert.match(result.output, /PLACEHOLDER: NEXT_PUBLIC_GA4_MEASUREMENT_ID/)
})

test('passes production validation when GA4 measurement id is set to a real-looking value', () => {
  const result = runValidateEnv({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-ABC123DEF4' })
  assert.strictEqual(result.ok, true)
  assert.match(result.output, /Env validation passed/)
})
