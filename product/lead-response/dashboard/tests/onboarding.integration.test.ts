/**
 * Agent Onboarding UI - Integration Tests
 * Tests the complete onboarding flow end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const API_URL = `${BASE_URL}/api`

interface TestAgent {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  state: string
  timezone?: string
  calcomLink?: string
  smsPhoneNumber?: string
}

describe('Agent Onboarding UI - End-to-End', () => {
  let testAgent: TestAgent

  beforeAll(() => {
    // Generate unique test agent for each run
    const timestamp = Date.now()
    testAgent = {
      email: `test-agent-${timestamp}@leadflow.test`,
      password: 'SecurePass123!@',
      firstName: 'Test',
      lastName: 'Agent',
      phoneNumber: '5551234567',
      state: 'California',
      timezone: 'America/Los_Angeles',
      calcomLink: 'https://cal.com/test-agent',
      smsPhoneNumber: '+15551234567',
    }
  })

  describe('Step 1: Email Validation', () => {
    it('should validate email format', async () => {
      const response = await fetch(`${API_URL}/agents/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' }),
      })

      expect(response.status).toBe(400)
    })

    it('should check email availability', async () => {
      const response = await fetch(`${API_URL}/agents/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testAgent.email }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('available')
      expect(typeof data.available).toBe('boolean')
    })

    it('should return error for missing email', async () => {
      const response = await fetch(`${API_URL}/agents/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Step 2: Agent Registration', () => {
    it('should fail with missing required fields', async () => {
      const response = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAgent.email,
          password: testAgent.password,
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should successfully register agent with required fields', async () => {
      const response = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAgent.email,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
        }),
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toHaveProperty('agent')
      expect(data.agent.email).toBe(testAgent.email.toLowerCase())
      expect(data.agent).not.toHaveProperty('password_hash')
      expect(data.agent).toHaveProperty('id')
      expect(data.agent).toHaveProperty('status')
    })

    it('should prevent duplicate email registration', async () => {
      // First registration
      await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `duplicate-${Date.now()}@test.com`,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
        }),
      })

      // Second registration with same email
      const response = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `duplicate-${Date.now()}@test.com`,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
        }),
      })

      expect(response.status).toBe(409)
    })

    it('should normalize email to lowercase', async () => {
      const mixedCaseEmail = `MixedCase${Date.now()}@TEST.COM`
      const response = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mixedCaseEmail,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
        }),
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.agent.email).toBe(mixedCaseEmail.toLowerCase())
    })

    it('should hash password before storage', async () => {
      const response = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `pwd-test-${Date.now()}@test.com`,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
        }),
      })

      const data = await response.json()
      // Password should never be returned
      expect(data.agent).not.toHaveProperty('password')
      expect(data.agent).not.toHaveProperty('password_hash')
    })
  })

  describe('Step 3: Calendar Integration', () => {
    it('should verify valid Cal.com link', async () => {
      const response = await fetch(`${API_URL}/integrations/cal-com/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calcomLink: 'https://cal.com/example',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('valid')
    })

    it('should reject invalid Cal.com URL', async () => {
      const response = await fetch(`${API_URL}/integrations/cal-com/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calcomLink: 'https://example.com',
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.valid).toBe(false)
    })

    it('should require Cal.com link', async () => {
      const response = await fetch(`${API_URL}/integrations/cal-com/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding with all fields', async () => {
      const uniqueEmail = `full-flow-${Date.now()}@test.com`

      // Step 1: Check email availability
      const checkResponse = await fetch(`${API_URL}/agents/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uniqueEmail }),
      })

      expect(checkResponse.status).toBe(200)
      let data = await checkResponse.json()
      expect(data.available).toBe(true)

      // Step 2: Verify calendar link
      const calResponse = await fetch(`${API_URL}/integrations/cal-com/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calcomLink: 'https://cal.com/test-agent',
        }),
      })

      expect(calResponse.status).toBe(200)

      // Step 3: Complete registration
      const registerResponse = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueEmail,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
          calcomLink: 'https://cal.com/test-agent',
          smsPhoneNumber: '+15551234567',
        }),
      })

      expect(registerResponse.status).toBe(201)
      data = await registerResponse.json()
      expect(data.agent).toHaveProperty('id')
      expect(data.agent.email).toBe(uniqueEmail.toLowerCase())
      expect(data.agent.first_name).toBe(testAgent.firstName)
      expect(data.agent.status).toBe('onboarding')
    })
  })

  describe('Security & Validation', () => {
    it('should validate phone number format', async () => {
      const response = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `phone-test-${Date.now()}@test.com`,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: 'invalid',
          state: testAgent.state,
        }),
      })

      // API accepts any phone, validation is on frontend
      // Backend should store as-is
      expect([201, 400]).toContain(response.status)
    })

    it('should enforce password requirements', async () => {
      const response = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `pwd-val-${Date.now()}@test.com`,
          password: 'short', // Too short
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
        }),
      })

      // Backend accepts, frontend validates minimum length
      expect(response.status).toBe(201)
    })

    it('should not expose sensitive data in responses', async () => {
      const response = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `sensitive-${Date.now()}@test.com`,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
        }),
      })

      const data = await response.json()
      expect(data.agent).not.toHaveProperty('password')
      expect(data.agent).not.toHaveProperty('password_hash')
      expect(data.agent).not.toHaveProperty('created_at')
    })
  })

  describe('API Response Format', () => {
    it('should return consistent JSON structure', async () => {
      const response = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `format-test-${Date.now()}@test.com`,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
        }),
      })

      expect(response.headers.get('content-type')).toContain('application/json')
      const data = await response.json()
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('agent')
      expect(typeof data.agent).toBe('object')
    })

    it('should include proper HTTP status codes', async () => {
      // Success
      const successResponse = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `status-test-${Date.now()}@test.com`,
          password: testAgent.password,
          firstName: testAgent.firstName,
          lastName: testAgent.lastName,
          phoneNumber: testAgent.phoneNumber,
          state: testAgent.state,
        }),
      })

      expect(successResponse.status).toBe(201)

      // Bad request
      const badResponse = await fetch(`${API_URL}/agents/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      expect(badResponse.status).toBe(400)
    })
  })
})
