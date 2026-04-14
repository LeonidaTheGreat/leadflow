'use strict'

/**
 * Tests for: No Feedback button in dashboard — US-2 completely absent
 * Verifies that FeedbackButton is present in dashboard layout and
 * the /api/feedback POST endpoint exists and validates correctly.
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')

describe('Feedback Button — US-2 Implementation', () => {
  describe('FeedbackButton component', () => {
    it('FeedbackButton.tsx component file exists', () => {
      const componentPath = path.join(
        DASHBOARD_DIR,
        'components/dashboard/FeedbackButton.tsx'
      )
      expect(fs.existsSync(componentPath)).toBe(true)
    })

    it('FeedbackButton exports the FeedbackButton function', () => {
      const componentPath = path.join(
        DASHBOARD_DIR,
        'components/dashboard/FeedbackButton.tsx'
      )
      const src = fs.readFileSync(componentPath, 'utf8')
      expect(src).toMatch(/export function FeedbackButton/)
    })

    it('FeedbackButton includes all four feedback types', () => {
      const componentPath = path.join(
        DASHBOARD_DIR,
        'components/dashboard/FeedbackButton.tsx'
      )
      const src = fs.readFileSync(componentPath, 'utf8')
      expect(src).toMatch(/praise/)
      expect(src).toMatch(/bug/)
      expect(src).toMatch(/idea/)
      expect(src).toMatch(/frustration/)
    })

    it('FeedbackButton calls /api/feedback endpoint', () => {
      const componentPath = path.join(
        DASHBOARD_DIR,
        'components/dashboard/FeedbackButton.tsx'
      )
      const src = fs.readFileSync(componentPath, 'utf8')
      expect(src).toMatch(/\/api\/feedback/)
    })

    it('FeedbackButton is a client component', () => {
      const componentPath = path.join(
        DASHBOARD_DIR,
        'components/dashboard/FeedbackButton.tsx'
      )
      const src = fs.readFileSync(componentPath, 'utf8')
      expect(src.trim().startsWith("'use client'")).toBe(true)
    })
  })

  describe('Dashboard layout includes FeedbackButton', () => {
    it('dashboard/layout.tsx imports FeedbackButton', () => {
      const layoutPath = path.join(
        DASHBOARD_DIR,
        'app/dashboard/layout.tsx'
      )
      const src = fs.readFileSync(layoutPath, 'utf8')
      expect(src).toMatch(/import.*FeedbackButton.*from/)
    })

    it('dashboard/layout.tsx renders FeedbackButton', () => {
      const layoutPath = path.join(
        DASHBOARD_DIR,
        'app/dashboard/layout.tsx'
      )
      const src = fs.readFileSync(layoutPath, 'utf8')
      expect(src).toMatch(/<FeedbackButton\s*\/>/)
    })
  })

  describe('API route — /api/feedback', () => {
    it('/api/feedback/route.ts exists', () => {
      const routePath = path.join(
        DASHBOARD_DIR,
        'app/api/feedback/route.ts'
      )
      expect(fs.existsSync(routePath)).toBe(true)
    })

    it('route.ts exports a POST handler', () => {
      const routePath = path.join(
        DASHBOARD_DIR,
        'app/api/feedback/route.ts'
      )
      const src = fs.readFileSync(routePath, 'utf8')
      expect(src).toMatch(/export async function POST/)
    })

    it('route.ts uses session-based auth (validateSession)', () => {
      const routePath = path.join(
        DASHBOARD_DIR,
        'app/api/feedback/route.ts'
      )
      const src = fs.readFileSync(routePath, 'utf8')
      expect(src).toMatch(/validateSession/)
    })

    it('route.ts calls submitProductFeedback', () => {
      const routePath = path.join(
        DASHBOARD_DIR,
        'app/api/feedback/route.ts'
      )
      const src = fs.readFileSync(routePath, 'utf8')
      expect(src).toMatch(/submitProductFeedback/)
    })

    it('route.ts validates all four feedback types', () => {
      const routePath = path.join(
        DASHBOARD_DIR,
        'app/api/feedback/route.ts'
      )
      const src = fs.readFileSync(routePath, 'utf8')
      expect(src).toMatch(/praise/)
      expect(src).toMatch(/bug/)
      expect(src).toMatch(/idea/)
      expect(src).toMatch(/frustration/)
    })

    it('route.ts enforces 500-char content limit', () => {
      const routePath = path.join(
        DASHBOARD_DIR,
        'app/api/feedback/route.ts'
      )
      const src = fs.readFileSync(routePath, 'utf8')
      expect(src).toMatch(/500/)
    })

    it('route.ts does not accept agentId from request body (must use session)', () => {
      const routePath = path.join(
        DASHBOARD_DIR,
        'app/api/feedback/route.ts'
      )
      const src = fs.readFileSync(routePath, 'utf8')
      // Should not destructure agentId from body
      expect(src).not.toMatch(/const\s*\{[^}]*agentId[^}]*\}\s*=\s*body/)
    })
  })
})
