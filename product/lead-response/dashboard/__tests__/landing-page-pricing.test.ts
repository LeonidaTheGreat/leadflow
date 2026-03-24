/**
 * @jest-environment node
 */

import { renderToString } from 'react-dom/server'
import HomePage from '../app/page'

// Mock the TrialSignupForm component
jest.mock('@/components/trial-signup-form', () => {
  return function MockTrialSignupForm({ compact }: { compact?: boolean }) {
    return React.createElement('div', { 'data-testid': 'trial-signup-form' }, 'Trial Signup Form')
  }
})

import React from 'react'

describe('Landing Page Pricing Section', () => {
  it('should render all 4 pricing tiers including Brokerage', () => {
    const html = renderToString(React.createElement(HomePage))
    
    // Check that all 4 tiers are present
    expect(html).toContain('Starter')
    expect(html).toContain('Pro')
    expect(html).toContain('Team')
    expect(html).toContain('Brokerage')
  })

  it('should render correct prices for all tiers', () => {
    const html = renderToString(React.createElement(HomePage))
    
    // Check that correct prices are displayed
    expect(html).toContain('$49')
    expect(html).toContain('$149')
    expect(html).toContain('$399')
    expect(html).toContain('$999+')
  })

  it('should have Contact Sales CTA for Brokerage tier', () => {
    const html = renderToString(React.createElement(HomePage))
    
    // Brokerage tier should have Contact Sales CTA
    expect(html).toContain('Contact Sales')
  })

  it('should have mailto link for Brokerage tier', () => {
    const html = renderToString(React.createElement(HomePage))
    
    // Brokerage tier should link to sales email
    expect(html).toContain('mailto:sales@leadflow.ai')
  })

  it('should render Brokerage tier features', () => {
    const html = renderToString(React.createElement(HomePage))
    
    // Check that Brokerage features are present
    expect(html).toContain('Unlimited leads')
    expect(html).toContain('Unlimited agents')
    expect(html).toContain('White-label options')
    expect(html).toContain('Admin dashboard')
  })

  it('should have 4 pricing cards in the grid', () => {
    const html = renderToString(React.createElement(HomePage))
    
    // The grid should have lg:grid-cols-4 for 4 tiers
    expect(html).toContain('lg:grid-cols-4')
  })
})
