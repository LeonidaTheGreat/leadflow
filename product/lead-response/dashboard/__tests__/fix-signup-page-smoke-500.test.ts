import fs from 'fs'
import path from 'path'

describe('fix-signup-page-smoke-500', () => {
  it('signup page does not depend on useSearchParams in render path', () => {
    const signupPagePath = path.join(process.cwd(), 'app', 'signup', 'page.tsx')
    const source = fs.readFileSync(signupPagePath, 'utf8')

    expect(source).not.toMatch(/useSearchParams\s*\(/)
    expect(source).toMatch(/new URLSearchParams\(window\.location\.search\)/)
    expect(source).toMatch(/setIsTrialMode\(mode === 'trial'\)/)
  })

  it('signup route is explicitly configured for static availability', () => {
    const signupPagePath = path.join(process.cwd(), 'app', 'signup', 'page.tsx')
    const source = fs.readFileSync(signupPagePath, 'utf8')

    expect(source).toMatch(/export const dynamic = 'force-static'/)
    expect(source).not.toMatch(/export const revalidate =/)
  })
})
