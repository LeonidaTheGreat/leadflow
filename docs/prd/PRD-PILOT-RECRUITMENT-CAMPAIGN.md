# PRD: Pilot Recruitment Campaign Launch

**PRD ID:** prd-pilot-recruitment-campaign  
**Status:** ACTIVE  
**Last Updated:** 2026-04-04  
**Owner:** Product Manager  
**Priority:** P1 (Revenue Critical)  
**Target Launch:** Immediate  
**Target Completion:** 30 days

---

## Executive Summary

**Objective:** Recruit 30 real estate agent pilots in 30 days to validate product market fit and generate first revenue ($0 → $2,000+ MRR by pilot completion).

**Scope:** Multi-channel pilot recruitment campaign across Facebook, Reddit, and LinkedIn targeting solo real estate agents, with messaging focused on "Free AI Lead Response" for 30 days.

**Success Criteria:**
- 30 pilot agents enrolled in free pilot program
- 3+ agents converting to paid after trial (minimum viable revenue proof)
- 70%+ pilot completion rate (21+ pilots actively using product at day 30)
- NPS ≥40 from pilots (satisfaction signal)
- Qualitative feedback informing product roadmap

---

## Background & Context

### Current State
- MVP deployed and live on Vercel
- 0 paying customers, 264 signups in trial pool
- Landing page needs to convert pilot signups
- SMS compliance (A2P 10DLC) registration in progress
- Need pilot testimonials and case studies for Phase 2 scaling

### Why This Matters
- First pilot data validates product-market fit assumptions
- Real revenue demonstrates willingness to pay
- Case studies enable Phase 2 sales & marketing
- Agent feedback shapes feature roadmap
- 45 days to $20K MRR target — pilot recruitment is critical path

### Target ICP for Pilots
- **Solo real estate agents** (primary)
- 12-24 transactions/year
- Current lead generation pain (losing to faster responders)
- Tech comfort level: moderate (uses FUB CRM)
- Located in US (SMS regulatory requirement)

---

## Campaign Strategy

### Channels & Tactics

#### 1. Facebook Ads
**Placement:** Real estate agent communities, lead generation discussion groups  
**Audience:** Real estate professionals, US-based, ages 25-65  
**Message:** "Respond to leads in <30 seconds. Free AI for 30 days."  
**Offer:** Free 30-day pilot, no credit card required  
**Budget:** TBD (cost per pilot target: <$50)  
**Expected Conversion:** 5-8 pilots/week (28-40 over 30 days)

**Creative Requirements:**
- Problem-agitation copy: losing leads to faster responders
- Proof: response time <30 sec, 78% of deals go to first responder (industry stat)
- CTA: "Join Free Pilot"
- Landing page link: `https://leadflow-ai-five.vercel.app/?source=facebook-pilot`

#### 2. Reddit Outreach
**Communities:** r/realestate, r/realestateagents, r/realestateinvesting  
**Approach:** Targeted comments on "lead generation" / "response time" threads  
**Message:** "We built AI that responds to leads in seconds. Free 30-day pilot."  
**Call-to-Action:** Link to pilot signup (not aggressive sales pitch)  
**Expected Conversion:** 3-5 pilots/week (14-20 over 30 days)  
**Guidelines:** Follow community rules; authentic participation; no spam

**Targeting Criteria:**
- Post must discuss lead response, response time, lead generation tools, or CRM
- Agent/broker audience (check post history)
- Non-branded comment (value-first approach)

#### 3. LinkedIn Outreach
**Targeting:** Real estate agents, brokers, team leaders  
**Approach:** Personalized messages to agents in target markets (CA, TX, FL, NY initially)  
**Message Template:** "Hi [Name] — saw you're active in [market/segment]. We built an AI that responds to leads in <30 sec. Pilot program (free 30 days) if you're curious. [Link]"  
**Expected Conversion:** 2-3 pilots/week (10-14 over 30 days)  
**Volume:** 50-75 personalized messages/week

**Targeting Criteria:**
- Job titles: Real Estate Agent, Broker, Team Lead, Broker Owner
- Currently employed in real estate
- Located in US
- Some activity signal (recent posts or engagement)

### Campaign Messaging

#### Core Message
**"Respond to leads in <30 seconds. Free AI for 30 days."**

#### Why It Works
- **Urgency:** Time-to-response is the #1 predictor of deal conversion
- **Proof:** 78% of deals go to first responder (industry data)
- **Friction removal:** Free trial, no credit card, 30-day window
- **Value clarity:** Solves immediate pain (losing leads)

#### Support Points
- AI responds via SMS (98% open rate)
- Integrates with Follow Up Boss (agent's existing CRM)
- Automatically schedules appointments via Cal.com
- Dashboard shows lead analytics and response performance

---

## Landing Page & Signup Flow

### Required Pages

#### 1. Pilot Sign-Up Page
**URL:** `/pilot-signup` or `/join-pilot`  
**Headline:** "Respond to Leads in <30 Seconds"  
**Subheadline:** "Join our free 30-day pilot. Real estate agents are responding to every lead. Should be you."  
**Form Fields:**
- Full Name (required)
- Email (required)
- Phone (required)
- Real Estate License # (optional — validates ICP)
- Brokerage (optional)
- Market(s) Served (optional)
- Source: Dropdown (Facebook, Reddit, LinkedIn, Google, Other)

**Post-Signup Flow:**
1. Confirmation email sent
2. Redirect to onboarding page
3. Link to Pilot Program Agreement (legal/expectations)
4. Onboarding wizard (integrate with FUB, verify SMS number)
5. Welcome email with link to admin simulator + documentation

#### 2. Pilot Program Agreement Page
**Content:**
- Program duration: 30 days (dates: [START] to [END])
- Commitment: Active use during pilot (expected 3+ leads/week to see value)
- Feedback requirement: Brief NPS survey at day 15 and day 30
- Data usage: LeadFlow may use anonymized lead/response data for case studies and product improvement
- No charge during pilot; conversion to paid is optional
- Early exit permitted without penalty

**CTA:** "I agree, let's start"

#### 3. Pilot Success Page (Post-Onboarding)
**Content:**
- Welcome message: "You're in! Here's what to do next:"
- Step 1: Connect your FUB account (button link to FUB OAuth)
- Step 2: Verify your SMS number (Twilio verification)
- Step 3: Try the simulator (button link to `/admin/simulator`)
- Quick start guide: How to set up your first lead
- Support: Email support@leadflow.ai, Telegram community link

---

## Product Features Required for Pilot

### Minimum Feature Set
✅ = Already built  
⏳ = In progress  
🚫 = Blocker

- ✅ SMS lead response (<30 sec)
- ✅ FUB CRM integration (webhook inbound)
- ✅ Cal.com appointment booking
- ✅ Dashboard (lead list, analytics, settings)
- ✅ Pilot signup flow (landing page → onboarding)
- ⏳ Lead simulator (for pilot testing)
- ⏳ Pilot agreement & NPS surveys
- ⏳ Email communications (welcome, onboarding, feedback reminders)

### Known Blockers
- **A2P 10DLC SMS Compliance:** Required for production SMS sending. Status: [UPDATE WITH CURRENT STATUS]
- **Production Credentials:** Stripe (billing), Twilio (SMS), Cal.com (bookings) must be configured for production
- **Pilot Database:** Track pilot agents separately; auto-expire trial at 30 days

---

## Success Metrics

### Primary KPIs (30-day target)
| Metric | Target | Success Threshold |
|--------|--------|-------------------|
| **Pilots Recruited** | 30 | 20+ (67%) |
| **Pilot Completion Rate** | 70% | 14+ active at day 30 |
| **Paid Conversion** | 3+ | 10%+ of pilots convert to paid |
| **Average Pilot MRR** | $200+ | At least Starter tier ($49/mo) |
| **NPS from Pilots** | >40 | Indicates product viability |
| **Feature Requests Captured** | 10+ | Shapes product roadmap |

### Secondary Metrics
| Metric | Purpose |
|--------|---------|
| **Response Time** | Validate <30 sec claim in production |
| **Lead Volume per Pilot** | Understand workload/stickiness |
| **Onboarding Completion Rate** | Identify friction points |
| **Engagement (Days Active)** | Predict retention post-paid conversion |
| **Support Requests** | Identify missing docs/features |
| **Case Study Readiness** | Early conversion success (for marketing) |

### Tracking & Reporting
- Daily: Signups, FUB connections, first lead responses
- Weekly: Engagement, feature requests, support issues
- Bi-weekly: NPS, pilot health check (activity scores)
- End-of-pilot: Conversion rate, testimonials, roadmap prioritization

---

## Pilot Onboarding Flow

### Day 1: Welcome & Setup
**Touchpoint:** Welcome email + dashboard  
**Actions:**
- Confirm email
- Connect FUB account
- Verify SMS number (Twilio)
- Review quick-start guide
- Test lead simulator

**Success Signal:** Agent logs in and confirms SMS number

### Days 2-7: First Lead
**Touchpoint:** Email reminders, in-app prompts  
**Actions:**
- Send test lead via simulator (optional)
- Or: Real lead arrives via FUB webhook
- AI responds via SMS
- Agent receives lead + response in dashboard
- Agent can reply/take action in FUB

**Success Signal:** 1+ lead processed, agent engagement > 0

### Days 8-15: Feedback Loop 1
**Touchpoint:** NPS survey email  
**Questions:**
- "How likely are you to recommend LeadFlow to a colleague? (0-10)"
- "What's working well?"
- "What could be better?"
- "Any blockers or questions?"

**Response Target:** 70%+ response rate  
**Action:** PM reviews feedback; adjusts product/messaging accordingly

### Days 16-30: Sustained Engagement
**Touchpoint:** Weekly tips email, in-app notifications  
**Content:**
- Feature highlights (e.g., analytics)
- Tips for lead qualification
- Peer success stories (anonymized)
- Upcoming conversion offer

**Success Signal:** Consistent engagement (3+ logins/week)

### Day 30: Conversion & Feedback
**Touchpoint:** Conversion offer email + NPS survey  
**Content:**
- "Your free pilot ends tomorrow"
- Conversion offer: First month 50% off (if converting to Pro)
- Final NPS survey (satisfaction + willingness to convert)
- Testimonial request (for marketing)

**Response Target:** 50%+ response rate, 10%+ conversion

---

## Pilot Program Scope & Rules

### Duration
- **Start Date:** TBD (upon approval)
- **End Date:** +30 days from start
- **Grace Period:** 2-day grace to complete onboarding (day 0-2)

### Commitment Expected
- Active use: Minimum 3+ leads/week for value realization
- Feedback: NPS survey at day 15 and 30 (5 minutes each)
- Testing: Willingness to test new features (e.g., simulator, analytics)

### What's Included (Free)
- Unlimited SMS responses (during pilot)
- FUB integration
- Cal.com booking
- Dashboard & analytics
- Email support

### What Pilots Pay For (Post-Pilot)
- Starter ($49/mo): 100 SMS/month
- Pro ($149/mo): Unlimited SMS, full AI
- Pricing honored: First month 50% off for conversion (if approved)

### Exclusions
- No multi-agent team support during pilot (solo agents only)
- No custom integrations
- No onboarding calls (self-service; email support only)
- Analytics limited to basic metrics (no advanced cohort analysis)

---

## Pilot Tracking & Database Schema

### Agents Table Additions
New columns to track pilot status:

```sql
ALTER TABLE agents ADD COLUMN (
  pilot_status ENUM ('not_enrolled', 'enrolled', 'active', 'completed', 'churned'),
  pilot_start_date TIMESTAMP,
  pilot_end_date TIMESTAMP,
  pilot_signup_source VARCHAR(50),  -- facebook, reddit, linkedin, organic, other
  pilot_agreement_signed BOOLEAN DEFAULT FALSE,
  pilot_nps_day15 INT,  -- 0-10
  pilot_nps_day30 INT,  -- 0-10
  pilot_feedback TEXT,  -- open feedback from surveys
  converted_to_paid BOOLEAN DEFAULT FALSE,
  paid_plan_tier VARCHAR(50),  -- if converted
  paid_start_date TIMESTAMP
);
```

### Events to Track
| Event | Trigger | Data Captured |
|-------|---------|---------------|
| `pilot_signup` | Form submission | email, source, timestamp |
| `pilot_agreement_signed` | Agreement accepted | agent_id, timestamp |
| `fub_connected` | OAuth successful | agent_id, fub_account_id, timestamp |
| `sms_verified` | Twilio verification complete | agent_id, phone, timestamp |
| `first_lead_response` | SMS sent to lead | agent_id, lead_id, response_time_ms |
| `nps_responded` | Survey submission | agent_id, nps_score, feedback, timestamp |
| `conversion_to_paid` | Trial → Paid | agent_id, plan_tier, start_date |

---

## Campaign Timeline

### Week 1 (Days 1-7)
- ✅ Landing page & signup flow deployed
- ✅ Pilot agreement page live
- ✅ Onboarding wizard complete
- ✅ Email sequences configured
- 📤 Launch Facebook Ads
- 📤 Begin Reddit outreach (3-4 posts/comments per day)
- 📤 Begin LinkedIn outreach (50 messages)
- **Target:** 6-10 pilots recruited

### Week 2 (Days 8-14)
- Monitor signup flow; fix friction points
- Day 15 NPS surveys sent (from Week 1 signups)
- Ongoing Facebook Ads optimization
- Reddit outreach continues (3-4/day)
- LinkedIn outreach continues (50 messages/week)
- Support: Address early blockers (FUB integration, SMS issues)
- **Target:** 6-10 pilots recruited (cumulative 12-20)

### Week 3 (Days 15-21)
- Analyze Week 1 NPS feedback
- Messaging/product adjustments based on feedback
- Increase ad spend if CAC < $50/pilot
- Scale Reddit to 5-7 comments/day if performing
- LinkedIn volume to 75 messages/week if performing
- First success story blog post (early converting pilot)
- **Target:** 6-10 pilots recruited (cumulative 18-30)

### Week 4 (Days 22-30)
- Day 30 NPS surveys sent
- Final push: "Last week to join the pilot" messaging
- Prepare case studies from converting pilots
- Analyze full cohort data (retention, engagement, conversion)
- Conversion offer finalization (discount tier)
- Post-mortem: What worked, what didn't
- **Target:** Reach 30 pilot enrollment (or 80%+ of target)

---

## Success Gates & Go/No-Go Criteria

### Minimum Viable Success (Day 7)
- [ ] 5+ pilots signed up
- [ ] Signup flow works (no critical bugs)
- [ ] At least 1 pilot successfully connected FUB
- [ ] At least 1 pilot received and processed a test lead

### Viability Check (Day 14)
- [ ] 12+ pilots recruited
- [ ] 8+ pilots have completed FUB + SMS setup
- [ ] 5+ pilots have processed 1+ leads
- [ ] No critical bugs blocking pilot engagement
- [ ] Recruitment CAC trending < $50 per pilot

### Go/No-Go Decision (Day 21)
**Go Criteria:**
- 18+ pilots recruited
- 70%+ of pilots actively engaged (≥2 logins/week)
- 0 critical production bugs
- Positive NPS feedback from Day 15 surveys
- At least 1 pilot has indicated interest in paid conversion

**No-Go / Pivot Criteria:**
- <15 pilots recruited (recruitment failing)
- <50% pilot engagement (product friction too high)
- Critical bugs blocking trial use
- Negative NPS (<0 average)
- 0 pilot interest in paid conversion

**Action on No-Go:** PM + Orchestrator emergency review; identify root cause; pivot messaging, product, or timeline as needed.

### Success Completion (Day 30)
- [ ] 20+ pilots enrolled
- [ ] 14+ pilots actively engaged at day 30
- [ ] 2+ pilots converted to paid
- [ ] Positive feedback and testimonials collected
- [ ] Product roadmap updated based on feedback
- [ ] Case studies drafted

---

## Dependencies & Blockers

### Critical Path Blockers
| Blocker | Status | Owner | ETA | Impact |
|---------|--------|-------|-----|--------|
| A2P 10DLC SMS Compliance | [TBD] | Orchestrator | [TBD] | Can't send SMS to pilots |
| Production Stripe Setup | [TBD] | Dev | [TBD] | Can't process paid conversions |
| Production Twilio Config | [TBD] | Dev | [TBD] | Can't send/receive SMS |
| Landing page live | [TBD] | Design/Dev | [TBD] | Can't recruit pilots |
| Onboarding wizard | ✅ Done | Dev | [DONE] | Pilots can't set up |

### External Dependencies
- **Twilio:** SMS sending/receiving
- **Follow Up Boss:** Webhook integration validation
- **Cal.com:** Appointment booking (testing)
- **Stripe:** Payment processing (post-trial conversions)

### Soft Dependencies (Nice-to-Have, Not Blocking)
- Lead simulator (helpful for testing but not required)
- Advanced analytics (basic metrics sufficient for pilot)
- Automated lead distribution (can be done manually for pilot cohort)

---

## Acceptance Criteria

### User Stories

**User Story 1: Agent Recruits via Facebook Ad**
```
AS: Real estate agent (target ICP)
I WANT: To easily sign up for a free pilot
SO THAT: I can test if the product helps me respond faster to leads

Acceptance Criteria:
- Facebook ad links to /pilot-signup
- Form loads without errors (page load time < 2s)
- Form accepts email, name, phone, license #
- Submission succeeds and sends confirmation email
- Agent is redirected to /pilot-success with next steps
```

**User Story 2: Pilot Agent Completes Onboarding**
```
AS: Pilot agent
I WANT: To integrate my FUB account and set up SMS
SO THAT: I can receive and respond to leads

Acceptance Criteria:
- FUB OAuth flow works without errors
- SMS number verification succeeds within 2 minutes
- Agent receives confirmation email
- Dashboard shows "FUB: Connected" and "SMS: Verified"
- Agent can access lead simulator to test
```

**User Story 3: Pilot Agent Receives NPS Survey**
```
AS: Pilot agent (day 15)
I WANT: To provide feedback on my experience
SO THAT: Product team can improve the product

Acceptance Criteria:
- Email sent exactly at day 15
- Link in email goes to /nps-survey
- Survey has: NPS (0-10), open feedback, blockers field
- Submission stores in agents.pilot_nps_day15 and agents.pilot_feedback
- Email confirms submission received
```

**User Story 4: Pilot Agent Converts to Paid**
```
AS: Pilot agent (day 28+)
I WANT: To subscribe to Pro plan at a discount
SO THAT: I can continue using the service

Acceptance Criteria:
- Conversion email sent day 28
- Discount offer: First month 50% off
- Link goes to /settings → Billing
- Stripe checkout shows discounted price
- After payment, plan_tier updated to 'pro' and converted_to_paid = true
- Email confirmation sent with first month cost
```

### Machine-Verifiable Acceptance Checks

```sql
-- Check 1: Landing page loads
curl -s https://leadflow-ai-five.vercel.app/pilot-signup | grep -c "Respond to Leads" > 0

-- Check 2: Signup form has required fields
curl -s https://leadflow-ai-five.vercel.app/pilot-signup | grep -c 'name="email"' > 0 &&
curl -s https://leadflow-ai-five.vercel.app/pilot-signup | grep -c 'name="phone"' > 0 &&
curl -s https://leadflow-ai-five.vercel.app/pilot-signup | grep -c 'name="source"' > 0

-- Check 3: Confirmation email template exists
test -f product/lead-response/dashboard/lib/email/templates/pilot-confirmation.txt

-- Check 4: NPS survey page exists
curl -s https://leadflow-ai-five.vercel.app/nps-survey | grep -c "likely to recommend" > 0

-- Check 5: Pilot tracking columns added to agents table
psql -U admin -h localhost leadflow -c "\d agents" | grep -c "pilot_status" > 0 &&
psql -U admin -h localhost leadflow -c "\d agents" | grep -c "pilot_nps_day15" > 0
```

---

## Handoff & Next Workflow Steps

### PM Deliverable (This PRD)
✅ Specification complete  
✅ Use case linked in Supabase  
✅ E2E test specs defined  
✅ Success metrics & go/no-go criteria specified

### Next: Marketing Agent
**Owns:** Facebook ad creative, Reddit/LinkedIn messaging copy, email sequences  
**Deliverable:** Campaign assets ready to launch

### Next: Dev Agent
**Owns:** Landing page deployment, signup flow testing, onboarding wizard fixes  
**Deliverable:** All pages live and tested

### Next: QC Agent
**Owns:** End-to-end pilot flow testing, integration validation, bug reporting  
**Deliverable:** Sign-off on all critical paths

### Final: Orchestrator
**Owns:** Campaign launch coordination, daily monitoring, issue resolution  
**Deliverable:** Dashboard report (daily signups, engagement, blockers)

---

## Appendix

### Campaign Message Examples

**Facebook Ad Headline:**
"Respond to Leads in Seconds, Not Hours"

**Facebook Ad Body:**
"78% of real estate deals go to the first responder. LeadFlow AI responds to your leads in <30 seconds — then connects them straight to your calendar.
Free 30-day pilot. No credit card. [Join Now]"

**Reddit Comment (Example):**
"We're recruiting agents for our free pilot of AI lead response (responds in <30 sec, integrates with FUB). If you're interested, DM me. Specifically targeting agents losing deals to response time."

**LinkedIn Message:**
"Hi [Name] — I noticed you're active in [market]. We just launched LeadFlow, AI that responds to your leads in <30 seconds. Pilot program (free 30 days, no credit card) if you want to test it. [Link]"

---

## Document History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-04 | PM | Initial specification |

