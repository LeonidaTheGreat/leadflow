'use client'

/**
 * useScrollTracking
 *
 * React hook that fires PostHog scroll_depth events at 25%, 50%, 75%,
 * and 100% scroll milestones. Each milestone fires at most once per
 * page mount (deduped via a Set).
 *
 * Usage:
 *   import { useScrollTracking } from '@/hooks/useScrollTracking'
 *
 *   export default function Page() {
 *     useScrollTracking()
 *     return <main>...</main>
 *   }
 */

import { useEffect } from 'react'
import { trackScrollDepth } from '@/lib/analytics'

const MILESTONES = [25, 50, 75, 100] as const
type Milestone = typeof MILESTONES[number]

export function useScrollTracking(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const fired = new Set<Milestone>()

    function onScroll() {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return

      const pct = Math.round((scrollTop / docHeight) * 100)

      for (const milestone of MILESTONES) {
        if (pct >= milestone && !fired.has(milestone)) {
          fired.add(milestone)
          trackScrollDepth(milestone)
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // Fire immediately in case the page is short
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
}
