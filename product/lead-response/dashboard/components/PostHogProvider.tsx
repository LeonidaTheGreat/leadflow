'use client'

/**
 * PostHogProvider
 *
 * Wraps the application with the PostHog React provider so that
 * posthog-js is initialised once on the client and available
 * throughout the component tree via window.posthog.
 *
 * Graceful degradation: if NEXT_PUBLIC_POSTHOG_KEY is not set,
 * children are rendered without PostHog — no errors thrown.
 */

import { useEffect, type ReactNode } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

interface PostHogProviderProps {
  children: ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    if (!POSTHOG_KEY) return

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // We track page views manually via the PostHog React provider
      capture_pageview: false,
      capture_pageleave: true,
      // Mask all user inputs in session recordings
      session_recording: {
        maskAllInputs: true,
      },
      // Disable in non-production unless key is explicitly set
      loaded: (ph) => {
        if (process.env.NODE_ENV !== 'production') {
          ph.opt_out_capturing()
          // Re-opt-in only when a real key is provided (useful for staging)
          if (POSTHOG_KEY && POSTHOG_KEY !== 'posthog_key_here') {
            ph.opt_in_capturing()
          }
        }
      },
    })
  }, [])

  if (!POSTHOG_KEY) {
    // No key configured — render children without the PostHog context so
    // the rest of the app works normally.
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  )
}
