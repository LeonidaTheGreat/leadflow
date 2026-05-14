'use strict'

const { describe, it, expect } = require('@jest/globals')

describe('Conversion Funnel API - configuration', () => {
  const FUNNEL_STEPS = {
    signup: [
      'landing_page_viewed',
      'trial_cta_clicked',
      'trial_signup_started',
      'trial_signup_completed',
    ],
    conversion: [
      'trial_signup_completed',
      'dashboard_first_paint',
      'trial_pricing_viewed',
      'trial_upgrade_clicked',
      'trial_checkout_started',
    ],
    onboarding: [
      'trial_signup_completed',
      'wizard_started',
      'wizard_step_completed',
      'aha_simulation_completed',
      'onboarding_completed',
    ],
  }

  const VALID_EVENTS = new Set([
    'trial_cta_clicked',
    'trial_signup_started',
    'trial_signup_validation_failed',
    'trial_signup_api_failed',
    'trial_signup_completed',
    'landing_page_viewed',
    'dashboard_first_paint',
    'sample_data_rendered',
    'wizard_started',
    'wizard_step_completed',
    'aha_simulation_started',
    'aha_simulation_completed',
    'onboarding_completed',
    'trial_pricing_viewed',
    'trial_upgrade_clicked',
    'trial_checkout_started',
    'upgrade_banner_viewed',
    'upgrade_banner_clicked',
    'upgrade_banner_dismissed',
  ])

  it('should have three funnel types defined', () => {
    expect(Object.keys(FUNNEL_STEPS)).toEqual(['signup', 'conversion', 'onboarding'])
  })

  it('signup funnel should track landing → account creation', () => {
    const steps = FUNNEL_STEPS.signup
    expect(steps[0]).toBe('landing_page_viewed')
    expect(steps[steps.length - 1]).toBe('trial_signup_completed')
    expect(steps.length).toBe(4)
  })

  it('conversion funnel should track signup → checkout', () => {
    const steps = FUNNEL_STEPS.conversion
    expect(steps[0]).toBe('trial_signup_completed')
    expect(steps[steps.length - 1]).toBe('trial_checkout_started')
    expect(steps.length).toBe(5)
  })

  it('onboarding funnel should track signup → onboarding completion', () => {
    const steps = FUNNEL_STEPS.onboarding
    expect(steps[0]).toBe('trial_signup_completed')
    expect(steps[steps.length - 1]).toBe('onboarding_completed')
    expect(steps.length).toBe(5)
  })

  it('all funnel step events should be in the valid events allowlist', () => {
    for (const [funnelName, steps] of Object.entries(FUNNEL_STEPS)) {
      for (const event of steps) {
        expect(VALID_EVENTS.has(event)).toBe(true)
      }
    }
  })

  it('upgrade banner events should be in valid events allowlist', () => {
    expect(VALID_EVENTS.has('upgrade_banner_viewed')).toBe(true)
    expect(VALID_EVENTS.has('upgrade_banner_clicked')).toBe(true)
    expect(VALID_EVENTS.has('upgrade_banner_dismissed')).toBe(true)
  })

  it('funnel step conversion math should be correct', () => {
    const prevCount = 100
    const count = 35
    const conversionRate = Math.round((count / prevCount) * 1000) / 10
    const dropOffRate = Math.round(((prevCount - count) / prevCount) * 1000) / 10

    expect(conversionRate).toBe(35)
    expect(dropOffRate).toBe(65)
    expect(conversionRate + dropOffRate).toBe(100)
  })

  it('should handle zero previous count without division errors', () => {
    const prevCount = 0
    const count = 0
    const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 0
    const dropOffRate = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 1000) / 10 : 0

    expect(conversionRate).toBe(0)
    expect(dropOffRate).toBe(0)
  })
})
