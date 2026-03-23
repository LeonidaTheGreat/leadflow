# PRD-SIGNUP-AUTH-TOKEN-FIX-001
## Fix Auth Token Gap — Signup → Onboarding Redirect

**PRD ID:** PRD-SIGNUP-AUTH-TOKEN-FIX-001  
**Status:** approved  
**Use Case:** feat-post-signup-dashboard-onboarding-redirect  
**Depends On:** feat-post-login-onboarding-wizard (COMPLETE)  
**Revenue Impact:** high  
**Workflow:** product → dev → qc  

---

## Problem Statement

After a new agent completes trial or pilot signup, the app should redirect them to `/dashboard/onboarding` to begin the guided setup wizard. Instead, the wizard page immediately sends them back to `/login`.

**Root Cause:** Signup APIs set an HTTP-only cookie (`auth-token`) but return only a redirect URL in the JSON body — no `token` or `user` object. The `/dashboard/onboarding` page checks `localStorage.leadflow_user` for authentication state. Because no localStorage data was written by the signup form, the page detects an unauthenticated state and redirects to `/login`.

---

## Objective

Eliminate the auth gap between signup completion and the first page of the onboarding wizard so that every new agent sees the wizard without being bounced to `/login`.

---

## Scope

### In Scope
1. Signup APIs return `token` + `user` in the JSON response body (in addition to setting the HTTP-only cookie)
2. Signup forms store `token` and `user` in `localStorage` before calling `router.push(redirectTo)`
3. New `/api/auth/me` endpoint: reads the HTTP-only `auth-token` cookie, returns the authenticated user object
4. `/dashboard/onboarding` page: falls back to `GET /api/auth/me` when `localStorage.leadflow_user` is missing
5. All three signup routes redirect to `/dashboard/onboarding` on success
6. All signup routes: redirectTo value is `/dashboard/onboarding`

### Out of Scope
- Changes to the onboarding wizard content or steps (covered by feat-post-login-onboarding-wizard)
- Changes to login flow
- Anything beyond the auth handoff between signup and wizard

---

## User Stories

1. **As a new agent who just signed up for a trial**, I land on the `/dashboard/onboarding` wizard immediately, without being redirected to `/login`.
2. **As a new pilot agent**, after signup I am redirected to `/dashboard/onboarding` and the wizard renders correctly.
3. **As a user whose localStorage was cleared** (e.g., incognito tab, SSR), I can still access `/dashboard/onboarding` as long as my `auth-token` cookie is valid — the page fetches my identity from `/api/auth/me`.
4. **As an unauthenticated visitor** who navigates directly to `/dashboard/onboarding`, I am correctly redirected to `/login`.

---

## Functional Requirements

### FR-1: Signup API Response Includes Token + User
- `POST /api/auth/trial-signup` response body must include:
  ```json
  {
    "success": true,
    "redirectTo": "/dashboard/onboarding",
    "token": "<jwt-or-session-token>",
    "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "onboardingCompleted": false }
  }
  ```
- `POST /api/auth/pilot-signup` response body must include the same fields
- `POST /api/trial/start` response body must include the same fields
- The HTTP-only cookie is STILL set (not removed) — the cookie supports server-side auth; the token is for client-side localStorage

### FR-2: Signup Forms Store Auth in localStorage
- `TrialSignupForm` (and pilot signup form): after receiving a successful response, store to localStorage:
  - `localStorage.setItem('leadflow_token', response.token)`
  - `localStorage.setItem('leadflow_user', JSON.stringify(response.user))`
- Storage must happen BEFORE `router.push(redirectTo)` is called

### FR-3: /api/auth/me Endpoint
- New `GET /api/auth/me` route
- Reads the `auth-token` HTTP-only cookie from the request
- Validates the token against Supabase / auth store
- Returns `200 { id, email, firstName, lastName, onboardingCompleted }` on valid cookie
- Returns `401 { error: "Unauthorized" }` on missing or invalid cookie

### FR-4: /dashboard/onboarding Page Auth Fallback
- On page load, if `localStorage.leadflow_user` is absent or null:
  - Call `GET /api/auth/me`
  - If 200: populate `localStorage.leadflow_token` and `localStorage.leadflow_user` from response, render wizard
  - If 401: redirect to `/login`
- If `localStorage.leadflow_user` is present: render wizard immediately (existing behavior preserved)

### FR-5: Signup Routes Redirect to /dashboard/onboarding
- `trial-signup/route.ts` returns `redirectTo: "/dashboard/onboarding"` (not `/setup`)
- `pilot-signup/route.ts` returns `redirectTo: "/dashboard/onboarding"` (not `/setup`)
- `trial/start/route.ts` returns `redirectTo: "/dashboard/onboarding"` (not `/setup`)
- Welcome email links point to `/dashboard/onboarding`

---

## Non-Functional Requirements

- `/api/auth/me` must respond in under 200ms (cached lookup preferred)
- No security regression: the HTTP-only cookie must remain HTTP-only (not replaced by a script-accessible cookie)
- Mobile responsive — no changes to wizard layout, but the auth flow must not break on mobile
- No breaking changes to existing login flow

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | `trial-signup/route.ts` returns `redirectTo: "/dashboard/onboarding"` |
| AC-2 | `pilot-signup/route.ts` returns `redirectTo: "/dashboard/onboarding"` |
| AC-3 | `trial/start/route.ts` returns `redirectTo: "/dashboard/onboarding"` |
| AC-4 | Both `trial-signup` and `pilot-signup` return `token` and `user` object in JSON response body |
| AC-5 | `TrialSignupForm` stores `token` and `user` in `localStorage` before navigation |
| AC-6 | `GET /api/auth/me` returns `{ id, email, firstName, lastName, onboardingCompleted }` with a valid `auth-token` cookie |
| AC-7 | `GET /api/auth/me` returns `401 { error: "Unauthorized" }` without a valid cookie |
| AC-8 | `/dashboard/onboarding` page calls `/api/auth/me` when `localStorage.leadflow_user` is absent and populates localStorage on 200 |
| AC-9 | After successful trial signup, user lands on `/dashboard/onboarding` and wizard renders WITHOUT redirect to `/login` |
| AC-10 | After successful pilot signup, user lands on `/dashboard/onboarding` and wizard renders WITHOUT redirect to `/login` |
| AC-11 | Unauthenticated user navigating directly to `/dashboard/onboarding` (no cookie, no localStorage) is redirected to `/login` |
| AC-12 | Welcome email links point to `/dashboard/onboarding` (not `/setup`) |
| AC-13 | Existing `tests/fix-trial-signup-route-ts-still-redirects-to-dashboard.test.js` updated to assert `/dashboard/onboarding` (not `/setup`) |
| AC-14 | `npm run build` in `product/lead-response/dashboard` exits with code 0 |

---

## E2E Test Specs

| Test ID | Scenario | Pass Condition |
|---------|----------|----------------|
| TC-SIGNUP-AUTH-001 | Trial signup → wizard renders | `POST /api/auth/trial-signup` returns `token` + `user`; localStorage set; `/dashboard/onboarding` wizard mounts |
| TC-SIGNUP-AUTH-002 | Pilot signup → wizard renders | `POST /api/auth/pilot-signup` returns `token` + `user`; wizard mounts without redirect to `/login` |
| TC-SIGNUP-AUTH-003 | `/api/auth/me` with valid cookie | Returns `200` + user object |
| TC-SIGNUP-AUTH-004 | Onboarding page fallback via `/api/auth/me` | Empty localStorage + valid cookie → page calls `/api/auth/me`, wizard renders |
| TC-SIGNUP-AUTH-005 | Unauthenticated access blocked | No localStorage + no cookie → redirect to `/login` |

Test file: `product/lead-response/dashboard/tests/signup-auth-token.test.ts`

---

## Files Affected

| File | Change |
|------|--------|
| `app/api/auth/trial-signup/route.ts` | Add `token` + `user` to response body; change `redirectTo` to `/dashboard/onboarding` |
| `app/api/auth/pilot-signup/route.ts` | Add `token` + `user` to response body; change `redirectTo` to `/dashboard/onboarding` |
| `app/api/trial/start/route.ts` | Change `redirectTo` to `/dashboard/onboarding`; add `token` + `user` to response |
| `app/api/auth/me/route.ts` | **New file** — `/api/auth/me` endpoint |
| `app/dashboard/onboarding/page.tsx` | Add fallback: call `/api/auth/me` when localStorage absent |
| `components/TrialSignupForm.tsx` (or equivalent) | Store `token` + `user` in localStorage before `router.push` |
| `tests/fix-trial-signup-route-ts-still-redirects-to-dashboard.test.js` | Update assertion to expect `/dashboard/onboarding` |
| Welcome email template | Update link from `/setup` to `/dashboard/onboarding` |

---

## Definition of Done

1. All 14 acceptance criteria pass
2. All 5 E2E test cases pass
3. `npm run build` exits 0
4. No console errors on `/dashboard/onboarding` after signup redirect
5. QC agent has validated the full flow manually on the deployed Vercel instance

---

## Risks

| Risk | Mitigation |
|------|------------|
| HTTP-only cookie not readable by JS (by design) | `/api/auth/me` is a server-side endpoint — cookie is readable server-side; no security regression |
| localStorage cleared between signup and wizard (e.g., SSR hydration) | FR-4 fallback to `/api/auth/me` handles this case |
| Token expiry between signup and wizard render | Wizard should re-validate; if token expired, redirect to `/login` with friendly message |
| Stale tests asserting `/setup` redirects | AC-13 explicitly covers updating the test |
