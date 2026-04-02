#!/usr/bin/env node
/**
 * Pre-build env var validation.
 * Runs before `next build` to catch misconfigured env vars BEFORE deploy.
 *
 * Catches: missing vars, placeholder values, trailing whitespace/newlines.
 * Fails the build if any required var is invalid.
 *
 * Add to package.json: "prebuild": "node scripts/validate-env.js"
 */

const REQUIRED = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_API_KEY',
  'API_SECRET_KEY',
  'RESEND_API_KEY'
]

const errors = []

for (const key of REQUIRED) {
  const val = process.env[key]

  if (!val) {
    // In development, missing vars are warnings, not errors
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      errors.push(`MISSING: ${key} is not set`)
    } else {
      console.warn(`⚠️  ${key} not set (ok in development)`)
    }
    continue
  }

  if (val !== val.trim()) {
    errors.push(`WHITESPACE: ${key} has leading/trailing whitespace or newlines — will break interpolation`)
  }

  const lower = val.toLowerCase()
  if (lower.includes('placeholder') || lower.includes('your-') || lower === 'test' || lower === 'undefined') {
    errors.push(`PLACEHOLDER: ${key} contains a placeholder value: "${val.slice(0, 20)}..."`)
  }
}

if (errors.length > 0) {
  console.error('\n❌ ENV VALIDATION FAILED:\n')
  errors.forEach(e => console.error(`  ${e}`))
  console.error('\nFix the environment variables and redeploy.\n')
  process.exit(1)
} else {
  console.log('✅ Env validation passed')
}
