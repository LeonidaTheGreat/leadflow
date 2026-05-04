'use strict'

/**
 * Task Spec (148a959d-a14c-40ef-b217-9acfccc38b22)
 * What:
 * - Add product/lead-response/dashboard/proxy.ts implementing `proxy()` and `config` for auth gating.
 * - Keep product/lead-response/dashboard/middleware.ts as a compatibility shim that re-exports `proxy`.
 * - Harden JWT/session parsing and PostgREST env normalization to avoid runtime crashes.
 * Verify:
 * - cd product/lead-response/dashboard && npm run build
 * - cd product/lead-response/dashboard && npm run lint
 * - cd product/lead-response/dashboard && npm test
 * - cd product/lead-response/dashboard && npm audit --audit-level=high
 * - curl -i https://leadflow-ai-five.vercel.app/admin/simulator returns non-500 after deploy.
 * Boundaries:
 * - Do not change simulator UI/components.
 * - Do not change simulator/admin API route business logic.
 * - Do not change database schema or migrations.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/admin', '/dashboard', '/settings', '/profile', '/integrations', '/setup']
const AUTH_ROUTES = ['/login', '/signup']
const EXPIRED_TRIAL_ALLOWED_ROUTES = ['/upgrade', '/dashboard/upgrade', '/pricing', '/settings/billing', '/login', '/logout']

function cleanEnv(value?: string): string {
  if (!value) return ''
  return value.replace(/\\n/g, '').trim()
}

const POSTGREST_URL = cleanEnv(process.env.NEXT_PUBLIC_API_URL)
const POSTGREST_KEY = cleanEnv(process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY)

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = normalized.length % 4
    const padded = normalized + (pad ? '='.repeat(4 - pad) : '')
    const decoded = atob(padded)
    const payload = JSON.parse(decoded)
    return payload && typeof payload === 'object' ? payload as Record<string, unknown> : null
  } catch {
    return null
  }
}

async function hashSessionToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const jwtToken = request.cookies.get('auth-token')?.value
  if (jwtToken) {
    const payload = decodeJwtPayload(jwtToken)
    if (payload && typeof payload.userId === 'string' && payload.userId.length > 0) {
      return payload.userId
    }
  }

  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (!sessionToken || !POSTGREST_URL) return null

  try {
    const tokenHash = await hashSessionToken(sessionToken)
    const encodedToken = encodeURIComponent(tokenHash)
    const url = `${POSTGREST_URL}/sessions?token=eq.${encodedToken}&select=user_id,expires_at&limit=1`
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(POSTGREST_KEY && { apikey: POSTGREST_KEY }),
      ...(POSTGREST_KEY && { Authorization: `Bearer ${POSTGREST_KEY}` }),
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { headers, signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return null

    const rows = (await res.json()) as Array<{ user_id?: string; expires_at?: string }>
    if (rows.length === 0) return null
    const session = rows[0]
    if (!session.user_id || !session.expires_at) return null
    if (new Date(session.expires_at) <= new Date()) return null
    return session.user_id
  } catch {
    return null
  }
}

async function isOnboardingCompleted(userId: string): Promise<boolean> {
  if (!POSTGREST_URL) return true

  try {
    const url = `${POSTGREST_URL}/real_estate_agents?id=eq.${userId}&select=onboarding_completed&limit=1`
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(POSTGREST_KEY && { apikey: POSTGREST_KEY }),
      ...(POSTGREST_KEY && { Authorization: `Bearer ${POSTGREST_KEY}` }),
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { headers, signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return true

    const rows = (await res.json()) as Array<{ onboarding_completed?: boolean }>
    if (rows.length === 0) return true
    return rows[0].onboarding_completed ?? false
  } catch {
    return true
  }
}

async function isTrialExpired(userId: string): Promise<boolean> {
  if (!POSTGREST_URL) return false

  try {
    const url = `${POSTGREST_URL}/real_estate_agents?id=eq.${userId}&select=plan_tier,trial_ends_at&limit=1`
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(POSTGREST_KEY && { apikey: POSTGREST_KEY }),
      ...(POSTGREST_KEY && { Authorization: `Bearer ${POSTGREST_KEY}` }),
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { headers, signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return false

    const rows = (await res.json()) as Array<{ plan_tier?: string; trial_ends_at?: string | null }>
    if (rows.length === 0) return false

    const agent = rows[0]
    if (agent.plan_tier !== 'trial' || !agent.trial_ends_at) return false
    return new Date() > new Date(agent.trial_ends_at)
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
    const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))

    const hasAuthCookies = request.cookies.has('auth-token') || request.cookies.has('leadflow_session')
    let userId: string | null = null
    let isAuthenticated = false

    if (isProtectedRoute || (isAuthRoute && hasAuthCookies)) {
      userId = await getUserIdFromRequest(request)
      isAuthenticated = !!userId
    }

    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (userId && isProtectedRoute) {
      const isSetupRoute = pathname.startsWith('/setup') || pathname.startsWith('/onboarding')
      if (!isSetupRoute) {
        const onboardingCompleted = await isOnboardingCompleted(userId)
        if (!onboardingCompleted) {
          return NextResponse.redirect(new URL('/setup', request.url))
        }
      }
    }

    if (userId && isProtectedRoute) {
      const isExpired = await isTrialExpired(userId)
      if (isExpired) {
        const isAllowedRoute = EXPIRED_TRIAL_ALLOWED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
        if (!isAllowedRoute) {
          return NextResponse.redirect(new URL('/upgrade', request.url))
        }
      }
    }

    const response = NextResponse.next()
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    return response
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
