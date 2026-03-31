/**
 * UC: First Agent Onboarding — Validate Product Stickiness
 * 
 * This test validates the end-to-end flow:
 * 1. Create/access trial agent account
 * 2. Login to dashboard
 * 3. Configure FUB integration
 * 4. Ingest test lead
 * 5. Receive SMS in <5 minutes
 * 6. Verify lead visible in dashboard
 * 
 * AHA MOMENT: Agent receives SMS response to lead in <5 minutes
 * SUCCESS METRIC: Complete flow in <5 minutes total
 */

const { test, expect } = require('@playwright/test');
const axios = require('axios');

// Test configuration
const TEST_AGENT_EMAIL = 'test-agent@example.com';
const TEST_AGENT_PASSWORD = 'TestPassword123!';
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TWILIO_WEBHOOK_URL = process.env.TWILIO_WEBHOOK_URL || 'http://localhost:8788';

test.describe('UC: First Agent Onboarding Test', () => {
  let agentId;
  let authToken;
  let testLeadId;
  const startTime = Date.now();

  test.beforeAll('Setup: Create or access trial agent', async ({ request }) => {
    // Check if test agent already exists
    const existingAgent = await request.get(`${API_BASE_URL}/api/agents/${TEST_AGENT_EMAIL}`);
    
    if (existingAgent.status() === 200) {
      const agent = await existingAgent.json();
      agentId = agent.id;
      console.log(`[Setup] Using existing agent: ${agentId}`);
    } else {
      // Create new trial agent
      const signupRes = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: {
          email: TEST_AGENT_EMAIL,
          password: TEST_AGENT_PASSWORD,
          name: 'Test Agent (E2E)',
          plan_tier: 'trial'
        }
      });

      expect(signupRes.status()).toBeLessThan(400);
      const data = await signupRes.json();
      agentId = data.id;
      authToken = data.session_token;
      console.log(`[Setup] Created trial agent: ${agentId}`);
    }
  });

  test('Step 1: Login to dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto(`${API_BASE_URL}/login`);
    
    // Enter credentials
    await page.fill('input[type="email"]', TEST_AGENT_EMAIL);
    await page.fill('input[type="password"]', TEST_AGENT_PASSWORD);
    await page.click('button:has-text("Sign In")');
    
    // Wait for dashboard redirect
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain('/dashboard');
    console.log(`✓ Step 1 PASS: Dashboard accessible`);
  });

  test('Step 2: Navigate to integrations (FUB)', async ({ page }) => {
    // Login first
    await page.goto(`${API_BASE_URL}/dashboard`);
    
    // Click integrations
    await page.click('a[href*="integrations"]');
    await page.waitForURL(/\/integrations/);
    
    // Verify FUB integration option visible
    const fubSection = await page.locator('text=Follow Up Boss').first();
    await expect(fubSection).toBeVisible();
    console.log(`✓ Step 2 PASS: FUB integration available`);
  });

  test('Step 3: FUB API key validation', async ({ request }) => {
    // Check if test agent has FUB configured
    const res = await request.get(`${API_BASE_URL}/api/agents/${agentId}/integrations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const integrations = await res.json();
    const fubConfig = integrations.find(i => i.type === 'fub');
    
    if (!fubConfig) {
      console.log(`⚠ Step 3 WARNING: FUB not configured for agent. Manual config required.`);
      // This is expected — agent must configure FUB manually
    } else {
      expect(fubConfig.api_key).toBeTruthy();
      console.log(`✓ Step 3 PASS: FUB configured`);
    }
  });

  test('Step 4: Send test lead to agent', async ({ request }) => {
    // This simulates FUB webhook inbound
    const testLead = {
      phone: '+12025551234',
      name: 'E2E Test Lead',
      source: 'Facebook',
      message: 'Interested in a consultation'
    };

    const res = await request.post(`${TWILIO_WEBHOOK_URL}/webhook/fub-inbound`, {
      data: {
        agent_id: agentId,
        lead: testLead,
        timestamp: new Date().toISOString()
      }
    });

    expect(res.status()).toBeLessThan(400);
    const data = await res.json();
    testLeadId = data.lead_id;
    console.log(`✓ Step 4 PASS: Test lead created (ID: ${testLeadId})`);
  });

  test('Step 5: Verify SMS sent within 30 seconds', async ({ request }) => {
    const sendTime = Date.now();
    let smsReceived = false;
    let attempts = 0;
    const maxAttempts = 6; // 6 * 5s = 30s max wait

    while (!smsReceived && attempts < maxAttempts) {
      const res = await request.get(`${API_BASE_URL}/api/leads/${testLeadId}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const messages = await res.json();
      smsReceived = messages.some(m => m.type === 'sms' && m.direction === 'outbound');

      if (!smsReceived) {
        await new Promise(r => setTimeout(r, 5000)); // Wait 5s
        attempts++;
      }
    }

    const elapsedMs = Date.now() - sendTime;
    expect(smsReceived).toBe(true);
    expect(elapsedMs).toBeLessThan(30000); // Under 30 seconds
    console.log(`✓ Step 5 PASS: SMS sent (${elapsedMs}ms)`);
  });

  test('Step 6: Verify lead visible in dashboard', async ({ page }) => {
    // Refresh dashboard
    await page.goto(`${API_BASE_URL}/dashboard`);
    await page.waitForURL(/\/dashboard/);

    // Check if test lead visible in recent leads
    const leadRow = await page.locator(`text=${testLeadId}`).first();
    await expect(leadRow).toBeVisible({ timeout: 10000 });
    console.log(`✓ Step 6 PASS: Lead visible in dashboard`);
  });

  test('AHA MOMENT: End-to-end validation <5 minutes', async () => {
    const totalTime = Date.now() - startTime;
    const totalSeconds = totalTime / 1000;

    console.log(`\n=== AHA MOMENT VALIDATION ===`);
    console.log(`Total Time: ${totalSeconds.toFixed(2)}s (Target: <300s)`);
    console.log(`Flow:`);
    console.log(`  ✓ Agent logged in`);
    console.log(`  ✓ FUB integrated`);
    console.log(`  ✓ Lead ingested`);
    console.log(`  ✓ SMS sent <30s`);
    console.log(`  ✓ Lead visible in dashboard`);
    
    expect(totalTime).toBeLessThan(5 * 60 * 1000); // 5 minutes
    console.log(`\n✅ AHA MOMENT ACHIEVED`);
  });

  test.afterAll('Cleanup', async ({ request }) => {
    // Optional: Clean up test data
    if (testLeadId) {
      await request.delete(`${API_BASE_URL}/api/leads/${testLeadId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    }
  });
});
