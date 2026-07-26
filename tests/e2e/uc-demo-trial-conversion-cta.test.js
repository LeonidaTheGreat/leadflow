'use strict'

const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard')

describe('UC: Interactive Demo → Trial Signup CTA', () => {
  describe('StickyTrialCTA component exists', () => {
    const componentPath = path.join(DASHBOARD_DIR, 'components/StickyTrialCTA.tsx')

    it('component file exists', () => {
      expect(fs.existsSync(componentPath)).toBe(true)
    })

    it('accepts show, source, sessionId, prefillEmail props', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain('show: boolean')
      expect(content).toContain("source: 'demo' | 'simulator'")
      expect(content).toContain('sessionId: string')
      expect(content).toContain('prefillEmail?: string')
    })

    it('posts to /api/auth/trial-signup', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain('/api/auth/trial-signup')
    })

    it('sends source in request body', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain('body: JSON.stringify({ email, password, source })')
    })

    it('fires demo_cta_shown GA4 event', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain("trackDemoEvent('demo_cta_shown'")
    })

    it('fires demo_cta_clicked GA4 event', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain("trackDemoEvent('demo_cta_clicked'")
    })

    it('fires demo_trial_started GA4 event', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain("trackDemoEvent('demo_trial_started'")
    })

    it('has email and password inputs with accessible labels', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain('id="sticky-cta-email"')
      expect(content).toContain('id="sticky-cta-password"')
      expect(content).toContain('sr-only')
    })

    it('has dismiss button', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain('setDismissed(true)')
      expect(content).toContain('aria-label="Dismiss"')
    })

    it('redirects to onboarding with demo_source=true', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain('demo_source=true')
    })
  })

  describe('Demo page integration', () => {
    const demoPagePath = path.join(DASHBOARD_DIR, 'app/demo/page.tsx')

    it('demo page imports StickyTrialCTA', () => {
      const content = fs.readFileSync(demoPagePath, 'utf8')
      expect(content).toContain("import StickyTrialCTA from '@/components/StickyTrialCTA'")
    })

    it('demo page renders StickyTrialCTA with source=demo', () => {
      const content = fs.readFileSync(demoPagePath, 'utf8')
      expect(content).toContain('source="demo"')
      expect(content).toContain('<StickyTrialCTA')
    })

    it('demo page has showStickyCTA state', () => {
      const content = fs.readFileSync(demoPagePath, 'utf8')
      expect(content).toContain('showStickyCTA')
    })

    it('sticky CTA triggers after 30 seconds', () => {
      const content = fs.readFileSync(demoPagePath, 'utf8')
      expect(content).toContain('setTimeout(() => setShowStickyCTA(true), 30000)')
    })

    it('sticky CTA triggers on AI response completion', () => {
      const content = fs.readFileSync(demoPagePath, 'utf8')
      expect(content).toMatch(/stage\s*===\s*['"]complete['"].*setShowStickyCTA\(true\)/s)
    })
  })

  describe('Analytics types', () => {
    const analyticsPath = path.join(DASHBOARD_DIR, 'lib/analytics/demo.ts')

    it('includes demo_cta_shown event type', () => {
      const content = fs.readFileSync(analyticsPath, 'utf8')
      expect(content).toContain("'demo_cta_shown'")
    })

    it('includes demo_cta_clicked event type', () => {
      const content = fs.readFileSync(analyticsPath, 'utf8')
      expect(content).toContain("'demo_cta_clicked'")
    })

    it('includes demo_trial_started event type', () => {
      const content = fs.readFileSync(analyticsPath, 'utf8')
      expect(content).toContain("'demo_trial_started'")
    })

    it('DemoEventParams includes source field', () => {
      const content = fs.readFileSync(analyticsPath, 'utf8')
      expect(content).toContain('source?: string')
    })
  })

  describe('StickyTrialCTA dismiss persists to sessionStorage', () => {
    const componentPath = path.join(DASHBOARD_DIR, 'components/StickyTrialCTA.tsx')

    it('reads demo_cta_dismissed from sessionStorage on init', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain('demo_cta_dismissed')
      expect(content).toContain('sessionStorage')
    })

    it('writes demo_cta_dismissed to sessionStorage on dismiss', () => {
      const content = fs.readFileSync(componentPath, 'utf8')
      expect(content).toContain("sessionStorage.setItem('demo_cta_dismissed', '1')")
    })
  })

  describe('Onboarding demo_source param skips to try-ai', () => {
    const onboardingPath = path.join(DASHBOARD_DIR, 'app/dashboard/onboarding/page.tsx')

    it('onboarding page imports useSearchParams', () => {
      const content = fs.readFileSync(onboardingPath, 'utf8')
      expect(content).toContain('useSearchParams')
    })

    it('onboarding page reads demo_source query param', () => {
      const content = fs.readFileSync(onboardingPath, 'utf8')
      expect(content).toContain('demo_source')
    })

    it('onboarding page initialises to try-ai when demo_source=true', () => {
      const content = fs.readFileSync(onboardingPath, 'utf8')
      expect(content).toContain("'try-ai'")
      expect(content).toContain('isDemoSource')
    })
  })
})
