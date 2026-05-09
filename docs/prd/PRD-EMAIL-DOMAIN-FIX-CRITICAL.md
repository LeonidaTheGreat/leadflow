# PRD-LEADFLOW-EMAIL-DOMAIN-FIX-001

**Status:** P0 — Revenue Blocker  
**Type:** Infrastructure Fix  
**Author:** PM Agent  
**Date:** 2026-05-08  
**UC:** fix-email-delivery-resend-from-domain-not-verified

---

## Problem

All outgoing emails are silently blocked. `EmailService` sends from `stojan@landyourleads.com` but this domain is not verified with Resend. Resend rejects or silently drops all emails sent from unverified domains.

**Cascade impact:**
- 35 pilot signups → 0 follow-up emails received (follow_up_sent = false for ALL)
- 11 agents with trial_ends_at set → 0 trial nurture emails sent (all email flags false)
- 59/61 agents stuck at onboarding_step=0 — email verification step never completes
- Trial-to-paid conversion: 0% — no nurture touchpoints exist
- Dev agents failed this fix 5+ times because domain verification cannot be fixed in code

---

## Root Cause

This is a **Resend account configuration issue**, not a code bug. Two possible causes:

1. `landyourleads.com` domain not added/verified in the Resend dashboard → all sends from `@landyourleads.com` fail
2. `RESEND_API_KEY` is not set in Vercel project environment variables → API call fails at auth

**Code path:** `EmailService.js:10` — `this.fromEmail = process.env.FROM_EMAIL || 'stojan@landyourleads.com'`

---

## What Needs to Happen

### Option A: Verify the domain (permanent fix)
1. Log into Resend dashboard → Domains → Add `landyourleads.com`
2. Add DNS records Resend provides (SPF, DKIM, DMARC) to the domain registrar
3. Wait for verification (minutes to hours)
4. No code change needed

### Option B: Switch to a pre-verified domain (faster, temporary)
1. In Vercel project settings for `fub-inbound-webhook`, set `FROM_EMAIL=noreply@resend.dev` (Resend's built-in test domain, always works)
2. Also set `RESEND_API_KEY` if not already set
3. Deploy: `cd ~/projects/leadflow && vercel --prod`
4. **Only use for emergency unblocking** — `resend.dev` emails land in spam and do not convey brand trust
5. Switch to `landyourleads.com` once verified

### Option C (if domain is already verified): Check Vercel env vars
1. `vercel env ls --scope stojans-projects-7db98187` on the `fub-inbound-webhook` project
2. Confirm `RESEND_API_KEY` is present and non-empty
3. Confirm `FROM_EMAIL` matches a verified Resend domain

---

## Acceptance Criteria

```bash
# 1. Email send test — must return success with a real Resend ID (not mock)
node -e "
const EmailService = require('./lib/services/EmailService');
const svc = new EmailService();
svc.send({ to: 'madzunkov@gmail.com', subject: 'Test', html: '<p>test</p>' })
  .then(r => { console.log(r); process.exit(r.success ? 0 : 1); });
"

# 2. No agents with trial_ends_at should have all email flags = false after running the trial email job
psql openclaw -c "SELECT email, trial_email_day1_sent FROM real_estate_agents WHERE trial_ends_at IS NOT NULL"
```

---

## After Email Is Fixed: Immediate Actions

1. **Trigger activation emails** for all 35 pilot signups (manual or via `/admin/activation-outreach` endpoint)
2. **Run trial email backfill** for 11 agents with `trial_ends_at` but no emails sent
3. **Personal outreach by Stojan** to top 5 pilot signups (see below)

### Priority Pilot Outreach List
From `pilot_signups` table (most recent, with real-domain emails):
- Pamela Manwaring — pamela@domidesert.com (personal agent website, high intent signal)
- Alivia Wright — alivia@theagencycharlotte.com
- Ashley Misiuda — ashley@theagencycharlotte.com
- Bridget Strategos — bridgetstrategos@gmail.com
- Ashli Taylor — ashlitaylor12@gmail.com

**Lead magnet signups (19 total) are highest intent** — they opted in proactively.

---

## Why Dev Agents Kept Failing This

Dev agents cannot log into Resend, cannot add DNS records, cannot set Vercel environment variables through the codebase. Every dev task assigned to this UC resulted in cancelled/failed status because the fix requires infrastructure access, not code changes. This UC must be handled by Stojan directly or by an agent with Vercel/Resend dashboard access.
