'use client'

/**
 * OnboardingGuard
 *
 * Client component that auto-redirects unauthenticated or un-onboarded users
 * to the appropriate page when they land on a protected dashboard route.
 *
 * Logic:
 *   1. No token  → redirect to /login
 *   2. Token present + onboardingCompleted === false → redirect to /setup
 *   3. Token present + onboarding done → stay (render nothing)
 *
 * The user object (with onboardingCompleted) is written to localStorage/
 * sessionStorage by the login API response handler in /app/login/page.tsx.
 * If the cached value is missing we fall back to a lightweight API check.
 */

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const SETUP_ROUTES = ['/setup', '/login', '/onboarding', '/dashboard/onboarding', '/forgot-password', '/reset-password', '/signup']

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
  const checkedRef = useRef(false)

  useEffect(() => {
    // Only run once per mount / pathname change
    if (checkedRef.current) return
    checkedRef.current = true

    // Skip guard on non-dashboard pages (login, setup, onboarding, etc.)
    const isPublicRoute = SETUP_ROUTES.some((r) => pathname?.startsWith(r))
    if (isPublicRoute) return

    const token = getFromStorage('leadflow_token')

    // No token → back to login
    if (!token) {
      router.replace('/login')
      return
    }

    // Try cached user data first (fastest path)
    const userRaw = getFromStorage('leadflow_user')
    if (userRaw) {
      try {
        const user: StoredUser = JSON.parse(userRaw)
        if (user.onboardingCompleted === false) {
          router.replace('/setup')
          return
        }
        // onboarding done — stay on page
        return
      } catch {
        // malformed JSON — fall through to API check
      }
    }

    // Fallback: ask the server whether the agent still needs onboarding
    fetch('/api/setup/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        // If wizard row exists but has no completed_at, redirect to setup
        if (data.wizardState === null || data.wizardState?.completed_at === null) {
          router.replace('/setup')
        }
      })
      .catch(() => {
        // Network failure — don't block the user; they'll be caught by setup/status
      })
  }, [pathname, router])

  return null
}
