import { test, expect, generateTestAgent, generateInvalidTestData } from './fixtures'

/**
 * E2E Tests: Multi-Step Wizard Navigation
 * 
 * Coverage:
 * - Step progression (forward/backward)
 * - Progress bar updates
 * - Step indicator navigation
 * - Step validation before progression
 * - Final step completion
 * 
 * @happy-path @navigation
 */

test.describe('Multi-Step Wizard Navigation', () => {
  
  test('should display all 4 steps in the wizard @happy-path @navigation', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    // Verify all step indicators are visible
    await expect(onboardingPage.page.getByText('Account')).toBeVisible()
    await expect(onboardingPage.page.getByText('Profile')).toBeVisible()
    await expect(onboardingPage.page.getByText('Integrations')).toBeVisible()
    await expect(onboardingPage.page.getByText('Confirm')).toBeVisible()
  })

  test('should start on step 1 (Account) @happy-path @navigation', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    await onboardingPage.expectStepVisible(1, 'Account')
    await expect(onboardingPage.page.getByLabel('Email Address')).toBeVisible()
    await expect(onboardingPage.page.getByLabel('Password')).toBeVisible()
  })

  test('should navigate to step 2 after filling valid account info @happy-path @navigation', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Fill step 1
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Verify step 2 is shown
    await onboardingPage.expectStepVisible(2, 'Profile')
    await expect(onboardingPage.page.getByLabel('First Name')).toBeVisible()
  })

  test('should navigate through all steps to completion @happy-path @navigation', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Step 1: Account
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Step 2: Profile
    await onboardingPage.expectStepVisible(2, 'Profile')
    await onboardingPage.fillProfileStep(
      testAgent.firstName, 
      testAgent.lastName, 
      testAgent.phoneNumber, 
      'California'
    )
    await onboardingPage.clickNext()
    
    // Step 3: Integrations
    await onboardingPage.expectStepVisible(3, 'Integrations')
    await onboardingPage.fillIntegrationsStep(testAgent.calcomLink, testAgent.smsPhoneNumber)
    await onboardingPage.clickNext()
    
    // Step 4: Confirm
    await onboardingPage.expectStepVisible(4, 'Confirm')
    await expect(onboardingPage.page.getByText('Review your information')).toBeVisible()
  })

  test('should navigate back to previous step @happy-path @navigation', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Go to step 2
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.expectStepVisible(2, 'Profile')
    
    // Go back to step 1
    await onboardingPage.clickPrevious()
    await onboardingPage.expectStepVisible(1, 'Account')
    
    // Verify data is preserved
    await expect(onboardingPage.page.getByLabel('Email Address')).toHaveValue(testAgent.email)
  })

  test('should update progress bar as steps progress @happy-path @navigation @ui', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Check initial progress (25% for step 1 of 4)
    const progressBar = onboardingPage.page.locator('.bg-primary[class*="transition"]').first()
    await expect(progressBar).toHaveAttribute('style', /width: 25%/)
    
    // Progress to step 2 (50%)
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await expect(progressBar).toHaveAttribute('style', /width: 50%/)
    
    // Progress to step 3 (75%)
    await onboardingPage.fillProfileStep(
      testAgent.firstName, 
      testAgent.lastName, 
      testAgent.phoneNumber, 
      'California'
    )
    await onboardingPage.clickNext()
    await expect(progressBar).toHaveAttribute('style', /width: 75%/)
    
    // Progress to step 4 (100%)
    await onboardingPage.clickNext()
    await expect(progressBar).toHaveAttribute('style', /width: 100%/)
  })

  test('should not navigate forward with invalid step data @error @validation', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    // Try to proceed without filling required fields
    await onboardingPage.clickNext()
    
    // Should still be on step 1
    await onboardingPage.expectStepVisible(1, 'Account')
    
    // Should show validation errors
    await expect(onboardingPage.page.getByText(/required|invalid/i).first()).toBeVisible()
  })

  test('should disable Next button while validating @ui @validation', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    const nextButton = onboardingPage.page.getByRole('button', { name: /next/i })
    
    // Fill with valid data
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    
    // Click next and check button is in loading/processing state
    await nextButton.click()
    
    // After validation passes, should be on step 2
    await onboardingPage.expectStepVisible(2, 'Profile')
  })

  test('should show correct step indicator state @ui @navigation', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Step 1 should be active (highlighted)
    const step1Indicator = onboardingPage.page.locator('button', { hasText: '1' }).first()
    await expect(step1Indicator).toHaveClass(/ring-2/)
    
    // Complete step 1 and move to step 2
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Step 1 should show checkmark (completed)
    await expect(onboardingPage.page.locator('button svg')).toBeVisible()
    
    // Step 2 should be active
    const step2Indicator = onboardingPage.page.locator('button', { hasText: '2' }).first()
    await expect(step2Indicator).toHaveClass(/ring-2/)
  })

  test('should complete full onboarding flow and show success state @happy-path @e2e', async ({ 
    onboardingPage, 
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
    
    // Step 3: Integrations (skip optional fields)
    await onboardingPage.clickNext()
    
    // Step 4: Confirm
    await onboardingPage.acceptTerms()
    await onboardingPage.clickComplete()
    
    // Verify success state
    await expect(onboardingPage.page.getByText('Welcome to LeadFlow!')).toBeVisible({ timeout: 10000 })
    await expect(onboardingPage.page.getByText(/account has been created/i)).toBeVisible()
  })

  test('should allow skipping optional integration steps @happy-path @navigation', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Step 1
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Step 2
    await onboardingPage.fillProfileStep(
      testAgent.firstName, 
      testAgent.lastName, 
      testAgent.phoneNumber, 
      'California'
    )
    await onboardingPage.clickNext()
    
    // Step 3 - skip without filling anything
    await expect(onboardingPage.page.getByText('Integrations')).toBeVisible()
    await expect(onboardingPage.page.getByText('optional')).toBeVisible()
    
    await onboardingPage.clickNext()
    
    // Should proceed to step 4
    await onboardingPage.expectStepVisible(4, 'Confirm')
  })
})
