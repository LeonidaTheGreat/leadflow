# PRD: Pilot-to-Paid Conversion Email Sequence

**Document ID:** PRD-PILOT-CONVERSION-EMAIL-SEQUENCE  
**PRD Record ID:** prd-pilot-conversion-email-sequence  
**Version:** 1.0  
**Status:** Active  
**Owner:** Product Manager  
**Last Updated:** 2026-03-12

---

## 1) Objective
Increase pilot-to-paid conversion before pilot expiry (day 60) by automatically sending a value-driven, urgency-based email sequence at day 30, day 45, and day 55.

## 2) Problem
Pilot agents receive value but are not consistently prompted to upgrade before expiry. Without a structured conversion sequence, pilots churn at day 60 without becoming paid customers.

## 3) Scope
### In Scope
- Automated daily milestone check for pilot agents
- 3 conversion emails:
  1. Day 30: Midpoint value recap + upgrade offer
  2. Day 45: ROI recap + urgency
  3. Day 55: 5-days-left final warning + clear CTA
- Personalized stats in each email:
  - leads responded
  - average response time
  - appointments booked
- Direct Stripe Checkout link for Pro plan in every email
- Delivery + sequence tracking in `agent_email_logs` or `analytics_events`
- Sequence stop condition when pilot upgrades

### Out of Scope
- New pricing strategy changes
- New billing plans beyond current Pro checkout target
- In-app upgrade modals (email-only for this UC)

## 4) User Stories
1. As a pilot agent, I want to see concrete usage results so I understand the value I already received.
2. As a pilot agent nearing expiry, I want a clear and easy way to upgrade to avoid interruption.
3. As the business owner, I want automatic milestone messaging so conversion does not depend on manual follow-up.

## 5) Functional Requirements
### FR-1 Milestone eligibility
System evaluates all `plan_tier = pilot` agents once daily and identifies agents at:
- day 30 since `pilot_started_at`
- day 45 since `pilot_started_at`
- day 55 since `pilot_started_at`

### FR-2 Sequence idempotency
Each milestone email is sent at most once per agent per pilot cycle. Duplicate sends are prevented by email-log checks.

### FR-3 Day 30 template (midpoint)
Email includes:
- progress framing ("You’re halfway through your pilot")
- personalized stats
- soft upgrade CTA with Pro checkout link

### FR-4 Day 45 template (urgent value)
Email includes:
- personalized ROI/value recap
- explicit urgency (15 days remaining)
- stronger upgrade CTA with Pro checkout link

### FR-5 Day 55 template (final warning)
Email includes:
- clear warning (5 days left)
- concise consequence of non-upgrade (pilot expiry / paused service)
- prominent Pro checkout CTA

### FR-6 Personalization data contract
Stats are computed per pilot agent and injected into all 3 templates:
- leads responded (integer)
- average response time (human-readable)
- appointments booked (integer)
If a metric is unavailable, fallback copy is used (no broken placeholders).

### FR-7 Upgrade link
Each email includes a direct Stripe checkout URL for Pro plan tied to the correct agent context.

### FR-8 Delivery tracking
Each send attempt records:
- agent id
- milestone (day_30, day_45, day_55)
- template key/version
- provider (Resend)
- send status (queued/sent/failed)
- timestamp
Storage target: `agent_email_logs` preferred; fallback `analytics_events` if logs table unavailable.

### FR-9 Stop on upgrade
Before each send, system re-checks agent billing state. If agent has upgraded (non-pilot paid plan), pending sequence emails are skipped.

## 6) Non-Functional Requirements
- Daily milestone check must complete without blocking core lead-response flows.
- Email content must be mobile-readable and render in Gmail and Apple Mail.
- Failures are observable via logs/events for debugging and conversion analysis.

## 7) Acceptance Criteria (Definition of Done)
1. Daily cron/job checks pilot agents and evaluates milestone eligibility for day 30/45/55.
2. Three distinct templates exist and are mapped to their milestone trigger.
3. Every email includes personalized stats: leads responded, avg response time, appointments booked.
4. Every email includes direct Stripe checkout CTA for Pro plan.
5. Send attempts and outcomes are tracked in `agent_email_logs` or `analytics_events`.
6. Sequence automatically halts for agents who upgrade before the next milestone.
7. Duplicate milestone sends do not occur for the same agent.
8. QC can validate end-to-end by simulating pilot age and observing correct template dispatch + tracking records.

## 8) E2E Validation Scenarios
1. **Day 30 trigger**: Pilot agent at day 30 receives midpoint template with personalized stats + checkout link.
2. **Day 45 trigger**: Pilot agent at day 45 receives urgent ROI template with correct urgency copy.
3. **Day 55 trigger**: Pilot agent at day 55 receives final warning template with 5-days-left message.
4. **Upgrade stop condition**: Agent upgraded before day 45 receives no day 45/day 55 emails.
5. **Tracking verification**: Every send/skip/failure writes expected log/event record.
6. **Idempotency**: Re-running the daily job same day does not send duplicate milestone emails.

## 9) Dependencies
- Resend configured for transactional sends
- Stripe checkout link generation for Pro plan
- Reliable pilot lifecycle fields (`pilot_started_at`, `plan_tier`)
- Availability of usage metrics source for personalization

## 10) Risks & Mitigations
- **Risk:** Missing usage metrics for low-activity pilots  
  **Mitigation:** Fallback copy and zero-safe formatting.
- **Risk:** Duplicate sends from retries/manual reruns  
  **Mitigation:** milestone-level idempotency key per agent.
- **Risk:** Upgrade race condition near send time  
  **Mitigation:** final plan status check immediately before send.
