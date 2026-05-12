import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

import { ProjectMetadataHeader } from '../components/dashboard/ProjectMetadataHeader'

describe('ProjectMetadataHeader', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('renders nothing before metadata is loaded', () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    const { container } = render(<ProjectMetadataHeader />)
    expect(container.firstChild).toBeNull()
  })

  it('loads metadata and renders required project fields', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metadata: {
          projectName: 'LeadFlow Real Estate AI',
          goal: '$20K MRR',
          currentDay: 80,
          deadline: 'Day 90 (May 15, 2026)',
          overallStatus: 'ACTIVE',
          statusColor: '🟢',
        },
      }),
    }) as unknown as typeof fetch

    render(<ProjectMetadataHeader />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/dashboard/project-metadata', { credentials: 'include' })
    })

    await waitFor(() => {
      expect(screen.getByText('LeadFlow Real Estate AI')).toBeInTheDocument()
      expect(screen.getByText('$20K MRR')).toBeInTheDocument()
      expect(screen.getByText('Day 80')).toBeInTheDocument()
      expect(screen.getByText('Day 90 (May 15, 2026)')).toBeInTheDocument()
      expect(screen.getByText('🟢 ACTIVE')).toBeInTheDocument()
    })
  })
})
