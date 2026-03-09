<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# Use Cases

> Generated: 2026-03-08T23:43:57.152Z | Source: `use_cases` + `prds` tables

**Progress: 51/66 complete**

| UC | Name | Phase | Status | Priority | E2E | Workflow |
|----|------|-------|--------|----------|-----|----------|
| feat-add-login-page-with-email-and-password | add login page with email and password | Phase 3 | complete | 0 | - | PM > Dev > QC |
| UC-LANDING-MARKETING-001 | Marketing Landing Page — High-Converting Signup Flow | Phase 3 | complete | 0 | defined | PM > Marketing > Design > Dev > QC |
| feat-add-auth-middleware-to-protect-dashboard | add auth middleware to protect dashboard and settings routes | Phase 3 | complete | 0 | - | PM > Dev > QC |
| UC-BILLING-FIX-001 | Fix Billing Integration - Agent Not Found Error | Phase 3 | complete | 0 | - | PM > Dev > QC |
| implement-twilio-sms-integration | Implement Real Twilio SMS Integration - Replace Mock | Phase 1 | complete | 0 | defined | Dev > QC |
| UC-REVENUE-RECOVERY-001 | Revenue Recovery — Close MRR Gap | Phase 3 | complete | 0 | defined | PM > Dev > Marketing > QC |
| UC-AUTH-FIX-001 | Implement Authentication Flow - Signup/Login | Phase 3 | complete | 0 | - | PM > Design > Dev > QC |
| feat-add-session-management-with-server-side- | add session management with server-side tokens | Phase 3 | complete | 0 | - | PM > Dev > QC |
| fix-onboarding-500-error | Fix Onboarding Endpoint - Resolve Agents Table Schema Collision | Phase 3 | complete | 0 | - | Dev > QC |
| UC-9 | Customer Sign-Up Flow | Phase 3 | complete | 1 | defined | PM > Design > Dev > QC |
| fix-bookings-table-does-not-exist-booking-conversion-a | bookings table does not exist — booking conversion always null | - | not_started | 1 | - | Dev > QC |
| fix-marketing-landing-page-not-deployed-to-production | Marketing landing page not deployed to production | - | complete | 1 | - | Dev > QC |
| fix-test-gateway-path | test gateway path | - | stuck | 1 | - | Dev > QC |
| fix-pilot-signups-database-table-missing | pilot_signups database table missing | - | complete | 1 | - | Dev > QC |
| fix-api-queries-wrong-table-sms-stats-endpoint-returns | API queries wrong table — sms-stats endpoint returns 500 | - | not_started | 1 | - | Dev > QC |
| fix-deployed-pages-not-registered-in-system- | Auto-Sync Deployed Vercel Pages to System Components | - | complete | 1 | pass | Dev > QC |
| fix-webhook-lead-persistence | Fix Webhook Lead Persistence - Store Leads in Supabase | Phase 1 | complete | 1 | - | Dev > QC |
| fix-primary-signup-api-api-agents-onboard-does-not-cap | Primary signup API (/api/agents/onboard) does not capture or write UTM parameters | - | complete | 1 | - | Dev > QC |
| fix-ga4-script-tag-missing-from-layout-tsx-all-analyti | GA4 script tag missing from layout.tsx — all analytics events are no-ops | - | complete | 1 | - | Dev > QC |
| fix-dashboard-routes-are-publicly-accessible | dashboard routes are publicly accessible with no auth protection | - | complete | 1 | - | Dev > QC |
| fix-signup-plan-options-not-displayed | Signup page shows Choose Your Plan but no plan options are listed | - | complete | 1 | defined | Dev > QC |
| UC-10 | Billing Portal | Phase 3 | complete | 1 | defined | PM > Design > Dev > QC |
| UC-11 | Subscription Lifecycle | Phase 3 | complete | 1 | defined | PM > Dev > QC |
| fix-landing-page-has-no-links-to-signup-or-o | landing page has no links to signup or onboarding pages | - | complete | 1 | - | Dev > QC |
| fix-signup-page-has-no-link-back-to-login-an | signup page has no link back to login and no login page exists | - | complete | 1 | - | Dev > QC |
| UC-5 | Lead Opt-Out | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| fix-status | status | - | complete | 1 | - | Dev > QC |
| UC-1 | Lead-Initiated SMS | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| UC-2 | FUB New Lead Auto-SMS | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| UC-3 | FUB Status Change | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| fix-test-genome-separation | test genome separation | - | complete | 1 | - | Dev > QC |
| fix-signup-creates-customer-record-but-login | signup creates customer record but login queries agents table - auth flow is broken because signup and login use different database tables and password is never collected during signup | - | complete | 1 | - | Dev > QC |
| fix-sms-messages-direction-values-are-outbound-api-not | sms_messages.direction values are outbound-api not outbound | - | not_started | 2 | - | Dev > QC |
| feat-lead-satisfaction-feedback | Lead Satisfaction Feedback Collection | - | not_started | 2 | defined | PM > Marketing > Design > Dev > QC |
| UC-8 | Follow-up Sequences | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| fix-no-analytics-tracking-implemented-ga4-utm-conversi | No analytics tracking implemented (GA4, UTM, conversion events) | - | complete | 2 | - | Dev > QC |
| UC-DEPLOY-LANDING-001 | Deploy Landing Page to Vercel | Phase 3 | complete | 2 | - | Dev > QC |
| fix-no-forgot-password-flow | Forgot Password / Password Reset Flow | - | complete | 2 | - | Dev > QC |
| feat-add-route-discovery-smoke-test | Route Discovery Smoke Test | Phase 3 | complete | 2 | - | PM > Dev > QC |
| improve-landing-page-pricing-4-tiers | Landing Page Pricing Section — All 4 Tiers with Feature Comparison | - | not_started | 2 | defined | PM > Design > Dev > QC |
| feat-lead-magnet-email-capture | Lead Magnet / Email Capture on Landing Page | - | not_started | 2 | defined | PM > Marketing > Design > Dev > QC |
| fix-stats-bar-metrics-do-not-match-prd-specification | Stats bar metrics do not match PRD specification | - | complete | 2 | - | Dev > QC |
| feat-start-free-trial-cta | Start Free Trial CTA — Frictionless Trial Entry for Pilot Recruitment | - | not_started | 2 | - | PM > Design > Dev > QC |
| UC-LANDING-ANALYTICS-GA4-001 | Landing Page Analytics — GA4 CTA & Conversion Tracking | - | not_started | 2 | defined | PM > Design > Dev > QC |
| feat-sms-analytics-dashboard | SMS Analytics Dashboard — Delivery, Reply & Booking Conversion | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| UC-12 | MRR Reporting | Phase 3 | complete | 2 | defined | PM > Analytics |
| feat-post-login-onboarding-wizard | Post-Login Onboarding Wizard for New Agents | - | not_started | 2 | defined | PM > Marketing > Design > Dev > QC |
| UC-6 | Cal.com Booking | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| gtm-landing-page | Landing Page | - | complete | 2 | - | PM > Marketing > Design > Dev > QC |
| UC-4 | FUB Agent Assignment | Phase 1 | complete | 2 | defined | PM > Dev > QC |
| gtm-content | Content Marketing Campaign | GTM | complete | 2 | - | PM > Marketing > QC |
| fix-pricing-section-shows-pilot-only-pricing-instead-o | Pricing section shows pilot-only pricing instead of 4-tier plan grid | - | complete | 2 | - | Dev > QC |
| feat-utm-capture-marketing-attribution | UTM Parameter Capture & Marketing Attribution | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| feat-nps-agent-feedback | NPS & Feedback Survey for Agents | - | not_started | 2 | defined | PM > Marketing > Design > Dev > QC |
| feat-lead-experience-simulator | Lead Experience Simulator & Conversation Viewer | - | not_started | 2 | defined | PM > Design > Dev > QC |
| feat-session-analytics-pilot | Session Analytics — Pilot Agent Usage Tracking | - | not_started | 2 | defined | PM > Marketing > Design > Dev > QC |
| fix-onboarding-page-does-not-read-utm-params-from-sess | Onboarding page does not read UTM params from sessionStorage or URL | - | complete | 2 | - | Dev > QC |
| integrate-claude-ai-sms | Integrate Claude AI for SMS Response Generation | Phase 1 | complete | 2 | - | Dev > QC |
| improve-UC-5-add-canada-as-an-option-for-co | Add Canada Country Option for CASL Compliance | Phase 1 | complete | 2 | - | PM > Dev > QC |
| fix-landing-page-does-not-capture-utm-params-to-sessio | Landing page does not capture UTM params to sessionStorage | - | complete | 2 | - | Dev > QC |
| improve-landing-page-analytics-ga4 | Landing Page Analytics — GA4/PostHog for CTA Clicks, Scroll Depth & Conversion Funnel | - | complete | 2 | defined | PM > Dev > QC |
| fix-main-landing-page-has-no-cta-analytics-instrumenta | Main landing page (/) has no CTA analytics instrumentation | - | not_started | 2 | - | Dev > QC |
| fix-api-endpoint-not-protected-by-session-middleware | API endpoint not protected by session middleware | - | not_started | 2 | - | Dev > QC |
| improve-UC-2-add-retry-logic | Add Retry Logic to FUB New Lead Auto-SMS | Phase 1 | complete | 2 | - | PM > Dev > QC |
| feat-auto-sync-deployed-pages-to-system-compo | Auto-Sync Deployed Pages to System Components | Phase 3 | complete | 3 | - | PM > Dev > QC |
| UC-7 | Dashboard Manual SMS | Phase 2 | complete | 3 | pass | PM > Design > Dev > QC |

## Phase: Phase 3

### feat-add-login-page-with-email-and-password — add login page with email and password

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 0
- **Description:** Feature request: add login page with email and password
- **Acceptance Criteria:**
  - Login page accessible at /login route
  - Email input field with validation
  - Password input field with masking
  - Login button triggers Supabase Auth
  - Error message displayed for invalid credentials
  - Successful login redirects to /dashboard
  - Session persisted across page refreshes
  - Link to signup page for new users
  - Link to password reset for forgotten passwords
  - Responsive design works on mobile devices
- **Workflow:** PM > Dev > QC

### UC-LANDING-MARKETING-001 — Marketing Landing Page — High-Converting Signup Flow

- **PRD:** Marketing Landing Page — High-Converting Signup Flow
- **Status:** complete
- **Priority:** 0
- **Description:** Transform the root route (/) from a developer-focused API docs page into a high-converting marketing landing page. Drive trial signups with clear value proposition, social proof, pricing transparency, and frictionless CTAs. Critical for distribution — currently blocking all prospect traffic.
- **Acceptance Criteria:**
  - Hero section with compelling headline, subheadline, and dual CTAs
  - Stats bar with 4 key metrics (<30s, 78%, 35%, 24/7)
  - Problem section with 3 pain point cards
  - Solution section with 4 feature cards
  - Social proof section with testimonials and trust badges
  - How It Works section with 3-step process
  - Pricing section with 4 tiers (Starter/Pro/Team/Brokerage)
  - FAQ section with 7 accordion items
  - Final CTA section with signup prompt
  - Fixed navigation with smooth scroll links
  - Footer with compliance links
  - Page load time <2 seconds
  - Responsive design (mobile-first)
  - WCAG 2.1 AA accessibility compliance
  - SEO meta tags and structured data
  - Analytics tracking for CTAs and scroll depth
- **Workflow:** PM > Marketing > Design > Dev > QC

### feat-add-auth-middleware-to-protect-dashboard — add auth middleware to protect dashboard and settings routes

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 0
- **Description:** Feature request: add auth middleware to protect dashboard and settings routes
- **Acceptance Criteria:**
  - Middleware checks for valid Supabase session on protected routes
  - Unauthenticated users redirected to /login
  - Protected routes: /dashboard, /dashboard/*, /settings, /settings/*
  - Public routes remain accessible: /, /login, /signup
  - Session validation happens server-side for API routes
  - Client-side route guards prevent flash of protected content
  - After login, user redirected to originally requested page
  - Logout clears session and redirects to /login
  - Session expiry handled gracefully (refresh token flow)
  - Auth state available via context/hook for UI components
- **Workflow:** PM > Dev > QC

### UC-BILLING-FIX-001 — Fix Billing Integration - Agent Not Found Error

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 0
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

### UC-REVENUE-RECOVERY-001 — Revenue Recovery — Close MRR Gap

- **PRD:** Revenue Recovery Plan — Critical MRR Gap Closure
- **Status:** complete
- **Priority:** 0
- **Description:** Analyze conversion funnel, reprioritize use cases by revenue impact, and execute 3 critical actions to get first paying agents within 44 days.
- **Acceptance Criteria:**
  - Conversion funnel analyzed and bottlenecks documented
  - Use cases reprioritized by revenue impact (P0/P1/P2/P3)
  - 3 critical actions identified to close MRR gap
  - Onboarding fix unblocks signup flow (fix-onboarding-500-error)
  - Landing page deployed and converting (UC-LANDING-MARKETING-001)
  - Real Twilio SMS activated (implement-twilio-sms-integration)
  - Weekly KPI tracking established
  - Go/No-Go decision points defined (Day 22, 25, 35)
  - Risk mitigation plan documented
- **Workflow:** PM > Dev > Marketing > QC

### UC-AUTH-FIX-001 — Implement Authentication Flow - Signup/Login

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 0
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

### feat-add-session-management-with-server-side- — add session management with server-side tokens

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 0
- **Description:** Feature request: add session management with server-side tokens
- **Acceptance Criteria:**
  - Supabase Auth configured for server-side session management
  - Access token stored securely (httpOnly cookie)
  - Refresh token rotation implemented
  - Session expiry handled automatically (token refresh)
  - Server-side session validation on API requests
  - Session persistence across page refreshes
  - Concurrent session handling (multiple devices)
  - Session revocation on logout
  - Session timeout after inactivity (configurable)
  - Secure cookie flags set (Secure, SameSite)
- **Workflow:** PM > Dev > QC

### fix-onboarding-500-error — Fix Onboarding Endpoint - Resolve Agents Table Schema Collision

- **PRD:** Fix Onboarding 500 Error — Complete Agents Table Migration
- **Status:** complete
- **Priority:** 0
- **Description:** Fix the critical 500 error on /api/agents/onboard that prevents new user account creation. The onboarding wizard completes successfully on the frontend, but the backend endpoint fails due to a schema collision between the orchestrator agents table and the product agents table in the same Supabase database.
- **Acceptance Criteria:**
  - Migration 013 runs successfully - real_estate_agents table exists
  - Core API routes updated: onboard, create, login (COMPLETED)
  - All remaining API routes updated to use real_estate_agents (PENDING: 12 files)
  - All library files updated: supabase.ts, subscription-service.js, webhook-processor.js, billing-cycle-manager.js, calcom-webhook-handler.js, booking-link-service.js (PENDING: 6 files)
  - All scripts/utilities updated (PENDING: 5 files)
  - No references to from("agents") remain in product code
  - Signup flow works end-to-end without 500 errors
  - Login works with migrated table
  - Billing portal loads without "Agent not found" error
  - Stripe webhooks process correctly
  - Health check confirms real_estate_agents table accessible
  - All E2E tests pass
- **Workflow:** Dev > QC

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

### UC-10 — Billing Portal

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 1
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

### UC-11 — Subscription Lifecycle

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 1
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

### UC-DEPLOY-LANDING-001 — Deploy Landing Page to Vercel

- **PRD:** -
- **Status:** complete
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

### feat-add-route-discovery-smoke-test — Route Discovery Smoke Test

- **PRD:** Route Discovery Smoke Test
- **Status:** complete
- **Priority:** 2
- **Description:** Add smoke test that automatically discovers all application routes and validates they return expected responses. Tests both public and protected routes with appropriate authentication.
- **Acceptance Criteria:**
  - Smoke test discovers all application routes automatically
  - Test validates each route returns HTTP 200
  - Public routes tested without authentication
  - Protected routes tested with valid session
  - Test reports pass/fail status per route
  - Routes to test: /, /login, /signup, /dashboard, /settings, /integrations
  - Test runs on every deployment
  - Failed routes optionally block deployment
  - Test execution time under 30 seconds
  - Test results logged with timestamps
- **Workflow:** PM > Dev > QC

### UC-12 — MRR Reporting

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 2
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

### feat-auto-sync-deployed-pages-to-system-compo — Auto-Sync Deployed Pages to System Components

- **PRD:** Auto-Sync Deployed Pages to System Components
- **Status:** complete
- **Priority:** 3
- **Description:** Automatically detect deployed Vercel pages and sync their URLs to the system_components table during each heartbeat. Ensures dashboard always shows accurate component status and URLs.
- **Acceptance Criteria:**
  - Heartbeat detects all deployed Vercel pages automatically
  - Page URLs extracted from Vercel deployment API
  - system_components table updated with page URLs
  - Component status synced (live, building, error)
  - New deployments trigger immediate sync (not just heartbeat)
  - Removed pages marked as deprecated in system_components
  - Sync logs stored for debugging
  - Failed syncs retry with exponential backoff
  - Dashboard reflects current deployment state within 5 minutes
  - Manual sync trigger available via admin endpoint
- **Workflow:** PM > Dev > QC


## Phase: Phase 1

### implement-twilio-sms-integration — Implement Real Twilio SMS Integration - Replace Mock

- **PRD:** Revenue Recovery Plan — Critical MRR Gap Closure
- **Status:** complete
- **Priority:** 0
- **Description:** Replace the mock SMS implementation with real Twilio integration. The current sendSmsViatwilio() function only logs to console and returns fake data. Implement actual Twilio API calls to send SMS messages to leads. Include proper error handling, delivery status tracking, and message logging to the database.
- **Acceptance Criteria:**
  - Twilio SDK installed and configured (twilio npm package)
  - Environment variables set: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER_US, TWILIO_PHONE_NUMBER_CA
  - sendSmsViaTwilio() function calls twilio.messages.create() with real API
  - SMS message includes: to (lead phone), from (Twilio number), body (AI message)
  - Twilio SID and status returned and stored in messages table
  - Failed SMS sends are retried with exponential backoff (max 3 attempts)
  - Delivery status callbacks from Twilio update message status in database
  - Messages table tracks: twilio_sid, status (sent/delivered/failed), sent_at, delivered_at
  - Error handling: invalid phone numbers, insufficient funds, rate limits
  - Cost tracking: log message cost per SMS for billing/usage analytics
  - Test: Submit lead → Receive actual SMS on test phone number
  - Test: Verify message appears in dashboard with correct status
  - A2P 10DLC compliance: registered sender ID for production use
- **Workflow:** Dev > QC

### fix-webhook-lead-persistence — Fix Webhook Lead Persistence - Store Leads in Supabase

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 1
- **Description:** Fix the critical bug where FUB webhook receives lead events but does NOT persist them to the Supabase leads table. The webhook handler emits events asynchronously but the event handlers never insert leads into the database. This causes the dashboard to always appear empty even when leads are received.
- **Acceptance Criteria:**
  - Lead.created event handler inserts lead into Supabase leads table
  - Lead data includes: id, fub_id, name, email, phone, source, status, agent_id
  - Lead.updated event handler updates existing lead record
  - Duplicate leads (same fub_id) are handled (upsert, not duplicate insert)
  - Lead status changes are persisted to database
  - Dashboard shows newly created leads within 5 seconds of webhook receipt
  - Lead appears in lead_summary view immediately after creation
  - Foreign key agent_id is correctly set based on FUB assignment or default agent
  - Error handling: failed inserts are logged and retried
  - Webhook returns 200 only after successful database persistence (or queue for retry)
  - Test: Submit lead via webhook → Verify in dashboard within 10 seconds
  - Test: Update lead in FUB → Verify changes reflected in dashboard
- **Workflow:** Dev > QC

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

### integrate-claude-ai-sms — Integrate Claude AI for SMS Response Generation

- **PRD:** Billing & Subscriptions
- **Status:** complete
- **Priority:** 2
- **Description:** Replace hardcoded SMS templates with actual AI-generated responses using Anthropic Claude API. The current generateAiSmsResponse() function uses static templates based on trigger type. Implement real LLM integration to generate contextual, personalized SMS responses based on lead data, conversation history, and agent preferences.
- **Acceptance Criteria:**
  - Anthropic SDK installed (@anthropic-ai/sdk)
  - Environment variable set: ANTHROPIC_API_KEY
  - Claude API called with proper prompt engineering
  - Prompt includes: lead context (name, source, timeline), conversation history, agent style preferences
  - Response is parsed and validated before sending
  - Token usage tracked and logged for cost monitoring
  - Response time under 5 seconds (Claude API call)
  - Fallback to templates if Claude API fails or times out
  - A/B testing framework: compare template vs AI responses
  - Agent can set tone preference (professional, friendly, concise)
  - AI responses respect SMS character limits (160 chars, or 320 for concatenated)
  - Opt-out keywords (STOP, UNSUBSCRIBE) never AI-generated, always standard compliance message
  - Test: Lead with budget info → AI mentions budget in response
  - Test: Lead with timeline → AI acknowledges timeline
  - Test: Follow-up response references previous conversation
- **Workflow:** Dev > QC

### improve-UC-5-add-canada-as-an-option-for-co — Add Canada Country Option for CASL Compliance

- **PRD:** Lead Opt-Out Compliance Enhancement — Canada Support
- **Status:** complete
- **Priority:** 2
- **Description:** Improve UC-5 Lead Opt-Out by adding Canada as a country option in the auth/onboarding flow. This enables Canadian real estate agents to configure CASL-compliant opt-out handling with bilingual (English/French) support.
- **Acceptance Criteria:**
  - Country selector added to onboarding Step 2 with Canada and US options
  - Country stored in agents table (US/CA)
  - Country stored in leads table (US/CA)
  - Canadian timezone options shown when Canada selected
  - French opt-out keywords recognized: ARRET, DESABONNER
  - English opt-out keywords work for both countries
  - Bilingual opt-out confirmation sent based on keyword language
  - Country flag displayed in lead detail view
  - Country filter available in lead list
  - Compliance logs include country and language fields
- **Workflow:** PM > Dev > QC

### improve-UC-2-add-retry-logic — Add Retry Logic to FUB New Lead Auto-SMS

- **PRD:** FUB New Lead Auto-SMS — Retry Logic Enhancement
- **Status:** complete
- **Priority:** 2
- **Description:** Improve UC-2 by adding intelligent retry logic with exponential backoff for failed SMS sends. Currently 15-20% of welcome messages fail on first attempt with no retry mechanism. Target 99%+ delivery rate.
- **Acceptance Criteria:**
  - Retryable errors (429, 500, 503, timeout) trigger automatic retry
  - Exponential backoff with jitter: 2s, 4s, 8s, 16s delays
  - Max 5 retry attempts within 30-second window
  - Non-retryable errors (400, 401, invalid phone) do not retry
  - sms_retries table tracks all retry attempts
  - messages table updated with retry_count and final_status
  - Retry worker polls queue every 5 seconds
  - Admin notified when all retries fail
  - Manual retry button in dashboard for failed messages
  - Delivery rate >= 99% after retries implemented
- **Workflow:** PM > Dev > QC


## Phase: Unassigned

### fix-bookings-table-does-not-exist-booking-conversion-a — bookings table does not exist — booking conversion always null

- **PRD:** -
- **Status:** not_started
- **Priority:** 1
- **Description:** ## bookings table does not exist — booking conversion always null
**Type:** bug
**Severity:** critical
**Source:** Product review 6a87e655-abce-4ca8-a523-0e8b30ef89a2

**Details:** The API queries a bookings table that does not exist in the Supabase schema. The error is caught non-fatally, so booking conversion silently returns null instead of erroring. PRD open question #2 (Does bookings table link to lead_id?) is unanswered. No booking conversion data will ever be shown until the table is created or an existing table is identified.

**Suggested fix:** Identify the correct table for Cal.com bookings (check leads table for booking_at or booked fields, or check if cal_com_bookings/appointments table exists). Create bookings table or update query to use existing structure. Verify Cal.com webhook stores lead_id.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-marketing-landing-page-not-deployed-to-production — Marketing landing page not deployed to production

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Marketing landing page not deployed to production
**Type:** bug
**Severity:** critical
**Source:** Product review 0d440d9f-5950-4e26-afdd-c4820eb39b98

**Details:** New marketing landing page code was committed on March 6, 2026 (commit 465186f) but has NOT been deployed to Vercel. Both leadflow-ai-five.vercel.app and the most recent Vercel deployment URL still serve the old developer-focused API docs page with headline "AI-Powered Lead Response" and an API Endpoints table. The root route (/) must show the new marketing page for any prospect traffic to convert.

**Suggested fix:** Deploy: cd product/lead-response/dashboard && vercel --prod --scope stojans-projects-7db98187
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-test-gateway-path — test gateway path

- **PRD:** -
- **Status:** stuck
- **Priority:** 1
- **Description:** Quick fix: test gateway path
- **Workflow:** Dev > QC

### fix-pilot-signups-database-table-missing — pilot_signups database table missing

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## pilot_signups database table missing
**Type:** bug
**Severity:** critical
**Source:** Product review 0d440d9f-5950-4e26-afdd-c4820eb39b98

**Details:** The /api/pilot-signup route.ts inserts into the pilot_signups Supabase table, but this table does not exist (PGRST205 error). All form submissions on the landing page will fail with a 500 error. This means the primary conversion mechanism is broken.

**Suggested fix:** Create pilot_signups table with columns: id (uuid), name (text), email (text), phone (text), brokerage_name (text), team_name (text), monthly_leads (text), current_crm (text), source (text), utm_campaign (text), created_at (timestamptz). Add unique constraint on email.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-queries-wrong-table-sms-stats-endpoint-returns — API queries wrong table — sms-stats endpoint returns 500

- **PRD:** -
- **Status:** not_started
- **Priority:** 1
- **Description:** ## API queries wrong table — sms-stats endpoint returns 500
**Type:** bug
**Severity:** critical
**Source:** Product review 6a87e655-abce-4ca8-a523-0e8b30ef89a2

**Details:** The /api/analytics/sms-stats route queries the messages table (which lacks an agent_id column), causing a runtime error and HTTP 500 response. The correct table is sms_messages, which has id, direction, status, agent_id, lead_id, and message_body columns. This makes the entire SMS Analytics feature non-functional in production.

**Suggested fix:** Change supabaseAdmin.from("messages") to supabaseAdmin.from("sms_messages") in route.ts. Also update: (1) body column reference from body to message_body for opt-out detection, (2) direction filter values from outbound/inbound to outbound-api/inbound (verify actual Twilio values in production data).
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-deployed-pages-not-registered-in-system- — Auto-Sync Deployed Vercel Pages to System Components

- **PRD:** Fix Deployed Pages Sync - Schema Alignment
- **Status:** complete
- **Priority:** 1
- **Description:** Automatically detect all deployed Vercel pages and sync their URLs to the system_components table. Ensure dashboard shows accurate component status and URLs.
- **Acceptance Criteria:**
  - Script runs without Supabase schema errors
  - All smoke_test entries sync to system_components
  - URLs stored in metadata and accessible
  - Component names display correctly (component_name column)
  - Status emojis set appropriately (🟢 for live)
  - Manual sync via node scripts/sync-system-components.js works
  - Heartbeat integration calls sync successfully
- **Workflow:** Dev > QC

### fix-primary-signup-api-api-agents-onboard-does-not-cap — Primary signup API (/api/agents/onboard) does not capture or write UTM parameters

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Primary signup API (/api/agents/onboard) does not capture or write UTM parameters
**Type:** bug
**Severity:** critical
**Source:** Product review df33f463-e283-4856-87f8-9c18a8a24738

**Details:** The main onboarding endpoint that creates real_estate_agents records accepts no UTM fields and does not insert utm_source, utm_medium, utm_campaign, utm_content, or utm_term into the database. The real_estate_agents table has all 5 UTM columns, but the POST body for /api/agents/onboard does not include them and the INSERT statement omits them entirely. All 5 existing signups show 0% attribution as a result.

**Suggested fix:** Add utm_source, utm_medium, utm_campaign, utm_content, utm_term to the /api/agents/onboard route — accept from request body, pass through to Supabase INSERT on real_estate_agents table.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-ga4-script-tag-missing-from-layout-tsx-all-analyti — GA4 script tag missing from layout.tsx — all analytics events are no-ops

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## GA4 script tag missing from layout.tsx — all analytics events are no-ops
**Type:** bug
**Severity:** critical
**Source:** Product review 4c2acde8-47b9-4bf2-9f32-36bd311e8582

**Details:** FR-1 (P0) requires adding the gtag.js Script component to app/layout.tsx with NEXT_PUBLIC_GA4_MEASUREMENT_ID env var. This was NOT done. The ga4.ts helper checks typeof window.gtag !== function before firing any event. Since gtag is never loaded, every trackEvent(), trackCTAClick(), trackFormEvent() and trackScrollMilestone() call is silently dropped. Zero events reach GA4 in production.

**Suggested fix:** Add GA4 Script tag to product/lead-response/dashboard/app/layout.tsx using the pattern from the PRD: import Script from next/script; const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID; and add Script tags with strategy=afterInteractive. Also add NEXT_PUBLIC_GA4_MEASUREMENT_ID to Vercel environment variables (Stojan provides the actual Measurement ID).
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-dashboard-routes-are-publicly-accessible — dashboard routes are publicly accessible with no auth protection

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: dashboard routes are publicly accessible with no auth protection
- **Workflow:** Dev > QC

### fix-signup-plan-options-not-displayed — Signup page shows Choose Your Plan but no plan options are listed

- **PRD:** Fix Signup Page — Plan Options Not Displayed
- **Status:** complete
- **Priority:** 1
- **Description:** Bug: The /signup page renders the "Choose Your Plan" heading but shows no plan cards (Starter, Pro, Team). Users cannot select a plan tier and the sign-up flow is entirely broken. Root cause TBD — likely a Vercel env var missing or stale deployment.
- **Acceptance Criteria:**
  - Navigate to https://leadflow-ai-five.vercel.app/signup — 3 plan cards (Starter/Pro/Team) are visible with prices and features
  - Clicking Get Started on any plan advances to the account details form with the selected plan shown
  - Back button on the details form returns to the plan selection grid
  - No JS console errors on the signup page
  - npm run build succeeds without undefined env var warnings
- **Workflow:** Dev > QC

### fix-landing-page-has-no-links-to-signup-or-o — landing page has no links to signup or onboarding pages

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: landing page has no links to signup or onboarding pages
- **Workflow:** Dev > QC

### fix-signup-page-has-no-link-back-to-login-an — signup page has no link back to login and no login page exists

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: signup page has no link back to login and no login page exists
- **Workflow:** Dev > QC

### fix-status — status

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: status
- **Workflow:** Dev > QC

### fix-test-genome-separation — test genome separation

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: test genome separation
- **Workflow:** Dev > QC

### fix-signup-creates-customer-record-but-login — signup creates customer record but login queries agents table - auth flow is broken because signup and login use different database tables and password is never collected during signup

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: signup creates customer record but login queries agents table - auth flow is broken because signup and login use different database tables and password is never collected during signup
- **Workflow:** Dev > QC

### fix-sms-messages-direction-values-are-outbound-api-not — sms_messages.direction values are outbound-api not outbound

- **PRD:** -
- **Status:** not_started
- **Priority:** 2
- **Description:** ## sms_messages.direction values are outbound-api not outbound
**Type:** bug
**Severity:** high
**Source:** Product review 6a87e655-abce-4ca8-a523-0e8b30ef89a2

**Details:** The sms_messages table contains direction values of outbound-api (Twilio-format) rather than the outbound/inbound the API filters for. With only 2 rows in the table (outbound-api: queued, outbound-api: failed), even with the correct table name, the delivery rate query would return 0 matches because direction=outbound never matches outbound-api.

**Suggested fix:** Update direction filter to use LIKE or IN clause: .in("direction", ["outbound", "outbound-api", "outbound-reply"]) for outbound, and similarly for inbound. Alternatively normalize direction values when storing. Verify actual production values by querying Twilio message data.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-lead-satisfaction-feedback — Lead Satisfaction Feedback Collection

- **PRD:** Lead Satisfaction Feedback Collection
- **Status:** not_started
- **Priority:** 2
- **Description:** Measure if leads feel helped or annoyed by AI SMS responses. Send a brief satisfaction check-in SMS after AI conversation exchanges, classify replies, surface satisfaction metrics in the agent dashboard, and allow agents to disable pings via a settings toggle.
- **Acceptance Criteria:**
  - ["lead_satisfaction_events table created with lead_id, agent_id, conversation_id, rating, raw_reply, created_at","satisfaction_ping_enabled column added to agents table (default: true)","Satisfaction ping SMS sent after 2+ AI exchanges, max once per conversation, 10-min cooldown","Inbound replies classified as positive/negative/neutral/unclassified","STOP replies also trigger existing opt-out flow","Dashboard shows LeadSatisfactionCard with % positive/negative/neutral (shown when 5+ events)","Agent settings toggle to disable satisfaction pings","All E2E tests pass"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-no-analytics-tracking-implemented-ga4-utm-conversi — No analytics tracking implemented (GA4, UTM, conversion events)

- **PRD:** Landing Page Analytics — GA4/PostHog CTA, Scroll Depth & Conversion Funnel
- **Status:** complete
- **Priority:** 2
- **Description:** ## No analytics tracking implemented (GA4, UTM, conversion events)
**Type:** spec_gap
**Severity:** high
**Source:** Product review 0d440d9f-5950-4e26-afdd-c4820eb39b98

**Details:** PRD FR-9 and NFR require Google Analytics 4 integration, conversion tracking for CTA clicks/form submissions, and UTM parameter capture. None of these are implemented in the current code. Without analytics, there is no way to measure page performance, conversion rate, or the effectiveness of any marketing campaigns driving to this page.

**Suggested fix:** Add GA4 script tag in layout.tsx, implement event tracking for CTA clicks (join_pilot, see_how_it_works), form opens, form submissions, and scroll depth. Capture UTM params in form submission payload.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-no-forgot-password-flow — Forgot Password / Password Reset Flow

- **PRD:** Forgot Password / Password Reset Flow
- **Status:** complete
- **Priority:** 2
- **Description:** The login page has a stub Forgot Password button (alert). Implement full forgot password flow: email input page, token dispatch via Resend, reset-password page, API routes, and DB token table.
- **Acceptance Criteria:**
  - ["Clicking Forgot password? on /login navigates to /forgot-password (not an alert)","Entering a registered email results in receiving a reset email within 30 seconds","Submitting a non-existent email shows same success message (anti-enumeration)","Clicking reset link opens /reset-password?token=... and password can be updated","Logging in with new password succeeds; old password fails","Using same reset link twice returns error","Reset link older than 1 hour returns error"]
- **Workflow:** Dev > QC

### improve-landing-page-pricing-4-tiers — Landing Page Pricing Section — All 4 Tiers with Feature Comparison

- **PRD:** Landing Page Pricing Section — All 4 Tiers with Feature Comparison
- **Status:** not_started
- **Priority:** 2
- **Description:** Show all 4 pricing tiers (Starter $49/mo, Pro $149/mo, Team $399/mo, Brokerage $999+/mo) on the marketing landing page with a feature comparison, matching PMF.md prices. The current landing page has no pricing section; the /pricing page shows 3 wrong tiers at $497/$997/$1997.
- **Acceptance Criteria:**
  - ["Landing page (/) has a visible pricing section with all 4 tiers before the footer","Prices match PMF.md: Starter $49, Pro $149, Team $399, Brokerage $999+","Pro tier is visually highlighted as Most Popular","All tiers have working CTA buttons (Starter/Pro/Team to /signup, Brokerage to contact)","/pricing page corrected: 4 tiers at correct prices with feature comparison table","Feature comparison table shows checkmarks and dashes per feature matrix in PRD","Mobile responsive: pricing cards stack vertically on 375px viewport"]
- **Workflow:** PM > Design > Dev > QC

### feat-lead-magnet-email-capture — Lead Magnet / Email Capture on Landing Page

- **PRD:** Lead Magnet / Email Capture on Landing Page
- **Status:** not_started
- **Priority:** 2
- **Description:** Capture emails of landing page visitors not ready to sign up by offering a lead magnet (PDF guide: "The 5-Minute AI Lead Response Playbook"). Email capture form on landing page → /api/lead-capture endpoint → record stored in pilot_signups with source=lead_magnet → automated 3-email nurture sequence (instant delivery, Day 3 social proof, Day 7 pilot invite). Goal: build nurture list and convert to trial/signup within 30 days. KPIs: 20+ captures in 30 days, ≥10% → trial conversion.
- **Acceptance Criteria:**
  - ["Form renders between hero and pricing sections on landing page","Valid email submission: success message shown, record saved in pilot_signups with source=lead_magnet","Invalid email: inline error shown, API not called","Delivery email sent to captured inbox within 60 seconds","Duplicate email: success state shown, no duplicate row created","UTM parameters captured and stored on submission","Form fully usable on mobile (375px viewport)"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-stats-bar-metrics-do-not-match-prd-specification — Stats bar metrics do not match PRD specification

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Stats bar metrics do not match PRD specification
**Type:** spec_gap
**Severity:** high
**Source:** Product review 0d440d9f-5950-4e26-afdd-c4820eb39b98

**Details:** PRD FR-2 requires: "<30s", "78%", "35%", "24/7" with labels "Response Time", "Deals to First Responder", "Leads Never Responded To", "Always On". Implementation shows: "21x", "<30 sec", "40%", "24/7" in the social proof section. The 78% (deals to first responder) and 35% (leads never responded to) stats — both high-credibility, source-backed figures — are absent. These are conversion-critical trust signals.

**Suggested fix:** Add a dedicated stats bar section above or below hero with the 4 PRD-specified metrics: <30s / 78% / 35% / 24/7.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-start-free-trial-cta — Start Free Trial CTA — Frictionless Trial Entry for Pilot Recruitment

- **PRD:** Start Free Trial CTA — Frictionless Trial Entry
- **Status:** not_started
- **Priority:** 2
- **Description:** Add a frictionless Start Free Trial CTA to the marketing landing page. Visitors enter email + password (2 fields), receive a 30-day Pro trial account with no credit card required, and are redirected immediately to the onboarding wizard. CTA placed in 3 locations: hero (above fold), features section, pricing section. Existing pilot application form preserved at /pilot.
- **Acceptance Criteria:**
  - ["Start Free Trial button visible above fold on desktop (1280px) and mobile (375px)","User can create account with only email + password — no credit card field","Account created and user redirected to dashboard within 5 seconds","New account has plan_tier=trial and trial_ends_at set to 30 days from creation","Trial badge with days remaining visible in dashboard nav","CTA appears in hero, features section, and pricing section (3 placements)","Existing pilot application form still accessible","Trial accounts have source=trial_cta on agents record","Duplicate email shows friendly error with sign-in link"]
- **Workflow:** PM > Design > Dev > QC

### UC-LANDING-ANALYTICS-GA4-001 — Landing Page Analytics — GA4 CTA & Conversion Tracking

- **PRD:** Landing Page Analytics: GA4 CTA & Conversion Tracking
- **Status:** not_started
- **Priority:** 2
- **Description:** Add Google Analytics 4 to the LeadFlow marketing landing page to track CTA clicks (cta_click events per button/location), pilot signup form interactions (form_open, form_submit, form_success, form_error), scroll depth milestones (25/50/75/90%), and UTM parameter capture. Enables measurement of top-of-funnel conversion performance during the 60-day pilot window.
- **Acceptance Criteria:**
  - GA4 script loads on landing page without blocking render (LCP unaffected)
  - cta_click event fires for every CTA button with cta_location and cta_text params
  - form_open fires when pilot signup modal/form is opened
  - form_submit fires on form submission attempt
  - form_success fires only when API returns success
  - Scroll depth events fire at 25%, 50%, 75%, 90% milestones
  - UTM parameters captured correctly in GA4 session
  - No PII in any event parameters
  - Script loads gracefully when env var is missing (no JS errors)
  - Stojan can view CTA click data in GA4 Events report within 24h of deploy
- **Workflow:** PM > Design > Dev > QC

### feat-sms-analytics-dashboard — SMS Analytics Dashboard — Delivery, Reply & Booking Conversion

- **PRD:** SMS Analytics Dashboard — Delivery, Reply & Booking Conversion Tracking
- **Status:** complete
- **Priority:** 2
- **Description:** Real estate agents need visibility into SMS delivery rate, lead reply rate, and booking conversion rate. This feature adds a /api/analytics/sms-stats endpoint and 3 stat cards to the agent dashboard with a time window selector (7d/30d/all-time).
- **Acceptance Criteria:**
  - GET /api/analytics/sms-stats returns delivery rate, reply rate, booking conversion for authenticated agent
  - Endpoint respects ?window=7d|30d|all parameter
  - Dashboard stats bar shows 3 new metric cards: Delivery Rate, Reply Rate, Booking Conversion
  - Time window selector updates all 3 metrics without page reload
  - Empty state shows — (not 0%) when no data exists for the window
  - No cross-agent data leakage (agent-scoped queries only)
  - Mobile responsive layout confirmed on iPhone SE viewport
  - QC: Stojan can log in, view metrics, change time window, and verify numbers match Supabase raw data
- **Workflow:** PM > Marketing > Design > Dev > QC

### feat-post-login-onboarding-wizard — Post-Login Onboarding Wizard for New Agents

- **PRD:** Post-Login Onboarding Wizard for New Agents
- **Status:** not_started
- **Priority:** 2
- **Description:** Guided setup wizard shown to new agents after first login. Walks through 3 steps: (1) Connect FUB integration via API key + webhook registration, (2) Configure Twilio phone number (provision new or enter existing), (3) Verify SMS by sending a test message to agent mobile. Wizard state persisted per agent; skipped steps accessible later in Settings -> Integrations.
- **Acceptance Criteria:**
  - ["Wizard auto-triggers on first login if onboarding_completed = false","Wizard does NOT re-trigger for agents with onboarding_completed = true","Step 1: FUB API key validation is a real live call to FUB API","Step 1: On success, webhook URL is auto-registered in FUB","Step 2: Agent can provision a new Twilio number by area code","Step 2: Agent can enter an existing Twilio number (E.164 validated)","Step 3: Test SMS is actually delivered to agent mobile number","agents table updated at each step (fub_connected, phone_configured, sms_verified)","Agent can skip any step and complete later via Settings -> Integrations","onboarding_completed = true set on completion screen","All wizard API endpoints require authenticated session","UI is mobile-responsive","E2E: full wizard flow (all 3 steps) passes","E2E: partial flow with skipped steps passes"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### gtm-landing-page — Landing Page

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** Create a high-converting landing page that clearly communicates the value proposition, pricing, and includes a signup CTA.
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-pricing-section-shows-pilot-only-pricing-instead-o — Pricing section shows pilot-only pricing instead of 4-tier plan grid

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Pricing section shows pilot-only pricing instead of 4-tier plan grid
**Type:** spec_gap
**Severity:** high
**Source:** Product review 0d440d9f-5950-4e26-afdd-c4820eb39b98

**Details:** PRD FR-5 requires 3 tiers (Starter /mo, Pro /mo featured, Team /mo). UC acceptance criteria requires 4 tiers (Starter/Pro/Team/Brokerage). Implementation shows a single "Pilot Agent Special" section with FREE pricing. The actual pricing tiers are not displayed, making it impossible for prospects to evaluate plans. Post-pilot pricing is only mentioned as "/month" in fine print.

**Suggested fix:** Add full pricing grid with Starter/Pro/Team tiers as specified in PRD FR-5, with "Most Popular" badge on Pro tier. Keep pilot CTA as primary action but show regular pricing clearly.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-utm-capture-marketing-attribution — UTM Parameter Capture & Marketing Attribution

- **PRD:** UTM Parameter Capture & Marketing Attribution
- **Status:** complete
- **Priority:** 2
- **Description:** Capture UTM parameters when visitors land on the marketing landing page. Persist through signup flow. Store on agent record. Surface attribution breakdown in dashboard. Enables channel-level ROI measurement for pilot recruitment campaigns.
- **Acceptance Criteria:**
  - ["Landing page captures UTM params and writes to sessionStorage on first load (first-touch wins)","Signup form reads UTM from sessionStorage and includes in POST body","agents table has 5 new UTM columns (utm_source, utm_medium, utm_campaign, utm_content, utm_term)","API endpoint writes UTM fields to agent record on signup","Dashboard shows attribution breakdown by source/medium/campaign","Manual test: visit /?utm_source=test&utm_medium=email&utm_campaign=pm-test → sign up → confirm fields in Supabase","Direct visit (no UTM) → all UTM fields remain NULL, no errors"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### feat-nps-agent-feedback — NPS & Feedback Survey for Agents

- **PRD:** NPS / Feedback Survey Mechanism for Real Estate Agents
- **Status:** not_started
- **Priority:** 2
- **Description:** Collect NPS scores and open-ended feedback from real estate agents (customers) via automated email surveys (T+14d, T+90d), always-on in-app feedback button, admin NPS trend dashboard, and churn risk detection for detractor scores.
- **Acceptance Criteria:**
  - ["Agent receives NPS email 14 days after signup and every 90 days thereafter","Survey email contains 0-10 scale question and optional open text field","Agent can submit survey via email link without logging in (signed JWT token)","In-app NPS prompt shown on dashboard login when survey is due; dismissible","Persistent Give Feedback button in dashboard allows any-time submission","Feedback form supports 4 types: Works great, Bug, Idea, Frustration","Admin NPS view at /admin/nps shows current NPS score, trend, and recent responses","NPS calculated as % Promoters minus % Detractors from last 90 days","Detractor score (0-6) auto-creates churn_risk entry in product_feedback table","Survey scheduling tracked per agent; no duplicate sends within 30 days of last survey"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### feat-lead-experience-simulator — Lead Experience Simulator & Conversation Viewer

- **PRD:** Lead Experience Simulator & Conversation Viewer
- **Status:** not_started
- **Priority:** 2
- **Description:** Admin tool for Stojan to simulate the lead SMS experience in dry-run mode (no real SMS sent) and view real anonymized conversation threads. Enables live demos during pilot agent pitches via a time-limited share link.
- **Acceptance Criteria:**
  - Simulation runs without sending real SMS (Twilio logs confirm 0 outbound messages)
  - Full conversation displays in chat bubble UI after simulation
  - Real conversations viewer shows last 10 most recent conversations
  - Phone numbers masked to last 4 digits in conversation viewer
  - Demo share link works without login (token-based, 24h expiry)
  - Demo link expires after 24 hours
  - Simulation data stored in lead_simulations Supabase table
- **Workflow:** PM > Design > Dev > QC

### feat-session-analytics-pilot — Session Analytics — Pilot Agent Usage Tracking

- **PRD:** Session Analytics for Agent Dashboard — Pilot Usage Tracking
- **Status:** not_started
- **Priority:** 2
- **Description:** Track whether pilot real estate agents are actively logging in and using the dashboard. Captures session events, page views, and inactivity signals. Enables proactive outreach before pilots disengage.
- **Acceptance Criteria:**
  - ["agent_sessions table populated on each pilot login","agent_page_views table tracks dashboard navigation per session","GET /api/internal/pilot-usage returns current engagement data for all pilots","Pilots with >72h inactivity trigger a Telegram alert (max once per 24h)","Session logging failures do not break the authentication flow"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-onboarding-page-does-not-read-utm-params-from-sess — Onboarding page does not read UTM params from sessionStorage or URL

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Onboarding page does not read UTM params from sessionStorage or URL
**Type:** spec_gap
**Severity:** high
**Source:** Product review df33f463-e283-4856-87f8-9c18a8a24738

**Details:** The onboarding page (app/onboarding/page.tsx) does not read UTM data from sessionStorage or URL and does not include UTM fields in the state object passed to completeOnboarding(). Even if the landing page captured UTMs to sessionStorage, the signup form submission would not pass them to the backend.

**Suggested fix:** On OnboardingPage mount, read sessionStorage leadflow_utm (or URL params if direct UTM link to /onboarding). Add utm_source, utm_medium, utm_campaign, utm_content, utm_term to agentData state and include in the POST to /api/agents/onboard.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-landing-page-does-not-capture-utm-params-to-sessio — Landing page does not capture UTM params to sessionStorage

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Landing page does not capture UTM params to sessionStorage
**Type:** spec_gap
**Severity:** high
**Source:** Product review df33f463-e283-4856-87f8-9c18a8a24738

**Details:** PRD acceptance criterion AC-1 requires the landing page to capture UTM parameters on load and persist to sessionStorage (first-touch wins). The current landing page (app/page.tsx) has no URL param parsing logic and no sessionStorage write. UTM parameters in inbound links are silently discarded.

**Suggested fix:** Add a useEffect in page.tsx (or a shared layout) that reads URLSearchParams on mount, checks for any utm_* params, and writes them to sessionStorage under key leadflow_utm only if not already set (first-touch).
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### improve-landing-page-analytics-ga4 — Landing Page Analytics — GA4/PostHog for CTA Clicks, Scroll Depth & Conversion Funnel

- **PRD:** Landing Page Analytics — GA4/PostHog CTA, Scroll Depth & Conversion Funnel
- **Status:** complete
- **Priority:** 2
- **Description:** Improve the landing page with event-level analytics tracking. Implement GA4 (primary) to measure CTA click-through rates, scroll depth milestones (25/50/75/90%), and the full conversion funnel: page_view → cta_click → form_start → form_submit_attempt → pilot_signup_complete. PostHog optional for session replay.
- **Acceptance Criteria:**
  - ["GA4 script loads via Next.js Script component with strategy=afterInteractive","cta_click event fires for all CTA buttons with cta_id, section, cta_label params","Scroll depth events fire at 90% via GA4 Enhanced Measurement","Form funnel events tracked: form_start, form_submit_attempt, pilot_signup_complete","pilot_signup_complete marked as GA4 conversion","No PII (email/phone/name) in any event parameters","Page load performance not degraded (< 2s Lighthouse score maintained)","NEXT_PUBLIC_GA4_MEASUREMENT_ID env var used (not hardcoded)","Analytics works in production; no-ops gracefully in local dev without the env var"]
- **Workflow:** PM > Dev > QC

### fix-main-landing-page-has-no-cta-analytics-instrumenta — Main landing page (/) has no CTA analytics instrumentation

- **PRD:** -
- **Status:** not_started
- **Priority:** 2
- **Description:** ## Main landing page (/) has no CTA analytics instrumentation
**Type:** bug
**Severity:** high
**Source:** Product review 4c2acde8-47b9-4bf2-9f32-36bd311e8582

**Details:** The main landing page (app/page.tsx) contains "Get Started Free" and "Sign In" nav CTAs plus a test webhook button, but none are instrumented with trackCTAClick(). The PRD lists specific CTA IDs (join_pilot_hero, see_how_it_works, join_pilot_nav, start_trial_form, pricing_starter, pricing_pro, pricing_team, lead_magnet_cta) that are not present in the current landing page markup. Analytics was applied to /pilot page only, which is the pilot application form — not the main marketing landing page.

**Suggested fix:** Instrument app/page.tsx navigation and hero CTAs with trackCTAClick(). Also apply scroll milestone observers to section landmarks. However: the current page.tsx is not the intended marketing landing page (it shows webhook test UI) — dev should align with the intended landing page design before adding analytics.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-endpoint-not-protected-by-session-middleware — API endpoint not protected by session middleware

- **PRD:** -
- **Status:** not_started
- **Priority:** 2
- **Description:** ## API endpoint not protected by session middleware
**Type:** security
**Severity:** high
**Source:** Product review 6a87e655-abce-4ca8-a523-0e8b30ef89a2

**Details:** The Next.js middleware matcher (/((?!api|...).*)) explicitly excludes /api/* routes from session validation. The sms-stats endpoint accepts agent_id as a query param with no session verification, meaning: (1) unauthenticated requests can hit the endpoint, (2) any authenticated user could pass any agent_id to view another agent's data. PRD requires agent-scoped queries enforced by session middleware.

**Suggested fix:** Add session validation inside the route handler using the session token cookie. Extract agent_id from the validated session (not from query params). Return 401 if no valid session. Alternatively extend middleware matcher to include /api/analytics/* routes.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC


## Phase: Phase 2

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


## Phase: GTM

### gtm-content — Content Marketing Campaign

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** Generate traffic through content marketing to address zero visitors issue. Create and distribute valuable content to attract real estate agents to LeadFlow AI.
- **Acceptance Criteria:**
  - Content strategy document created (topics, channels, schedule)
  - Minimum 3 blog posts published on real estate lead generation topics
  - Social media posts scheduled (LinkedIn, Twitter/X)
  - Email newsletter campaign drafted
  - SEO keywords identified and incorporated
  - Content distribution plan executed
  - Traffic analytics tracking configured
  - Lead magnet (guide/checklist) created for email capture
- **Workflow:** PM > Marketing > QC

