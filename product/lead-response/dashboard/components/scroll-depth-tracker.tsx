'use client'

import { useEffect, useRef } from 'react'
import { attachScrollMilestoneObservers } from '@/lib/analytics/ga4'

/**
 * ScrollDepthTracker Component
 * 
 * Places invisible sentinel divs at 25%, 50%, and 75% scroll depths
 * and attaches IntersectionObservers to fire scroll_milestone events.
 * 
 * This is a client-only component that must be rendered inside the
 * page layout to track scroll depth across the entire page.
 */
export function ScrollDepthTracker() {
  const sentinel25Ref = useRef<HTMLDivElement>(null)
  const sentinel50Ref = useRef<HTMLDivElement>(null)
  const sentinel75Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Collect sentinel elements in order: 25%, 50%, 75%
    const elements = [
      sentinel25Ref.current,
      sentinel50Ref.current,
      sentinel75Ref.current
    ]

    // Attach observers and get cleanup function
    const cleanup = attachScrollMilestoneObservers(elements)

    // Cleanup on unmount
    return cleanup
  }, [])

  return (
    <>
      {/* 25% scroll sentinel */}
      <div
        ref={sentinel25Ref}
        data-scroll-milestone="25"
        style={{
          position: 'absolute',
          top: '25%',
          left: 0,
          right: 0,
          height: '1px',
          pointerEvents: 'none',
          visibility: 'hidden'
        }}
        aria-hidden="true"
      />
      {/* 50% scroll sentinel */}
      <div
        ref={sentinel50Ref}
        data-scroll-milestone="50"
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          pointerEvents: 'none',
          visibility: 'hidden'
        }}
        aria-hidden="true"
      />
      {/* 75% scroll sentinel */}
      <div
        ref={sentinel75Ref}
        data-scroll-milestone="75"
        style={{
          position: 'absolute',
          top: '75%',
          left: 0,
          right: 0,
          height: '1px',
          pointerEvents: 'none',
          visibility: 'hidden'
        }}
        aria-hidden="true"
      />
    </>
  )
}
