import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateSession } from '@/lib/session'
import { createClient } from '@/lib/db'
import jwt from 'jsonwebtoken'

// Routes that require authentication
const PROTECTED_ROUTES = [
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

const POSTGREST_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim()
const POSTGREST_KEY = (process.env.API_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_API_KEY || '').trim()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

function getSupabase() {
  return createClient(POSTGREST_URL, POSTGREST_KEY)
}

/**
 * Extract userId from either JWT (auth-token) or session token (leadflow_session)
 * Returns userId if authenticated, null otherwise
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // Try JWT token first (from trial-signup)
  const jwtToken = request.cookies.get('auth-token')?.value
  if (jwtToken) {
    try {
      const payload = jwt.verify(jwtToken, JWT_SECRET) as any
      if (payload.userId) {
        return payload.userId
      }
    } catch {
      // JWT validation failed, try session token
    }
  }

  // Try session token (from login)
  const sessionToken = request.cookies.get('leadflow_session')?.value
  if (sessionToken) {
    try {
      const session = await validateSession(sessionToken)
      if (session) {
        return session.userId
      }
    } catch {
      // Session validation failed
    }
  }

  return null
}

/**
 * Check if user's onboarding is completed
 * Returns true if onboarding is completed, false if incomplete or error
 */
async function isOnboardingCompleted(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabase()
    const { data: agent, error } = await supabase
      .from('real_estate_agents')
      .select('onboarding_completed')
      .eq('id', userId)
      .single()

    if (error || !agent) {
      // On error, allow access (fail open)
      return true
    }

    return agent.onboarding_completed ?? false
  } catch {
    // On error, allow access (fail open)
    return true
  }
}

/**
 * Check if user's trial has expired
 * Returns true if user is on trial and trial has expired
 */
async function isTrialExpired(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabase()
    const { data: agent, error } = await supabase
      .from('real_estate_agents')
      .select('plan_tier, trial_ends_at')
      .eq('id', userId)
      .single()

    if (error || !agent) return false

    // Only check expiration for trial users
    if (agent.plan_tier !== 'trial') return false

    // Check if trial has expired
    if (!agent.trial_ends_at) return false

    const now = new Date()
    const trialEndsAt = new Date(agent.trial_ends_at)
    return now > trialEndsAt
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    
    // Get userId from either JWT or session token
    const userId = await getUserIdFromRequest(request)
    const isAuthenticated = !!userId
    
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
