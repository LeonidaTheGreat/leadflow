'use client'

/**
 * PageViewTracker - client component for FR-3 page view logging.
 *
 * Mounts in dashboard layout and calls POST /api/page-views on navigation.
 * Rate-limiting: sessionStorage deduplication (one write per page per session).
 * Auth: reads JWT from sessionStorage or localStorage set at login.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'pv_logged'

function getLoggedPages(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr)
    }
  } catch { /* ignore */ }
  return new Set<string>()
}

function markPageLogged(page: string): void {
  try {
    const pages = getLoggedPages()
    pages.add(page)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(pages)))
  } catch { /* ignore */ }
}

function getAuthToken(): string | null {
  try {
    return (
      sessionStorage.getItem('leadflow_token') ??
      localStorage.getItem('leadflow_token') ??
      null
    )
  } catch {
    return null
  }
}

function getSessionId(): string | null {
  try {
    const userStr =
      sessionStorage.getItem('leadflow_user') ??
      localStorage.getItem('leadflow_user')
    if (userStr) {
      const user = JSON.parse(userStr)
      return user?.sessionId ?? null
    }
  } catch { /* ignore */ }
  return null
}

async function logPageView(page: string): Promise<void> {
  const token = getAuthToken()
  if (!token) return

  const sessionId = getSessionId()

  try {
    await fetch('/api/page-views', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ page, sessionId }),
    })
  } catch { /* network errors must never surface */ }
}

export function PageViewTracker() {
  const pathname = usePathname()
  const lastLoggedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    if (lastLoggedRef.current === pathname) return

    const logged = getLoggedPages()
    if (logged.has(pathname)) {
      lastLoggedRef.current = pathname
      return
    }

    lastLoggedRef.current = pathname
    markPageLogged(pathname)
    logPageView(pathname).catch(() => { /* silent */ })
  }, [pathname])

  return null
}
