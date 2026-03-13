# PRD: Forgot Password / Password Reset Flow
**PRD ID:** PRD-FORGOT-PASSWORD  
**Use Case:** fix-no-forgot-password-flow  
**Status:** draft  
**Priority:** high  
**Created:** 2025-01-01  
**Author:** Product Manager

---

## Problem Statement

The login page at `/login` displays a "Forgot password?" button that currently triggers a browser `alert('Forgot password feature coming soon!')`. There is no functional password reset flow. Real estate agents who forget their password have no self-serve recovery path — they are permanently locked out unless they contact support.

This is a blocking usability gap for any paying or trial customer.

---

## Goal

Enable locked-out users to securely reset their password via email, without requiring support intervention.

---

## User Story

**As** a real estate agent who has forgotten their password,  
**I want** to request a password reset link via my email,  
**So that** I can regain access to my LeadFlow dashboard without contacting support.

---

## Technical Context

- Auth system: **custom JWT** — passwords stored as bcrypt hashes in `real_estate_agents.password_hash`
- Email delivery: **Resend** (`RESEND_API_KEY` env var, `lib/email-service.ts` pattern)
- Token storage: new DB table `password_reset_tokens` (see schema below)
- No Supabase Auth is in use — all auth is custom

---

## Scope

### In Scope
1. **Forgot Password page** (`/forgot-password`) — email input form
2. **API route** `POST /api/auth/forgot-password` — validates email, generates token, sends email
3. **Reset Password page** (`/reset-password?token=<token>`) — new password form
4. **API route** `POST /api/auth/reset-password` — validates token, updates `password_hash`, invalidates token
5. **DB table** `password_reset_tokens` — secure token storage with expiry
6. **Email template** — password reset email with secure link
7. **Login page update** — "Forgot password?" button links to `/forgot-password` (remove the `alert()`)

### Out of Scope
- OAuth / social login
- Multi-factor authentication
- Admin-initiated password reset

---

## Functional Requirements

### FR-1: Forgot Password Page (`/forgot-password`)
- Display email input field with "Send Reset Link" button
- On submit: call `POST /api/auth/forgot-password`
- Show success message regardless of whether email exists (anti-enumeration: "If an account with that email exists, you'll receive a reset link shortly")
- Show error only for network/server failures
- Link back to `/login`

### FR-2: `POST /api/auth/forgot-password`
- Accept `{ email: string }`
- Look up `real_estate_agents` by email
- If not found: return 200 (no error — anti-enumeration)
- If found:
  - Generate a cryptographically secure random token (32 bytes hex)
  - Hash token before storing (SHA-256 or bcrypt)
  - Insert into `password_reset_tokens`: `{ agent_id, token_hash, expires_at (1 hour), created_at, used: false }`
  - Invalidate any previous unexpired tokens for this agent
  - Send reset email via Resend with link: `https://[dashboard-url]/reset-password?token=<raw-token>`
- Return 200 always

### FR-3: Reset Password Page (`/reset-password`)
- Accept `token` query param
- On load: validate token is present
- Display two fields: "New Password" + "Confirm Password"
- Password requirements: minimum 8 characters
- On submit: call `POST /api/auth/reset-password`
- On success: show "Password updated! Redirecting to login..." → redirect to `/login` after 2s
- On invalid/expired token: show error "This reset link is invalid or has expired. [Request a new one]" (links to `/forgot-password`)

### FR-4: `POST /api/auth/reset-password`
- Accept `{ token: string, password: string, confirmPassword: string }`
- Validate passwords match and meet length requirement
- Look up token in `password_reset_tokens` (by hash), check `expires_at > now` and `used = false`
- If invalid/expired: return 400 with error
- If valid:
  - Hash new password with bcrypt (12 rounds)
  - Update `real_estate_agents.password_hash`
  - Mark token as `used = true` in `password_reset_tokens`
  - Return 200

### FR-5: Login Page Update
- Replace `handleForgotPassword` function (currently `alert(...)`) with `router.push('/forgot-password')`

### FR-6: DB Schema — `password_reset_tokens`
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_prt_agent_id ON password_reset_tokens(agent_id);
```

### FR-7: Password Reset Email Template
- Subject: "Reset your LeadFlow AI password"
- Body:
  - Greeting with agent name (if available, else "Hi there")
  - One-sentence context: "We received a request to reset your password."
  - CTA button: "Reset My Password" → links to `/reset-password?token=<token>`
  - Security note: "This link expires in 1 hour. If you didn't request this, you can safely ignore this email."
  - Footer with support email
- From: `noreply@leadflow.ai` (or `support@leadflow.ai` if noreply isn't configured)

---

## Non-Functional Requirements

- Token expiry: **1 hour**
- Token entropy: minimum 32 bytes (256 bits) random — use `crypto.randomBytes(32).toString('hex')`
- Token storage: store **hash** only (never raw token in DB)
- Anti-enumeration: `POST /api/auth/forgot-password` always returns 200
- No brute force: tokens are single-use and hashed
- Rate limiting: optional for v1 (Vercel edge rate limiting can be added later)

---

## Acceptance Criteria

### AC-1: Forgot password link works
- [ ] Clicking "Forgot password?" on `/login` navigates to `/forgot-password` (not an alert)

### AC-2: Reset email is sent
- [ ] Entering a registered email and submitting the forgot-password form results in receiving a reset email within 30 seconds
- [ ] Email contains a working "Reset My Password" link

### AC-3: Non-existent email does not reveal account existence
- [ ] Submitting a non-existent email shows the same success message as a real email (no error shown)

### AC-4: Password reset works end-to-end
- [ ] Clicking the link in the email opens `/reset-password?token=...`
- [ ] Entering a new password (8+ chars) and submitting successfully updates the password
- [ ] Logging in with the new password succeeds
- [ ] Logging in with the old password fails

### AC-5: Token security
- [ ] Using the same reset link a second time returns an error ("link invalid or expired")
- [ ] A reset link older than 1 hour returns an error ("link invalid or expired")

### AC-6: UI states
- [ ] The reset-password page shows an error if no `token` query param is present
- [ ] Password mismatch shows inline validation error before submitting
- [ ] Passwords shorter than 8 characters show inline validation error

---

## Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `app/forgot-password/page.tsx` | CREATE | Forgot password form page |
| `app/reset-password/page.tsx` | CREATE | New password form page |
| `app/api/auth/forgot-password/route.ts` | CREATE | API: send reset email |
| `app/api/auth/reset-password/route.ts` | CREATE | API: apply new password |
| `app/login/page.tsx` | MODIFY | Replace `alert()` with `router.push('/forgot-password')` |
| `lib/email-service.ts` | MODIFY | Add `sendPasswordResetEmail()` function |
| Migration SQL | CREATE | `password_reset_tokens` table (dev to run via Supabase dashboard or migration script) |

---

## Definition of Done

1. All 6 acceptance criteria pass
2. Dev has created the `password_reset_tokens` table in Supabase (production)
3. Login page "Forgot password?" button navigates to the new page (no alert)
4. QC agent has tested the full flow on `leadflow-ai-five.vercel.app`
5. No regression in existing login flow
