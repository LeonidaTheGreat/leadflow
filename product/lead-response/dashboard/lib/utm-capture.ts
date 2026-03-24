'use client'

import { useEffect } from 'react'

// UTM parameter keys to capture
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
const UTM_STORAGE_KEY = 'leadflow_utm'

/**
 * Capture UTM parameters from URL and persist to sessionStorage (first-touch wins)
 */
export function captureUtmParams(): void {
  if (typeof window === 'undefined') return

  // First-touch wins: only capture if not already stored
  const existing = sessionStorage.getItem(UTM_STORAGE_KEY)
  if (existing) return

  const params = new URLSearchParams(window.location.search)
  const utmData: Record<string, string> = {}

  let hasUtmParams = false
  for (const key of UTM_KEYS) {
    const value = params.get(key)
    if (value) {
      utmData[key] = value
      hasUtmParams = true
    }
  }

  if (hasUtmParams) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData))
  }
}

/**
 * Retrieve UTM parameters from sessionStorage
 */
export function getUtmParams(): Record<string, string> | null {
  if (typeof window === 'undefined') return null

  const stored = sessionStorage.getItem(UTM_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as Record<string, string>
  } catch {
    return null
  }
}

/**
 * Clear UTM parameters from sessionStorage
 */
export function clearUtmParams(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(UTM_STORAGE_KEY)
}

/**
 * React hook to capture UTM parameters on component mount
 * Use this in entry page components to capture UTM params on load
 */
export function useUtmCapture(): void {
  useEffect(() => {
    captureUtmParams()
  }, [])
}
