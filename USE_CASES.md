<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# Use Cases

> Generated: 2026-03-15T06:15:35.590Z | Source: `use_cases` + `prds` tables

**Progress: 158/163 complete**

| UC | Name | Phase | Status | Priority | E2E | Workflow |
|----|------|-------|--------|----------|-----|----------|
| implement-twilio-sms-integration | Implement Real Twilio SMS Integration - Replace Mock | Phase 1 | complete | 0 | defined | Dev > QC |
| UC-LANDING-MARKETING-001 | Marketing Landing Page — High-Converting Signup Flow | Phase 3 | complete | 0 | defined | PM > Marketing > Design > Dev > QC |
| fix-trial-signup-redirects-to-nonexistent-onboarding-page | Fix trial signup redirect to non-existent /dashboard/onboarding page | mvp | complete | 0 | - | PM > Dev > QC |
| UC-AUTH-FIX-001 | Implement Authentication Flow - Signup/Login | Phase 3 | complete | 0 | - | PM > Design > Dev > QC |
| feat-stripe-checkout-production-e2e | Stripe Checkout Production Verification — First Real Transaction Test | Phase 1 | in_progress | 0 | - | PM > Dev > QC |
| feat-admin-pilot-invite-flow | Admin Pilot Invite Flow — Direct Recruitment by Stojan | Phase 1 | in_progress | 0 | - | PM > Dev > QC |
| UC-REVENUE-RECOVERY-001 | Revenue Recovery — Close MRR Gap | Phase 3 | complete | 0 | defined | PM > Dev > Marketing > QC |
| feat-aha-moment-lead-simulator | Aha Moment: Live Lead Simulator in Onboarding — First AI Response in <30s | - | complete | 0 | defined | PM > Dev > QC |
| feat-self-serve-stripe-checkout | Self-Serve Stripe Checkout — In-Dashboard Upgrade Flow | Phase 1 | complete | 0 | - | PM > Dev > QC |
| free-pilot-no-credit-card-required | Free Pilot Onboarding — No Credit Card Required | Phase 1 | complete | 0 | defined | Dev > QC |
| fix-onboarding-500-error | Fix Onboarding Endpoint - Resolve Agents Table Schema Collision | Phase 3 | complete | 0 | - | Dev > QC |
| UC-BILLING-FIX-001 | Fix Billing Integration - Agent Not Found Error | Phase 3 | complete | 0 | - | PM > Dev > QC |
| feat-add-auth-middleware-to-protect-dashboard | add auth middleware to protect dashboard and settings routes | Phase 3 | complete | 0 | - | PM > Dev > QC |
| feat-add-session-management-with-server-side- | add session management with server-side tokens | Phase 3 | complete | 0 | - | PM > Dev > QC |
| fix-remaining-agents-table-references | Fix remaining from(agents) table references — 15 routes still query wrong table | - | complete | 0 | - | Dev > QC |
| feat-add-login-page-with-email-and-password | add login page with email and password | Phase 3 | complete | 0 | - | PM > Dev > QC |
| feat-post-signup-dashboard-onboarding-redirect | Post-Signup Redirect to /dashboard/onboarding Wizard | Phase 1 | complete | 0 | defined | PM > Dev > QC |
| fix-primary-signup-api-api-agents-onboard-does-not-cap | Primary signup API (/api/agents/onboard) does not capture or write UTM parameters | - | complete | 1 | - | Dev > QC |
| fix-pilot-signups-database-table-missing | pilot_signups database table missing | - | complete | 1 | - | Dev > QC |
| fix-fix-not-implemented-23-api-routes-still-query-wron | Fix NOT implemented — 23 API routes still query wrong table (agents vs real_estate_agents) | - | complete | 1 | - | Dev > QC |
| fix-signup-onboarding-email-check-queries-wrong-table- | Signup/onboarding email check queries wrong table — always returns available regardless of registrations | - | complete | 1 | - | Dev > QC |
| fix-stripe-webhook-updates-orchestration-agents-table- | Stripe webhook updates orchestration agents table instead of real estate agent records | - | complete | 1 | - | Dev > QC |
| fix-bcrypt-password-verify-fails-after-signup | Fix: Stored password cannot be verified after account creation (bcrypt compareSync returns false) | - | complete | 1 | - | Dev > QC |
| fix-marketing-landing-page-not-deployed-to-production | Marketing landing page not deployed to production | - | complete | 1 | - | Dev > QC |
| fix-production-build-fails-typescript-error-in-trial-s | Production build fails: TypeScript error in trial-signup route | - | complete | 1 | - | Dev > QC |
| fix-deployed-pages-not-registered-in-system- | Auto-Sync Deployed Vercel Pages to System Components | - | complete | 1 | pass | Dev > QC |
| fix-webhook-lead-persistence | Fix Webhook Lead Persistence - Store Leads in Supabase | Phase 1 | complete | 1 | - | Dev > QC |
| fix-test-gateway-path | test gateway path | - | complete | 1 | - | Dev > QC |
| fix-signup-form-layout-inconsistency | Fix Signup Form Layout — Match Login Field Orientation | - | complete | 1 | - | Dev > QC |
| fix-get-api-internal-pilot-usage-endpoint-does-not-exi | GET /api/internal/pilot-usage endpoint does not exist | - | complete | 1 | - | Dev > QC |
| fix-no-feedback-button-in-dashboard-us-2-completely-ab | No Feedback button in dashboard — US-2 completely absent | - | complete | 1 | - | Dev > QC |
| fix-resend-api-key-not-set-in-vercel-email-delivery-no | RESEND_API_KEY not set in Vercel — email delivery non-functional | - | complete | 1 | - | Dev > QC |
| feat-onboarding-completion-telemetry | Onboarding Completion Telemetry — Know Exactly Where Real Agents Drop Off | Phase 1 | not_started | 1 | - | PM > Dev > QC |
| fix-nps-api-routes-api-nps-verify-and-api-nps-submit-r | NPS API routes /api/nps/verify and /api/nps/submit return 404 | - | complete | 1 | - | Dev > QC |
| fix-api-lead-capture-still-returns-500-in-production | /api/lead-capture still returns 500 in production | - | complete | 1 | - | Dev > QC |
| fix-remaining-from-agents-refs-satisfaction-debug | Fix remaining from(agents) references in satisfaction and debug routes | - | complete | 1 | - | Dev > QC |
| fix-ga4-script-tag-missing-from-layout-tsx-all-analyti | GA4 script tag missing from layout.tsx — all analytics events are no-ops | - | complete | 1 | - | Dev > QC |
| feat-frictionless-onboarding-flow | Self-Serve Frictionless Onboarding Flow | - | complete | 1 | defined | PM > Marketing > Design > Dev > QC |
| fix-aha-moment-lead-simulator-not-implemented-not-star | Aha moment lead simulator not implemented (not_started at day 22) | - | complete | 1 | - | Dev > QC |
| fix-madzunkov-hotmail-com-is-locked-out-email-verified | madzunkov@hotmail.com is locked out — email_verified=false, no way to verify | - | complete | 1 | - | Dev > QC |
| fix-dashboard-routes-are-publicly-accessible | dashboard routes are publicly accessible with no auth protection | - | complete | 1 | - | Dev > QC |
| fix-post-login-onboarding-wizard-fub-sms-aha-is-stuck- | Post-login onboarding wizard (FUB/SMS/aha) is STUCK and never auto-triggers | - | complete | 1 | - | Dev > QC |
| fix-first-session-sample-leads-fr-4-not-implemented | First-session sample leads (FR-4) not implemented | - | complete | 1 | - | Dev > QC |
| fix-signup-plan-options-not-displayed | Signup page shows Choose Your Plan but no plan options are listed | - | complete | 1 | defined | Dev > QC |
| fix-api-health-endpoint-wrong-table | Fix /api/health endpoint — queries wrong table (agents vs real_estate_agents) | - | complete | 1 | - | Dev > QC |
| feat-landing-page-conversion-cleanup | Landing Page Conversion Cleanup — Remove API Docs, Fix Pricing, Add Social Proof | - | complete | 1 | - | PM > Dev > QC |
| fix-trial-signup-redirects-to-non-existent-route-dashb | Trial signup redirects to non-existent route /dashboard/onboarding | - | complete | 1 | - | Dev > QC |
| fix-trial-signup-route-ts-still-redirects-to-dashboard | trial-signup/route.ts still redirects to /dashboard/onboarding | - | complete | 1 | - | Dev > QC |
| fix-page-tsx-not-updated-simulator-step-not-wired-into | page.tsx not updated — simulator step not wired into wizard | - | complete | 1 | - | Dev > QC |
| fix-no-self-serve-upgrade-path-from-pilot-to-paid | No self-serve upgrade path from pilot to paid | - | complete | 1 | - | Dev > QC |
| fix-trial-start-route-ts-redirects-to-onboarding-which | trial/start/route.ts redirects to /onboarding which blocks authenticated users | - | complete | 1 | - | Dev > QC |
| UC-10 | Billing Portal | Phase 3 | complete | 1 | defined | PM > Design > Dev > QC |
| feat-post-signup-redirect-to-dashboard-onboarding | Post-Signup Redirect to /dashboard/onboarding | - | complete | 1 | defined | Dev > QC |
| fix-bookings-table-does-not-exist-booking-conversion-a | bookings table does not exist — booking conversion always null | - | complete | 1 | - | Dev > QC |
| UC-11 | Subscription Lifecycle | Phase 3 | complete | 1 | defined | PM > Dev > QC |
| fix-start-free-trial-cta-missing-from-landing-page-3-p | Start Free Trial CTA missing from landing page — 3 placements not implemented | - | complete | 1 | - | Dev > QC |
| fix-mrr-is-0-no-paying-customers-despite-all-technical | MRR is $0 — no paying customers despite all technical blockers being resolved | - | complete | 1 | - | Dev > QC |
| fix-pilot-recruitment-blocked-2-action-items-waiting-s | Pilot recruitment blocked — 2 action items WAITING since Feb 25 with no response | - | complete | 1 | - | Dev > QC |
| fix-api-queries-wrong-table-sms-stats-endpoint-returns | API queries wrong table — sms-stats endpoint returns 500 | - | complete | 1 | - | Dev > QC |
| fix-landing-page-has-no-links-to-signup-or-o | landing page has no links to signup or onboarding pages | - | complete | 1 | - | Dev > QC |
| fix-landing-page-has-no-pricing-section | Landing page has NO pricing section | - | complete | 1 | - | Dev > QC |
| fix-pricing-page-shows-prices-10x-higher-than-pmf-md-s | /pricing page shows prices 10x higher than PMF.md strategy | - | complete | 1 | - | Dev > QC |
| feat-demo-without-signup | Live AI Demo — Experience the Product Without Signing Up | Phase 1 | complete | 1 | - | PM > Design > Dev > QC |
| feat-post-login-onboarding-wizard | Post-Login Onboarding Wizard for New Agents | - | complete | 1 | defined | PM > Marketing > Design > Dev > QC |
| fix-signup-page-has-no-link-back-to-login-an | signup page has no link back to login and no login page exists | - | complete | 1 | - | Dev > QC |
| UC-5 | Lead Opt-Out | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| fix-resend-api-key-not-configured-in-vercel-email-deli | RESEND_API_KEY not configured in Vercel — email delivery will not work | - | complete | 1 | - | Dev > QC |
| feat-pilot-conversion-email-sequence | Pilot-to-Paid Conversion Email Sequence | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| UC-1 | Lead-Initiated SMS | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| fix-db-migration-incomplete-email-verification-tokens- | DB migration incomplete: email_verification_tokens table does not exist | - | complete | 1 | - | Dev > QC |
| UC-2 | FUB New Lead Auto-SMS | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| fix-session-logging-not-integrated-into-login-flow | Session logging not integrated into login flow | - | complete | 1 | - | Dev > QC |
| fix-page-view-logging-not-implemented-agent-page-views | Page view logging not implemented — agent_page_views table empty | - | complete | 1 | - | Dev > QC |
| UC-3 | FUB Status Change | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| fix-status | status | - | complete | 1 | - | Dev > QC |
| fix-api-lead-capture-endpoint-returns-db-error-in-prod | /api/lead-capture endpoint returns DB error in production | - | complete | 1 | pass | Dev > QC |
| fix-test-genome-separation | test genome separation | - | complete | 1 | - | Dev > QC |
| fix-simulator-tsx-step-component-does-not-exist | simulator.tsx step component does not exist | - | complete | 1 | - | Dev > QC |
| feat-transactional-email-resend | Transactional Email Delivery via Resend — Activate the Signup Funnel | - | complete | 1 | - | Dev > QC |
| fix-three-consecutive-vercel-builds-failing-fix-never- | Three consecutive Vercel builds failing — fix never reached production | - | complete | 1 | - | Dev > QC |
| fix-touchsession-middleware-not-implemented-no-session | touchSession() middleware not implemented — no session heartbeat | - | complete | 1 | - | Dev > QC |
| fix-signup-creates-customer-record-but-login | signup creates customer record but login queries agents table - auth flow is broken because signup and login use different database tables and password is never collected during signup | - | complete | 1 | - | Dev > QC |
| fix-email-delivery-non-functional-resend-api-key-not-s | Email delivery non-functional - RESEND_API_KEY not set in Vercel | - | complete | 1 | - | Dev > QC |
| UC-9 | Customer Sign-Up Flow | Phase 3 | complete | 1 | defined | PM > Design > Dev > QC |
| fix-pilot-signup-route-ts-still-redirects-to-dashboard | pilot-signup/route.ts still redirects to /dashboard/onboarding (2 occurrences) | - | complete | 1 | - | Dev > QC |
| fix-admin-nps-page-does-not-exist-us-3-pm-dashboard-ab | /admin/nps page does not exist — US-3 PM dashboard absent | - | complete | 1 | - | Dev > QC |
| fix-onboarding-wizard-stuck-no-aha-moment-for-new-sign | Onboarding wizard stuck - no aha moment for new signups | - | complete | 2 | - | Design > Dev > QC |
| feat-repository-structure-convention | Repository Structure Convention for LeadFlow | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| feat-lead-satisfaction-feedback | Lead Satisfaction Feedback Collection | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| UC-8 | Follow-up Sequences | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| fix-no-analytics-tracking-implemented-ga4-utm-conversi | No analytics tracking implemented (GA4, UTM, conversion events) | - | complete | 2 | - | Dev > QC |
| UC-DEPLOY-LANDING-001 | Deploy Landing Page to Vercel | Phase 3 | complete | 2 | - | Dev > QC |
| fix-no-forgot-password-flow | Forgot Password / Password Reset Flow | - | complete | 2 | - | Dev > QC |
| feat-add-route-discovery-smoke-test | Route Discovery Smoke Test | Phase 3 | complete | 2 | - | PM > Dev > QC |
| feat-lead-magnet-email-capture | Lead Magnet / Email Capture on Landing Page | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| improve-landing-page-pricing-4-tiers | Landing Page Pricing Section — All 4 Tiers with Feature Comparison | - | complete | 2 | defined | PM > Design > Dev > QC |
| fix-stats-bar-metrics-do-not-match-prd-specification | Stats bar metrics do not match PRD specification | - | complete | 2 | - | Dev > QC |
| feat-start-free-trial-cta | Start Free Trial CTA — Frictionless Trial Entry for Pilot Recruitment | - | complete | 2 | - | PM > Design > Dev > QC |
| feat-sms-analytics-dashboard | SMS Analytics Dashboard — Delivery, Reply & Booking Conversion | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| UC-LANDING-ANALYTICS-GA4-001 | Landing Page Analytics — GA4 CTA & Conversion Tracking | - | complete | 2 | defined | PM > Design > Dev > QC |
| UC-12 | MRR Reporting | Phase 3 | complete | 2 | defined | PM > Analytics |
| UC-6 | Cal.com Booking | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| gtm-landing-page | Landing Page | - | complete | 2 | - | PM > Marketing > Design > Dev > QC |
| UC-4 | FUB Agent Assignment | Phase 1 | complete | 2 | defined | PM > Dev > QC |
| gtm-content | Content Marketing Campaign | GTM | complete | 2 | - | PM > Marketing > QC |
| feat-email-verification-before-login | Email Verification — Confirm Inbox Before Login | - | complete | 2 | defined | PM > Design > Dev > QC |
| fix-pricing-section-shows-pilot-only-pricing-instead-o | Pricing section shows pilot-only pricing instead of 4-tier plan grid | - | complete | 2 | - | Dev > QC |
| feat-utm-capture-marketing-attribution | UTM Parameter Capture & Marketing Attribution | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| fix-onboarding-page-does-not-read-utm-params-from-sess | Onboarding page does not read UTM params from sessionStorage or URL | - | complete | 2 | - | Dev > QC |
| feat-session-analytics-pilot | Session Analytics — Pilot Agent Usage Tracking | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| feat-nps-agent-feedback | NPS & Feedback Survey for Agents | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| feat-lead-experience-simulator | Lead Experience Simulator & Conversation Viewer | - | complete | 2 | defined | PM > Design > Dev > QC |
| integrate-claude-ai-sms | Integrate Claude AI for SMS Response Generation | Phase 1 | complete | 2 | - | Dev > QC |
| improve-UC-5-add-canada-as-an-option-for-co | Add Canada Country Option for CASL Compliance | Phase 1 | complete | 2 | - | PM > Dev > QC |
| fix-landing-page-does-not-capture-utm-params-to-sessio | Landing page does not capture UTM params to sessionStorage | - | complete | 2 | - | Dev > QC |
| improve-landing-page-analytics-ga4 | Landing Page Analytics — GA4/PostHog for CTA Clicks, Scroll Depth & Conversion Funnel | - | complete | 2 | defined | PM > Dev > QC |
| fix-sms-messages-direction-values-are-outbound-api-not | sms_messages.direction values are outbound-api not outbound | - | complete | 2 | - | Dev > QC |
| fix-agents-table-mismatch-auth-routes | Fix agents Table Mismatch in Auth/Onboarding API Routes | - | complete | 2 | - | Dev > QC |
| fix-social-proof-testimonials-section-not-implemented | Social proof / testimonials section not implemented | - | complete | 2 | - | Dev > QC |
| fix-feature-comparison-table-absent-from-pricing-page | Feature comparison table absent from /pricing page | - | complete | 2 | - | Dev > QC |
| fix-team-tier-399-mo-missing-from-pricing-page-only-3- | Team tier ($399/mo) missing from /pricing page — only 3 tiers shown | - | complete | 2 | - | Dev > QC |
| fix-trial-period-set-to-30-days-prd-specifies-14-days | Trial period set to 30 days — PRD specifies 14 days | - | complete | 2 | - | Dev > QC |
| fix-lead-magnet-feature-not-merged-to-main-branch | Lead magnet feature NOT merged to main branch | - | complete | 2 | - | Dev > QC |
| fix-expired-trial-handling-not-implemented-ac-8 | Expired trial handling not implemented (AC-8) | - | complete | 2 | - | Dev > QC |
| fix-main-landing-page-has-no-cta-analytics-instrumenta | Main landing page (/) has no CTA analytics instrumentation | - | complete | 2 | - | Dev > QC |
| fix-inactivity-alerting-cron-not-implemented | Inactivity alerting cron not implemented | - | complete | 2 | - | Dev > QC |
| fix-onboarding-still-present-in-auth-routes-middleware | /onboarding still present in AUTH_ROUTES (middleware.ts line 21) | - | complete | 2 | - | Dev > QC |
| fix-frontend-components-still-fall-back-to-dashboard-o | Frontend components still fall back to /dashboard/onboarding | - | complete | 2 | - | Dev > QC |
| fix-api-endpoint-not-protected-by-session-middleware | API endpoint not protected by session middleware | - | complete | 2 | - | Dev > QC |
| fix-duplicate-email-error-shows-plain-text-missing-sig | Duplicate email error shows plain text — missing sign-in link | - | complete | 2 | - | Dev > QC |
| fix-twilio-number-provisioning-not-implemented | Twilio number provisioning not implemented | - | complete | 2 | - | Dev > QC |
| improve-UC-2-add-retry-logic | Add Retry Logic to FUB New Lead Auto-SMS | Phase 1 | complete | 2 | - | PM > Dev > QC |
| fix-api-endpoints-developer-table-embedded-in-marketin | API Endpoints developer table embedded in marketing landing page | - | complete | 2 | - | Design > Dev > QC |
| fix-fub-webhook-registration-not-implemented | FUB webhook registration not implemented | - | complete | 2 | - | Dev > QC |
| pm-action-items-dashboard | PM Structured Action Items for Dashboard | Phase 2 | complete | 2 | defined | PM |
| fix-sync-system-components-js-used-wrong-column-names- | sync-system-components.js used wrong column names causing silent failure | - | complete | 2 | - | Dev > QC |
| fix-no-in-app-nps-prompt-on-dashboard-login | No in-app NPS prompt on dashboard login | - | complete | 2 | - | Dev > QC |
| fix-no-cron-job-or-api-endpoint-to-trigger-automated-n | No cron job or API endpoint to trigger automated NPS surveys | - | complete | 2 | - | Dev > QC |
| fix-dashboard-route-guard-missing-wizard-bypass-possib | Dashboard route guard missing — wizard bypass possible | - | complete | 2 | - | Dev > QC |
| fix-use-cases-implementation-status-marked-complete-de | use_cases.implementation_status marked complete despite fix not being applied | - | complete | 2 | - | Dev > QC |
| fix-pilot-pricing-decision-implemented-as-uc-spec | Pilot pricing decision implemented as UC spec | - | complete | 2 | - | Dev > QC |
| feat-genome-project-structure-convention | Project Structure Convention System | - | in_progress | 2 | - | PM > Dev > QC |
| fix-signup-routes-redirect-to-setup-not-dashboard-onbo | Signup routes redirect to /setup not /dashboard/onboarding | - | complete | 2 | - | Dev > QC |
| fix-prd-md-files-remain-at-docs-root-instead-of-docs-p | PRD-*.md files remain at docs/ root instead of docs/prd/ | - | complete | 2 | - | Dev > QC |
| fix-madzunkov-hotmail-com-has-plan-tier-null-account-m | madzunkov@hotmail.com has plan_tier=null — account may be broken | - | complete | 2 | - | Dev > QC |
| fix-next-public-ga4-measurement-id-not-configured-ga4- | NEXT_PUBLIC_GA4_MEASUREMENT_ID not configured — GA4 script will not load | - | complete | 2 | - | Dev > QC |
| feat-genome-auto-generated-docs-convention | Auto-generated docs directory convention | - | in_progress | 2 | defined | PM > Dev > QC |
| fix-how-it-works-section-not-implemented | How It Works section not implemented | - | complete | 2 | - | Dev > QC |
| fix-prd-objective-not-fully-implemented-product-api-ro | PRD objective not fully implemented: product API routes still query agents table | - | complete | 2 | - | Dev > QC |
| fix-brokerage-tier-missing-from-pricing-page | Brokerage tier missing from pricing page | - | complete | 2 | - | Design > Dev > QC |
| fix-middleware-blocks-authenticated-users-from-onboard | Middleware blocks authenticated users from /onboarding route | - | complete | 2 | - | Dev > QC |
| fix-analytics-events-table-missing-trial-funnel-tracki | analytics_events table missing — trial funnel tracking fails silently | - | complete | 2 | - | Dev > QC |
| fix-no-pilot-to-paid-conversion-email-sequence | No pilot-to-paid conversion email sequence | - | complete | 2 | - | Dev > QC |
| fix-api-start-action-requires-sessionid-before-session | API start action requires sessionId before sessionId exists — chicken-and-egg | - | complete | 2 | - | Dev > QC |
| fix-ahacompleted-not-included-in-onboarding-submit-pay | ahaCompleted not included in onboarding submit payload — FR-8 not implemented | - | complete | 2 | - | Dev > QC |
| fix-api-response-format-does-not-match-prd-contract | API response format does not match PRD contract | - | complete | 2 | - | Dev > QC |
| feat-leadflow-repository-restructuring | Repository restructuring | - | complete | 2 | defined | PM > Dev > QC |
| fix-cookie-name-mismatch-trial-start-sets-auth-token-u | Cookie name mismatch: trial/start sets auth_token (underscore) but /api/auth/me reads auth-token (hyphen) | - | complete | 2 | - | Dev > QC |
| fix-missing-how-it-works-section-ac-2-fails | Missing "How It Works" section — AC-2 fails | - | complete | 2 | - | Dev > QC |
| fix-trial-duration-mismatch-landing-says-30-day-signup | Trial duration mismatch — landing says 30-day, signup says 14-day (AC-3 fails) | - | complete | 2 | - | Dev > QC |
| fix-stripe-subscriptions-table | Fix: Create Subscriptions Table for Stripe Webhook Storage | - | complete | 3 | - | Dev > QC |
| feat-auto-sync-deployed-pages-to-system-compo | Auto-Sync Deployed Pages to System Components | Phase 3 | complete | 3 | - | PM > Dev > QC |
| UC-7 | Dashboard Manual SMS | Phase 2 | complete | 3 | pass | PM > Design > Dev > QC |

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

### feat-stripe-checkout-production-e2e — Stripe Checkout Production Verification — First Real Transaction Test

- **PRD:** -
- **Status:** in_progress
- **Priority:** 0
- **Description:** Verify the complete Stripe checkout → subscription → webhook → plan_tier update flow works in production before any real agent attempts to upgrade.

## Problem
feat-self-serve-stripe-checkout is marked 'complete' but has never processed a real transaction. The action_items table shows Stojan has not confirmed Stripe API keys are configured in Vercel. Without this, the first real paying customer will hit a broken checkout flow.

## Acceptance Criteria
- AC-1: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are confirmed set in Vercel env vars (not just local .env)
- AC-2: Stripe Products exist for Starter (/mo), Pro (/mo), Team (/mo) with correct price IDs
- AC-3: Test checkout session creation via /api/stripe/checkout with a Stripe test card succeeds
- AC-4: Stripe webhook receives and processes checkout.session.completed event
- AC-5: real_estate_agents row updates to plan_tier='starter'|'pro'|'team', subscription_status='active', stripe_customer_id set
- AC-6: Billing portal link at /dashboard/billing opens Stripe customer portal
- AC-7: All steps automated in smoke test that runs on every deployment

## Why This Unblocks Revenue
The entire pilot-to-paid conversion path is untested in production. If Stripe is misconfigured, the first pilot agent who tries to upgrade fails silently — destroying trust and losing the conversion.
- **Workflow:** PM > Dev > QC

### feat-admin-pilot-invite-flow — Admin Pilot Invite Flow — Direct Recruitment by Stojan

- **PRD:** Admin Pilot Invite Flow — Direct Recruitment by Stojan
- **Status:** in_progress
- **Priority:** 0
- **Description:** Enable Stojan to directly recruit pilot agents without relying on inbound traffic.

## Problem
Zero real agents have entered the funnel. Pilot recruitment has been waiting on action items for 22+ days. The product needs a direct-invite path: Stojan pastes an email, system creates the account, sends a personalized invite with a magic-link that bypasses email verification (trust is granted via invite).

## Acceptance Criteria
- AC-1: POST /api/admin/invite-pilot accepts {email, name, message} and requires admin authentication (env-based secret or separate admin token)
- AC-2: Creates a real_estate_agents row with status='invited', plan_tier='pilot', email_verified=true (bypasses email verification for invited agents)
- AC-3: Sends personalized pilot invite email via Resend with a direct one-click login link (magic token, expires 7 days)
- AC-4: Returns pilot invite URL that Stojan can also send manually (fallback)
- AC-5: Admin UI at /admin/invite (simple form: email + name + optional note)
- AC-6: pilot_invites table tracks: email, invited_at, accepted_at, invited_by, status
- AC-7: Smoke test verifies the invite endpoint works and email is dispatched

## Why This Unblocks Revenue
Without this, Stojan must wait for organic inbound + email verification — which has already cost 22+ days. With direct invites, Stojan can onboard 3 agents this week.
- **Acceptance Criteria:**
  - ["AC-1: POST /api/admin/invite-pilot requires admin auth (X-Admin-Token header)","AC-2: Creates real_estate_agents row with status=invited, plan_tier=pilot, email_verified=true","AC-3: Sends personalized Resend email with magic-link (expires 7 days)","AC-4: Returns invite URL in API response for manual fallback","AC-5: Admin UI at /admin/invite with form and invite list","AC-6: pilot_invites table tracks all invite lifecycle fields","AC-7: Smoke test verifies invite endpoint and email dispatch"]
- **Workflow:** PM > Dev > QC

### feat-self-serve-stripe-checkout — Self-Serve Stripe Checkout — In-Dashboard Upgrade Flow

- **PRD:** Self-Serve Stripe Checkout — In-Dashboard Upgrade Flow
- **Status:** complete
- **Priority:** 0
- **Description:** Pilot agents and trial users can upgrade to a paid plan (Starter/Pro/Team) directly from the dashboard without contacting Stojan. An "Upgrade" button in the dashboard/settings opens a Stripe Checkout session for the selected plan. On success, plan_tier and stripe_customer_id update automatically. Acceptance criteria: (1) Upgrade CTA visible in dashboard for pilot/trial agents; (2) Stripe Checkout session created server-side; (3) Webhook updates agent plan_tier on checkout.session.completed; (4) Dashboard reflects new tier immediately after payment; (5) Confirmation email sent via Resend; (6) Failed payments surface clear error UI.
- **Acceptance Criteria:**
  - Upgrade CTA visible in dashboard for pilot/trial agents (plan_tier: trial, pilot, null)
  - Upgrade CTA NOT shown for paid agents (starter, pro, team)
  - POST /api/billing/create-checkout-session creates Stripe Checkout session server-side
  - Checkout session uses correct price_id for selected plan
  - client_reference_id set to agent_id for webhook correlation
  - checkout.session.completed webhook validates Stripe signature
  - Webhook updates real_estate_agents: plan_tier, stripe_customer_id, stripe_subscription_id, plan_activated_at
  - Dashboard shows success banner on /dashboard?upgrade=success
  - Upgrade CTA absent after successful payment
  - Confirmation email sent via Resend with plan name, price, next billing date
  - Cancel redirect shows no-charge message at /settings/billing?upgrade=cancelled
  - Webhook is idempotent — repeated delivery does not double-update
- **Workflow:** PM > Dev > QC

### free-pilot-no-credit-card-required — Free Pilot Onboarding — No Credit Card Required

- **PRD:** -
- **Status:** complete
- **Priority:** 0
- **Description:** ## Decision Implementation: Free Pilot (No Credit Card Required)

**Decision ID:** 6293dfc3-01c5-4276-b024-df04fbdeda92
**Chosen Option:** Free pilot - no credit card required, pilot agents get 30-60 days free, convert manually
**Rationale:** Maximize pilot signups at Day 22 with $0 MRR. Remove all friction from the onboarding funnel.

### What to Build

Pilot agents (the first 3-5 real estate agents) can sign up and access LeadFlow AI without entering a credit card. They get full access for 30-60 days. Conversion to paid is handled manually by Stojan.

### User Journey

1. Agent visits leadflow-ai-five.vercel.app
2. Clicks "Start Free Pilot" CTA
3. Fills out signup form: name, email, brokerage, FUB API key
4. **No credit card step** — goes directly to onboarding
5. Agent is created in Supabase `agents` table with:
   - `plan_tier: "pilot"`
   - `pilot_started_at: now()`
   - `pilot_expires_at: now() + 60 days`
   - `stripe_customer_id: null` (no card required)
6. Agent receives welcome email with setup instructions
7. Agent connects FUB + Cal.com integrations
8. System begins responding to leads via SMS

### Pilot Expiry Flow (Manual)
- At day 45: Stojan manually contacts pilot agents to discuss conversion
- At day 60: Pilot expires, system pauses SMS sending for expired pilots
- Conversion: Stojan manually creates Stripe subscription, updates agent record

### Schema Changes Required

Add to `agents` table:
- `pilot_started_at` (timestamptz, nullable)
- `pilot_expires_at` (timestamptz, nullable)

Update `plan_tier` enum/check to include `"pilot"` as a valid value.

### Signup Route Changes

Current `/api/agents/signup` (or equivalent) must:
- Remove any Stripe payment intent creation
- Remove credit card form from frontend
- Set `plan_tier = "pilot"`, `pilot_started_at = NOW()`, `pilot_expires_at = NOW() + INTERVAL 60 days`
- Send welcome email via existing email integration
- Notify Stojan via Telegram: "New pilot agent signed up: {name} ({email})"
- **Acceptance Criteria:**
  - Signup page has no credit card form or Stripe Elements
  - Signup form collects: name, email, brokerage name, FUB API key
  - Successful signup creates agent record with plan_tier=pilot, pilot_started_at, pilot_expires_at (60 days)
  - Agent is redirected to dashboard immediately after signup (no payment step)
  - Dashboard shows pilot status banner: "X days remaining on your free pilot"
  - Welcome email is sent on signup with onboarding instructions and FUB setup guide
  - FUB webhook integration activates automatically on signup
  - SMS lead response is live within 5 minutes of signup
  - Expired pilots (>60 days) see a soft paywall: upgrade CTA, SMS paused with clear message
  - Stojan receives Telegram notification when a new pilot agent signs up: name, email, brokerage
  - agents table: pilot agents have plan_tier=pilot, no stripe_customer_id required to use product
  - No Stripe charge or card-on-file created during pilot signup flow
- **Workflow:** Dev > QC

### feat-post-signup-dashboard-onboarding-redirect — Post-Signup Redirect to /dashboard/onboarding Wizard

- **PRD:** Fix Auth Token Gap — Signup → Onboarding Redirect
- **Status:** complete
- **Priority:** 0
- **Description:** After successful signup (pilot, trial, or standard), new agents are redirected to /dashboard/onboarding — a dedicated onboarding wizard embedded within the dashboard shell. The wizard guides agents through FUB connection, Twilio SMS setup, SMS verification, and an Aha Moment lead simulator. Upon completion, the agent lands on the main /dashboard.
- **Acceptance Criteria:**
  - Pilot signup (/api/auth/pilot-signup) redirects to /dashboard/onboarding on success
  - Trial signup (/api/auth/trial-signup) redirects to /dashboard/onboarding on success
  - Trial start (/api/trial/start) redirects to /dashboard/onboarding on success
  - /dashboard/onboarding page exists and renders the 4-step wizard (FUB → SMS → Verify → Simulator)
  - Wizard layout (layout.tsx) excludes OnboardingGuard to allow new-user access
  - Wizard loads existing wizard state from /api/setup/status (resumes from last incomplete step)
  - Completing the wizard redirects to /dashboard
  - Skipping the wizard redirects to /dashboard
  - Unauthenticated users hitting /dashboard/onboarding are redirected to /login
  - Wizard state (fub_connected, twilio_connected, sms_verified, simulator_completed) is persisted via /api/setup/status POST
  - onboarding_completed = true set on /api/setup/complete POST after wizard completion or simulator skip
  - Page is mobile-responsive
  - After successful trial signup, user lands on /dashboard/onboarding and wizard renders WITHOUT redirect to /login
  - After successful pilot signup, user lands on /dashboard/onboarding and wizard renders WITHOUT redirect to /login
  - /api/auth/me returns user identity from valid auth-token cookie (200) or 401 when unauthenticated
  - Both trial-signup and pilot-signup APIs return token and user object in JSON response body
  - TrialSignupForm stores token and user in localStorage BEFORE calling router.push(redirectTo)
  - /dashboard/onboarding page falls back to /api/auth/me when localStorage.leadflow_user is absent
  - Login page (/login) redirects un-onboarded users (onboardingCompleted === false) to /dashboard/onboarding (not /setup)
- **Depends on:** feat-post-login-onboarding-wizard
- **Workflow:** PM > Dev > QC

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

### feat-onboarding-completion-telemetry — Onboarding Completion Telemetry — Know Exactly Where Real Agents Drop Off

- **PRD:** -
- **Status:** not_started
- **Priority:** 1
- **Description:** Track where real agents drop out of the onboarding wizard with step-level telemetry, enabling rapid iteration on the highest-impact friction point.

## Problem
All real_estate_agents records show onboarding_step=0, onboarding_completed=false. We cannot distinguish whether agents are abandoning at signup, email verification, FUB connection, SMS setup, or the aha moment simulator. Without step-level data, we cannot fix what breaks the funnel.

## Acceptance Criteria
- AC-1: onboarding_step field updated in real time as agents progress (step 0→1→2→3→4)
- AC-2: onboarding_events table logs each step transition: {agent_id, step_name, status, timestamp, metadata}
- AC-3: Step names: 'email_verified', 'fub_connected', 'phone_configured', 'sms_verified', 'aha_completed'
- AC-4: Admin view at /admin/funnel shows real agents (exclude smoke-test emails) with their current step and time-at-step
- AC-5: Alert fires (via product_feedback insert) if any real agent is stuck at the same step for >24 hours
- AC-6: Dashboard shows funnel conversion rates (Step N → Step N+1) per day
- AC-7: Exclude all smoke-test@* and *@leadflow-test.com emails from funnel counts

## Why This Unblocks Revenue
Without step-level telemetry, every pilot recruit who drops off is invisible. We cannot fix what we cannot see. This is the foundation for all onboarding improvement.
- **Workflow:** PM > Dev > QC

### feat-demo-without-signup — Live AI Demo — Experience the Product Without Signing Up

- **PRD:** Live AI Demo — Experience the Product Without Signing Up
- **Status:** complete
- **Priority:** 1
- **Description:** Prospects can experience the core product value (AI responding to a lead in <30 seconds) directly on the landing page or a /demo route — no signup required. Interactive demo: visitor enters a fake lead name/property type, clicks "Send Lead", and watches the AI craft and send an SMS response in real-time. Reduces top-of-funnel friction from "curious visitor" to "activated prospect" before asking for email. Acceptance criteria: (1) /demo or landing page section shows interactive lead simulator; (2) No auth required; (3) AI generates personalized SMS copy using Claude; (4) Animation shows <30 second response; (5) CTA at end of demo links to trial signup; (6) Demo interactions logged for conversion analytics.
- **Acceptance Criteria:**
  - /demo page or landing page section presents an interactive lead simulator
  - Demo is accessible without authentication
  - Claude generates personalized SMS copy from supplied lead context
  - Demo shows animated progression and explicit response-time proof for the <30 second value proposition
  - Completion state includes CTA to Start Free Trial — No Credit Card Required
  - Demo events (demo_started, demo_response_generated, demo_completed, demo_cta_clicked) are logged for conversion analytics
  - Demo flow is usable on mobile viewport
  - Graceful error/fallback handling exists for AI failure/timeout without dead-end UX
- **Workflow:** PM > Design > Dev > QC

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

### feat-pilot-conversion-email-sequence — Pilot-to-Paid Conversion Email Sequence

- **PRD:** Pilot-to-Paid Conversion Email Sequence
- **Status:** complete
- **Priority:** 1
- **Description:** Automated email nurture sequence for pilot agents via Resend. Converts pilot agents to paid before expiry at day 60. Three touchpoints: day 30 (midpoint value recap + upgrade offer), day 45 (ROI stats + urgency), day 55 (5 days left with clear upgrade CTA). Acceptance criteria: (1) Cron job checks for pilot agents approaching key milestones; (2) Three distinct email templates: midpoint, urgent, final warning; (3) Each email contains personalized stats (leads responded, avg response time, appointments booked); (4) Emails include direct Stripe checkout link for Pro plan; (5) Email delivery tracked in agent_email_logs or analytics_events; (6) Sequence stops if agent upgrades.
- **Acceptance Criteria:**
  - Daily cron/job checks pilot agents and evaluates day-30/day-45/day-55 milestones.
  - Three distinct email templates exist: midpoint, urgent, final warning.
  - Each email includes personalized stats: leads responded, average response time, appointments booked.
  - Each email includes direct Stripe checkout link for Pro plan.
  - Email send attempts and outcomes are tracked in agent_email_logs or analytics_events.
  - Sequence halts automatically when agent upgrades from pilot to paid plan.
  - Milestone emails are idempotent: no duplicate send for same agent + milestone.
  - QC can simulate pilot age and validate correct template dispatch + tracking records.
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


## Phase: Phase 3

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


## Phase: mvp

### fix-trial-signup-redirects-to-nonexistent-onboarding-page — Fix trial signup redirect to non-existent /dashboard/onboarding page

- **PRD:** Fix Trial Signup Redirect — Broken Post-Signup Navigation
- **Status:** complete
- **Priority:** 0
- **Description:** Trial signup, pilot signup, and trial/start API routes all redirect to /dashboard/onboarding which does not exist. Users hit a 404 immediately after account creation. Fix by redirecting to /setup.
- **Acceptance Criteria:**
  - AC-1: After trial signup, user lands on /setup (not 404)
  - AC-2: pilot-signup response has redirectTo: /setup
  - AC-3: trial/start response has redirectTo: /setup
  - AC-4: /setup loads successfully for authenticated user
  - AC-5: No redirect in codebase points to /dashboard/onboarding
  - AC-6: Welcome email links to /setup, not /dashboard/onboarding
  - AC-7: Dashboard build passes (npm run build exits 0)
- **Workflow:** PM > Dev > QC


## Phase: Unassigned

### feat-aha-moment-lead-simulator — Aha Moment: Live Lead Simulator in Onboarding — First AI Response in <30s

- **PRD:** Aha Moment Simulator — Onboarding Step UI
- **Status:** complete
- **Priority:** 0
- **Description:** The single most important moment in the LeadFlow onboarding journey: a new agent sees an AI SMS response to a simulated lead within 30 seconds of completing setup. This is the "aha moment" that drives trial-to-paid conversion. Currently the onboarding wizard is STUCK and there is no verified aha moment. The Lead Experience Simulator (feat-lead-experience-simulator) must be integrated as the final step of the onboarding wizard, so every new user sees the product work before they ever get to the dashboard. Without this, agents complete signup and see a dashboard with no data — zero value demonstration.
- **Acceptance Criteria:**
  - simulator.tsx exists and renders the Aha Moment step
  - Onboarding wizard shows 6 steps (progress bar shows Step 5 of 6 on simulator)
  - Start Simulation calls API with only agentId (no sessionId in request body)
  - sessionId from start response is used for subsequent status polls
  - Conversation renders: lead messages left (grey), AI messages right (emerald)
  - Success state shows response time formatted from state.response_time_ms
  - ahaCompleted and ahaResponseTimeMs written to agentData on success
  - confirmation.tsx shows Aha Moment status row in Connected Integrations
  - Skip advances to confirmation with ahaCompleted = false
  - API start action returns 200 with only action + agentId in body (no sessionId required)
  - Error/timeout state shows non-blocking Retry and Skip options
- **Workflow:** PM > Dev > QC

### fix-remaining-agents-table-references — Fix remaining from(agents) table references — 15 routes still query wrong table

- **PRD:** Fix Remaining agents Table References — Product Routes
- **Status:** complete
- **Priority:** 0
- **Description:** ## Bug Fix: Remaining agents Table References

The login route (/api/auth/login) was already fixed to query real_estate_agents correctly. However, 15 product route files still call supabase.from('agents') — the Orchestrator task table — instead of supabase.from('real_estate_agents') — the customer table.

**Affected files:**
- app/api/agents/check-email/route.ts
- app/api/agents/profile/route.ts
- app/api/agents/satisfaction-ping/route.ts
- app/api/onboarding/check-email/route.ts
- app/api/onboarding/submit/route.ts
- app/api/satisfaction/stats/route.ts
- app/api/stripe/portal-session/route.ts
- app/api/webhook/route.ts
- app/api/webhook/fub/route.ts (2 occurrences)
- app/api/webhook/twilio/route.ts (2 occurrences)
- app/api/webhooks/stripe/route.ts (4 occurrences)
- lib/supabase.ts
- scripts/update-dashboard.ts
- scripts/validate-system.ts

**Impact:** Signup, profile, billing, and webhook flows silently read/write from the orchestrator task table instead of the customer table.

## Acceptance Criteria
- All product routes use supabase.from('real_estate_agents') not supabase.from('agents')
- Signup/onboarding creates records in real_estate_agents
- Profile GET/PUT reads/writes real_estate_agents
- Stripe webhook (webhooks/stripe) updates plan_tier on real_estate_agents
- FUB and Twilio webhooks look up agents from real_estate_agents
- Login route unchanged (already correct)
- **Acceptance Criteria:**
  - grep -rn from(agents) product/ returns 0 results for customer-data routes
  - POST /api/agents/check-email returns { available: true } for new emails
  - POST /api/auth/login still works (unchanged)
  - Stripe webhook updates real_estate_agents.plan_tier on subscription events
  - FUB webhook looks up agent from real_estate_agents
  - npm test passes with no new failures
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

### fix-fix-not-implemented-23-api-routes-still-query-wron — Fix NOT implemented — 23 API routes still query wrong table (agents vs real_estate_agents)

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Fix NOT implemented — 23 API routes still query wrong table (agents vs real_estate_agents)
**Type:** bug
**Severity:** critical
**Source:** Product review 0a39800d-db7c-4d15-9fe6-5243bcaef79f

**Details:** Despite use_case implementation_status being marked "complete", the codebase still has 23 occurrences of .from("agents") across 13 product API route files. The agents table is the orchestration task-management table (columns: agent_name, agent_type, project_id, status_emoji) — NOT customer data. Querying it for real estate agent customers returns wrong data or empty results.

Affected files:
- app/api/webhook/route.ts (1 ref)
- app/api/webhook/fub/route.ts (2 refs)
- app/api/webhook/twilio/route.ts (2 refs)
- app/api/agents/check-email/route.ts (1 ref)
- app/api/agents/satisfaction-ping/route.ts (2 refs)
- app/api/agents/profile/route.ts (2 refs)
- app/api/satisfaction/stats/route.ts (1 ref)
- app/api/webhooks/stripe/route.ts (4 refs)
- app/api/onboarding/check-email/route.ts (1 ref)
- app/api/onboarding/submit/route.ts (2 refs)
- app/api/stripe/portal-session/route.ts (3 refs)
- app/api/debug/test-formdata/route.ts (1 ref)
- app/api/debug/test-full-flow/route.ts (1 ref)

PRD required all 21 references replaced; 23 remain. AC-5 fails completely.

**Suggested fix:** Run: cd product/lead-response/dashboard && find app -name "*.ts" -o -name "*.tsx" | xargs sed -i "" "s/.from('agents')/.from('real_estate_agents')/g" then redeploy.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-signup-onboarding-email-check-queries-wrong-table- — Signup/onboarding email check queries wrong table — always returns available regardless of registrations

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Signup/onboarding email check queries wrong table — always returns available regardless of registrations
**Type:** bug
**Severity:** critical
**Source:** Product review 0a39800d-db7c-4d15-9fe6-5243bcaef79f

**Details:** app/api/onboarding/check-email/route.ts and app/api/agents/check-email/route.ts both query .from("agents") for email. The agents table has 0 customer email records (it has only orchestration agents with no email field). Result: email duplicate checks always return "available" allowing duplicate customer accounts.

**Suggested fix:** Replace .from("agents") with .from("real_estate_agents") in both check-email routes.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-stripe-webhook-updates-orchestration-agents-table- — Stripe webhook updates orchestration agents table instead of real estate agent records

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Stripe webhook updates orchestration agents table instead of real estate agent records
**Type:** bug
**Severity:** critical
**Source:** Product review 0a39800d-db7c-4d15-9fe6-5243bcaef79f

**Details:** app/api/webhooks/stripe/route.ts has 4 references to supabase.from("agents").update(). Stripe subscription events (checkout.session.completed, customer.subscription.updated, etc.) are updating the orchestration agents table instead of real_estate_agents, meaning no customer subscription state is ever persisted. Billing is completely broken.

**Suggested fix:** Replace all 4 occurrences of .from("agents") with .from("real_estate_agents") in app/api/webhooks/stripe/route.ts.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-bcrypt-password-verify-fails-after-signup — Fix: Stored password cannot be verified after account creation (bcrypt compareSync returns false)

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** bcrypt.compareSync returns false when comparing the correct plaintext password against the hash stored in real_estate_agents.password_hash at login time. Account creation appears to succeed but the agent cannot log in with the credentials they just registered.

Root cause candidates:
1. Double-hashing: password is pre-hashed client-side or in a middleware layer, then hashed again by the signup route before storage — login hashes once, making the hashes incompatible.
2. Column mismatch: password_hash column is being written to a different column than the login route reads from (e.g. password vs password_hash).
3. Hash truncation: if the column is VARCHAR(<72 chars) the bcrypt hash (60 chars) may be getting truncated on some rows but not others.
4. Encoding/whitespace: password trimmed at one point but not the other, or UTF-8 normalization difference.

Fix required:
- Audit the signup route (app/api/auth/trial-signup and /api/agents/onboard) to confirm password is hashed exactly once with bcrypt.hash(password, saltRounds) before INSERT.
- Audit the login route (app/api/auth/login) to confirm it reads the same column and calls bcrypt.compareSync(plaintext, storedHash).
- Verify the database column type and length can store a full 60-char bcrypt hash.
- Add a test: create account, immediately attempt login with same credentials, assert login succeeds.
- Do NOT re-hash existing affected rows — instead ensure the fix prevents future bad hashes and document that pre-existing broken accounts need a password reset.
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

### fix-production-build-fails-typescript-error-in-trial-s — Production build fails: TypeScript error in trial-signup route

- **PRD:** Fix TypeScript Build Blocker in Trial Signup Route
- **Status:** complete
- **Priority:** 1
- **Description:** Critical bug fix: TypeScript build blocker in trial-signup route prevents all dashboard Vercel deployments. Refactor async analytics insert to compile cleanly while keeping signup path non-blocking.
- **Acceptance Criteria:**
  - Running tsc --noEmit in product/lead-response/dashboard returns exit code 0 and no TS2339 in trial-signup route
  - Running npm run build in product/lead-response/dashboard succeeds
  - POST /api/auth/trial-signup with valid payload returns existing success contract
  - If analytics insert fails, endpoint still returns success and logs analytics error
  - /api/lead-capture fix can be included in a successful production deployment after this blocker is removed
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

### fix-test-gateway-path — test gateway path

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: test gateway path
- **Workflow:** Dev > QC

### fix-signup-form-layout-inconsistency — Fix Signup Form Layout — Match Login Field Orientation

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** On the signup page, the email and password fields render small and horizontally (side-by-side). On the login page, the same fields render full-width and vertically stacked — the correct, readable layout. This visual inconsistency breaks the perceived quality of the auth flow and confuses users who move between the two pages. The fix: update the signup form to use the same vertical, full-width field layout as the login page. No functional changes — purely CSS/layout alignment. Files to check: product/lead-response/dashboard/app/signup/page.tsx (and any sub-components like TrialSignupForm), compared against product/lead-response/dashboard/app/login/page.tsx.
- **Workflow:** Dev > QC

### fix-get-api-internal-pilot-usage-endpoint-does-not-exi — GET /api/internal/pilot-usage endpoint does not exist

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## GET /api/internal/pilot-usage endpoint does not exist
**Type:** feature_missing
**Severity:** critical
**Source:** Product review 7578d6f4-72b3-4225-bde2-fb545637ba4e

**Details:** FR-4 defines an internal analytics endpoint that aggregates per-pilot session data. This route does not exist anywhere in the Next.js app/api directory. Searching the codebase found no file matching internal/pilot-usage. Without this, Stojan has no programmatic visibility into pilot engagement.

**Suggested fix:** Create /app/api/internal/pilot-usage/route.ts. Authenticate via SUPABASE_SERVICE_ROLE_KEY bearer token. Query agent_sessions joined to agents/real_estate_agents for: lastLogin, sessionsLast7d (count where session_start > now()-7d), topPage (mode of agent_page_views.page), inactiveHours (hours since last_active_at). Return JSON per PRD spec.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-no-feedback-button-in-dashboard-us-2-completely-ab — No Feedback button in dashboard — US-2 completely absent

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## No Feedback button in dashboard — US-2 completely absent
**Type:** missing_feature
**Severity:** critical
**Source:** Product review 343d82e8-192e-4de1-bcab-e45cb9e10e60

**Details:** PRD US-2 requires a persistent Give Feedback button in the dashboard footer or sidebar. Searched all dashboard layout and page files — no FeedbackButton, feedback modal, or /api/feedback endpoint exists. Real agents using the product have no self-service feedback outlet. The product_feedback table exists in Supabase but has no in-app write path.

**Suggested fix:** Add a FeedbackButton component to dashboard/layout.tsx (persistent, low-prominence, fixed position or footer). Create app/api/feedback/route.ts (POST) that writes to product_feedback table using submitProductFeedback from nps-service.ts. Requires type selector (praise/bug/idea/frustration) + text field + confirmation toast.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-resend-api-key-not-set-in-vercel-email-delivery-no — RESEND_API_KEY not set in Vercel — email delivery non-functional

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## RESEND_API_KEY not set in Vercel — email delivery non-functional
**Type:** missing_feature
**Severity:** high
**Source:** Product review 45f37249-2101-4917-845a-af8839edddb1

**Details:** PR #73 commit message explicitly notes: "Note: RESEND_API_KEY not yet set in Vercel - email delivery will be queued/logged until the key is added". The lead-magnet-email.ts gracefully falls back to logging when RESEND_API_KEY is absent, so the endpoint will succeed for DB writes once deployed, but no actual emails will be sent to pilot signups. This breaks the core lead magnet promise: deliver the 5-Minute Playbook immediately on signup.

**Suggested fix:** Add RESEND_API_KEY to Vercel environment variables. Verify FROM_EMAIL is an authenticated Resend sender domain.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-nps-api-routes-api-nps-verify-and-api-nps-submit-r — NPS API routes /api/nps/verify and /api/nps/submit return 404

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## NPS API routes /api/nps/verify and /api/nps/submit return 404
**Type:** bug
**Severity:** critical
**Source:** Product review 343d82e8-192e-4de1-bcab-e45cb9e10e60

**Details:** The survey page at /survey calls /api/nps/verify (to validate the JWT token) and /api/nps/submit (to save the response). Both return 404 in production. The nps-service.ts library functions are implemented but no API route files exist under app/api/nps/. Any agent who clicks an NPS survey email link will see a broken experience — token verification fails, form never renders as valid, submission is impossible.

**Suggested fix:** Create app/api/nps/verify/route.ts (GET handler using verifySurveyToken + isTokenUsed from nps-service.ts) and app/api/nps/submit/route.ts (POST handler using submitNPSResponse + createChurnRiskAlert from nps-service.ts). Both are thin wrappers around already-implemented service functions.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-lead-capture-still-returns-500-in-production — /api/lead-capture still returns 500 in production

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## /api/lead-capture still returns 500 in production
**Type:** bug
**Severity:** critical
**Source:** Product review 45f37249-2101-4917-845a-af8839edddb1

**Details:** Tested POST https://leadflow-ai-five.vercel.app/api/lead-capture with both email-only and email+firstName payloads — both return HTTP 500 {"success":false,"error":"Failed to save. Please try again."}. Root cause: Vercel production is serving a pre-fix build. The last 3 Vercel deployments (commits 83b83ac, e8d0ccf, 332a3c0-era pushes) are all in Error status. Production was last built ~26 min before this review from a commit that predates the PR #73 fix. The nameValue fix exists in origin/main (confirmed via git show) but is not running in production.

**Suggested fix:** Fix the Vercel build errors (TypeScript errors in app/api/auth/trial-signup/route.ts line 111 and app/pilot/page.tsx line 62), then trigger a new Vercel deploy from origin/main.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-remaining-from-agents-refs-satisfaction-debug — Fix remaining from(agents) references in satisfaction and debug routes

- **PRD:** Fix Signup/Login Table Mismatch — Remaining agents Table References
- **Status:** complete
- **Priority:** 1
- **Description:** Five product route files still query supabase.from(agents) instead of from(real_estate_agents). Affects: satisfaction-ping (2 refs), satisfaction/stats (1 ref), debug/test-formdata (1 ref), debug/test-full-flow (1 ref).
- **Acceptance Criteria:**
  - All 5 from(agents) in listed files replaced with from(real_estate_agents)
  - grep sweep returns zero product route matches
  - PATCH /api/agents/satisfaction-ping works against real_estate_agents
  - GET /api/satisfaction/stats returns data from real_estate_agents
  - npm run build passes
  - Login and signup flows unaffected
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

### feat-frictionless-onboarding-flow — Self-Serve Frictionless Onboarding Flow

- **PRD:** Self-Serve Frictionless Onboarding Flow
- **Status:** complete
- **Priority:** 1
- **Description:** Self-serve onboarding journey: visitor lands on marketing page, clicks Start Free Trial, signs up with email + password only (no credit card), and reaches dashboard in under 60 seconds. First session includes sample lead data and an auto-start guided wizard (FUB connect, SMS setup, aha simulator). User sees first clear value within 2 minutes. Trial period is 14 days.
- **Acceptance Criteria:**
  - AC-1: User clicks CTA, enters email+password, lands on dashboard within 60 seconds — no CC required
  - AC-2: New trial user sees 3 sample leads with AI-drafted responses on first dashboard visit
  - AC-3: Setup Wizard overlay appears automatically (onboarding_completed=false) and persists across refresh
  - AC-4: Valid FUB API key connects + webhook registered; wizard advances to step 2
  - AC-5: Twilio provisioning sends test SMS; 4-digit verification confirms connection
  - AC-6: Lead Simulator fires on step 3; AI response visible within 15 seconds; total <2min from landing
  - AC-7: Trial countdown banner visible on all dashboard pages with correct days remaining
  - AC-8: Expired trial users redirected to /upgrade; SMS paused, leads preserved
  - AC-9: Duplicate email shows friendly error with sign-in link (not plain text)
  - AC-10: All funnel analytics events fire at correct steps (no PII)
  - AC-11: Wizard skip flow allows access to dashboard with incomplete steps
  - AC-12: Wizard does not re-trigger after onboarding_completed=true
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-aha-moment-lead-simulator-not-implemented-not-star — Aha moment lead simulator not implemented (not_started at day 22)

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Aha moment lead simulator not implemented (not_started at day 22)
**Type:** revenue_gap
**Severity:** critical
**Source:** Product review ab254083-2a70-4148-8daf-ead95f544cea

**Details:** feat-aha-moment-lead-simulator is not_started. No activation = no retention = no conversion. Core funnel leak explaining /bin/zsh MRR at day 22.

**Suggested fix:** Escalate to P0. Agents must see AI responding in <30s before leaving onboarding.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-madzunkov-hotmail-com-is-locked-out-email-verified — madzunkov@hotmail.com is locked out — email_verified=false, no way to verify

- **PRD:** Email Verification DB Migration Fix
- **Status:** complete
- **Priority:** 1
- **Description:** ## madzunkov@hotmail.com is locked out — email_verified=false, no way to verify
**Type:** bug
**Severity:** critical
**Source:** Product review 854fb6be-6629-4029-8017-41113bcbf543

**Details:** Account madzunkov@hotmail.com (created 2026-03-10, before email verification shipped) has email_verified=false. The PRD backfill UPDATE should have set email_verified=TRUE for all pre-existing accounts, but this one was missed. This account cannot log in (gets 403 EMAIL_NOT_VERIFIED) and cannot get a verification link sent (resend fails due to missing email_verification_tokens table). This is likely a real pilot/owner account.

**Suggested fix:** Immediately run: UPDATE real_estate_agents SET email_verified = TRUE WHERE email = 'madzunkov@hotmail.com'. Also run the full backfill after DB migration: UPDATE real_estate_agents SET email_verified = TRUE WHERE created_at < (timestamp when migration was applied) AND email_verified = FALSE.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Acceptance Criteria:**
  - madzunkov@hotmail.com can log in successfully (email_verified = TRUE)
  - All pre-feature accounts (created before 2026-03-09) have email_verified = TRUE
  - No pilot user is locked out due to missing email verification backfill
- **Workflow:** Dev > QC

### fix-dashboard-routes-are-publicly-accessible — dashboard routes are publicly accessible with no auth protection

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: dashboard routes are publicly accessible with no auth protection
- **Workflow:** Dev > QC

### fix-post-login-onboarding-wizard-fub-sms-aha-is-stuck- — Post-login onboarding wizard (FUB/SMS/aha) is STUCK and never auto-triggers

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Post-login onboarding wizard (FUB/SMS/aha) is STUCK and never auto-triggers
**Type:** bug
**Severity:** critical
**Source:** Product review ec5932ad-cbc7-4d57-8ca5-029c56aa0a39

**Details:** feat-post-login-onboarding-wizard is marked implementation_status=stuck in use_cases. The dashboard page.tsx has no wizard auto-launch logic checking onboarding_completed=false. The /setup page wizard exists but must be navigated to manually. AC-3 requires the wizard auto-appears for first-time users. fix-onboarding-wizard-stuck-no-aha-moment-for-new-sign is also not_started.

**Suggested fix:** Dashboard layout or page should check onboarding_completed=false and auto-redirect/auto-show the setup wizard. The aha moment simulator (step 3) needs to be connected to /api/onboarding/simulator which is already implemented but unreachable.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-first-session-sample-leads-fr-4-not-implemented — First-session sample leads (FR-4) not implemented

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## First-session sample leads (FR-4) not implemented
**Type:** bug
**Severity:** critical
**Source:** Product review ec5932ad-cbc7-4d57-8ca5-029c56aa0a39

**Details:** LeadFeed component queries the lead_summary view directly with no special case for trial users or first dashboard sessions. New trial users see an empty dashboard with no sample leads. AC-2 requires "3 sample leads with AI-drafted responses" on first dashboard visit. This is the primary empty-state problem that will kill conversion.

**Suggested fix:** On first dashboard load (onboarding_completed=false), inject 3 seeded sample lead records (clearly marked DEMO) via a dedicated /api/sample-leads endpoint. Sample data must not contaminate the lead_summary view for other agents.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
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

### fix-api-health-endpoint-wrong-table — Fix /api/health endpoint — queries wrong table (agents vs real_estate_agents)

- **PRD:** Fix API Health Endpoint — Query Correct Table
- **Status:** complete
- **Priority:** 1
- **Description:** ## Fix /api/health endpoint — queries wrong table
**Type:** bug
**Severity:** high
**Source:** PM Triage a27037b1

The /api/health route probes Supabase connectivity by querying the agents table. The correct table is real_estate_agents. Fix: change to real_estate_agents or use SELECT 1.

**File:** product/lead-response/dashboard/app/api/health/route.ts
- **Acceptance Criteria:**
  - - /api/health no longer queries agents table
- Uses real_estate_agents or SELECT 1
- GET /api/health returns 200 with status: ok
- supabase_connectivity.ok = true
- TypeScript build passes
- **Workflow:** Dev > QC

### feat-landing-page-conversion-cleanup — Landing Page Conversion Cleanup — Remove API Docs, Fix Pricing, Add Social Proof

- **PRD:** Landing Page Conversion Cleanup — Remove API Docs, Fix Pricing, Add Social Proof
- **Status:** complete
- **Priority:** 1
- **Description:** Three high-friction issues on the marketing landing page are suppressing signup conversion: (1) An "API Endpoints" developer table is embedded mid-page between the feature cards and lead magnet section — real estate agents will bounce when they see raw API endpoint documentation; (2) Pricing is inconsistent — landing page labels Starter as "Starter - Free pilot" but the signup page shows $49/month, creating distrust; (3) No social proof (testimonials, agent count, results). This UC fixes all three: removes the API docs section, aligns pricing messaging, and adds a testimonials/social proof section. At $0 MRR on Day 22, improving landing page conversion is the fastest way to increase top-of-funnel signup volume.
- **Acceptance Criteria:**
  - API Endpoints developer table is absent from landing page DOM (no "API Endpoints" heading, no endpoint docs table)
  - A "How It Works" section is visible with exactly 3 clearly labeled steps explaining setup, instant response, and close workflow
  - Pricing copy is consistent between landing and signup pages for all displayed tiers (same price + same trial messaging)
  - No conflicting "Free pilot" language appears unless that plan is genuinely $0 on both pages
  - Pricing tier CTAs deep-link to /signup?plan=starter|pro|team and signup preselects the corresponding plan
  - A social proof/testimonials section is present with at least 1 testimonial card containing quote + attribution
  - Mobile viewport (375px) has no horizontal overflow; How It Works and testimonials stack correctly
  - GA4 click events fire for hero CTAs and pricing/testimonial CTAs
  - Landing page performance remains <2s load under normal conditions
- **Workflow:** PM > Dev > QC

### fix-trial-signup-redirects-to-non-existent-route-dashb — Trial signup redirects to non-existent route /dashboard/onboarding

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Trial signup redirects to non-existent route /dashboard/onboarding
**Type:** bug
**Severity:** critical
**Source:** Product review ec5932ad-cbc7-4d57-8ca5-029c56aa0a39

**Details:** The /api/auth/trial-signup route returns redirectTo: "/dashboard/onboarding" but this page does not exist. The /dashboard directory has no onboarding subdirectory. Additionally, the middleware lists /onboarding as an AUTH_ROUTE which redirects authenticated users away to /dashboard. New trial users end up on the main dashboard with no onboarding wizard triggered — the core post-signup experience is broken.

**Suggested fix:** Either: (a) Create /dashboard/onboarding page that auto-launches the setup wizard, or (b) Change redirectTo to /setup which is the actual setup wizard page. Remove /onboarding from AUTH_ROUTES in middleware so authenticated users can access it.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-trial-signup-route-ts-still-redirects-to-dashboard — trial-signup/route.ts still redirects to /dashboard/onboarding

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## trial-signup/route.ts still redirects to /dashboard/onboarding
**Type:** bug
**Severity:** critical
**Source:** Product review 800c1a93-d8e9-4acb-b800-e5402ab3fed7

**Details:** Line 131 of app/api/auth/trial-signup/route.ts contains redirectTo: "/dashboard/onboarding". This page does not exist (404). The required fix (change to /setup) was NOT applied despite three prior dev tasks being marked done.

**Suggested fix:** Change redirectTo: "/dashboard/onboarding" → "/setup" at line 131
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-page-tsx-not-updated-simulator-step-not-wired-into — page.tsx not updated — simulator step not wired into wizard

- **PRD:** Aha Moment Simulator — Onboarding Step UI
- **Status:** complete
- **Priority:** 1
- **Description:** ## page.tsx not updated — simulator step not wired into wizard
**Type:** missing_implementation
**Severity:** critical
**Source:** Product review 4111cb47-5a5b-4e97-88f9-33fcb45d87cc

**Details:** The onboarding page.tsx still has OnboardingStep type = welcome|agent-info|calendar|sms|confirmation (5 steps, no simulator). The import, type definition, steps array entry, and renderer block for OnboardingSimulator are all missing. Agents completing onboarding skip the Aha Moment entirely.

**Suggested fix:** Update page.tsx: add simulator to OnboardingStep type, add to steps array between sms and confirmation, add import, add renderer block, add ahaCompleted/ahaResponseTimeMs to agentData, include aha_moment_completed in completeOnboarding() submit payload.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-no-self-serve-upgrade-path-from-pilot-to-paid — No self-serve upgrade path from pilot to paid

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## No self-serve upgrade path from pilot to paid
**Type:** revenue_gap
**Severity:** critical
**Source:** Product review ab254083-2a70-4148-8daf-ead95f544cea

**Details:** Pilot agents get free access but there is zero self-serve mechanism to upgrade to paid. Conversion requires manual Stojan intervention — will not scale to K MRR.

**Suggested fix:** Add self-serve Stripe checkout flow triggered from dashboard upgrade button. New UC: feat-self-serve-stripe-checkout.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-trial-start-route-ts-redirects-to-onboarding-which — trial/start/route.ts redirects to /onboarding which blocks authenticated users

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## trial/start/route.ts redirects to /onboarding which blocks authenticated users
**Type:** bug
**Severity:** critical
**Source:** Product review 800c1a93-d8e9-4acb-b800-e5402ab3fed7

**Details:** Line 162: redirectTo: "/onboarding". The /onboarding route is listed in AUTH_ROUTES in middleware.ts (line 21), meaning authenticated users will be redirected away — causing a navigation dead end or loop.

**Suggested fix:** Change redirectTo: "/onboarding" → "/setup"
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-post-signup-redirect-to-dashboard-onboarding — Post-Signup Redirect to /dashboard/onboarding

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Connect all signup flows to redirect new users to /dashboard/onboarding (in-dashboard wizard overlay) instead of /setup.

Decision 4ff87559 approved by Stojan 2026-03-13. The /dashboard/onboarding page is fully implemented. Remaining: update 3 routes returning redirectTo /setup → /dashboard/onboarding, update email links, archive stale conflicting test.

Files: product/lead-response/dashboard/app/api/auth/trial-signup/route.ts (line ~149), product/lead-response/dashboard/app/api/auth/pilot-signup/route.ts (line ~289, ~113), product/lead-response/dashboard/app/api/trial/start/route.ts (line ~162). Stale test: tests/fix-trial-signup-route-ts-still-redirects-to-dashboard.test.js (update to assert /dashboard/onboarding).
- **Acceptance Criteria:**
  - AC-1: trial-signup/route.ts returns redirectTo: "/dashboard/onboarding"
  - AC-2: pilot-signup/route.ts returns redirectTo: "/dashboard/onboarding"
  - AC-3: trial/start/route.ts returns redirectTo: "/dashboard/onboarding"
  - AC-4: Welcome email links point to /dashboard/onboarding (not /setup)
  - AC-5: tests/fix-trial-signup-route-ts-still-redirects-to-dashboard.test.js updated to assert /dashboard/onboarding
  - AC-6: /dashboard/onboarding page loads post-signup (no 404)
  - AC-7: Completing wizard redirects to /dashboard
  - AC-8: Skipping wizard redirects to /dashboard
- **Workflow:** Dev > QC

### fix-bookings-table-does-not-exist-booking-conversion-a — bookings table does not exist — booking conversion always null

- **PRD:** -
- **Status:** complete
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

### fix-start-free-trial-cta-missing-from-landing-page-3-p — Start Free Trial CTA missing from landing page — 3 placements not implemented

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Start Free Trial CTA missing from landing page — 3 placements not implemented
**Type:** bug
**Severity:** critical
**Source:** Product review 075a0c75-ce7c-4f4f-a990-8d9f94f2c970

**Details:** The acceptance criteria requires a Start Free Trial button in the hero, features section, and pricing section (3 placements). The deployed landing page only shows Join the Pilot and Get Started Free (to /onboarding) in the hero. No Start Free Trial CTA pointing to /signup/trial exists anywhere on the landing page. The TrialSignupForm component and /signup/trial page exist but are unreachable from the landing page.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-mrr-is-0-no-paying-customers-despite-all-technical — MRR is $0 — no paying customers despite all technical blockers being resolved

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## MRR is $0 — no paying customers despite all technical blockers being resolved
**Type:** revenue_gap
**Severity:** critical
**Source:** Product review 68208c47-00e1-4798-a1c5-299014640ef3

**Details:** subscriptions table: 0 rows. real_estate_agents: 133 rows but all are smoke-test/QC/example accounts. Non-test real accounts: madzunkov@gmail.com (trial, email_verified=true), madzunkov@hotmail.com (plan_tier=null), test@example-never-real.com. PRD sign-off declared all 3 critical actions complete on March 7. Product is technically ready. Pilot recruitment has not launched.

**Suggested fix:** Unblock pilot recruitment immediately. Two action_items have been WAITING for Stojan approval since Feb 25 (17+ days): Marketing Recruitment Timing and Pilot Launch Decision. Must be resolved to start revenue generation.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-pilot-recruitment-blocked-2-action-items-waiting-s — Pilot recruitment blocked — 2 action items WAITING since Feb 25 with no response

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Pilot recruitment blocked — 2 action items WAITING since Feb 25 with no response
**Type:** blocked_action_items
**Severity:** critical
**Source:** Product review 68208c47-00e1-4798-a1c5-299014640ef3

**Details:** Action items bd16d510 (Marketing Recruitment Timing) and c0fd9c86 (Pilot Launch Decision) have status=WAITING, awaiting_input=Stojan since Feb 25, 2026. No response recorded. This is 17+ days of delay on the most revenue-critical action. Day 20 go/no-go checkpoint passed technically but business execution is stalled.

**Suggested fix:** Stojan must approve pilot recruitment. Marketing agent is ready to execute outreach. Orchestrator should re-surface these action items with urgency.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-queries-wrong-table-sms-stats-endpoint-returns — API queries wrong table — sms-stats endpoint returns 500

- **PRD:** -
- **Status:** complete
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

### fix-landing-page-has-no-links-to-signup-or-o — landing page has no links to signup or onboarding pages

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: landing page has no links to signup or onboarding pages
- **Workflow:** Dev > QC

### fix-landing-page-has-no-pricing-section — Landing page has NO pricing section

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Landing page has NO pricing section
**Type:** missing_feature
**Severity:** critical
**Source:** Product review dd17579e-8d97-442f-8477-ad945822b584

**Details:** The root landing page (leadflow-ai-five.vercel.app) contains zero pricing information. It is a developer-facing page with an API endpoints table and a "Test Webhook" button. FR-1 (pricing section on landing page) is completely unimplemented. AC-1 through AC-4 all fail as a result. Prospects landing on the homepage cannot evaluate the product commercially.

**Suggested fix:** Add a Pricing section component to app/page.tsx between the Features grid and Footer. Display all 4 tiers using the correct prices from PMF.md: Starter $49, Pro $149, Team $399, Brokerage $999+.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-pricing-page-shows-prices-10x-higher-than-pmf-md-s — /pricing page shows prices 10x higher than PMF.md strategy

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## /pricing page shows prices 10x higher than PMF.md strategy
**Type:** wrong_content
**Severity:** critical
**Source:** Product review dd17579e-8d97-442f-8477-ad945822b584

**Details:** The /pricing page (app/pricing/page.tsx) hardcodes prices of $497, $997, $1997/mo — approximately 10x the actual business strategy prices. This is not a config issue — PRICING_PLANS array has wrong monthlyPrice values. Correct values: Starter=49, Pro=149, Team=399, Brokerage=999.

**Suggested fix:** In PRICING_PLANS array: change monthlyPrice values to 49, 149, 399, 999 (or "contact" for Brokerage). Update tier names: Professional→Pro, Enterprise→Brokerage. Add Team tier between Pro and Brokerage.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-post-login-onboarding-wizard — Post-Login Onboarding Wizard for New Agents

- **PRD:** Post-Login Onboarding Wizard for New Agents
- **Status:** complete
- **Priority:** 1
- **Description:** Guided setup wizard shown to new agents after first login. Walks through 3 steps: (1) Connect FUB integration via API key + webhook registration, (2) Configure Twilio phone number (provision new or enter existing), (3) Verify SMS by sending a test message to agent mobile. Wizard state persisted per agent; skipped steps accessible later in Settings -> Integrations.
- **Acceptance Criteria:**
  - ["Wizard auto-triggers on first login if onboarding_completed = false","Wizard does NOT re-trigger for agents with onboarding_completed = true","Step 1: FUB API key validation is a real live call to FUB API","Step 1: On success, webhook URL is auto-registered in FUB","Step 2: Agent can provision a new Twilio number by area code","Step 2: Agent can enter an existing Twilio number (E.164 validated)","Step 3: Test SMS is actually delivered to agent mobile number","agents table updated at each step (fub_connected, phone_configured, sms_verified)","Agent can skip any step and complete later via Settings -> Integrations","onboarding_completed = true set on completion screen","All wizard API endpoints require authenticated session","UI is mobile-responsive","E2E: full wizard flow (all 3 steps) passes","E2E: partial flow with skipped steps passes"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-signup-page-has-no-link-back-to-login-an — signup page has no link back to login and no login page exists

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: signup page has no link back to login and no login page exists
- **Workflow:** Dev > QC

### fix-resend-api-key-not-configured-in-vercel-email-deli — RESEND_API_KEY not configured in Vercel — email delivery will not work

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## RESEND_API_KEY not configured in Vercel — email delivery will not work
**Type:** bug
**Severity:** high
**Source:** Product review 46d70b0b-3296-4827-866e-355e2a8f680e

**Details:** vercel env ls shows no RESEND_API_KEY or FROM_EMAIL env vars set for the leadflow-ai Vercel project. The lead-magnet-email.ts uses getResend() which returns null when RESEND_API_KEY is missing. No playbook delivery email (Email 1) or nurture sequence emails (Email 2 Day 3, Email 3 Day 7) will be sent. AC-4 (Delivery Email Sent within 60 seconds) will fail.

**Suggested fix:** Add RESEND_API_KEY to Vercel env vars (leadflow-ai project). Obtain API key from Resend dashboard. Also add FROM_EMAIL if custom sender is needed.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-db-migration-incomplete-email-verification-tokens- — DB migration incomplete: email_verification_tokens table does not exist

- **PRD:** Email Verification DB Migration Fix
- **Status:** complete
- **Priority:** 1
- **Description:** ## DB migration incomplete: email_verification_tokens table does not exist
**Type:** bug
**Severity:** critical
**Source:** Product review 854fb6be-6629-4029-8017-41113bcbf543

**Details:** The email_verification_tokens table was never created. The PRD specifies a CREATE TABLE statement for this table, and lib/verification-email.ts queries it extensively (createVerificationToken, checkResendRateLimit, verifyEmailToken). Without this table, no verification tokens can be created or validated. This makes the entire email verification feature non-functional: signup sends no verification email, resend-verification returns "Failed to create verification token", and verify-email route cannot validate any token. The email_verified column on real_estate_agents exists (partial migration), but the dependent tokens table was not created.

**Suggested fix:** Run the DB migration: CREATE TABLE email_verification_tokens (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE, token TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE INDEX idx_evt_token ON email_verification_tokens(token); CREATE INDEX idx_evt_agent_id ON email_verification_tokens(agent_id);
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Acceptance Criteria:**
  - email_verification_tokens table exists in production Supabase (SELECT COUNT(*) returns 0, not error)
  - idx_evt_token and idx_evt_agent_id indexes exist on the table
  - madzunkov@hotmail.com has email_verified = TRUE in real_estate_agents
  - POST /api/auth/resend-verification for unverified account returns 200 and creates row in email_verification_tokens
  - No accounts created before 2026-03-09 have email_verified = FALSE
  - Existing login and signup flows are not broken
- **Workflow:** Dev > QC

### fix-session-logging-not-integrated-into-login-flow — Session logging not integrated into login flow

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Session logging not integrated into login flow
**Type:** bug
**Severity:** critical
**Source:** Product review 7578d6f4-72b3-4225-bde2-fb545637ba4e

**Details:** The /api/auth/login/route.ts updates last_login_at on real_estate_agents but does NOT insert a row into agent_sessions. The logSessionStart() function described in FR-1 does not exist anywhere in the codebase. The agent_sessions table is empty despite being created.

**Suggested fix:** Add logSessionStart(agentId, req) call at end of successful login in /api/auth/login/route.ts. Insert into agent_sessions with agent_id, ip_address (from req headers), user_agent, session_start = now(), last_active_at = now(). Return session_id and store in JWT claims or response.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-page-view-logging-not-implemented-agent-page-views — Page view logging not implemented — agent_page_views table empty

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Page view logging not implemented — agent_page_views table empty
**Type:** bug
**Severity:** critical
**Source:** Product review 7578d6f4-72b3-4225-bde2-fb545637ba4e

**Details:** FR-3 requires that each dashboard navigation creates a row in agent_page_views. No such middleware exists. The agent_page_views table was created (schema present) but has 0 rows and no code path writes to it. Pages tracked per spec: /dashboard, /dashboard/conversations, /dashboard/settings, /dashboard/billing.

**Suggested fix:** Add page view middleware in middleware.ts (or a route handler wrapper) that detects navigation to tracked pages and inserts into agent_page_views with agent_id, session_id, page, visited_at. Rate limit to one write per page per session to avoid duplicates on API calls.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-status — status

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: status
- **Workflow:** Dev > QC

### fix-api-lead-capture-endpoint-returns-db-error-in-prod — /api/lead-capture endpoint returns DB error in production

- **PRD:** Fix /api/lead-capture Production Environment Failure
- **Status:** complete
- **Priority:** 1
- **Description:** ## /api/lead-capture endpoint returns DB error in production
**Type:** bug
**Severity:** critical
**Source:** Product review 46d70b0b-3296-4827-866e-355e2a8f680e

**Details:** POST to https://leadflow-ai-five.vercel.app/api/lead-capture with valid email returns {"success":false,"error":"Failed to save. Please try again."}. The DB upsert is failing in the Vercel environment. The same upsert works correctly when called locally with the service role key. Root cause: likely SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL env var misconfiguration in Vercel, or an RLS policy issue. RESEND_API_KEY is also not set in Vercel (confirmed via vercel env ls), so even when the DB write is fixed, no email will be delivered.

**Suggested fix:** Verify SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are correctly set in Vercel env vars for the leadflow-ai project. Add RESEND_API_KEY to Vercel env vars to enable email delivery.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Acceptance Criteria:**
  - POST /api/lead-capture with valid email returns {success:true}
  - Record inserted into pilot_signups with name, email, and created_at
  - 20/20 unit tests pass
  - Fix deployed and verified on leadflow-ai-five.vercel.app
  - Email confirmation sent via Resend when RESEND_API_KEY is configured
- **Workflow:** Dev > QC

### fix-test-genome-separation — test genome separation

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: test genome separation
- **Workflow:** Dev > QC

### fix-simulator-tsx-step-component-does-not-exist — simulator.tsx step component does not exist

- **PRD:** Aha Moment Simulator — Onboarding Step UI
- **Status:** complete
- **Priority:** 1
- **Description:** ## simulator.tsx step component does not exist
**Type:** missing_implementation
**Severity:** critical
**Source:** Product review 4111cb47-5a5b-4e97-88f9-33fcb45d87cc

**Details:** The primary deliverable — steps/simulator.tsx — was never created. The steps directory only contains: agent-info.tsx, calendar.tsx, confirmation.tsx, fub-integration.tsx, sms-config.tsx, welcome.tsx. The Aha Moment UI step is entirely absent from the codebase.

**Suggested fix:** Create product/lead-response/dashboard/app/onboarding/steps/simulator.tsx implementing all FR-1 through FR-8 as specified in the PRD.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-transactional-email-resend — Transactional Email Delivery via Resend — Activate the Signup Funnel

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Configure and verify Resend email delivery for all transactional emails: signup confirmation, password reset, lead magnet playbook delivery, and welcome sequence. Currently RESEND_API_KEY is not configured in Vercel, meaning the entire email layer is silent. This is the #1 blocker for activation: users who sign up cannot confirm their account, reset their password, or receive the lead magnet they requested. Without working email, the signup funnel is broken regardless of how many CTA clicks the landing page generates.
- **Acceptance Criteria:**
  - RESEND_API_KEY configured in Vercel project settings for leadflow-ai
  - Signup confirmation email sent within 60 seconds of account creation
  - Password reset email delivers working reset link
  - Lead magnet playbook email delivered within 60 seconds of /api/lead-capture submission
  - Welcome email sent after successful signup with next steps
  - Email templates are on-brand (LeadFlow AI branding)
  - All emails render correctly in Gmail and mobile
  - Bounced/failed emails logged to Supabase for monitoring
  - Test coverage: automated test verifies email delivery end-to-end
- **Workflow:** Dev > QC

### fix-three-consecutive-vercel-builds-failing-fix-never- — Three consecutive Vercel builds failing — fix never reached production

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Three consecutive Vercel builds failing — fix never reached production
**Type:** bug
**Severity:** critical
**Source:** Product review 45f37249-2101-4917-845a-af8839edddb1

**Details:** vercel ls shows the 3 most recent Production deployments all have status Error (created ~12-14 min ago). The post-PR #73 commits (83b83ac Lead Experience Simulator, e8d0ccf Onboarding Wizard) are triggering build failures. tsc --noEmit reveals: app/api/auth/trial-signup/route.ts(111,23) TS2339: Property "catch" does not exist on type "PromiseLike<void>"; app/pilot/page.tsx(62,26) TS2345: Argument of type "form_view" not assignable to parameter of type "FormFunnelEvent". These compile errors are blocking the Next.js build.

**Suggested fix:** Fix TypeScript errors in trial-signup route and pilot page, then force-push or create a PR to trigger a clean Vercel build.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-touchsession-middleware-not-implemented-no-session — touchSession() middleware not implemented — no session heartbeat

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## touchSession() middleware not implemented — no session heartbeat
**Type:** bug
**Severity:** critical
**Source:** Product review 7578d6f4-72b3-4225-bde2-fb545637ba4e

**Details:** FR-2 requires that every authenticated API call or page load updates agent_sessions.last_active_at. No such middleware exists. The middleware.ts only validates authentication (via the sessions table, not agent_sessions) and sets security headers. agent_sessions.last_active_at is never updated.

**Suggested fix:** Add touchSession(sessionId) middleware to Next.js middleware.ts that updates last_active_at with a 60-second rate limit (using a server-side cache/Map or Redis). Must fail silently (not break requests).
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-signup-creates-customer-record-but-login — signup creates customer record but login queries agents table - auth flow is broken because signup and login use different database tables and password is never collected during signup

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: signup creates customer record but login queries agents table - auth flow is broken because signup and login use different database tables and password is never collected during signup
- **Workflow:** Dev > QC

### fix-email-delivery-non-functional-resend-api-key-not-s — Email delivery non-functional - RESEND_API_KEY not set in Vercel

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Email delivery non-functional - RESEND_API_KEY not set in Vercel
**Type:** integration
**Severity:** critical
**Source:** Product review 6213e6dd-72b0-4b31-b3d1-0a3ed9cee980

**Details:** RESEND_API_KEY is not configured in Vercel environment. This means: (1) signup confirmation emails not sent, (2) password reset emails fail, (3) lead magnet playbook not delivered even though API returns success. Without working transactional email, the entire activation funnel is broken - users sign up but cannot confirm their account or recover access.

**Suggested fix:** Configure RESEND_API_KEY in Vercel project settings for leadflow-ai. Verify by triggering a test email via the /api/lead-capture endpoint and checking delivery.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-pilot-signup-route-ts-still-redirects-to-dashboard — pilot-signup/route.ts still redirects to /dashboard/onboarding (2 occurrences)

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## pilot-signup/route.ts still redirects to /dashboard/onboarding (2 occurrences)
**Type:** bug
**Severity:** critical
**Source:** Product review 800c1a93-d8e9-4acb-b800-e5402ab3fed7

**Details:** Line 288: redirectTo: "/dashboard/onboarding". Line 112: hardcoded email href to https://leadflow-ai-five.vercel.app/dashboard/onboarding. Both are broken and unfixed.

**Suggested fix:** Change both occurrences to /setup and fix email href accordingly
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-admin-nps-page-does-not-exist-us-3-pm-dashboard-ab — /admin/nps page does not exist — US-3 PM dashboard absent

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## /admin/nps page does not exist — US-3 PM dashboard absent
**Type:** missing_feature
**Severity:** critical
**Source:** Product review 343d82e8-192e-4de1-bcab-e45cb9e10e60

**Details:** GET /admin/nps redirects to login (auth middleware works), but after login there is no nps page in the admin directory — only app/admin/simulator/ exists. The getNPSStats() function in nps-service.ts is implemented and ready to use, but there is no page to display it. The PM has no visibility into NPS scores, response counts, or promoter/detractor breakdowns without querying Supabase manually.

**Suggested fix:** Create app/admin/nps/page.tsx that fetches from getNPSStats() on the server side and renders: current NPS score, period comparison, promoter/passive/detractor breakdown, and list of last 20 open-text responses.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-onboarding-wizard-stuck-no-aha-moment-for-new-sign — Onboarding wizard stuck - no aha moment for new signups

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Onboarding wizard stuck - no aha moment for new signups
**Type:** ux
**Severity:** high
**Source:** Product review 6213e6dd-72b0-4b31-b3d1-0a3ed9cee980

**Details:** The post-login onboarding wizard (feat-post-login-onboarding-wizard) is marked STUCK in the use_cases table. Users who complete signup have no guided path to their first value moment. Without an aha moment, trial-to-paid conversion will be near zero.

**Suggested fix:** Unblock the onboarding wizard. The aha moment must be: user sees a simulated lead come in and gets an AI SMS response in <30 seconds. Use the Lead Experience Simulator as the centerpiece of step 4.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Design > Dev > QC

### feat-repository-structure-convention — Repository Structure Convention for LeadFlow

- **PRD:** Repository Structure Convention for LeadFlow
- **Status:** complete
- **Priority:** 2
- **Description:** Apply repository structure convention across LeadFlow: move root utility/diagnostic JS and shell scripts into scripts/ subdirectories; reorganize root documentation into docs/prd, docs/design, docs/guides, docs/reports with explicit keep-at-root exceptions; move strategy-config.json, swarm-config.json, and budget-tracker.json into config/ and update all references; consolidate test/ and tests/ into tests/{e2e,integration,unit}; create PROJECT_STRUCTURE.md from genome template; update CLAUDE.md Key Directories to match; and verify symlinks, server.js runtime, and Vercel deploy still work. Definition of done includes zero stale path references and successful smoke checks.
- **Acceptance Criteria:**
  - ["AC-1: strategy-config.json, swarm-config.json, budget-tracker.json moved to config/ with zero stale references","AC-2: tests/e2e/ and tests/integration/ created; test/ consolidated; npm test passes","AC-3: docs/prd/, docs/design/, docs/guides/, docs/reports/ created with correct files","AC-4: Root-level diagnostic scripts moved to scripts/ subdirectories","AC-5: PROJECT_STRUCTURE.md created at repo root","AC-6: CLAUDE.md Key Directories updated to reflect new layout","AC-7: node server.js starts, symlinks resolve, smoke test passes","AC-8: Zero stale path references verified by grep"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### feat-lead-satisfaction-feedback — Lead Satisfaction Feedback Collection

- **PRD:** Lead Satisfaction Feedback Collection
- **Status:** complete
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

### feat-lead-magnet-email-capture — Lead Magnet / Email Capture on Landing Page

- **PRD:** Lead Magnet / Email Capture on Landing Page
- **Status:** complete
- **Priority:** 2
- **Description:** Capture emails of landing page visitors not ready to sign up by offering a lead magnet (PDF guide: "The 5-Minute AI Lead Response Playbook"). Email capture form on landing page → /api/lead-capture endpoint → record stored in pilot_signups with source=lead_magnet → automated 3-email nurture sequence (instant delivery, Day 3 social proof, Day 7 pilot invite). Goal: build nurture list and convert to trial/signup within 30 days. KPIs: 20+ captures in 30 days, ≥10% → trial conversion.
- **Acceptance Criteria:**
  - ["Form renders between hero and pricing sections on landing page","Valid email submission: success message shown, record saved in pilot_signups with source=lead_magnet","Invalid email: inline error shown, API not called","Delivery email sent to captured inbox within 60 seconds","Duplicate email: success state shown, no duplicate row created","UTM parameters captured and stored on submission","Form fully usable on mobile (375px viewport)"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### improve-landing-page-pricing-4-tiers — Landing Page Pricing Section — All 4 Tiers with Feature Comparison

- **PRD:** Landing Page Pricing Section — All 4 Tiers with Feature Comparison
- **Status:** complete
- **Priority:** 2
- **Description:** Show all 4 pricing tiers (Starter $49/mo, Pro $149/mo, Team $399/mo, Brokerage $999+/mo) on the marketing landing page with a feature comparison, matching PMF.md prices. The current landing page has no pricing section; the /pricing page shows 3 wrong tiers at $497/$997/$1997.
- **Acceptance Criteria:**
  - ["Landing page (/) has a visible pricing section with all 4 tiers before the footer","Prices match PMF.md: Starter $49, Pro $149, Team $399, Brokerage $999+","Pro tier is visually highlighted as Most Popular","All tiers have working CTA buttons (Starter/Pro/Team to /signup, Brokerage to contact)","/pricing page corrected: 4 tiers at correct prices with feature comparison table","Feature comparison table shows checkmarks and dashes per feature matrix in PRD","Mobile responsive: pricing cards stack vertically on 375px viewport"]
- **Workflow:** PM > Design > Dev > QC

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
- **Status:** complete
- **Priority:** 2
- **Description:** Add a frictionless Start Free Trial CTA to the marketing landing page. Visitors enter email + password (2 fields), receive a 30-day Pro trial account with no credit card required, and are redirected immediately to the onboarding wizard. CTA placed in 3 locations: hero (above fold), features section, pricing section. Existing pilot application form preserved at /pilot.
- **Acceptance Criteria:**
  - ["Start Free Trial button visible above fold on desktop (1280px) and mobile (375px)","User can create account with only email + password — no credit card field","Account created and user redirected to dashboard within 5 seconds","New account has plan_tier=trial and trial_ends_at set to 30 days from creation","Trial badge with days remaining visible in dashboard nav","CTA appears in hero, features section, and pricing section (3 placements)","Existing pilot application form still accessible","Trial accounts have source=trial_cta on agents record","Duplicate email shows friendly error with sign-in link"]
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

### UC-LANDING-ANALYTICS-GA4-001 — Landing Page Analytics — GA4 CTA & Conversion Tracking

- **PRD:** Landing Page Analytics: GA4 CTA & Conversion Tracking
- **Status:** complete
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

### gtm-landing-page — Landing Page

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** Create a high-converting landing page that clearly communicates the value proposition, pricing, and includes a signup CTA.
- **Workflow:** PM > Marketing > Design > Dev > QC

### feat-email-verification-before-login — Email Verification — Confirm Inbox Before Login

- **PRD:** Email Verification — Confirm Inbox Before Login
- **Status:** complete
- **Priority:** 2
- **Description:** ## Feature: Email Verification Gate on Login

After signup, users must click a confirmation link sent to their email inbox before they can log in. Unverified accounts are created but blocked from accessing the dashboard.

### User Journey
1. Agent signs up (trial or pilot) — account created with email_verified = false
2. Confirmation email sent via Resend with a unique time-limited token (expires 24h)
3. Agent is redirected to /check-your-inbox page explaining they must verify their email
4. Agent clicks link in email → /api/auth/verify-email with token param
5. Token validated → email_verified set to true → agent redirected to /setup (onboarding wizard)
6. Until email_verified = true: login returns 403 with message directing agent to check inbox; resend link offered

### Technical Requirements
- New DB table: email_verification_tokens (id uuid, agent_id uuid FK real_estate_agents, token text UNIQUE, expires_at timestamptz, used_at timestamptz nullable, created_at timestamptz)
- real_estate_agents table: add email_verified boolean DEFAULT false
- /api/auth/verify-email GET route: validates token, marks used, sets email_verified=true, redirects to /setup
- /api/auth/resend-verification POST route: sends new token (rate-limited: max 3/hour)
- Login route (/api/auth/login): check email_verified before issuing session; return 403 with { error: 'EMAIL_NOT_VERIFIED', message: 'Please confirm your email address.' } if false
- /check-your-inbox page: shows email address, countdown/expiry note, Resend Email button wired to /api/auth/resend-verification

### UI: Check-Your-Inbox Page
- Headline: "Check your inbox"
- Body: "We sent a confirmation link to {email}. Click the link to activate your account."
- Resend link CTA (disabled for 60s after click, max 3 resends)
- "Wrong email? Sign up with a different address" link
- No dashboard access until verified

### Acceptance Criteria
1. Signup completes → email_verification_tokens row created, Resend email delivered within 30s with working link
2. Clicking verification link → email_verified = true, redirected to /setup onboarding wizard
3. Login with unverified account → 403, 'EMAIL_NOT_VERIFIED' message shown in UI with resend CTA
4. Login with verified account → normal session flow unaffected
5. Token expires after 24h — expired token shows "Link expired, please request a new one"
6. Resend endpoint rate-limits to 3 tokens/hour per agent
7. /check-your-inbox page renders correctly on mobile; email address displayed
8. Existing accounts (email_verified = null/true) treated as verified — no forced re-verification for existing users
9. Both pilot and trial signup flows trigger verification email

### Why This Matters
- Prevents fake/mistyped email signups
- Confirms Resend delivery is working before agent enters onboarding
- Standard SaaS trust signal
- Reduces dead accounts from typos
- **Acceptance Criteria:**
  - Signup completes → email_verification_tokens row created, Resend email delivered within 30s with working link
  - Clicking verification link → email_verified = true, redirected to /setup onboarding wizard
  - Login with unverified account → 403, EMAIL_NOT_VERIFIED message shown in UI with resend CTA
  - Login with verified account → normal session flow unaffected
  - Token expires after 24h — expired token shows Link expired redirect to /check-your-inbox
  - Resend endpoint rate-limits to 3 tokens/hour per agent (HTTP 429 on 4th)
  - /check-your-inbox page renders correctly on mobile (375px); email address displayed
  - Existing accounts (created before feature ships) treated as verified — backfill runs at migration time
  - Both pilot and trial signup flows trigger verification email
- **Workflow:** PM > Design > Dev > QC

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

### feat-session-analytics-pilot — Session Analytics — Pilot Agent Usage Tracking

- **PRD:** Session Analytics for Agent Dashboard — Pilot Usage Tracking
- **Status:** complete
- **Priority:** 2
- **Description:** Track whether pilot real estate agents are actively logging in and using the dashboard. Captures session events, page views, and inactivity signals. Enables proactive outreach before pilots disengage.
- **Acceptance Criteria:**
  - ["agent_sessions table populated on each pilot login","agent_page_views table tracks dashboard navigation per session","GET /api/internal/pilot-usage returns current engagement data for all pilots","Pilots with >72h inactivity trigger a Telegram alert (max once per 24h)","Session logging failures do not break the authentication flow"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### feat-nps-agent-feedback — NPS & Feedback Survey for Agents

- **PRD:** NPS / Feedback Survey Mechanism for Real Estate Agents
- **Status:** complete
- **Priority:** 2
- **Description:** Collect NPS scores and open-ended feedback from real estate agents (customers) via automated email surveys (T+14d, T+90d), always-on in-app feedback button, admin NPS trend dashboard, and churn risk detection for detractor scores.
- **Acceptance Criteria:**
  - ["Agent receives NPS email 14 days after signup and every 90 days thereafter","Survey email contains 0-10 scale question and optional open text field","Agent can submit survey via email link without logging in (signed JWT token)","In-app NPS prompt shown on dashboard login when survey is due; dismissible","Persistent Give Feedback button in dashboard allows any-time submission","Feedback form supports 4 types: Works great, Bug, Idea, Frustration","Admin NPS view at /admin/nps shows current NPS score, trend, and recent responses","NPS calculated as % Promoters minus % Detractors from last 90 days","Detractor score (0-6) auto-creates churn_risk entry in product_feedback table","Survey scheduling tracked per agent; no duplicate sends within 30 days of last survey"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### feat-lead-experience-simulator — Lead Experience Simulator & Conversation Viewer

- **PRD:** Lead Experience Simulator & Conversation Viewer
- **Status:** complete
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

### fix-sms-messages-direction-values-are-outbound-api-not — sms_messages.direction values are outbound-api not outbound

- **PRD:** -
- **Status:** complete
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

### fix-agents-table-mismatch-auth-routes — Fix agents Table Mismatch in Auth/Onboarding API Routes

- **PRD:** Fix agents Table Mismatch in Auth/Onboarding API Routes
- **Status:** complete
- **Priority:** 2
- **Description:** Multiple product API routes query supabase.from("agents") — the orchestrator task table — instead of supabase.from("real_estate_agents"). This breaks email check, onboarding, profile, Stripe webhooks, and satisfaction routes. Fix all 11 affected files to use real_estate_agents.
- **Acceptance Criteria:**
  - ["AC-1: Email check during signup returns correct availability from real_estate_agents","AC-2: Agent profile GET loads data from real_estate_agents","AC-3: Onboarding form submission creates/updates row in real_estate_agents","AC-4: No 500 errors on any auth/onboarding/profile endpoint","AC-5: grep of product api dir shows 0 from(agents) product-customer references","AC-6: Stripe webhook updates real_estate_agents on subscription events"]
- **Workflow:** Dev > QC

### fix-social-proof-testimonials-section-not-implemented — Social proof / testimonials section not implemented

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Social proof / testimonials section not implemented
**Type:** missing_feature
**Severity:** high
**Source:** Product review 2a2ab8ce-0083-45a4-acac-dd48c4ad951a

**Details:** PRD R3 requires at least 1 testimonial card (ideally 3) positioned between How It Works and Pricing. Section is entirely absent from source code and live site. Real estate agents buy based on peer endorsement — this is a direct conversion killer.

**Suggested fix:** Add Testimonials section to app/page.tsx between How It Works and Pricing sections. Use placeholder quotes from Sarah M./Mike R./Jennifer K. as specified in PRD. Include "Results may vary" disclaimer. Card-based grid, stacked on mobile.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-feature-comparison-table-absent-from-pricing-page — Feature comparison table absent from /pricing page

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Feature comparison table absent from /pricing page
**Type:** missing_feature
**Severity:** high
**Source:** Product review dd17579e-8d97-442f-8477-ad945822b584

**Details:** FR-5 requires a feature comparison table on /pricing with features as rows and tiers as columns (✓/— per cell). Currently the page only has per-card feature bullet lists. There is no side-by-side comparison table at all. AC-6 fails.

**Suggested fix:** Add a <table> element below the pricing cards implementing the feature matrix from PRD section 4. Use ✓ / — icons. Make it horizontally scrollable on mobile.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-team-tier-399-mo-missing-from-pricing-page-only-3- — Team tier ($399/mo) missing from /pricing page — only 3 tiers shown

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Team tier ($399/mo) missing from /pricing page — only 3 tiers shown
**Type:** missing_feature
**Severity:** high
**Source:** Product review dd17579e-8d97-442f-8477-ad945822b584

**Details:** The /pricing page shows only 3 tiers (Starter, Professional, Enterprise). The Team tier at $399/mo targeting small teams (up to 5 agents) is missing entirely. The grid is md:grid-cols-3 and needs to become md:grid-cols-4 to accommodate all 4 tiers.

**Suggested fix:** Add a Team plan object to PRICING_PLANS with name=Team, tier=team, monthlyPrice=399, features matching PRD feature matrix. Change grid to md:grid-cols-2 lg:grid-cols-4 for responsiveness.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-trial-period-set-to-30-days-prd-specifies-14-days — Trial period set to 30 days — PRD specifies 14 days

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Trial period set to 30 days — PRD specifies 14 days
**Type:** bug
**Severity:** high
**Source:** Product review ec5932ad-cbc7-4d57-8ca5-029c56aa0a39

**Details:** In /app/api/auth/trial-signup/route.ts: trial_ends_at = Date.now() + 30 * 24 * 60 * 60 * 1000. PRD-FRICTIONLESS-ONBOARDING-001 clearly states 14-day trial. Also, the analytics event logs trial_days: 30. The trial-badge component will show incorrect countdown.

**Suggested fix:** Change 30 to 14 in trial-signup route. Update the analytics event property to trial_days: 14.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-lead-magnet-feature-not-merged-to-main-branch — Lead magnet feature NOT merged to main branch

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Lead magnet feature NOT merged to main branch
**Type:** issue
**Severity:** high
**Source:** Product review 46d70b0b-3296-4827-866e-355e2a8f680e

**Details:** The lead magnet implementation lives on dev/c20d1d60-dev-feat-lead-magnet-email-capture-lead- branch (3 commits: feat, fix, test). The main branch app/page.tsx (260 lines) does NOT include LeadMagnetSection. Vercel was deployed from the dev branch directly. If a future deploy happens from main, the feature will disappear. Source code is out of sync.

**Suggested fix:** Merge dev/c20d1d60-dev-feat-lead-magnet-email-capture-lead- to main after fixing the Vercel DB issue. This also syncs the app/api/lead-capture/route.ts and lib/lead-magnet-email.ts files to main.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-expired-trial-handling-not-implemented-ac-8 — Expired trial handling not implemented (AC-8)

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Expired trial handling not implemented (AC-8)
**Type:** bug
**Severity:** high
**Source:** Product review ec5932ad-cbc7-4d57-8ca5-029c56aa0a39

**Details:** No code checks trial_ends_at expiry to redirect users to /upgrade, pause SMS, or gate access. Expired trial users continue to have full access. AC-8 requires: expired trial users redirected to /upgrade; SMS paused, leads preserved. No /upgrade route exists.

**Suggested fix:** Add middleware check: if plan_tier=trial and trial_ends_at < now, redirect to /upgrade (needs to be created). Add Supabase scheduled function to pause SMS sending for expired trials.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-main-landing-page-has-no-cta-analytics-instrumenta — Main landing page (/) has no CTA analytics instrumentation

- **PRD:** -
- **Status:** complete
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

### fix-inactivity-alerting-cron-not-implemented — Inactivity alerting cron not implemented

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Inactivity alerting cron not implemented
**Type:** feature_missing
**Severity:** high
**Source:** Product review 7578d6f4-72b3-4225-bde2-fb545637ba4e

**Details:** FR-5 requires a cron task that fires every 30 minutes, checks for pilots inactive >72h (via agent_sessions.last_active_at), de-duplicates via inactivity_alerts table, and sends a Telegram notification. No such cron job or heartbeat integration exists. The inactivity_alerts table is empty and no code writes to it.

**Suggested fix:** Add a Vercel Cron route at /api/cron/inactivity-alerts/route.ts (or integrate into existing heartbeat). Query agent_sessions for pilots with last_active_at < now()-72h. Check inactivity_alerts for alerts within last 24h. If none, send Telegram message and insert alert row. Add to vercel.json crons section with */30 * * * * schedule.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-onboarding-still-present-in-auth-routes-middleware — /onboarding still present in AUTH_ROUTES (middleware.ts line 21)

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## /onboarding still present in AUTH_ROUTES (middleware.ts line 21)
**Type:** bug
**Severity:** high
**Source:** Product review 800c1a93-d8e9-4acb-b800-e5402ab3fed7

**Details:** AUTH_ROUTES blocks authenticated users from accessing /onboarding. This was supposed to be removed per R4 of the PRD. Authenticated users who land on /onboarding are redirected away rather than shown the page.

**Suggested fix:** Remove "/onboarding" from the AUTH_ROUTES array in middleware.ts
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-frontend-components-still-fall-back-to-dashboard-o — Frontend components still fall back to /dashboard/onboarding

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Frontend components still fall back to /dashboard/onboarding
**Type:** bug
**Severity:** high
**Source:** Product review 800c1a93-d8e9-4acb-b800-e5402ab3fed7

**Details:** components/trial-signup-form.tsx:61 and components/pilot-signup-form.tsx:69 both contain fallback: router.push(data.redirectTo || "/dashboard/onboarding"). Even if the API routes are fixed, a missing redirectTo in the response will still route users to the 404 page.

**Suggested fix:** Change fallback in both components from "/dashboard/onboarding" to "/setup"
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-endpoint-not-protected-by-session-middleware — API endpoint not protected by session middleware

- **PRD:** -
- **Status:** complete
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

### fix-duplicate-email-error-shows-plain-text-missing-sig — Duplicate email error shows plain text — missing sign-in link

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Duplicate email error shows plain text — missing sign-in link
**Type:** bug
**Severity:** high
**Source:** Product review 075a0c75-ce7c-4f4f-a990-8d9f94f2c970

**Details:** API returns the message correctly but TrialSignupForm renders it as plain error text. The acceptance criterion requires a sign-in link, not just the word sign in.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-twilio-number-provisioning-not-implemented — Twilio number provisioning not implemented

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Twilio number provisioning not implemented
**Type:** bug
**Severity:** high
**Source:** Product review 1c4f22fb-3699-4f5a-8b80-fd36333331ae

**Details:** When agent selects "Get a new number" in Step 2, the frontend sends useSystemNumber=true to /api/integrations/twilio/connect which stores placeholder phone 0000000000. The actual Twilio API call to provision a real phone number (Twilio /IncomingPhoneNumbers endpoint) is never made. Agents selecting this path end up with no real SMS capability.

**Suggested fix:** Implement /api/agents/onboarding/provision-phone endpoint that calls Twilio IncomingPhoneNumbers API with area code param and assigns returned number to agent.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-endpoints-developer-table-embedded-in-marketin — API Endpoints developer table embedded in marketing landing page

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## API Endpoints developer table embedded in marketing landing page
**Type:** ux
**Severity:** high
**Source:** Product review 6213e6dd-72b0-4b31-b3d1-0a3ed9cee980

**Details:** The landing page shows an "API Endpoints" section with a raw endpoints table (POST /api/webhook, POST /api/sms/send, etc.) mid-page. This looks unprofessional to real estate agents and will hurt conversion by making the product seem too technical.

**Suggested fix:** Remove or hide the API Endpoints section from the public landing page. Replace with a How It Works section or testimonials.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Design > Dev > QC

### fix-fub-webhook-registration-not-implemented — FUB webhook registration not implemented

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## FUB webhook registration not implemented
**Type:** bug
**Severity:** high
**Source:** Product review 1c4f22fb-3699-4f5a-8b80-fd36333331ae

**Details:** /api/integrations/fub/connect validates the API key and stores it, but never calls the FUB webhook registration API. Without the webhook, FUB will not push new lead events to LeadFlow — the core product functionality will not work for agents who onboard via wizard.

**Suggested fix:** After successful API key validation, call FUB /v1/events/subscriptions to register LeadFlow webhook URL for the new_person and updated_contact events.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-sync-system-components-js-used-wrong-column-names- — sync-system-components.js used wrong column names causing silent failure

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## sync-system-components.js used wrong column names causing silent failure
**Type:** bug
**Severity:** high
**Source:** Product review 50f2578d-a0e0-4ab4-b589-d6dc2d4d2ea0

**Details:** Script referenced: name (→ component_name), type (→ category), url as top-level (→ metadata.url). Also used onConflict: "id" but the unique constraint is on (project_id, component_name). Fixed all column mappings, added status_emoji, changed conflict key. Verified: all 7 smoke tests now sync with 0 errors.

**Suggested fix:** Applied: mapped name→component_name, type→category, url→metadata.url, added status_emoji, changed onConflict to project_id,component_name
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-no-in-app-nps-prompt-on-dashboard-login — No in-app NPS prompt on dashboard login

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## No in-app NPS prompt on dashboard login
**Type:** missing_feature
**Severity:** high
**Source:** Product review 343d82e8-192e-4de1-bcab-e45cb9e10e60

**Details:** PRD US-1 requires that if a survey trigger has fired and no response submitted within 7 days, an in-app prompt appears on the next dashboard login. The shouldShowNPSPrompt() function exists in nps-service.ts but no dashboard page or layout component checks it or renders a prompt. The dismissNPSPrompt() function is also unused.

**Suggested fix:** Add an NPSPromptModal component to the dashboard layout. On page load, call /api/nps/prompt-status (new route) which calls shouldShowNPSPrompt(). If true, show dismissible overlay with 0-10 scale and optional text. Dismissal calls /api/nps/dismiss (new route using dismissNPSPrompt()).
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-no-cron-job-or-api-endpoint-to-trigger-automated-n — No cron job or API endpoint to trigger automated NPS surveys

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## No cron job or API endpoint to trigger automated NPS surveys
**Type:** missing_feature
**Severity:** high
**Source:** Product review 343d82e8-192e-4de1-bcab-e45cb9e10e60

**Details:** PRD FR-8 requires automated survey triggers at T+14d and T+90d. The nps-service.ts has getAgentsDueForSurvey() and initializeSurveySchedule() but there is no cron route or scheduler that calls them. No app/api/cron/nps-survey route exists. Agents are never enrolled in the survey schedule and surveys are never sent.

**Suggested fix:** Create app/api/cron/nps-survey/route.ts that: (1) calls getAgentsDueForSurvey(), (2) generates tokens via generateSurveyToken(), (3) sends emails via nps-email-service.ts, (4) updates schedule via updateSurveyScheduleAfterResponse(). Hook into existing Vercel Cron or the Genome heartbeat scheduler. Also call initializeSurveySchedule() in the agent signup/onboarding flow.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-dashboard-route-guard-missing-wizard-bypass-possib — Dashboard route guard missing — wizard bypass possible

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Dashboard route guard missing — wizard bypass possible
**Type:** bug
**Severity:** high
**Source:** Product review 1c4f22fb-3699-4f5a-8b80-fd36333331ae

**Details:** middleware.ts does not check real_estate_agents.onboarding_completed. An agent who navigates directly to /dashboard after signup (or who knows the URL) bypasses the wizard entirely. The PRD specifies: "If agent directly navigates to /dashboard and onboarding_completed = false, redirect to /onboarding".

**Suggested fix:** Add middleware logic to check onboarding_completed for authenticated users accessing /dashboard routes. Alternatively, perform this check in the dashboard page itself using a server component or client-side redirect.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-use-cases-implementation-status-marked-complete-de — use_cases.implementation_status marked complete despite fix not being applied

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## use_cases.implementation_status marked complete despite fix not being applied
**Type:** status_error
**Severity:** high
**Source:** Product review 0a39800d-db7c-4d15-9fe6-5243bcaef79f

**Details:** The use_case "fix-agents-table-mismatch-auth-routes" has implementation_status=complete but inspection of the codebase shows 23 remaining from("agents") references. This false completion status blocked proper escalation. Likely a phantom completion report without actual code changes.

**Suggested fix:** Reset implementation_status to "in_progress" and re-assign to dev agent. Verify completion with grep before marking complete.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-pilot-pricing-decision-implemented-as-uc-spec — Pilot pricing decision implemented as UC spec

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Pilot pricing decision implemented as UC spec
**Type:** decision
**Severity:** high
**Source:** Product review 145f65ad-c560-4921-99c8-01edcf20badd

**Details:** Decision approved by Stojan: Free pilot, no credit card required. Pilot agents get 30-60 days free access. Manual conversion. UC created: free-pilot-no-credit-card-required.

**Suggested fix:** Implement UC: remove CC from signup, set plan_tier=pilot, add pilot expiry dates, notify Stojan on signup
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-genome-project-structure-convention — Project Structure Convention System

- **PRD:** Project Structure Convention System
- **Status:** in_progress
- **Priority:** 2
- **Description:** Create a PROJECT_STRUCTURE.md template system in genome. (1) Create template at ~/.openclaw/genome/templates/PROJECT_STRUCTURE.template.md defining canonical directory structure for all projects. (2) Wire into buildRoleContext() in workflow-engine.js — inject Project Structure section into dev, design, PM spawn messages. (3) Add bootstrap step that creates PROJECT_STRUCTURE.md from template when new project is registered. (4) Update all workspace SOUL.md files to include rule: Always read PROJECT_STRUCTURE.md before creating files.
- **Acceptance Criteria:**
  - AC-1: Template file exists at ~/.openclaw/genome/templates/PROJECT_STRUCTURE.template.md with Overview, Root-Level Files, Directory Map, Naming Conventions sections
  - AC-2: buildRoleContext() in workflow-engine.js injects Project Structure section into dev, design, and PM spawn messages
  - AC-3: bootstrap-project.js creates PROJECT_STRUCTURE.md from template when registering new projects, substituting template variables
  - AC-4: All workspace SOUL.md files (~/.openclaw/workspace-*/SOUL.md) include rule to read PROJECT_STRUCTURE.md before creating files
  - AC-5: Existing PROJECT_STRUCTURE.md files are not overwritten (template only used for new projects)
- **Workflow:** PM > Dev > QC

### fix-signup-routes-redirect-to-setup-not-dashboard-onbo — Signup routes redirect to /setup not /dashboard/onboarding

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Signup routes redirect to /setup not /dashboard/onboarding
**Type:** gap
**Severity:** high
**Source:** Product review 990748a1-17a5-4fcd-ba66-c365766e28f0

**Details:** All 3 signup API routes return redirectTo: "/setup" despite owner approving /dashboard/onboarding. UC specced for dev to fix.

**Suggested fix:** Update redirectTo in trial-signup, pilot-signup, trial/start routes and email links
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-prd-md-files-remain-at-docs-root-instead-of-docs-p — PRD-*.md files remain at docs/ root instead of docs/prd/

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## PRD-*.md files remain at docs/ root instead of docs/prd/
**Type:** structure
**Severity:** high
**Source:** Product review 7c77938b-3199-4921-a311-f05a4a4db667

**Details:** The PRD says PRD-*.md files should move to docs/prd/. There are 20+ PRD-*.md files at docs/ root (docs/PRD-BILLING-SCHEMA-ALIGNMENT.md, docs/PRD-EMAIL-VERIFICATION-BEFORE-LOGIN.md, etc.) but only 4 files are in docs/prd/. The convention was partially applied — new PRDs go to docs/prd/ but the bulk migration of older PRDs did not complete.

**Suggested fix:** Move all docs/PRD-*.md files into docs/prd/ and update any references.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-madzunkov-hotmail-com-has-plan-tier-null-account-m — madzunkov@hotmail.com has plan_tier=null — account may be broken

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## madzunkov@hotmail.com has plan_tier=null — account may be broken
**Type:** account_status
**Severity:** high
**Source:** Product review 68208c47-00e1-4798-a1c5-299014640ef3

**Details:** madzunkov@hotmail.com was previously locked out (fix-madzunkov-hotmail-com use case marked complete) but now shows plan_tier=null and trial_ends_at=null. If Stojan uses this account, he may hit broken product states.

**Suggested fix:** Set plan_tier=trial and trial_ends_at to 30 days from now for madzunkov@hotmail.com, or confirm account is intentionally deactivated.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-next-public-ga4-measurement-id-not-configured-ga4- — NEXT_PUBLIC_GA4_MEASUREMENT_ID not configured — GA4 script will not load

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## NEXT_PUBLIC_GA4_MEASUREMENT_ID not configured — GA4 script will not load
**Type:** bug
**Severity:** high
**Source:** Product review 606e97d0-54b1-4880-88db-5d19afac2a9d

**Details:** The .env.local file has NEXT_PUBLIC_GA4_MEASUREMENT_ID= with an empty value. The layout.tsx conditionally skips the GA4 script if GA_ID is falsy, so analytics is completely disabled until Stojan creates a GA4 property and provides the Measurement ID. This is a Stojan action required, but blocks AC-1 through AC-8.

**Suggested fix:** Stojan: (1) Go to analytics.google.com → Create property → "LeadFlow AI". (2) Add data stream for leadflow-ai-five.vercel.app. (3) Copy Measurement ID (G-XXXXXXXXXX). (4) Set NEXT_PUBLIC_GA4_MEASUREMENT_ID in Vercel project env vars (Production + Preview). Also update .env.local for local dev testing.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-genome-auto-generated-docs-convention — Auto-generated docs directory convention

- **PRD:** Auto-Generated Docs Directory Convention
- **Status:** in_progress
- **Priority:** 2
- **Description:** Update generate-project-docs.js to write auto-generated markdown files to docs/auto-generated/ instead of repo root. Update all references in heartbeat-executor.js, heartbeat-wrapper.js. Make output directory configurable in project.config.json under a docs section.
- **Acceptance Criteria:**
  - ["docs/auto-generated/ directory created when missing","USE_CASES.md, E2E_MAPPINGS.md, PRD_INDEX.md, JOURNEYS.md written to docs/auto-generated/","These files absent from repo root after migration","docs.auto_generated_dir in project.config.json overrides default path","Heartbeat runs end-to-end without path errors","File content unchanged (only write path changes)","docs/auto-generated/ gitignore or commit policy documented"]
- **Workflow:** PM > Dev > QC

### fix-how-it-works-section-not-implemented — How It Works section not implemented

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## How It Works section not implemented
**Type:** missing_feature
**Severity:** high
**Source:** Product review 2a2ab8ce-0083-45a4-acac-dd48c4ad951a

**Details:** PRD R2 requires a 3-step How It Works section between Features and the mid-page CTA. The section is entirely absent from both the source code (app/page.tsx) and the live production site. Page structure goes directly from Features → mid-page CTA → Pricing with no workflow explanation.

**Suggested fix:** Add HowItWorks component to app/page.tsx between the features section and the mid-page CTA block. 3 steps: (1) Connect Your CRM, (2) AI Responds Instantly, (3) You Close the Deal. Horizontal on desktop, stacked on mobile. Alternate background from features section.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-prd-objective-not-fully-implemented-product-api-ro — PRD objective not fully implemented: product API routes still query agents table

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## PRD objective not fully implemented: product API routes still query agents table
**Type:** bug
**Severity:** high
**Source:** Product review aadbe886-97d4-4fa7-9782-73406460a092

**Details:** Code scan in product/lead-response/dashboard found remaining `.from('agents')` usages in app/api/agents/satisfaction-ping/route.ts (GET/PATCH), app/api/satisfaction/stats/route.ts, and debug routes app/api/debug/test-formdata/route.ts + test-full-flow/route.ts. PRD requires migrating remaining product-route references to real_estate_agents.

**Suggested fix:** Replace all remaining product-route Supabase queries from agents to real_estate_agents, then run route-level smoke tests for satisfaction/stats and debug flows to confirm no regressions.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-brokerage-tier-missing-from-pricing-page — Brokerage tier missing from pricing page

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Brokerage tier missing from pricing page
**Type:** ux
**Severity:** high
**Source:** Product review ab254083-2a70-4148-8daf-ead95f544cea

**Details:** PMF.md defines Brokerage at +/mo but live pricing only shows 3 tiers.

**Suggested fix:** Add Brokerage tier card with contact-for-pricing CTA.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Design > Dev > QC

### fix-middleware-blocks-authenticated-users-from-onboard — Middleware blocks authenticated users from /onboarding route

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Middleware blocks authenticated users from /onboarding route
**Type:** bug
**Severity:** high
**Source:** Product review ec5932ad-cbc7-4d57-8ca5-029c56aa0a39

**Details:** middleware.ts lists /onboarding in AUTH_ROUTES which causes authenticated users to be redirected to /dashboard. Since the trial signup redirects users to /dashboard/onboarding (or should redirect to /onboarding), authenticated users are immediately bounced away from the onboarding wizard. This makes the wizard inaccessible to any logged-in user.

**Suggested fix:** Remove /onboarding from AUTH_ROUTES in middleware.ts. Post-login wizard should be accessible to authenticated users with onboarding_completed=false.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-analytics-events-table-missing-trial-funnel-tracki — analytics_events table missing — trial funnel tracking fails silently

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## analytics_events table missing — trial funnel tracking fails silently
**Type:** bug
**Severity:** high
**Source:** Product review ec5932ad-cbc7-4d57-8ca5-029c56aa0a39

**Details:** The trial-signup route logs to analytics_events table but the table does not exist (confirmed via Supabase query). The correct table is events. This causes all FR-8 funnel tracking to fail. The onboarding simulator also logs to events table correctly, but the trial_started event is broken. All 10 required funnel events from FR-8 cannot be trusted.

**Suggested fix:** Change analytics_events references in /app/api/auth/trial-signup/route.ts to use the events table. Verify all funnel event types are present in the events table schema.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-no-pilot-to-paid-conversion-email-sequence — No pilot-to-paid conversion email sequence

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## No pilot-to-paid conversion email sequence
**Type:** revenue_gap
**Severity:** high
**Source:** Product review ab254083-2a70-4148-8daf-ead95f544cea

**Details:** Free pilot expires at day 60 but no automated emails nudge agents toward conversion. No urgency signals at day 30, 45, 55.

**Suggested fix:** Build automated email sequence. New UC: feat-pilot-conversion-email-sequence.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-start-action-requires-sessionid-before-session — API start action requires sessionId before sessionId exists — chicken-and-egg

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## API start action requires sessionId before sessionId exists — chicken-and-egg
**Type:** api_bug
**Severity:** high
**Source:** Product review 4111cb47-5a5b-4e97-88f9-33fcb45d87cc

**Details:** The API validates that action, agentId, AND sessionId are all required for ALL actions including start. But per the PRD, the client calls start with only agentId and receives the sessionId in the response. The UI cannot call start without a sessionId, but it cannot have a sessionId until after start responds.

**Suggested fix:** Remove sessionId from the start validation. Only require agentId for start, and only require sessionId for status/skip. Server generates and returns sessionId in the start response.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-ahacompleted-not-included-in-onboarding-submit-pay — ahaCompleted not included in onboarding submit payload — FR-8 not implemented

- **PRD:** Aha Moment Simulator — Onboarding Step UI
- **Status:** complete
- **Priority:** 2
- **Description:** ## ahaCompleted not included in onboarding submit payload — FR-8 not implemented
**Type:** missing_implementation
**Severity:** high
**Source:** Product review 4111cb47-5a5b-4e97-88f9-33fcb45d87cc

**Details:** FR-8 requires aha_moment_completed to be included in the completeOnboarding() POST to /api/agents/onboard. The current agentData has no ahaCompleted or ahaResponseTimeMs fields, and the submit payload does not include these values.

**Suggested fix:** Add ahaCompleted: false and ahaResponseTimeMs: null to agentData initial state in page.tsx, and confirm these fields are serialized in the JSON.stringify body sent to /api/agents/onboard.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-response-format-does-not-match-prd-contract — API response format does not match PRD contract

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## API response format does not match PRD contract
**Type:** api_contract_mismatch
**Severity:** high
**Source:** Product review 4111cb47-5a5b-4e97-88f9-33fcb45d87cc

**Details:** The PRD spec defines the start response as {success, sessionId, status, turns[]}. The actual API returns {success, state: {id, session_id, agent_id, status, conversation[], ...}}. Key mismatches: field name turns[] vs conversation[]; responseTimeMs vs state.response_time_ms; status values — PRD uses "complete" but API uses "success"; PRD has 3 statuses while API has 7.

**Suggested fix:** When building simulator.tsx, use the actual API response format (state.conversation, state.response_time_ms, status=success for completion). Do NOT rely on the PRD contract — read the actual route.ts.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-leadflow-repository-restructuring — Repository restructuring

- **PRD:** Repository Structure Convention for LeadFlow
- **Status:** complete
- **Priority:** 2
- **Description:** Apply project structure convention to LeadFlow. Move root utility .js to scripts/ subdirs, .sh to scripts/, .md docs to docs/ subdirs (PRD-* to docs/prd/, DESIGN-* to docs/design/, guides to docs/guides/, reports to docs/reports/). Keep CLAUDE.md, ARCHITECTURE.md, README.md, PMF.md at root. Move config .json to config/. Consolidate test/ and tests/. Create PROJECT_STRUCTURE.md. Update CLAUDE.md. Verify symlinks, server.js, vercel deploy all work.
- **Acceptance Criteria:**
  - ["All targeted root JS utility/diagnostic files are moved from root into scripts/ subdirectories","No targeted root .sh file remains at root (except symlinks or orchestration files)","Documentation move rules applied: PRD-*.md → docs/prd/, DESIGN-*.md → docs/design/, guides → docs/guides/, reports → docs/reports/","Excluded root docs remain: CLAUDE.md, ARCHITECTURE.md, README.md, PMF.md, AGENTS.md, HEARTBEAT.md","config/ exists with the three JSON config files (strategy-config.json, swarm-config.json, budget-tracker.json) and references updated","Only one test root (tests/) with e2e, integration, unit subdirectories — legacy test/ merged","PROJECT_STRUCTURE.md exists at root and matches actual layout","CLAUDE.md Key Directories section updated to match new structure","Orchestration symlinks (task-store.js, project-config-loader.js, subagent-completion-report.js) still resolve","node server.js starts without path-related failures","Vercel deployment smoke check passes for both fub-inbound-webhook and leadflow-ai projects"]
- **Workflow:** PM > Dev > QC

### fix-cookie-name-mismatch-trial-start-sets-auth-token-u — Cookie name mismatch: trial/start sets auth_token (underscore) but /api/auth/me reads auth-token (hyphen)

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Cookie name mismatch: trial/start sets auth_token (underscore) but /api/auth/me reads auth-token (hyphen)
**Type:** bug
**Severity:** high
**Source:** Product review a16dee10-2364-455c-b041-a8ac7bd632ec

**Details:** In product/lead-response/dashboard/app/api/trial/start/route.ts line 166, the cookie is set as "auth_token" (with underscore). However, /api/auth/me reads "auth-token" (with hyphen). This means users who sign up via POST /api/trial/start will not benefit from the /api/auth/me fallback on the /dashboard/onboarding page — they will be incorrectly redirected to /login if localStorage is absent (e.g., incognito, SSR). Affects TC-SIGNUP-AUTH-004 for trial/start path.

**Suggested fix:** In trial/start/route.ts, change response.cookies.set("auth_token", ...) to response.cookies.set("auth-token", ...) to match all other signup routes and the /api/auth/me cookie reader.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-missing-how-it-works-section-ac-2-fails — Missing "How It Works" section — AC-2 fails

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Missing "How It Works" section — AC-2 fails
**Type:** missing_feature
**Severity:** high
**Source:** Product review 32b3d638-d8c2-491e-9434-d71458f1865a

**Details:** PRD R2 and AC-2 require a 3-step "How It Works" section between the features grid and the mid-page CTA ("Ready to Respond Faster?"). This section is completely absent from the live page. Current structure: Features → Mid-page CTA → Testimonials → Pricing. Required structure: Features → How It Works → Mid-page CTA → Testimonials → Pricing. Prospects have no simple mental model of what happens after signup — a known conversion killer for SaaS in complex niches like real estate AI.

**Suggested fix:** Add a 3-column section (stacked on mobile) after the feature grid and before the mid-page CTA. Content: Step 1 "Connect Your CRM" (FUB link in 2 min), Step 2 "AI Responds Instantly" (SMS in <30s), Step 3 "You Close the Deal" (qualified leads + booked appointments). Use numbered badges + icons. See PRD R2 for exact copy.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-trial-duration-mismatch-landing-says-30-day-signup — Trial duration mismatch — landing says 30-day, signup says 14-day (AC-3 fails)

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Trial duration mismatch — landing says 30-day, signup says 14-day (AC-3 fails)
**Type:** inconsistency
**Severity:** high
**Source:** Product review 32b3d638-d8c2-491e-9434-d71458f1865a

**Details:** Landing page pricing section header states "Start with a free 30-day trial. Upgrade when you're ready." The /signup page states "Start with a 14-day free trial. Cancel anytime." and the form footer says "Your 14-day free trial starts today. No charge until [date+14d]". This is a direct AC-3 violation. Prospects who click through expecting 30 days see 14 days at signup — a trust-breaking inconsistency that increases abandonment at the most critical funnel step.

**Suggested fix:** Pick one trial duration and apply it consistently across all surfaces. Recommendation: 14-day (industry standard for SaaS, more conservative for a product still in pilot). Update the landing page pricing section subheadline from "30-day" to "14-day free trial" to match /signup.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-stripe-subscriptions-table — Fix: Create Subscriptions Table for Stripe Webhook Storage

- **PRD:** Fix — Create Subscriptions Table in Supabase for Stripe Webhook Storage
- **Status:** complete
- **Priority:** 3
- **Description:** The subscriptions, subscription_events, payments, and checkout_sessions tables are missing from production Supabase. The Stripe webhook handler has no tables to write to, causing silent failures on all billing events. Apply migration 003_stripe_subscriptions.sql and fix the column name mismatch in the webhook handler.
- **Acceptance Criteria:**
  - subscriptions table exists with all required columns
  - subscription_events table has stripe_event_id unique constraint
  - payments table has stripe_invoice_id unique constraint
  - Webhook checkout.session.completed upserts a row in subscriptions
  - Webhook customer.subscription.updated updates existing subscriptions row
  - Webhook customer.subscription.deleted sets status=canceled
  - All webhook events insert audit row in subscription_events
  - No duplicate rows on event replay (idempotency)
  - agents table has subscription_status and subscription_tier columns
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

### pm-action-items-dashboard — PM Structured Action Items for Dashboard

- **PRD:** PM Structured Action Items for Dashboard
- **Status:** complete
- **Priority:** 2
- **Description:** When PM writes heartbeat reports or triage outcomes, they insert structured action items into the action_items Supabase table. These items appear on the execution dashboard with title, priority, decision type, and action needed. Stojan can see and respond to action items on the dashboard. Orchestrator tracks item lifecycle from WAITING to RESOLVED.
- **Acceptance Criteria:**
  - PM SOUL.md contains code example for inserting action items
  - PM HEARTBEAT.md lists scenarios and contains code example
  - Action items inserted by PM appear in dashboard action items section
  - Action items show title, priority, awaiting_input, action_needed fields
  - Orchestrator reads action_items table every heartbeat
  - Orchestrator surfaces WAITING items to Stojan
  - Action items can be filtered by status and priority
  - Stojan can respond to items via Telegram
  - Orchestrator updates status to RESOLVED when response received
  - Orchestrator spawns follow-up task based on decision
- **Workflow:** PM

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

