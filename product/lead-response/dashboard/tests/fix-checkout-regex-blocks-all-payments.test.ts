/**
 * Regression: isValidPriceId regex bug blocks all checkout sessions
 * Task ID: 94c294ac-2671-4f42-bb1f-4681022b6985
 *
 * Bug: /^price_[A-Za-z0-9]{14 }$/ has a space inside the quantifier — treated
 * as a literal character match, so the regex never matches a real price ID.
 * Fix: changed to {14,30} — accepts 14–30 alphanumeric chars after the prefix.
 *
 * Also: STRIPE_PRICE_PROFESSIONAL_MONTHLY → STRIPE_PRICE_PRO_MONTHLY in
 * create-checkout-session/route.ts to match the canonical env var name.
 */

import fs from 'fs'
import path from 'path'
import { describe, it, expect, beforeAll } from '@jest/globals'

// Replicate the fixed implementation to test it directly
function isValidPriceId(id: string | undefined): id is string {
  return typeof id === 'string' && /^price_[A-Za-z0-9]{14,30}$/.test(id)
}

const CHECKOUT_ROUTE_PATH = path.join(
  __dirname,
  '../app/api/billing/create-checkout/route.ts'
)
const CHECKOUT_SESSION_ROUTE_PATH = path.join(
  __dirname,
  '../app/api/billing/create-checkout-session/route.ts'
)

describe('isValidPriceId regex fix', () => {
  it('accepts a 24-char real Stripe price ID (was blocked by {14 } bug)', () => {
    expect(isValidPriceId('price_1QvIEf2eZvKYlo2CkuDLQABG')).toBe(true)
  })

  it('accepts a 15-char real Stripe price ID', () => {
    expect(isValidPriceId('price_1AbCDEFGHIJKLMN')).toBe(true)
  })

  it('accepts a price ID with exactly 14 alphanumeric chars after prefix', () => {
    expect(isValidPriceId('price_1AbCDEFGHIJKLM')).toBe(true)
  })

  it('rejects a price ID with 13 chars after prefix (below minimum)', () => {
    expect(isValidPriceId('price_1AbCDEFGHIJKL')).toBe(false)
  })

  it('rejects a price ID with 31 chars after prefix (above maximum)', () => {
    // 31 chars after price_: 1AbCDEFGHIJKLMNOPQRSTUVWXYZabcd
    expect(isValidPriceId('price_1AbCDEFGHIJKLMNOPQRSTUVWXYZabcd')).toBe(false)
  })

  it('rejects placeholder price_starter_49 (contains underscore)', () => {
    expect(isValidPriceId('price_starter_49')).toBe(false)
  })

  it('rejects placeholder price_pro_149', () => {
    expect(isValidPriceId('price_pro_149')).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isValidPriceId(undefined)).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidPriceId('')).toBe(false)
  })
})

describe('create-checkout/route.ts source', () => {
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(CHECKOUT_ROUTE_PATH, 'utf8')
  })

  it('does not contain the broken {14 } quantifier', () => {
    expect(source).not.toMatch(/\{14 \}/)
  })

  it('contains the fixed {14,30} quantifier', () => {
    expect(source).toContain('{14,30}')
  })
})

describe('create-checkout-session/route.ts env var standardization', () => {
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(CHECKOUT_SESSION_ROUTE_PATH, 'utf8')
  })

  it('uses STRIPE_PRICE_PRO_MONTHLY (not STRIPE_PRICE_PROFESSIONAL_MONTHLY)', () => {
    expect(source).toContain('STRIPE_PRICE_PRO_MONTHLY')
    expect(source).not.toContain('STRIPE_PRICE_PROFESSIONAL_MONTHLY')
  })
})
