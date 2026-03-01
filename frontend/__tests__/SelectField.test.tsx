import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SelectField } from '@/components/forms/SelectField'

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

describe('SelectField', () => {
  const options = [
    { value: "us", label: "United States" },
    { value: "ca", label: "Canada" },
    { value: "uk", label: "United Kingdom" },
  ]

  const schema = z.object({
    country: z.string().min(1, "Please select a country"),
  })

  it('renders with label', () => {
    render(
      <TestForm schema={schema}>
        <SelectField 
          name="country" 
          label="Country" 
          options={options}
        />
      </TestForm>
    )

    expect(screen.getByLabelText("Country")).toBeInTheDocument()
  })

  it('renders all options', () => {
    render(
      <TestForm schema={schema}>
        <SelectField 
          name="country" 
          label="Country" 
          options={options}
        />
      </TestForm>
    )

    const select = screen.getByLabelText("Country")
    expect(select).toHaveTextContent("United States")
    expect(select).toHaveTextContent("Canada")
    expect(select).toHaveTextContent("United Kingdom")
  })

  it('renders with placeholder', () => {
    render(
      <TestForm schema={schema}>
        <SelectField 
          name="country" 
          label="Country" 
          options={options}
          placeholder="Select a country"
        />
      </TestForm>
    )

    expect(screen.getByText("Select a country")).toBeInTheDocument()
  })

  it('allows selecting an option', async () => {
    render(
      <TestForm schema={schema}>
        <SelectField 
          name="country" 
          label="Country" 
          options={options}
        />
      </TestForm>
    )

    const select = screen.getByLabelText("Country")
    await userEvent.selectOptions(select, "ca")

    expect(select).toHaveValue("ca")
  })

  it('displays validation error when required field is empty', async () => {
    render(
      <TestForm schema={schema}>
        <SelectField 
          name="country" 
          label="Country" 
          options={options}
          required
        />
      </TestForm>
    )

    const submitButton = screen.getByText("Submit")
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Please select a country")).toBeInTheDocument()
    })
  })

  it('displays helper text when provided', () => {
    render(
      <TestForm schema={schema}>
        <SelectField 
          name="country" 
          label="Country" 
          options={options}
          helperText="Select your country of residence"
        />
      </TestForm>
    )

    expect(screen.getByText("Select your country of residence")).toBeInTheDocument()
  })

  it('can be disabled', () => {
    render(
      <TestForm schema={schema}>
        <SelectField 
          name="country" 
          label="Country" 
          options={options}
          disabled
        />
      </TestForm>
    )

    expect(screen.getByLabelText("Country")).toBeDisabled()
  })
})
