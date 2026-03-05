# Journey Review: New Agent Signup
**Date:** March 5, 2026  
**Reviewer:** Product Manager  
**Verdict:** ❌ FAIL (Readiness: 35/100)  
**Recommendation:** DO NOT PROCEED with pilot recruitment until critical bug is fixed.

---

## Executive Summary

The new agent signup journey is **non-functional**. The 5-step onboarding wizard collects user information successfully, but the backend endpoint (`/api/agents/onboard`) fails with a 500 error when the final "Get Started!" button is clicked. As a result, no user account is created in Supabase Auth, and the entire signup flow breaks.

**Impact:** Cannot onboard any new pilot agents until this is fixed.

---

## Test Results

| Step | Title | Status | Notes |
|------|-------|--------|-------|
| 1 | Find and click signup CTA | ✅ Partial | CTA works but leads to /onboarding instead of /signup. Actual UX is better. |
| 2 | Complete signup form | ❌ FAIL | 500 error on `/api/agents/onboard`. Account not created. |
| 3 | Log in with credentials | ❌ FAIL | Account doesn't exist. "Invalid email or password" error. |
| 4 | Navigate to dashboard | ✅ PASS | Auth middleware correctly redirects to /login. |
| 5 | Connect FUB integration | ⏸️ BLOCKED | Can't test without authenticated account. |
| 6 | Select billing plan | ⏸️ BLOCKED | Can't test without authenticated account. |

**Pass Rate:** 2/6 = 33%

---

## Critical Issues

### 🚨 [CRITICAL] Onboarding Endpoint Returns 500 Error
**Severity:** CRITICAL  
**Impact:** Complete signup flow failure

- **Endpoint:** `POST /api/agents/onboard`
- **Status Code:** 500 Internal Server Error
- **Error Message:** "Failed to complete onboarding"
- **Browser Console:** "Failed to load resource: the server responded with a status of 500 ()"

**What happened:**
1. User completes 5-step onboarding form with valid email, password, name, phone, state
2. Clicks "Get Started!" on final step
3. Backend receives the request but fails to process it
4. No account is created in Supabase Auth
5. UI shows no error — button appears to do nothing

**Root Cause:** Unknown (requires dev investigation)
- Likely: Database constraint violation, missing required field, or authentication issue

---

## Secondary Issues

### Phone Number Validation Too Strict
**Severity:** MEDIUM  
**Impact:** User friction during signup

- **Problem:** Step 2 only accepts 10-digit phone numbers with no formatting
- **Example:** `(555) 987-6543` fails; must enter `5559876543`
- **User Impact:** Non-technical real estate agents will struggle and may abandon signup

**Recommendation:** Accept multiple phone formats on frontend, normalize on backend.

### No Error Feedback on Signup Failure
**Severity:** LOW  
**Impact:** Poor user experience

- **Problem:** When the onboarding API fails, no error message is shown to the user
- **Current behavior:** Button click appears to do nothing; page stays on Step 5
- **User Impact:** Confusion about what went wrong

**Recommendation:** Show error toast with message like "Account creation failed. Please try again or contact support."

---

## Positive Findings

✅ **Auth Middleware Works Correctly**
- Protected routes (/dashboard, /integrations, /settings) correctly redirect to /login
- Redirect parameter preserves intended destination
- Unauthenticated access is properly blocked

✅ **Landing Page CTAs Are Clear**
- "Get Started" button in nav and hero section
- Value proposition is compelling
- Links work correctly

✅ **Onboarding UI Is Actually Better Than Spec**
- Expected: Simple signup form → login page
- Actual: 5-step guided wizard with profile collection, integrations, SMS config
- This is better UX (more incremental, collects important data upfront)
- Minor: Spec says /signup but actual path is /onboarding (acceptable change)

---

## Related Findings

### Missing Pages
- `/terms` returns 404
- `/privacy` returns 404

Both are referenced in Terms of Service agreement but don't exist. Not critical for signup but should be added.

---

## What's Blocking Pilot

The pilot agents cannot complete onboarding because:
1. Signup form submission fails
2. No account is created
3. Cannot access dashboard
4. Cannot connect integrations
5. Cannot select billing plan

**All 3 pilot agents are stuck at Step 5 of onboarding.**

---

## Next Steps (Dev)

1. **Investigate `/api/agents/onboard` endpoint**
   - Check server logs for the 500 error details
   - Verify all required fields are being passed
   - Check database constraints on agents/auth tables
   - Ensure Supabase Auth is properly configured

2. **Add error handling**
   - Return 4xx or 5xx with descriptive error message
   - Show error toast on frontend with actionable message

3. **Improve phone validation**
   - Accept multiple formats: (555) 123-4567, 555-123-4567, 5551234567
   - Normalize to E.164 format on backend

4. **Create Terms & Privacy pages**
   - Add `/terms` and `/privacy` routes
   - Link from signup flow

---

## Files Updated

- **product_reviews table:** `id = 991915a2-507d-45fc-8b40-feebc6bd0a4f`
  - Status: completed
  - Verdict: fail
  - Readiness Score: 35

- **product_feedback table:** Bug report created
  - Type: bug
  - Severity: critical
  - Orchestrator will create dev task on next heartbeat

- **completion-reports:** 
  - `COMPLETION-db6def4c-ea3e-46f8-ae88-750509ac40aa-2026-03-05T16-08-59-024Z.json`

---

## Verdict: FAIL ❌

**Status:** Product is not ready for pilot.  
**Readiness Score:** 35/100  
**Recommendation:** Fix onboarding endpoint before proceeding.

**Decision:** I recommend Stojan pause pilot recruitment until the dev team fixes the onboarding endpoint. The UI is polished and the auth middleware works, but if users can't create accounts, nothing else matters.
