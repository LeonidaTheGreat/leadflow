import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import FormField from '@/app/onboarding/components/form-field'
import FormInput from '@/app/onboarding/components/form-input'
import FormPasswordInput from '@/app/onboarding/components/form-password'
import FormSelect from '@/app/onboarding/components/form-select'

// ─── FormField ────────────────────────────────────────────────────────────────

describe('FormField', () => {
  it('renders the label text', () => {
    render(<FormField label="Email Address"><input /></FormField>)
    expect(screen.getByText('Email Address')).toBeInTheDocument()
  })

  it('links label to input via htmlFor', () => {
    render(
      <FormField label="Email Address" htmlFor="email-input">
        <input id="email-input" />
      </FormField>
    )
    const label = screen.getByText('Email Address')
    expect(label).toHaveAttribute('for', 'email-input')
  })

  it('shows (optional) badge when optional=true', () => {
    render(<FormField label="Cal.com Link" optional><input /></FormField>)
    expect(screen.getByText('(optional)')).toBeInTheDocument()
  })

  it('does not show (optional) badge when optional=false', () => {
    render(<FormField label="Email"><input /></FormField>)
    expect(screen.queryByText('(optional)')).not.toBeInTheDocument()
  })

  it('renders hint text when hint is provided', () => {
    render(
      <FormField label="Phone" hint="Enter 10-digit number"><input /></FormField>
    )
    expect(screen.getByText('Enter 10-digit number')).toBeInTheDocument()
  })

  it('hides hint when an error is present', () => {
    render(
      <FormField label="Phone" hint="Enter 10-digit number" error="Phone is required">
        <input />
      </FormField>
    )
    expect(screen.queryByText('Enter 10-digit number')).not.toBeInTheDocument()
  })

  it('renders error message with alert role', () => {
    render(
      <FormField label="Email" error="Email is required"><input /></FormField>
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Email is required')
  })

  it('does not render error element when error is undefined', () => {
    render(<FormField label="Email"><input /></FormField>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <FormField label="Name">
        <input data-testid="child-input" />
      </FormField>
    )
    expect(screen.getByTestId('child-input')).toBeInTheDocument()
  })
})

// ─── FormInput ────────────────────────────────────────────────────────────────

describe('FormInput', () => {
  it('renders an input element', () => {
    render(<FormInput />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders placeholder text', () => {
    render(<FormInput placeholder="you@example.com" />)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
  })

  it('applies error border class when hasError=true', () => {
    render(<FormInput hasError data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveClass('border-red-500/50')
  })

  it('applies normal border class when hasError=false', () => {
    render(<FormInput hasError={false} data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveClass('border-slate-600/50')
  })

  it('renders icon slot when icon is provided', () => {
    render(<FormInput icon={<span data-testid="icon">@</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('does not render icon slot when icon is absent', () => {
    render(<FormInput data-testid="no-icon-input" />)
    // No icon span should be in the DOM
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })

  it('fires onChange when user types', () => {
    const handleChange = jest.fn()
    render(<FormInput onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('forwards ref to the underlying input', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<FormInput ref={ref} />)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('INPUT')
  })
})

// ─── FormPasswordInput ────────────────────────────────────────────────────────

describe('FormPasswordInput', () => {
  it('renders type="password" by default', () => {
    render(<FormPasswordInput data-testid="pwd" />)
    expect(screen.getByTestId('pwd')).toHaveAttribute('type', 'password')
  })

  it('toggles to type="text" when show-password button is clicked', () => {
    render(<FormPasswordInput data-testid="pwd" />)
    fireEvent.click(screen.getByLabelText('Show password'))
    expect(screen.getByTestId('pwd')).toHaveAttribute('type', 'text')
  })

  it('toggles back to type="password" on second click', () => {
    render(<FormPasswordInput data-testid="pwd" />)
    fireEvent.click(screen.getByLabelText('Show password'))
    fireEvent.click(screen.getByLabelText('Hide password'))
    expect(screen.getByTestId('pwd')).toHaveAttribute('type', 'password')
  })

  it('aria-label reads "Show password" initially', () => {
    render(<FormPasswordInput />)
    expect(screen.getByLabelText('Show password')).toBeInTheDocument()
  })

  it('aria-label changes to "Hide password" after toggle', () => {
    render(<FormPasswordInput />)
    fireEvent.click(screen.getByLabelText('Show password'))
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument()
  })

  it('applies error border class when hasError=true', () => {
    render(<FormPasswordInput hasError data-testid="pwd" />)
    expect(screen.getByTestId('pwd')).toHaveClass('border-red-500/50')
  })

  it('applies normal border class when hasError=false', () => {
    render(<FormPasswordInput hasError={false} data-testid="pwd" />)
    expect(screen.getByTestId('pwd')).toHaveClass('border-slate-600/50')
  })

  it('forwards ref to the underlying input', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<FormPasswordInput ref={ref} />)
    expect(ref.current?.tagName).toBe('INPUT')
  })
})

// ─── FormSelect ───────────────────────────────────────────────────────────────

const STATE_OPTIONS = [
  { value: 'CA', label: 'California' },
  { value: 'TX', label: 'Texas' },
  { value: 'NY', label: 'New York' },
]

describe('FormSelect', () => {
  it('renders a select element', () => {
    render(<FormSelect options={STATE_OPTIONS} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders all provided options', () => {
    render(<FormSelect options={STATE_OPTIONS} />)
    expect(screen.getByRole('option', { name: 'California' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Texas' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'New York' })).toBeInTheDocument()
  })

  it('renders placeholder option when placeholder is provided', () => {
    render(<FormSelect options={STATE_OPTIONS} placeholder="Select a state..." />)
    expect(screen.getByRole('option', { name: 'Select a state...' })).toBeInTheDocument()
  })

  it('does not render placeholder option when placeholder is absent', () => {
    render(<FormSelect options={STATE_OPTIONS} />)
    // There should only be the 3 real options
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('renders icon slot when icon is provided', () => {
    render(
      <FormSelect
        options={STATE_OPTIONS}
        icon={<span data-testid="select-icon">📍</span>}
      />
    )
    expect(screen.getByTestId('select-icon')).toBeInTheDocument()
  })

  it('applies error border class when hasError=true', () => {
    render(<FormSelect options={STATE_OPTIONS} hasError data-testid="sel" />)
    expect(screen.getByTestId('sel')).toHaveClass('border-red-500/50')
  })

  it('applies normal border class when hasError=false', () => {
    render(<FormSelect options={STATE_OPTIONS} hasError={false} data-testid="sel" />)
    expect(screen.getByTestId('sel')).toHaveClass('border-slate-600/50')
  })

  it('fires onChange when selection changes', () => {
    const handleChange = jest.fn()
    render(<FormSelect options={STATE_OPTIONS} onChange={handleChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'TX' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })
})
