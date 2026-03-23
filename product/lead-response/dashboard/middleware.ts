import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { touchSession, touchSessionByAgentId } from '@/lib/agent-session'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/settings',
  '/profile',
  '/integrations',
  '/setup',
]

// Routes that should redirect to dashboard if already authenticated
// NOTE: /setup is intentionally NOT here — authenticated users who haven't
// completed onboarding need to access it.
// NOTE: /onboarding is intentionally NOT here — authenticated trial users who
// just signed up via /api/auth/trial-signup are redirected to /onboarding and
// must be allowed to access it.
const AUTH_ROUTES = [
  '/login',
  '/signup',
]

// ─── Session Heartbeat Rate Limiter ─────────────────────────────────────────
// Limits agent_sessions.last_active_at writes to at most 1 per 60s per agent.
// Uses an in-memory Map — acceptable for rate-limiting; occasional extra writes
// on cold starts / multiple edge instances are harmless.
const TOUCH_RATE_LIMIT_MS = 60_000
const lastTouched = new Map<string, number>()

/**
 * Fire-and-forget session heartbeat with 60-second rate limiting (FR-2).
 * Updates agent_sessions.last_active_at without blocking the response.
 * Fails silently — never breaks the request pipeline.
 *
 * @param agentId  - agent UUID (always available from JWT)
 * @param sessionId - agent_sessions row UUID (available when JWT includes sessionId claim)
 */
function maybeTouchSession(agentId: string, sessionId?: string): void {
  const now = Date.now()
  const last = lastTouched.get(agentId) ?? 0
  if (now - last < TOUCH_RATE_LIMIT_MS) return

  lastTouched.set(agentId, now)

  // Use the precise session ID when available; fall back to agent-wide update
  const update = sessionId
    ? touchSession(sessionId)
    : touchSessionByAgentId(agentId)

  update.catch(() => {
    // Silently ignore errors — request pipeline must not be affected
  })
}

// TODO: Verify touchSession calls work on Edge Runtime
// Temporarily disabled to debug MIDDLEWARE_INVOCATION_FAILED

interface JwtPayload {
  userId?: string
  sessionId?: string
  email?: string
}

async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as JwtPayload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get token from cookies or Authorization header
  const token = request.cookies.get('leadflow_token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '')

  const payload = token ? await verifyToken(token) : null
  const isAuthenticated = !!payload

  // Trigger session heartbeat for authenticated requests (FR-2)
  // Fire-and-forget — never blocks or fails the request
  // Disabled for now due to Edge Runtime compatibility issues
  // if (isAuthenticated && payload?.userId) {
  //   maybeTouchSession(payload.userId, payload.sessionId)
  // }

  // Check if current path is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if current path is an auth route
  const isAuthRoute = AUTH_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

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

  // Add security headers
  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
