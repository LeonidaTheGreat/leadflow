import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { createClient } from '@/lib/db'
import { AuthService } from '@/lib/services/AuthService'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/admin',
  '/dashboard',
  '/settings',
  '/profile',
  '/integrations',
  '/setup',
]

// Routes that should redirect to dashboard if already authenticated
// NOTE: /onboarding and /setup are intentionally NOT here — authenticated users who haven't
// completed onboarding need to access these routes.
const AUTH_ROUTES = [
  '/login',
  '/signup',
]

// Routes that are always allowed even for expired trials
const EXPIRED_TRIAL_ALLOWED_ROUTES = [
  '/upgrade',
  '/dashboard/upgrade',
  '/pricing',
  '/settings/billing',
  '/login',
  '/logout',
]

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// PostgREST config for DB queries in middleware
const POSTGREST_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim()
const POSTGREST_KEY = (process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || '').trim()
const authService = new AuthService(
  createClient(POSTGREST_URL || 'https://api.imagineapi.org', POSTGREST_KEY)
)

/**
 * Extract userId from either JWT (auth-token) or session token (leadflow_session)
 * Uses Edge-compatible jose library for JWT verification.
 * For session tokens, delegates to AuthService.
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // Try JWT token first (from trial-signup)
  const jwtToken = request.cookies.get('auth-token')?.value
  if (jwtToken) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload } = await jwtVerify(jwtToken, secret)
      if (payload.userId) {
        return payload.userId as string
      }
    } catch {
      // JWT validation failed, try session token
    }
  }

  // Try session token (from login)
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (sessionToken) {
    try {
      const session = await authService.validateSession(sessionToken)
      if (session) {
        return session.userId
      }
    } catch (err) {
      // Session validation failed
    }
  }

  return null
}

/**
 * Check if user's onboarding is completed (via PostgREST fetch, Edge-safe)
 */
async function isOnboardingCompleted(userId: string): Promise<boolean> {
  if (!POSTGREST_URL) return true
  try {
    const url = `${POSTGREST_URL}/real_estate_agents?id=eq.${userId}&select=onboarding_completed&limit=1`
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(POSTGREST_KEY && { 'apikey': POSTGREST_KEY }),
      ...(POSTGREST_KEY && { 'Authorization': `Bearer ${POSTGREST_KEY}` }),
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const res = await fetch(url, { headers, signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return true
    const rows = await res.json()
    if (rows.length === 0) return true
    return rows[0].onboarding_completed ?? false
  } catch (err) {
    // On error or timeout, fail open (allow access)
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('Onboarding check timeout')
    }
    return true
  }
}

/**
 * Check if user's trial has expired (via PostgREST fetch, Edge-safe)
 */
async function isTrialExpired(userId: string): Promise<boolean> {
  if (!POSTGREST_URL) return false
  try {
    const url = `${POSTGREST_URL}/real_estate_agents?id=eq.${userId}&select=plan_tier,trial_ends_at&limit=1`
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(POSTGREST_KEY && { 'apikey': POSTGREST_KEY }),
      ...(POSTGREST_KEY && { 'Authorization': `Bearer ${POSTGREST_KEY}` }),
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const res = await fetch(url, { headers, signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return false
    const rows = await res.json()
    if (rows.length === 0) return false
    const agent = rows[0]
    if (agent.plan_tier !== 'trial') return false
    if (!agent.trial_ends_at) return false
    return new Date() > new Date(agent.trial_ends_at)
  } catch (err) {
    // On error or timeout, fail safe (assume trial not expired)
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('Trial expiration check timeout')
    }
    return false
  }
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Check if current path is protected
    const isProtectedRoute = PROTECTED_ROUTES.some(route =>
      pathname === route || pathname.startsWith(`${route}/`)
    )

    // Check if current path is an auth route
    const isAuthRoute = AUTH_ROUTES.some(route =>
      pathname === route || pathname.startsWith(`${route}/`)
    )

    // For auth routes, only check auth if user has cookies (to avoid unnecessary PostgREST calls)
    // For protected routes, always check auth
    let userId: string | null = null
    let isAuthenticated = false

    if (isProtectedRoute || (isAuthRoute && (request.cookies.has('auth-token') || request.cookies.has('leadflow_session')))) {
      userId = await getUserIdFromRequest(request)
      isAuthenticated = !!userId
    }

    // Redirect unauthenticated users from protected routes to login
    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Redirect authenticated users from auth routes to dashboard
    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Check if onboarding is required and redirect to setup (AC-3)
    // Skip this check for /setup and /onboarding routes
    if (userId && isProtectedRoute) {
      const isSetupRoute = pathname.startsWith('/setup') || pathname.startsWith('/onboarding')
      if (!isSetupRoute) {
        const onboardingCompleted = await isOnboardingCompleted(userId)
        if (!onboardingCompleted) {
          return NextResponse.redirect(new URL('/setup', request.url))
        }
      }
    }

    // Check for expired trial and redirect to upgrade if needed (AC-8)
    if (userId && isProtectedRoute) {
      const isExpired = await isTrialExpired(userId)
      if (isExpired) {
        // Check if current route is allowed for expired trials
        const isAllowedRoute = EXPIRED_TRIAL_ALLOWED_ROUTES.some(route =>
          pathname === route || pathname.startsWith(`${route}/`)
        )

        if (!isAllowedRoute) {
          // Redirect to upgrade page
          return NextResponse.redirect(new URL('/upgrade', request.url))
        }
      }
    }

    // Add security headers
    const response = NextResponse.next()

    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return response
  } catch (error) {
    // Middleware error: log and continue (fail open for public routes)
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
