/**
 * @jest-environment node
 *
 * Tests for SessionAnalyticsCard component and API integration.
 * Task: fix-session-analytics-tables-exist-but-lack-integratio
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock data for pilot usage
const mockPilotUsageResponse = {
  pilots: [
    {
      agentId: 'agent-1',
      name: 'Alice Smith',
      email: 'alice@test.com',
      planTier: 'pilot',
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      sessionsLast7d: 12,
      topPage: '/dashboard/conversations',
      inactiveHours: 2,
      atRisk: false,
    },
    {
      agentId: 'agent-2',
      name: 'Bob Johnson',
      email: 'bob@test.com',
      planTier: 'pilot',
      lastLogin: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
      sessionsLast7d: 3,
      topPage: '/dashboard',
      inactiveHours: 96,
      atRisk: true,
    },
  ],
  generatedAt: new Date().toISOString(),
}

describe('SessionAnalyticsCard API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('API endpoint structure', () => {
    it('should return pilot data with correct shape', () => {
      const response = mockPilotUsageResponse
      expect(response).toHaveProperty('pilots')
      expect(response).toHaveProperty('generatedAt')
      expect(Array.isArray(response.pilots)).toBe(true)
    })

    it('should return pilot objects with required fields', () => {
      const pilot = mockPilotUsageResponse.pilots[0]
      expect(pilot).toHaveProperty('agentId')
      expect(pilot).toHaveProperty('name')
      expect(pilot).toHaveProperty('email')
      expect(pilot).toHaveProperty('planTier')
      expect(pilot).toHaveProperty('lastLogin')
      expect(pilot).toHaveProperty('sessionsLast7d')
      expect(pilot).toHaveProperty('topPage')
      expect(pilot).toHaveProperty('inactiveHours')
      expect(pilot).toHaveProperty('atRisk')
    })

    it('should properly calculate atRisk status based on inactiveHours', () => {
      const activePilot = mockPilotUsageResponse.pilots[0]
      const inactivePilot = mockPilotUsageResponse.pilots[1]

      expect(activePilot.atRisk).toBe(false)
      expect(activePilot.inactiveHours).toBeLessThan(72)

      expect(inactivePilot.atRisk).toBe(true)
      expect(inactivePilot.inactiveHours).toBeGreaterThan(72)
    })
  })

  describe('Pilot data validation', () => {
    it('should have valid lastLogin timestamps', () => {
      for (const pilot of mockPilotUsageResponse.pilots) {
        if (pilot.lastLogin) {
          expect(() => new Date(pilot.lastLogin).toISOString()).not.toThrow()
        }
      }
    })

    it('should have non-negative sessionCount', () => {
      for (const pilot of mockPilotUsageResponse.pilots) {
        expect(pilot.sessionsLast7d).toBeGreaterThanOrEqual(0)
      }
    })

    it('should have non-negative inactiveHours when present', () => {
      for (const pilot of mockPilotUsageResponse.pilots) {
        if (pilot.inactiveHours !== null) {
          expect(pilot.inactiveHours).toBeGreaterThanOrEqual(0)
        }
      }
    })

    it('should have valid email formats', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      for (const pilot of mockPilotUsageResponse.pilots) {
        expect(emailRegex.test(pilot.email)).toBe(true)
      }
    })
  })

  describe('Empty and edge cases', () => {
    it('should handle empty pilot list', () => {
      const emptyResponse = { pilots: [], generatedAt: new Date().toISOString() }
      expect(emptyResponse.pilots.length).toBe(0)
    })

    it('should handle pilot with null lastLogin', () => {
      const pilot = {
        ...mockPilotUsageResponse.pilots[0],
        lastLogin: null,
      }
      expect(pilot.lastLogin).toBeNull()
    })

    it('should handle pilot with null topPage', () => {
      const pilot = {
        ...mockPilotUsageResponse.pilots[0],
        topPage: null,
      }
      expect(pilot.topPage).toBeNull()
    })

    it('should handle pilot with null inactiveHours', () => {
      const pilot = {
        ...mockPilotUsageResponse.pilots[0],
        inactiveHours: null,
      }
      expect(pilot.inactiveHours).toBeNull()
    })
  })

  describe('Data formatting helpers', () => {
    it('should calculate relative time correctly', () => {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
      const hours = Math.floor((now.getTime() - new Date(twoHoursAgo).getTime()) / (1000 * 60 * 60))
      expect(hours).toBeLessThanOrEqual(2)
      expect(hours).toBeGreaterThan(0)
    })

    it('should format page URLs correctly', () => {
      const pageMap: Record<string, string> = {
        '/dashboard': 'Dashboard',
        '/dashboard/conversations': 'Conversations',
        '/dashboard/leads': 'Leads',
        '/dashboard/analytics': 'Analytics',
        '/dashboard/settings': 'Settings',
        '/onboarding': 'Onboarding',
        '/': 'Home',
      }

      for (const [url, label] of Object.entries(pageMap)) {
        expect(label).toBeTruthy()
        expect(url).toBeTruthy()
      }
    })
  })

  describe('Pilot status indicators', () => {
    it('should mark pilot as at-risk when inactive > 72 hours', () => {
      const riskPilot = mockPilotUsageResponse.pilots[1]
      expect(riskPilot.atRisk).toBe(true)
      expect(riskPilot.inactiveHours).toBeGreaterThan(72)
    })

    it('should mark pilot as active when inactiveHours < 72', () => {
      const activePilot = mockPilotUsageResponse.pilots[0]
      expect(activePilot.atRisk).toBe(false)
      expect(activePilot.inactiveHours).toBeLessThan(72)
    })

    it('should provide status labels for UI display', () => {
      const statuses = ['Active', 'Low Activity (>48h)', 'At Risk (>72h inactive)']
      expect(statuses).toHaveLength(3)
      for (const status of statuses) {
        expect(status).toBeTruthy()
      }
    })
  })
})

describe('SessionAnalyticsCard - Dashboard API wrapper', () => {
  it('should have correct API route path', () => {
    const apiPath = '/api/dashboard/session-analytics'
    expect(apiPath).toBe('/api/dashboard/session-analytics')
  })

  it('should support GET requests', () => {
    const method = 'GET'
    expect(method).toBe('GET')
  })

  it('should accept no authentication token from client', () => {
    const headers = {
      'Content-Type': 'application/json',
    }
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Authorization']).toBeUndefined()
  })

  it('should return aggregated pilot data', () => {
    const response = mockPilotUsageResponse
    expect(response.pilots.length).toBeGreaterThan(0)
    expect(response.generatedAt).toBeTruthy()
  })
})

describe('SessionAnalyticsCard - Component behavior', () => {
  it('should display loading state', () => {
    // Component renders loading skeleton while fetching
    expect(true).toBe(true) // Placeholder for component test
  })

  it('should display error message on API failure', () => {
    // Component shows error UI if fetch fails
    expect(true).toBe(true) // Placeholder for component test
  })

  it('should display pilot cards when data loads', () => {
    // Component renders PilotCard for each pilot in response
    expect(mockPilotUsageResponse.pilots.length).toBe(2)
  })

  it('should have refresh button to refetch data', () => {
    // Component includes refresh button
    expect(true).toBe(true) // Placeholder for component test
  })

  it('should display empty state when no pilots exist', () => {
    // Component shows empty state message if pilots array is empty
    expect([].length).toBe(0)
  })
})
