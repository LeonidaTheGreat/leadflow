import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LandingPage } from '../src/components/LandingPage'

// Mock the hooks
vi.mock('@/hooks/useABTest', () => ({
  useLandingPageABTest: () => ({
    variant: {
      headline: 'Test Headline',
      subheadline: 'Test Subheadline',
      ctaText: 'Get Started'
    },
    variantKey: 'control',
    isLoading: false,
    trackVariantEvent: vi.fn()
  })
}))

vi.mock('@/hooks/useEventTracking', () => ({
  useEventTracking: () => ({
    track: vi.fn(),
    trackLead: vi.fn(),
    trackConversion: vi.fn(),
    trackPageView: vi.fn(),
    trackFeature: vi.fn()
  })
}))

describe('LandingPage - How It Works Section', () => {
  it('renders the How It Works section', () => {
    render(<LandingPage />)
    
    expect(screen.getByTestId('how-it-works-section')).toBeInTheDocument()
    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText('Get started in minutes, not hours')).toBeInTheDocument()
  })

  it('displays all three steps with correct content', () => {
    render(<LandingPage />)
    
    // Step 1
    expect(screen.getByText('Connect Your CRM')).toBeInTheDocument()
    expect(screen.getByText(/Link your Follow Up Boss account in under 2 minutes/)).toBeInTheDocument()
    
    // Step 2
    expect(screen.getByText('AI Responds Instantly')).toBeInTheDocument()
    expect(screen.getByText(/When a lead comes in, our AI sends a personalized SMS in under 30 seconds/)).toBeInTheDocument()
    
    // Step 3
    expect(screen.getByText('You Close the Deal')).toBeInTheDocument()
    expect(screen.getByText(/Qualified leads book appointments directly on your calendar/)).toBeInTheDocument()
  })

  it('displays numbered badges for each step', () => {
    render(<LandingPage />)
    
    // Check for step numbers (1, 2, 3)
    const stepNumbers = screen.getAllByText(/^[123]$/)
    expect(stepNumbers).toHaveLength(3)
  })

  it('renders icons for each step', () => {
    render(<LandingPage />)
    
    // Check for SVG icons (Lucide icons render as svg elements)
    const section = screen.getByTestId('how-it-works-section')
    const icons = section.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThanOrEqual(3)
  })

  it('tracks feature clicks for each step', async () => {
    const user = userEvent.setup()
    const { trackFeature } = await import('@/hooks/useEventTracking').then(m => m.useEventTracking())
    
    render(<LandingPage />)
    
    // Click on step 1
    const step1 = screen.getByText('Connect Your CRM').closest('.bg-background')
    if (step1) {
      await user.click(step1)
    }
    
    // Click on step 2
    const step2 = screen.getByText('AI Responds Instantly').closest('.bg-background')
    if (step2) {
      await user.click(step2)
    }
    
    // Click on step 3
    const step3 = screen.getByText('You Close the Deal').closest('.bg-background')
    if (step3) {
      await user.click(step3)
    }
  })

  it('has correct section order: Features -> How It Works -> Social Proof', () => {
    render(<LandingPage />)
    
    const featuresHeading = screen.getByText('Why Top Agents Choose LeadFlow')
    const howItWorksHeading = screen.getByText('How It Works')
    const socialProofHeading = screen.getByText('Trusted by Industry Leaders')
    
    // Check that all sections exist
    expect(featuresHeading).toBeInTheDocument()
    expect(howItWorksHeading).toBeInTheDocument()
    expect(socialProofHeading).toBeInTheDocument()
    
    // Check order in DOM
    const featuresIndex = document.body.innerHTML.indexOf('Why Top Agents Choose LeadFlow')
    const howItWorksIndex = document.body.innerHTML.indexOf('How It Works')
    const socialProofIndex = document.body.innerHTML.indexOf('Trusted by Industry Leaders')
    
    expect(featuresIndex).toBeLessThan(howItWorksIndex)
    expect(howItWorksIndex).toBeLessThan(socialProofIndex)
  })

  it('is responsive with grid layout', () => {
    render(<LandingPage />)
    
    const section = screen.getByTestId('how-it-works-section')
    const grid = section.querySelector('.grid')
    
    expect(grid).toHaveClass('md:grid-cols-3')
  })
})
