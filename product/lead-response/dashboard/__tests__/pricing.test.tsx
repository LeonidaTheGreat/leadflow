import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HomePage from '../app/page'
import PricingPage from '../app/pricing/page'

// Mock next/link
jest.mock('next/link', () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

describe('Landing Page Pricing Section', () => {
  it('renders pricing section with correct heading', () => {
    render(<HomePage />)
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument()
  })

  it('displays all 4 pricing tiers', () => {
    render(<HomePage />)
    expect(screen.getByText('Starter')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Brokerage')).toBeInTheDocument()
  })

  it('shows correct prices from PMF.md', () => {
    render(<HomePage />)
    expect(screen.getByText('$49')).toBeInTheDocument()
    expect(screen.getByText('$149')).toBeInTheDocument()
    expect(screen.getByText('$399')).toBeInTheDocument()
    expect(screen.getByText('$999+')).toBeInTheDocument()
  })

  it('does not show old incorrect prices', () => {
    render(<HomePage />)
    expect(screen.queryByText('$497')).not.toBeInTheDocument()
    expect(screen.queryByText('$997')).not.toBeInTheDocument()
    expect(screen.queryByText('$1997')).not.toBeInTheDocument()
  })

  it('highlights Pro tier as Most Popular', () => {
    render(<HomePage />)
    const popularBadges = screen.getAllByText('Most Popular')
    expect(popularBadges.length).toBeGreaterThan(0)
  })

  it('shows pilot signup note', () => {
    render(<HomePage />)
    expect(screen.getByText(/Currently offering free pilots/i)).toBeInTheDocument()
    expect(screen.getByText('Join the pilot')).toBeInTheDocument()
  })

  it('has correct CTA links for each tier', () => {
    render(<HomePage />)
    // Check for specific tier CTAs
    expect(screen.getByRole('link', { name: /Start Free Trial/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Contact Sales/i })).toBeInTheDocument()
    // Get Started appears multiple times (header + pricing cards), so check for at least one
    expect(screen.getAllByRole('link', { name: /Get Started/i }).length).toBeGreaterThan(0)
  })

  it('has link to full pricing page', () => {
    render(<HomePage />)
    expect(screen.getByText('View full feature comparison')).toBeInTheDocument()
  })
})

describe('Pricing Page', () => {
  it('renders with correct title', () => {
    render(<PricingPage />)
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument()
  })

  it('displays all 4 pricing tiers', () => {
    render(<PricingPage />)
    expect(screen.getAllByText('Starter').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Team').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Brokerage').length).toBeGreaterThan(0)
  })

  it('shows correct prices from PMF.md', () => {
    render(<PricingPage />)
    // Check for prices - they appear in multiple places
    const prices = screen.getAllByText(/\$49/)
    expect(prices.length).toBeGreaterThan(0)
    
    const proPrices = screen.getAllByText(/\$149/)
    expect(proPrices.length).toBeGreaterThan(0)
  })

  it('does not show old incorrect prices', () => {
    render(<PricingPage />)
    expect(screen.queryByText('$497')).not.toBeInTheDocument()
    expect(screen.queryByText('$997')).not.toBeInTheDocument()
    expect(screen.queryByText('$1997')).not.toBeInTheDocument()
  })

  it('has monthly/annual billing toggle', () => {
    render(<PricingPage />)
    expect(screen.getByRole('button', { name: /Monthly/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Annual/i })).toBeInTheDocument()
  })

  it('displays feature comparison table', () => {
    render(<PricingPage />)
    expect(screen.getByText('Feature Comparison')).toBeInTheDocument()
    
    // Check for key features in the table
    expect(screen.getAllByText('SMS responses').length).toBeGreaterThan(0)
    expect(screen.getAllByText('AI quality').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Follow Up Boss integration').length).toBeGreaterThan(0)
  })

  it('shows correct feature matrix values', () => {
    render(<PricingPage />)
    
    // Check for specific feature values
    expect(screen.getByText('100/mo')).toBeInTheDocument() // Starter SMS
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThan(0) // Pro/Team/Brokerage SMS
    // "Basic" appears multiple times (AI quality + Analytics), so use getAllByText
    expect(screen.getAllByText('Basic').length).toBeGreaterThan(0) // Starter AI/Analytics
    expect(screen.getAllByText('Full AI (Claude)').length).toBeGreaterThan(0) // Pro/Team AI
  })

  it('has FAQ section', () => {
    render(<PricingPage />)
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()
    expect(screen.getByText(/Can I change plans anytime/i)).toBeInTheDocument()
  })

  it('Brokerage tier has contact sales CTA', () => {
    render(<PricingPage />)
    const contactSalesLinks = screen.getAllByText('Contact Sales')
    expect(contactSalesLinks.length).toBeGreaterThan(0)
  })
})
