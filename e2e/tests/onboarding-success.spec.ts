import { test, expect, generateTestAgent } from './fixtures'

/**
 * E2E Tests: Success Flow Completion
 * 
 * Coverage:
 * - Complete onboarding flow
 * - Success state display
 * - Dashboard redirect
 * - Session/token creation
 * - Email confirmation
 * - Analytics events
 * 
 * @happy-path @success @e2e
 */

test.describe('Success Flow - Complete Onboarding', () => {
  
  test('should complete full onboarding with all fields @happy-path @e2e @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Step 1: Account
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Step 2: Profile
    await onboardingPage.fillProfileStep(
      testAgent.firstName,
      testAgent.lastName,
      testAgent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    
    // Step 3: Integrations (with all fields)
    await page.getByLabel('Cal.com Booking Link').fill(testAgent.calcomLink || '')
    await page.getByLabel('SMS Phone Number').fill(testAgent.smsPhoneNumber || '')
    await onboardingPage.clickNext()
    
    // Step 4: Confirm
    await onboardingPage.acceptTerms()
    
    // Submit and verify success
    const submitResponse = page.waitForResponse(response => 
      response.url().includes('/api/agents/onboard') && response.status() === 200
    )
    
    await onboardingPage.clickComplete()
    await submitResponse
    
    // Verify success state
    await expect(page.getByText('Welcome to LeadFlow!')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/account has been created/i)).toBeVisible()
  })

  test('should complete onboarding with minimal required fields @happy-path @e2e @success', async ({ 
    onboardingPage, 
    page 
  }) => {
    const agent = generateTestAgent()
    await onboardingPage.goto()
    
    // Step 1: Account
    await onboardingPage.fillAccountStep(agent.email, agent.password, agent.password)
    await onboardingPage.clickNext()
    
    // Step 2: Profile
    await onboardingPage.fillProfileStep(
      agent.firstName,
      agent.lastName,
      agent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    
    // Step 3: Skip integrations
    await onboardingPage.clickNext()
    
    // Step 4: Confirm
    await onboardingPage.acceptTerms()
    await onboardingPage.clickComplete()
    
    // Verify success
    await expect(page.getByText('Welcome to LeadFlow!')).toBeVisible({ timeout: 10000 })
  })

  test('should create agent record in database @happy-path @api @success', async ({ 
    onboardingPage, 
    page,
    onboardingAPI,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Complete onboarding
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
    
    const response = await page.waitForResponse(r => 
      r.url().includes('/api/agents/onboard')
    )
    const data = await response.json()
    
    // Verify agent was created with correct data
    expect(data).toHaveProperty('agentId')
    expect(data.email).toBe(testAgent.email)
    expect(data.firstName).toBe(testAgent.firstName)
    expect(data.lastName).toBe(testAgent.lastName)
  })

  test('should prevent duplicate account creation @happy-path @validation @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    // Complete onboarding first time
    await onboardingPage.goto()
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
    
    await expect(page.getByText('Welcome to LeadFlow!')).toBeVisible()
    
    // Try to create account with same email again
    await onboardingPage.goto()
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Should show email already exists error
    await expect(
      page.getByText(/email already exists|account already exists/i)
    ).toBeVisible()
  })
})

test.describe('Success Flow - Dashboard Redirect', () => {
  
  test('should redirect to dashboard after successful onboarding @happy-path @redirect @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Complete onboarding
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
    
    // Wait for success message
    await expect(page.getByText('Welcome to LeadFlow!')).toBeVisible()
    
    // Should redirect to dashboard after delay
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    
    // Verify dashboard loaded
    await expect(page.getByText(/dashboard|leads|overview/i).first()).toBeVisible()
  })

  test('should maintain session after redirect @happy-path @session @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Complete onboarding
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
    
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    
    // Verify user is authenticated
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'))
    expect(sessionCookie).toBeDefined()
  })

  test('should show welcome modal on first dashboard visit @happy-path @ui @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Complete onboarding
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
    
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    
    // Should show welcome modal/tour
    await expect(
      page.getByText(/welcome to your dashboard|getting started|take a tour/i).first()
    ).toBeVisible()
  })
})

test.describe('Success Flow - Post-Onboarding State', () => {
  
  test('should display agent name in header @happy-path @ui @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Complete onboarding
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
    
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    
    // Header should show agent name
    await expect(
      page.getByText(new RegExp(testAgent.firstName, 'i'))
    ).toBeVisible()
  })

  test('should have integrations pre-configured @happy-path @api @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Complete onboarding with integrations
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName,
      testAgent.lastName,
      testAgent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    await page.getByLabel('Cal.com Booking Link').fill(testAgent.calcomLink || '')
    await page.getByLabel('SMS Phone Number').fill(testAgent.smsPhoneNumber || '')
    await onboardingPage.clickNext()
    await onboardingPage.acceptTerms()
    await onboardingPage.clickComplete()
    
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    
    // Navigate to settings/integrations
    await page.goto('/settings/integrations')
    
    // Should show pre-configured integrations
    await expect(
      page.getByText(/cal.com|connected|configured/i)
    ).toBeVisible()
  })

  test('should allow immediate login after onboarding @happy-path @auth @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    // Complete onboarding
    await onboardingPage.goto()
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
    
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    
    // Logout
    await page.getByRole('button', { name: /logout|sign out/i }).click()
    
    // Login with new credentials
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(testAgent.email)
    await page.getByLabel(/password/i).fill(testAgent.password)
    await page.getByRole('button', { name: /sign in|login/i }).click()
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    await expect(page.getByText(/dashboard|overview/i).first()).toBeVisible()
  })
})

test.describe('Success Flow - Email Confirmation', () => {
  
  test('should trigger confirmation email on completion @happy-path @email @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Intercept email API call
    const emailRequest = page.waitForRequest(request => 
      request.url().includes('/api/emails/send') || 
      request.url().includes('/api/agents/send-confirmation')
    )
    
    // Complete onboarding
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
    
    // Verify email was triggered
    const request = await emailRequest
    expect(request).toBeDefined()
    
    const postData = request.postData()
    expect(postData).toContain(testAgent.email)
  })

  test('should show email confirmation message on success page @happy-path @ui @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Complete onboarding
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
    
    // Should mention email confirmation
    await expect(
      page.getByText(/check your email|confirmation email|verify your email/i)
    ).toBeVisible()
  })
})

test.describe('Success Flow - Analytics', () => {
  
  test('should track onboarding completion event @happy-path @analytics @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Intercept analytics calls
    const analyticsEvents: string[] = []
    page.on('request', request => {
      if (request.url().includes('analytics') || request.url().includes('posthog')) {
        analyticsEvents.push(request.url())
      }
    })
    
    // Complete onboarding
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
    
    // Verify completion event was tracked
    await page.waitForTimeout(1000)
    const hasCompletionEvent = analyticsEvents.some(e => 
      e.includes('onboarding_complete') || 
      e.includes('signup') ||
      e.includes('registration')
    )
    expect(hasCompletionEvent).toBe(true)
  })

  test('should track step progression events @happy-path @analytics @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    const stepEvents: number[] = []
    page.on('request', request => {
      if (request.url().includes('analytics') || request.url().includes('posthog')) {
        const stepMatch = request.url().match(/step[_-]?(\d)/)
        if (stepMatch) {
          stepEvents.push(parseInt(stepMatch[1]))
        }
      }
    })
    
    // Progress through steps
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName,
      testAgent.lastName,
      testAgent.phoneNumber,
      'California'
    )
    await onboardingPage.clickNext()
    
    // Verify step events were tracked
    await page.waitForTimeout(500)
    expect(stepEvents.length).toBeGreaterThan(0)
  })
})

test.describe('Success Flow - Edge Cases', () => {
  
  test('should handle rapid form completion @happy-path @performance @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Fill all fields rapidly
    await page.getByLabel('Email Address').fill(testAgent.email)
    await page.getByLabel('Password', { exact: true }).fill(testAgent.password)
    await page.getByLabel('Confirm Password').fill(testAgent.password)
    await page.getByLabel('First Name').fill(testAgent.firstName)
    await page.getByLabel('Last Name').fill(testAgent.lastName)
    await page.getByLabel('Phone Number').fill(testAgent.phoneNumber)
    await page.getByRole('combobox', { name: /state/i }).selectOption('CA')
    await page.getByRole('checkbox').check()
    
    // Submit should still work
    await onboardingPage.clickComplete()
    
    // May show validation errors for steps not visited, but shouldn't crash
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle browser back button after completion @happy-path @edge-case @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Complete onboarding
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
    
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    
    // Go back
    await page.goBack()
    
    // Should stay on dashboard or show appropriate message
    // Not show the onboarding form again
    await expect(
      page.getByText(/dashboard|already have an account|already registered/i).first()
    ).toBeVisible()
  })

  test('should handle page refresh during submission @happy-path @resilience @success', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
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
    
    // Click complete and immediately refresh
    await page.getByRole('button', { name: /complete/i }).click()
    await page.waitForTimeout(500)
    await page.reload()
    
    // Should handle gracefully - either show success or allow retry
    await expect(page.locator('body')).toBeVisible()
    
    // Check if account was created or if we can retry
    const successMessage = page.getByText(/welcome|success/i)
    const retryButton = page.getByRole('button', { name: /retry|complete/i })
    
    await expect(successMessage.or(retryButton)).toBeVisible()
  })
})
