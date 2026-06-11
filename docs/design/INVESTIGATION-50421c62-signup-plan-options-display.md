# Investigation: Signup Page — Choose Your Plan shows no plan options

**Task ID:** 50421c62-98a1-4952-95ae-c3cbc15b6be4  
**UC:** fix-signup-page-shows-choose-your-plan  
**Date:** 2026-06-10

## Conclusion

**Bug is resolved. This UC is a re-detection of `fix-signup-plan-options-not-displayed` (marked complete).**

## Evidence

### 1. Signup page has hardcoded PLANS array
`product/lead-response/dashboard/app/signup/page.tsx` (lines 35–75) defines:

```tsx
const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 49, features: [...] },
  { id: 'pro',     name: 'Pro',     price: 149, popular: true, features: [...] },
  { id: 'team',    name: 'Team',    price: 399, features: [...] }
]
```

No env var dependency. Plans always render regardless of environment configuration.

### 2. All 14 signup plan display tests pass
`product/lead-response/dashboard/tests/signup-plans-display.test.ts` — 14/14 PASS

### 3. Dashboard build is clean
`npm run build` in `product/lead-response/dashboard/` exits 0 with no errors. The `/signup` route compiles correctly as a static page.

### 4. Rendering logic is correct
`PaidSignupFlow` (the component that renders when `?mode` is not `trial`) starts with `step = 'select-plan'`, and the grid of plan cards is gated on `step === 'select-plan'`. Both the "Choose Your Plan" heading and the plan cards are in the same conditional block — they cannot appear independently.

## Root Cause of Original Bug (Resolved)

The original `fix-signup-plan-options-not-displayed` UC (fixed in an earlier sprint) was caused by the PLANS array being conditionally populated from environment variables that were missing in Vercel. The fix (PR #37) hardcoded the array in the component — no env var dependency remains.

## Why This UC Was Re-Opened

- Previous investigation task `be836b39` reached the same conclusion but its PR #1778 was closed as a safety net cleanup.
- The UC was never marked complete after that PR closure, leaving it stuck `in_progress`.
- This task (`50421c62`) re-confirms: no code changes are needed.

## Verification Commands

```bash
# All plan display tests pass
cd product/lead-response/dashboard && npm test tests/signup-plans-display.test.ts
# → 14/14 PASS

# Build is clean
cd product/lead-response/dashboard && npm run build
# → exit 0, no errors

# Plans hardcoded (no env var refs for plans)
grep -n "PLANS\|env.*plan\|plan.*env" product/lead-response/dashboard/app/signup/page.tsx
# → const PLANS: Plan[] = [...] — no env refs
```
