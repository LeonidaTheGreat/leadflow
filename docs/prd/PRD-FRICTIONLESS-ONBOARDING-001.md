# PRD-FRICTIONLESS-ONBOARDING-001

## Title
Self-Serve Frictionless Onboarding Flow

## Objective
Enable any new real estate agent to move from landing-page visitor to first clear product value in under 2 minutes, with signup completed in under 60 seconds and no credit card required.

## Problem
Current onboarding has multiple friction points (unclear entry path, setup complexity, delayed first value). This suppresses trial starts and trial-to-paid conversion.

## Scope
### In Scope
1. Landing page "Start Free Trial" CTA path to trial signup
2. Email + password only signup (no card), 14-day trial provisioning
3. Immediate post-signup redirect to dashboard
4. First-session seeded sample lead data (read-only demo records)
5. Auto-triggered guided setup wizard for first-time users
6. Wizard steps:
   - Connect Follow Up Boss (FUB)
   - Configure SMS (Twilio connection + test)
   - Trigger first-value simulation (aha moment)
7. Trial visibility (banner/countdown)
8. Event tracking for onboarding funnel timing and drop-off

### Out of Scope
- Paid checkout and card collection flows
- Full CRM data migration imports
- Advanced settings beyond required setup path

## User Stories
1. As a new visitor, I can start a free trial instantly from the landing page.
2. As a new user, I can create my account with only email and password.
3. As a trial user, I can access the dashboard immediately without payment friction.
4. As a first-time user, I see sample lead data so the dashboard is not empty.
5. As a first-time user, I am guided through a clear setup wizard for required integrations.
6. As a user, I can verify FUB and SMS setup from inside the wizard.
7. As a user, I get an aha moment (AI response to simulated lead) within 2 minutes of initial landing.

## Functional Requirements
### FR-1: Trial Signup Entry
- Landing page exposes Start Free Trial CTA in primary placement.
- CTA opens/links to trial signup form.

### FR-2: Account Creation
- Required fields: email, password.
- No credit card fields shown or requested.
- On success, user account is created with:
  - plan_tier = trial
  - trial length = 14 days
  - trial_start_at and trial_ends_at persisted

### FR-3: Time-to-Access SLA
- Successful signup must land user on dashboard in <60 seconds from CTA click under normal network conditions.

### FR-4: First Session Seeded Data
- On first dashboard load for trial users, show at least 3 sample leads with AI draft responses (clearly marked demo/sample).
- Sample data must not contaminate production lead analytics.

### FR-5: Guided Setup Wizard
- Auto-launch on first dashboard visit if onboarding_completed = false.
- Step 1: FUB connection
  - Validate API key via live check
  - Register/verify webhook setup
- Step 2: SMS setup
  - Connect or provision SMS sender
  - Send and confirm test SMS
- Step 3: Aha moment simulator
  - Trigger simulated inbound lead
  - Display AI-generated response in <=15 seconds
- User can close and resume wizard; progress persists.

### FR-6: Value-Time SLA
- User must reach first visible value in <2 minutes from CTA click:
  - dashboard visible
  - sample leads visible
  - successful simulator response

### FR-7: Trial State Visibility
- Dashboard displays trial badge/banner with days remaining.
- Expired trials route to upgrade flow while preserving account access policy.

### FR-8: Instrumentation
Track events:
- trial_cta_clicked
- trial_signup_started
- trial_signup_completed
- dashboard_first_paint
- sample_data_rendered
- wizard_started
- wizard_step_completed (step_name)
- aha_simulation_started
- aha_simulation_completed
- onboarding_completed

## Non-Functional Requirements
- Mobile responsive for 375px+ width
- No critical path dependency on optional telemetry
- PII handled per existing auth/security policy
- No blocking spinners longer than 5s without status messaging

## Acceptance Criteria
1. New user can complete signup (email + password only) and reach dashboard in under 60 seconds.
2. No credit card is requested anywhere in the trial signup flow.
3. New user sees at least 3 clearly marked sample leads on first dashboard load.
4. Guided onboarding wizard auto-appears for first-time users and resumes progress after refresh.
5. FUB step validates credentials and confirms webhook registration.
6. SMS step sends and verifies a test SMS successfully.
7. Aha simulator produces visible AI response in <=15 seconds.
8. End-to-end time from landing-page CTA click to first AI response is under 2 minutes.
9. Trial countdown is visible in dashboard UI for active trials.
10. Key funnel events are recorded for conversion analysis.

## Dependencies
- FUB API connectivity
- Twilio/SMS provisioning and test-send capability
- Existing authentication/session framework
- Dashboard support for sample data state

## Risks
- External API latency can threaten <2 minute SLA
- Empty/inconsistent sample state can reduce perceived value
- Wizard drop-off if integration errors are opaque

## Rollout & Measurement
- Roll out behind feature flag if needed.
- Primary KPI: trial_start_rate (landing visitors → trial signups)
- Secondary KPIs:
  - signup_completion_under_60s_rate
  - aha_completion_under_2m_rate
  - wizard_step_completion_rate
  - D1 activation rate
  - trial-to-paid conversion rate

## Workflow
product → marketing → design → dev → qc
