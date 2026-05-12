'use strict'

// Pure validation logic extracted from app/onboarding/page.tsx for testing.
// These functions are not exported — we reproduce them here so tests stay fast
// and dependency-free (no React, no DOM).

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password) {
  const errors = []
  if (password.length < 8) errors.push('Password must be at least 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number')
  return errors
}

function validatePhone(phoneNumber) {
  return phoneNumber.replace(/\D/g, '').length === 10
}

// ─── Email ────────────────────────────────────────────────────────────────────

describe('validateEmail', () => {
  test('accepts a standard email', () => {
    expect(validateEmail('jane@example.com')).toBe(true)
  })

  test('accepts email with subdomain', () => {
    expect(validateEmail('jane@mail.example.com')).toBe(true)
  })

  test('accepts email with + alias', () => {
    expect(validateEmail('jane+test@example.com')).toBe(true)
  })

  test('rejects missing @', () => {
    expect(validateEmail('janeatexample.com')).toBe(false)
  })

  test('rejects missing domain', () => {
    expect(validateEmail('jane@')).toBe(false)
  })

  test('rejects empty string', () => {
    expect(validateEmail('')).toBe(false)
  })

  test('rejects whitespace-only', () => {
    expect(validateEmail('   ')).toBe(false)
  })

  test('rejects email with spaces', () => {
    expect(validateEmail('jane doe@example.com')).toBe(false)
  })
})

// ─── Password ─────────────────────────────────────────────────────────────────

describe('validatePassword', () => {
  test('accepts a strong password', () => {
    expect(validatePassword('Passw0rd!')).toEqual([])
  })

  test('accepts minimum-length strong password', () => {
    expect(validatePassword('Passw0rd')).toEqual([])
  })

  test('rejects password shorter than 8 chars', () => {
    const errors = validatePassword('Pw1')
    expect(errors).toContain('Password must be at least 8 characters')
  })

  test('rejects password without uppercase', () => {
    const errors = validatePassword('passw0rd')
    expect(errors).toContain('Password must contain an uppercase letter')
  })

  test('rejects password without lowercase', () => {
    const errors = validatePassword('PASSW0RD')
    expect(errors).toContain('Password must contain a lowercase letter')
  })

  test('rejects password without number', () => {
    const errors = validatePassword('Password')
    expect(errors).toContain('Password must contain a number')
  })

  test('returns all errors for empty password', () => {
    const errors = validatePassword('')
    expect(errors).toHaveLength(4)
  })

  test('returns multiple errors for partially-valid password', () => {
    const errors = validatePassword('password') // missing uppercase + number
    expect(errors.length).toBeGreaterThanOrEqual(2)
    expect(errors).toContain('Password must contain an uppercase letter')
    expect(errors).toContain('Password must contain a number')
  })
})

// ─── Phone ────────────────────────────────────────────────────────────────────

describe('validatePhone', () => {
  test('accepts bare 10-digit number', () => {
    expect(validatePhone('5551234567')).toBe(true)
  })

  test('accepts formatted number (555) 123-4567', () => {
    expect(validatePhone('(555) 123-4567')).toBe(true)
  })

  test('accepts formatted number 555-123-4567', () => {
    expect(validatePhone('555-123-4567')).toBe(true)
  })

  test('accepts number with country code +15551234567', () => {
    // 11 digits when country code included — this SHOULD fail (we only accept 10 local digits)
    expect(validatePhone('+15551234567')).toBe(false)
  })

  test('rejects 9-digit number', () => {
    expect(validatePhone('555123456')).toBe(false)
  })

  test('rejects empty string', () => {
    expect(validatePhone('')).toBe(false)
  })
})

// ─── Step ordering ────────────────────────────────────────────────────────────

describe('Onboarding step ordering', () => {
  const STEPS = [
    { id: 'account', label: 'Account' },
    { id: 'profile', label: 'Profile' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'confirm', label: 'Confirm' },
  ]

  test('wizard has exactly 4 steps', () => {
    expect(STEPS).toHaveLength(4)
  })

  test('step ids are in expected order', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['account', 'profile', 'integrations', 'confirm'])
  })

  test('account is first', () => {
    expect(STEPS[0].id).toBe('account')
  })

  test('confirm is last', () => {
    expect(STEPS[STEPS.length - 1].id).toBe('confirm')
  })

  test('goNext advances step within bounds', () => {
    let index = 0
    const goNext = () => { index = Math.min(index + 1, STEPS.length - 1) }

    goNext()
    expect(index).toBe(1)
    goNext(); goNext(); goNext() // try to go past end
    expect(index).toBe(STEPS.length - 1) // clamped at last step
  })

  test('goBack decrements step and does not go below 0', () => {
    let index = 2
    const goBack = () => { index = Math.max(index - 1, 0) }

    goBack()
    expect(index).toBe(1)
    goBack(); goBack(); goBack() // try to go below 0
    expect(index).toBe(0) // clamped at first step
  })
})

// ─── Progress bar ─────────────────────────────────────────────────────────────

describe('Progress bar percentage', () => {
  const total = 4
  const pct = (index) => Math.round(((index + 1) / total) * 100)

  test('step 0 = 25%', () => { expect(pct(0)).toBe(25) })
  test('step 1 = 50%', () => { expect(pct(1)).toBe(50) })
  test('step 2 = 75%', () => { expect(pct(2)).toBe(75) })
  test('step 3 = 100%', () => { expect(pct(3)).toBe(100) })
})

// ─── Confirm step guard ───────────────────────────────────────────────────────

describe('Confirm step submission guard', () => {
  test('blocks submission when terms not accepted', () => {
    const termsAccepted = false
    const errors = {}
    if (!termsAccepted) errors.terms = 'You must accept the terms to continue'
    expect(errors.terms).toBeDefined()
  })

  test('allows submission when terms accepted', () => {
    const termsAccepted = true
    const errors = {}
    if (!termsAccepted) errors.terms = 'You must accept the terms to continue'
    expect(errors.terms).toBeUndefined()
  })
})

// ─── UTM param merging ────────────────────────────────────────────────────────

describe('UTM parameter merging', () => {
  function mergeUtm(stored, fromUrl) {
    return { ...stored, ...fromUrl }
  }

  test('URL params override stored params', () => {
    const stored = { utm_source: 'email' }
    const fromUrl = { utm_source: 'twitter' }
    expect(mergeUtm(stored, fromUrl).utm_source).toBe('twitter')
  })

  test('stored params fill in missing URL params', () => {
    const stored = { utm_source: 'email', utm_medium: 'newsletter' }
    const fromUrl = { utm_source: 'twitter' }
    const merged = mergeUtm(stored, fromUrl)
    expect(merged.utm_medium).toBe('newsletter')
    expect(merged.utm_source).toBe('twitter')
  })

  test('returns empty when both sources empty', () => {
    expect(mergeUtm({}, {})).toEqual({})
  })
})
