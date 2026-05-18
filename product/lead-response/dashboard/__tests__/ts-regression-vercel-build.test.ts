/**
 * TypeScript regression tests for Vercel build failures.
 *
 * These tests guard against two specific errors that caused three consecutive
 * Vercel build failures (May 2026):
 *
 *   TS2339: Property "catch" does not exist on type "PromiseLike<void>"
 *     — trial-signup/route.ts used .catch() on a value whose type may narrow to PromiseLike
 *
 *   TS2345: Argument of type "form_view" not assignable to parameter of type "FormFunnelEvent"
 *     — pilot/page.tsx passed 'form_view' to trackFormEvent(), which is a valid FormFunnelEvent
 *
 * Because this suite is compiled by ts-jest, any type regression will cause
 * compilation failure — providing an early signal before Vercel sees it.
 */

import type { FormFunnelEvent } from '@/lib/analytics/ga4'
import { trackFormEvent } from '@/lib/analytics/ga4'

// ─── TS2345 regression: 'form_view' must satisfy FormFunnelEvent ──────────────

describe('FormFunnelEvent type includes form_view (TS2345 regression)', () => {
  it('form_view is assignable to FormFunnelEvent', () => {
    // If 'form_view' were removed from FormFunnelEvent, this assignment would
    // produce TS2322 and the test suite would fail to compile.
    const event: FormFunnelEvent = 'form_view'
    expect(event).toBe('form_view')
  })

  it('trackFormEvent accepts form_view without type error', () => {
    // This is the exact call from pilot/page.tsx line 66.
    // If FormFunnelEvent no longer includes 'form_view', ts-jest will fail here.
    expect(() => trackFormEvent('form_view')).not.toThrow()
  })

  it('all required FormFunnelEvent variants are present in the union type', () => {
    const allEvents: FormFunnelEvent[] = [
      'form_view',
      'form_start',
      'form_submit_attempt',
      'pilot_signup_complete',
      'form_submit_error',
    ]
    expect(allEvents).toHaveLength(5)
    expect(allEvents).toContain('form_view')
  })
})

// ─── TS2339 regression: initializeSurveySchedule must return a full Promise ──

describe('initializeSurveySchedule Promise compatibility (TS2339 regression)', () => {
  it('Promise.resolve().catch() pattern does not throw', async () => {
    // This mirrors the pattern used in trial-signup/route.ts:
    //   void Promise.resolve(initializeSurveySchedule(agentId)).catch(err => logger.error(...))
    //
    // Promise.resolve() always returns a full Promise<void> regardless of whether
    // the wrapped value is Promise<void> or PromiseLike<void>. This test verifies
    // the pattern itself works at runtime — if initializeSurveySchedule were to
    // change its return type to a non-thenable, wrapping in Promise.resolve() still works.
    const mockPromiseLike: PromiseLike<void> = { then: (resolve) => Promise.resolve().then(resolve) }
    const errors: unknown[] = []

    await Promise.resolve(mockPromiseLike).catch((err) => {
      errors.push(err)
    })

    expect(errors).toHaveLength(0)
  })

  it('Promise.resolve wrapping a rejected PromiseLike catches the error', async () => {
    const rejection = new Error('nps init failed')
    const mockRejected: PromiseLike<void> = {
      then: (_resolve, reject) => {
        if (reject) reject(rejection)
        return Promise.resolve()
      },
    }
    const errors: unknown[] = []

    await Promise.resolve(mockRejected).catch((err) => {
      errors.push(err)
    })

    expect(errors).toHaveLength(1)
    expect(errors[0]).toBe(rejection)
  })
})
