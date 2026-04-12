'use client'

/**
 * OnboardingGuard
 *
 * Client component that auto-redirects unauthenticated or un-onboarded users
 * to the appropriate page when they land on a protected dashboard route.
 *
 * Logic:
 *   1. No token  → redirect to /login
 *   2. Token present + trial isExpired=true → redirect to /dashboard/trial-expired
 *   3. Token present + onboardingCompleted === false → redirect to /dashboard/onboarding
 *   4. Token present + onboarding done + trial active → stay (render nothing)
 *
 * The user object (with onboardingCompleted) is written to localStorage/
 * sessionStorage by the login API response handler in /app/login/page.tsx.
 * Trial expiry is always checked via API to ensure freshness — it cannot be
 * cached client-side because the expiry date passes without a page reload.
 */

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const SETUP_ROUTES = [
  '/setup',
  '/login',
  '/onboarding',
  '/forgot-password',
  '/reset-password',
  '/signup',
  '/dashboard/onboarding',
  '/dashboard/trial-expired',
]

function getFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || null
  } catch {
    return null
  }
}

interface StoredUser {
  id?: string
  onboardingCompleted?: boolean
  [key: string]: unknown
}

export function OnboardingGuard() {
  const router = useRouter()
  const pathname = usePathname()
  // Track the last pathname we ran the guard for — reset on every route change
  // so the guard re-fires when the user navigates to a new protected route.
  const lastCheckedPathname = useRef<string | null>(null)

  useEffect(() => {
    // Only run once per unique pathname (prevents double-fire in StrictMode)
    if (lastCheckedPathname.current === pathname) return
    lastCheckedPathname.current = pathname

    // Skip guard on public/setup pages (login, onboarding flow, trial-expired, etc.)
    const isPublicRoute = SETUP_ROUTES.some((r) => pathname?.startsWith(r))
    if (isPublicRoute) return

    const token = getFromStorage('leadflow_token')

    // No token → back to login
    if (!token) {
      router.replace('/login')
      return
    }

    // Always check trial status from the server — client-side cache can be stale
    // when the trial expiry date has passed since the last login.
    fetch('/api/auth/trial-status', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          // API unavailable — fall back to cached user data for onboarding check only
          checkOnboardingFromCache()
          return
        }

        // Expired trial takes highest priority (user cannot use the product)
        if (data.isExpired) {
          router.replace('/dashboard/trial-expired')
          return
        }

        // Incomplete onboarding — send to the dedicated onboarding page
        if (data.onboardingCompleted === false) {
          router.replace('/dashboard/onboarding')
          return
        }

        // All clear — user stays on the current page
      })
      .catch(() => {
        // Network failure — fall back to cached data so we don't block the user
        checkOnboardingFromCache()
      })

    function checkOnboardingFromCache() {
      const userRaw = getFromStorage('leadflow_user')
      if (!userRaw) return
      try {
        const user: StoredUser = JSON.parse(userRaw)
        if (user.onboardingCompleted === false) {
          router.replace('/dashboard/onboarding')
        }
      } catch {
        // malformed JSON — do nothing, don't block the user
      }
    }
  }, [pathname, router])

  return null
}
