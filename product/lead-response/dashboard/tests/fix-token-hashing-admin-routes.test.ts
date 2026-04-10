import fs from 'fs'
import path from 'path'

describe('Admin token hashing routes', () => {
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

  const demoLinkRoute = fs.readFileSync(demoLinkRoutePath, 'utf8')
  const invitePilotRoute = fs.readFileSync(invitePilotRoutePath, 'utf8')

  it('hashes demo token before storing and lookup', () => {
    expect(demoLinkRoute).toContain('function hashToken(token: string): string')
    expect(demoLinkRoute).toContain('token: tokenHash')
    expect(demoLinkRoute).toContain(".eq('token', tokenHash)")
    expect(demoLinkRoute).not.toContain('.insert({\n        token,')
  })

  it('uses token hash helper for pilot_invites writes', () => {
    expect(invitePilotRoute).toContain('function hashToken(token: string): string')
    expect(invitePilotRoute).toContain('const tokenHash = hashToken(rawToken)')
    expect(invitePilotRoute).toContain('.update({ token: tokenHash })')
    expect(invitePilotRoute).toContain('token: tokenHash,')
  })
})
