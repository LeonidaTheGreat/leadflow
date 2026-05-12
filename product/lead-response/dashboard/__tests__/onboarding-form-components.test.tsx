/**
 * Unit tests for Onboarding Form Step Components
 *
 * Tests actual React component behaviour: validation, interactions, callbacks.
 * All components are imported directly — no raw-HTML stubs.
 *
 * Components covered:
 *   - OnboardingWelcome   (app/onboarding/steps/welcome.tsx)
 *   - OnboardingAgentInfo (app/onboarding/steps/agent-info.tsx)
 *   - OnboardingCalendar  (app/onboarding/steps/calendar.tsx)
 *   - OnboardingSMS       (app/onboarding/steps/sms-config.tsx)
 *   - OnboardingConfirm   (app/onboarding/steps/confirmation.tsx)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import OnboardingWelcome from '@/app/onboarding/steps/welcome'
import OnboardingAgentInfo from '@/app/onboarding/steps/agent-info'
import OnboardingCalendar from '@/app/onboarding/steps/calendar'
import OnboardingSMS from '@/app/onboarding/steps/sms-config'
import OnboardingConfirm from '@/app/onboarding/steps/confirmation'

// fetch is globally mocked via jest.setup.ts
const fetchMock = global.fetch as jest.Mock

const noop = jest.fn()

const baseAgentData = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  timezone: 'America/New_York',
  country: 'us',
  state: '',
  calendarUrl: '',
  calcomLink: '',
  smsPhoneNumber: '',
  ahaCompleted: false,
  ahaResponseTimeMs: null as number | null,
  ahaSkipped: false,
  simulatorSessionId: '',
  tempAgentId: '',
  utmSource: null as string | null,
  utmMedium: null as string | null,
  utmCampaign: null as string | null,
  utmContent: null as string | null,
  utmTerm: null as string | null,
}

beforeEach(() => {
  fetchMock.mockReset()
  noop.mockReset()
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ available: true }),
  })
})

// ─────────────────────────────────────────────────────────────
// OnboardingWelcome
// ─────────────────────────────────────────────────────────────

describe('OnboardingWelcome', () => {
  it('renders email, password, confirm password fields and submit button', () => {
    render(
      <OnboardingWelcome onNext={noop} agentData={baseAgentData} setAgentData={noop} />
    )

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Free Pilot/i })).toBeInTheDocument()
  })

  it('shows email required error when email is blank on submit', async () => {
    render(
      <OnboardingWelcome onNext={noop} agentData={baseAgentData} setAgentData={noop} />
    )

    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
      target: { value: 'SecurePass1' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'SecurePass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })
  })

  it('shows invalid email error for bad format', async () => {
    render(
      <OnboardingWelcome onNext={noop} agentData={baseAgentData} setAgentData={noop} />
    )

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'not-an-email' },
    })
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
      target: { value: 'SecurePass1' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'SecurePass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('shows password required error when password is blank', async () => {
    render(
      <OnboardingWelcome onNext={noop} agentData={baseAgentData} setAgentData={noop} />
    )

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'agent@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('shows password too short error for passwords under 8 characters', async () => {
    render(
      <OnboardingWelcome onNext={noop} agentData={baseAgentData} setAgentData={noop} />
    )

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'agent@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
      target: { value: 'short' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'short' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })
  })

  it('shows passwords do not match error', async () => {
    render(
      <OnboardingWelcome onNext={noop} agentData={baseAgentData} setAgentData={noop} />
    )

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'agent@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
      target: { value: 'SecurePass1' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'DifferentPass9' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('shows email already registered error when API returns available=false', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: false }),
    })
    const onNext = jest.fn()

    render(
      <OnboardingWelcome onNext={onNext} agentData={baseAgentData} setAgentData={noop} />
    )

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'taken@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
      target: { value: 'SecurePass1' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'SecurePass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))

    await waitFor(() => {
      expect(screen.getByText('Email is already registered')).toBeInTheDocument()
    })
    expect(onNext).not.toHaveBeenCalled()
  })

  it('calls setAgentData with lowercased email and calls onNext on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true }),
    })
    const onNext = jest.fn()
    const setAgentData = jest.fn()

    render(
      <OnboardingWelcome
        onNext={onNext}
        agentData={baseAgentData}
        setAgentData={setAgentData}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'Agent@Example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
      target: { value: 'SecurePass1' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
      target: { value: 'SecurePass1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))

    await waitFor(() => {
      expect(onNext).toHaveBeenCalledTimes(1)
    })
    expect(setAgentData).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'agent@example.com',
        password: 'SecurePass1',
      })
    )
  })

  it('renders sign-in link for existing accounts', () => {
    render(
      <OnboardingWelcome onNext={noop} agentData={baseAgentData} setAgentData={noop} />
    )

    expect(screen.getByRole('link', { name: /Sign in/i })).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────
// OnboardingAgentInfo
// ─────────────────────────────────────────────────────────────

describe('OnboardingAgentInfo', () => {
  it('renders first name, last name, phone, and state/country selects', () => {
    render(
      <OnboardingAgentInfo
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    expect(screen.getByPlaceholderText('John')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Smith')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('(555) 123-4567')).toBeInTheDocument()
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })

  it('shows all required-field errors when submitted empty', async () => {
    render(
      <OnboardingAgentInfo
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument()
      expect(screen.getByText('Last name is required')).toBeInTheDocument()
      expect(screen.getByText('Phone number is required')).toBeInTheDocument()
      expect(screen.getByText('State is required')).toBeInTheDocument()
    })
  })

  it('shows invalid phone error for too-short number', async () => {
    render(
      <OnboardingAgentInfo
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Smith'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('(555) 123-4567'), {
      target: { value: '555123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid 10-digit phone number')
      ).toBeInTheDocument()
    })
  })

  it('formats phone number with dashes as user types', async () => {
    render(
      <OnboardingAgentInfo
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    const phoneInput = screen.getByPlaceholderText('(555) 123-4567') as HTMLInputElement
    fireEvent.change(phoneInput, { target: { value: '5551234567' } })

    await waitFor(() => {
      expect(phoneInput.value).toBe('555-123-4567')
    })
  })

  it('pre-populates name fields from agentData', () => {
    const populated = { ...baseAgentData, firstName: 'Alice', lastName: 'Wonder' }
    render(
      <OnboardingAgentInfo
        onNext={noop}
        onBack={noop}
        agentData={populated}
        setAgentData={noop}
      />
    )

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Wonder')).toBeInTheDocument()
  })

  it('calls onNext and setAgentData with normalised data on valid submit', async () => {
    const onNext = jest.fn()
    const setAgentData = jest.fn()

    render(
      <OnboardingAgentInfo
        onNext={onNext}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={setAgentData}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Smith'), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByPlaceholderText('(555) 123-4567'), {
      target: { value: '5551234567' },
    })
    // second combobox is State
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: 'California' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => {
      expect(onNext).toHaveBeenCalledTimes(1)
    })
    expect(setAgentData).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Smith',
        state: 'California',
      })
    )
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = jest.fn()
    render(
      <OnboardingAgentInfo
        onNext={noop}
        onBack={onBack}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows province list when country is switched to Canada', async () => {
    render(
      <OnboardingAgentInfo
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    const [countrySelect] = screen.getAllByRole('combobox')
    fireEvent.change(countrySelect, { target: { value: 'ca' } })

    await waitFor(() => {
      expect(screen.getByText('Select your province...')).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────
// OnboardingCalendar
// ─────────────────────────────────────────────────────────────

describe('OnboardingCalendar', () => {
  it('renders Cal.com input, optional notice, back and continue buttons', () => {
    render(
      <OnboardingCalendar
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    expect(screen.getByPlaceholderText('https://cal.com/yourname')).toBeInTheDocument()
    expect(screen.getByText(/Optional/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument()
  })

  it('allows proceeding with no Cal.com link entered', () => {
    const onNext = jest.fn()
    render(
      <OnboardingCalendar
        onNext={onNext}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows Verify Booking Link button once a URL is entered', async () => {
    render(
      <OnboardingCalendar
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('https://cal.com/yourname'), {
      target: { value: 'https://cal.com/myname' },
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Verify Booking Link/i })
      ).toBeInTheDocument()
    })
  })

  it('shows error when verifying a non-cal.com URL', async () => {
    render(
      <OnboardingCalendar
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('https://cal.com/yourname'), {
      target: { value: 'https://google.com/calendar' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Verify Booking Link/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid Cal.com booking link')
      ).toBeInTheDocument()
    })
  })

  it('shows verified confirmation after successful API verification', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    })

    render(
      <OnboardingCalendar
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('https://cal.com/yourname'), {
      target: { value: 'https://cal.com/myname' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Verify Booking Link/i }))

    await waitFor(() => {
      expect(screen.getByText('Booking link verified!')).toBeInTheDocument()
    })
  })

  it('shows error when API says link is not accessible', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false }),
    })

    render(
      <OnboardingCalendar
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('https://cal.com/yourname'), {
      target: { value: 'https://cal.com/myname' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Verify Booking Link/i }))

    await waitFor(() => {
      expect(
        screen.getByText('This booking link is not accessible. Please check the URL.')
      ).toBeInTheDocument()
    })
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = jest.fn()
    render(
      <OnboardingCalendar
        onNext={noop}
        onBack={onBack}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────
// OnboardingSMS
// ─────────────────────────────────────────────────────────────

describe('OnboardingSMS', () => {
  it('renders SMS phone input, optional notice, back and continue buttons', () => {
    render(
      <OnboardingSMS
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    expect(screen.getByPlaceholderText('+1 (555) 123-4567')).toBeInTheDocument()
    expect(screen.getByText(/Optional/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument()
  })

  it('allows proceeding with no phone number entered', () => {
    const onNext = jest.fn()
    render(
      <OnboardingSMS
        onNext={onNext}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows invalid phone error when a short number is submitted', async () => {
    render(
      <OnboardingSMS
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('+1 (555) 123-4567'), {
      target: { value: '555123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid 10-digit phone number')
      ).toBeInTheDocument()
    })
  })

  it('shows Send Test SMS button once any phone digits are entered', async () => {
    render(
      <OnboardingSMS
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('+1 (555) 123-4567'), {
      target: { value: '555123' },
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Send Test SMS/i })
      ).toBeInTheDocument()
    })
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = jest.fn()
    render(
      <OnboardingSMS
        onNext={noop}
        onBack={onBack}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('lists SMS feature benefits', () => {
    render(
      <OnboardingSMS
        onNext={noop}
        onBack={noop}
        agentData={baseAgentData}
        setAgentData={noop}
      />
    )

    expect(screen.getByText('Instant lead qualification responses')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────
// OnboardingConfirmation
// ─────────────────────────────────────────────────────────────

describe('OnboardingConfirmation', () => {
  const fullAgentData = {
    ...baseAgentData,
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Smith',
    phoneNumber: '5551234567',
    state: 'California',
    calcomLink: 'https://cal.com/john',
    smsPhoneNumber: '5559876543',
    ahaCompleted: true,
    ahaResponseTimeMs: 8500,
  }

  it('displays the agent email', () => {
    render(<OnboardingConfirm onNext={noop} onBack={noop} agentData={fullAgentData} />)
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('displays the agent full name', () => {
    render(<OnboardingConfirm onNext={noop} onBack={noop} agentData={fullAgentData} />)
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('displays the formatted phone number', () => {
    render(<OnboardingConfirm onNext={noop} onBack={noop} agentData={fullAgentData} />)
    expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
  })

  it('displays the state', () => {
    render(<OnboardingConfirm onNext={noop} onBack={noop} agentData={fullAgentData} />)
    expect(screen.getByText('California')).toBeInTheDocument()
  })

  it('shows Connected status when calcomLink is provided', () => {
    render(<OnboardingConfirm onNext={noop} onBack={noop} agentData={fullAgentData} />)
    const connectedItems = screen.getAllByText(/Connected/i)
    expect(connectedItems.length).toBeGreaterThanOrEqual(1)
  })

  it('shows Skipped status when integrations are absent', () => {
    const minimal = {
      ...fullAgentData,
      calcomLink: '',
      smsPhoneNumber: '',
      ahaCompleted: false,
    }
    render(<OnboardingConfirm onNext={noop} onBack={noop} agentData={minimal} />)
    const skipped = screen.getAllByText(/Skipped/i)
    expect(skipped.length).toBeGreaterThanOrEqual(2)
  })

  it('calls onNext when the complete button is clicked', () => {
    const onNext = jest.fn()
    render(<OnboardingConfirm onNext={onNext} onBack={noop} agentData={fullAgentData} />)
    fireEvent.click(screen.getByRole('button', { name: /See Your First AI Response/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = jest.fn()
    render(<OnboardingConfirm onNext={noop} onBack={onBack} agentData={fullAgentData} />)
    fireEvent.click(screen.getByRole('button', { name: /Back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('displays free pilot plan details', () => {
    render(<OnboardingConfirm onNext={noop} onBack={noop} agentData={fullAgentData} />)
    expect(screen.getByText('Free Pilot')).toBeInTheDocument()
    expect(screen.getByText('60 days')).toBeInTheDocument()
  })

  it('shows pricing teaser element via data-testid', () => {
    render(<OnboardingConfirm onNext={noop} onBack={noop} agentData={fullAgentData} />)
    expect(screen.getByTestId('onboarding-shows-price')).toBeInTheDocument()
  })

  it('shows "Not provided" when phone number is absent', () => {
    const noPhone = { ...fullAgentData, phoneNumber: '' }
    render(<OnboardingConfirm onNext={noop} onBack={noop} agentData={noPhone} />)
    expect(screen.getByText('Not provided')).toBeInTheDocument()
  })
})
