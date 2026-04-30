# PRD: Signup to Activated Rate — Root Cause Analysis & Recovery Plan

**Status:** Draft  
**Date:** 2026-04-29  
**Priority:** P0 — blocks all conversion metrics  
**PM:** PM Agent (genome task 29c8b341)

---

## Problem

`Signup to Activated Rate` metric shows `null%` in the project graph vs a 60% target.

This is not just a monitoring gap — the actual activation rate is **4.2%** (1/24 signups experienced an aha moment). The metric is null because it's never computed. The activation rate is 4.2% because email delivery has been broken.

---

## Funnel State (2026-04-29, local production DB)

| Stage | Count | Rate | Drop-Off |
|---|---|---|---|
| Signups | 23 | 100% | — |
| Email Verified | 4 | 17% | **−83%** ← primary blocker |
| FUB Connected | 0 | 0% | −100% |
| Aha Moment Completed | 1 | 4.2% | — |

**412 out of 416 email sends have failed** since launch. Email verification reminders, activation outreach, and trial conversion emails are all silently broken.

---

## Root Cause Stack

### Layer 1: Metric Not Collected

`_collectRevenueMetrics()` in `~/.openclaw/genome/core/mission-metric-collector.js` line 555 hardcodes:
```js
'Signup to Activated Rate': null, // not in revenue_metrics — manual or future
```

The data IS available. Fix: query `real_estate_agents` for `aha_completed = true` ratio.

**Definition of "activated":** `aha_completed = true` — agent experienced their first AI lead response. This is the product's core value moment.

Formula:
```sql
SELECT
  ROUND(COUNT(*) FILTER (WHERE aha_completed = true) * 100.0 / NULLIF(COUNT(*), 0), 1)
FROM real_estate_agents
```

### Layer 2: Email Delivery Broken (THE root cause)

**Symptom:** 412/416 email events `status = 'failed'` with error:
> "You can only send testing emails to your own email address (madzunkov@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains."

**Root cause:** `FROM_EMAIL` env var is not set in Vercel production. Code falls back to `onboarding@resend.dev` (Resend test domain), which blocks sends to any address except the API owner's.

**Impact — every email flow is broken:**
- Email verification (83% of signups never verified — they never got the email)
- Activation outreach emails (all 4 verified agents, `activation_email_sent = false`)
- Trial conversion sequences (day 1/3/6 emails)
- Pilot invite emails

**Fix is code-complete** (`fix-email-delivery-resend-from-domain-not-verified`, status: `awaiting_merge`) but requires **two human actions:**
1. Verify `leadflow.ai` domain in [Resend dashboard](https://resend.com/domains) (DNS TXT record)
2. Set `FROM_EMAIL=onboarding@leadflow.ai` in Vercel project `leadflow-ai` env vars

### Layer 3: No Activation Automation

Even when email works, activation emails require a human to call `POST /api/admin/send-activation-email`. There is no automatic trigger when `email_verified` flips to `true`.

`uc-auto-trigger-onboarding-post-verify` (COMPLETE) handled the onboarding redirect flow, not the activation outreach email. Gap remains.

---

## Actions Required

### A1 — Human Action (UNBLOCKING, needed immediately)

**Verify Resend domain + set Vercel env var:**
1. Go to [resend.com/domains](https://resend.com/domains)
2. Add `leadflow.ai`, follow DNS verification steps
3. In Vercel project `leadflow-ai` settings: add `FROM_EMAIL=onboarding@leadflow.ai`
4. Redeploy

This unblocks the entire email funnel. Everything else waits on this.

### A2 — Genome Fix: Compute Signup to Activated Rate

**UC:** `fix-signup-activated-rate-metric-collection`  
**Who:** Dev agent (genome)  
**What:** Update `_collectRevenueMetrics()` to query `real_estate_agents.aha_completed` directly instead of returning null.  
**Acceptance:** `SELECT current_value FROM mission_metrics WHERE name = 'Signup to Activated Rate'` returns a number (not null).

### A3 — Product Fix: Auto-Activation Email on Verification

**UC:** `feat-auto-activation-email-on-verification`  
**Who:** Dev agent (leadflow)  
**Depends on:** A1 (email delivery fix) must be deployed first  
**What:** After `email_verified = true` event, automatically queue activation email within 1 hour. Use existing `ActivationService.sendActivationEmail()`.  
**Where to hook:** In the email verification callback (wherever `email_verified` is set to `true` in the DB — check `routes/` for the verification endpoint).  
**Acceptance:**
1. Create test account → verify email → activation email arrives within 1 hour
2. `SELECT activation_email_sent FROM real_estate_agents WHERE email_verified = true` → all `true` for accounts created after fix
3. `SELECT COUNT(*) FROM email_events WHERE type = 'activation' AND status = 'sent'` → > 0

---

## Success Criteria

| Metric | Now | After A1+A2+A3 | Target |
|---|---|---|---|
| Signup to Activated Rate (displayed) | null | computed | any |
| Email delivery success rate | 1% | >95% | >95% |
| Email verification rate | 17% | >40% | 60% |
| Actual aha_completed rate | 4.2% | 10%+ in 14d | 60% |

---

## What NOT to Build

- Do not rebuild the email system — Resend + existing EmailService is correct
- Do not re-implement ActivationService — it exists and is correct
- Do not merge the existing email delivery fix PR — that requires the DNS domain verification first (human step)
- Do not set up a new FUB connection wizard — `feat-onboarding-fub-wizard` is complete
