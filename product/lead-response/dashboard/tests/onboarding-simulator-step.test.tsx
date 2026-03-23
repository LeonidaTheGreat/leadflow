/**
 * @jest-environment jsdom
 */
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

    expect(screen.getByText('See LeadFlow AI in Action')).toBeInTheDocument()
    expect(screen.getByText(/Watch how our AI responds to a lead in under 30 seconds/)).toBeInTheDocument()
  })

  it('shows the "Aha Moment" info box', () => {
    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    expect(screen.getByText('This is your "Aha Moment"')).toBeInTheDocument()
    expect(screen.getByText(/See exactly how LeadFlow AI engages with leads instantly/)).toBeInTheDocument()
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

  it('shows skip option', () => {
    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    expect(screen.getByText('Skip for Now')).toBeInTheDocument()
  })

  it('calls onNext when skip is clicked', async () => {
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

    fireEvent.click(screen.getByText('Skip for Now'))

    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled()
    })
  })

  it('shows benefits section with stats', () => {
    render(
      <OnboardingSimulator
        onNext={mockOnNext}
        onBack={mockOnBack}
        agentData={mockAgentData}
        setAgentData={mockSetAgentData}
      />
    )

    expect(screen.getByText('< 30s')).toBeInTheDocument()
    expect(screen.getByText('Response time')).toBeInTheDocument()
    expect(screen.getByText('24/7')).toBeInTheDocument()
    expect(screen.getByText('Always on')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.getByText('More deals')).toBeInTheDocument()
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

  it('displays lead name when simulation is running', async () => {
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
      expect(screen.getByText('Lead:')).toBeInTheDocument()
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
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
            status: 'success',
            lead_name: 'Sarah Johnson',
            response_time_ms: 2500,
            conversation: [
              { role: 'lead', message: 'Hi, I am interested in buying a home', timestamp: new Date().toISOString() },
              { role: 'ai', message: 'Hi there! I would love to help you', timestamp: new Date().toISOString() },
            ],
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
              { role: 'lead', message: 'Hi, I am interested in buying a home', timestamp: new Date().toISOString() },
              { role: 'ai', message: 'Hi there! I would love to help you', timestamp: new Date().toISOString() },
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

    await waitFor(() => {
      expect(screen.getByText('Continue to Dashboard')).toBeInTheDocument()
      expect(screen.getByText(/2.5s/)).toBeInTheDocument()
      expect(screen.getByText(/under 30 seconds/)).toBeInTheDocument()
    })
  })

  it('updates agentData with aha moment completion on success', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
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

    await waitFor(() => {
      expect(mockSetAgentData).toHaveBeenCalledWith(
        expect.objectContaining({
          ahaCompleted: true,
          ahaResponseTimeMs: 2500,
        })
      )
    })
  })
})
