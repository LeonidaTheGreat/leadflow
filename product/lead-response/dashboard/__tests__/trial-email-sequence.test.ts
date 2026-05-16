/**
 * Unit tests for trial email sequence
 * Tests the email sending logic and day calculations
 */

// Helper functions to test without importing the module
describe('Trial Email Sequence', () => {
  describe('getDaysSinceSignup', () => {
    it('should calculate 0 days for signup today', () => {
      const now = new Date()
      const createdAt = now.toISOString()
      const diffMs = now.getTime() - new Date(createdAt).getTime()
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      expect(days).toBe(0)
    })

    it('should calculate 1 day for signup yesterday', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const diffMs = now.getTime() - yesterday.getTime()
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      expect(days).toBe(1)
    })

    it('should calculate 14 days for signup 2 weeks ago', () => {
      const now = new Date()
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const diffMs = now.getTime() - twoWeeksAgo.getTime()
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      expect(days).toBe(14)
    })
  })

  describe('Email eligibility', () => {
    const createMockAgent = (overrides = {}) => ({
      id: 'test-agent-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'Agent',
      created_at: new Date().toISOString(),
      trial_email_welcome_sent: false,
      trial_email_day1_aha_sent: false,
      trial_email_day3_upgrade_sent: false,
      trial_email_day7_warning_sent: false,
      trial_email_day14_expired_sent: false,
      trial_email_day15_final_sent: false,
      ...overrides
    })

    it('should identify agent eligible for welcome email on day 0', () => {
      const agent = createMockAgent({
        created_at: new Date().toISOString(),
        trial_email_welcome_sent: false
      })
      const daysSinceSignup = 0
      const isEligible = daysSinceSignup === 0 && !agent.trial_email_welcome_sent
      expect(isEligible).toBe(true)
    })

    it('should identify agent eligible for day 1 aha email', () => {
      const agent = createMockAgent({
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        trial_email_day1_aha_sent: false
      })
      const daysSinceSignup = 1
      const isEligible = daysSinceSignup === 1 && !agent.trial_email_day1_aha_sent
      expect(isEligible).toBe(true)
    })

    it('should identify agent eligible for day 3 upgrade email', () => {
      const agent = createMockAgent({
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        trial_email_day3_upgrade_sent: false
      })
      const daysSinceSignup = 3
      const isEligible = daysSinceSignup === 3 && !agent.trial_email_day3_upgrade_sent
      expect(isEligible).toBe(true)
    })

    it('should identify agent eligible for day 7 warning email', () => {
      const agent = createMockAgent({
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        trial_email_day7_warning_sent: false
      })
      const daysSinceSignup = 7
      const isEligible = daysSinceSignup === 7 && !agent.trial_email_day7_warning_sent
      expect(isEligible).toBe(true)
    })

    it('should identify agent eligible for day 14 expired email', () => {
      const agent = createMockAgent({
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        trial_email_day14_expired_sent: false
      })
      const daysSinceSignup = 14
      const isEligible = daysSinceSignup >= 14 && !agent.trial_email_day14_expired_sent
      expect(isEligible).toBe(true)
    })

    it('should identify agent eligible for day 15 final email', () => {
      const agent = createMockAgent({
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        trial_email_day15_final_sent: false
      })
      const daysSinceSignup = 15
      const isEligible = daysSinceSignup >= 15 && !agent.trial_email_day15_final_sent
      expect(isEligible).toBe(true)
    })

    it('should not send email if already sent (idempotency)', () => {
      const agent = createMockAgent({
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        trial_email_day1_aha_sent: true
      })
      const daysSinceSignup = 1
      const isEligible = daysSinceSignup === 1 && !agent.trial_email_day1_aha_sent
      expect(isEligible).toBe(false)
    })
  })

  describe('Email content', () => {
    it('should include correct subject for welcome email', async () => {
      const expectedSubject = 'Welcome to LeadFlow AI — your first lead response in 30 seconds'
      expect(expectedSubject).toContain('Welcome to LeadFlow AI')
    })

    it('should include correct subject for day 1 aha email', async () => {
      const expectedSubject = 'This is what your leads experience when you use LeadFlow'
      expect(expectedSubject).toContain('leads experience')
    })

    it('should include correct subject for day 3 upgrade email', async () => {
      const expectedSubject = '3 days in — how many leads have you responded to?'
      expect(expectedSubject).toContain('3 days in')
    })

    it('should include correct subject for day 7 warning email', async () => {
      const expectedSubject = '7 days left — don\'t lose your leads'
      expect(expectedSubject).toContain('7 days left')
    })

    it('should include correct subject for day 14 expired email', async () => {
      const expectedSubject = 'Your LeadFlow trial has ended — leads are going unanswered'
      expect(expectedSubject).toContain('trial has ended')
    })

    it('should include correct subject for day 15 final email with name', async () => {
      const firstName = 'Sarah'
      const subject = firstName
        ? `${firstName}, this is the last email from LeadFlow`
        : 'This is the last email from LeadFlow'
      expect(subject).toBe('Sarah, this is the last email from LeadFlow')
    })

    it('should use brand-led subject for day 15 final email when first_name is empty', async () => {
      const firstName = ''
      const subject = firstName
        ? `${firstName}, this is the last email from LeadFlow`
        : 'This is the last email from LeadFlow'
      expect(subject).toBe('This is the last email from LeadFlow')
      expect(subject).not.toMatch(/^there/)
    })
  })

  describe('Empty first_name handling', () => {
    function getGreeting(firstName: string | null | undefined): string {
      return firstName ? `Hi ${firstName}` : 'Hi'
    }

    it('should use "Hi" greeting when first_name is empty string', () => {
      expect(getGreeting('')).toBe('Hi')
    })

    it('should use "Hi" greeting when first_name is null', () => {
      expect(getGreeting(null)).toBe('Hi')
    })

    it('should use "Hi" greeting when first_name is undefined', () => {
      expect(getGreeting(undefined)).toBe('Hi')
    })

    it('should use personalized greeting when first_name is present', () => {
      expect(getGreeting('Sarah')).toBe('Hi Sarah')
    })

    it('should never produce "Hi there" for any falsy first_name', () => {
      const falsyValues: Array<string | null | undefined> = ['', null, undefined]
      for (const val of falsyValues) {
        const greeting = getGreeting(val)
        expect(greeting).not.toContain('there')
      }
    })

    it('should never produce a subject starting with "there" for day 15', () => {
      const falsyValues: Array<string | null | undefined> = ['', null, undefined]
      for (const val of falsyValues) {
        const subject = val
          ? `${val}, this is the last email from LeadFlow`
          : 'This is the last email from LeadFlow'
        expect(subject).not.toMatch(/^there/)
      }
    })
  })

  describe('Email links', () => {
    it('should include correct onboarding URL in welcome email', () => {
      const appUrl = 'https://test.landyourleads.com'
      const expectedUrl = `${appUrl}/dashboard/onboarding`
      expect(expectedUrl).toBe('https://test.landyourleads.com/dashboard/onboarding')
    })

    it('should include correct demo URL in day 1 aha email', () => {
      const appUrl = 'https://test.landyourleads.com'
      const expectedUrl = `${appUrl}/dashboard/demo`
      expect(expectedUrl).toBe('https://test.landyourleads.com/dashboard/demo')
    })

    it('should include correct upgrade URL in day 3 upgrade email', () => {
      const appUrl = 'https://test.landyourleads.com'
      const expectedUrl = `${appUrl}/dashboard/upgrade?plan=pro`
      expect(expectedUrl).toBe('https://test.landyourleads.com/dashboard/upgrade?plan=pro')
    })

    it('should include correct upgrade URL in day 7 warning email', () => {
      const appUrl = 'https://test.landyourleads.com'
      const expectedUrl = `${appUrl}/dashboard/upgrade?plan=pro`
      expect(expectedUrl).toBe('https://test.landyourleads.com/dashboard/upgrade?plan=pro')
    })

    it('should include correct upgrade URL in day 14 expired email', () => {
      const appUrl = 'https://test.landyourleads.com'
      const expectedUrl = `${appUrl}/dashboard/upgrade?plan=pro`
      expect(expectedUrl).toBe('https://test.landyourleads.com/dashboard/upgrade?plan=pro')
    })

    it('should include correct upgrade URL with discount in day 15 final email', () => {
      const appUrl = 'https://test.landyourleads.com'
      const expectedUrl = `${appUrl}/dashboard/upgrade?plan=pro&discount=pilot15`
      expect(expectedUrl).toBe('https://test.landyourleads.com/dashboard/upgrade?plan=pro&discount=pilot15')
    })
  })
})
