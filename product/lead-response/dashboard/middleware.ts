import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateSession } from '@/lib/session'
import { createClient } from '@supabase/supabase-js'
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
  '/pricing',
  '/settings/billing',
  '/login',
  '/logout',
]

// Demo token routes - protected but allow demo token access
const DEMO_TOKEN_ROUTES = [
  '/admin/simulator',
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

async function validateDemoToken(token: string): Promise<boolean> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('demo_tokens')
      .select('expires_at')
      .eq('token', token)
      .single()
    
    if (error || !data) return false
    
    const now = new Date()
    const expiresAt = new Date(data.expires_at)
    return now <= expiresAt
  } catch {
    return false
  }
}

/**
 * Validate JWT token from auth-token cookie
 */
function validateJWTToken(token: string): { userId: string; email: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
    return payload
  } catch {
    return null
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
  const { pathname, searchParams } = request.nextUrl
  
  // Get session token from cookie (support both legacy leadflow_session and new auth-token)
  const sessionToken = request.cookies.get('leadflow_session')?.value
  const authToken = request.cookies.get('auth-token')?.value
  
  // Validate session against database (legacy)
  const session = sessionToken ? await validateSession(sessionToken) : null
  
  // Validate JWT token (new auth flow)
  const jwtPayload = authToken ? validateJWTToken(authToken) : null
  
  // User is authenticated if either session or JWT is valid
  const isAuthenticated = !!(session || jwtPayload)
  
  // Check if current path is a demo token route
  const isDemoTokenRoute = DEMO_TOKEN_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // Check for demo token on demo token routes
  if (isDemoTokenRoute && !isAuthenticated) {
    const demoToken = searchParams.get('demo')
    if (demoToken) {
      const isValidDemo = await validateDemoToken(demoToken)
      if (isValidDemo) {
        // Allow access with valid demo token
        const response = NextResponse.next()
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
        return response
      }
    }
  }
  
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

  // Check for expired trial and redirect to upgrade if needed (AC-8)
  const userId = jwtPayload?.userId || session?.userId
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
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
