/**
 * @jest-environment node
 *
 * Tests for bcrypt password verification fix
 * Task: fix-bcrypt-password-verify-fails-after-signup
 * Issue: Stored password cannot be verified after account creation
 */

import { POST as trialSignupHandler } from '../app/api/auth/trial-signup/route'
import { POST as pilotSignupHandler } from '../app/api/auth/pilot-signup/route'
import { POST as loginHandler } from '../app/api/auth/login/route'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

// ---- Mocks ----
const mockAgent = { id: 'agent-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }

// Store inserted data for verification
let lastInsertedData: any = null
let mockAgentsDb: Map<string, any> = new Map()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === 'real_estate_agents') {
        return {
          select: (columns?: string) => ({
            eq: (field: string, value: string) => ({
              single: () => {
                const agent = mockAgentsDb.get(value.toLowerCase())
                if (agent) {
                  return Promise.resolve({ data: agent, error: null })
                }
                return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } })
              },
            }),
          }),
          insert: (data: any) => {
            lastInsertedData = data
            // Store in mock DB for login tests
            if (data.email) {
              mockAgentsDb.set(data.email.toLowerCase(), {
                ...data,
                id: data.id || 'agent-123',
                email_verified: true,
                onboarding_completed: false,
              })
            }
            return {
              select: () => ({
                single: () => Promise.resolve({
                  data: { ...mockAgent, email: data.email },
                  error: null,
                }),
              }),
            }
          },
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }
      }
      return {
        insert: () => Promise.resolve({ error: null }),
      }
    },
  })),
}))

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock_jwt_token'),
  verify: jest.fn(() => ({ userId: 'agent-123', email: 'test@example.com' })),
}))

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve(''),
  })
) as jest.Mock

// Mock agent-session
jest.mock('@/lib/agent-session', () => ({
  logSessionStart: jest.fn(() => Promise.resolve({ id: 'session-123' })),
}))

// ---- Helpers ----
function makeSignupRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/auth/trial-signup', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function makeLoginRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ---- Tests ----

describe('Password Verification Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    lastInsertedData = null
    mockAgentsDb.clear()
    process.env.JWT_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  describe('AC-1: Signup hashes password exactly once', () => {
    it('trial signup should store a valid bcrypt hash', async () => {
      const password = 'testpassword123'
      
      const request = makeSignupRequest({
        email: 'test@example.com',
        password: password,
        name: 'Test User',
      })

      const response = await trialSignupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify the stored hash is a valid bcrypt hash
      expect(lastInsertedData).toBeDefined()
      expect(lastInsertedData.password_hash).toBeDefined()
      
      // bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars
      const bcryptPattern = /^\$2[aby]\$\d+\$/
      expect(lastInsertedData.password_hash).toMatch(bcryptPattern)
      expect(lastInsertedData.password_hash.length).toBe(60)
      
      // Most importantly: the hash should verify against the original password
      const isValid = await bcrypt.compare(password, lastInsertedData.password_hash)
      expect(isValid).toBe(true)
    })

    it('pilot signup should store a valid bcrypt hash', async () => {
      const password = 'pilotpass456'
      
      const request = new NextRequest('http://localhost/api/auth/pilot-signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'pilot@example.com',
          password: password,
          name: 'Pilot User',
        }),
      })

      const response = await pilotSignupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify the stored hash is a valid bcrypt hash
      expect(lastInsertedData).toBeDefined()
      expect(lastInsertedData.password_hash).toBeDefined()
      
      // bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars
      const bcryptPattern = /^\$2[aby]\$\d+\$/
      expect(lastInsertedData.password_hash).toMatch(bcryptPattern)
      expect(lastInsertedData.password_hash.length).toBe(60)
      
      // Most importantly: the hash should verify against the original password
      const isValid = await bcrypt.compare(password, lastInsertedData.password_hash)
      expect(isValid).toBe(true)
    })

    it('should NOT double-hash the password', async () => {
      const password = 'testpassword123'
      
      const request = makeSignupRequest({
        email: 'doublehash@example.com',
        password: password,
        name: 'Test User',
      })

      await trialSignupHandler(request)
      
      // If password was double-hashed, comparing the original password 
      // with the hash would fail
      const isValid = await bcrypt.compare(password, lastInsertedData.password_hash)
      expect(isValid).toBe(true)
      
      // Also verify that the hash is NOT a hash of a hash
      // (this would indicate double-hashing)
      const hashOfHash = await bcrypt.hash(lastInsertedData.password_hash, 10)
      const isDoubleHash = await bcrypt.compare(password, hashOfHash)
      // This should fail - we're just verifying our test logic works
      expect(isDoubleHash).toBe(false)
    })
  })

  describe('AC-2: Login can verify stored password', () => {
    it('should successfully login after trial signup with same credentials', async () => {
      const email = 'logintest@example.com'
      const password = 'mypassword123'
      
      // First, sign up
      const signupRequest = makeSignupRequest({
        email: email,
        password: password,
        name: 'Login Test User',
      })
      
      const signupResponse = await trialSignupHandler(signupRequest)
      expect(signupResponse.status).toBe(200)
      
      // Now try to login with the same credentials
      const loginReq = makeLoginRequest({
        email: email,
        password: password,
      })
      
      const loginResponse = await loginHandler(loginReq)
      const loginData = await loginResponse.json()
      
      expect(loginResponse.status).toBe(200)
      expect(loginData.success).toBe(true)
      expect(loginData.token).toBeDefined()
      expect(loginData.user).toBeDefined()
      expect(loginData.user.email).toBe(email.toLowerCase())
    })

    it('should successfully login after pilot signup with same credentials', async () => {
      const email = 'pilotlogin@example.com'
      const password = 'pilotpassword456'
      
      // First, sign up via pilot
      const signupRequest = new NextRequest('http://localhost/api/auth/pilot-signup', {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          password: password,
          name: 'Pilot Login User',
        }),
      })
      
      const signupResponse = await pilotSignupHandler(signupRequest)
      expect(signupResponse.status).toBe(200)
      
      // Now try to login with the same credentials
      const loginReq = makeLoginRequest({
        email: email,
        password: password,
      })
      
      const loginResponse = await loginHandler(loginReq)
      const loginData = await loginResponse.json()
      
      expect(loginResponse.status).toBe(200)
      expect(loginData.success).toBe(true)
      expect(loginData.token).toBeDefined()
    })

    it('should reject login with wrong password', async () => {
      const email = 'wrongpass@example.com'
      const password = 'correctpassword123'
      const wrongPassword = 'wrongpassword456'
      
      // Sign up
      const signupRequest = makeSignupRequest({
        email: email,
        password: password,
        name: 'Wrong Pass Test',
      })
      
      await trialSignupHandler(signupRequest)
      
      // Try to login with wrong password
      const loginReq = makeLoginRequest({
        email: email,
        password: wrongPassword,
      })
      
      const loginResponse = await loginHandler(loginReq)
      const loginData = await loginResponse.json()
      
      expect(loginResponse.status).toBe(401)
      expect(loginData.error).toContain('Invalid')
    })
  })

  describe('AC-3: Database column stores full bcrypt hash', () => {
    it('stored hash should be exactly 60 characters (standard bcrypt)', async () => {
      const password = 'anypassword123'
      
      const request = makeSignupRequest({
        email: 'hashlength@example.com',
        password: password,
        name: 'Hash Length Test',
      })

      await trialSignupHandler(request)
      
      // Standard bcrypt hashes are exactly 60 characters
      expect(lastInsertedData.password_hash).toBeDefined()
      expect(lastInsertedData.password_hash.length).toBe(60)
    })

    it('stored hash should use standard bcrypt format', async () => {
      const password = 'testpassword'
      
      const request = makeSignupRequest({
        email: 'hashformat@example.com',
        password: password,
        name: 'Hash Format Test',
      })

      await trialSignupHandler(request)
      
      // Standard bcrypt format: $2a$<cost>$<22 char salt><31 char hash>
      const bcryptFormat = /^\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}$/
      expect(lastInsertedData.password_hash).toMatch(bcryptFormat)
    })
  })

  describe('AC-4: Password trimming consistency', () => {
    it('should handle passwords with whitespace consistently', async () => {
      // Note: This test documents current behavior
      // If the system trims passwords, it should do so consistently
      const password = 'passwordwithspace '
      const email = 'whitespace@example.com'
      
      const signupRequest = makeSignupRequest({
        email: email,
        password: password,
        name: 'Whitespace Test',
      })
      
      await trialSignupHandler(signupRequest)
      
      // Try login with exact same password (including space)
      const loginReq = makeLoginRequest({
        email: email,
        password: password,
      })
      
      const loginResponse = await loginHandler(loginReq)
      expect(loginResponse.status).toBe(200)
    })
  })
})

describe('bcrypt library verification', () => {
  it('bcrypt.hash and bcrypt.compare should work correctly', async () => {
    const password = 'testpassword123'
    const hash = await bcrypt.hash(password, 10)
    
    // Verify hash format
    expect(hash.length).toBe(60)
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/)
    
    // Verify comparison works
    const isValid = await bcrypt.compare(password, hash)
    expect(isValid).toBe(true)
    
    // Verify wrong password fails
    const isInvalid = await bcrypt.compare('wrongpassword', hash)
    expect(isInvalid).toBe(false)
  })
  
  it('should handle concurrent hashing correctly', async () => {
    const passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5']
    const hashes = await Promise.all(passwords.map(p => bcrypt.hash(p, 10)))
    
    // Verify each hash is unique (different salts)
    const uniqueHashes = new Set(hashes)
    expect(uniqueHashes.size).toBe(passwords.length)
    
    // Verify each password verifies against its hash
    for (let i = 0; i < passwords.length; i++) {
      const isValid = await bcrypt.compare(passwords[i], hashes[i])
      expect(isValid).toBe(true)
    }
  })
})
