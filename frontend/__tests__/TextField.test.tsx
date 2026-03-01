import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TextField } from '@/components/forms/TextField'

const TestForm = ({ children, schema, defaultValues = {}, onSubmit = vi.fn() }: any) => {
  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {children}
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  )
}

describe('TextField', () => {
  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
  })

  it('renders with label', () => {
    render(
      <TestForm schema={schema}>
        <TextField name="name" label="Full Name" />
      </TestForm>
    )

    expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
  })

  it('renders with required indicator', () => {
    render(
      <TestForm schema={schema}>
        <TextField name="name" label="Full Name" required />
      </TestForm>
    )

    expect(screen.getByText("*")).toBeInTheDocument()
  })

  it('accepts text input', async () => {
    render(
      <TestForm schema={schema}>
        <TextField name="name" label="Full Name" />
      </TestForm>
    )

    const input = screen.getByLabelText("Full Name")
    await userEvent.type(input, "John Doe")

    expect(input).toHaveValue("John Doe")
  })

  it('displays helper text when provided', () => {
    render(
      <TestForm schema={schema}>
        <TextField 
          name="email" 
          label="Email" 
          helperText="We'll never share your email"
        />
      </TestForm>
    )

    expect(screen.getByText("We'll never share your email")).toBeInTheDocument()
  })

  it('displays validation error on invalid input', async () => {
    render(
      <TestForm schema={schema}>
        <TextField name="email" label="Email" />
      </TestForm>
    )

    const input = screen.getByLabelText("Email")
    await userEvent.type(input, "invalid-email")
    
    const submitButton = screen.getByText("Submit")
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Invalid email")).toBeInTheDocument()
    })
  })

  it('supports different input types', () => {
    render(
      <TestForm schema={schema}>
        <TextField name="email" label="Email" type="email" />
        <TextField name="password" label="Password" type="password" />
      </TestForm>
    )

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
  })

  it('supports placeholder text', () => {
    render(
      <TestForm schema={schema}>
        <TextField 
          name="name" 
          label="Full Name" 
          placeholder="Enter your name"
        />
      </TestForm>
    )

    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument()
  })

  it('can be disabled', () => {
    render(
      <TestForm schema={schema}>
        <TextField name="name" label="Full Name" disabled />
      </TestForm>
    )

    expect(screen.getByLabelText("Full Name")).toBeDisabled()
  })
})
