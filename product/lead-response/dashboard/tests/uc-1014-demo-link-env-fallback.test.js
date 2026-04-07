const assert = require('assert')
const fs = require('fs')
const path = require('path')

const routePath = path.join(
  __dirname,
  '..',
  'app',
  'api',
  'admin',
  'demo-link',
  'route.ts'
)

const source = fs.readFileSync(routePath, 'utf8')

assert(
  source.includes("function cleanEnv(value?: string): string | undefined"),
  'Expected cleanEnv helper to exist'
)
assert(
  source.includes("value.replace(/\\\\n/g, '').trim()"),
  'Expected cleanEnv to strip escaped newlines and trim whitespace'
)
assert(
  source.includes('cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)') &&
    source.includes('cleanEnv(process.env.NEXT_PUBLIC_API_URL)'),
  'Expected URL fallback: NEXT_PUBLIC_SUPABASE_URL -> NEXT_PUBLIC_API_URL'
)
assert(
  source.includes('cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)') &&
    source.includes('cleanEnv(process.env.API_SECRET_KEY)'),
  'Expected key fallback: SUPABASE_SERVICE_ROLE_KEY -> API_SECRET_KEY'
)
assert(
  source.includes("throw new Error('Missing Supabase configuration for demo link route')"),
  'Expected explicit error when DB configuration is missing'
)

console.log('PASS uc-1014-demo-link-env-fallback')
