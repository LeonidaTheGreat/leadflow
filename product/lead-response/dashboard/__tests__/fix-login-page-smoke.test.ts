import fs from 'fs'
import path from 'path'

describe('fix-login-page-smoke', () => {
  const loginPagePath = path.join(process.cwd(), 'app', 'login', 'page.tsx')
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(loginPagePath, 'utf8')
  })

  it('login route is explicitly configured for static availability', () => {
    expect(source).toMatch(/export const dynamic = 'force-static'/)
    expect(source).not.toMatch(/export const revalidate =/)
  })

  it('login page wraps useSearchParams usage in a Suspense boundary', () => {
    expect(source).toMatch(/useSearchParams/)
    expect(source).toMatch(/<Suspense/)
    expect(source).toMatch(/fallback=/)
  })
})
