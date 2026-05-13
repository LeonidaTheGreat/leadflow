import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'admin_session'
const MAX_AGE_SECONDS = 24 * 60 * 60

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function verifyAdminToken(token: string): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret || secret.length < 16) return false
  return constantTimeEqual(token, secret)
}

export async function createAdminSession(): Promise<string | null> {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return null
  const issuedAt = Date.now().toString()
  const sig = await hmacSign(issuedAt, secret)
  return `${issuedAt}.${sig}`
}

export async function isValidAdminSession(value: string | undefined): Promise<boolean> {
  if (!value) return false
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const parts = value.split('.')
  if (parts.length !== 2) return false
  const [issuedAt, sig] = parts
  if (!/^\d+$/.test(issuedAt) || !/^[a-f0-9]{64}$/.test(sig)) return false
  const expected = await hmacSign(issuedAt, secret)
  if (!constantTimeEqual(sig, expected)) return false
  const ageMs = Date.now() - Number(issuedAt)
  if (ageMs < 0 || ageMs > MAX_AGE_SECONDS * 1000) return false
  return true
}

export async function requireAdminSession(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(COOKIE_NAME)?.value
  return isValidAdminSession(cookie)
}

export async function setAdminSessionCookie(response: NextResponse): Promise<void> {
  const session = await createAdminSession()
  if (!session) return
  response.cookies.set({
    name: COOKIE_NAME,
    value: session,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME
