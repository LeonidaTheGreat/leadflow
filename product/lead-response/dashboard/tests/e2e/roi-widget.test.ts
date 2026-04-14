/**
 * Spec:
 * What:
 * - Create product/lead-response/dashboard/tests/e2e/roi-widget.test.ts.
 * - Verify RoiMetricsWidget empty-state branch in components/dashboard/RoiMetricsWidget.tsx
 *   renders the Connect FUB CTA when hasData=false.
 * - Verify RoiMetricsWidget data branch contains and renders all required ROI metric fields
 *   when hasData=true.
 * - Verify app/api/metrics/roi/route.ts GET() rejects unauthenticated requests with 401.
 * Verify:
 * - Run: cd product/lead-response/dashboard && npm test -- --runInBand tests/e2e/roi-widget.test.ts
 * - Expected: all tests pass.
 * - Run: cd product/lead-response/dashboard && npm run build
 * - Expected: Next.js build completes successfully.
 * - Run: rg -n "Connect Follow Up Boss|metrics\.hasData|status: 401" product/lead-response/dashboard/components/dashboard/RoiMetricsWidget.tsx product/lead-response/dashboard/app/api/metrics/roi/route.ts
 * - Expected: required strings are present.
 * Boundaries:
 * - Do not modify ROI widget implementation, ROI API formulas, auth implementation, or database/service logic.
 * - Do not change unrelated tests, routes, or schema files.
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals'
import fs from 'fs'
import path from 'path'

jest.mock('@/lib/services/AuthService', () => ({
  getAuthUserId: jest.fn(),
}))

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

const ROOT = path.resolve(__dirname, '../..')
const WIDGET_PATH = path.join(ROOT, 'components/dashboard/RoiMetricsWidget.tsx')
let getAuthUserIdMock: jest.Mock
let getRoiMetrics: (request: any) => Promise<any>

describe('ROI widget e2e coverage', () => {
  beforeAll(() => {
    const authModule = require('@/lib/services/AuthService')
    getAuthUserIdMock = authModule.getAuthUserId as jest.Mock
    getRoiMetrics = require('@/app/api/metrics/roi/route').GET
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('contains empty state with Connect FUB button when hasData=false', () => {
    const src = fs.readFileSync(WIDGET_PATH, 'utf8')

    expect(src.includes('if (!metrics?.hasData)')).toBe(true)
    expect(src.includes('ROI Metrics Coming Soon')).toBe(true)
    expect(src.includes('Connect Follow Up Boss')).toBe(true)
    expect(src.includes('data-testid="connect-fub-button"')).toBe(true)
  })

  it('contains metric rendering branch when hasData=true', () => {
    const src = fs.readFileSync(WIDGET_PATH, 'utf8')

    expect(src.includes('Leads Responded')).toBe(true)
    expect(src.includes('Avg Response Time')).toBe(true)
    expect(src.includes('Appointments Booked')).toBe(true)
    expect(src.includes('Revenue Protected')).toBe(true)
    expect(src.includes('metrics.leadsResponded')).toBe(true)
    expect(src.includes('metrics.avgResponseTimeSeconds')).toBe(true)
    expect(src.includes('metrics.appointmentsBookedThisMonth')).toBe(true)
    expect(src.includes('metrics.estimatedRevenueProtected')).toBe(true)
    expect(src.includes('metrics.bookingRate.toFixed(1)')).toBe(true)
  })

  it('rejects unauthenticated ROI API requests with 401', async () => {
    getAuthUserIdMock.mockResolvedValue(null)

    const req = { method: 'GET' } as any
    const res = await getRoiMetrics(req)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })
})
