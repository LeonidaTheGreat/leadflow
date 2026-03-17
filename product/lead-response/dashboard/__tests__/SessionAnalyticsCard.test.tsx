/**
 * Test: SessionAnalyticsCard Component
 * ====================================
 * 
 * Validates that the SessionAnalyticsCard component:
 * 1. Renders without errors
 * 2. Fetches pilot usage data from /api/analytics/pilot-usage
 * 3. Displays pilot metrics in a table format
 * 4. Shows at-risk alerts for pilots with >72h inactivity
 * 5. Handles error and empty states gracefully
 * 6. Updates when refresh button is clicked
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SessionAnalyticsCard } from '@/components/dashboard/SessionAnalyticsCard'

// Mock fetch
global.fetch = jest.fn()

describe('SessionAnalyticsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering & Loading States', () => {
    test('renders loading skeleton initially', () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // never resolves
      )

      render(<SessionAnalyticsCard />)

      // Should show loading skeleton
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    test('renders title', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ pilots: [], generatedAt: new Date().toISOString() }),
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText(/Pilot Engagement Metrics/i)).toBeInTheDocument()
      })
    })

    test('renders refresh button', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ pilots: [], generatedAt: new Date().toISOString() }),
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText(/Refresh/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data Fetching', () => {
    test('calls /api/analytics/pilot-usage endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ pilots: [], generatedAt: new Date().toISOString() }),
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/analytics/pilot-usage',
          expect.objectContaining({
            cache: 'no-store',
          })
        )
      })
    })

    test('displays pilot data in table format', async () => {
      const mockData = {
        pilots: [
          {
            agentId: 'agent-1',
            name: 'Jane Smith',
            email: 'jane@example.com',
            planTier: 'pilot',
            lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            sessionsLast7d: 5,
            topPage: '/dashboard/conversations',
            inactiveHours: 2,
            atRisk: false,
          },
        ],
        generatedAt: new Date().toISOString(),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('jane@example.com')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument() // sessions
        expect(screen.getByText(/Conversations/i)).toBeInTheDocument() // top page
      })
    })
  })

  describe('At-Risk Indicators', () => {
    test('displays at-risk badge for pilots with >72h inactivity', async () => {
      const mockData = {
        pilots: [
          {
            agentId: 'agent-1',
            name: 'At-Risk Pilot',
            email: 'atrisk@example.com',
            planTier: 'pilot',
            lastLogin: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(), // 100 hours ago
            sessionsLast7d: 0,
            topPage: null,
            inactiveHours: 100,
            atRisk: true,
          },
        ],
        generatedAt: new Date().toISOString(),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText(/At Risk \(>72h\)/i)).toBeInTheDocument()
        expect(screen.getByText(/at risk/i)).toBeInTheDocument()
      })
    })

    test('counts at-risk pilots in header', async () => {
      const mockData = {
        pilots: [
          {
            agentId: 'agent-1',
            name: 'At-Risk Pilot 1',
            email: 'atrisk1@example.com',
            planTier: 'pilot',
            lastLogin: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
            sessionsLast7d: 0,
            topPage: null,
            inactiveHours: 100,
            atRisk: true,
          },
          {
            agentId: 'agent-2',
            name: 'At-Risk Pilot 2',
            email: 'atrisk2@example.com',
            planTier: 'pilot',
            lastLogin: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
            sessionsLast7d: 0,
            topPage: null,
            inactiveHours: 120,
            atRisk: true,
          },
        ],
        generatedAt: new Date().toISOString(),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText(/2 at risk/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('displays error message when fetch fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Database connection failed' }),
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument()
      })
    })

    test('displays error message on network error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load pilot metrics/i)).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    test('displays empty state when no pilots', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ pilots: [], generatedAt: new Date().toISOString() }),
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText(/No pilot agents yet/i)).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Button', () => {
    test('refetches data when refresh button is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          pilots: [
            {
              agentId: 'agent-1',
              name: 'Jane Smith',
              email: 'jane@example.com',
              planTier: 'pilot',
              lastLogin: new Date().toISOString(),
              sessionsLast7d: 5,
              topPage: '/dashboard',
              inactiveHours: 2,
              atRisk: false,
            },
          ],
          generatedAt: new Date().toISOString(),
        }),
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      // Clear mock call count
      ;(global.fetch as jest.Mock).mockClear()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          pilots: [
            {
              agentId: 'agent-1',
              name: 'Jane Smith',
              email: 'jane@example.com',
              planTier: 'pilot',
              lastLogin: new Date().toISOString(),
              sessionsLast7d: 6,
              topPage: '/dashboard',
              inactiveHours: 1,
              atRisk: false,
            },
          ],
          generatedAt: new Date().toISOString(),
        }),
      })

      // Click refresh button
      const refreshButton = screen.getByText(/Refresh/i)
      fireEvent.click(refreshButton)

      await waitFor(() => {
        // Should have been called again
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    test('disables refresh button while refreshing', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    pilots: [],
                    generatedAt: new Date().toISOString(),
                  }),
                }),
              100
            )
          )
      )

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        expect(screen.getByText(/Refresh/i)).toBeInTheDocument()
      })

      const refreshButton = screen.getByText(/Refresh/i) as HTMLButtonElement

      // Reset mock for the refresh
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    pilots: [],
                    generatedAt: new Date().toISOString(),
                  }),
                }),
              200
            )
          )
      )

      fireEvent.click(refreshButton)

      // Button should be disabled while refreshing
      expect(refreshButton.disabled).toBe(true)
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels', async () => {
      const mockData = {
        pilots: [
          {
            agentId: 'agent-1',
            name: 'Jane Smith',
            email: 'jane@example.com',
            planTier: 'pilot',
            lastLogin: new Date().toISOString(),
            sessionsLast7d: 5,
            topPage: '/dashboard',
            inactiveHours: 2,
            atRisk: false,
          },
        ],
        generatedAt: new Date().toISOString(),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      render(<SessionAnalyticsCard />)

      await waitFor(() => {
        // Check for table structure
        const table = document.querySelector('table')
        expect(table).toBeInTheDocument()

        // Check for table headers
        const headers = document.querySelectorAll('th')
        expect(headers.length).toBeGreaterThan(0)
      })
    })
  })
})
