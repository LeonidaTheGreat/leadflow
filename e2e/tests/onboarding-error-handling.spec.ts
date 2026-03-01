import { test, expect } from './fixtures'

/**
 * E2E Tests: Error Handling
 * 
 * Coverage:
 * - Network failures
 * - Server errors (500, 502, 503)
 * - Validation errors from server
 * - Timeout handling
 * - Error recovery mechanisms
 * - User-friendly error messages
 * 
 * @error @resilience
 */

test.describe('Error Handling - Network Failures', () => {
  
  test('should handle complete network loss gracefully @error @network', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    // Simulate offline mode
    await page.context().setOffline(true)
    
    // Try to navigate
    await page.getByLabel('Email Address').fill('offline@test.com')
    await onboardingPage.clickNext()
    
    // Should show network error
    await expect(
      page.getByText(/no connection|offline|network error|check your connection/i)
    ).toBeVisible()
    
    // Restore network
    await page.context().setOffline(false)
  })

  test('should recover after network restoration @error @network @recovery', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    // Go offline
    await page.context().setOffline(true)
    await page.getByLabel('Email Address').fill('recover@test.com')
    await page.context().setOffline(false)
    
    // Should be able to retry
    await expect(
      page.getByRole('button', { name: /retry|try again/i })
    ).toBeVisible()
  })

  test('should handle intermittent network failures @error @network', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    // Intercept and alternate between success and failure
    let requestCount = 0
    await page.route('**/api/**', async (route) => {
      requestCount++
      if (requestCount % 2 === 0) {
        await route.abort('failed')
      } else {
        await route.continue()
      }
    })
    
    // Try to perform action
    await page.getByLabel('Email Address').fill('intermittent@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should handle gracefully without crashing
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Error Handling - Server Errors', () => {
  
  test('should handle 500 Internal Server Error @error @server', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    // Mock 500 error on email check
    await page.route('**/api/agents/check-email', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    await page.getByLabel('Email Address').fill('server-error@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should show user-friendly error
    await expect(
      page.getByText(/something went wrong|server error|try again later/i)
    ).toBeVisible()
  })

  test('should handle 502 Bad Gateway @error @server', async ({ 
    onboardingPage,
    page 
  }) => {
    await onboardingPage.goto()
    
    await page.route('**/api/agents/onboard', async (route) => {
      await route.fulfill({ status: 502, body: 'Bad Gateway' })
    })
    
    // Fill form and submit
    await page.getByLabel('Email Address').fill('bad-gateway@test.com')
    await page.getByLabel('Password', { exact: true }).fill('TestPass123!')
    await page.getByLabel('Confirm Password').fill('TestPass123!')
    
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep('Test', 'User', '5551234567', 'California')
    await onboardingPage.clickNext()
    await onboardingPage.clickNext()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /complete/i }).click()
    
    // Should show appropriate error
    await expect(
      page.getByText(/service unavailable|try again|temporary issue/i)
    ).toBeVisible()
  })

  test('should handle 503 Service Unavailable @error @server', async ({ onboardingPage, page }) => {
    await onboardingPage.goto()
    
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 503,
        headers: { 'Retry-After': '5' },
        body: JSON.stringify({ error: 'Service temporarily unavailable' })
      })
    })
    
    await page.getByLabel('Email Address').fill('unavailable@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should show maintenance/service unavailable message
    await expect(
      page.getByText(/maintenance|temporarily unavailable|come back later/i)
    ).toBeVisible()
  })

  test('should handle 429 Rate Limit @error @server', async ({ onboardingPage, page }) => {
    await onboardingPage.goto()
    
    await page.route('**/api/agents/check-email', async (route) => {
      await route.fulfill({
        status: 429,
        headers: { 'Retry-After': '10' },
        body: JSON.stringify({ error: 'Too many requests' })
      })
    })
    
    await page.getByLabel('Email Address').fill('ratelimit@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should show rate limit message
    await expect(
      page.getByText(/too many requests|slow down|rate limit/i)
    ).toBeVisible()
  })

  test('should handle 404 Not Found @error @server', async ({ onboardingPage, page }) => {
    await onboardingPage.goto()
    
    await page.route('**/api/agents/check-email', async (route) => {
      await route.fulfill({ status: 404, body: 'Not Found' })
    })
    
    await page.getByLabel('Email Address').fill('notfound@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should handle gracefully
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Error Handling - Timeout Scenarios', () => {
  
  test('should handle API request timeout @error @timeout', async ({ onboardingPage, page }) => {
    await onboardingPage.goto()
    
    // Delay response beyond timeout
    await page.route('**/api/agents/check-email', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ available: true })
      })
    })
    
    await page.getByLabel('Email Address').fill('timeout@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Wait for timeout
    await page.waitForTimeout(16000)
    
    // Should show timeout error
    await expect(
      page.getByText(/timeout|taking too long|try again/i)
    ).toBeVisible()
  })

  test('should allow manual retry after timeout @error @timeout @recovery', async ({ 
    onboardingPage, 
    page 
  }) => {
    await onboardingPage.goto()
    
    // First request times out
    let requestCount = 0
    await page.route('**/api/agents/check-email', async (route) => {
      requestCount++
      if (requestCount === 1) {
        await new Promise(resolve => setTimeout(resolve, 35000))
      }
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ available: true })
      })
    })
    
    await page.getByLabel('Email Address').fill('retry-timeout@test.com')
    await page.getByLabel('Email Address').blur()
    await page.waitForTimeout(16000)
    
    // Should have retry button
    const retryButton = page.getByRole('button', { name: /retry/i })
    await expect(retryButton).toBeVisible()
    
    // Clicking retry should work
    await retryButton.click()
    await expect(
      page.getByText(/available|success/i)
    ).toBeVisible()
  })
})

test.describe('Error Handling - Validation Errors', () => {
  
  test('should display field-level validation errors @error @validation', async ({ 
    onboardingPage, 
    page 
  }) => {
    await onboardingPage.goto()
    
    // Mock server returning specific validation errors
    await page.route('**/api/agents/onboard', async (route) => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'Validation failed',
          details: {
            email: 'Invalid email format',
            password: 'Password is too weak',
            phoneNumber: 'Invalid phone number'
          }
        })
      })
    })
    
    // Try to submit
    await page.getByLabel('Email Address').fill('invalid')
    await page.getByLabel('Password', { exact: true }).fill('123')
    await page.getByLabel('Confirm Password').fill('123')
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep('Test', 'User', '123', 'California')
    await onboardingPage.clickNext()
    await onboardingPage.clickNext()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /complete/i }).click()
    
    // Should show specific validation errors
    await expect(page.getByText(/invalid email/i)).toBeVisible()
  })

  test('should handle malformed API responses @error @resilience', async ({ 
    onboardingPage, 
    page 
  }) => {
    await onboardingPage.goto()
    
    // Return invalid JSON
    await page.route('**/api/agents/check-email', async (route) => {
      await route.fulfill({
        status: 200,
        body: 'invalid json {',
        contentType: 'application/json'
      })
    })
    
    await page.getByLabel('Email Address').fill('malformed@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should handle gracefully without crashing
    await expect(page.locator('body')).toBeVisible()
    await expect(
      page.getByText(/error|something went wrong/i)
    ).toBeVisible()
  })

  test('should handle empty API responses @error @resilience', async ({ onboardingPage, page }) => {
    await onboardingPage.goto()
    
    await page.route('**/api/agents/check-email', async (route) => {
      await route.fulfill({ status: 200, body: '' })
    })
    
    await page.getByLabel('Email Address').fill('empty@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should handle gracefully
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Error Handling - UI/UX', () => {
  
  test('should show loading state during API calls @ui @loading', async ({ onboardingPage, page }) => {
    await onboardingPage.goto()
    
    // Delay response to show loading state
    await page.route('**/api/agents/check-email', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ available: true })
      })
    })
    
    await page.getByLabel('Email Address').fill('loading@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should show loading indicator
    await expect(
      page.locator('[data-testid="loading"]').or(
        page.getByRole('progressbar')
      ).or(
        page.locator('.animate-spin')
      )
    ).toBeVisible()
  })

  test('should disable submit button while processing @ui @loading', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await onboardingPage.goto()
    
    // Delay onboard API
    await page.route('**/api/agents/onboard', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 3000))
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ agentId: 'test-id', email: testAgent.email })
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
    await page.getByRole('checkbox').check()
    
    const completeButton = page.getByRole('button', { name: /complete/i })
    await completeButton.click()
    
    // Button should be disabled during submission
    await expect(completeButton).toBeDisabled()
    
    // Should show loading text
    await expect(page.getByText(/submitting|processing|loading/i)).toBeVisible()
  })

  test('should clear error messages on successful action @ui @recovery', async ({ 
    onboardingPage, 
    page 
  }) => {
    await onboardingPage.goto()
    
    // First cause an error
    await page.context().setOffline(true)
    await page.getByLabel('Email Address').fill('clear-error@test.com')
    await onboardingPage.clickNext()
    
    await expect(
      page.getByText(/network error|offline/i)
    ).toBeVisible()
    
    // Restore network and retry
    await page.context().setOffline(false)
    
    // Error should clear on new action
    await page.getByLabel('Email Address').fill('retry-success@test.com')
    await page.getByLabel('Email Address').blur()
    
    await expect(
      page.getByText(/network error|offline/i)
    ).not.toBeVisible()
  })

  test('should show inline error indicators @ui @validation', async ({ onboardingPage, page }) => {
    await onboardingPage.goto()
    
    // Trigger validation
    await page.getByLabel('Email Address').fill('invalid')
    await page.getByLabel('Email Address').blur()
    
    // Should show inline error on the field
    const emailField = page.getByLabel('Email Address')
    await expect(emailField).toHaveAttribute('aria-invalid', 'true')
    
    // Should have error styling (red border)
    await expect(
      emailField.locator('..').locator('[class*="border-red"], [class*="error"]')
    ).toBeVisible()
  })
})

test.describe('Error Handling - Edge Cases', () => {
  
  test('should handle very long error messages @error @edge-case', async ({ onboardingPage, page }) => {
    await onboardingPage.goto()
    
    const longError = 'Error: '.repeat(100)
    
    await page.route('**/api/agents/check-email', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: longError })
      })
    })
    
    await page.getByLabel('Email Address').fill('long-error@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should display without breaking layout
    await expect(page.locator('body')).toBeVisible()
    const errorContainer = page.locator('[class*="error"], [role="alert"]')
    const boundingBox = await errorContainer.boundingBox()
    expect(boundingBox?.width).toBeLessThan(page.viewportSize()?.width || 1200)
  })

  test('should handle special characters in error messages @error @edge-case', async ({ 
    onboardingPage, 
    page 
  }) => {
    await onboardingPage.goto()
    
    const specialError = '<script>alert("xss")</script> & "quotes" \'apostrophes\''
    
    await page.route('**/api/agents/check-email', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: specialError })
      })
    })
    
    await page.getByLabel('Email Address').fill('special@test.com')
    await page.getByLabel('Email Address').blur()
    
    // Should display escaped (no XSS)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText('<script>')).toBeVisible() // Shown as text, not executed
  })

  test('should handle concurrent API errors @error @edge-case', async ({ onboardingPage, page }) => {
    await onboardingPage.goto()
    
    // Fail all APIs
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Service error' })
      })
    })
    
    // Trigger multiple concurrent requests
    await page.getByLabel('Email Address').fill('concurrent@test.com')
    await page.getByLabel('Password', { exact: true }).fill('TestPass123!')
    await page.getByLabel('Email Address').blur()
    await page.getByLabel('Password', { exact: true }).blur()
    
    // Should handle gracefully without UI freezing
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByRole('button', { name: /next|retry/i })).toBeEnabled()
  })
})
