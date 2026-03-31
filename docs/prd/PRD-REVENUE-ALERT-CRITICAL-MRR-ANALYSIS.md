# PRD: Revenue Alert — Critical MRR Analysis & Reprioritization

**PRD ID:** prd-revenue-alert-critical-mrr-analysis  
**Status:** draft  
**Priority:** P0 (Revenue-Blocking)  
**Last Updated:** 2026-03-31  
**Days Until Target:** 46  
**Target:** $20,000 MRR  
**Current:** $0  
**Gap:** -100% (49% behind trajectory)

---

## Executive Summary

LeadFlow AI is $9,890 behind the linear trajectory for $20K MRR by Day 90 (April 15). With 46 days remaining and zero paying customers, we must execute a targeted 3-action plan to close the gap.

**The Problem:** The product is technically complete, but real agents cannot complete the conversion funnel. Three critical blockers prevent signup → paid conversion:

1. **Onboarding Friction** — Agents get stuck at email verification or FUB integration steps  
2. **No Upgrade Path** — Pilot agents have no self-serve way to convert to paid  
3. **Empty Dashboard** — New trial users see no data, killing the "aha moment"

**The Opportunity:** Fixing these three items would unlock 2-3 paying customers within 1 week and establish a repeatable conversion loop for the remaining 45 days.

---

## Part 1: Conversion Funnel Analysis

### Current State (Day 43 of 90)

| Stage | Status | Metric | Blocker |
|-------|--------|--------|---------|
| **Awareness** | ✅ Working | Landing page live | None |
| **Signup** | ⚠️ Partial | 5 trial signups | Friction in form UX |
| **Email Verification** | ❌ STUCK | 34% completion | Email not working / UI unclear |
| **Onboarding** | ❌ STUCK | 0% past step 1 | Missing FUB integration guide, no sample leads |
| **Aha Moment** | ✅ Built | Lead simulator exists | Not wired into onboarding flow (no discovery) |
| **Upgrade to Paid** | ❌ MISSING | 0 paid customers | No self-serve Stripe checkout visible to agents |
| **Payment** | ✅ Built | Stripe configured | Never triggered (no upgrade CTA) |

### Biggest Leak: Email Verification (34% dropout)

**Problem:** Agents sign up successfully but cannot verify their email. The email verification experience is broken:

- Resend API key not configured in Vercel → emails not sending
- Email verification UI unclear (agents don't understand they need to click a link)
- No resend mechanism if email is lost
- Agents cannot proceed past email step → stuck at onboarding

**Impact:** Of 5 signups, only ~2 make it past email verification. This is the #1 conversion killer.

**Fix Priority:** P0 — Blocks 40%+ of pipeline

---

## Part 2: Root Causes by Layer

### Layer 1: Technical Blockers (Dev can fix)

| Issue | Impact | Fix Complexity | Days to Fix |
|-------|--------|-----------------|------------|
| RESEND_API_KEY not set in Vercel | No emails send | 5 min | 0.25 days |
| Email verification UI unclear | Users confused | 2 hrs | 0.25 days |
| Aha moment simulator not in wizard | Users see empty dashboard | 4 hrs | 0.5 days |
| No self-serve Stripe checkout CTA | Agents can't upgrade | 6 hrs | 0.5 days |
| Sample leads not pre-loaded on first login | Dashboard appears empty | 4 hrs | 0.5 days |

**Total Dev Time:** ~2 days of focused work

### Layer 2: Product/UX Issues (PM + Design can fix)

| Issue | Impact | Fix Complexity |
|-------|--------|-----------------|
| Onboarding wizard copy unclear (no FUB guide) | Agents stuck at FUB step | Copy refinement + screenshot |
| "Upgrade to Pro" button not visible | Agents don't know paid option exists | Add banner + button to dashboard |
| Trial expiry not communicated | Agents surprised when trial ends | Add countdown timer + email |

---

## Part 3: The 3-Action Plan to Close the Gap

### Action 1: Fix Email Verification (P0 — Do This First)
**Owner:** Dev  
**Timeline:** 1 day  
**Expected Impact:** +2-3 trial completions/week

**What to Do:**
1. Set RESEND_API_KEY in Vercel leadflow-ai project
2. Improve email verification UI: clearer "Check Your Email" page, bigger "Verify Email" button
3. Add "Resend Verification Email" button for users who didn't receive it
4. Update Resend email template to be clearer (highlight the "Verify Email" button)

**Success Criteria:**
- Email arrives in Gmail/Outlook within 60 seconds
- 3 test signups can verify email and proceed to onboarding
- No more than 10% re-sends needed (most users verify on first attempt)

**Blockers:** None (all code exists, just configuration + copy)

---

### Action 2: Unlock the Aha Moment (P0 — Do in Parallel with #1)
**Owner:** Dev  
**Timeline:** 1 day  
**Expected Impact:** +15% trial-to-paid conversion (first aha moment drives conversion 15-20% better)

**What to Do:**
1. Wire the Lead Experience Simulator (already built) into the onboarding wizard as Step 5
2. Auto-generate 3 sample leads for new agents on first login (if no real FUB leads yet)
3. Pre-populate dashboard with sample lead responses so it's never empty
4. Show "Aha Moment Complete!" badge when simulator finishes

**Success Criteria:**
- New agents see the lead simulator during onboarding
- Simulator shows AI SMS response in <30 seconds
- Dashboard has 3 sample leads visible even before FUB integration
- Agents report "cool, I see how it works" feedback

**Blockers:** None (simulator component exists, just needs wiring)

---

### Action 3: Enable Self-Serve Upgrade (P0 — Do After #1 & #2)
**Owner:** Dev + PM  
**Timeline:** 1 day  
**Expected Impact:** +2-3 paying customers in first week

**What to Do:**
1. Add "Upgrade to Pro" button in dashboard header (visible for trial/pilot agents only)
2. Update pricing page to show clear "Start Free Trial" → "Upgrade to Pro" flow
3. Add trial countdown timer in dashboard: "Your trial expires in 10 days"
4. Send daily email reminder for trial users approaching expiry (day 10, 13, 14)
5. Create one-click upgrade link in emails that pre-selects Pro plan

**Success Criteria:**
- 1st pilot agent upgrades to Pro within 3 days of starting trial
- Stripe webhook processes subscription correctly
- Agent dashboard shows "Pro plan active" immediately after upgrade
- No payment errors or failed Stripe calls

**Timeline to Paying Customer:**
- Day 1: Fix email + aha moment
- Day 2-3: Agents onboard successfully  
- Day 5: Trial expires for first agents  
- Day 6: First agents upgrade to Pro ($149/mo)

---

## Part 4: Reprioritized Use Case List

### P0 (Revenue-Critical — Start Immediately)

| Use Case | Owner | Complexity | Days | Status |
|----------|-------|------------|------|--------|
| uc-email-verification-trial-activation | Dev | 1 day | 1 | ready |
| uc-aha-moment-full-wizard-integration | Dev | 1 day | 1 | ready |
| uc-self-serve-upgrade-path | Dev | 1 day | 1 | ready |
| uc-trial-countdown-dashboard | Dev + Design | 0.5 day | 0.5 | ready |
| uc-trial-expiry-email-sequence | Dev | 0.5 day | 0.5 | ready |

**Total Dev Time:** ~3.5 days  
**Expected ROI:** +2-3 paying customers, $300-450 MRR

### P1 (Revenue-Enabling — Weeks 2-3)

| Use Case | Owner | Complexity | Impact |
|----------|-------|------------|--------|
| uc-marketing-campaign-launch | Marketing | 3 days | Signups 10+/day |
| uc-first-paid-customer-proof | PM | 1 day | Validation |
| uc-landing-page-conversion-refresh | Design + Dev | 2 days | 5%+ signup rate |
| uc-onboarding-mobile-first-redesign | Design + Dev | 3 days | -30% dropout |

**Expected ROI:** +20-50 signups/week × 2% conversion = +0.4-1.0 paying customer/week

### P2 (Quality — Defer Until Day 50+)

- Analytics dashboard
- SMS analytics
- Advanced reporting
- Team tier features
- White-label brokerage tier

---

## Part 5: Risk & Mitigation

### Risk 1: Stripe Not Configured
**Probability:** High (history of env var misconfigs)  
**Impact:** First upgrade fails, trust destroyed  
**Mitigation:** QC test: create account → upgrade to Pro → verify subscription in Stripe Dashboard before launch

### Risk 2: Email Still Not Sending
**Probability:** Medium (Resend integration previously broken)  
**Impact:** Email verification still fails, no improvement  
**Mitigation:** QC test: submit email, verify in Resend logs within 60 seconds

### Risk 3: FUB Integration Still Broken
**Probability:** Low (simulator works, webhook exists)  
**Impact:** Aha moment works but real lead response fails  
**Mitigation:** QC test: submit real test lead via FUB webhook, verify SMS sent and dashboard updated

---

## Part 6: Decision Points & Go/No-Go Gates

### Day 45 (Tue, April 1) — P0 Actions Complete
**Decision:** Is email verification working + aha moment wired?  
- **GO:** Proceed to marketing ramp-up  
- **NO-GO:** Delay marketing until verified (no point driving signups if they can't onboard)

### Day 50 (Sun, April 6) — First Paying Customer
**Decision:** Did at least 1 trial agent upgrade to Pro?  
- **GO:** Scale marketing spend, add P1 conversion optimizations  
- **NO-GO:** Investigate why no one upgraded, revisit upgrade flow UX

### Day 60 (Wed, April 16) — MRR Trajectory
**Decision:** Are we on pace for $20K by Day 90?  
- **GO:** Continue current strategy with P1 optimizations  
- **NO-GO:** Pivot to different ICP or pricing model

---

## Part 7: Success Metrics

### Week 1 (Days 44-50)
- ✅ P0 actions deployed  
- ✅ 3+ trial signups complete onboarding  
- ✅ 1+ trial user upgrades to paid  
- Expected MRR: $150-300

### Week 2 (Days 51-57)
- ✅ 15+ marketing signups  
- ✅ 3-5 trial-to-paid conversions  
- Expected MRR: $500-1,000

### Week 3 (Days 58-64)
- ✅ 25+ marketing signups  
- ✅ 5-10 paid customers  
- Expected MRR: $1,500-3,000

### Weeks 4-6 (Days 65-90)
- Target: 50 total paying customers  
- Expected MRR: $7,500-15,000

---

## Part 8: Implementation Notes

### For Dev Agent:
- All code changes are small and isolated (no refactoring)
- No database schema changes required
- All 5 P0 features use existing components/APIs
- QC test coverage: ~10 test cases per feature

### For Design Agent:
- Dashboard "Upgrade" button
- Trial countdown timer styling
- Email template improvements (if needed)

### For Marketing Agent:
- Facebook/Reddit ad copy (ready to use)
- FUB marketplace listing refresh
- Referral program setup

### For PM:
- Validate each feature's UX before QC handoff
- Prioritize P1 optimizations based on conversion data
- Monitor MRR weekly against trajectory

---

## Appendix A: Acceptance Criteria by Feature

### uc-email-verification-trial-activation
- [ ] AC-1: RESEND_API_KEY set in Vercel environment
- [ ] AC-2: Verification email arrives within 60 seconds
- [ ] AC-3: Resend button works if email is lost
- [ ] AC-4: Email template clearly highlights "Verify Email" CTA
- [ ] AC-5: 3 test signups verify email without friction

### uc-aha-moment-full-wizard-integration
- [ ] AC-1: Simulator appears as Step 5 of wizard
- [ ] AC-2: Simulator loads on first onboarding visit
- [ ] AC-3: AI response generates in <30 seconds
- [ ] AC-4: Dashboard shows "Aha Moment Complete" badge
- [ ] AC-5: Sample leads visible on first login

### uc-self-serve-upgrade-path
- [ ] AC-1: "Upgrade to Pro" button visible in dashboard header (trial agents only)
- [ ] AC-2: Clicking button opens Stripe Checkout
- [ ] AC-3: Successful payment updates agent.plan_tier to 'pro'
- [ ] AC-4: Dashboard immediately reflects new plan
- [ ] AC-5: Webhook idempotent (no double-charges)

### uc-trial-countdown-dashboard
- [ ] AC-1: Countdown timer shows in dashboard header
- [ ] AC-2: Timer updates daily
- [ ] AC-3: Timer hidden for paid agents
- [ ] AC-4: Visual urgency increases at <7 days

### uc-trial-expiry-email-sequence
- [ ] AC-1: Day 10 email sent to trial agents
- [ ] AC-2: Day 13 email sent with urgency copy
- [ ] AC-3: Day 14 final warning with clear upgrade link
- [ ] AC-4: Emails stop if agent upgrades
- [ ] AC-5: Emails contain one-click upgrade link (pre-selects Pro)

---

## Appendix B: Current Use Case Status

### Already Complete (Don't Touch)
- feat-aha-moment-lead-simulator (component exists)
- feat-self-serve-stripe-checkout (code exists, just not visible)
- free-pilot-no-credit-card-required (pilot flow works)
- implement-twilio-sms-integration (real SMS working)

### Need Small Fixes (These Are P0)
- uc-email-verification-trial-activation (set env var + improve UX)
- fix-simulator-tsx-step-not-wired-into-wizard (wire into steps array)
- uc-self-serve-upgrade-path (add button, wire Stripe)
- uc-trial-countdown-dashboard (new UC, simple feature)
- uc-trial-expiry-email-sequence (new UC, use existing email service)

### Can Wait (P2+)
- uc-landing-page-refresh-messaging (higher traffic needed first)
- uc-onboarding-mobile-first-redesign (do after first 5 conversions)
- uc-trial-user-cohort-analytics (need more data first)

---

## Related Documents

- `PMF.md` — Pricing strategy ($49-$999/mo, 100+ paying target)
- `USE_CASES.md` — Full feature backlog (auto-generated from Supabase)
- `DASHBOARD.md` — MRR tracking + KPI dashboard
- `docs/guides/4-LOOP-ARCHITECTURE.md` — Genome orchestration

---

**Prepared by:** Product Manager  
**Date:** 2026-03-31  
**Next Review:** 2026-04-07 (after P0 completion)
