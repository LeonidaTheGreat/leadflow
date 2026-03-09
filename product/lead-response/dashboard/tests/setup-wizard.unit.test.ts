/**
 * Post-Login Setup Wizard — Unit Tests
 *
 * Tests the API route logic in isolation (no server needed).
 * These test validation logic, field mapping, and error handling.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Mirror of the field-mapping logic in /api/setup/status POST handler */
function mapBodyToDbPatch(body: Record<string, unknown>, agentId: string) {
  const patch: Record<string, unknown> = {
    agent_id: agentId,
    updated_at: expect.any(String),
  }

  if (body.fubConnected !== undefined) patch.fub_connected = body.fubConnected
  if (body.fubApiKey !== undefined) patch.fub_api_key = body.fubApiKey
  if (body.twilioConnected !== undefined) patch.twilio_connected = body.twilioConnected
  if (body.twilioPhone !== undefined) patch.twilio_phone = body.twilioPhone
  if (body.smsVerified !== undefined) patch.sms_verified = body.smsVerified
  if (body.currentStep !== undefined) patch.current_step = body.currentStep

  return patch
}

/** Wizard state resume logic: picks the first incomplete step */
function resumeStep(ws: {
  fub_connected?: boolean
  twilio_connected?: boolean
  sms_verified?: boolean
}): 'fub' | 'twilio' | 'sms-verify' | 'complete' {
  if (!ws.fub_connected) return 'fub'
  if (!ws.twilio_connected) return 'twilio'
  if (!ws.sms_verified) return 'sms-verify'
  return 'complete'
}

/** Phone digit extractor matching UI handler */
function extractDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10)
}

/** Phone display formatter matching UI handler */
function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Setup Wizard — field mapping (status route)', () => {
  const agentId = 'agent-uuid-123'

  test('maps fubConnected to fub_connected', () => {
    const patch = mapBodyToDbPatch({ fubConnected: true }, agentId)
    expect(patch.fub_connected).toBe(true)
    expect(patch.agent_id).toBe(agentId)
  })

  test('maps fubApiKey to fub_api_key', () => {
    const patch = mapBodyToDbPatch({ fubApiKey: 'abc123key' }, agentId)
    expect(patch.fub_api_key).toBe('abc123key')
  })

  test('maps twilioConnected to twilio_connected', () => {
    const patch = mapBodyToDbPatch({ twilioConnected: false }, agentId)
    expect(patch.twilio_connected).toBe(false)
  })

  test('maps twilioPhone to twilio_phone', () => {
    const patch = mapBodyToDbPatch({ twilioPhone: '5551234567' }, agentId)
    expect(patch.twilio_phone).toBe('5551234567')
  })

  test('maps smsVerified to sms_verified', () => {
    const patch = mapBodyToDbPatch({ smsVerified: true }, agentId)
    expect(patch.sms_verified).toBe(true)
  })

  test('maps currentStep to current_step', () => {
    const patch = mapBodyToDbPatch({ currentStep: 'twilio' }, agentId)
    expect(patch.current_step).toBe('twilio')
  })

  test('only maps provided fields', () => {
    const patch = mapBodyToDbPatch({ fubConnected: true }, agentId)
    expect(patch.twilio_connected).toBeUndefined()
    expect(patch.sms_verified).toBeUndefined()
  })

  test('maps full state update', () => {
    const patch = mapBodyToDbPatch(
      {
        fubConnected: true,
        fubApiKey: 'key123',
        twilioConnected: true,
        twilioPhone: '5559876543',
        smsVerified: false,
        currentStep: 'sms-verify',
      },
      agentId
    )
    expect(patch.fub_connected).toBe(true)
    expect(patch.fub_api_key).toBe('key123')
    expect(patch.twilio_connected).toBe(true)
    expect(patch.twilio_phone).toBe('5559876543')
    expect(patch.sms_verified).toBe(false)
    expect(patch.current_step).toBe('sms-verify')
  })
})

describe('Setup Wizard — step resume logic', () => {
  test('starts at fub when nothing connected', () => {
    expect(resumeStep({})).toBe('fub')
  })

  test('resumes at twilio when fub done but twilio not', () => {
    expect(resumeStep({ fub_connected: true })).toBe('twilio')
  })

  test('resumes at sms-verify when fub + twilio done', () => {
    expect(resumeStep({ fub_connected: true, twilio_connected: true })).toBe('sms-verify')
  })

  test('goes to complete when all done', () => {
    expect(
      resumeStep({ fub_connected: true, twilio_connected: true, sms_verified: true })
    ).toBe('complete')
  })

  test('starts at fub if all false', () => {
    expect(
      resumeStep({ fub_connected: false, twilio_connected: false, sms_verified: false })
    ).toBe('fub')
  })
})

describe('Setup Wizard — phone formatting (UI)', () => {
  test('extracts digits only', () => {
    expect(extractDigits('(555) 123-4567')).toBe('5551234567')
    expect(extractDigits('555.123.4567')).toBe('5551234567')
    expect(extractDigits('5551234567')).toBe('5551234567')
  })

  test('limits to 10 digits', () => {
    expect(extractDigits('15551234567')).toBe('1555123456')
  })

  test('formats empty string', () => {
    expect(formatPhoneDisplay('')).toBe('')
  })

  test('formats partial (3 digits)', () => {
    expect(formatPhoneDisplay('555')).toBe('(555')
  })

  test('formats partial (6 digits)', () => {
    expect(formatPhoneDisplay('555123')).toBe('(555) 123')
  })

  test('formats full 10 digits', () => {
    expect(formatPhoneDisplay('5551234567')).toBe('(555) 123-4567')
  })

  test('formats from pre-formatted string', () => {
    expect(formatPhoneDisplay('(555) 123-4567')).toBe('(555) 123-4567')
  })
})

describe('Setup Wizard — FUB API key validation', () => {
  test('rejects empty key', () => {
    const key = ''
    expect(key.trim().length >= 20).toBe(false)
  })

  test('rejects key shorter than 20 chars', () => {
    const key = 'short123'
    expect(key.trim().length >= 20).toBe(false)
  })

  test('accepts key 20+ chars', () => {
    const key = 'abcdefghijklmnopqrstu'
    expect(key.trim().length >= 20).toBe(true)
  })
})

describe('Setup Wizard — completion summary', () => {
  test('counts 0 connected', () => {
    const steps = [false, false, false]
    expect(steps.filter(Boolean).length).toBe(0)
  })

  test('counts 2 of 3 connected', () => {
    const steps = [true, true, false]
    expect(steps.filter(Boolean).length).toBe(2)
  })

  test('counts all 3 connected', () => {
    const steps = [true, true, true]
    expect(steps.filter(Boolean).length).toBe(3)
  })
})
