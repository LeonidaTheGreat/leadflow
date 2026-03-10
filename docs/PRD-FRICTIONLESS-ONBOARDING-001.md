# PRD: Self-Serve Frictionless Onboarding Flow
**PRD ID:** PRD-FRICTIONLESS-ONBOARDING-001
**Use Case:** feat-frictionless-onboarding-flow
**Status:** draft
**Priority:** P1
**Created:** 2025-03-10

## 1. Problem Statement
New users visiting the LeadFlow landing page have no clear, fast path from curiosity to experiencing value. The current signup process has friction that causes drop-off before the aha moment. Target: a real estate agent visits, signs up, and sees an AI respond to a simulated lead — all in under 2 minutes, no credit card required.

## 2. Goals
| Goal | Target |
|------|--------|
| Time from landing to dashboard | < 60 seconds |
| Time from landing to first AI response seen | < 2 minutes |
| Credit card required for trial | Never |
| Trial duration | 14 days |
| Wizard completion rate | > 60% |

## 3. User Journey (Happy Path)
1. Agent visits landing page (/)
2. Clicks "Start Free Trial" CTA (hero, features, or pricing section)
3. Sees 2-field form: Email + Password (no CC, no phone)
4. Submits -> account created in <5 seconds
5. Redirected to /dashboard with: 3 sample leads pre-populated, "Welcome" banner + progress bar, Guided Setup Wizard overlay (Step 1 of 3)
6. Wizard Step 1: Connect FUB — enter API key, system validates + registers webhook
7. Wizard Step 2: Configure SMS — choose/provision Twilio number, verify test SMS
8. Wizard Step 3: Aha Moment — Lead Simulator fires, AI response in <15 seconds
9. Wizard completes -> full dashboard unlocked
10. Trial countdown visible: "12 days left on your free trial"

## 4. Functional Requirements

### FR-1: Trial Signup Route (/signup/trial or /onboarding)
- Input: email (required), password (required, min 8 chars)
- No credit card field
- Account creation: Supabase Auth user + real_estate_agents record with plan_tier="trial", trial_started_at=NOW(), trial_expires_at=NOW()+14 days, onboarding_completed=false, onboarding_step=0
- Redirect to /dashboard immediately (no email verification gate on trial)
- Clear error messages for duplicate email, weak password

### FR-2: Dashboard with Sample Lead Data
- New trial users see 3 pre-populated sample leads on first visit
- Sample leads are read-only fixtures (not real FUB data)
- Banner: "These are sample leads. Connect FUB to see real leads."
- Sample data removed once real FUB integration is connected

### FR-3: Guided Setup Wizard (Post-Login Overlay)
- Shown automatically on first dashboard visit if onboarding_completed=false
- Dismissible with confirmation prompt
- 3-step progress indicator always visible
- Steps: (1) Connect FUB, (2) Configure SMS, (3) Live Demo
- Each step: title, description, CTA button, "Skip for now" link
- Wizard state persisted in onboarding_step field

### FR-4: FUB Integration Step
- Input: FUB API key
- Auto-register LeadFlow webhook in FUB account
- Show success: "Connected! X active leads found"
- 30-second validation timeout with spinner

### FR-5: SMS Configuration Step
- Option A: Provision new Twilio number (auto-selects area code from agent state)
- Option B: Enter existing Twilio credentials
- Test SMS: "Hi [AgentName], LeadFlow is connected!"
- 4-digit confirmation to verify delivery

### FR-6: Lead Experience Simulator (Aha Moment)
- Fires 1 simulated inbound lead
- AI drafts SMS response using existing LeadFlow AI logic
- Response appears in UI within 15 seconds
- Completion: onboarding_completed=true, onboarding_step=3

### FR-7: Trial Countdown and Upgrade Prompt
- Persistent banner: "X days left on your free trial — Upgrade"
- Day 10: email — "4 days left on your trial"
- Day 13: email — "1 day left"
- Day 14: access suspended, redirect to /upgrade

### FR-8: Trial-to-Paid Conversion
- /upgrade shows Starter ($49/mo), Pro ($149/mo), Team ($399/mo)
- Stripe Checkout session on plan selection
- On payment: plan_tier updated, trial_expires_at cleared

## 5. Acceptance Criteria

### AC-1: Sub-60-Second Signup
- GIVEN visitor on landing page
- WHEN they click CTA, enter email+password, submit
- THEN they are on dashboard within 60 seconds, no CC required

### AC-2: Sample Lead Data on First Visit
- GIVEN new trial user who just signed up
- WHEN they land on /dashboard for the first time
- THEN they see 3 sample leads with AI-drafted responses + sample data banner

### AC-3: Guided Setup Wizard Appears
- GIVEN new trial user on dashboard
- WHEN onboarding_completed=false
- THEN Setup Wizard overlay shown automatically at "Step 1 of 3: Connect FUB"

### AC-4: FUB Connection Works
- GIVEN user on Wizard Step 1
- WHEN they enter valid FUB API key and click Connect
- THEN webhook registered in FUB, wizard advances to Step 2

### AC-5: SMS Test Succeeds
- GIVEN user on Wizard Step 2
- WHEN they provision Twilio number and submit mobile
- THEN test SMS delivered within 60 seconds, 4-digit verification confirms

### AC-6: Aha Moment Within 2 Minutes
- GIVEN user who completes steps 1-2 of wizard
- WHEN Lead Simulator fires on Step 3
- THEN AI-drafted SMS response visible within 15 seconds; total time from landing <2 minutes

### AC-7: Trial Countdown Visible
- GIVEN any trial user on any dashboard page
- THEN banner shows "X days left on your free trial"

### AC-8: Trial Expiry Enforcement
- GIVEN trial user whose trial_expires_at has passed
- WHEN they access the dashboard
- THEN redirect to /upgrade

## 6. Schema Additions Required
```sql
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
```

## 7. Dependencies
| Dependency | Status |
|-----------|--------|
| FUB integration endpoint | Exists |
| Lead Experience Simulator | Built (feat-aha-moment-lead-simulator) |
| Twilio SMS provisioning | Partial |
| Resend email | NOT CONFIGURED — blocks trial emails |
| Stripe Checkout | Exists |

## 8. Workflow
product -> marketing -> design -> dev -> qc

*PRD Owner: Product Manager | Created: 2025-03-10*
