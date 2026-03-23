'use client'

/**
 * UtmCaptureTracker — client component for FR-1/FR-2 UTM parameter capture.
 *
 * Mounts in root layout and captures UTM params from first-touch landing.
 * Writes to sessionStorage.leadflow_utm once per session (first-touch protection).
 * Pattern: follows page-view-tracker.tsx structure.
 * 
 * FR-1: Reads utm_source, utm_medium, utm_campaign, utm_content, utm_term from URL
 * FR-2: Writes to sessionStorage only on first touch (no overwrite)
 * FR-3: SSR safe — wraps sessionStorage in try/catch
 * Returns: null (no visible output)
 */

import { useEffect } from 'react'

const UTM_STORAGE_KEY = 'leadflow_utm'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

/**
 * Parse UTM params from current URL (window.location.search).
 * Returns a plain object with only non-null UTM keys.
 */
function captureUtmFromUrl(): Record<string, string> | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const captured: Record<string, string> = {}

    let hasAny = false
    UTM_KEYS.forEach((key) => {
      const val = params.get(key)
      if (val) {
        captured[key] = val
        hasAny = true
      }
    })

    return hasAny ? captured : null
  } catch {
    // URLSearchParams or window.location.search unavailable — SSR or private browsing
    return null
  }
}

/**
 * Check if sessionStorage.leadflow_utm is already set.
 * Returns parsed object if set, null if not set or invalid.
 */
function getStoredUtm(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed
      }
    }
  } catch {
    // sessionStorage unavailable or parse failed — treat as not set
  }
  return null
}

/**
 * Write UTM params to sessionStorage (first-touch only).
 * AC-1: Writes if no prior value exists.
 * AC-2: Does NOT overwrite if already set.
 */
function writeUtmIfFirstTouch(captured: Record<string, string>): void {
  try {
    // First-touch protection: check if already stored
    if (sessionStorage.getItem(UTM_STORAGE_KEY) !== null) {
      // Already stored — do not overwrite (AC-2)
      return
    }

    // First touch — write now
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(captured))
  } catch {
    // sessionStorage unavailable (private browsing, SSR) — gracefully skip (AC-5)
  }
}

export function UtmCaptureTracker() {
  useEffect(() => {
    // AC-6: Run on page load (useEffect on mount, client-side only)
    const captured = captureUtmFromUrl()

    if (captured) {
      // AC-1 / AC-2: Write only if new, never overwrite
      writeUtmIfFirstTouch(captured)
    }
    // AC-3: If no UTM in URL, do nothing (don't clear sessionStorage)
  }, []) // Empty deps: run once on mount only

  // AC-6: No visible output
  return null
}
