/**
 * Tests for: Demo Mode Onboarding Aha Moment
 * PRD: PRD-FRICTIONLESS-DEMO-NO-FUB.md + PRD-ONBOARDING-AHA-COMPLETION.md
 *
 * Verifies:
 * - POST /api/demo/run endpoint works without FUB/Twilio credentials
 * - POST /api/onboarding/complete endpoint records aha moment status
 * - Confirmation step shows aha moment status
 * - Onboarding wizard simulator step is wired in
 *
 * @jest-environment node
 */

import { POST as demoRunPost } from '@/app/api/demo/run/route'
import { POST as onboardingCompletePost } from '@/app/api/onboarding/complete/route'
import fs from 'fs'
import path from 'path'
import type { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/lib/auth', () => ({
  getAuthUserId: jest.fn(),
}))

const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockInsert = jest.fn()
const mockSelect = jest.fn()

jest.mock('@/lib/db', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
      update: mockUpdate.mockReturnThis(),
      insert: mockInsert.mockReturnThis(),
    })),
  },
}))

jest.mock('ai', () => ({
  generateText: jest.fn(),
}))

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'mocked-model'),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Partial<NextRequest> {
  return {
    json: async () => body,
    cookies: { get: () => undefined } as any,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Demo Mode — No FUB Required', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSelect.mockReturnThis()
    mockEq.mockReturnThis()
    mockUpdate.mockReturnThis()
    mockInsert.mockReturnThis()
  })

  describe('POST /api/demo/run', () => {
    it('returns 401 when not authenticated', async () => {
      const { getAuthUserId } = require('@/lib/auth')
      getAuthUserId.mockResolvedValue(null)

      const req = makeRequest({ lead: { name: 'Test', property_interest: '3BR house' } })
      const res = await demoRunPost(req as NextRequest)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('returns 404 when agent not found', async () => {
      const { getAuthUserId } = require('@/lib/auth')
      getAuthUserId.mockResolvedValue('unknown-id')

      mockSingle.mockResolvedValue({ data: null, error: new Error('Not found') })

      const req = makeRequest({ lead: { name: 'Test', property_interest: '3BR house' } })
      const res = await demoRunPost(req as NextRequest)
      const data = await res.json()

      expect(res.status).toBe(404)
    })

    it('returns demo_limit_reached when limit is exceeded', async () => {
      const { getAuthUserId } = require('@/lib/auth')
      getAuthUserId.mockResolvedValue('test-agent-id')

      mockSingle.mockResolvedValue({ data: { demo_runs_used: 3 }, error: null })

      const req = makeRequest({
        lead: { name: 'Sarah', property_interest: '3BR house' },
      })
      const res = await demoRunPost(req as NextRequest)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toBe('demo_limit_reached')
      expect(data.demos_remaining).toBe(0)
      expect(data.cta).toBeDefined()
      expect(data.cta.url).toContain('/dashboard/onboarding')
    })

    it('does NOT import Twilio or FUB in demo/run route', () => {
      const routePath = path.join(__dirname, '../app/api/demo/run/route.ts')
      const content = fs.readFileSync(routePath, 'utf8')
      expect(content).not.toMatch(/require\(['"]twilio['"]\)/)
      expect(content).not.toMatch(/from ['"]twilio['"]/)
      expect(content).not.toContain('sendSms')
      expect(content.toLowerCase()).not.toContain('fub_api_key')
    })

    it('includes mock mode fallback when no AI key is configured', () => {
      const routePath = path.join(__dirname, '../app/api/demo/run/route.ts')
      const content = fs.readFileSync(routePath, 'utf8')
      expect(content).toContain('isMockMode')
      expect(content).toContain('generateMockResponse')
    })

    it('requires auth but NOT FUB credentials', () => {
      const routePath = path.join(__dirname, '../app/api/demo/run/route.ts')
      const content = fs.readFileSync(routePath, 'utf8')
      expect(content).toContain('getAuthUserId')
      expect(content.toLowerCase()).not.toContain('fub_api_key')
      expect(content.toLowerCase()).not.toContain('twilio_auth_token')
    })

    it('has DEMO_LIMIT set to 3', () => {
      const routePath = path.join(__dirname, '../app/api/demo/run/route.ts')
      const content = fs.readFileSync(routePath, 'utf8')
      expect(content).toMatch(/DEMO_LIMIT\s*=\s*3/)
    })

    it('logs demo run to demo_runs table', () => {
      const routePath = path.join(__dirname, '../app/api/demo/run/route.ts')
      const content = fs.readFileSync(routePath, 'utf8')
      expect(content).toContain("'demo_runs'")
      expect(content).toContain('agent_id')
      expect(content).toContain('ai_response')
      expect(content).toContain('response_time_ms')
    })
  })

  describe('POST /api/onboarding/complete', () => {
    it('returns 401 when not authenticated', async () => {
      const { getAuthUserId } = require('@/lib/auth')
      getAuthUserId.mockResolvedValue(null)

      const req = makeRequest({ completionPayload: { ahaCompleted: true } })
      const res = await onboardingCompletePost(req as NextRequest)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('returns success when authenticated', async () => {
      const { getAuthUserId } = require('@/lib/auth')
      getAuthUserId.mockResolvedValue('agent-uuid-123')

      mockEq.mockResolvedValue({ data: null, error: null })

      const req = makeRequest({
        completionPayload: {
          ahaCompleted: true,
          ahaResponseTimeMs: 2500,
          stepsCompleted: ['welcome', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation'],
        },
      })
      const res = await onboardingCompletePost(req as NextRequest)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.onboardingCompletedAt).toBeDefined()
      expect(data.agentId).toBe('agent-uuid-123')
    })

    it('updates aha_completed and aha_response_time_ms', async () => {
      const { getAuthUserId } = require('@/lib/auth')
      getAuthUserId.mockResolvedValue('agent-uuid-456')

      mockEq.mockResolvedValue({ data: null, error: null })

      const req = makeRequest({
        completionPayload: {
          ahaCompleted: true,
          ahaResponseTimeMs: 3200,
        },
      })
      await onboardingCompletePost(req as NextRequest)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          onboarding_completed: true,
          aha_completed: true,
          aha_response_time_ms: 3200,
        })
      )
    })

    it('handles missing completion payload gracefully', async () => {
      const { getAuthUserId } = require('@/lib/auth')
      getAuthUserId.mockResolvedValue('agent-no-payload')

      mockEq.mockResolvedValue({ data: null, error: null })

      const req = makeRequest({})
      const res = await onboardingCompletePost(req as NextRequest)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('uses getAuthUserId from auth helper', () => {
      const routePath = path.join(
        __dirname,
        '../app/api/onboarding/complete/route.ts'
      )
      const content = fs.readFileSync(routePath, 'utf8')
      expect(content).toContain('getAuthUserId')
    })
  })

  describe('Confirmation step shows aha moment status (FR-3)', () => {
    const confirmPath = path.join(
      __dirname,
      '../app/onboarding/steps/confirmation.tsx'
    )

    it('confirmation.tsx shows aha completed status', () => {
      const content = fs.readFileSync(confirmPath, 'utf8')
      expect(content).toContain('ahaCompleted')
      expect(content).toContain('ahaResponseTimeMs')
      expect(content).toContain('AI Demo Response')
    })

    it('confirmation.tsx shows "Saw AI respond in X.Xs" label when completed', () => {
      const content = fs.readFileSync(confirmPath, 'utf8')
      expect(content).toContain('Saw AI respond in')
      expect(content).toContain('formatResponseTime')
    })

    it('confirmation.tsx shows "Skipped for now" when not completed', () => {
      const content = fs.readFileSync(confirmPath, 'utf8')
      expect(content).toContain('Skipped for now')
    })

    it('confirmation.tsx shows completion timestamp', () => {
      const content = fs.readFileSync(confirmPath, 'utf8')
      expect(content).toContain('completionTimestamp')
    })
  })

  describe('Onboarding wizard wires simulator before FUB (AC-5)', () => {
    it('onboarding page.tsx has simulator step before confirmation', () => {
      const pagePath = path.join(
        __dirname,
        '../app/dashboard/onboarding/page.tsx'
      )
      const content = fs.readFileSync(pagePath, 'utf8')
      const simIndex = content.indexOf("'simulator'")
      const confirmIndex = content.indexOf("'confirmation'")
      expect(simIndex).toBeGreaterThan(-1)
      expect(confirmIndex).toBeGreaterThan(-1)
      expect(simIndex).toBeLessThan(confirmIndex)
    })

    it('onboarding page.tsx calls /api/onboarding/complete on completion', () => {
      const pagePath = path.join(
        __dirname,
        '../app/dashboard/onboarding/page.tsx'
      )
      const content = fs.readFileSync(pagePath, 'utf8')
      expect(content).toContain('/api/onboarding/complete')
    })

    it('simulator step component exists', () => {
      const simPath = path.join(
        __dirname,
        '../app/onboarding/steps/simulator.tsx'
      )
      expect(fs.existsSync(simPath)).toBe(true)
    })

    it('simulator uses /api/onboarding/simulator endpoint (no FUB required)', () => {
      const simPath = path.join(
        __dirname,
        '../app/onboarding/steps/simulator.tsx'
      )
      const content = fs.readFileSync(simPath, 'utf8')
      expect(content).toContain('/api/onboarding/simulator')
      expect(content.toLowerCase()).not.toContain('fub')
    })
  })

  describe('Demo UI accessible at /dashboard/demo (AC-5)', () => {
    it('/dashboard/demo page exists', () => {
      const pagePath = path.join(
        __dirname,
        '../app/dashboard/demo/page.tsx'
      )
      expect(fs.existsSync(pagePath)).toBe(true)
    })

    it('dashboard demo page calls /api/demo/run', () => {
      const pagePath = path.join(
        __dirname,
        '../app/dashboard/demo/page.tsx'
      )
      const content = fs.readFileSync(pagePath, 'utf8')
      expect(content).toContain('/api/demo/run')
    })

    it('LeadFeed empty state has demo CTA (no leads yet)', () => {
      const feedPath = path.join(
        __dirname,
        '../components/dashboard/LeadFeed.tsx'
      )
      const content = fs.readFileSync(feedPath, 'utf8')
      expect(content).toContain('/dashboard/demo')
    })

    it('demo status endpoint exists', () => {
      const statusPath = path.join(
        __dirname,
        '../app/api/demo/status/route.ts'
      )
      expect(fs.existsSync(statusPath)).toBe(true)
    })
  })

  describe('Database migration (FR schema)', () => {
    it('migration 005_demo_mode.sql exists', () => {
      const migPath = path.join(
        __dirname,
        '../../../../migrations/005_demo_mode.sql'
      )
      expect(fs.existsSync(migPath)).toBe(true)
    })

    it('migration adds demo_runs_used column', () => {
      const migPath = path.join(
        __dirname,
        '../../../../migrations/005_demo_mode.sql'
      )
      const content = fs.readFileSync(migPath, 'utf8')
      expect(content).toContain('demo_runs_used')
    })

    it('migration creates demo_runs table', () => {
      const migPath = path.join(
        __dirname,
        '../../../../migrations/005_demo_mode.sql'
      )
      const content = fs.readFileSync(migPath, 'utf8')
      expect(content).toContain('CREATE TABLE IF NOT EXISTS demo_runs')
      expect(content).toContain('agent_id')
      expect(content).toContain('ai_response')
      expect(content).toContain('response_time_ms')
    })
  })
})
