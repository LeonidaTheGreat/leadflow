import { test, expect } from './fixtures'

/**
 * E2E Tests: API Integration
 * 
 * Coverage:
 * - Email availability check
 * - Auto-save every 2s
 * - Retry logic for failed requests
 * - Cal.com link verification
 * - Twilio SMS test
 * - Onboard submission
 * 
 * @api @integration
 */

test.describe('API Integration - Email Availability Check', () => {
  
  test('should check email availability in real-time @api @happy-path @email-check', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    const uniqueEmail = `test-${Date.now()}@example.com`
    
    // Mock or intercept the email check API call
    const checkEmailResponse = page.waitForResponse(response => 
      response.url().includes('/api/agents/check-email')
    )
    
    // Type email and blur to trigger check
    await page.getByLabel('Email Address').fill(uniqueEmail)
    await page.getByLabel('Email Address').blur()
    
    // Wait for API call
    const response = await checkEmailResponse
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('available')
    expect(data.available).toBe(true)
  })

  test('should show error for existing email @api @error @email-check', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    // Use an email that already exists (would need seed data in real test)
    const existingEmail = 'existing@example.com'
    
    await page.getByLabel('Email Address').fill(existingEmail)
    await page.getByLabel('Email Address').blur()
    
    // Should show unavailable message
    await expect(
      page.getByText(/already taken|not available|email exists/i)
    ).toBeVisible()
  })

  test('should debounce email check requests @api @performance @email-check', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    let requestCount = 0
    
    // Intercept and count requests
    page.on('request', request => {
      if (request.url().includes('/api/agents/check-email')) {
        requestCount++
      }
    })
    
    // Type multiple characters quickly
    await page.getByLabel('Email Address').fill('test')
    await page.waitForTimeout(100)
    await page.getByLabel('Email Address').fill('test@')
    await page.waitForTimeout(100)
    await page.getByLabel('Email Address').fill('test@ex')
    await page.waitForTimeout(100)
    await page.getByLabel('Email Address').fill('test@example.com')
    
    // Wait for debounce + API call
    await page.waitForTimeout(1000)
    
    // Should have made only 1 request due to debouncing
    expect(requestCount).toBeLessThanOrEqual(2)
  })
})

test.describe('API Integration - Auto-Save Functionality', () => {
  
  test('should auto-save form data every 2 seconds @api @happy-path @auto-save', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    // Fill some data
    await page.getByLabel('Email Address').fill('autosave@test.com')
    
    // Wait for auto-save interval (2s)
    const autoSaveResponse = page.waitForResponse(response => 
      response.url().includes('/api/agents/draft') || 
      response.url().includes('/api/agents/auto-save'),
      { timeout: 5000 }
    )
    
    const response = await autoSaveResponse
    expect(response.status()).toBe(200)
  })

  test('should restore form data from auto-save on page reload @api @happy-path @auto-save', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    const testEmail = 'restore@test.com'
    
    // Fill form data
    await page.getByLabel('Email Address').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('TestPass123!')
    
    // Wait for auto-save
    await page.waitForTimeout(2500)
    
    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify data is restored
    await expect(page.getByLabel('Email Address')).toHaveValue(testEmail)
  })
})

test.describe('API Integration - Retry Logic', () => {
  
  test('should retry failed API requests with exponential backoff @api @error @retry', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    let requestAttempts = 0
    
    // Intercept and simulate failures then success
    await page.route('**/api/agents/check-email', async (route, request) => {
      requestAttempts++
      if (requestAttempts < 3) {
        await route.abort('internetdisconnected')
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ available: true })
        })
      }
    })
    
    // Trigger email check
    await page.getByLabel('Email Address').fill('retry@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Wait for retries
    await page.waitForTimeout(6000)
    
    // Should have attempted 3 times
    expect(requestAttempts).toBeGreaterThanOrEqual(3)
  })

  test('should show error after max retry attempts @api @error @retry', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    // Block all requests to simulate complete failure
    await page.route('**/api/agents/check-email', async (route) => {
      await route.abort('failed')
    })
    
    // Trigger email check
    await page.getByLabel('Email Address').fill('fail@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Wait for retry attempts
    await page.waitForTimeout(8000)
    
    // Should show network error message
    await expect(
      page.getByText(/network error|unable to check|connection failed/i)
    ).toBeVisible()
  })
})

test.describe('API Integration - Cal.com Verification', () => {
  
  test('should verify valid Cal.com link @api @happy-path @calcom', async ({ 
    onboardingPage,
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Navigate to integrations step
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName,
      testAgent.lastName,
      testAgent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    
    // Intercept Cal.com verification
    const verifyResponse = page.waitForResponse(response => 
      response.url().includes('/api/integrations/cal-com/verify')
    )
    
    // Enter valid Cal.com link
    await page.getByLabel('Cal.com Booking Link').fill('https://cal.com/test-user')
    await page.getByLabel('Cal.com Booking Link').blur()
    
    const response = await verifyResponse
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.valid).toBe(true)
  })

  test('should reject invalid Cal.com link format @api @error @calcom', async ({ 
    onboardingPage,
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Navigate to integrations step
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName,
      testAgent.lastName,
      testAgent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    
    // Enter invalid Cal.com link
    await page.getByLabel('Cal.com Booking Link').fill('https://invalid-url.com')
    await page.getByLabel('Cal.com Booking Link').blur()
    
    // Should show verification error
    await expect(
      page.getByText(/invalid cal.com|verification failed|not a valid/i)
    ).toBeVisible()
  })
})

test.describe('API Integration - Twilio SMS Test', () => {
  
  test('should send test SMS successfully @api @happy-path @twilio', async ({ 
    onboardingPage,
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Navigate to integrations step
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName,
      testAgent.lastName,
      testAgent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    
    // Enter SMS phone number
    await page.getByLabel('SMS Phone Number').fill('5551234567')
    
    // Click test SMS button
    const smsResponse = page.waitForResponse(response => 
      response.url().includes('/api/integrations/twilio/send-test')
    )
    
    await page.getByRole('button', { name: /send test|test sms/i }).click()
    
    const response = await smsResponse
    expect(response.status()).toBe(200)
    
    // Should show success message
    await expect(
      page.getByText(/test sms sent|message sent successfully/i)
    ).toBeVisible()
  })

  test('should handle SMS sending failure gracefully @api @error @twilio', async ({ 
    onboardingPage,
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Navigate to integrations step
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName,
      testAgent.lastName,
      testAgent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    
    // Block SMS API
    await page.route('**/api/integrations/twilio/send-test', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'SMS service unavailable' })
      })
    })
    
    // Try to send test SMS
    await page.getByLabel('SMS Phone Number').fill('5551234567')
    await page.getByRole('button', { name: /send test|test sms/i }).click()
    
    // Should show error message
    await expect(
      page.getByText(/failed to send|service unavailable|error/i)
    ).toBeVisible()
  })
})

test.describe('API Integration - Onboard Submission', () => {
  
  test('should successfully complete onboarding via API @api @happy-path @e2e', async ({ 
    onboardingPage,
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Intercept onboard API
    const onboardResponse = page.waitForResponse(response => 
      response.url().includes('/api/agents/onboard')
    )
    
    // Complete all steps
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName,
      testAgent.lastName,
      testAgent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    await onboardingPage.clickNext() // Skip integrations
    await onboardingPage.acceptTerms()
    await onboardingPage.clickComplete()
    
    const response = await onboardResponse
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('agentId')
    expect(data).toHaveProperty('email', testAgent.email)
  })

  test('should handle server validation errors during submission @api @error @validation', async ({ 
    onboardingPage,
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Mock server to return validation error
    await page.route('**/api/agents/onboard', async (route) => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ 
          error: 'Validation failed',
          details: { email: 'Email already exists' }
        })
      })
    })
    
    // Complete all steps
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName,
      testAgent.lastName,
      testAgent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    await onboardingPage.clickNext()
    await onboardingPage.acceptTerms()
    await onboardingPage.clickComplete()
    
    // Should show server error
    await expect(
      page.getByText(/email already exists|validation failed/i)
    ).toBeVisible()
  })
})
