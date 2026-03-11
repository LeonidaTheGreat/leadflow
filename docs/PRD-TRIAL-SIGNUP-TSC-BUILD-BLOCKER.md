# PRD — Fix TypeScript Build Blocker in Trial Signup Route

- **PRD ID:** PRD-TRIAL-SIGNUP-TSC-BUILD-BLOCKER
- **Project:** leadflow
- **Owner:** Product Manager
- **Status:** approved
- **Date:** 2026-03-11
- **Related Use Case:** `fix-production-build-fails-typescript-error-in-trial-s`
- **Severity:** critical

## 1) Problem
Production builds for the dashboard are failing with TypeScript error TS2339 in `app/api/auth/trial-signup/route.ts` (`Property 'catch' does not exist on type 'PromiseLike<void>'`).

This blocks all Vercel deployments, including unrelated bug fixes (notably `/api/lead-capture`).

## 2) Goal
Restore deployability by eliminating the TS2339 error in the trial signup analytics write path while preserving current signup behavior.

## 3) Scope
### In scope
- Refactor the non-blocking analytics insert flow in trial-signup route so the expression type is compatible with TypeScript strict build.
- Keep analytics write non-blocking (signup success path must not depend on analytics insert success).
- Ensure failed analytics insert is logged safely without throwing into response path.
- Validate with `tsc --noEmit` and production build.

### Out of scope
- Changes to analytics schema.
- Changes to signup UX content.
- Broader route rewrites unrelated to the TypeScript blocker.

## 4) User Story
As a LeadFlow operator, I need production builds to succeed so critical fixes can be deployed quickly and trial signups continue to work.

## 5) Functional Requirements
1. The trial-signup route must compile without TS2339 at the known failing line.
2. Analytics insert for signup event must execute asynchronously in fire-and-forget mode.
3. Analytics insert failures must be handled with safe logging and must not change API success response.
4. Existing trial-signup success and error responses must remain unchanged.
5. The route must pass typecheck and Next.js production build.

## 6) Non-Functional Requirements
- **Reliability:** Build must pass in CI/Vercel.
- **Performance:** No added latency to trial-signup success response.
- **Safety:** No unhandled promise rejection in server logs.

## 7) Acceptance Criteria
1. Running `tsc --noEmit` in `product/lead-response/dashboard` returns exit code 0 for this file and no TS2339 in trial-signup route.
2. Running `npm run build` in `product/lead-response/dashboard` succeeds.
3. POST to `/api/auth/trial-signup` with valid payload returns same success contract as before.
4. If analytics insert fails (simulated DB error), endpoint still returns successful signup response and logs the analytics failure.
5. Regression check: `/api/lead-capture` can be included in a successful production deploy after this fix.

## 8) E2E Test Specs (for QC)
- **E2E-BUILD-TRIAL-001:** Typecheck gate — verify TS2339 is absent.
- **E2E-BUILD-TRIAL-002:** Build gate — verify Next.js production build succeeds.
- **E2E-TRIAL-SIGNUP-003:** Trial signup happy path returns success.
- **E2E-TRIAL-SIGNUP-004:** Analytics insert failure is non-blocking and logged.

## 9) Priority & Decision
- **Decision:** Fix bug immediately (P1 critical blocker).
- **Reason:** This is a deployment blocker affecting all production fixes; no viable workaround.

## 10) Rollout / Verification
1. Implement route-level fix.
2. Run typecheck/build locally.
3. Deploy dashboard to Vercel.
4. Smoke test `/api/auth/trial-signup` and `/api/lead-capture` on production.
