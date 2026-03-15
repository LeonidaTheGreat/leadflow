import { useCallback, useState } from 'react'

export type OnboardingStepName =
  | 'email_verified'
  | 'fub_connected'
  | 'phone_configured'
  | 'sms_verified'
  | 'aha_completed'

export type OnboardingEventStatus = 'started' | 'completed' | 'failed' | 'skipped'

export interface OnboardingEventMetadata {
  error?: string
  latency_ms?: number
  source?: string
  attempt_count?: number
  [key: string]: any
}

interface LogEventResult {
  success: boolean
  event?: any
  updateError?: string | null
  error?: string
}

export function useOnboardingTelemetry() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logEvent = useCallback(
    async (
      stepName: OnboardingStepName,
      status: OnboardingEventStatus,
      metadata: OnboardingEventMetadata = {}
    ): Promise<LogEventResult> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/onboarding/log-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            step_name: stepName,
            status,
            metadata,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          const errorMsg = errorData.error || 'Failed to log event'
          setError(errorMsg)
          return { success: false, error: errorMsg }
        }

        const data: LogEventResult = await response.json()
        return data
      } catch (err: any) {
        const errorMsg = err.message || 'Unknown error'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { logEvent, isLoading, error }
}
