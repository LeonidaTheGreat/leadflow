# PRD-LEADFLOW-TRIAL-CONVERSION-SPRINT-002

**Status:** P0 — Revenue Blocker  
**Type:** Conversion Sprint (Human-Executed)  
**Author:** PM Agent  
**Date:** 2026-05-08  
**Task:** f648431c-b231-4b17-b350-6cbaaa926d70

---

## Situation (Database-Authoritative, 2026-05-08)

| Funnel Stage | Count | Notes |
|---|---|---|
| Pilot signups | 35 | 19 lead magnet, 16 directory outreach |
| Follow-up emails sent | 0 | `follow_up_sent = false` for all 35 |
| Agents in DB | 61 | |
| At onboarding step 0 (inactive) | 60 | Never activated |
| Completed onboarding (step 99) | 3 | **All are Stojan's own test accounts** |
| Active trials (real users) | 0 | `madzunkov@gmail.com` is the 1 "trialing" — test account |
| Paying customers | 0 | 0 subscriptions, 0 customers |
| Trial to Paid Conversion | undefined | Denominator is 0 — no real users in trial |

**Critical finding:** "Trial to Paid Conversion = 0%" is not a conversion problem. It is a pre-trial problem. There are no real trial users. The entire conversion funnel is blocked upstream.

---

## Root Cause Chain

```
Email domain not verified (Resend rejects @landyourleads.com)
  → 35 pilot signups received 0 follow-up emails
    → 60/61 agents stuck at onboarding step 0 (never activated)
      → 0 real users started a trial
        → Trial to Paid Conversion = 0/0 = undefined
```

The code for trial-to-paid conversion is complete and tested (PRD-TRIAL-TO-PAID-CONVERSION-PATH.md, shipped 2026-04-04). The upgrade path, Stripe checkout, trial email sequences, and countdown banner all exist. They are unreachable because no real user has ever entered a trial.

---

## Blocker 1 (P0): Email Domain — Human Action Required

**Problem:** `EmailService` sends from `stojan@landyourleads.com`. This domain is not verified with Resend. All transactional emails silently fail.

**Why dev agents can't fix this:** Domain verification requires Resend dashboard access and DNS records at the registrar — not code. Dev agents have attempted this UC 5 times (all cancelled/failed).

**What Stojan must do:**

Option A (permanent — recommended):
1. Log into Resend dashboard → Domains → Add `landyourleads.com`
2. Add the SPF/DKIM/DMARC DNS records at the domain registrar
3. Wait for verification (minutes to hours)
4. No code change needed

Option B (immediate unblock, temporary):
1. Vercel dashboard → `fub-inbound-webhook` project → Environment Variables
2. Add `FROM_EMAIL=onboarding@resend.dev`
3. Confirm `RESEND_API_KEY` is present and non-empty
4. Redeploy: `cd ~/projects/leadflow && vercel --prod`
5. Note: resend.dev emails land in spam. Switch to verified domain ASAP.

**Verification:**
```bash
node -e "
const EmailService = require('./lib/services/EmailService');
const svc = new EmailService();
svc.send({ to: 'madzunkov@gmail.com', subject: 'Test', html: '<p>test</p>' })
  .then(r => { console.log(r); process.exit(r.success ? 0 : 1); });
"
```

---

## Blocker 2 (P1): Activate the 35 Pilot Signups

Once email works, trigger an activation blast to all 35 `pilot_signups` where `follow_up_sent = false`.

**Target list:**

```sql
SELECT email, name, source, created_at::date
FROM pilot_signups
WHERE follow_up_sent = false
ORDER BY source = 'lead_magnet' DESC, created_at DESC;
```

The 19 lead-magnet signups are the highest-intent group — they opted in proactively. Contact them first.

**Action:** Use the existing `/admin/activation-outreach` endpoint (or the `feat-pilot-signup-invitation-pipeline` UC which is complete) to trigger invitation emails. If the endpoint doesn't exist yet, send manual emails with a personal tone from Stojan's email.

---

## Blocker 3 (P1): Personal Outreach to Top 10

The highest-leverage action available today — independent of email domain fix:

**Stojan sends personal emails to these signups:**

| Priority | Email | Name | Source | Signal |
|---|---|---|---|---|
| 1 | pamela@domidesert.com | Pamela Manwaring | lead_magnet | Personal domain, high intent |
| 2 | alivia@theagencycharlotte.com | Alivia Wright | theagencycharlotte.com | Agency email |
| 3 | ashley@theagencycharlotte.com | Ashley Misiuda | theagencycharlotte.com | Agency email |
| 4 | amber@dealswithamber.com | Amber English | unitedrealestatedallas.com | Personal domain |
| 5 | alex@alexandrabooth.com | Alexandra Booth | centralmetro.com | Personal domain |

**Suggested message template:**
> Subject: Your LeadFlow AI pilot — quick question
>
> Hi [Name], I'm Stojan, founder of LeadFlow. You signed up for our pilot a while back and I wanted to reach out personally.
>
> We've been working with a small group of real estate agents to test AI lead response — responding to buyer inquiries in under 30 seconds, 24/7. The results have been strong and we're ready to bring on pilot users.
>
> Would you have 15 minutes for a quick call to see if it fits your workflow? I can show you exactly what it does live.
>
> [Cal.com booking link]

---

## What Is Already Built (Do Not Rebuild)

| Feature | Status | File |
|---|---|---|
| Trial countdown banner | ✅ Complete | `components/dashboard/TrialStatusBanner.tsx` |
| Upgrade page | ✅ Complete | `app/pricing/page.tsx` |
| Stripe checkout | ✅ Complete | `app/api/billing/create-checkout/route.ts` |
| Trial email sequence (4 templates) | ✅ Complete | `lib/trial-emails.ts` |
| Trial expiry middleware redirect | ✅ Complete | `middleware.ts` |
| Weekly performance email | ✅ Complete | UC `feat-weekly-performance-email` |
| Personal upgrade offer tool | ✅ Complete | UC `feat-personal-upgrade-offer-tool` |

No new features are required to get from 0% to 15% Trial to Paid Conversion. The conversion path exists — the blocker is that no real users have reached it.

---

## Sequenced Action Plan

| Step | Owner | Action | Unblocks |
|---|---|---|---|
| 1 | Stojan | Verify `landyourleads.com` in Resend OR set `FROM_EMAIL=onboarding@resend.dev` in Vercel | All email-dependent UCs |
| 2 | Stojan | Confirm `RESEND_API_KEY` in Vercel env for `fub-inbound-webhook` | Email delivery |
| 3 | Dev | Run activation email blast to 35 `pilot_signups` (use existing invite pipeline) | Trial starts |
| 4 | Stojan | Personal email outreach to top 5-10 signups (use template above) | Warm trial starts |
| 5 | Monitor | Watch `real_estate_agents` for first real agent at `subscription_status='trialing'` | Conversion sprint |
| 6 | Stojan | If trialing agent doesn't convert in 72h: send personal promo (PILOT90 code, $99 first month) | First paying customer |

---

## Success Criteria

```bash
# Step 1 done: email delivers
node -e "require('./lib/services/EmailService').send({to:'madzunkov@gmail.com',subject:'Test',html:'<p>ok</p>'}).then(r=>console.log(r.success))"
# → true

# Step 3 done: signups have been contacted
psql openclaw -c "SELECT COUNT(*) FROM pilot_signups WHERE follow_up_sent = true"
# → >0

# Step 5 reached: first real trial
psql openclaw -c "SELECT email FROM real_estate_agents WHERE subscription_status='trialing' AND email NOT LIKE '%madzunkov%' AND email NOT LIKE '%madjunkov%'"
# → at least 1 row

# Metric target: Trial to Paid Conversion ≥15%
# → requires ≥1 paying customer from a real trial cohort of ≥7
```

---

## What This PRD Does NOT Cover

- New features for the conversion path (all exist)
- SMS outreach (A2P registration is in-progress, separate blocker)
- Annual billing optimization (premature — no customers yet)
- Acquisition campaigns (parallel track, not a prerequisite)
