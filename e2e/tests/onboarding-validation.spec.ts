import { test, expect, generateInvalidTestData } from './fixtures'

/**
 * E2E Tests: Form Validation Flows
 * 
 * Coverage:
 * - Field-level validation (email, password, phone, etc.)
 * - Step-level validation
 * - Real-time validation feedback
 * - Password confirmation matching
 * - Required field validation
 * - Terms acceptance validation
 * 
 * @validation @error
 */

test.describe('Form Validation - Step 1: Account', () => {
  
  test('should validate email format @validation @error @account', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    const invalidData = generateInvalidTestData()
    
    // Try invalid email
    await onboardingPage.page.getByLabel('Email Address').fill(invalidData.invalidEmail)
    await onboardingPage.page.getByLabel('Password', { exact: true }).fill('TestPass123!')
    await onboardingPage.clickNext()
    
    // Should show email validation error
    await expect(
      onboardingPage.page.getByText(/invalid email|valid email/i).first()
    ).toBeVisible()
  })

  test('should require email field @validation @error @account', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    // Leave email empty, fill password
    await onboardingPage.page.getByLabel('Password', { exact: true }).fill('TestPass123!')
    await onboardingPage.clickNext()
    
    // Should show required error
    await expect(
      onboardingPage.page.getByText(/email is required|required/i).first()
    ).toBeVisible()
  })

  test('should validate password minimum length @validation @error @account', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    const invalidData = generateInvalidTestData()
    
    await onboardingPage.page.getByLabel('Email Address').fill('test@example.com')
    await onboardingPage.page.getByLabel('Password', { exact: true }).fill(invalidData.shortPassword)
    await onboardingPage.clickNext()
    
    await expect(
      onboardingPage.page.getByText(/8 characters|at least 8/i)
    ).toBeVisible()
  })

  test('should validate password complexity - uppercase @validation @error @account', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    await onboardingPage.page.getByLabel('Email Address').fill('test@example.com')
    // Password with lowercase and number but no uppercase
    await onboardingPage.page.getByLabel('Password', { exact: true }).fill('password123')
    await onboardingPage.clickNext()
    
    await expect(
      onboardingPage.page.getByText(/uppercase|upper case/i)
    ).toBeVisible()
  })

  test('should validate password complexity - lowercase @validation @error @account', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    await onboardingPage.page.getByLabel('Email Address').fill('test@example.com')
    // Password with uppercase and number but no lowercase
    await onboardingPage.page.getByLabel('Password', { exact: true }).fill('PASSWORD123')
    await onboardingPage.clickNext()
    
    await expect(
      onboardingPage.page.getByText(/lowercase|lower case/i)
    ).toBeVisible()
  })

  test('should validate password complexity - number @validation @error @account', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    await onboardingPage.page.getByLabel('Email Address').fill('test@example.com')
    // Password with uppercase and lowercase but no number
    await onboardingPage.page.getByLabel('Password', { exact: true }).fill('PasswordOnly')
    await onboardingPage.clickNext()
    
    await expect(
      onboardingPage.page.getByText(/number|digit/i)
    ).toBeVisible()
  })

  test('should validate password confirmation matches @validation @error @account', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    await onboardingPage.page.getByLabel('Email Address').fill('test@example.com')
    await onboardingPage.page.getByLabel('Password', { exact: true }).fill('TestPass123!')
    await onboardingPage.page.getByLabel('Confirm Password').fill('DifferentPass123!')
    await onboardingPage.clickNext()
    
    await expect(
      onboardingPage.page.getByText(/passwords do not match|do not match/i)
    ).toBeVisible()
  })

  test('should clear validation errors on valid input @validation @happy-path', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    // Trigger validation error
    await onboardingPage.clickNext()
    await expect(onboardingPage.page.getByText(/required/i).first()).toBeVisible()
    
    // Fill valid data
    await onboardingPage.fillAccountStep('test@example.com', 'TestPass123!', 'TestPass123!')
    
    // Error should be cleared
    await expect(onboardingPage.page.getByText(/required/i).first()).not.toBeVisible()
  })
})

test.describe('Form Validation - Step 2: Profile', () => {
  
  test('should require first name @validation @error @profile', async ({ onboardingPage, testAgent }) => {
    await onboardingPage.goto()
    
    // Complete step 1
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Try to proceed without first name
    await onboardingPage.page.getByLabel('Last Name').fill(testAgent.lastName)
    await onboardingPage.page.getByLabel('Phone Number').fill(testAgent.phoneNumber)
    await onboardingPage.clickNext()
    
    await expect(
      onboardingPage.page.getByText(/first name is required|first name required/i)
    ).toBeVisible()
  })

  test('should require last name @validation @error @profile', async ({ onboardingPage, testAgent }) => {
    await onboardingPage.goto()
    
    // Complete step 1
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Try to proceed without last name
    await onboardingPage.page.getByLabel('First Name').fill(testAgent.firstName)
    await onboardingPage.page.getByLabel('Phone Number').fill(testAgent.phoneNumber)
    await onboardingPage.clickNext()
    
    await expect(
      onboardingPage.page.getByText(/last name is required|last name required/i)
    ).toBeVisible()
  })

  test('should validate phone number format - 10 digits @validation @error @profile', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Complete step 1
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Try invalid phone number
    await onboardingPage.page.getByLabel('First Name').fill(testAgent.firstName)
    await onboardingPage.page.getByLabel('Last Name').fill(testAgent.lastName)
    await onboardingPage.page.getByLabel('Phone Number').fill('123') // Too short
    await onboardingPage.clickNext()
    
    await expect(
      onboardingPage.page.getByText(/10 digits|valid phone/i)
    ).toBeVisible()
  })

  test('should require state selection @validation @error @profile', async ({ onboardingPage, testAgent }) => {
    await onboardingPage.goto()
    
    // Complete step 1
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Fill all fields except state
    await onboardingPage.page.getByLabel('First Name').fill(testAgent.firstName)
    await onboardingPage.page.getByLabel('Last Name').fill(testAgent.lastName)
    await onboardingPage.page.getByLabel('Phone Number').fill(testAgent.phoneNumber)
    await onboardingPage.clickNext()
    
    await expect(
      onboardingPage.page.getByText(/state is required|please select a state/i)
    ).toBeVisible()
  })

  test('should accept all 50 US states + DC @validation @happy-path @profile', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Complete step 1
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Check state dropdown has all options
    await onboardingPage.page.getByRole('combobox', { name: /state/i }).click()
    
    const options = onboardingPage.page.getByRole('option')
    await expect(options).toHaveCount(51) // 50 states + DC
  })
})

test.describe('Form Validation - Step 3: Integrations', () => {
  
  test('should validate Cal.com URL format @validation @error @integrations', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Complete steps 1-2
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName, 
      testAgent.lastName, 
      testAgent.phoneNumber, 
      'California'
    )
    await onboardingPage.clickNext()
    
    // Try invalid URL
    await onboardingPage.page.getByLabel('Cal.com Booking Link').fill('not-a-valid-url')
    await onboardingPage.clickNext()
    
    // Should show URL validation error
    await expect(
      onboardingPage.page.getByText(/valid url|invalid url/i)
    ).toBeVisible()
  })

  test('should allow empty optional integration fields @validation @happy-path @integrations', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Complete steps 1-2
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName, 
      testAgent.lastName, 
      testAgent.phoneNumber, 
      'California'
    )
    await onboardingPage.clickNext()
    
    // Leave optional fields empty and proceed
    await onboardingPage.clickNext()
    
    // Should proceed to step 4
    await expect(onboardingPage.page.getByText('Confirm')).toBeVisible()
  })
})

test.describe('Form Validation - Step 4: Confirmation', () => {
  
  test('should require terms acceptance @validation @error @confirmation', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Complete steps 1-3
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
    
    // Try to complete without accepting terms
    await onboardingPage.clickComplete()
    
    await expect(
      onboardingPage.page.getByText(/must accept|terms and conditions/i)
    ).toBeVisible()
  })

  test('should show summary of all entered information @validation @happy-path @confirmation', async ({ 
    onboardingPage, 
    testAgent 
  }) => {
    await onboardingPage.goto()
    
    // Complete steps 1-3 with all data
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    await onboardingPage.fillProfileStep(
      testAgent.firstName, 
      testAgent.lastName, 
      testAgent.phoneNumber, 
      'California'
    )
    await onboardingPage.clickNext()
    await onboardingPage.fillIntegrationsStep(testAgent.calcomLink, testAgent.smsPhoneNumber)
    await onboardingPage.clickNext()
    
    // Verify summary shows entered data
    await expect(onboardingPage.page.getByText(testAgent.email)).toBeVisible()
    await expect(onboardingPage.page.getByText(testAgent.firstName)).toBeVisible()
    await expect(onboardingPage.page.getByText(testAgent.lastName)).toBeVisible()
  })
})

test.describe('Form Validation - Real-time Feedback', () => {
  
  test('should show password strength indicator @validation @ui @account', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    const passwordField = onboardingPage.page.getByLabel('Password', { exact: true })
    
    // Type weak password
    await passwordField.fill('pass')
    
    // Should show weak indicator
    await expect(
      onboardingPage.page.locator('[data-testid="password-strength"]').or(
        onboardingPage.page.getByText(/weak|too short/i)
      )
    ).toBeVisible()
    
    // Type strong password
    await passwordField.fill('StrongPass123!')
    
    // Should show strong indicator
    await expect(
      onboardingPage.page.locator('[data-testid="password-strength"]').or(
        onboardingPage.page.getByText(/strong/i)
      )
    ).toBeVisible()
  })

  test('should validate email in real-time @validation @ui @api', async ({ onboardingPage }) => {
    await onboardingPage.goto()
    
    const emailField = onboardingPage.page.getByLabel('Email Address')
    
    // Type invalid email
    await emailField.fill('invalid')
    await emailField.blur()
    
    // Should show validation error
    await expect(
      onboardingPage.page.getByText(/invalid email/i)
    ).toBeVisible()
    
    // Type valid email
    await emailField.fill('valid@example.com')
    await emailField.blur()
    
    // Error should clear
    await expect(
      onboardingPage.page.getByText(/invalid email/i)
    ).not.toBeVisible()
  })
})
