'use client'

/**
 * OnboardingGuard
 *
 * Client-side guard that reads `leadflow_user.onboardingCompleted` from
 * localStorage / sessionStorage (populated by the login API response).
 *
 * If the agent has not completed onboarding, they are redirected to /setup
 * so the post-login wizard can guide them through FUB → Phone → SMS.
 *
 * This guard fires on every dashboard page load, so it correctly handles:
 * - Direct navigation to /dashboard before completing setup
 * - Refreshing the browser during the wizard flow
 * - Session restoration when the wizard was partially completed
 *
 * NOTE: The guard only redirects if a `leadflow_user` object is present AND
 * `onboardingCompleted` is explicitly `false`.  Missing / null values are
 * treated as "already completed" to avoid redirect loops for legacy agents
 * who signed up before the onboarding wizard was introduced.
 */

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function OnboardingGuard() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Skip guard on the setup and login pages themselves
    if (!pathname || pathname.startsWith('/setup') || pathname.startsWith('/login')) {
      return
    }

    try {
      const raw =
        localStorage.getItem('leadflow_user') ||
        sessionStorage.getItem('leadflow_user')

      if (!raw) return // no user stored — middleware will handle auth

      const user = JSON.parse(raw)

      // Only redirect if explicitly false — null/undefined = legacy agent (allow through)
      if (user.onboardingCompleted === false) {
        router.replace('/setup')
      }
    } catch {
      // JSON parse error — ignore, don't block dashboard
    }
  }, [router, pathname])

  // Guard renders nothing — it only performs a side-effect redirect
  return null
}
