/*
Task Spec (921c639b-4cca-47cd-a862-73a6870f6869)
What:
- Replace Next.js deprecated runtime entrypoint by moving
  product/lead-response/dashboard/middleware.ts -> product/lead-response/dashboard/proxy.ts
  while preserving existing auth/onboarding/trial gating behavior and exported matcher config.
- Keep the same function body and helper behavior; only runtime entrypoint migration.
Verify:
- cd product/lead-response/dashboard && npm run lint exits 0.
- cd product/lead-response/dashboard && npm run build exits 0 (no middleware deprecation warning, proxy listed).
- cd /var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-921c639b-4cca-47cd-a862-73a6870f6869 && npm run build && npm run lint && npm test && npm audit --audit-level=high all exit 0.
- After deploy: curl -I https://leadflow-ai-five.vercel.app/login returns HTTP 200.
Boundaries:
- Do not modify login/signup page UI/components.
- Do not change auth logic, redirects, cookie names, or DB query behavior.
- Do not touch migrations/schema or unrelated API routes/services.
*/
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

// Simulator smoke endpoint must be reachable without auth to avoid redirecting into login flow.
const PUBLIC_ROUTE_PREFIXES = [
  '/admin/simulator',
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

function base64UrlToUint8Array(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  const decoded = atob(padded)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i)
  }
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function verifyHs256Jwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, encodedSignature] = parts

  try {
    const headerJson = new TextDecoder().decode(base64UrlToUint8Array(encodedHeader))
    const header = JSON.parse(headerJson) as { alg?: string; typ?: string }
    if (header.alg !== 'HS256') return null

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signatureBytes = base64UrlToUint8Array(encodedSignature)
    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      toArrayBuffer(signatureBytes),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    )

    if (!verified) return null

    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(encodedPayload))
    const payload = JSON.parse(payloadJson) as Record<string, unknown>

    const exp = payload.exp
    if (typeof exp === 'number' && Date.now() >= exp * 1000) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Hash a session token using SHA-256 (Web Crypto API — Edge-compatible).
 * Must match the hashToken() in lib/services/AuthService.ts which uses Node crypto.
 */
async function hashSessionToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// PostgREST config for DB queries in middleware
const POSTGREST_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim()
const POSTGREST_KEY = (process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || '').trim()

/**
 * Extract userId from either JWT (auth-token) or session token (leadflow_session)
 * Uses Edge-compatible jose library for JWT verification.
 * For session tokens, queries the sessions table via PostgREST (pure fetch, Edge-safe).
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // Try JWT token first (from trial-signup)
  const jwtToken = request.cookies.get('auth-token')?.value
  if (jwtToken) {
    try {
      const payload = await verifyHs256Jwt(jwtToken, JWT_SECRET)
      if (payload && payload.userId) {
        return payload.userId as string
      }
    } catch {
      // JWT validation failed, try session token
    }
  }

  // Try session token (from login) — validate via PostgREST fetch (Edge-safe)
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (sessionToken && POSTGREST_URL) {
    try {
      // Hash the raw token before querying — DB stores SHA-256 hashes (see AuthService)
      const tokenHash = await hashSessionToken(sessionToken)
      const encodedToken = encodeURIComponent(tokenHash)
      const url = `${POSTGREST_URL}/sessions?token=eq.${encodedToken}&select=user_id,expires_at&limit=1`
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(POSTGREST_KEY && { 'apikey': POSTGREST_KEY }),
        ...(POSTGREST_KEY && { 'Authorization': `Bearer ${POSTGREST_KEY}` }),
      }
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

      const res = await fetch(url, { headers, signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const rows = await res.json()
        if (rows.length > 0) {
          const session = rows[0]
          // Check expiration
          if (new Date(session.expires_at) > new Date()) {
            return session.user_id
          }
        }
      }
    } catch (err) {
      // Session validation failed (including timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('Session validation timeout')
      }
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

export async function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    const isPublicBypassRoute = PUBLIC_ROUTE_PREFIXES.some(prefix =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    )

    // Check if current path is protected
    const isProtectedRoute = !isPublicBypassRoute && PROTECTED_ROUTES.some(route =>
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
          return NextResponse.redirect(new URL('/dashboard/trial-expired', request.url))
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
