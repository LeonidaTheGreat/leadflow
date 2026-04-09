const assert = require('assert')
const fs = require('fs')
const path = require('path')

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function test(name, fn) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error.stack || error.message)
    process.exitCode = 1
  }
}

const demoLinkRoutePath = path.join(
  __dirname,
  '..',
  'app',
  'api',
  'admin',
  'demo-link',
  'route.ts'
)

const invitePilotRoutePath = path.join(
  __dirname,
  '..',
  'app',
  'api',
  'admin',
  'invite-pilot',
  'route.ts'
)

const demoLinkRoute = read(demoLinkRoutePath)
const invitePilotRoute = read(invitePilotRoutePath)

test('demo-link route hashes demo token before storing', () => {
  assert(demoLinkRoute.includes('function hashToken(token: string): string'))
  assert(demoLinkRoute.includes("token: tokenHash"))
  assert(demoLinkRoute.includes(".eq('token', tokenHash)"))
  assert(!demoLinkRoute.includes('.insert({\n        token,'), 'raw token must not be inserted in demo_tokens')
})

test('invite-pilot route uses hashToken helper for pilot_invites writes', () => {
  assert(invitePilotRoute.includes('function hashToken(token: string): string'))
  assert(invitePilotRoute.includes('const tokenHash = hashToken(rawToken)'))
  assert(invitePilotRoute.includes('.update({ token: tokenHash })'))
  assert(invitePilotRoute.includes('token: tokenHash,'))
})

if (process.exitCode) {
  process.exit(process.exitCode)
}
