import { test as base, expect, Page } from '@playwright/test'

/**
 * Test data generators and fixtures for E2E tests
 */

export interface TestAgent {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  state: string
  calcomLink?: string
  smsPhoneNumber?: string
}

export function generateTestAgent(timestamp?: number): TestAgent {
  const ts = timestamp || Date.now()
  return {
    email: `test-agent-${ts}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Agent',
    phoneNumber: '5551234567',
    state: 'CA',
    calcomLink: 'https://cal.com/test-agent',
    smsPhoneNumber: '5559876543',
  }
}

export function generateInvalidTestData() {
  return {
    invalidEmail: 'not-an-email',
    shortPassword: '123',
    weakPassword: 'password',
    invalidPhone: '123',
    longPhone: '1234567890123',
    invalidUrl: 'not-a-url',
  }
}

/**
 * Onboarding page helper functions
 */
export class OnboardingPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/onboarding')
    await this.page.waitForLoadState('networkidle')
  }

  async expectStepVisible(stepNumber: number, stepTitle: string) {
    await expect(this.page.getByText(`Step ${stepNumber}`)).toBeVisible()
    await expect(this.page.getByText(stepTitle)).toBeVisible()
  }

  async fillAccountStep(email: string, password: string, confirmPassword?: string) {
    await this.page.getByLabel('Email Address').fill(email)
    await this.page.getByLabel('Password', { exact: true }).fill(password)
    if (confirmPassword) {
      await this.page.getByLabel('Confirm Password').fill(confirmPassword)
    }
  }

  async fillProfileStep(firstName: string, lastName: string, phone: string, state: string) {
    await this.page.getByLabel('First Name').fill(firstName)
    await this.page.getByLabel('Last Name').fill(lastName)
    await this.page.getByLabel('Phone Number').fill(phone)
    
    // Select state from dropdown
    await this.page.getByRole('combobox', { name: /state/i }).click()
    await this.page.getByRole('option', { name: new RegExp(state, 'i') }).click()
  }

  async fillIntegrationsStep(calcomLink?: string, smsPhone?: string) {
    if (calcomLink) {
      await this.page.getByLabel('Cal.com Booking Link').fill(calcomLink)
    }
    if (smsPhone) {
      await this.page.getByLabel('SMS Phone Number').fill(smsPhone)
    }
  }

  async acceptTerms() {
    await this.page.getByRole('checkbox', { name: /terms/i }).check()
  }

  async clickNext() {
    await this.page.getByRole('button', { name: /next/i }).click()
  }

  async clickPrevious() {
    await this.page.getByRole('button', { name: /previous/i }).click()
  }

  async clickComplete() {
    await this.page.getByRole('button', { name: /complete/i }).click()
  }

  async clickCancel() {
    await this.page.getByRole('button', { name: /cancel/i }).click()
  }

  async expectErrorMessage(message: string | RegExp) {
    await expect(this.page.getByText(message)).toBeVisible()
  }

  async expectValidationError(fieldName: string) {
    await expect(
      this.page.locator(`[aria-label*="${fieldName}"] + [role="alert"]`)
    ).toBeVisible()
  }

  getProgressBar() {
    return this.page.locator('[role="progressbar"]')
  }

  getCurrentStepIndicator() {
    return this.page.locator('[data-testid="current-step"]')
  }
}

/**
 * API helper functions
 */
export class OnboardingAPI {
  constructor(private page: Page, private baseURL: string) {}

  async checkEmail(email: string): Promise<{ available: boolean }> {
    const response = await this.page.request.post(`${this.baseURL}/api/agents/check-email`, {
      data: { email },
    })
    return response.json()
  }

  async verifyCalcomLink(link: string): Promise<{ valid: boolean; message?: string }> {
    const response = await this.page.request.post(`${this.baseURL}/api/integrations/cal-com/verify`, {
      data: { link },
    })
    return response.json()
  }

  async onboardAgent(data: TestAgent): Promise<{ success: boolean; agentId?: string; error?: string }> {
    const response = await this.page.request.post(`${this.baseURL}/api/agents/onboard`, {
      data,
    })
    return response.json()
  }
}

/**
 * Extended test fixture with page objects
 */
export const test = base.extend<{
  onboardingPage: OnboardingPage
  onboardingAPI: OnboardingAPI
  testAgent: TestAgent
}>({
  onboardingPage: async ({ page }, use) => {
    await use(new OnboardingPage(page))
  },
  onboardingAPI: async ({ page, baseURL }, use) => {
    await use(new OnboardingAPI(page, baseURL || ''))
  },
  testAgent: async ({}, use) => {
    await use(generateTestAgent())
  },
})

export { expect }
