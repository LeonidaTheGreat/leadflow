# PRD: Email Verification — Confirm Inbox Before Login

**ID:** prd-email-verification-before-login  
**Feature ID:** feat-email-verification-before-login  
**Status:** approved  
**Priority:** P1  
**Version:** 1.0  
**Author:** Product Manager  
**Date:** 2026-01-13  

---

## Overview

After signup, LeadFlow agents must click a confirmation link sent to their email inbox before they can access the dashboard. Unverified accounts are created but blocked from logging in. This prevents fake/mistyped email signups, validates Resend delivery is working, and is a standard SaaS trust signal.

---

## Problem Statement

Currently, agents can sign up with any email address (including mistyped or fake ones) and immediately access the dashboard. This leads to:
- Dead accounts from email typos
- Inability to confirm Resend delivery works before agents enter onboarding
- Erosion of data quality in our pilot cohort (small, so every signup matters)
- Weak trust signal — professional SaaS products verify email before granting access

---

## User Stories

### US-1: Signup Triggers Verification Gate
**As a** real estate agent who just signed up,  
**I want** to receive a confirmation email immediately,  
**So that** I can verify my email address and gain access to the dashboard.

### US-2: Verified Login Access
**As a** real estate agent who has verified my email,  
**I want** to log in normally without any interruption,  
**So that** verification is a one-time step that doesn't affect my ongoing experience.

### US-3: Blocked Login with Clear Guidance
**As a** real estate agent who has NOT verified my email,  
**When I** attempt to log in,  
**I want** a clear error message and a one-click resend option,  
**So that** I understand why I'm blocked and can unblock myself immediately.

### US-4: Resend Verification Email
**As a** real estate agent who didn't receive the verification email,  
**I want** to request a new confirmation link from the /check-your-inbox page,  
**So that** I can complete verification even if the first email was delayed or missed.

### US-5: Expired Token Recovery
**As a** real estate agent whose verification link expired (after 24h),  
**I want** to request a fresh link,  
**So that** I'm not permanently blocked by an expired token.

### US-6: Existing Accounts Unaffected
**As an** existing LeadFlow agent (pilot or early access),  
**I want** email verification to not force me to re-verify,  
**So that** I can continue using the product without disruption.

---

## User Journey (Happy Path)

```
1. Agent submits signup form (trial or pilot flow)
   ↓
2. Account created in real_estate_agents with email_verified = false
   ↓
3. email_verification_tokens row created (24h expiry, UUID token)
   ↓
4. Resend sends confirmation email within 30s
   ↓
5. Agent redirected to /check-your-inbox
   (shows: email address, instructions, Resend button)
   ↓
6. Agent opens email, clicks "Confirm my email address"
   ↓
7. GET /api/auth/verify-email?token=<token>
   - Token validated (not expired, not used)
   - email_verified = true in real_estate_agents
   - token marked as used_at = now()
   ↓
8. Redirect to /setup (onboarding wizard)
```

---

## User Journey (Blocked Login)

```
1. Agent navigates to /login, submits credentials
   ↓
2. Credentials valid BUT email_verified = false
   ↓
3. Login route returns 403:
   { error: 'EMAIL_NOT_VERIFIED', message: 'Please confirm your email address.' }
   ↓
4. UI displays error with resend CTA
   ↓
5. Agent clicks Resend → POST /api/auth/resend-verification
   ↓
6. New token created (rate-limited: max 3/hr), email sent
   ↓
7. Agent verifies and tries login again → success
```

---

## Database Schema

### New Table: `email_verification_tokens`

```sql
CREATE TABLE email_verification_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evt_token ON email_verification_tokens(token);
CREATE INDEX idx_evt_agent_id ON email_verification_tokens(agent_id);
```

### Modification: `real_estate_agents`

```sql
ALTER TABLE real_estate_agents
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing accounts treated as verified
UPDATE real_estate_agents
  SET email_verified = TRUE
  WHERE email_verified = FALSE AND created_at < NOW();
```

> **Important:** Run the backfill UPDATE immediately after the ALTER TABLE — existing pilot agents must not be locked out.

---

## API Specification

### GET `/api/auth/verify-email`

**Query params:** `token` (required)

**Behavior:**
1. Look up `email_verification_tokens` by token
2. If not found → redirect to `/login?error=invalid_token`
3. If `used_at IS NOT NULL` → redirect to `/login?error=token_already_used`
4. If `expires_at < NOW()` → redirect to `/check-your-inbox?error=link_expired`
5. If valid:
   - Set `used_at = NOW()`
   - Set `real_estate_agents.email_verified = TRUE` for `agent_id`
   - Redirect to `/setup`

**Auth:** None required (public endpoint)

---

### POST `/api/auth/resend-verification`

**Body:** `{ email: string }` — or derive from session if agent is logged in (partially)

**Behavior:**
1. Look up agent by email in `real_estate_agents`
2. If not found → return 404 `{ error: 'AGENT_NOT_FOUND' }`
3. If already verified → return 200 `{ message: 'Already verified' }` (idempotent)
4. Rate limit check: count tokens created in last 1 hour for this agent
   - If count >= 3 → return 429 `{ error: 'RATE_LIMIT', message: 'Max 3 resend attempts per hour.' }`
5. Create new token (UUID), set `expires_at = NOW() + 24h`
6. Send confirmation email via Resend
7. Return 200 `{ message: 'Verification email sent.' }`

**Auth:** None required (public endpoint — agent may not have a session yet)  
**Rate limit:** 3 tokens per agent per hour (enforced via DB query, not in-memory)

---

### Modification to Login Route: `POST /api/auth/login`

After credentials are validated but **before** issuing a session token:

```
IF real_estate_agents.email_verified = FALSE THEN
  RETURN 403 {
    error: 'EMAIL_NOT_VERIFIED',
    message: 'Please confirm your email address.',
    resendUrl: '/api/auth/resend-verification'
  }
END IF
```

---

## Email Template

**Subject:** "Confirm your LeadFlow email address"

**From:** Resend sender configured in env (`RESEND_FROM_EMAIL`)

**Body:**
```
Hi {first_name},

You're almost ready to start using LeadFlow AI.

Click the button below to confirm your email address and activate your account.

[Confirm my email address]
https://{APP_URL}/api/auth/verify-email?token={token}

This link expires in 24 hours.

If you didn't create a LeadFlow account, you can safely ignore this email.

— The LeadFlow Team
```

---

## UI: `/check-your-inbox` Page

### Content
- **Headline:** "Check your inbox"
- **Body:** "We sent a confirmation link to **{email}**. Click the link to activate your account."
- **Expiry note:** "The link expires in 24 hours."
- **CTA:** "Resend email" button
  - Disabled for 60 seconds after click (countdown shown: "Resend in 42s")
  - Max 3 resends (after 3: "Maximum resends reached. Try again in an hour.")
- **Secondary link:** "Wrong email? Sign up with a different address" → `/signup`
- **No navigation** to dashboard or protected routes

### Mobile
- Single-column layout, full-width CTA button
- Email address in bold/highlighted so agent can confirm it's correct

### Error States (URL params)
- `?error=link_expired` → show banner: "That link has expired. Request a new one below."
- `?error=invalid_token` → show banner: "That link is invalid. Please request a new one."
- `?error=token_already_used` → show banner: "This link has already been used. Try logging in."
- `?resent=true` → show success banner: "Verification email resent. Check your inbox."

---

## Login Page Error State

When login returns `EMAIL_NOT_VERIFIED`:
- Show error: "You must verify your email before logging in."
- Show secondary CTA: "Resend verification email →" → triggers resend API call inline or links to `/check-your-inbox`

---

## Backward Compatibility

- All agents with accounts created before this feature ships must be treated as verified
- The migration (`UPDATE real_estate_agents SET email_verified = TRUE WHERE ...`) runs as part of DB migration
- No re-verification prompt for existing agents under any circumstances
- If `email_verified` column is `NULL` due to migration timing: treat as `TRUE` (safe default in code)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Agent clicks link twice | Second click → "link already used" redirect |
| Agent clicks 24h+ old link | Redirect to `/check-your-inbox?error=link_expired` |
| Agent requests 4th resend in 1 hour | 429 response with retry-after message |
| Agent signs up via pilot flow | Same verification flow — pilot and trial treated identically |
| Agent signs up with email that already exists | Existing signup error flow (unchanged) |
| Resend email fails (Resend API error) | Return 500; log error; do not surface internal details to user |
| Admin-created accounts | Set `email_verified = TRUE` at creation time (bypass flow) |

---

## Acceptance Criteria

1. **Signup → email delivered:** After signup completes, `email_verification_tokens` row is created and Resend delivers confirmation email within 30 seconds with a working verification link.

2. **Verification link → onboarding:** Clicking the verification link sets `email_verified = TRUE` in `real_estate_agents` and redirects the agent to `/setup` (onboarding wizard).

3. **Unverified login → 403:** Attempting to log in with an unverified account returns HTTP 403 with `{ error: 'EMAIL_NOT_VERIFIED' }` and the UI displays a message with a resend CTA.

4. **Verified login → normal flow:** Logging in with a verified account proceeds normally, no interruption.

5. **Token expiry:** An expired token (>24h) redirects to `/check-your-inbox?error=link_expired` with instructions to request a new link.

6. **Resend rate limit:** The resend endpoint rejects a 4th token request within the same hour with HTTP 429 and a clear message.

7. **Check-your-inbox mobile:** The `/check-your-inbox` page renders correctly on a 375px viewport with the agent's email address displayed and the resend button functional.

8. **Existing accounts unaffected:** Agents with accounts created before this feature ships are not forced to re-verify and can log in without interruption.

9. **Both signup flows trigger verification:** Both pilot (`/signup?type=pilot`) and trial (`/signup`) flows send a verification email after account creation.

---

## Out of Scope (Not This PRD)

- OAuth/SSO flows (those use provider-verified emails)
- Email change verification (separate feature)
- Admin-panel manual verification override UI
- SMS/phone verification
- Magic link login (separate feature)

---

## Definition of Done

- [ ] DB migration applied: `email_verification_tokens` table + `email_verified` column on `real_estate_agents` + backfill
- [ ] `GET /api/auth/verify-email` route deployed and functional
- [ ] `POST /api/auth/resend-verification` route deployed and rate-limited
- [ ] Login route rejects unverified accounts with `EMAIL_NOT_VERIFIED`
- [ ] Confirmation email sent via Resend with correct link format
- [ ] `/check-your-inbox` page deployed with all states working
- [ ] Login page shows error + resend CTA for unverified accounts
- [ ] All 9 acceptance criteria pass in QC
- [ ] Existing pilot accounts remain accessible (backfill verified)
