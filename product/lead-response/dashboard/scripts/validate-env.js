#!/usr/bin/env node
/**
 * TASK SPEC
 * What:
 * - Update product/lead-response/dashboard/scripts/validate-env.js to enforce supported Node.js versions for dashboard builds.
 * - Update product/lead-response/dashboard/package.json engines.node to an explicit supported range for Next.js 16 builds.
 * - Add product/lead-response/dashboard/.nvmrc so local/dev/CI use a compatible Node.js major version by default.
 *
 * Verify:
 * - cd product/lead-response/dashboard && node scripts/validate-env.js (on unsupported Node expect non-zero with Node compatibility error).
 * - cd product/lead-response/dashboard && npx next build (expect prior opaque "unknown/module" build failure replaced by explicit Node version failure when Node is unsupported).
 * - cd product/lead-response/dashboard && npm run build (under supported Node, expect successful Next.js production build).
 * - grep -n "\"engines\"" product/lead-response/dashboard/package.json and cat product/lead-response/dashboard/.nvmrc.
 *
 * Boundaries:
 * - Do not modify dashboard feature code, routes, services, or UI components.
 * - Do not change database schema or non-dashboard packages.
 * - Do not alter deployment behavior beyond Node runtime compatibility enforcement for builds.
 */
/**
 * Pre-build env var validation (multi-project).
 * Reads required vars from project.config.json → deployment.env_validation.
 * Falls back to hardcoded list if config not found.
 *
 * Catches: missing vars, placeholder values, trailing whitespace/newlines.
 * Fails the build in production (VERCEL_ENV=production). Preview/dev builds
 * log warnings but don't block deployment.
 *
 * Add to package.json: "prebuild": "node scripts/validate-env.js"
 */

const fs = require('fs')
const path = require('path')

const MIN_NODE_MAJOR = 20
const MIN_NODE_MINOR_FOR_20 = 9
const MAX_NODE_MAJOR_EXCLUSIVE = 25

function validateNodeVersion() {
  const [majorRaw = '0', minorRaw = '0'] = process.versions.node.split('.')
  const major = Number(majorRaw)
  const minor = Number(minorRaw)
  const hasMinVersion = major > MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor >= MIN_NODE_MINOR_FOR_20)
  const isBelowMaxExclusive = major < MAX_NODE_MAJOR_EXCLUSIVE

  if (!hasMinVersion || !isBelowMaxExclusive) {
    const supportedRange = `>=${MIN_NODE_MAJOR}.${MIN_NODE_MINOR_FOR_20}.0 <${MAX_NODE_MAJOR_EXCLUSIVE}.0.0`
    console.error(`❌ NODE VERSION UNSUPPORTED: found ${process.versions.node}; expected ${supportedRange} for dashboard builds.`)
    console.error('Use the dashboard .nvmrc / engines setting (for example: `nvm use`) and rerun the build.')
    process.exit(1)
  }
}

validateNodeVersion()

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
const REQUIRED_IN_PRODUCTION = envValidation.required_in_production || [
  'NEXT_PUBLIC_GA4_MEASUREMENT_ID'
]
const NO_PLACEHOLDERS = envValidation.no_placeholders !== false
const TRIM_WHITESPACE = envValidation.trim_whitespace !== false
const isVercel = !!process.env.VERCEL
const isProduction = process.env.VERCEL_ENV === 'production'
const isProductionBuild = process.env.NODE_ENV === 'production' || isVercel

const errors = []
const warnings = []

// Guard: detect when this Next.js dashboard is being built as a Node.js serverless
// function from the repo root (wrong Vercel project context). This catches the case
// where `vercel --prod` runs from root and deploys server.js to leadflow-ai.
if (isVercel && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  const expectedUrl = 'leadflow-ai-five.vercel.app'
  const actualUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (actualUrl && !actualUrl.includes('leadflow-ai') && !actualUrl.includes('landyourleads')) {
    errors.push(`WRONG_PROJECT: This build is running under Vercel project "${actualUrl}" but expected "leadflow-ai". Aborting to prevent deploying the wrong app.`)
  }
}

for (const key of REQUIRED) {
  const val = process.env[key]

  if (!val) {
    if (isProduction) {
      errors.push(`MISSING: ${key} is not set`)
    } else if (isProductionBuild) {
      warnings.push(`${key} not set (preview build, non-blocking)`)
    } else {
      console.warn(`⚠️  ${key} not set (ok in development)`)
    }
    continue
  }

  if (TRIM_WHITESPACE && val !== val.trim()) {
    if (isProduction) {
      errors.push(`WHITESPACE: ${key} has leading/trailing whitespace or newlines — will break interpolation`)
    } else {
      warnings.push(`${key} has whitespace (preview build, non-blocking)`)
    }
  }

  if (NO_PLACEHOLDERS) {
    const lower = val.toLowerCase()
    if (lower.includes('placeholder') || lower.includes('your-') || lower === 'test' || lower === 'undefined') {
      if (isProduction) {
        errors.push(`PLACEHOLDER: ${key} contains a placeholder value: "${val.slice(0, 20)}..."`)
      } else {
        warnings.push(`${key} contains a placeholder value (preview build, non-blocking)`)
      }
    }
  }
}

for (const key of REQUIRED_IN_PRODUCTION) {
  const val = process.env[key]

  if (!isProduction && !val) {
    continue
  }

  if (!val) {
    errors.push(`MISSING: ${key} is required for production builds`)
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

if (warnings.length > 0) {
  console.warn('\n⚠️  ENV WARNINGS (non-blocking):\n')
  warnings.forEach(w => console.warn(`  ${w}`))
  console.warn('')
}

if (errors.length > 0) {
  console.error('\n❌ ENV VALIDATION FAILED:\n')
  errors.forEach(e => console.error(`  ${e}`))
  console.error('\nFix the environment variables and redeploy.\n')
  if (require.main === module) {
    process.exit(1)
  }
} else {
  console.log(`✅ Env validation passed (${REQUIRED.length} vars checked${warnings.length > 0 ? `, ${warnings.length} warnings` : ''})`)
}

module.exports = { errors, warnings }
