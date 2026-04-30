/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OnboardingSimulator from '../app/onboarding/steps/simulator'

// Mock fetch
global.fetch = jest.fn()

const mockAgentData = {
  agentId: 'test-agent-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  ahaCompleted: false,
  ahaResponseTimeMs: null,
}

const mockSetAgentData = jest.fn()
const mockOnNext = jest.fn()
const mockOnBack = jest.fn()

describe('OnboardingSimulator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('renders the simulator step with correct title and description', () => {
    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    expect(screen.getByText('See LeadFlow in Action')).toBeInTheDocument()
    expect(screen.getByText(/Watch how our AI responds to a lead in under 30 seconds/)).toBeInTheDocument()
  })

  it("shows the info box with \"What you're seeing:\"", () => {
    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    expect(screen.getByText(/What you.re seeing:/)).toBeInTheDocument()
  })

  it('shows start simulation button initially', () => {
    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    expect(screen.getByText('Start Simulation')).toBeInTheDocument()
  })

  it('shows skip button initially', () => {
    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    expect(screen.getByText('Skip')).toBeInTheDocument()
  })

  it('shows skip confirmation modal when Skip is clicked', async () => {
    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    fireEvent.click(screen.getByText('Skip'))

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to skip?')).toBeInTheDocument()
      expect(screen.getByText('Skip this step')).toBeInTheDocument()
    })
  })

  it('calls onNext when "Skip this step" in confirmation modal is clicked', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    fireEvent.click(screen.getByText('Skip'))

    await waitFor(() => {
      expect(screen.getByText('Skip this step')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Skip this step'))

    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled()
    })
  })

  it('starts simulation when start button is clicked', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        state: {
          id: 'sim-123',
          session_id: 'session-123',
          agent_id: 'test-agent-123',
          status: 'running',
          lead_name: 'Sarah Johnson',
          conversation: [],
        },
      }),
    })

    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    fireEvent.click(screen.getByText('Start Simulation'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/onboarding/simulator',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"action":"start"'),
        })
      )
    })
  })

  it('shows continue button when simulation completes successfully', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          state: {
            id: 'sim-123',
            session_id: 'session-123',
            agent_id: 'test-agent-123',
            status: 'running',
            lead_name: 'Sarah Johnson',
            conversation: [],
          },
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          state: {
            id: 'sim-123',
            session_id: 'session-123',
            agent_id: 'test-agent-123',
            status: 'success',
            lead_name: 'Sarah Johnson',
            response_time_ms: 2500,
            conversation: [
              { role: 'lead', message: 'Hi, I am interested', timestamp: new Date().toISOString() },
              { role: 'ai', message: 'Hi there!', timestamp: new Date().toISOString() },
            ],
          },
        }),
      })

    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    fireEvent.click(screen.getByText('Start Simulation'))

    await waitFor(
      () => {
        expect(screen.getByText('Continue to Dashboard')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('updates agentData with aha moment completion on success', async () => {
    // First call: start returns running; second+ calls (polling): return success
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          state: {
            id: 'sim-123',
            session_id: 'session-123',
            agent_id: 'test-agent-123',
            status: 'running',
            lead_name: 'Sarah Johnson',
            conversation: [],
          },
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          state: {
            id: 'sim-123',
            session_id: 'session-123',
            agent_id: 'test-agent-123',
            status: 'success',
            lead_name: 'Sarah Johnson',
            response_time_ms: 2500,
            conversation: [],
          },
        }),
      })

    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    fireEvent.click(screen.getByText('Start Simulation'))

    await waitFor(
      () => {
        expect(mockSetAgentData).toHaveBeenCalledWith(
          expect.objectContaining({
            ahaCompleted: true,
            ahaResponseTimeMs: 2500,
          })
        )
      },
      { timeout: 5000 }
    )
  })
})
