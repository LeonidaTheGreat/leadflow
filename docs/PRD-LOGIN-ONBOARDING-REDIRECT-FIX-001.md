# PRD-LOGIN-ONBOARDING-REDIRECT-FIX-001
## Fix: Login Page Redirect for Un-Onboarded Users

**Status:** approved  
**Priority:** Medium  
**Created:** 2026-03-13  
**Related Use Case:** feat-post-signup-dashboard-onboarding-redirect  
**Related Task:** b2c932c2-c953-41cc-8b1a-4bdc93bb3b29

---

## Problem

When a registered but un-onboarded user logs in, `login/page.tsx` still redirects them to `/setup` (the old, deprecated setup wizard route) instead of `/dashboard/onboarding` (the current onboarding wizard).

**File:** `product/lead-response/dashboard/app/login/page.tsx`  
**Line:** ~92  
**Current code:** `router.push('/setup')`  
**Expected code:** `router.push('/dashboard/onboarding')`

Previous tasks fixed signup flows (pilot-signup, trial-signup, trial/start) to redirect to `/dashboard/onboarding`, but overlooked the login page — creating an inconsistent experience for agents who registered but did not complete onboarding and later return to log in.

---

## Background

The onboarding wizard was migrated from `/setup` to `/dashboard/onboarding` as part of the post-signup dashboard onboarding initiative. All signup paths were updated to use the new path, but the login redirect was missed.

The `/setup` route may still exist as a legacy page but is not the canonical onboarding entry point. New agents must land on `/dashboard/onboarding` to get the correct 4-step wizard experience (FUB → SMS → Verify → Simulator).

---

## Scope

**In Scope:**
- Update `login/page.tsx` to redirect un-onboarded users to `/dashboard/onboarding` instead of `/setup`

**Out of Scope:**
- Changes to signup flows (already fixed)
- Changes to the onboarding wizard itself
- Removal of `/setup` legacy route (separate decision)

---

## User Story

> As a registered real estate agent who hasn't completed onboarding,  
> when I log into LeadFlow,  
> I want to be taken directly to the onboarding wizard at `/dashboard/onboarding`  
> so I can complete my setup and start using the product.

---

## Acceptance Criteria

1. **Login redirect for un-onboarded users** — When `result.user?.onboardingCompleted === false` after login, `router.push('/dashboard/onboarding')` is called (not `/setup`)
2. **Login redirect for onboarded users unchanged** — When `onboardingCompleted === true` (or truthy), the user is still redirected to `/dashboard`
3. **Comment updated** — The code comment on line ~90 reads "Redirect new agents (onboarding not complete) to the onboarding wizard" (not "setup wizard")
4. **No regression on /setup** — Agents who navigate directly to `/setup` are either redirected to `/dashboard/onboarding` or see a deprecated/redirect page (acceptable either way — not in scope of this fix)

---

## Implementation Notes

**Single-line fix:**

```typescript
// In product/lead-response/dashboard/app/login/page.tsx, line ~92:
// BEFORE:
router.push('/setup')

// AFTER:
router.push('/dashboard/onboarding')
```

Also update the comment on line ~90:
```typescript
// BEFORE:
// Redirect new agents (onboarding not complete) to the setup wizard

// AFTER:
// Redirect new agents (onboarding not complete) to the onboarding wizard
```

---

## E2E Test Scenarios

### Test 1: Un-onboarded user login redirects to /dashboard/onboarding
1. Create/use an agent account where `onboarding_completed = false`
2. Navigate to `/login`
3. Enter valid credentials and submit
4. **Expected:** Browser navigates to `/dashboard/onboarding`
5. **Expected:** Onboarding wizard renders (not a 404 or /setup page)

### Test 2: Onboarded user login is unaffected
1. Create/use an agent account where `onboarding_completed = true`
2. Navigate to `/login`
3. Enter valid credentials and submit
4. **Expected:** Browser navigates to `/dashboard`
5. **Expected:** Main dashboard renders correctly

### Test 3: No regression on signup flows
1. Complete a pilot or trial signup
2. **Expected:** Still redirects to `/dashboard/onboarding` (unchanged from previous fix)

---

## Definition of Done

- [ ] `login/page.tsx` line ~92 changed from `/setup` to `/dashboard/onboarding`
- [ ] Code comment updated
- [ ] All three E2E test scenarios pass manually
- [ ] `npm test` passes (no regressions)
- [ ] Change committed and deployed to Vercel
