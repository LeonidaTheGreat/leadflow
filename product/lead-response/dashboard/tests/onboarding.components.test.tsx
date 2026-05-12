/**
 * Agent Onboarding UI - Component Unit Tests
 * Tests individual React components in isolation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OnboardingWelcome from '@/app/onboarding/steps/welcome'
import OnboardingAgentInfo from '@/app/onboarding/steps/agent-info'
import OnboardingCalendar from '@/app/onboarding/steps/calendar'
import OnboardingSMS from '@/app/onboarding/steps/sms-config'
import OnboardingConfirm from '@/app/onboarding/steps/confirmation'
import OnboardingProgress from '@/app/onboarding/components/progress'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('Onboarding Components', () => {
  describe('OnboardingWelcome', () => {
    const onNext = jest.fn()
    const setAgentData = jest.fn()
    const props = { onNext, agentData: {}, setAgentData }

    beforeEach(() => {
      jest.clearAllMocks()
      ;(global.fetch as jest.Mock).mockReset()
    })

    it('renders email, password, and confirm fields', () => {
      render(<OnboardingWelcome {...props} />)
      expect(screen.getByTestId('email')).toBeInTheDocument()
      expect(screen.getByTestId('password')).toBeInTheDocument()
      expect(screen.getByTestId('confirm-password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Start Free Pilot/i })).toBeInTheDocument()
    })

    it('shows email required error on empty submit', async () => {
      render(<OnboardingWelcome {...props} />)
      fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))
      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument()
      })
    })

    it('shows password minimum length error', async () => {
      render(<OnboardingWelcome {...props} />)
      fireEvent.change(screen.getByTestId('email'), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByTestId('password'), { target: { value: 'short' } })
      fireEvent.change(screen.getByTestId('confirm-password'), { target: { value: 'short' } })
      fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))
      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
      })
    })

    it('shows password mismatch error', async () => {
      render(<OnboardingWelcome {...props} />)
      fireEvent.change(screen.getByTestId('email'), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByTestId('password'), { target: { value: 'SecurePass123' } })
      fireEvent.change(screen.getByTestId('confirm-password'), { target: { value: 'DifferentPass' } })
      fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))
      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('calls onNext after successful email check', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ available: true }),
      })
      render(<OnboardingWelcome {...props} />)
      fireEvent.change(screen.getByTestId('email'), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByTestId('password'), { target: { value: 'SecurePass123' } })
      fireEvent.change(screen.getByTestId('confirm-password'), { target: { value: 'SecurePass123' } })
      fireEvent.click(screen.getByRole('button', { name: /Start Free Pilot/i }))
      await waitFor(() => {
        expect(onNext).toHaveBeenCalled()
      })
    })
  })

  describe('OnboardingAgentInfo', () => {
    const onNext = jest.fn()
    const onBack = jest.fn()
    const setAgentData = jest.fn()
    const props = { onNext, onBack, agentData: {}, setAgentData }

    beforeEach(() => jest.clearAllMocks())

    it('renders all form fields', () => {
      render(<OnboardingAgentInfo {...props} />)
      expect(screen.getByTestId('first-name')).toBeInTheDocument()
      expect(screen.getByTestId('last-name')).toBeInTheDocument()
      expect(screen.getByTestId('phone')).toBeInTheDocument()
      expect(screen.getByTestId('state')).toBeInTheDocument()
    })

    it('shows required field errors when continuing with empty form', () => {
      render(<OnboardingAgentInfo {...props} />)
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/Last name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/Phone number is required/i)).toBeInTheDocument()
    })

    it('formats phone number as user types', () => {
      render(<OnboardingAgentInfo {...props} />)
      const phoneInput = screen.getByTestId('phone') as HTMLInputElement
      fireEvent.change(phoneInput, { target: { value: '5551234567' } })
      expect(phoneInput.value).toBe('555-123-4567')
    })

    it('shows invalid phone error for short number', () => {
      render(<OnboardingAgentInfo {...props} />)
      fireEvent.change(screen.getByTestId('first-name'), { target: { value: 'John' } })
      fireEvent.change(screen.getByTestId('last-name'), { target: { value: 'Smith' } })
      fireEvent.change(screen.getByTestId('phone'), { target: { value: '555123' } })
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
      expect(screen.getByText(/valid 10-digit phone/i)).toBeInTheDocument()
    })

    it('calls onBack when back button is clicked', () => {
      render(<OnboardingAgentInfo {...props} />)
      fireEvent.click(screen.getByRole('button', { name: /Back/i }))
      expect(onBack).toHaveBeenCalled()
    })
  })

  describe('OnboardingCalendar', () => {
    const onNext = jest.fn()
    const onBack = jest.fn()
    const setAgentData = jest.fn()
    const props = { onNext, onBack, agentData: {}, setAgentData }

    beforeEach(() => {
      jest.clearAllMocks()
      ;(global.fetch as jest.Mock).mockReset()
    })

    it('renders calendar setup section', () => {
      render(<OnboardingCalendar {...props} />)
      expect(screen.getByText(/Connect your calendar/i)).toBeInTheDocument()
      expect(screen.getByTestId('calcom-link')).toBeInTheDocument()
      expect(screen.getByText(/Optional/i)).toBeInTheDocument()
    })

    it('shows verify button when link is entered', () => {
      render(<OnboardingCalendar {...props} />)
      fireEvent.change(screen.getByTestId('calcom-link'), {
        target: { value: 'https://cal.com/testuser' },
      })
      expect(screen.getByTestId('verify-btn')).toBeInTheDocument()
    })

    it('can continue without a calendar link (optional)', () => {
      render(<OnboardingCalendar {...props} />)
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
      expect(onNext).toHaveBeenCalled()
    })
  })

  describe('OnboardingSMS', () => {
    const onNext = jest.fn()
    const onBack = jest.fn()
    const setAgentData = jest.fn()
    const props = { onNext, onBack, agentData: { firstName: 'John', lastName: 'Smith' }, setAgentData }

    beforeEach(() => jest.clearAllMocks())

    it('renders SMS configuration section', () => {
      render(<OnboardingSMS {...props} />)
      expect(screen.getByText(/SMS configuration/i)).toBeInTheDocument()
      expect(screen.getByTestId('sms-phone')).toBeInTheDocument()
    })

    it('can continue without a phone number (optional)', () => {
      render(<OnboardingSMS {...props} />)
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
      expect(onNext).toHaveBeenCalled()
    })

    it('shows validation error for invalid phone', () => {
      render(<OnboardingSMS {...props} />)
      fireEvent.change(screen.getByTestId('sms-phone'), { target: { value: '555' } })
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
      expect(screen.getByText(/valid 10-digit phone/i)).toBeInTheDocument()
    })
  })

  describe('OnboardingConfirm', () => {
    const agentData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '5551234567',
      state: 'California',
    }
    const onBack = jest.fn()
    const onNext = jest.fn()
    const props = { onBack, onNext, agentData }

    beforeEach(() => jest.clearAllMocks())

    it('displays entered information', () => {
      render(<OnboardingConfirm {...props} />)
      expect(screen.getByText(/You're all set!/i)).toBeInTheDocument()
      expect(screen.getByText(agentData.email)).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText(agentData.state)).toBeInTheDocument()
    })

    it('shows pricing teaser', () => {
      render(<OnboardingConfirm {...props} />)
      expect(screen.getByTestId('onboarding-shows-price')).toBeInTheDocument()
    })

    it('calls onNext when CTA is clicked', () => {
      render(<OnboardingConfirm {...props} />)
      fireEvent.click(screen.getByRole('button', { name: /See Your First AI Response/i }))
      expect(onNext).toHaveBeenCalled()
    })

    it('calls onBack when back button is clicked', () => {
      render(<OnboardingConfirm {...props} />)
      fireEvent.click(screen.getByRole('button', { name: /Back/i }))
      expect(onBack).toHaveBeenCalled()
    })
  })

  describe('OnboardingProgress', () => {
    it('renders progress text', () => {
      render(<OnboardingProgress currentStep={0} totalSteps={5} />)
      expect(screen.getByText(/Progress: 1 of 5/i)).toBeInTheDocument()
    })

    it('updates text as step increases', () => {
      const { rerender } = render(<OnboardingProgress currentStep={0} totalSteps={5} />)
      expect(screen.getByText(/Progress: 1 of 5/i)).toBeInTheDocument()
      rerender(<OnboardingProgress currentStep={2} totalSteps={5} />)
      expect(screen.getByText(/Progress: 3 of 5/i)).toBeInTheDocument()
    })
  })
})
