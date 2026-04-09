#!/usr/bin/env node
/**
 * Pre-build env var validation (multi-project).
 * Reads required vars from project.config.json → deployment.env_validation.
 * Falls back to hardcoded list if config not found.
 *
 * Catches: missing vars, placeholder values, trailing whitespace/newlines.
 * Fails the build in production if any required var is invalid.
 *
 * Add to package.json: "prebuild": "node scripts/validate-env.js"
 */

const fs = require('fs')
const path = require('path')

// Load required vars from project.config.json (multi-project support)
let config = {}
const configPaths = [
  path.resolve(__dirname, '..', '..', '..', '..', 'project.config.json'), // from dashboard/scripts/
  path.resolve(__dirname, '..', 'project.config.json'), // from project root
]
for (const p of configPaths) {
  try {
    if (fs.existsSync(p)) {
      config = JSON.parse(fs.readFileSync(p, 'utf-8'))
      break
    }
  } catch {}
}

const envValidation = config.deployment?.env_validation || {}
const REQUIRED = envValidation.required || [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_API_KEY',
  'API_SECRET_KEY',
  'RESEND_API_KEY'
]
const NO_PLACEHOLDERS = envValidation.no_placeholders !== false
const TRIM_WHITESPACE = envValidation.trim_whitespace !== false

const errors = []

for (const key of REQUIRED) {
  const val = process.env[key]

  if (!val) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      errors.push(`MISSING: ${key} is not set`)
    } else {
      console.warn(`⚠️  ${key} not set (ok in development)`)
    }
    continue
  }

  if (TRIM_WHITESPACE && val !== val.trim()) {
    errors.push(`WHITESPACE: ${key} has leading/trailing whitespace or newlines — will break interpolation`)
  }

  if (NO_PLACEHOLDERS) {
    const lower = val.toLowerCase()
    if (lower.includes('placeholder') || lower.includes('your-') || lower === 'test' || lower === 'undefined') {
      errors.push(`PLACEHOLDER: ${key} contains a placeholder value: "${val.slice(0, 20)}..."`)
    }
  }
}

if (errors.length > 0) {
  console.error('\n❌ ENV VALIDATION FAILED:\n')
  errors.forEach(e => console.error(`  ${e}`))
  console.error('\nFix the environment variables and redeploy.\n')
  process.exit(1)
} else {
  console.log(`✅ Env validation passed (${REQUIRED.length} vars checked)`)
}
