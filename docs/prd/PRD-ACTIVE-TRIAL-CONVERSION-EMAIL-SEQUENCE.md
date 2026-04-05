# PRD: Active Trial Conversion Email Sequence

**PRD ID:** prd-active-trial-conversion-email-sequence  
**Status:** ready  
**Priority:** P1  
**Use Case:** uc-revenue-email-sequence  
**Owner:** Product Manager (spec) → Dev → QC  
**Last Updated:** 2026-04-05  
**Revenue Impact:** Direct conversion path for all trial users → $149–$399 MRR per conversion

---

## Executive Summary

LeadFlow has a 14-day trial. Trials expire silently with no engagement sequence. This PRD specifies a **6-email drip sequence** starting at signup (Day 0) and running through Day 15 (1 day post-expiry). The sequence is designed to:

1. Welcome and orient the agent at signup
2. Highlight AI value before they experience it
3. Nudge toward upgrade at the "aha" inflection point (Day 3)
4. Warn before expiry (Day 7)
5. Mark expiry and create urgency (Day 14)
6. Deliver one final recovery email (Day 15)

The existing `trial-emails.ts` and `send-trial-emails` cron implements a **days-remaining countdown** (6, 3, 1, expired). This new sequence replaces that countdown with a **days-since-signup forward sequence**. The existing columns are deprecated — new columns track each email in the new sequence.

---

## 1. Database Schema Changes

### 1.1 Migration Required

Add 6 new boolean columns to the `real_estate_agents` table. The old columns (`trial_email_day6_sent`, `trial_email_day3_sent`, `trial_email_day1_sent`, `trial_email_expired_sent`) should be left in place but the new cron job must NOT send those old email types.

```sql
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS trial_email_welcome_sent    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day1_aha_sent   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day3_upgrade_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day7_warning_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day14_expired_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day15_final_sent  BOOLEAN NOT NULL DEFAULT false;
```

### 1.2 `trial_email_logs` Table

Already exists — no changes needed. Use `email_type` values:  
`trial_welcome`, `trial_day1_aha`, `trial_day3_upgrade`, `trial_day7_warning`, `trial_day14_expired`, `trial_day15_final`

---

## 2. Email Sequence Definition

Trial duration assumed: **14 days** from `created_at`. Agents are identified by `subscription_status = 'trial'` and `email_verified = true`.

### Email Logic

Each email fires when `days_since_signup == N` AND the corresponding sent-boolean is false.

```
days_since_signup = floor((now - created_at) / 86400 seconds)
```

### Email 1 — Day 0: Welcome

| Property | Value |
|----------|-------|
| **Trigger** | `days_since_signup == 0` AND `trial_email_welcome_sent = false` |
| **Subject** | `Welcome to LeadFlow AI — your first lead response in 30 seconds` |
| **CTA** | `Set Up Your Account →` → `/dashboard/onboarding` |
| **Purpose** | Orient. Set expectations. Drive first login + onboarding completion. |
| **Tone** | Warm, specific, confident |

**Body copy:**
> Hi [first_name],
>
> Welcome to LeadFlow AI. Here's what happens next:
>
> 1. Connect your Follow Up Boss account (takes 2 minutes)
> 2. The next lead that comes in gets an AI response in under 30 seconds
> 3. You'll see it happen live in your dashboard
>
> That's it. No scripts to write. No templates to configure.
>
> Ready? Start setup →
>
> You have 14 days free. No credit card needed until you decide to continue.
>
> — The LeadFlow Team

---

### Email 2 — Day 1: AI Aha

| Property | Value |
|----------|-------|
| **Trigger** | `days_since_signup == 1` AND `trial_email_day1_aha_sent = false` |
| **Subject** | `This is what your leads experience when you use LeadFlow` |
| **CTA** | `See It In Action →` → `/dashboard/demo` |
| **Purpose** | Show the product from the lead's perspective. Drive aha moment before churn risk. |
| **Tone** | Show-don't-tell |

**Body copy:**
> Hi [first_name],
>
> Want to see exactly what your leads get when they inquire?
>
> A lead submits a form at 11pm. In 28 seconds, they get a personalized text: "Hi Sarah! Thanks for your interest in 123 Main St. I'd love to schedule a quick call — are you available tomorrow?" 
>
> That's not a template. That's AI reading the lead, reading your listings, and writing something real.
>
> 79% of leads go to the first agent who responds. LeadFlow makes you that agent — even while you sleep.
>
> Run the live demo →

---

### Email 3 — Day 3: Upgrade Nudge

| Property | Value |
|----------|-------|
| **Trigger** | `days_since_signup == 3` AND `trial_email_day3_upgrade_sent = false` |
| **Subject** | `3 days in — how many leads have you responded to?` |
| **CTA** | `Upgrade to Pro — $149/mo →` → `/dashboard/upgrade?plan=pro` |
| **Purpose** | Connect product usage to revenue. Create urgency to upgrade before trial ends. |
| **Tone** | Results-focused, peer-comparison |

**Body copy:**
> Hi [first_name],
>
> Three days in. In that time, LeadFlow agents on Pro have responded to an average of 12 leads. Every response went out in under 30 seconds. Every lead got a follow-up.
>
> If you haven't set up your FUB integration yet, today's the day. It takes 2 minutes and you'll start seeing results immediately.
>
> When your trial ends in 11 days, Pro keeps everything running at $149/month. That's less than one lost lead.
>
> Upgrade now and never miss another lead →

---

### Email 4 — Day 7: Warning

| Property | Value |
|----------|-------|
| **Trigger** | `days_since_signup == 7` AND `trial_email_day7_warning_sent = false` |
| **Subject** | `7 days left — don't lose your leads` |
| **CTA** | `Keep My Leads →` → `/dashboard/upgrade?plan=pro` |
| **Purpose** | Half-time warning. Create fear of losing continuity. |
| **Tone** | Urgent but not pushy |

**Body copy:**
> Hi [first_name],
>
> You're halfway through your trial. 7 days left.
>
> When the trial ends, LeadFlow stops responding to your leads. Every new inquiry gets silence — and 78% of those leads go to another agent within the hour.
>
> Keep the momentum going. Pro is $149/month and you can cancel anytime.
>
> Don't let 7 days of setup go to waste. Upgrade today →

---

### Email 5 — Day 14: Expired

| Property | Value |
|----------|-------|
| **Trigger** | `days_since_signup >= 14` AND `trial_email_day14_expired_sent = false` AND `subscription_status = 'trial'` |
| **Subject** | `Your LeadFlow trial has ended — leads are going unanswered` |
| **CTA** | `Reactivate Now →` → `/dashboard/upgrade?plan=pro` |
| **Purpose** | Expiry notification + reactivation offer. All data preserved. |
| **Tone** | Factual, recovery-focused |

**Body copy:**
> Hi [first_name],
>
> Your 14-day LeadFlow AI trial has ended.
>
> Your leads are no longer being responded to automatically.
>
> The good news: all your settings, integrations, and history are saved. You can pick up exactly where you left off — just upgrade to Pro.
>
> $149/month. Cancel anytime. Start converting leads again today.
>
> Reactivate with Pro →

---

### Email 6 — Day 15: Final Chance

| Property | Value |
|----------|-------|
| **Trigger** | `days_since_signup >= 15` AND `trial_email_day15_final_sent = false` AND `subscription_status = 'trial'` |
| **Subject** | `[First name], this is the last email from LeadFlow` |
| **CTA** | `One Last Chance: Upgrade →` → `/dashboard/upgrade?plan=pro&discount=pilot15` |
| **Purpose** | Final recovery. Personal, direct. Offer a small nudge (pilot discount if applicable). |
| **Tone** | Personal, low-pressure, closing |

**Body copy:**
> Hi [first_name],
>
> I don't want to spam you. This is the last email we'll send.
>
> If LeadFlow wasn't the right fit, no hard feelings. Real estate tech has to earn its place.
>
> But if you saw the potential — if you know that responding faster to leads would close more deals — the door is still open. Pro is $149/month and you can cancel anytime.
>
> If you upgrade in the next 24 hours, I'll personally make sure your onboarding is complete and your first lead response is set up correctly.
>
> — Stojan, LeadFlow
>
> [Upgrade — last chance]

---

## 3. Cron Job Specification

### 3.1 Existing Endpoint

Route: `POST /api/cron/send-trial-emails`  
File: `product/lead-response/dashboard/app/api/cron/send-trial-emails/route.ts`

This endpoint must be updated to run the new 6-email sequence instead of (or in addition to, during migration) the old countdown sequence.

### 3.2 New Cron Logic in `trial-emails.ts`

Replace the existing `sendTrialReminderEmails()` with `sendActiveTrialSequence()` that:

1. Queries `real_estate_agents` where `subscription_status = 'trial'` AND `email_verified = true`
2. For each agent, calculates `days_since_signup = floor((now - created_at).totalDays)`
3. Fires the appropriate email based on the table in Section 2
4. Updates the corresponding `trial_email_*_sent` column on success
5. Inserts a row to `trial_email_logs` with the `email_type`

### 3.3 Day 0 (Welcome) Special Case

Day 0 email cannot be triggered by the daily cron alone — by the time cron runs, `days_since_signup` may already be `>= 1`. The welcome email MUST also be triggered at signup time from `app/api/auth/trial-signup/route.ts`, immediately after the agent row is inserted.

**Signup route must call:**
```typescript
await sendWelcomeEmail(agentId)
// then set trial_email_welcome_sent = true
```

The cron job should ALSO check for Day 0 agents (as a fallback for any that were missed at signup).

### 3.4 Vercel Cron Configuration

`vercel.json` must include (or the existing cron entry must be preserved):

```json
{
  "crons": [
    {
      "path": "/api/cron/send-trial-emails",
      "schedule": "0 10 * * *"
    }
  ]
}
```

Schedule: daily at 10:00 UTC (good global coverage without hitting people at 3am).

---

## 4. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `RESEND_API_KEY` | Resend transactional email | Yes |
| `NEXT_PUBLIC_APP_URL` | Base URL for CTA links | Yes |
| `CRON_SECRET` | Bearer token for cron auth | Optional but recommended |

All already present in Vercel project settings.

---

## 5. Acceptance Criteria

### 5.1 Schema

- [ ] All 6 new boolean columns exist on `real_estate_agents` with `DEFAULT false`
- [ ] `trial_email_logs` accepts all 6 new `email_type` values

### 5.2 Cron Behavior

- [ ] `POST /api/cron/send-trial-emails` returns `200` with `success: true`
- [ ] For a test agent with `created_at = now() - 1 day`: Day 1 (aha) email fires, `trial_email_day1_aha_sent` flips to `true`
- [ ] For a test agent with `created_at = now() - 3 days`: Day 3 (upgrade) email fires, `trial_email_day3_upgrade_sent` flips to `true`
- [ ] For a test agent with `created_at = now() - 7 days`: Day 7 (warning) email fires, `trial_email_day7_warning_sent` flips to `true`
- [ ] For a test agent with `created_at = now() - 14 days` and `subscription_status = 'trial'`: Day 14 (expired) fires
- [ ] No email fires twice (idempotency: re-running cron doesn't resend)
- [ ] Paid agents (`subscription_status != 'trial'`) are excluded from all sequence emails

### 5.3 Welcome Email (Day 0)

- [ ] Signup route calls `sendWelcomeEmail()` immediately after agent row creation
- [ ] `trial_email_welcome_sent` is set to `true` after successful send
- [ ] If Resend fails, signup does NOT fail (email failure must be non-blocking)

### 5.4 Email Content

- [ ] Each email subject matches the spec in Section 2
- [ ] Each CTA link points to the correct URL
- [ ] Emails are sent `from: 'LeadFlow AI <onboarding@leadflow.ai>'`
- [ ] `[first_name]` is replaced with actual first name (fallback: "there")

### 5.5 Logging

- [ ] Each sent email creates a row in `trial_email_logs` with correct `email_type`
- [ ] Failed sends are logged with `delivery_status = 'failed'` and the error string

### 5.6 No Regression

- [ ] Old columns (`trial_email_day6_sent`, `trial_email_day3_sent`, `trial_email_day1_sent`, `trial_email_expired_sent`) are NOT set by the new cron (no duplicate sends)
- [ ] Trial signup flow still creates agent record correctly after this change

---

## 6. Implementation Notes for Dev

### Files to Modify

| File | Change |
|------|--------|
| `product/lead-response/dashboard/lib/trial-emails.ts` | Replace old countdown sequence with new 6-email `sendActiveTrialSequence()` |
| `product/lead-response/dashboard/app/api/cron/send-trial-emails/route.ts` | Call new function |
| `product/lead-response/dashboard/app/api/auth/trial-signup/route.ts` | Add welcome email call on signup |

### Files to Create

| File | Purpose |
|------|---------|
| DB migration SQL (in `scripts/db/` or inline in the PR) | Add 6 new columns |

### Do NOT

- Do not delete the old boolean columns (safe migration)
- Do not make welcome email a blocking operation in the signup flow (use fire-and-forget / catch)
- Do not hardcode trial length — derive it from `created_at` + `trial_ends_at` if possible, or use `days_since_signup >= 14`

---

## 7. E2E Test Spec

### Test: Trial Email Cron — Day 1 Aha

```
Setup: Insert test agent with created_at = now() - 1 day, subscription_status = 'trial', email_verified = true
Action: POST /api/cron/send-trial-emails
Assert: Response contains results for 'day1_aha'
Assert: SELECT trial_email_day1_aha_sent FROM real_estate_agents WHERE id = test_agent_id → true
Assert: SELECT COUNT(*) FROM trial_email_logs WHERE agent_id = test_agent_id AND email_type = 'trial_day1_aha' → 1
Teardown: DELETE FROM real_estate_agents WHERE id = test_agent_id
```

### Test: Idempotency (no double-send)

```
Setup: Insert test agent with trial_email_day1_aha_sent = true, created_at = now() - 1 day
Action: POST /api/cron/send-trial-emails
Assert: No new trial_email_logs row for this agent
Assert: trial_email_day1_aha_sent stays true (not reset)
Teardown: DELETE FROM real_estate_agents WHERE id = test_agent_id
```

### Test: Paid agents excluded

```
Setup: Insert test agent with subscription_status = 'active', created_at = now() - 3 days
Action: POST /api/cron/send-trial-emails
Assert: No trial emails sent to this agent
Assert: all trial_email_*_sent columns remain false
Teardown: DELETE FROM real_estate_agents WHERE id = test_agent_id
```

---

## 8. Machine-Verifiable Acceptance Checks

```sql
-- Column existence
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'real_estate_agents' 
AND column_name IN (
  'trial_email_welcome_sent',
  'trial_email_day1_aha_sent',
  'trial_email_day3_upgrade_sent',
  'trial_email_day7_warning_sent',
  'trial_email_day14_expired_sent',
  'trial_email_day15_final_sent'
);
-- Expected: 6

-- trial_email_logs accepts new type
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'trial_email_logs' AND column_name = 'email_type';
-- Expected: 1
```

---

## 9. Open Questions / Out of Scope

- **Unsubscribe:** Out of scope for MVP. Add `List-Unsubscribe` header in a follow-up UC.
- **A/B testing subjects:** Out of scope. Run sequence as specified; optimize later.
- **Tracking opens/clicks:** Resend provides this natively; Dev can enable it but not required for this UC.
- **Re-engagement after Day 15:** Out of scope. After Day 15, agent is considered churned.
