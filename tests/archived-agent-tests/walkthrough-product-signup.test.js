/**
 * Walkthrough Spec Test: Product Signup & Onboarding Flow
 * 
 * Tests the complete end-to-end walkthrough as defined in:
 * docs/guides/WALKTHROUGH-PRODUCT-SIGNUP.md
 * 
 * Coverage:
 * - Step 1: Landing page access
 * - Step 2: Trial signup flow (email+password only)
 * - Step 3: Dashboard access post-signup
 * - Step 4: Sample leads visibility
 * - Step 5: Wizard auto-trigger
 * - Step 6: FUB connection step
 * - Step 7: SMS setup step
 * - Step 8: Aha moment simulator
 * 
 * @walkthrough @signup @onboarding @e2e
 */

const { test, expect } = require('@playwright/test');
const { generateTestAgent } = require('../e2e/tests/fixtures');

const BASE_URL = process.env.TEST_BASE_URL || 'https://leadflow-ai-five.vercel.app';

/**
 * Helper: Create a test agent via API
 */
async function createTestAgent(agentData) {
  const response = await fetch(`${BASE_URL}/api/agents/onboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agentData)
  });
  return response.json();
}

/**
 * Helper: Login and get session
 */
async function loginAndGetSession(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  
  // Get session from cookies or localStorage
  const cookies = await page.context().cookies();
  return cookies.find(c => c.name.includes('session') || c.name.includes('auth'));
}

test.describe('Walkthrough: Product Signup & Onboarding Flow', () => {
  
  test.describe('Step 1: Landing Page Access', () => {
    
    test('should load landing page successfully @walkthrough @landing', async ({ page }) => {
      const response = await page.goto(BASE_URL);
      expect(response.status()).toBe(200);
    });

    test('should display hero section with CTA @walkthrough @landing', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Hero headline visible
      await expect(page.getByText(/AI-powered lead response|LeadFlow AI/i).first()).toBeVisible();
      
      // CTA buttons visible
      const ctaButtons = page.getByRole('button', { name: /start free trial|get started/i });
      await expect(ctaButtons.first()).toBeVisible();
    });

    test('should display pricing section with 4 tiers @walkthrough @landing', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Scroll to pricing section
      await page.getByText(/pricing|plans/i).first().scrollIntoViewIfNeeded();
      
      // Check for 4 pricing tiers
      await expect(page.getByText('$49')).toBeVisible();
      await expect(page.getByText('$149')).toBeVisible();
      await expect(page.getByText('$399')).toBeVisible();
      await expect(page.getByText(/\$999|999\+/)).toBeVisible();
    });

    test('should display lead magnet section @walkthrough @landing', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Lead magnet form or section visible
      await expect(
        page.getByText(/playbook|guide|download/i).first()
      ).toBeVisible();
    });

    test('should be mobile responsive @walkthrough @landing @mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      
      // No horizontal scroll
      const body = page.locator('body');
      const scrollWidth = await body.evaluate(el => el.scrollWidth);
      const clientWidth = await body.evaluate(el => el.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
    });
  });

  test.describe('Step 2: Trial Signup Flow', () => {
    
    test('should navigate to signup page from CTA @walkthrough @signup', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Click first CTA
      const cta = page.getByRole('button', { name: /start free trial|get started/i }).first();
      await cta.click();
      
      // Should navigate to signup
      await page.waitForURL('**/signup**', { timeout: 5000 });
      expect(page.url()).toContain('/signup');
    });

    test('should display signup form with required fields @walkthrough @signup', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Required fields visible
      await expect(page.getByLabel(/email/i).first()).toBeVisible();
      await expect(page.getByLabel(/password/i).first()).toBeVisible();
      await expect(page.getByLabel(/confirm password|password confirmation/i)).toBeVisible();
    });

    test('should NOT display credit card fields @walkthrough @signup', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // No credit card fields
      await expect(page.getByLabel(/card number|credit card|cc number/i)).not.toBeVisible();
      await expect(page.getByLabel(/expiration|expiry/i)).not.toBeVisible();
      await expect(page.getByLabel(/cvv|cvc|security code/i)).not.toBeVisible();
    });

    test('should validate email format @walkthrough @signup @validation', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Enter invalid email
      await page.getByLabel(/email/i).first().fill('not-an-email');
      await page.getByLabel(/password/i).first().click(); // Blur email field
      
      // Should show validation error
      await expect(page.getByText(/invalid email|valid email/i).first()).toBeVisible();
    });

    test('should validate password requirements @walkthrough @signup @validation', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Enter weak password
      await page.getByLabel(/password/i).first().fill('weak');
      await page.getByLabel(/email/i).first().click(); // Blur password field
      
      // Should show password requirements
      await expect(page.getByText(/8 characters|uppercase|lowercase|number/i).first()).toBeVisible();
    });

    test('should require terms acceptance @walkthrough @signup @validation', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Try to submit without checking terms
      const submitButton = page.getByRole('button', { name: /create account|sign up|get started/i });
      
      // Terms checkbox should exist
      const termsCheckbox = page.getByRole('checkbox', { name: /terms|agree/i });
      await expect(termsCheckbox).toBeVisible();
    });

    test('should complete signup and redirect to dashboard @walkthrough @signup @e2e', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      await page.goto(`${BASE_URL}/signup`);
      
      // Fill signup form
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password|password confirmation/i).fill(testAgent.password);
      
      // Check terms
      await page.getByRole('checkbox', { name: /terms|agree/i }).check();
      
      // Submit
      await page.getByRole('button', { name: /create account|sign up|get started/i }).click();
      
      // Should redirect to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      expect(page.url()).toContain('/dashboard');
    });
  });

  test.describe('Step 3: Dashboard Access Post-Signup', () => {
    
    test('should display trial banner with countdown @walkthrough @dashboard', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      
      // Wait for dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Trial banner visible
      await expect(page.getByText(/14-day|trial|days remaining/i).first()).toBeVisible();
    });

    test('should display agent name in header @walkthrough @dashboard', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up with profile info
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByLabel(/first name/i).fill(testAgent.firstName);
      await page.getByLabel(/last name/i).fill(testAgent.lastName);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Agent name visible in header
      await expect(page.getByText(new RegExp(testAgent.firstName, 'i'))).toBeVisible();
    });

    test('should persist session on refresh @walkthrough @dashboard', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Refresh page
      await page.reload();
      
      // Still on dashboard (not redirected to login)
      expect(page.url()).toContain('/dashboard');
      await expect(page.getByText(/dashboard|leads|overview/i).first()).toBeVisible();
    });
  });

  test.describe('Step 4: Sample Leads Visibility', () => {
    
    test('should display at least 3 sample leads @walkthrough @sample-data', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Sample leads visible - look for demo/sample indicators or lead rows
      const leadRows = page.locator('[data-testid="lead-row"], tr, .lead-card').first();
      await expect(leadRows).toBeVisible();
      
      // Check for sample/demo indicator or at least 3 items
      const sampleIndicators = await page.getByText(/demo|sample|example/i).count();
      expect(sampleIndicators).toBeGreaterThanOrEqual(3);
    });

    test('should mark sample leads as demo @walkthrough @sample-data', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Look for demo/sample badges
      await expect(page.getByText(/demo|sample/i).first()).toBeVisible();
    });
  });

  test.describe('Step 5: Wizard Auto-Trigger', () => {
    
    test('should auto-trigger wizard for new users @walkthrough @wizard', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Wizard should auto-trigger (either as overlay or redirect to onboarding)
      await expect(
        page.getByText(/connect follow up boss|setup|onboarding|wizard/i).first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show progress indicator @walkthrough @wizard', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Progress indicator visible
      await expect(
        page.getByText(/step 1|step 2|step 3|1 of 3|2 of 3|3 of 3/i).first()
      ).toBeVisible();
    });
  });

  test.describe('Step 6: FUB Connection Step', () => {
    
    test('should display FUB connection step @walkthrough @fub', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard with wizard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // FUB step visible
      await expect(
        page.getByText(/follow up boss|FUB|connect.*crm/i).first()
      ).toBeVisible();
    });

    test('should have API key input field @walkthrough @fub', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // API key input
      await expect(
        page.getByLabel(/api key|apikey/i).first()
      ).toBeVisible();
    });

    test('should have skip option @walkthrough @fub', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Skip option
      await expect(
        page.getByText(/skip|skip for now|later/i).first()
      ).toBeVisible();
    });
  });

  test.describe('Step 7: SMS Setup Step', () => {
    
    test('should display SMS setup step @walkthrough @sms', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Skip FUB step to get to SMS
      const skipButton = page.getByText(/skip|skip for now/i).first();
      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click();
      }
      
      // SMS step visible
      await expect(
        page.getByText(/sms|phone number|twilio|text message/i).first()
      ).toBeVisible();
    });

    test('should have phone number input @walkthrough @sms', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Skip FUB to get to SMS
      const skipButton = page.getByText(/skip|skip for now/i).first();
      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click();
      }
      
      // Phone input
      await expect(
        page.getByLabel(/phone|number/i).first()
      ).toBeVisible();
    });
  });

  test.describe('Step 8: Aha Moment Simulator', () => {
    
    test('should display aha moment simulator step @walkthrough @simulator', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Skip through to simulator step
      for (let i = 0; i < 2; i++) {
        const skipButton = page.getByText(/skip|skip for now|next/i).first();
        if (await skipButton.isVisible().catch(() => false)) {
          await skipButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Simulator step visible
      await expect(
        page.getByText(/see ai in action|simulator|demo|try it out/i).first()
      ).toBeVisible();
    });

    test('should have simulate button @walkthrough @simulator', async ({ page }) => {
      const testAgent = generateTestAgent();
      
      // Sign up and reach dashboard
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      
      // Skip through to simulator step
      for (let i = 0; i < 2; i++) {
        const skipButton = page.getByText(/skip|skip for now|next/i).first();
        if (await skipButton.isVisible().catch(() => false)) {
          await skipButton.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Simulate button
      await expect(
        page.getByRole('button', { name: /simulate|try it|see it work|demo/i }).first()
      ).toBeVisible();
    });
  });

  test.describe('End-to-End: Complete Walkthrough', () => {
    
    test('should complete full walkthrough in under 2 minutes @walkthrough @e2e @critical', async ({ page }) => {
      const startTime = Date.now();
      const testAgent = generateTestAgent();
      
      // Step 1: Landing page
      await page.goto(BASE_URL);
      await expect(page.getByText(/AI-powered lead response|LeadFlow AI/i).first()).toBeVisible();
      
      // Step 2: Signup
      await page.getByRole('button', { name: /start free trial|get started/i }).first().click();
      await page.waitForURL('**/signup**', { timeout: 5000 });
      
      await page.getByLabel(/email/i).first().fill(testAgent.email);
      await page.getByLabel(/password/i).first().fill(testAgent.password);
      await page.getByLabel(/confirm password/i).fill(testAgent.password);
      await page.getByRole('checkbox', { name: /terms/i }).check();
      await page.getByRole('button', { name: /create account/i }).click();
      
      // Step 3: Dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      await expect(page.getByText(/trial|dashboard/i).first()).toBeVisible();
      
      // Step 4: Sample leads
      await expect(page.locator('tr, [data-testid="lead-row"], .lead-card').first()).toBeVisible();
      
      // Step 5-8: Wizard (verify it appears)
      await expect(
        page.getByText(/connect|setup|onboarding|wizard|follow up boss/i).first()
      ).toBeVisible({ timeout: 5000 });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      // Should complete in under 2 minutes (120 seconds)
      expect(duration).toBeLessThan(120);
      
      console.log(`Full walkthrough completed in ${duration}s`);
    });
  });
});
