<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# Use Cases

> Generated: 2026-03-03T17:12:20.943Z | Source: `use_cases` + `prds` tables

**Progress: 13/16 complete**

| UC | Name | Phase | Status | Priority | E2E | Workflow |
|----|------|-------|--------|----------|-----|----------|
| UC-5 | Lead Opt-Out | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| UC-9 | Customer Sign-Up Flow | Phase 3 | complete | 1 | defined | PM > Design > Dev > QC |
| UC-BILLING-FIX-001 | Fix Billing Integration - Agent Not Found Error | Phase 3 | ready | 1 | - | PM > Dev > QC |
| UC-1 | Lead-Initiated SMS | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| UC-2 | FUB New Lead Auto-SMS | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| UC-3 | FUB Status Change | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| UC-AUTH-FIX-001 | Implement Authentication Flow - Signup/Login | Phase 3 | ready | 1 | - | PM > Design > Dev > QC |
| UC-11 | Subscription Lifecycle | Phase 3 | complete | 2 | defined | PM > Dev > QC |
| UC-4 | FUB Agent Assignment | Phase 1 | complete | 2 | defined | PM > Dev > QC |
| gtm-landing-page | Landing Page | - | complete | 2 | - | PM > Marketing > Design > Dev > QC |
| UC-10 | Billing Portal | Phase 3 | complete | 2 | defined | PM > Design > Dev > QC |
| UC-6 | Cal.com Booking | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| UC-8 | Follow-up Sequences | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| UC-DEPLOY-LANDING-001 | Deploy Landing Page to Vercel | Phase 3 | not_started | 2 | - | Dev > QC |
| UC-7 | Dashboard Manual SMS | Phase 2 | complete | 3 | pass | PM > Design > Dev > QC |
| UC-12 | MRR Reporting | Phase 3 | complete | 3 | defined | PM > Analytics |

## Phase: Phase 1

### UC-5 — Lead Opt-Out

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 1
- **Description:** Process STOP/opt-out messages and update CRM
- **Acceptance Criteria:**
  - STOP/UNSUBSCRIBE keywords recognized (case-insensitive)
  - Lead opted_out flag set to true
  - Opt-out logged for TCPA compliance
  - No SMS sent to opted-out leads
  - Opt-out status visible in dashboard
  - FUB updated with opt-out note
- **Workflow:** PM > Dev > QC

### UC-1 — Lead-Initiated SMS

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 1
- **Description:** Respond to inbound lead SMS messages with AI-generated responses
- **Acceptance Criteria:**
  - System receives and processes Twilio inbound webhooks
  - Lead identified correctly by phone number
  - AI response generated within 5 seconds
  - Response includes context from previous messages
  - Conversation synced to FUB timeline
  - Message appears in dashboard history
- **Workflow:** PM > Dev > QC

### UC-2 — FUB New Lead Auto-SMS

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 1
- **Description:** Automatically send SMS when new lead appears in FUB CRM
- **Acceptance Criteria:**
  - FUB webhook endpoint accepts and validates payloads
  - Lead data correctly extracted from FUB payload
  - Welcome SMS sent within 30 seconds of lead creation
  - Lead record created with all FUB fields
  - Lead appears in dashboard lead feed
  - SMS delivery status tracked
- **Workflow:** PM > Dev > QC

### UC-3 — FUB Status Change

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 1
- **Description:** Trigger SMS workflows on FUB lead status changes
- **Acceptance Criteria:**
  - Status change webhooks processed correctly
  - Configurable status→SMS workflow mapping
  - SMS only sent for configured status transitions
  - Message content appropriate for new status
  - Status history maintained in database
- **Workflow:** PM > Dev > QC

### UC-4 — FUB Agent Assignment

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 2
- **Description:** Handle agent assignment changes in FUB CRM
- **Acceptance Criteria:**
  - Agent assignment webhooks processed
  - Lead ownership updated in database
  - Dashboard shows correct agent for each lead
  - Previous agent loses access if permissions restrict
- **Workflow:** PM > Dev > QC


## Phase: Phase 3

### UC-9 — Customer Sign-Up Flow

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 1
- **Description:** Stripe checkout + onboarding for new customers
- **Acceptance Criteria:**
  - Landing page has visible signup CTA
  - Plan selection clearly shows pricing and features
  - Email/password registration works (Supabase Auth)
  - Stripe Checkout session created correctly
  - Payment processing succeeds >95% of time
  - Account activated immediately after successful payment
  - User redirected to dashboard post-signup
  - Welcome email sent
- **Workflow:** PM > Design > Dev > QC

### UC-BILLING-FIX-001 — Fix Billing Integration - Agent Not Found Error

- **PRD:** Billing & Subscriptions
- **Status:** ready
- **Priority:** 1
- **Description:** Debug and fix the billing integration error that shows Agent not found when accessing Billing & Subscription settings. Includes creating missing billing records for pilot agents and fixing agent-billing association lookup.
- **Acceptance Criteria:**
  - Root cause of Agent not found error identified and documented
  - Billing records created for all 3 pilot agents in Stripe
  - Agent-billing association lookup fixed in API
  - Settings > Billing & Subscription loads without errors
  - Current subscription plan displays correctly
  - Payment methods list populates
  - Invoice history visible with download links
  - Graceful error handling for edge cases implemented
  - E2E test for billing portal passes
- **Workflow:** PM > Dev > QC

### UC-AUTH-FIX-001 — Implement Authentication Flow - Signup/Login

- **PRD:** Billing & Subscriptions
- **Status:** ready
- **Priority:** 1
- **Description:** Add visible authentication flow to customer dashboard landing page. Implement Supabase Auth with email/password signup, login, and protected routes. Enable self-serve account creation for pilot agents.
- **Acceptance Criteria:**
  - Signup button visible on landing page
  - Login button visible on landing page
  - Email/password registration form works
  - Login form works with valid credentials
  - Password reset flow implemented
  - Protected routes redirect to login when unauthenticated
  - Authenticated users see dashboard on login
  - User session persists across page refreshes
  - Logout functionality works
  - Welcome email sent after signup
  - Auth state reflected in UI (show user name/email)
- **Workflow:** PM > Design > Dev > QC

### UC-11 — Subscription Lifecycle

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 2
- **Description:** Handle upgrades, downgrades, cancellations, renewals
- **Acceptance Criteria:**
  - Upgrade processes immediately with proration
  - Downgrade schedules correctly for next period
  - Cancellation stops auto-renewal
  - Access continues until paid period ends
  - All lifecycle events send confirmation emails
  - Failed payments retry (Stripe Smart Retries)
  - Dunning emails sent on failed payment
  - Grace period before account suspension
- **Depends on:** UC-9
- **Workflow:** PM > Dev > QC

### UC-10 — Billing Portal

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 2
- **Description:** Customer self-serve billing management via Stripe portal
- **Acceptance Criteria:**
  - Billing section loads without errors
  - Current subscription plan displayed
  - Monthly price shown
  - Next billing date visible
  - Payment methods listed
  - Invoice history with download links
  - Update payment method works
  - Link to Stripe Customer Portal works
  - Graceful error handling if billing data missing
- **Depends on:** UC-9
- **Workflow:** PM > Design > Dev > QC

### UC-DEPLOY-LANDING-001 — Deploy Landing Page to Vercel

- **PRD:** -
- **Status:** not_started
- **Priority:** 2
- **Description:** Deploy the landing page to Vercel by integrating it into the existing Next.js customer dashboard. Configure the landing page as the root route (/), set up deploy pipeline, create smoke test, and configure production URL.
- **Acceptance Criteria:**
  - Landing page integrated into Next.js app at root route (/)
  - Existing dashboard routes preserved (e.g., /dashboard)
  - Vercel project configured for production deployment
  - Deploy pipeline configured (GitHub → Vercel)
  - Environment variables set (if needed)
  - Smoke test created and passing
  - Production URL active and accessible (e.g., leadflow-ai-five.vercel.app)
  - Landing page displays correctly on production URL
  - All links on landing page functional
  - Mobile responsiveness verified
- **Workflow:** Dev > QC

### UC-12 — MRR Reporting

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 3
- **Description:** Monthly recurring revenue tracking and analytics dashboard
- **Acceptance Criteria:**
  - MRR calculated accurately from Stripe data
  - Breakdown by plan tier (Starter/Pro/Team/Brokerage)
  - New MRR (new customers this month)
  - Churned MRR (cancellations)
  - Expansion MRR (upgrades)
  - Contraction MRR (downgrades)
  - Net MRR growth rate
  - Dashboard updates in real-time or near-real-time
  - Export to CSV available
- **Depends on:** UC-11
- **Workflow:** PM > Analytics


## Phase: Unassigned

### gtm-landing-page — Landing Page

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** Create a high-converting landing page that clearly communicates the value proposition, pricing, and includes a signup CTA.
- **Workflow:** PM > Marketing > Design > Dev > QC


## Phase: Phase 2

### UC-6 — Cal.com Booking

- **PRD:** CRM & Calendar Integrations
- **Status:** complete
- **Priority:** 2
- **Description:** Book appointments via Cal.com from SMS conversations
- **Acceptance Criteria:**
  - Cal.com booking link generated for agent
  - Link sent via SMS to lead
  - Booking confirmation webhook received
  - Appointment details stored in database
  - Confirmation SMS sent automatically
  - Booking appears in dashboard
  - Activity logged in FUB timeline
  - Agent receives notification
- **Workflow:** PM > Dev > QC

### UC-8 — Follow-up Sequences

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 2
- **Description:** Automated multi-step follow-up SMS sequences
- **Acceptance Criteria:**
  - Sequences configurable per lead stage
  - Time delays between steps (1h, 4h, 24h, etc.)
  - Sequence stops if lead responds
  - Sequence stops if lead books appointment
  - Sequence stops if lead opts out
  - Active sequences visible in dashboard
- **Workflow:** PM > Dev > QC

### UC-7 — Dashboard Manual SMS

- **PRD:** Core SMS Lead Response
- **Status:** complete
- **Priority:** 3
- **Description:** Send manual SMS from dashboard interface
- **Acceptance Criteria:**
  - Send Message button available on lead detail
  - Message composition UI with character count
  - AI suggestion button generates contextual message
  - Send button triggers Twilio API
  - Delivery status shown (sent, delivered, failed)
  - Message appears in history immediately
- **Workflow:** PM > Design > Dev > QC

