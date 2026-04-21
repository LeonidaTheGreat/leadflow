# PRD: Pilot Signup Follow-Up Sequence

**ID:** feat-pilot-signup-follow-up-sequence
**Status:** approved
**Priority:** P0
**Author:** PM Agent
**Created:** 2026-04-20

## Problem

The `pilot_signups` table collects email addresses from the lead magnet landing page. Currently has 20 rows (all test data as of 2026-04-20 — real signups will follow as marketing drives traffic). The pipeline must be ready before real signups arrive. Currently:

- They receive the `invite-pilot-signups.js` batch invite (one-shot), but no drip sequence.
- There is no time-based follow-up for those who don't accept the invite.
- No Cal.com booking link is included in outreach to reduce friction.
- 20 signups sit idle with zero conversion pipeline after initial invite.

**Existing infrastructure overlap — DO NOT duplicate:**
- `scripts/tasks/invite-pilot-signups.js` — already sends one invite email per signup. This PRD builds the *follow-up* sequence for non-responders, not a replacement for the initial invite.
- `scripts/pilots/outreach-manager.js` — manual outreach tracking for `pilot_recruitment_targets`. Different table, different audience. No overlap.

## Solution

A 3-email drip sequence triggered by the heartbeat for pilot signups who haven't converted to `real_estate_agents` accounts after receiving their initial invite.

## Detailed Requirements

### 1. Database Migration

```sql
ALTER TABLE pilot_signups ADD COLUMN follow_up_stage INTEGER DEFAULT 0;
ALTER TABLE pilot_signups ADD COLUMN last_follow_up_at TIMESTAMP WITH TIME ZONE;
```

- `follow_up_stage`: 0 = no follow-up sent, 1 = email #1 sent, 2 = email #2 sent, 3 = email #3 sent
- `last_follow_up_at`: timestamp of last follow-up email (used for timing gates)

**Why stage integer instead of boolean:** Allows idempotent progression through the sequence and easy extension to more emails later.

### 2. Email Sequence

**Timing (relative to `pilot_signups.created_at`):**

| Stage | Trigger | Subject |
|-------|---------|---------|
| 1 | Day 1 (or immediately for backfill) | "Your LeadFlow pilot is ready — let's get you set up" |
| 2 | Day 3 (if no account created) | "Quick question about your LeadFlow pilot" |
| 3 | Day 7 (if no account created) | "Last chance — pilot spots filling up" |

**Gate condition for ALL emails:** `pilot_signups.email NOT IN (SELECT email FROM real_estate_agents)`. If the agent already signed up, skip entirely and set `follow_up_stage = 3` (terminal).

#### Email #1 — Warm Intro + Booking Link

```
From: Stojan <stojan@leadflow.ai>
Subject: Your LeadFlow pilot is ready — let's get you set up

Hi {{name}},

Thanks for signing up for the LeadFlow pilot! I'm Stojan, the founder.

Here's what your free 30-day pilot includes:
• AI responds to your leads in under 30 seconds via SMS
• Automatic appointment booking to your calendar
• Follow Up Boss integration (no workflow changes)
• Direct line to me for feedback

Two options to get started:

1. Book a 15-min setup call (I handle everything):
   {{CAL_COM_LINK}}

2. Self-serve signup (takes ~3 minutes):
   {{SIGNUP_URL}}

Either way, you'll be live within 24 hours.

— Stojan
LeadFlow AI
```

#### Email #2 — Pain-Point + Direct CTA

```
From: Stojan <stojan@leadflow.ai>
Subject: Quick question about your LeadFlow pilot

Hi {{name}},

Quick question: how many leads came in while you were busy today?

The average agent misses 3-5 leads per day because they can't respond fast enough. 78% of deals go to the first responder.

Your pilot spot is still reserved. Sign up in 3 minutes:
{{SIGNUP_URL}}

Or book a quick call and I'll set it up for you:
{{CAL_COM_LINK}}

— Stojan
```

#### Email #3 — Urgency + Incentive

```
From: Stojan <stojan@leadflow.ai>
Subject: Last chance — pilot spots filling up

Hi {{name}},

This is my last email about this. We're filling pilot spots and yours has been reserved for a week.

If you sign up before {{DEADLINE}}, I'll add 50% off your first paid month after the free trial ends — no risk either way.

{{SIGNUP_URL}}

After this week, the spot goes to someone on the waitlist.

— Stojan
```

### 3. Email Logging

**Problem:** The existing `email_events` table has:
- `customer_id UUID NOT NULL` — pilot signups aren't customers yet
- CHECK constraint on `email_type` — doesn't include pilot follow-up types

**Solution:** Create a new `pilot_email_log` table (simpler, no constraint conflicts):

```sql
CREATE TABLE pilot_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_signup_id UUID NOT NULL REFERENCES pilot_signups(id),
  email_type TEXT NOT NULL, -- 'follow_up_1', 'follow_up_2', 'follow_up_3'
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed'
  resend_id TEXT, -- Resend API message ID for tracking
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_pilot_email_log_signup ON pilot_email_log(pilot_signup_id);
CREATE INDEX idx_pilot_email_log_type ON pilot_email_log(email_type);
```

### 4. Implementation: Heartbeat Job

New file: `scripts/tasks/pilot-signup-follow-up.js`

**Execution:** Called by the heartbeat (new step, or integrated into existing pilot-related step).

**Logic per run:**

```
1. Query pilot_signups WHERE follow_up_stage < 3
2. For each signup:
   a. Check gate: email NOT IN real_estate_agents → if found, set stage=3, skip
   b. Determine next email based on follow_up_stage and timing:
      - stage 0 + created_at > 24h ago (or backfill flag): send email #1, set stage=1
      - stage 1 + last_follow_up_at > 3 days ago: send email #2, set stage=2
      - stage 2 + last_follow_up_at > 4 days ago: send email #3, set stage=3
   c. Send via EmailService.send()
   d. Log in pilot_email_log
   e. Update pilot_signups.follow_up_stage and last_follow_up_at
3. Return summary: { sent: N, skipped: N, converted: N, errors: N }
```

**Idempotency:** The `follow_up_stage` + `last_follow_up_at` gate ensures re-running never sends duplicates.

### 5. Backfill

On first run (deploy), all 20 existing signups with `follow_up_stage = 0` and `created_at` older than 24h get email #1 immediately. The timing for subsequent emails starts from `last_follow_up_at`, not `created_at`.

### 6. Configuration

In `project.config.json` or as constants in the script:

```json
{
  "pilot_follow_up": {
    "cal_com_link": "https://cal.com/stojan-leadflow/15min",
    "signup_url": "https://leadflow-ai-five.vercel.app/signup",
    "email_1_delay_hours": 24,
    "email_2_delay_days": 3,
    "email_3_delay_days": 4,
    "from_email": "stojan@leadflow.ai",
    "from_name": "Stojan"
  }
}
```

## Acceptance Criteria

1. **Migration:** `pilot_signups` has `follow_up_stage INTEGER DEFAULT 0` and `last_follow_up_at TIMESTAMPTZ` columns
2. **Table:** `pilot_email_log` table exists with correct schema
3. **Backfill:** Running the script sends email #1 to all 20 existing signups where `follow_up_stage = 0` and they haven't created an account
4. **Logging:** Each sent email creates a row in `pilot_email_log` with correct `pilot_signup_id` and `email_type`
5. **Gate:** Signups whose email exists in `real_estate_agents` are skipped (stage set to 3)
6. **Idempotent:** Running twice does not send duplicate emails (verified by `follow_up_stage` not changing on second run)
7. **Timing:** Email #2 only sends 3+ days after email #1; email #3 only sends 4+ days after email #2
8. **Test:** INSERT a new `pilot_signup`, run script, verify `pilot_email_log` row created

## Verification Commands

```bash
# Migration applied
psql $LOCAL_PG_URL -c "\d pilot_signups" | grep follow_up_stage
psql $LOCAL_PG_URL -c "\d pilot_email_log"

# Backfill worked (after first run)
psql $LOCAL_PG_URL -c "SELECT count(*) FROM pilot_email_log WHERE email_type='follow_up_1'"
# Expected: ~20 (minus any already in real_estate_agents)

# Idempotent (run again)
node scripts/tasks/pilot-signup-follow-up.js
psql $LOCAL_PG_URL -c "SELECT count(*) FROM pilot_email_log WHERE email_type='follow_up_1'"
# Expected: same count as before

# Gate works
psql $LOCAL_PG_URL -c "SELECT ps.email, ps.follow_up_stage FROM pilot_signups ps JOIN real_estate_agents ra ON ps.email = ra.email"
# Expected: follow_up_stage = 3 for all matched
```

## Scope

### Files to create:
- `scripts/tasks/pilot-signup-follow-up.js` — main sequence runner
- Migration SQL (in `migrations/` directory)

### Files to modify:
- `lib/services/EmailService.js` — add `sendPilotFollowUp(stage, params)` convenience method (optional, can use `send()` directly)
- Heartbeat integration (add call to follow-up script in appropriate step)

### Do NOT touch:
- `scripts/tasks/invite-pilot-signups.js` (initial invite, different concern)
- `real_estate_agents` trial email sequence (different audience)
- `pilot_progress` table (different flow — post-signup tracking)
- Stripe billing or checkout
- `email_events` table (constraint conflicts, use new `pilot_email_log` instead)
- `pilot_recruitment_targets` / `outreach-manager.js` (manual outreach, different table)

## Technical Notes

- **Resend API:** Already configured via `RESEND_API_KEY` env var. EmailService handles circuit-breaking and retries.
- **Cal.com:** Use Stojan's personal booking page URL (configure in constants, not hardcoded in templates).
- **From address:** Use `stojan@leadflow.ai` (personal touch, not `onboarding@`). Must be verified in Resend.
- **Rate limiting:** Process signups sequentially with 500ms delay between sends to avoid Resend rate limits.
- **Error handling:** Log failed sends in `pilot_email_log` with `status='failed'` and `error_message`. Don't advance `follow_up_stage` on failure — retry on next heartbeat run.
