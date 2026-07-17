import { describe, expect, it } from '@jest/globals'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '..')

function read(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf8')
}

describe('Frictionless demo onboarding redirects', () => {
  it('login redirects incomplete users to /dashboard/onboarding', () => {
    const source = read('app/login/page.tsx')
    expect(source).toContain("router.push('/dashboard/onboarding')")
    expect(source).not.toContain("router.push('/setup')")
  })

  it('OnboardingGuard redirects incomplete users to /dashboard/onboarding', () => {
    const source = read('components/onboarding-guard.tsx')
    expect(source).toContain("router.replace('/dashboard/onboarding')")
    expect(source).not.toContain("router.replace('/setup')")
  })

  it('signup form fallbacks point to /dashboard/onboarding', () => {
    const trialSource = read('components/trial-signup-form.tsx')
    const pilotSource = read('components/pilot-signup-form.tsx')

    expect(trialSource).toContain("router.push(data.redirectTo || '/dashboard/onboarding')")
    expect(trialSource).not.toContain("router.push(data.redirectTo || '/setup')")

    expect(pilotSource).toContain("router.push(data.redirectTo || '/dashboard/onboarding')")
    expect(pilotSource).not.toContain("router.push(data.redirectTo || '/setup')")
  })

  it('middleware redirects incomplete users to /dashboard/onboarding', () => {
    const source = read('proxy.ts')
    expect(source).toContain("pathname.startsWith('/dashboard/onboarding')")
    expect(source).toContain("new URL('/dashboard/onboarding', request.url)")
  })
})
