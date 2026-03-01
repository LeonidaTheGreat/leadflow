import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckboxField } from '@/components/forms/CheckboxField'

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

describe('CheckboxField', () => {
  const schema = z.object({
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms",
    }),
  })

  it('renders with label', () => {
    render(
      <TestForm schema={schema}>
        <CheckboxField 
          name="terms" 
          label="I agree to the terms and conditions"
        />
      </TestForm>
    )

    expect(screen.getByLabelText("I agree to the terms and conditions")).toBeInTheDocument()
  })

  it('renders with required indicator', () => {
    render(
      <TestForm schema={schema}>
        <CheckboxField 
          name="terms" 
          label="I agree to the terms"
          required
        />
      </TestForm>
    )

    expect(screen.getByText("*")).toBeInTheDocument()
  })

  it('can be checked and unchecked', async () => {
    render(
      <TestForm schema={schema}>
        <CheckboxField 
          name="terms" 
          label="I agree to the terms"
        />
      </TestForm>
    )

    const checkbox = screen.getByLabelText("I agree to the terms")
    expect(checkbox).not.toBeChecked()

    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()

    await userEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('displays validation error when required checkbox is not checked', async () => {
    render(
      <TestForm schema={schema}>
        <CheckboxField 
          name="terms" 
          label="I agree to the terms"
        />
      </TestForm>
    )

    const submitButton = screen.getByText("Submit")
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("You must accept the terms")).toBeInTheDocument()
    })
  })

  it('supports ReactNode as label', () => {
    render(
      <TestForm schema={schema}>
        <CheckboxField 
          name="terms" 
          label={
            <span>
              I agree to the <a href="/terms">terms</a>
            </span>
          }
        />
      </TestForm>
    )

    expect(screen.getByText("terms")).toHaveAttribute("href", "/terms")
  })

  it('can be disabled', () => {
    render(
      <TestForm schema={schema}>
        <CheckboxField 
          name="terms" 
          label="I agree to the terms"
          disabled
        />
      </TestForm>
    )

    expect(screen.getByLabelText("I agree to the terms")).toBeDisabled()
  })

  it('respects default value', () => {
    render(
      <TestForm schema={schema} defaultValues={{ terms: true }}>
        <CheckboxField 
          name="terms" 
          label="I agree to the terms"
        />
      </TestForm>
    )

    expect(screen.getByLabelText("I agree to the terms")).toBeChecked()
  })
})
