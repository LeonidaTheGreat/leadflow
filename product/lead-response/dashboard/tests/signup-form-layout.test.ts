/**
 * Test: fix-signup-form-layout-inconsistency
 * Verifies that the signup form uses the same vertical, full-width field layout
 * as the login page — no horizontal (side-by-side) field rendering.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const DASHBOARD = join(__dirname, '..')

function readFile(relPath: string): string {
  return readFileSync(join(DASHBOARD, relPath), 'utf-8')
}

describe('Signup Form Layout — Match Login Field Orientation', () => {
  describe('PaidSignupFlow (app/signup/page.tsx)', () => {
    const signupPage = readFile('app/signup/page.tsx')

    it('uses space-y-2 field wrappers matching login layout', () => {
      // The form should use space-y-2 on each field wrapper (same as login)
      const spaceY2Matches = signupPage.match(/className="space-y-2"/g) || []
      expect(spaceY2Matches.length).toBeGreaterThanOrEqual(4) // email, name, phone, password
    })

    it('does NOT wrap email and password in a shared flex-row container', () => {
      // Fields must NOT be side-by-side — no flex-row wrapping both
      expect(signupPage).not.toMatch(/flex(?:-col)?(?:\s+sm:flex-row)[^}]*email[^}]*password/s)
      expect(signupPage).not.toMatch(/flex(?:-col)?(?:\s+sm:flex-row)[^}]*password[^}]*email/s)
    })

    it('uses text-slate-200 label color matching login', () => {
      // Labels should match login's text-slate-200 (not text-white mb-2 block)
      expect(signupPage).toMatch(/className="text-slate-200"/)
    })

    it('inputs have placeholder color class matching login', () => {
      // Inputs should include placeholder:text-slate-500 (shadcn Input component style)
      const placeholderMatches = signupPage.match(/placeholder[:-](?:text-)?slate-500/g) || []
      expect(placeholderMatches.length).toBeGreaterThanOrEqual(2) // at least email + password
    })
  })

  describe('TrialSignupForm (components/trial-signup-form.tsx)', () => {
    const trialForm = readFile('components/trial-signup-form.tsx')

    it('password label is OUTSIDE the relative div (same structure as login)', () => {
      // The password field should have label BEFORE the relative div wrapper,
      // not inside it. Check that there's a space-y-2 wrapper around label + relative div.
      // Pattern: space-y-2 > label[password] + div.relative > input[password]
      expect(trialForm).toMatch(/space-y-2[\s\S]{0,200}trial-password[\s\S]{0,200}relative/)
    })

    it('password eye-toggle uses top-1/2 -translate-y-1/2 (not top-9)', () => {
      // The fixed position should vertically center in the input, same as login
      expect(trialForm).toMatch(/top-1\/2 -translate-y-1\/2/)
      expect(trialForm).not.toMatch(/top-9/)
    })

    it('uses dark theme card styling matching login', () => {
      // Card should use dark slate background like login
      expect(trialForm).toMatch(/bg-slate-800/)
      // Should NOT be a white background card on dark page
      expect(trialForm).not.toMatch(/bg-white dark:bg-slate-/)
    })

    it('field inputs use dark styling matching login (bg-slate-900, border-slate-600)', () => {
      // Check for both bg-slate-900 and border-slate-600 present in the non-compact form
      const hasBgSlate900 = (trialForm.match(/bg-slate-900/g) || []).length
      const hasBorderSlate600 = (trialForm.match(/border-slate-600/g) || []).length
      expect(hasBgSlate900).toBeGreaterThanOrEqual(2) // email + password + name
      expect(hasBorderSlate600).toBeGreaterThanOrEqual(2) // email + password + name
    })

    it('compact mode: email and password are in flex-col layout (vertical stacking on mobile)', () => {
      // The compact form uses flex-col sm:flex-row — ensure flex-col is the base (mobile-first)
      expect(trialForm).toMatch(/flex-col sm:flex-row/)
    })

    it('non-compact form has no horizontal (flex-row) layout for field inputs', () => {
      // Extract the non-compact return block — everything after the compact return
      const compactReturnIdx = trialForm.indexOf('if (compact)')
      const nonCompactSection = trialForm.slice(compactReturnIdx + 1000) // after compact block
      // Should not have flex-row wrapping fields
      expect(nonCompactSection).not.toMatch(/flex-row/)
    })
  })

  describe('Login page (app/login/page.tsx) — reference baseline', () => {
    const loginPage = readFile('app/login/page.tsx')

    it('uses space-y-2 field wrappers', () => {
      const spaceY2 = loginPage.match(/className="space-y-2"/g) || []
      expect(spaceY2.length).toBeGreaterThanOrEqual(2) // email + password
    })

    it('uses text-slate-200 for labels', () => {
      expect(loginPage).toMatch(/className="text-slate-200"/)
    })

    it('password label is outside the relative input wrapper', () => {
      // Label should come before the relative div
      const passwordSectionIdx = loginPage.indexOf('htmlFor="password"')
      const relativeAfterLabel = loginPage.indexOf('className="relative"', passwordSectionIdx)
      const nextLabel = loginPage.indexOf('htmlFor=', passwordSectionIdx + 1)
      // relative div should come after the label but before the next field
      expect(relativeAfterLabel).toBeGreaterThan(passwordSectionIdx)
      expect(relativeAfterLabel).toBeLessThan(nextLabel)
    })
  })
})
