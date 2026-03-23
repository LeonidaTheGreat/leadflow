'use client'

/**
 * OnboardingGuard
 *
 * Client component that auto-redirects unauthenticated users to the login page.
 *
 * Logic:
 *   1. No token  → redirect to /login
 *   2. Token present → stay (render nothing)
 *
 * NOTE: The wizard auto-trigger for incomplete onboarding is now handled by
 * the dashboard page itself (see app/dashboard/page.tsx). When onboarding_completed=false,
 * the dashboard renders the OnboardingWizardOverlay as a modal overlay.
 * This implements AC-3 from the PRD: "Setup Wizard overlay appears automatically
 * (onboarding_completed=false)".
 *
 * The user object (with onboardingCompleted) is written to localStorage/
 * sessionStorage by the login API response handler in /app/login/page.tsx.
 */

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const PUBLIC_ROUTES = ['/setup', '/login', '/onboarding', '/forgot-password', '/reset-password', '/signup', '/dashboard/onboarding']

function getFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || null
  } catch {
    return null
  }
}

export function OnboardingGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const checkedRef = useRef(false)

  useEffect(() => {
    // Only run once per mount / pathname change
    if (checkedRef.current) return
    checkedRef.current = true

    // Skip guard on public pages (login, setup, onboarding, etc.)
    const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname?.startsWith(r))
    if (isPublicRoute) return

    const token = getFromStorage('leadflow_token')

    // No token → back to login
    if (!token) {
      router.replace('/login')
      return
    }

    // Note: Onboarding check is now handled by the dashboard page itself.
    // The dashboard renders OnboardingWizardOverlay when onboarding_completed=false.
    // This allows the wizard to appear as an overlay on the dashboard (AC-3).
  }, [pathname, router])

  return null
}
