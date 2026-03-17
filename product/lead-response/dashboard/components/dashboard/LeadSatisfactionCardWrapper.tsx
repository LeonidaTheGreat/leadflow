'use client'

import { useEffect, useState } from 'react'
import { LeadSatisfactionCard } from './LeadSatisfactionCard'

interface StoredUser {
  id?: string
  email?: string
  [key: string]: unknown
}

/**
 * LeadSatisfactionCardWrapper
 *
 * Client component wrapper that reads the authenticated agent ID from localStorage
 * and passes it to the LeadSatisfactionCard component.
 *
 * This ensures the card displays real satisfaction data for the authenticated agent,
 * not hardcoded test data.
 */
export function LeadSatisfactionCardWrapper() {
  const [agentId, setAgentId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read agent ID from localStorage after mount (avoid hydration mismatch)
    try {
      const userRaw = localStorage.getItem('leadflow_user') || sessionStorage.getItem('leadflow_user')
      if (userRaw) {
        const user: StoredUser = JSON.parse(userRaw)
        if (user.id) {
          setAgentId(user.id)
        }
      }
    } catch (error) {
      console.error('Error reading agent ID from storage:', error)
    }

    setMounted(true)
  }, [])

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || !agentId) {
    return null
  }

  return <LeadSatisfactionCard agentId={agentId} />
}
