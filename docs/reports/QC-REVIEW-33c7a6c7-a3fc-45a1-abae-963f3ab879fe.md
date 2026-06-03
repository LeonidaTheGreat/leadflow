# QC Review: Guided FUB Connection Wizard

**Task ID:** 33c7a6c7-a3fc-45a1-abae-963f3ab879fe
**PR:** #884 (merged to main as bfc8043)
**Reviewer:** QC Agent
**Date:** 2026-04-05
**Verdict:** CHANGES_REQUESTED

---

## Automated Gates

| Gate | Result |
|------|--------|
| `npm run build` (Next.js) | PASS |
| `npm test` | Pre-existing failure (FUB_API_KEY/Twilio not set in env — not caused by this PR) |
| No junk files in diff | PASS |
| Existing integration tests (15/15) | PASS |
| QC E2E tests (18 assertions) | **FAIL (2 failures)** |

---

## Defects Found

### DEFECT 1 (P1): `wizard-hidden-after-complete` acceptance criterion NOT implemented

**File:** `product/lead-response/dashboard/app/onboarding/fub/page.tsx` — `FubWizardPage` component

The acceptance criterion states: "Agents with `fub_onboarding_completed = true` do NOT see the wizard on next login."

The `useEffect` at line 621 only pings the `webhook-url` endpoint to detect 401s (auth check). It does NOT fetch the agent's `fub_onboarding_completed` flag. A returning agent who completed the wizard will see the wizard again every time they visit `/onboarding/fub`.

The integration test for this criterion (line 105–110 in `fub-onboarding-wizard.test.js`) is a fake — it asserts on a hardcoded local object `{ fub_onboarding_completed: true }`, not on the actual page behavior.

**Required fix:** On page mount, fetch agent status (e.g. add a `GET /api/onboarding/fub/status` endpoint or reuse an existing agent profile endpoint) and `router.push('/dashboard')` if `fub_onboarding_completed === true`.

---

### DEFECT 2 (P2): Rate limiting missing on `validate-key`

**File:** `product/lead-response/dashboard/app/api/onboarding/fub/validate-key/route.ts`

PRD Implementation Notes explicitly require: "Rate-limit the validate-key endpoint (max 10 attempts per agent per hour) to prevent API abuse."

No rate limiting exists. Every call hits the FUB API live. A malicious agent (or bug) can brute-force or spam FUB's API with LeadFlow's system key.

---

## Spaghetti Risk (Non-Blocking, Flag for Product)

There are now **three** FUB connection paths in the codebase:
1. `/api/integrations/fub/connect` + `/app/setup/steps/fub-step.tsx`
2. `/api/agents/onboarding/fub-connect`
3. `/api/onboarding/fub/validate-key` + new wizard (this PR)

Each stores `fub_api_key` differently (different tables: `agent_integrations`, `agent_onboarding_wizard`). This will cause data consistency issues. Product should consolidate after pilot.

---

## What Works Correctly

- All 4 API routes exist and require auth (getAuthUserId + 401)
- FUB API key validated via live FUB `/v1/users` endpoint
- SHA-256 hash stored for audit log
- Webhook URL correctly formatted: `https://api.imagineapi.org/webhooks/fub/{agent_id}`
- Test lead polling via `leads` table (5s interval, filters real vs sample leads)
- `complete` route sets `fub_onboarding_completed: true` on `real_estate_agents`
- Migration `010_fub_onboarding_wizard.sql` is idempotent, targets correct table
- All 4 wizard steps present with `data-testid` attributes
- FUB admin link (`https://app.followupboss.com/2/api`) in step 1
- Clipboard copy button for webhook URL
- Confirmation checkbox in step 2 required before proceeding
- No hardcoded secrets
- Build passes

---

## Verdict

**CHANGES_REQUESTED**

Defect 1 (P1) is an acceptance criterion violation — the feature is spec'd to hide the wizard for returning users and it does not. Defect 2 (P2) is a PRD-required security control that was not implemented.
