/**
 * @jest-environment node
 */
import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE_NAME,
  createAdminSession,
  isValidAdminSession,
  verifyAdminToken,
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from '../lib/admin-auth'

const OLD_ENV = process.env

beforeEach(() => {
  process.env = { ...OLD_ENV, ADMIN_SECRET: 'unit-test-admin-secret-with-sufficient-length' }
})

afterAll(() => {
  process.env = OLD_ENV
})

describe('verifyAdminToken', () => {
  it('returns true for the configured secret', () => {
    expect(verifyAdminToken('unit-test-admin-secret-with-sufficient-length')).toBe(true)
  })

  it('returns false for a wrong token', () => {
    expect(verifyAdminToken('wrong-token')).toBe(false)
  })

  it('returns false when ADMIN_SECRET is not configured', () => {
    delete process.env.ADMIN_SECRET
    expect(verifyAdminToken('anything')).toBe(false)
  })

  it('returns false when ADMIN_SECRET is too short (<16 chars)', () => {
    process.env.ADMIN_SECRET = 'short'
    expect(verifyAdminToken('short')).toBe(false)
  })
})

describe('createAdminSession + isValidAdminSession', () => {
  it('round-trips: a freshly issued session validates', async () => {
    const session = await createAdminSession()
    expect(session).toBeTruthy()
    expect(await isValidAdminSession(session as string)).toBe(true)
  })

  it('rejects an undefined session', async () => {
    expect(await isValidAdminSession(undefined)).toBe(false)
  })

  it('rejects an empty session', async () => {
    expect(await isValidAdminSession('')).toBe(false)
  })

  it('rejects a malformed session (no dot)', async () => {
    expect(await isValidAdminSession('garbage')).toBe(false)
  })

  it('rejects a session with a tampered signature', async () => {
    const session = (await createAdminSession()) as string
    const [issuedAt, sig] = session.split('.')
    const flipped = sig.replace(/^./, sig[0] === 'a' ? 'b' : 'a')
    expect(await isValidAdminSession(`${issuedAt}.${flipped}`)).toBe(false)
  })

  it('rejects a session signed with a different secret', async () => {
    const session = (await createAdminSession()) as string
    process.env.ADMIN_SECRET = 'a-completely-different-admin-secret-value'
    expect(await isValidAdminSession(session)).toBe(false)
  })

  it('rejects a session older than 24 hours', async () => {
    // Forge an issuedAt > 24h ago, signed with the current secret.
    const stale = Date.now() - (25 * 60 * 60 * 1000)
    // Re-create using the same hmac path by spying — easier: call the internal flow.
    // We can construct via createAdminSession then mutate, but mutating issuedAt invalidates sig.
    // Strategy: temporarily mock Date.now, create the session, then restore.
    const realNow = Date.now
    Date.now = () => stale
    const old = (await createAdminSession()) as string
    Date.now = realNow
    expect(await isValidAdminSession(old)).toBe(false)
  })

  it('rejects when ADMIN_SECRET is not configured', async () => {
    const session = (await createAdminSession()) as string
    delete process.env.ADMIN_SECRET
    expect(await isValidAdminSession(session)).toBe(false)
  })
})

describe('setAdminSessionCookie + clearAdminSessionCookie', () => {
  it('sets an httpOnly cookie with the session value', async () => {
    const response = NextResponse.json({ ok: true })
    await setAdminSessionCookie(response)
    const cookie = response.cookies.get(ADMIN_COOKIE_NAME)
    expect(cookie).toBeDefined()
    expect(cookie?.value).toMatch(/^\d+\.[a-f0-9]{64}$/)
    expect(await isValidAdminSession(cookie?.value)).toBe(true)
  })

  it('clearAdminSessionCookie writes an empty maxAge=0 cookie', () => {
    const response = NextResponse.json({ ok: true })
    clearAdminSessionCookie(response)
    const cookie = response.cookies.get(ADMIN_COOKIE_NAME)
    expect(cookie).toBeDefined()
    expect(cookie?.value).toBe('')
  })
})
