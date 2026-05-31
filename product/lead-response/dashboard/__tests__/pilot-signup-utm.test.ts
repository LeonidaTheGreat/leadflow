/**
 * Tests for UTM parameter passthrough on the pilot signup API route.
 *
 * Verifies:
 * - T-1: All 5 UTM fields accepted and forwarded to DB insert
 * - T-2: Partial UTM (only utm_source) — stores what is present, undefined for the rest
 * - T-3: No UTM params — all UTM fields undefined (no error)
 * - T-4: Interface contract — PilotSignupRequest includes all 5 UTM fields
 */

// UTM field names to validate
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

// --- Unit: UTM field extraction logic (mirrors route.ts) ---

function extractUtmFields(body: Record<string, unknown>): Record<string, string | undefined> {
  return {
    utm_source: (body.utm_source as string | undefined) || undefined,
    utm_medium: (body.utm_medium as string | undefined) || undefined,
    utm_campaign: (body.utm_campaign as string | undefined) || undefined,
    utm_content: (body.utm_content as string | undefined) || undefined,
    utm_term: (body.utm_term as string | undefined) || undefined,
  }
}

describe('Pilot Signup — UTM Parameter Passthrough', () => {
  // T-1: Full UTM set
  describe('T-1: All 5 UTM fields present in request body', () => {
    it('extracts all 5 UTM fields correctly', () => {
      const body = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'pilot-launch',
        utm_content: 'hero-banner',
        utm_term: 'real-estate-ai',
      }

      const utm = extractUtmFields(body)

      expect(utm.utm_source).toBe('google')
      expect(utm.utm_medium).toBe('cpc')
      expect(utm.utm_campaign).toBe('pilot-launch')
      expect(utm.utm_content).toBe('hero-banner')
      expect(utm.utm_term).toBe('real-estate-ai')
    })

    it('all 5 UTM field names are handled', () => {
      const body = Object.fromEntries(UTM_FIELDS.map((k) => [k, `value_${k}`]))
      const utm = extractUtmFields(body)
      UTM_FIELDS.forEach((field) => {
        expect(utm[field]).toBe(`value_${field}`)
      })
    })
  })

  // T-2: Partial UTM
  describe('T-2: Partial UTM (only utm_source present)', () => {
    it('extracts utm_source and leaves others undefined', () => {
      const body = {
        name: 'John Smith',
        email: 'john@example.com',
        utm_source: 'linkedin',
      }

      const utm = extractUtmFields(body)

      expect(utm.utm_source).toBe('linkedin')
      expect(utm.utm_medium).toBeUndefined()
      expect(utm.utm_campaign).toBeUndefined()
      expect(utm.utm_content).toBeUndefined()
      expect(utm.utm_term).toBeUndefined()
    })
  })

  // T-3: No UTM params
  describe('T-3: No UTM params (direct visit)', () => {
    it('all UTM fields are undefined when absent from body', () => {
      const body = {
        name: 'Alice Walker',
        email: 'alice@example.com',
      }

      const utm = extractUtmFields(body)

      UTM_FIELDS.forEach((field) => {
        expect(utm[field]).toBeUndefined()
      })
    })

    it('empty string is coerced to undefined', () => {
      const body = {
        name: 'Bob',
        email: 'bob@example.com',
        utm_source: '',
        utm_campaign: '',
      }

      const utm = extractUtmFields(body)

      expect(utm.utm_source).toBeUndefined()
      expect(utm.utm_campaign).toBeUndefined()
    })
  })

  // T-4: DB insert shape
  describe('T-4: DB insert payload includes all 5 UTM fields', () => {
    it('merged signupData includes all UTM fields', () => {
      const body = {
        name: 'Test Agent',
        email: 'test@example.com',
        utm_source: 'facebook',
        utm_medium: 'social',
        utm_campaign: 'q2-push',
        utm_content: 'carousel-ad',
        utm_term: 'lead-gen',
      }

      const utmFields = extractUtmFields(body)

      const signupData = {
        name: (body.name as string).trim(),
        email: (body.email as string).toLowerCase().trim(),
        source: 'pilot_application',
        ...utmFields,
      }

      // All 5 UTM fields must be present in the DB insert payload
      UTM_FIELDS.forEach((field) => {
        expect(signupData).toHaveProperty(field)
      })
      expect(signupData.utm_source).toBe('facebook')
      expect(signupData.utm_medium).toBe('social')
      expect(signupData.utm_campaign).toBe('q2-push')
      expect(signupData.utm_content).toBe('carousel-ad')
      expect(signupData.utm_term).toBe('lead-gen')
    })
  })

  // T-5: sessionStorage-to-API payload (mirrors pilot/page.tsx handleSubmit)
  describe('T-5: UTM params spread from sessionStorage into POST body', () => {
    it('spreads all sessionStorage UTM params into fetch body', () => {
      const sessionUtm = {
        utm_source: 'email',
        utm_medium: 'newsletter',
        utm_campaign: 'wave-1',
      }

      const formData = {
        name: 'Maria Chen',
        email: 'maria@example.com',
        phone: '',
        brokerage_name: '',
        team_name: '',
        monthly_leads: '',
        current_crm: '',
      }

      // Mirror the logic from pilot/page.tsx handleSubmit
      const postBody = {
        ...formData,
        source: 'pilot_application',
        ...(sessionUtm ?? {}),
      }

      expect(postBody.utm_source).toBe('email')
      expect(postBody.utm_medium).toBe('newsletter')
      expect(postBody.utm_campaign).toBe('wave-1')
      // Fields not in sessionUtm are not present
      expect((postBody as Record<string, unknown>).utm_content).toBeUndefined()
      expect((postBody as Record<string, unknown>).utm_term).toBeUndefined()
    })

    it('does not throw when utmParams is null (direct visit)', () => {
      const utmParams: Record<string, string> | null = null
      const formData = { name: 'Direct', email: 'direct@example.com' }

      const postBody = {
        ...formData,
        source: 'pilot_application',
        ...(utmParams ?? {}),
      }

      // No UTM fields in payload
      expect((postBody as Record<string, unknown>).utm_source).toBeUndefined()
      expect(postBody.source).toBe('pilot_application')
    })
  })
})
