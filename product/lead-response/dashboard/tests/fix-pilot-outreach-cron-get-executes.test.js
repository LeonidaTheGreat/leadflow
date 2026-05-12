/**
 * Regression test: pilot recruitment outreach cron must execute on GET.
 *
 * Root bug: route was scheduled by Vercel cron but only POST executed blast,
 * while GET only returned informational metadata.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const routePath = path.join(
  __dirname,
  '..',
  'app/api/cron/pilot-recruitment-outreach/route.ts'
)

function run() {
  const content = fs.readFileSync(routePath, 'utf8')

  assert.ok(content.includes('export async function GET(request: NextRequest)'), 'GET handler should accept request for auth + execution')
  assert.ok(content.includes('return await runOutreachBlast(request)'), 'GET handler must execute outreach blast flow')
  assert.ok(content.includes('export async function POST(request: NextRequest)'), 'POST handler must exist')
  assert.ok(content.includes('return await runOutreachBlast(request)'), 'POST handler should use shared blast flow')
  assert.ok(content.includes('if (authHeader !== `Bearer ${cronSecret}`)'), 'Cron auth guard must remain enforced')
  assert.ok(content.includes('const result = await blastService.runBlast()'), 'Shared flow must execute blast service')
  assert.ok(!content.includes("method: 'POST'"), 'GET should no longer be informational-only endpoint')

  console.log('✅ PASS: pilot outreach cron GET executes blast and remains auth-guarded')
}

try {
  run()
} catch (error) {
  console.error('❌ FAIL:', error.message)
  process.exit(1)
}
