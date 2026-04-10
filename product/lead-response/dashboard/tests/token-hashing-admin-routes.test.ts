import fs from 'fs'
import path from 'path'

describe('Admin route token hashing safeguards', () => {
  it('stores hashed demo tokens in /api/admin/demo-link', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/admin/demo-link/route.ts'),
      'utf8'
    )

    expect(source).toContain('function hashToken(token: string): string')
    expect(source).toContain("token: tokenHash")
    expect(source).toContain(".eq('token', tokenHash)")
  })

  it('stores hashed invite tokens in /api/admin/invite-pilot', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/admin/invite-pilot/route.ts'),
      'utf8'
    )

    expect(source).toContain('function hashToken(token: string): string')
    expect(source).toContain('const tokenHash = hashToken(rawToken)')
    expect(source).toContain(".update({ token: tokenHash })")
    expect(source).toContain("token: tokenHash")
  })
})
