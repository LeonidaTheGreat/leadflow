# PRD: Revenue Alert — Critical Action Plan

**Status:** ACTIVE  
**Priority:** P1 BLOCKER  
**Scope:** Revenue gap closure strategy & prioritized use cases  
**Owner:** Product Manager  
**Created:** 2026-03-31  
**Revision:** 1.0

---

## EXECUTIVE SUMMARY

**Alert:** $0 MRR vs. $20K target with 46 days remaining (Day 45/90).  
**Root Cause:** Zero paying customers — all 265 signups are test fixtures. No real agents recruited yet.  
**Gap:** $9,890 behind expected run rate at this stage.  
**Critical Blocker:** Pilot recruitment decision waiting on Stojan approval.

**This PRD Delivers:**
1. Analysis of current conversion funnel bottlenecks
2. Reprioritized use cases ranked by revenue impact  
3. Three specific high-impact actions to close the gap
4. Machine-verifiable acceptance criteria to unblock dev work

---

## PART I: FUNNEL ANALYSIS & BOTTLENECK DIAGNOSIS

### Current State Metrics (Day 45 of 90)

| Stage | Volume | Status | Issue |
|-------|--------|--------|-------|
| Signups | 265 | Test/QC only | No real agent acquisition |
| Email Verified | 141 | Test/QC only | Verification working, wrong cohort |
| Onboarding Complete | 89 | Test/QC only | UX acceptable for test users |
| Dashboard Active | 52 | Test/QC only | Activation tracking working |
| **Trial Activation** | **0** | 🔴 CRITICAL | No paid tier trial started |
| **Paid Conversion** | **0** | 🔴 CRITICAL | Zero revenue |
| **Current MRR** | **$0** | 🔴 CRITICAL | Blocker: No real agents |

### Bottleneck 1: Acquisition (Worst Performer)
**Symptom:** 265 signups but all are test accounts. No real agents coming through landing page or paid acquisition.

**Why It's Broken:**
- Landing page exists but has zero organic traffic (no SEO, no ads running)
- No Facebook/Reddit strategy active
- No partnership outreach to FUB marketplace
- No referral loop (can't refer from zero paying customers)

**Evidence:**
- All signup emails: `e2e-flow-*@leadflow-test.com`, `qc-test-*`, `smoke-test-*`
- Zero real estate agent domain emails (e.g., no @johnsmithrealestate.com)
- Vercel analytics: No traffic from external sources

**Impact on Revenue:**
- Need 134 Pro agents ($149/mo) to hit $20K MRR OR 50 Pro + 40 Team
- Currently acquiring: 0 real agents/week
- **Required:** 3-4 new real agents/week to hit target by Day 90

**Fix Prioritization:** MEDIUM (depends on Blocker #2 resolution first)

---

### Bottleneck 2: Pilot Recruitment (CRITICAL BLOCKER)
**Symptom:** Cannot activate any paying customers without real agents.

**Why It's Blocked:**
- Waiting for Stojan approval to recruit 3-5 real agents
- Approval has been pending since Day 25 (3 weeks)
- PM/Marketing have recruitment script ready but cannot execute without go-ahead

**Impact on Revenue:**
- First 3-5 real agents = proof of concept
- Proof of concept = testimonials + case studies
- Case studies + testimonials = conversion rate lift on landing page
- Landing page conversion + organic = real agent acquisition funnel

**Fix Prioritization:** CRITICAL (blocks everything downstream)

**Action Required:** Insert DECISION item into dashboard (awaiting Stojan input).

---

### Bottleneck 3: Trial→Paid Conversion Flow
**Symptom:** No conversion mechanism from pilot→paid plan.

**Why It's Broken:**
- Trial countdown UI not built
- Email sequence to upgrade not triggered
- Pricing page exists but no contextual CTA from trial dashboard
- Lead activation flow incomplete (see below)

**What's Missing:**
1. **UC-DASHBOARD-TRIAL-COUNTDOWN** — Red countdown in dashboard showing "Your trial expires in X days"
2. **UC-TRIAL-EMAIL-SEQUENCE** — Automated emails on Day 5, Day 8 (last day) reminding agent of value
3. **UC-FIRST-LEAD-SUCCESS** — Ensure first real lead is visible in agent dashboard with AI response

**Impact on Revenue:**
- Even with 10 real agents in trial, none will convert if they don't see:
  - When trial ends (countdown)
  - Why they should pay (email reminder + ROI calculation)
  - How much value they got (leads processed + responses sent)

**Fix Prioritization:** HIGH (unblocks pilot→revenue conversion)

---

### Bottleneck 4: Lead Activation & Aha Moment (FUNCTIONAL)
**Status:** 🟢 Mostly working, minor gaps

**What's Working:**
- FUB integration live (webhook receiving leads)
- SMS sending via Twilio (tested)
- Lead simulator shows agent experience

**What's Broken:**
- Real lead count in pilot agents' dashboards: **0**
- Leads not flowing through FUB webhook in production (no Stojan FUB account configured)
- SMS delivery latency not verified (<30s SLA)
- Dashboard lead list shows test/simulator leads, not real leads

**Impact on Revenue:**
- Agent signs up → sees empty dashboard → cancels trial
- Agent never experiences aha moment (first lead, AI response in <30s)
- Without aha moment, no upgrade to paid plan

**Fix Prioritization:** MEDIUM-HIGH (unblocks aha moment for pilot agents)

---

## PART II: REPRIORITIZED USE CASES (Ranked by Revenue Impact)

### Tier 1: MUST DO (Revenue Critical)

#### UC-1: Pilot Recruitment Decision & Approval
**Description:** Get explicit go-ahead from Stojan to recruit 3-5 real agents with white-glove onboarding.

**Business Impact:** 
- Unblocks ALL downstream revenue work
- First 3 agents = $147-$745 MRR proof of concept
- Recruitment script ready, just waiting for signal

**Current Status:** 
- Spec: Complete (in existing PRD-REVENUE-RECOVERY-CRITICAL.md)
- Blocker: Awaiting human decision from Stojan
- Action Item: Already inserted into dashboard

**Owner:** Product Manager (awaiting Stojan input)  
**Priority:** P0 (BLOCKER)  
**Est. Timeline:** 1-2 days (decision only, no implementation)

**Acceptance Criteria:**
- [ ] Action item resolved in dashboard (Stojan approves or rejects)
- [ ] If approved: "Go signal: recruit 3-5 real agents"
- [ ] Marketing receives recruitment script + timeline

---

#### UC-2: Real Lead Activation in Pilot Agent Dashboards
**Description:** Ensure first 3-5 pilot agents receive & process real leads from FUB, see AI responses in dashboard.

**Business Impact:**
- Pilot agents experience aha moment ("AI responded in 30 seconds")
- Enables proof-of-concept testimonials
- Triggers upgrade consideration

**Current Status:**
- Spec: UC-PILOT-FIRST-LEAD-LIVE (in USE_CASES.md, status: ready)
- Gaps: Needs acceptance criteria + test data specification

**Owner:** Dev (Kimi model preferred)  
**Priority:** P0 (BLOCKER after pilot approval)  
**Est. Timeline:** 3-5 days (integration testing)

**Acceptance Criteria:**
```sql
UPDATE use_cases SET acceptance_checks = '[
  {"id": "lead-count-pilot-dashboard", "command": "curl https://leadflow-ai-five.vercel.app/api/leads?status=pilot | grep -c \"lead_id\"", "expected": ">0"},
  {"id": "sms-response-logged", "command": "grep -c \"ai_response_sent\" /path/to/logs | awk \"{print $1}\"", "expected": ">0"},
  {"id": "latency-under-30s", "command": "grep \"response_latency_ms\" /path/to/logs | awk -F: \"{if($2<30000) c++} END {print c}\"", "expected": ">0"}
]'::jsonb
WHERE id = 'UC-PILOT-FIRST-LEAD-LIVE';
```

**Dev Instructions:**
1. Query real_estate_agents table for pilot agents (created via white-glove recruitment)
2. Configure FUB webhook to route pilot agent leads to their accounts
3. Verify SMS responses appear in agent dashboard within 30s
4. Test with 3 sample lead payloads from PMF (see test data below)

**Test Data (FUB Lead Example):**
```json
{
  "lead_id": "test_lead_001",
  "lead_source": "fub_webhook",
  "lead_phone": "+1-555-0100",
  "lead_email": "buyer@example.com",
  "property_address": "123 Main St, Seattle WA",
  "agent_id": "pilot_agent_001",
  "lead_received_at": "2026-03-31T18:30:00Z",
  "expected_ai_response": "Hi! Thanks for your interest in 123 Main St. What timeline are you thinking for your purchase?",
  "expected_sms_delivery_time_ms": 15000
}
```

---

#### UC-3: Trial Countdown + Email Sequence
**Description:** Activate trial expiration visibility and upgrade reminder emails for pilot agents.

**Business Impact:**
- Pilot agents see "Trial expires in 5 days" countdown in dashboard
- Day 5 email: "You've processed X leads and gotten Y responses — see your ROI"
- Day 8 email (final): "Your trial ends tomorrow. Upgrade to Pro and never miss a lead."
- Conversion rate target: 60% of pilot agents → paid

**Current Status:**
- Spec: uc-trial-email-sequence (in USE_CASES.md, status: in_progress)
- Gaps: Email template unclear, countdown UI not specified

**Owner:** Dev (email delivery) + Marketing (copy)  
**Priority:** P0 (BLOCKER for conversion)  
**Est. Timeline:** 5-7 days (email setup + UI)

**Acceptance Criteria:**
```sql
UPDATE use_cases SET acceptance_checks = '[
  {"id": "countdown-visible", "command": "curl https://leadflow-ai-five.vercel.app/dashboard -H \"Cookie: auth-token=pilot-agent-token\" | grep -c \"Trial expires in\"", "expected": "1"},
  {"id": "email-sent-day5", "command": "SELECT COUNT(*) FROM emails WHERE template_id=\"trial_day5\" AND agent_id LIKE \"pilot_%\" AND sent_at > NOW() - INTERVAL 24 HOUR", "expected": ">0"},
  {"id": "email-sent-day8", "command": "SELECT COUNT(*) FROM emails WHERE template_id=\"trial_day8\" AND agent_id LIKE \"pilot_%\" AND sent_at > NOW() - INTERVAL 24 HOUR", "expected": ">0"}
]'::jsonb
WHERE id = 'uc-trial-email-sequence';
```

**Email Template 1 (Day 5 — Mid-Trial Engagement):**
```
Subject: Your LeadFlow AI is already working for you 🚀

Hi [Agent Name],

It's only been 5 days and look what's happened:
- Leads received: [X]
- AI responses sent: [Y]  
- Booking rate: [Z]%

Your competition is paying for leads. You're getting automatic responses.

Ready to never miss a lead again? Upgrade to Pro and get unlimited SMS.

[Upgrade CTA]
```

**Email Template 2 (Day 8 — Final Offer):**
```
Subject: Your trial ends tomorrow — here's what you're getting back to

Hi [Agent Name],

Tomorrow, LeadFlow AI goes away unless you upgrade to Pro.

For just $149/month, you keep:
- 24/7 AI lead responses
- Automatic follow-ups
- Full FUB integration
- Booking tracking

Your competitors will be back to missing leads.

[Keep Going Pro CTA] | [Questions? Contact us]
```

**Dashboard Countdown UI Specification:**
```
Location: Top of /dashboard
Style: Red warning banner
Content: "🕐 Your trial expires in [5/4/3/2/1/0] days — [Upgrade to Pro]"
Logic: Show from day 7 until trial expires
CTA: Links to /settings/billing?tab=upgrade
```

---

### Tier 2: SHOULD DO (Conversion Enhancement)

#### UC-4: Landing Page Optimization (Attribution & Copy Clarity)
**Description:** Add UTM tracking, testimonials, and clearer pricing to drive real agent signups.

**Business Impact:**
- Today: Landing page has 0 real agent signups (all traffic is internal QC/smoke tests)
- With optimization: 5-10% conversion from real traffic → signups
- Revenue path: Real signups → trial → paid conversion

**Current Status:**
- Spec: feat-landing-page-conversion-cleanup (status: complete, but can be enhanced)
- Gaps: No UTM parameter tracking, no testimonials added yet (because we have no pilot agents yet)

**Owner:** Marketing (copy) + Dev (UTM implementation)  
**Priority:** P1 (HIGH after pilot launch)  
**Est. Timeline:** 7-10 days (design → copy → dev)

**Acceptance Criteria:**
```sql
UPDATE use_cases SET acceptance_checks = '[
  {"id": "utm-tracking", "command": "curl https://leadflow-ai-five.vercel.app/?utm_source=facebook&utm_medium=cpc | grep -c \"utm_\"", "expected": "1"},
  {"id": "testimonial-count", "command": "curl https://leadflow-ai-five.vercel.app | grep -c \"class.*testimonial\"", "expected": ">2"},
  {"id": "pricing-visible", "command": "curl https://leadflow-ai-five.vercel.app | grep -c \"\\$149\"", "expected": ">0"}
]'::jsonb
WHERE id = 'UC-LANDING-PAGE-OPTIMIZATION';
```

**Depends On:** UC-1 (Pilot approval) + UC-2 (First agents live) to get testimonials

---

#### UC-5: Proof-of-Concept Content (Case Study + Testimonials)
**Description:** Document and publish first pilot agent success story.

**Business Impact:**
- Once 3 pilot agents live, capture their aha moments on video/text
- Publish 1-2 case studies showing: "AI handled X leads, generated $Y in commissions"
- Social proof drives 20-30% higher conversion on landing page

**Current Status:**
- Spec: UC-PILOT-SUCCESS-CONTENT (in USE_CASES.md, status: not started)
- Gaps: Needs acceptance criteria, pilot agent recruitment not started

**Owner:** Marketing (with PM + Stojan interviews)  
**Priority:** P1 (HIGH, but dependent on pilot launch)  
**Est. Timeline:** 5-7 days after first agents go live

**Acceptance Criteria:**
```sql
UPDATE use_cases SET acceptance_checks = '[
  {"id": "case-study-published", "command": "curl https://leadflow-ai-five.vercel.app/blog | grep -c \"case study\\|success story\"", "expected": "1"},
  {"id": "video-testimonial", "command": "curl https://leadflow-ai-five.vercel.app | grep -c \"testimonial-video\\|youtube.com\"", "expected": ">0"},
  {"id": "metrics-visible", "command": "curl https://leadflow-ai-five.vercel.app | grep -c \"leads processed\\|responses sent\\|booking rate\"", "expected": ">0"}
]'::jsonb
WHERE id = 'UC-PILOT-SUCCESS-CONTENT';
```

---

### Tier 3: COULD DO (Long-Term Growth)

#### UC-6: Paid Acquisition Channels (Facebook + Reddit)
**Description:** Launch paid ads and organic outreach to drive agent signups at scale.

**Business Impact:**
- Tier 1-2 use cases prove concept with pilot agents
- Once conversion rate + unit economics validated, scale to 50-100 agents
- Facebook/Reddit CAC target: $50-100/agent (at $149 LTV)

**Current Status:**
- Spec: Not started
- Waiting on: Pilot success data to finalize CAC/LTV assumptions

**Owner:** Marketing  
**Priority:** P2 (START AFTER Day 60)  
**Est. Timeline:** 14-21 days (setup + optimization)

---

## PART III: THREE CRITICAL ACTIONS TO CLOSE THE REVENUE GAP

### Action 1: Pilot Recruitment Approval (DO NOW — Day 45)
**Owner:** Product Manager (awaiting Stojan)

**What:**
- Insert DECISION action item into dashboard
- Title: "Pilot Recruitment Go-Ahead — Approve 3-5 Real Agent Recruitment"
- Awaiting: Stojan decision
- Impact: Unblocks $9,890+ MRR potential

**Success:** Stojan approves or rejects within 24 hours. If approved, workflow triggers:
- Marketing recruits 3-5 real agents (Days 46-50)
- Agents onboard with white-glove support (Days 51-55)
- First leads flow through FUB (Days 56-60)

**Decision Item Already In Dashboard:** ✓ (inserted by previous PM task)

---

### Action 2: Lead Activation Testing (DAYS 51-55 — after approval)
**Owner:** Dev (Kimi model)

**What:**
- After first 3-5 pilot agents recruited (UC-1 approval)
- Verify real leads flow from FUB → agent dashboard → SMS response
- Test with sample lead payloads (provided in UC-2 spec above)
- Confirm <30s latency SLA

**Success Criteria:**
- [ ] 3 test leads processed with <30s response
- [ ] Leads visible in all pilot agent dashboards
- [ ] SMS delivery confirmed (Twilio logs)
- [ ] Agent can see AI response in UI

**Dependency:** UC-1 approval (pilot agents recruited)

**Timeline:** 3-5 days

---

### Action 3: Trial Countdown + Email Sequence (DAYS 56-62)
**Owner:** Dev + Marketing

**What:**
- Activate trial countdown UI in pilot agent dashboards
- Configure email sequence (Day 5, Day 8 templates)
- Test with pilot agents (send to email + verify delivery)

**Success Criteria:**
- [ ] Countdown visible in dashboard for all trial agents
- [ ] Emails trigger automatically on Day 5 + Day 8
- [ ] At least 1 pilot agent converts to Pro (proof of conversion flow)

**Dependency:** UC-2 completion (leads flowing)

**Timeline:** 5-7 days

**Target Outcome:** By Day 62, have:
- 3-5 real pilot agents with leads flowing
- At least 1 agent upgraded to Pro ($149/mo)
- **MRR: $149-$745** (proof of concept achieved)

---

## PART IV: DEPENDENCIES & UNBLOCK SEQUENCE

```
Day 45: Action 1 (Decision) → Stojan approves
         ↓
Day 46-50: Marketing recruits 3-5 real agents
         ↓
Day 51-55: Action 2 (Lead Activation) → Dev verifies FUB → agent dashboard flow
         ↓
Day 56-62: Action 3 (Trial Countdown) → First agent converts to paid
         ↓
Day 63+: Scale with testimonials + content + ads (Tier 2 & 3 UCs)
```

**If Day 45 Decision is NO:** Revenue target becomes unachievable. Pivot required (document in separate PRD).

---

## PART V: FAILURE MODES & RECOVERY

### Failure: Lead Activation Breaks in Production
**Signal:** Pilot agents see zero leads despite FUB webhook firing.
**Root Cause:** 
- FUB webhook → database write failing (permissions?)
- Database → dashboard query missing filter (showing all leads, not just theirs?)
- Dashboard UI renders but no data visible

**Recovery:**
1. Dev immediately runs diagnostic: Check FUB logs + database lead counts
2. If leads exist in database but not visible in UI: design issue (quick fix)
3. If leads not in database: FUB integration issue (longer fix, may need Stojan API credentials)
4. If unrecoverable: Fallback to lead simulator for pilot demo (not ideal, but prevents total failure)

---

### Failure: Email Delivery Non-Functional
**Signal:** Pilot agents never receive Day 5 / Day 8 emails.
**Root Cause:** 
- RESEND_API_KEY not set in Vercel
- Email template malformed
- Send endpoint errors silently

**Recovery:**
1. Verify RESEND_API_KEY is configured in Vercel project settings
2. Check email logs (if available) for send errors
3. If broken, fall back to manual email reminder from Stojan (less scalable)
4. QC can manually verify email sending on test agents first

---

### Failure: First Pilot Agent Doesn't Convert to Paid
**Signal:** After 8-day trial, agent doesn't upgrade despite active leads.
**Root Cause:**
- Agent didn't see leads (activation issue, see above)
- Countdown/email not visible or not received
- Agent doesn't believe in ROI (not enough leads processed)
- Pricing too high for their use case

**Recovery:**
1. Stojan calls agent personally (white-glove recovery attempt)
2. Offer discount: First month 50% off to prove ROI
3. Escalate to Stojan/PM for product feedback (pricing/feature gap?)
4. Document feedback for post-pilot review

**Impact:** Delays proof of concept by 5-7 days. Plan for contingency.

---

## PART VI: SUCCESS METRICS

| Metric | Target | Timeline |
|--------|--------|----------|
| Pilot agents recruited | 3-5 | Days 46-50 |
| Leads flowing to agents | >5 per agent | Days 56-60 |
| First paid conversion | 1+ agents | Days 61-65 |
| Trial→Paid conversion rate | 60%+ | Days 61-65 |
| MRR from pilot agents | $147-$745 | Days 61-65 |
| Landing page signups (real agents) | 5-10/week | After testimonials (Day 70+) |
| Total MRR by Day 90 | $9,000-$15,000 | Target (escalate if <$5K) |

---

## PART VII: WHEN THIS PRD IS COMPLETE

This PRD is complete when:

1. ✅ Pilot recruitment decision resolved (Stojan approves/rejects)
2. ✅ UC-1, UC-2, UC-3 have updated acceptance_checks in Supabase
3. ✅ Dev team has clear test data + success criteria (provided above)
4. ✅ Marketing has email templates + landing page optimization spec
5. ✅ Timeline is realistic and achievable within 46-day window
6. ✅ Failure modes documented + recovery plans clear

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-03-31 | Initial comprehensive revenue action plan |

