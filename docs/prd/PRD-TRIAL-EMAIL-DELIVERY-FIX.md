# PRD: Fix Trial Email Delivery — 0 of 344 Trial Agents Have Received Emails

**ID:** PRD-TRIAL-EMAIL-DELIVERY-FIX  
**Status:** active  
**Priority:** P0 — Revenue Blocker  
**Version:** 1.0  
**Date:** 2026-04-22  
**Author:** PM Agent  
**Linked UC:** fix-trial-email-delivery-zero-sent

---

## 1. Problem Statement

344 trial agents are registered. `trial_email_logs` has **0 rows**. No trial conversion emails have ever been sent. The entire trial-to-paid conversion email sequence is inoperable. This is the primary reason for 0% trial-to-paid conversion.

The code exists. The cron is scheduled (`vercel.json` → `/api/cron/send-trial-emails` at `0 10 * * *`). But nothing fires.

---

## 2. Root Cause Analysis

### Root Cause A: `getTrialAgents()` Returns 0 (Most Likely)

**File:** `product/lead-response/dashboard/lib/trial-emails.ts:50`

```typescript
async function getTrialAgents(): Promise<TrialAgent[]> {
  const { data, error } = await supabase
    .from('real_estate_agents')
    .select(...)
    .eq('subscription_status', 'trial')   // ← PROBLEM
    .eq('email_verified', true)
}
```

The query filters by `subscription_status = 'trial'`. But the trial signup flow (`/api/auth/trial-signup`) sets:
- `plan_tier = 'trial'` ✅
- `subscription_status` = unknown (likely left as default `'inactive'`)

If agents have `subscription_status = 'inactive'` with `plan_tier = 'trial'`, this query returns 0 agents and no emails ever fire. This is the most probable root cause given that the cron is configured and 0 emails have been sent across 344 agents over months.

**Fix:** Change the filter to use `plan_tier = 'trial'` instead of `subscription_status = 'trial'`.

### Root Cause B: `RESEND_API_KEY` Missing from Vercel

**File:** `product/lead-response/dashboard/lib/trial-emails.ts:9`

```typescript
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}
```

If `RESEND_API_KEY` is not set in Vercel env vars for the `leadflow-ai` project, the Resend client initializes with `undefined`, and all email sends fail silently (the error is caught and logged but the cron returns 200).

**Verify:** Check Vercel dashboard for `leadflow-ai` project → Settings → Environment Variables → confirm `RESEND_API_KEY` is set and valid.

### Root Cause C: Day Window Logic Permanently Excludes Most Agents

**File:** `product/lead-response/dashboard/lib/trial-emails.ts:552-579`

```typescript
if (daysSinceSignup === 0 && !agent.trial_email_welcome_sent) { ... }
else if (daysSinceSignup === 1 && !agent.trial_email_day1_aha_sent) { ... }
else if (daysSinceSignup === 3 && ...) { ... }
else if (daysSinceSignup === 7 && ...) { ... }
else if (daysSinceSignup >= 14 && ...) { ... }  // ← only these use >=
else if (daysSinceSignup >= 15 && ...) { ... }
```

Days 0, 1, 3, 7 use **strict equality (`===`)**. Any agent who signed up before the email system was deployed permanently misses those windows. 

Most agents registered months ago (day 79 of 90 at filing). All have `daysSinceSignup >> 15`. With strict equality, Days 0/1/3/7 never fire for them. Day 14/15 would fire (using `>=`) — but only if Root Cause A is fixed first.

**Fix:** Change Days 0, 1, 3, 7 to use `>=` with cascading unsent checks, so agents who missed early windows still get the most recent applicable email they haven't received.

---

## 3. Implementation Spec

### What to Change

**File:** `product/lead-response/dashboard/lib/trial-emails.ts`

**Change 1 — Fix `getTrialAgents()` filter (line 53):**

```typescript
// BEFORE
.eq('subscription_status', 'trial')

// AFTER
.eq('plan_tier', 'trial')
```

**Change 2 — Fix day window logic (lines 552-579):**

Replace strict equality with `>=` for all day windows, using cascade logic so each agent gets the highest-applicable unsent email:

```typescript
for (const agent of agents) {
  const daysSinceSignup = getDaysSinceSignup(agent.created_at)

  if (daysSinceSignup >= 15 && !agent.trial_email_day15_final_sent) {
    day15FinalAgents.push(agent)
  } else if (daysSinceSignup >= 14 && !agent.trial_email_day14_expired_sent) {
    day14ExpiredAgents.push(agent)
  } else if (daysSinceSignup >= 7 && !agent.trial_email_day7_warning_sent) {
    day7WarningAgents.push(agent)
  } else if (daysSinceSignup >= 3 && !agent.trial_email_day3_upgrade_sent && !agent.aha_completed) {
    day3UpgradeAgents.push(agent)
  } else if (daysSinceSignup >= 1 && !agent.trial_email_day1_aha_sent) {
    day1AhaAgents.push(agent)
  } else if (daysSinceSignup >= 0 && !agent.trial_email_welcome_sent) {
    welcomeAgents.push(agent)
  }
}
```

**Rationale for reverse cascade:** Send the most advanced applicable email first (an agent 20 days in shouldn't get a welcome email, they should get the Day 15 final recovery email). Each agent gets at most one email per cron run.

**Change 3 — Add cron response logging:**

The cron endpoint at `app/api/cron/send-trial-emails/route.ts` returns results but doesn't log agent count. Add logging:

```typescript
const agents = await getTrialAgents()
logger.info(`getTrialAgents() returned ${agents.length} agents`)
```

This ensures Vercel function logs show whether agents are being found.

### What NOT to Touch

- Email HTML templates (they are correct)
- Cron schedule in `vercel.json` (already correct: daily at 10:00 UTC)
- `supabase` import alias (it's a PostgREST client, not actual Supabase)
- `sendWelcomeEmail`, `sendDay1AhaEmail`, etc. functions (logic is correct)
- `trial_email_logs` table insert logic (correct, just never reached)

---

## 4. Verification Steps

After deploying the fix:

```bash
# 1. Trigger the cron manually (from Vercel dashboard or curl)
curl -X POST https://leadflow-ai-five.vercel.app/api/cron/send-trial-emails

# 2. Verify agents are now found
# Expected log line: "getTrialAgents() returned N agents" where N > 0

# 3. Verify emails sent
# Check trial_email_logs row count — should be > 0 after cron runs
# SELECT count(*) FROM trial_email_logs;

# 4. Verify specific email types sent
# SELECT email_type, count(*) FROM trial_email_logs GROUP BY email_type;
```

**Exit criteria:**
- `trial_email_logs` has > 0 rows after cron runs
- Vercel function logs show `getTrialAgents() returned N agents` where N > 0
- No errors in Vercel function logs for `send-trial-emails`

---

## 5. Pre-Fix Verification Required

**Before writing code**, dev must check:

1. Run this query against the local DB to understand actual agent statuses:
   ```sql
   SELECT subscription_status, plan_tier, count(*) 
   FROM real_estate_agents 
   WHERE email_verified = true 
   GROUP BY subscription_status, plan_tier;
   ```
   This confirms whether Root Cause A is real.

2. Check Vercel env vars for `leadflow-ai` project:
   ```bash
   vercel env ls --scope stojans-projects-7db98187
   ```
   Confirm `RESEND_API_KEY` is present.

If `subscription_status = 'trial'` IS the correct value for trial agents (not `'inactive'`), then Root Cause A is wrong — focus on Root Cause B (RESEND_API_KEY) first.

---

## 6. Human Action Required

**Stojan must:**
1. Verify `RESEND_API_KEY` is set in Vercel dashboard for `leadflow-ai` project
2. Manually trigger the cron after deployment to force emails to the 344 trial agents now
3. Send personal upgrade offer to the 11 pilot agents directly (use `feat-personal-upgrade-offer-tool` which is already built)

The personal pilot outreach is the fastest path to first revenue — 11 pilot agents who actively chose to participate are the highest-intent users in the funnel.

---

## 7. Priority Context

This is the **primary blocker** for trial-to-paid conversion. Every day this isn't fixed, trial agents expire without ever receiving a conversion nudge. The entire email-driven conversion funnel — Day 3 upgrade nudge, Day 7 warning, Day 14 expired, Day 15 final — is dead.

Fix this before any other conversion optimization work.

---

*Filed by PM Agent on Day 79 (2026-04-22). Data source: SCHEMA.md (trial_email_logs: 0 rows), trial-emails.ts code analysis, vercel.json cron config.*
