/**
 * Unit tests for ensure-test-user genome QA fixture
 *
 * Covers: state column mappings, idempotency, admin session format,
 * CLI output contract (last line = JSON), and error paths.
 * DB calls are mocked via global.fetch.
 */

import crypto from 'crypto'

// Mock bcryptjs before importing the module under test
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$mockedhash'),
}))

// Mock fs so loadEnvFile doesn't fail in test environment
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn().mockReturnValue(''),
  existsSync: jest.fn().mockReturnValue(false),
}))

import {
  ensureTestUser,
  stateColumns,
  generateAdminSession,
  VALID_STATES,
  type State,
  type TestUserResult,
} from '../../scripts/ensure-test-user'

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchSequence(...responses: Array<{ ok: boolean; body: unknown; status?: number }>): void {
  let call = 0
  global.fetch = jest.fn().mockImplementation(async () => {
    const r = responses[call] ?? responses[responses.length - 1]
    call++
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 500),
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    }
  })
}

const MOCK_AGENT_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const TEST_EMAIL = 'genome-test@test.leadflow.internal'
const TEST_PASSWORD = 'TestPass123!'

// Standard happy-path fetch sequence:
// 1. pgGet real_estate_agents → [] (no existing user)
// 2. pgInsert real_estate_agents → [{ id }]
// 3. pgPatch real_estate_agents → ok
// 4. pgGet leads → [] (no existing lead)
// 5. pgInsert leads → [{}]
function mockNewUserFlow(state: State = 'onboarded'): void {
  void state // state doesn't change mock shape
  mockFetchSequence(
    { ok: true, body: [] },                                    // GET agents (no existing)
    { ok: true, body: [{ id: MOCK_AGENT_ID }] },              // POST agents (create)
    { ok: true, body: [{ id: MOCK_AGENT_ID }] },              // PATCH agents (state)
    { ok: true, body: [] },                                    // GET leads (no existing)
    { ok: true, body: [{ id: 'lead-001' }] }                  // POST leads (seed)
  )
}

function mockExistingUserFlow(): void {
  mockFetchSequence(
    { ok: true, body: [{ id: MOCK_AGENT_ID }] },              // GET agents (found)
    { ok: true, body: [{ id: MOCK_AGENT_ID }] },              // PATCH agents (state)
    { ok: true, body: [] },                                    // GET leads (no existing)
    { ok: true, body: [{ id: 'lead-001' }] }                  // POST leads (seed)
  )
}

// ── Env setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8787'
  process.env.API_SECRET_KEY = 'test-api-key'
  process.env.ADMIN_SECRET = 'test-admin-secret-key-16chars'
})

// ── stateColumns ─────────────────────────────────────────────────────────────

describe('stateColumns', () => {
  it('new: onboarding_completed=false, plan_tier=trial', () => {
    const cols = stateColumns('new')
    expect(cols.onboarding_completed).toBe(false)
    expect(cols.plan_tier).toBe('trial')
    expect(cols.email_verified).toBe(true)
    expect(new Date(cols.trial_ends_at as string).getTime()).toBeGreaterThan(Date.now())
  })

  it('onboarded: onboarding_completed=true, plan_tier=trial, active trial', () => {
    const cols = stateColumns('onboarded')
    expect(cols.onboarding_completed).toBe(true)
    expect(cols.plan_tier).toBe('trial')
    expect(new Date(cols.trial_ends_at as string).getTime()).toBeGreaterThan(Date.now())
  })

  it('trial-active: onboarded + subscription_status=trial', () => {
    const cols = stateColumns('trial-active')
    expect(cols.onboarding_completed).toBe(true)
    expect(cols.plan_tier).toBe('trial')
    expect(cols.subscription_status).toBe('trial')
    expect(new Date(cols.trial_ends_at as string).getTime()).toBeGreaterThan(Date.now())
  })

  it('trial-expired: trial_ends_at in the past', () => {
    const cols = stateColumns('trial-expired')
    expect(cols.onboarding_completed).toBe(true)
    expect(cols.plan_tier).toBe('trial')
    expect(new Date(cols.trial_ends_at as string).getTime()).toBeLessThan(Date.now())
  })

  it('paid: plan_tier=starter, subscription_status=active, trial_ends_at=null', () => {
    const cols = stateColumns('paid')
    expect(cols.onboarding_completed).toBe(true)
    expect(cols.plan_tier).toBe('starter')
    expect(cols.subscription_status).toBe('active')
    expect(cols.trial_ends_at).toBeNull()
  })

  it('admin: provisioned as onboarded trial user (cookie gate, not DB column)', () => {
    const cols = stateColumns('admin')
    expect(cols.onboarding_completed).toBe(true)
    expect(cols.plan_tier).toBe('trial')
  })

  it('all states set email_verified=true', () => {
    for (const state of VALID_STATES) {
      expect(stateColumns(state).email_verified).toBe(true)
    }
  })
})

// ── generateAdminSession ──────────────────────────────────────────────────────

describe('generateAdminSession', () => {
  it('returns issuedAt.hex64 format', () => {
    const token = generateAdminSession('exactly-16-chars')
    const [issuedAt, sig] = token.split('.')
    expect(/^\d+$/.test(issuedAt)).toBe(true)
    expect(/^[a-f0-9]{64}$/.test(sig)).toBe(true)
  })

  it('is verifiable with the same secret', () => {
    const secret = 'test-secret-min16'
    const token = generateAdminSession(secret)
    const [issuedAt, sig] = token.split('.')
    const expected = crypto.createHmac('sha256', secret).update(issuedAt).digest('hex')
    expect(sig).toBe(expected)
  })

  it('throws when ADMIN_SECRET is missing', () => {
    expect(() => generateAdminSession('')).toThrow('ADMIN_SECRET')
  })

  it('throws when ADMIN_SECRET is too short', () => {
    expect(() => generateAdminSession('short')).toThrow('ADMIN_SECRET')
  })
})

// ── ensureTestUser — happy paths ──────────────────────────────────────────────

describe('ensureTestUser', () => {
  describe('creates new user when none exists', () => {
    it('returns correct email, password, state, agent_id', async () => {
      mockNewUserFlow('onboarded')
      const result = await ensureTestUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        state: 'onboarded',
      })
      expect(result.email).toBe(TEST_EMAIL.toLowerCase())
      expect(result.password).toBe(TEST_PASSWORD)
      expect(result.state).toBe('onboarded')
      expect(result.agent_id).toBe(MOCK_AGENT_ID)
    })

    it('lowercases email', async () => {
      mockNewUserFlow()
      const result = await ensureTestUser({
        email: 'Genome-UPPER@Test.leadflow.internal',
        password: TEST_PASSWORD,
        state: 'onboarded',
      })
      expect(result.email).toBe('genome-upper@test.leadflow.internal')
    })
  })

  describe('reuses existing user (idempotency)', () => {
    it('calls GET first and skips INSERT when user exists', async () => {
      mockExistingUserFlow()
      const result = await ensureTestUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        state: 'onboarded',
      })
      expect(result.agent_id).toBe(MOCK_AGENT_ID)

      // Verify: no INSERT to real_estate_agents (2nd fetch is PATCH, not POST)
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const insertCall = fetchCalls.find(
        ([url, opts]: [string, RequestInit]) =>
          url.includes('real_estate_agents') && opts.method === 'POST'
      )
      expect(insertCall).toBeUndefined()
    })
  })

  describe('admin state', () => {
    it('returns admin_session token', async () => {
      mockNewUserFlow('admin')
      const result = await ensureTestUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        state: 'admin',
      })
      expect(result.admin_session).toBeDefined()
      expect(typeof result.admin_session).toBe('string')
      const [issuedAt, sig] = (result.admin_session ?? '').split('.')
      expect(/^\d+$/.test(issuedAt)).toBe(true)
      expect(/^[a-f0-9]{64}$/.test(sig)).toBe(true)
    })

    it('does not return admin_session for non-admin states', async () => {
      mockNewUserFlow('onboarded')
      const result = await ensureTestUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        state: 'onboarded',
      })
      expect(result.admin_session).toBeUndefined()
    })
  })

  describe('data axis', () => {
    it('populated (default): inserts a genome_fixture lead', async () => {
      mockNewUserFlow()
      await ensureTestUser({ email: TEST_EMAIL, password: TEST_PASSWORD, state: 'onboarded' })
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const leadInsert = fetchCalls.find(
        ([url, opts]: [string, RequestInit]) =>
          url.includes('/leads') && opts.method === 'POST'
      )
      expect(leadInsert).toBeDefined()
      const body = JSON.parse(leadInsert[1].body as string)
      expect(body.source).toBe('genome_fixture')
    })

    it('empty: deletes genome_fixture leads when they exist', async () => {
      mockFetchSequence(
        { ok: true, body: [{ id: MOCK_AGENT_ID }] },          // GET agents (existing)
        { ok: true, body: [{ id: MOCK_AGENT_ID }] },          // PATCH agents
        { ok: true, body: [{ id: 'lead-001' }] },             // GET leads (found)
        { ok: true, body: null }                               // DELETE leads
      )
      await ensureTestUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        state: 'onboarded',
        data: 'empty',
      })
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const leadDelete = fetchCalls.find(
        ([url, opts]: [string, RequestInit]) =>
          url.includes('/leads') && opts.method === 'DELETE'
      )
      expect(leadDelete).toBeDefined()
    })

    it('empty: no delete when no genome_fixture leads exist', async () => {
      mockFetchSequence(
        { ok: true, body: [{ id: MOCK_AGENT_ID }] },          // GET agents (existing)
        { ok: true, body: [{ id: MOCK_AGENT_ID }] },          // PATCH agents
        { ok: true, body: [] }                                 // GET leads (none)
      )
      await ensureTestUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        state: 'onboarded',
        data: 'empty',
      })
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const leadDelete = fetchCalls.find(
        ([_url, opts]: [string, RequestInit]) => opts?.method === 'DELETE'
      )
      expect(leadDelete).toBeUndefined()
    })

    it('populated: skips insert when lead already exists', async () => {
      mockFetchSequence(
        { ok: true, body: [{ id: MOCK_AGENT_ID }] },          // GET agents
        { ok: true, body: [{ id: MOCK_AGENT_ID }] },          // PATCH agents
        { ok: true, body: [{ id: 'lead-001' }] }              // GET leads (found — skip)
      )
      await ensureTestUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        state: 'onboarded',
        data: 'populated',
      })
      const fetchCalls = (global.fetch as jest.Mock).mock.calls
      const leadInsert = fetchCalls.find(
        ([url, opts]: [string, RequestInit]) =>
          url.includes('/leads') && opts.method === 'POST'
      )
      expect(leadInsert).toBeUndefined()
    })
  })

  describe('error paths', () => {
    it('throws for invalid state', async () => {
      await expect(
        ensureTestUser({ email: TEST_EMAIL, password: TEST_PASSWORD, state: 'invalid' as State })
      ).rejects.toThrow('Invalid state')
    })

    it('throws when NEXT_PUBLIC_API_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_API_URL
      await expect(
        ensureTestUser({ email: TEST_EMAIL, password: TEST_PASSWORD, state: 'onboarded' })
      ).rejects.toThrow('NEXT_PUBLIC_API_URL')
    })

    it('throws when PostgREST returns an error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'connection refused' }),
        text: async () => 'connection refused',
      })
      await expect(
        ensureTestUser({ email: TEST_EMAIL, password: TEST_PASSWORD, state: 'onboarded' })
      ).rejects.toThrow('HTTP 500')
    })
  })

  describe('output contract', () => {
    it('result contains email, password, state, agent_id', async () => {
      mockNewUserFlow()
      const result: TestUserResult = await ensureTestUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        state: 'trial-expired',
      })
      // Verify the JSON contract that capture-screenshots parses
      const json = JSON.parse(JSON.stringify(result))
      expect(json).toHaveProperty('email')
      expect(json).toHaveProperty('password')
      expect(json).toHaveProperty('state')
      expect(json).toHaveProperty('agent_id')
    })

    it('all 6 states produce a valid result shape', async () => {
      for (const state of VALID_STATES) {
        mockNewUserFlow(state as State)
        const result = await ensureTestUser({
          email: `genome-${state}@test.leadflow.internal`,
          password: TEST_PASSWORD,
          state: state as State,
        })
        expect(result.agent_id).toBe(MOCK_AGENT_ID)
        expect(result.state).toBe(state)
        if (state === 'admin') {
          expect(result.admin_session).toBeDefined()
        }
      }
    })
  })
})
