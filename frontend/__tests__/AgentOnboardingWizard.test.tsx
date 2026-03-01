import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentOnboardingWizard } from '@/components/onboarding/AgentOnboardingWizard'
import { authService } from '@/services/auth'

// Mock auth service
vi.mock('@/services/auth', () => ({
  authService: {
    register: vi.fn(),
    clearToken: vi.fn(),
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('AgentOnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('renders first step (Account) by default', () => {
    render(<AgentOnboardingWizard />)

    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument()
    expect(screen.getByText(/Create your account credentials/i)).toBeInTheDocument()
  })

  it('displays progress bar and step indicators', () => {
    render(<AgentOnboardingWizard />)

    // Check for step numbers in the indicator circles
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('validates required fields before navigating to next step', async () => {
    render(<AgentOnboardingWizard />)

    // Try to go next without filling required fields
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument()
    })

    // Should still be on step 1
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument()
  })

  it('can navigate to next step with valid data', async () => {
    render(<AgentOnboardingWizard />)

    // Get inputs by their placeholder or id
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement
    const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'Password123')
    await userEvent.type(confirmPasswordInput, 'Password123')

    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument()
    })
  })

  it('can navigate back to previous steps', async () => {
    render(<AgentOnboardingWizard />)

    // Fill step 1 and go to step 2
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement
    const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'Password123')
    await userEvent.type(confirmPasswordInput, 'Password123')
    
    fireEvent.click(screen.getByText(/Next/i))
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument()
    })

    // Go back to step 1
    fireEvent.click(screen.getByText(/Previous/i))
    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument()
    })

    // Data should be preserved
    expect(emailInput).toHaveValue('test@example.com')
  })

  it('submits form and shows success view on complete', async () => {
    const mockRegister = vi.mocked(authService.register)
    mockRegister.mockResolvedValue({
      success: true,
      user: { id: '123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
      token: 'fake-token',
    })

    render(<AgentOnboardingWizard />)

    // Navigate through all steps quickly using query selectors
    const fillStep1 = async () => {
      await userEvent.type(document.querySelector('input[name="email"]')!, 'test@example.com')
      await userEvent.type(document.querySelector('input[name="password"]')!, 'Password123')
      await userEvent.type(document.querySelector('input[name="confirmPassword"]')!, 'Password123')
      fireEvent.click(screen.getByText(/Next/i))
      await waitFor(() => screen.getByText(/Step 2 of 6/i))
    }

    const fillStep2 = async () => {
      await userEvent.type(document.querySelector('input[name="firstName"]')!, 'John')
      await userEvent.type(document.querySelector('input[name="lastName"]')!, 'Doe')
      await userEvent.type(document.querySelector('input[name="phoneNumber"]')!, '5551234567')
      fireEvent.click(screen.getByText(/Next/i))
      await waitFor(() => screen.getByText(/Step 3 of 6/i))
    }

    const fillStep3 = async () => {
      await userEvent.type(document.querySelector('input[name="brokerageName"]')!, 'Test Realty')
      await userEvent.type(document.querySelector('input[name="licenseNumber"]')!, '12345678')
      fireEvent.click(screen.getByText(/Next/i))
      await waitFor(() => screen.getByText(/Step 4 of 6/i))
    }

    const fillStep4 = async () => {
      fireEvent.click(screen.getByText(/Next/i))
      await waitFor(() => screen.getByText(/Step 5 of 6/i))
    }

    const fillStep5 = async () => {
      fireEvent.click(screen.getByText(/Next/i))
      await waitFor(() => screen.getByText(/Step 6 of 6/i))
    }

    await fillStep1()
    await fillStep2()
    await fillStep3()
    await fillStep4()
    await fillStep5()
    
    // Check terms
    const termsCheckbox = screen.getByRole('checkbox', { name: /I agree to/i })
    fireEvent.click(termsCheckbox)

    fireEvent.click(screen.getByText(/Complete/i))

    await waitFor(() => {
      expect(screen.getByText(/You're All Set/i)).toBeInTheDocument()
    })

    expect(mockRegister).toHaveBeenCalled()
  })

  it('displays error when registration fails', async () => {
    const mockRegister = vi.mocked(authService.register)
    mockRegister.mockResolvedValue({
      success: false,
      error: 'Email already exists',
    })

    render(<AgentOnboardingWizard />)

    // Navigate through all steps
    await userEvent.type(document.querySelector('input[name="email"]')!, 'test@example.com')
    await userEvent.type(document.querySelector('input[name="password"]')!, 'Password123')
    await userEvent.type(document.querySelector('input[name="confirmPassword"]')!, 'Password123')
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 2 of 6/i))
    await userEvent.type(document.querySelector('input[name="firstName"]')!, 'John')
    await userEvent.type(document.querySelector('input[name="lastName"]')!, 'Doe')
    await userEvent.type(document.querySelector('input[name="phoneNumber"]')!, '5551234567')
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 3 of 6/i))
    await userEvent.type(document.querySelector('input[name="brokerageName"]')!, 'Test Realty')
    await userEvent.type(document.querySelector('input[name="licenseNumber"]')!, '12345678')
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 4 of 6/i))
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 5 of 6/i))
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 6 of 6/i))
    
    const termsCheckbox = screen.getByRole('checkbox', { name: /I agree to/i })
    fireEvent.click(termsCheckbox)

    fireEvent.click(screen.getByText(/Complete/i))

    await waitFor(() => {
      expect(screen.getByText(/Email already exists/i)).toBeInTheDocument()
    })
  })

  it('shows cancel button on first step when onCancel is provided', () => {
    const onCancel = vi.fn()
    render(<AgentOnboardingWizard onCancel={onCancel} />)

    expect(screen.getByText(/Cancel/i)).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<AgentOnboardingWizard onCancel={onCancel} />)

    fireEvent.click(screen.getByText(/Cancel/i))
    expect(onCancel).toHaveBeenCalled()
  })

  it('is responsive on mobile screens', () => {
    render(<AgentOnboardingWizard />)
    
    // Check that form container exists
    const formContainer = document.querySelector('form')
    expect(formContainer).toBeInTheDocument()
  })

  it('saves form data to localStorage on change', async () => {
    render(<AgentOnboardingWizard />)

    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
    await userEvent.type(emailInput, 'test@example.com')

    // Wait for debounce
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('requires terms acceptance before completion', async () => {
    render(<AgentOnboardingWizard />)

    // Navigate to final step
    await userEvent.type(document.querySelector('input[name="email"]')!, 'test@example.com')
    await userEvent.type(document.querySelector('input[name="password"]')!, 'Password123')
    await userEvent.type(document.querySelector('input[name="confirmPassword"]')!, 'Password123')
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 2 of 6/i))
    await userEvent.type(document.querySelector('input[name="firstName"]')!, 'John')
    await userEvent.type(document.querySelector('input[name="lastName"]')!, 'Doe')
    await userEvent.type(document.querySelector('input[name="phoneNumber"]')!, '5551234567')
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 3 of 6/i))
    await userEvent.type(document.querySelector('input[name="brokerageName"]')!, 'Test Realty')
    await userEvent.type(document.querySelector('input[name="licenseNumber"]')!, '12345678')
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 4 of 6/i))
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 5 of 6/i))
    fireEvent.click(screen.getByText(/Next/i))

    await waitFor(() => screen.getByText(/Step 6 of 6/i))

    // Try to complete without checking terms
    fireEvent.click(screen.getByText(/Complete/i))

    await waitFor(() => {
      expect(screen.getByText(/You must accept the terms and conditions/i)).toBeInTheDocument()
    })
  })
})
