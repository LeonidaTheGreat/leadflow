import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormWizard, FormStep } from '@/components/forms/FormWizard'
import { TextField } from '@/components/forms/TextField'

const TestWizard = ({ steps, onComplete, ...props }: any) => {
  const schema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
  })

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
  })

  return (
    <FormProvider {...methods}>
      <FormWizard steps={steps} onComplete={onComplete} {...props} />
    </FormProvider>
  )
}

describe('FormWizard', () => {
  const steps: FormStep[] = [
    {
      id: "personal",
      title: "Personal Info",
      description: "Enter your personal details",
      fields: ["firstName", "lastName"],
      component: (
        <>
          <TextField name="firstName" label="First Name" />
          <TextField name="lastName" label="Last Name" />
        </>
      ),
    },
    {
      id: "contact",
      title: "Contact Info",
      description: "Enter your contact details",
      fields: ["email"],
      component: (
        <TextField name="email" label="Email" type="email" />
      ),
    },
    {
      id: "review",
      title: "Review",
      fields: [],
      component: (
        <div data-testid="review-content">Review your information</div>
      ),
    },
  ]

  it('renders first step by default', () => {
    render(<TestWizard steps={steps} onComplete={vi.fn()} />)

    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    expect(screen.getByText("Personal Info")).toBeInTheDocument()
    expect(screen.getByLabelText("First Name")).toBeInTheDocument()
  })

  it('displays progress bar', () => {
    render(<TestWizard steps={steps} onComplete={vi.fn()} />)

    const progressBar = screen.getByRole('progressbar') || document.querySelector('.bg-primary')
    expect(progressBar).toBeInTheDocument()
  })

  it('navigates to next step when next is clicked', async () => {
    render(<TestWizard steps={steps} onComplete={vi.fn()} />)

    await userEvent.type(screen.getByLabelText("First Name"), "John")
    await userEvent.type(screen.getByLabelText("Last Name"), "Doe")

    fireEvent.click(screen.getByText("Next"))

    await waitFor(() => {
      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument()
      expect(screen.getByText("Contact Info")).toBeInTheDocument()
    })
  })

  it('shows validation errors before navigating', async () => {
    render(<TestWizard steps={steps} onComplete={vi.fn()} />)

    fireEvent.click(screen.getByText("Next"))

    await waitFor(() => {
      expect(screen.getByText("First name is required")).toBeInTheDocument()
    })

    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
  })

  it('navigates to previous step when previous is clicked', async () => {
    render(<TestWizard steps={steps} onComplete={vi.fn()} />)

    await userEvent.type(screen.getByLabelText("First Name"), "John")
    await userEvent.type(screen.getByLabelText("Last Name"), "Doe")

    fireEvent.click(screen.getByText("Next"))
    await waitFor(() => {
      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Previous"))
    await waitFor(() => {
      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    })
  })

  it('calls onComplete when final step is submitted', async () => {
    const onComplete = vi.fn()
    render(<TestWizard steps={steps} onComplete={onComplete} />)

    await userEvent.type(screen.getByLabelText("First Name"), "John")
    await userEvent.type(screen.getByLabelText("Last Name"), "Doe")
    fireEvent.click(screen.getByText("Next"))

    await waitFor(() => {
      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument()
    })

    await userEvent.type(screen.getByLabelText("Email"), "john@example.com")
    fireEvent.click(screen.getByText("Next"))

    await waitFor(() => {
      expect(screen.getByText("Step 3 of 3")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Complete"))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      })
    })
  })

  it('displays step indicators', () => {
    render(<TestWizard steps={steps} onComplete={vi.fn()} />)

    expect(screen.getByText("Personal Info")).toBeInTheDocument()
    expect(screen.getByText("Contact Info")).toBeInTheDocument()
    expect(screen.getByText("Review")).toBeInTheDocument()
  })

  it('shows cancel button on first step when onCancel is provided', () => {
    render(<TestWizard steps={steps} onComplete={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText("Cancel")).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<TestWizard steps={steps} onComplete={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByText("Cancel"))
    expect(onCancel).toHaveBeenCalled()
  })
})
