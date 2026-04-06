'use client'

/**
 * OnboardingWizardLauncher
 *
 * FR-5: Auto-launches the OnboardingWizardOverlay when onboarding_completed=false.
 * No click required — the overlay appears automatically on first dashboard visit.
 *
 * Dismissed state is stored in sessionStorage so the overlay doesn't re-appear
 * within the same session after the user explicitly closes it.
 */

import { useEffect, useState } from 'react'
import { OnboardingWizardOverlay } from '@/components/onboarding-wizard-overlay'

export function OnboardingWizardLauncher() {
  const [showOverlay, setShowOverlay] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Don't re-show if dismissed in this session
    const dismissed = sessionStorage.getItem('onboarding-overlay-dismissed') === 'true'
    if (dismissed) {
      setLoading(false)
      return
    }

    async function fetchOnboardingStatus() {
      try {
        const response = await fetch('/api/auth/trial-status')
        if (response.ok) {
          const data = await response.json()
          if (!data.onboardingCompleted) {
            setShowOverlay(true)
          }
        }
      } catch {
        // Non-fatal — don't block dashboard load
      } finally {
        setLoading(false)
      }
    }

    fetchOnboardingStatus()
  }, [])

  const handleComplete = () => {
    setShowOverlay(false)
    // Reload to reflect completed onboarding state
    window.location.reload()
  }

  const handleDismiss = () => {
    setShowOverlay(false)
    sessionStorage.setItem('onboarding-overlay-dismissed', 'true')
  }

  if (loading || !showOverlay) {
    return null
  }

  return (
    <OnboardingWizardOverlay
      onComplete={handleComplete}
      onDismiss={handleDismiss}
    />
  )
}
