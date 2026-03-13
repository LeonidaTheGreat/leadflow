# PRD: Fix Trial Signup Redirect — Broken Post-Signup Navigation

**PRD ID:** PRD-FIX-TRIAL-SIGNUP-REDIRECT-001  
**Status:** ready_for_dev  
**Priority:** Critical (P0)  
**Use Case:** fix-trial-signup-redirects-to-nonexistent-onboarding-page  

---

## Problem

After trial signup, users are redirected to `/dashboard/onboarding` — a page that does not exist. This breaks the entire signup funnel: every new trial user hits a 404 immediately after creating their account.

**Root causes (three separate issues):**

1. `product/lead-response/dashboard/app/api/auth/trial-signup/route.ts` (line ~131):  
   `redirectTo: '/dashboard/onboarding'` — this page does not exist.

2. `product/lead-response/dashboard/app/api/auth/pilot-signup/route.ts` (line ~288):  
   Same broken redirect: `redirectTo: '/dashboard/onboarding'`.

3. `product/lead-response/dashboard/app/api/trial/start/route.ts` (line ~162):  
   `redirectTo: '/onboarding'` — this IS in `AUTH_ROUTES` inside `middleware.ts`, which means authenticated users get redirected away from it (infinite loop / blocked).

4. `product/lead-response/dashboard/middleware.ts` (line ~21):  
   `/onboarding` is listed in `AUTH_ROUTES` — routes that block authenticated users.  
   The setup page (`/setup`) is correctly in `PROTECTED_ROUTES` and is the right destination.

**What exists:**
- `/setup` — EXISTS (`app/setup/page.tsx`) and is in `PROTECTED_ROUTES`. This is the correct post-signup destination.
- `/onboarding` — EXISTS as a page but is in `AUTH_ROUTES`, so authenticated users cannot access it. Wrong for post-login redirects.
- `/dashboard/onboarding` — DOES NOT EXIST. 404 page.

---

## Business Impact

**Severity: CRITICAL.** This completely blocks the trial signup funnel. Every new user who signs up hits a 404 page immediately after account creation. No user can complete onboarding. No trials can convert to paid.

---

## Requirements

### R1: Fix `trial-signup/route.ts` redirect
**File:** `product/lead-response/dashboard/app/api/auth/trial-signup/route.ts`  
**Change:** Update `redirectTo: '/dashboard/onboarding'` → `redirectTo: '/setup'`

### R2: Fix `pilot-signup/route.ts` redirect
**File:** `product/lead-response/dashboard/app/api/auth/pilot-signup/route.ts`  
**Change:** Update `redirectTo: '/dashboard/onboarding'` → `redirectTo: '/setup'`  
Also fix the hardcoded URL in the welcome email HTML: `href="https://leadflow-ai-five.vercel.app/dashboard/onboarding"` → `href="https://leadflow-ai-five.vercel.app/setup"`

### R3: Fix `trial/start/route.ts` redirect
**File:** `product/lead-response/dashboard/app/api/trial/start/route.ts`  
**Change:** Update `redirectTo: '/onboarding'` → `redirectTo: '/setup'`

### R4: Remove `/onboarding` from AUTH_ROUTES
**File:** `product/lead-response/dashboard/middleware.ts`  
**Change:** Remove `'/onboarding'` from `AUTH_ROUTES` array.  
**Rationale:** `/setup` is the correct post-signup flow for authenticated users. If `/onboarding` needs to exist as a route, it should not block authenticated users.

---

## Acceptance Criteria

1. **AC-1:** After completing the trial signup form (`/signup` or `POST /api/auth/trial-signup`), the user's browser navigates to `/setup` (HTTP 200, not 404).

2. **AC-2:** After completing the pilot signup form (`POST /api/auth/pilot-signup`), the response JSON contains `redirectTo: '/setup'`.

3. **AC-3:** After calling `POST /api/trial/start`, the response JSON contains `redirectTo: '/setup'`.

4. **AC-4:** The `/setup` page loads without error for a newly authenticated user (has a valid JWT session).

5. **AC-5:** No redirect in the codebase points to `/dashboard/onboarding` (grep check).

6. **AC-6:** The welcome email sent during pilot signup contains a link to `/setup`, not `/dashboard/onboarding`.

7. **AC-7:** Dashboard build passes (`npm run build` in `product/lead-response/dashboard/` exits 0).

---

## Human Test Plan

**Tester: Stojan**

1. Go to `https://leadflow-ai-five.vercel.app/signup`
2. Fill in the trial signup form with a test email, name, password
3. Submit → verify you land on `/setup` (not a 404)
4. Verify `/setup` shows the onboarding wizard/setup flow

**Expected:** Setup page loads. No 404. No redirect loop.

---

## Out of Scope

- Redesigning the `/setup` page or its wizard steps
- Changing what happens after `/setup` is completed
- Moving the `/onboarding` page content to `/setup`

---

## Files to Change

| File | Change |
|------|--------|
| `product/lead-response/dashboard/app/api/auth/trial-signup/route.ts` | `redirectTo: '/dashboard/onboarding'` → `'/setup'` |
| `product/lead-response/dashboard/app/api/auth/pilot-signup/route.ts` | `redirectTo: '/dashboard/onboarding'` → `'/setup'`; fix hardcoded URL in email HTML |
| `product/lead-response/dashboard/app/api/trial/start/route.ts` | `redirectTo: '/onboarding'` → `'/setup'` |
| `product/lead-response/dashboard/middleware.ts` | Remove `'/onboarding'` from `AUTH_ROUTES` |

---

## Notes on Previous Attempts

Three previous tasks (kimi 2026-03-05, sonnet 2026-03-09, codex 2026-03-11) were marked DONE but the bug persists in the current codebase. The dev agent MUST verify the fix is applied to the actual files after editing — do not mark done without confirming the grep shows no remaining `/dashboard/onboarding` redirects.
