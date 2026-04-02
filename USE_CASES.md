<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# Use Cases

> Generated: 2026-04-02T10:36:28.087Z | Source: `use_cases` + `prds` tables

**Progress: 244/276 complete**

| UC | Name | Phase | Status | Priority | E2E | Workflow |
|----|------|-------|--------|----------|-----|----------|
| feat-add-session-management-with-server-side- | add session management with server-side tokens | Phase 3 | complete | 0 | - | PM > Dev > QC |
| feat-stripe-checkout-production-e2e | Stripe Checkout Production Verification — First Real Transaction Test | Phase 1 | complete | 0 | defined | PM > Dev > QC |
| free-pilot-no-credit-card-required | Free Pilot Onboarding — No Credit Card Required | Phase 1 | complete | 0 | defined | Dev > QC |
| feat-post-signup-dashboard-onboarding-redirect | Post-Signup Redirect to /dashboard/onboarding Wizard | Phase 1 | complete | 0 | defined | PM > Dev > QC |
| feat-aha-moment-lead-simulator | Aha Moment: Live Lead Simulator in Onboarding — First AI Response in <30s | - | complete | 0 | defined | PM > Dev > QC |
| UC-AUTH-FIX-001 | Implement Authentication Flow - Signup/Login | Phase 3 | complete | 0 | - | PM > Design > Dev > QC |
| feat-add-auth-middleware-to-protect-dashboard | add auth middleware to protect dashboard and settings routes | Phase 3 | complete | 0 | - | PM > Dev > QC |
| feat-admin-pilot-invite-flow | Admin Pilot Invite Flow — Direct Recruitment by Stojan | Phase 1 | complete | 0 | - | PM > Dev > QC |
| fix-trial-signup-redirects-to-nonexistent-onboarding-page | Fix trial signup redirect to non-existent /dashboard/onboarding page | mvp | complete | 0 | - | PM > Dev > QC |
| UC-LANDING-MARKETING-001 | Marketing Landing Page — High-Converting Signup Flow | Phase 3 | complete | 0 | defined | PM > Marketing > Design > Dev > QC |
| UC-REVENUE-RECOVERY-001 | Revenue Recovery — Close MRR Gap | Phase 3 | complete | 0 | defined | PM > Dev > Marketing > QC |
| fix-remaining-agents-table-references | Fix remaining from(agents) table references — 15 routes still query wrong table | - | complete | 0 | - | Dev > QC |
| feat-add-login-page-with-email-and-password | add login page with email and password | Phase 3 | complete | 0 | - | PM > Dev > QC |
| UC-BILLING-FIX-001 | Fix Billing Integration - Agent Not Found Error | Phase 3 | complete | 0 | - | PM > Dev > QC |
| fix-onboarding-500-error | Fix Onboarding Endpoint - Resolve Agents Table Schema Collision | Phase 3 | complete | 0 | - | Dev > QC |
| implement-twilio-sms-integration | Implement Real Twilio SMS Integration - Replace Mock | Phase 1 | complete | 0 | defined | Dev > QC |
| feat-self-serve-stripe-checkout | Self-Serve Stripe Checkout — In-Dashboard Upgrade Flow | Phase 1 | complete | 0 | - | PM > Dev > QC |
| feat-onboarding-completion-telemetry | Onboarding Completion Telemetry — Know Exactly Where Real Agents Drop Off | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| fix-smsanalyticscards-component-imported-but-never-ren | SmsAnalyticsCards component imported but never rendered in dashboard | - | complete | 1 | - | Dev > QC |
| fix-fixed-satisfaction-ping-route-was-using-agents-tab | Fixed: satisfaction-ping route was using agents table instead of real_estate_agents | - | complete | 1 | - | Dev > QC |
| fix-triage-the-get-free-playbook-section | PM triage: In the "Get free playbook" section, the text field for name cuts off the text, and the buttons are going out  | - | complete | 1 | - | Dev > QC |
| fix-lib-onboarding-telemetry-js-does-not-exist | lib/onboarding-telemetry.js does not exist | - | needs_merge | 1 | - | Dev > QC |
| fix-api-api-lead-capture-returns-500-db-schema-migrati | API /api/lead-capture returns 500 — DB schema migration not run | - | complete | 1 | - | Dev > QC |
| fix-primary-signup-api-api-agents-onboard-does-not-cap | Primary signup API (/api/agents/onboard) does not capture or write UTM parameters | - | complete | 1 | - | Dev > QC |
| UC-9 | Customer Sign-Up Flow | Phase 3 | complete | 1 | defined | PM > Design > Dev > QC |
| fix-trial-start-route-ts-redirects-to-onboarding-which | trial/start/route.ts redirects to /onboarding which blocks authenticated users | - | complete | 1 | - | Dev > QC |
| fix-distribution-loop-migration-and-dedup | Fix Distribution Loop — Apply Migration 006, Migrate to Direct PG, Add Dedup Guards | - | ready | 1 | - | PM > Dev > QC |
| fix-no-self-serve-upgrade-path-from-pilot-to-paid | No self-serve upgrade path from pilot to paid | - | complete | 1 | - | Dev > QC |
| fix-pilot-signup-route-ts-still-redirects-to-dashboard | pilot-signup/route.ts still redirects to /dashboard/onboarding (2 occurrences) | - | complete | 1 | - | Dev > QC |
| fix-distribution-loop-dedup | Fix distribution-collector loop: add deduplication and schema guard | - | complete | 1 | defined | Dev > QC |
| fix-production-cron-endpoint-returns-error-on-sequence | Production cron endpoint returns error on sequences query | - | complete | 1 | - | Dev > QC |
| fix-product-spec-selfserve-frictionless-onboarding | Product Spec: Self-Serve Frictionless Onboarding Flow | - | complete | 1 | - | Dev > QC |
| fix-test-gateway-path | test gateway path | - | complete | 1 | - | Dev > QC |
| UC-2 | FUB New Lead Auto-SMS | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| UC-1 | Lead-Initiated SMS | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| fix-db-migration-incomplete-email-verification-tokens- | DB migration incomplete: email_verification_tokens table does not exist | - | complete | 1 | - | Dev > QC |
| uc-smoke-loop-dedup | Smoke Test Loop Deduplication | engine | complete | 1 | defined | PM > Dev > QC |
| fix-signup-creates-customer-record-but-login | signup creates customer record but login queries agents table - auth flow is broken because signup and login use different database tables and password is never collected during signup | - | complete | 1 | - | Dev > QC |
| fix-webhook-lead-persistence | Fix Webhook Lead Persistence - Store Leads in Supabase | Phase 1 | complete | 1 | - | Dev > QC |
| fix-get-api-internal-pilot-usage-endpoint-does-not-exi | GET /api/internal/pilot-usage endpoint does not exist | - | complete | 1 | - | Dev > QC |
| fix-ga4-script-tag-missing-from-layout-tsx-all-analyti | GA4 script tag missing from layout.tsx — all analytics events are no-ops | - | complete | 1 | - | Dev > QC |
| fix-pilot-signups-database-table-missing | pilot_signups database table missing | - | complete | 1 | - | Dev > QC |
| fix-auth-routes-dead-supabase-env-vars | Fix 23 API routes using dead Supabase env vars — login/auth/billing all broken on Vercel | - | complete | 1 | - | Dev > QC |
| fix-bcrypt-password-verify-fails-after-signup | Fix: Stored password cannot be verified after account creation (bcrypt compareSync returns false) | - | complete | 1 | - | Dev > QC |
| fix-smoke-auth-signup-login-loop | Fix Smoke Test Loop — Auth signup then login | - | complete | 1 | - | Dev > QC |
| fix-unify-auth-cookies | fix-unify-auth-cookies | - | complete | 1 | - | Dev > QC |
| genome-phase1b-error-propagation | Genome Phase 1B: Error propagation — stop swallowing errors | - | complete | 1 | - | Dev > QC |
| fix-api-lead-capture-endpoint-returns-db-error-in-prod | /api/lead-capture endpoint returns DB error in production | - | complete | 1 | pass | Dev > QC |
| fix-trial-signup-redirects-to-non-existent-route-dashb | Trial signup redirects to non-existent route /dashboard/onboarding | - | complete | 1 | - | Dev > QC |
| fix-signup-plan-options-not-displayed | Signup page shows Choose Your Plan but no plan options are listed | - | complete | 1 | defined | Dev > QC |
| genome-phase1a-observability | Genome Phase 1A: Observability — make all failures visible | - | complete | 1 | - | Dev > QC |
| fix-marketing-landing-page-not-deployed-to-production | Marketing landing page not deployed to production | - | complete | 1 | - | Dev > QC |
| fix-first-session-sample-leads-fr-4-not-implemented | First-session sample leads (FR-4) not implemented | - | complete | 1 | - | Dev > QC |
| fix-remaining-from-agents-refs-satisfaction-debug | Fix remaining from(agents) references in satisfaction and debug routes | - | complete | 1 | - | Dev > QC |
| fix-no-feedback-button-in-dashboard-us-2-completely-ab | No Feedback button in dashboard — US-2 completely absent | - | complete | 1 | - | Dev > QC |
| fix-landing-page-has-no-pricing-section | Landing page has NO pricing section | - | complete | 1 | - | Dev > QC |
| fix-triage-the-simple-transparent-section-the | PM triage: In the Simple transparent section, the 3 tiers of pricing "Starter — Free pilot
Pro — Most popular
Team — 5 a | - | complete | 1 | - | Dev > QC |
| fix-resend-api-key-not-configured-in-vercel-email-deli | RESEND_API_KEY not configured in Vercel — email delivery will not work | - | complete | 1 | - | Dev > QC |
| fix-e2e-test-confirms-implementation-gaps | E2E test confirms implementation gaps | - | complete | 1 | - | Dev > QC |
| genome-phase1c-testing | Genome Phase 1C: Testing — automated tests for genome core | - | complete | 1 | - | Dev > QC |
| fix-api-health-endpoint-wrong-table | Fix /api/health endpoint — queries wrong table (agents vs real_estate_agents) | - | complete | 1 | - | Dev > QC |
| feat-demo-without-signup | Live AI Demo — Experience the Product Without Signing Up | Phase 1 | complete | 1 | - | PM > Design > Dev > QC |
| fix-trial-signup-route-ts-still-redirects-to-dashboard | trial-signup/route.ts still redirects to /dashboard/onboarding | - | complete | 1 | - | Dev > QC |
| fix-bookings-table-does-not-exist-booking-conversion-a | bookings table does not exist — booking conversion always null | - | complete | 1 | - | Dev > QC |
| fix-column-name-mismatch-in-webhook-handler | Column name mismatch in webhook handler | - | complete | 1 | - | Dev > QC |
| UC-ONBOARDING-MOBILE-FIRST | Mobile-First Onboarding Redesign — Fix 86% Drop-Off | stabilization | complete | 1 | - | PM > Dev > QC |
| fix-madzunkov-hotmail-com-is-locked-out-email-verified | madzunkov@hotmail.com is locked out — email_verified=false, no way to verify | - | complete | 1 | - | Dev > QC |
| fix-touchsession-middleware-not-implemented-no-session | touchSession() middleware not implemented — no session heartbeat | - | complete | 1 | - | Dev > QC |
| fix-start-free-trial-cta-missing-from-landing-page-3-p | Start Free Trial CTA missing from landing page — 3 placements not implemented | - | complete | 1 | - | Dev > QC |
| feat-pilot-conversion-email-sequence | Pilot-to-Paid Conversion Email Sequence | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| UC-EMAIL-DELIVERY-FIX | Fix Email Delivery Pipeline — Verify <30s | stabilization | complete | 1 | - | PM > Dev > QC |
| uc-dashboard-trial-countdown | Dashboard: Trial Expiration Countdown & Upgrade CTA | Phase 3 | complete | 1 | - | PM > Dev > QC |
| uc-revenue-alert-idempotency | Revenue Alert Idempotency & Loop Prevention | ready | complete | 1 | - | PM > Dev > QC |
| uc-first-paid-customer-proof | Critical: Get First Trial User to Paid (Proof of Concept) | Phase 3 | complete | 1 | - | PM > Dev > QC |
| uc-trial-email-sequence-activate | Activate Pilot-to-Paid Email Sequence for Trial Users | Phase 3 | complete | 1 | - | PM > Dev > QC |
| uc-pricing-page-conversion-refresh | Pricing Page: Testimonials + Feature Comparison + Urgency | Phase 3 | complete | 1 | - | PM > Dev > QC |
| fix-pricing-page-shows-prices-10x-higher-than-pmf-md-s | /pricing page shows prices 10x higher than PMF.md strategy | - | complete | 1 | - | Dev > QC |
| fix-api-endpoint-queries-non-existent-agent-id-column- | API endpoint queries non-existent "agent_id" column on messages table | - | complete | 1 | - | Dev > QC |
| UC-ACCOUNT-TYPE-FILTER | Isolate Real Agents from Test Accounts | stabilization | complete | 1 | - | PM > Dev > QC |
| uc-revenue-alert-dedup | Fix: Revenue Alert Deduplication | Phase 1 | ready | 1 | defined | PM > Dev > QC |
| uc-fix-loop-detector-cooldown | Fix Loop Detector Cooldown + Apply Migration 006 | now | needs_merge | 1 | - | Dev > QC |
| uc-distribution-loop-fix | Fix Distribution Health Check Loop | planning | needs_merge | 1 | - | PM > Dev > QC |
| uc-distribution-loop-dedup | Distribution Loop Dedup — Stop Recurring Duplicate Task Creation | infrastructure | needs_merge | 1 | - | PM > Dev > QC |
| fix-simulator-tsx-step-component-does-not-exist | simulator.tsx step component does not exist | - | complete | 1 | - | Dev > QC |
| uc-distribution-loop-migration-fix | Fix: Apply migration 006 to local PG — stop distribution loop | - | complete | 1 | - | PM > Dev > QC |
| fix-fix-not-implemented-23-api-routes-still-query-wron | Fix NOT implemented — 23 API routes still query wrong table (agents vs real_estate_agents) | - | complete | 1 | - | Dev > QC |
| uc-revenue-recovery-critical-2026-03-31 | Revenue Recovery — Critical Path to First $20K MRR | Phase 1 | ready | 1 | - | PM > Dev > QC |
| UC-FIX-DISTRIBUTION-LOOP-001 | Fix Distribution Health Check Infinite Loop | - | needs_merge | 1 | - | Dev |
| fix-page-tsx-not-updated-simulator-step-not-wired-into | page.tsx not updated — simulator step not wired into wizard | - | complete | 1 | - | Dev > QC |
| fix-test-genome-separation | test genome separation | - | complete | 1 | - | Dev > QC |
| feat-post-signup-redirect-to-dashboard-onboarding | Post-Signup Redirect to /dashboard/onboarding | - | complete | 1 | defined | Dev > QC |
| uc-fix-revenue-alert-loop | Fix Revenue Alert Loop Handler | - | complete | 1 | - | PM > Dev > QC |
| fix-pilot-recruitment-blocked-2-action-items-waiting-s | Pilot recruitment blocked — 2 action items WAITING since Feb 25 with no response | - | complete | 1 | - | Dev > QC |
| fix-session-logging-not-integrated-into-login-flow | Session logging not integrated into login flow | - | complete | 1 | - | Dev > QC |
| fix-api-endpoint-uses-non-existent-column-status-inste | API endpoint uses non-existent column "status" instead of "twilio_status" | - | complete | 1 | - | Dev > QC |
| uc-first-agent-activation-test | First Agent Onboarding — Validate Product Stickiness | Phase 3 | complete | 1 | - | PM > Dev > QC |
| uc-email-verification-trial-activation | Fix Email Verification & Trial Activation — Enable Agents to Access Product | Phase 3 | ready | 1 | - | PM > Dev > QC |
| uc-stripe-checkout-end-to-end | Validate Stripe Checkout — Trial to Paid Conversion Flow | Phase 3 | ready | 1 | - | PM > Dev > QC |
| uc-marketing-campaign-launch | Launch Acquisition Campaign — Signups 10+/Day Minimum | Phase 3 | ready | 1 | - | PM > Dev > QC |
| fix-page-view-logging-not-implemented-agent-page-views | Page view logging not implemented — agent_page_views table empty | - | complete | 1 | - | Dev > QC |
| feat-landing-page-conversion-cleanup | Landing Page Conversion Cleanup — Remove API Docs, Fix Pricing, Add Social Proof | - | complete | 1 | - | PM > Dev > QC |
| UC-PILOT-DIRECT-RECRUITMENT | Direct Pilot Recruitment — 5-10 Real Agents (White-Glove) | pilot | ready | 1 | - | PM > Dev > QC |
| uc-onboarding-aha-moment-completion | Enable Onboarding Completion + Aha Moment | Phase 3 | not_started | 1 | - | PM > Dev > QC |
| fix-distribution-loop | Fix: Distribution loop — deduplicate task creation with 7-day cooldown | - | complete | 1 | - | PM > Dev > QC |
| feat-transactional-email-resend | Transactional Email Delivery via Resend — Activate the Signup Funnel | - | complete | 1 | - | Dev > QC |
| fix-distribution-channels-table-missing-from-local-pos | distribution_channels table missing from local PostgreSQL | - | complete | 1 | - | Dev > QC |
| fix-three-consecutive-vercel-builds-failing-fix-never- | Three consecutive Vercel builds failing — fix never reached production | - | complete | 1 | - | Dev > QC |
| fix-start-free-trial-cta-feature-not-integrated-into-l | Start Free Trial CTA feature not integrated into landing page | - | complete | 1 | - | Dev > QC |
| fix-schema-column-mismatch-satisfaction-ping-enabled-n | Schema column mismatch: satisfaction_ping_enabled not in real_estate_agents table | - | complete | 1 | - | Dev > QC |
| fix-loop-handler-distribution-dedup | Fix: Distribution loop — dedup guard + UC completion gate + loop detector cooldown | - | complete | 1 | - | PM > Dev > QC |
| uc-revenue-pilot-recruitment | Pilot Recruitment Campaign Launch | stabilization | ready | 1 | - | PM > Dev > QC |
| fix-nps-api-routes-api-nps-verify-and-api-nps-submit-r | NPS API routes /api/nps/verify and /api/nps/submit return 404 | - | complete | 1 | - | Dev > QC |
| fix-admin-nps-page-does-not-exist-us-3-pm-dashboard-ab | /admin/nps page does not exist — US-3 PM dashboard absent | - | complete | 1 | - | Dev > QC |
| feat-agent-referral-program | Agent Referral Program — Viral Growth via Word-of-Mouth | Phase 2 | not_started | 1 | - | PM > Dev > QC |
| feat-weekly-performance-email | Weekly AI Performance Report — Prove ROI, Drive Upgrades | Phase 2 | not_started | 1 | - | PM > Dev > QC |
| fix-table-reference-mismatch-in-webhook-handler | Table reference mismatch in webhook handler | - | complete | 1 | - | Dev > QC |
| feat-supabase-to-postgrest-migration | Complete Supabase→PostgREST migration in dashboard API routes | - | complete | 1 | - | Dev > QC |
| fix-signup-onboarding-email-check-queries-wrong-table- | Signup/onboarding email check queries wrong table — always returns available regardless of registrations | - | complete | 1 | - | Dev > QC |
| fix-stripe-webhook-updates-orchestration-agents-table- | Stripe webhook updates orchestration agents table instead of real estate agent records | - | complete | 1 | - | Dev > QC |
| uc-trial-to-paid-conversion-path | Implement Trial-to-Paid Conversion Path | Phase 3 | not_started | 1 | - | PM > Dev > QC |
| fix-stripe-price-ids-are-placeholder-values-not-real-s | Stripe price IDs are placeholder values, not real Stripe IDs | - | complete | 1 | - | Dev > QC |
| fix-production-build-fails-typescript-error-in-trial-s | Production build fails: TypeScript error in trial-signup route | - | complete | 1 | - | Dev > QC |
| fix-triage-there-are-join-the-pilot | PM triage: There are "Join the Pilot - It's Free" and "Get Started Free" options on the landing page. This needs to be r | - | complete | 1 | - | Dev > QC |
| feat-frictionless-demo-no-fub | Frictionless Demo Mode — See AI Respond in 60 Seconds (No FUB Required) | Phase 1 | not_started | 1 | - | PM > Dev > QC |
| fix-dashboard-routes-are-publicly-accessible | dashboard routes are publicly accessible with no auth protection | - | complete | 1 | - | Dev > QC |
| fix-migration-012-not-applied-to-supabase-all-telemetr | Migration 012 not applied to Supabase — all telemetry tables/views missing | - | complete | 1 | - | Dev > QC |
| fix-landing-page-has-no-links-to-signup-or-o | landing page has no links to signup or onboarding pages | - | complete | 1 | - | Dev > QC |
| UC-PILOT-WHITE-GLOVE | White-Glove Pilot Onboarding Support | pilot | ready | 1 | - | PM > Dev > QC |
| uc-revenue-funnel-diagnostics | Funnel Diagnostics — Trial Activation Analysis | stabilization | ready | 1 | - | PM > Dev > QC |
| fix-signup-form-layout-inconsistency | Fix Signup Form Layout — Match Login Field Orientation | - | complete | 1 | - | Dev > QC |
| uc-revenue-pricing-clarity | Pricing Clarity for Trial Users | stabilization | ready | 1 | - | PM > Dev > QC |
| uc-revenue-aha-moment | Trial Aha Moment — AI Response by Day 3 | stabilization | ready | 1 | - | PM > Dev > QC |
| uc-revenue-checkout-friction | Frictionless Stripe Checkout E2E | stabilization | ready | 1 | - | PM > Dev > QC |
| fix-signup-page-has-no-link-back-to-login-an | signup page has no link back to login and no login page exists | - | complete | 1 | - | Dev > QC |
| fix-email-delivery-non-functional-resend-api-key-not-s | Email delivery non-functional - RESEND_API_KEY not set in Vercel | - | complete | 1 | - | Dev > QC |
| fix-loop-detector-uses-status-only-dedup-instead-of-24 | Loop detector uses status-only dedup instead of 24h time window | - | complete | 1 | - | Dev > QC |
| UC-5 | Lead Opt-Out | Phase 1 | complete | 1 | pass | PM > Dev > QC |
| fix-resend-api-key-not-set-in-vercel-email-delivery-no | RESEND_API_KEY not set in Vercel — email delivery non-functional | - | complete | 1 | - | Dev > QC |
| uc-revenue-email-sequence | Active Trial Conversion Email Sequence | stabilization | ready | 1 | - | PM > Dev > QC |
| uc-landing-page-revenue-optimization | Optimize Landing Page for Acquisition & Conversion | Phase 3 | not_started | 1 | - | PM > Design > Dev > QC |
| uc-revenue-countdown-widget | Trial Countdown Widget & Urgency | stabilization | ready | 1 | - | PM > Dev > QC |
| fix-stripe-webhook-secret-not-set-in-vercel-production | STRIPE_WEBHOOK_SECRET not set in Vercel production | - | complete | 1 | - | Dev > QC |
| fix-api-lead-capture-still-returns-500-in-production | /api/lead-capture still returns 500 in production | - | complete | 1 | - | Dev > QC |
| fix-status | status | - | complete | 1 | - | Dev > QC |
| fix-post-login-onboarding-wizard-fub-sms-aha-is-stuck- | Post-login onboarding wizard (FUB/SMS/aha) is STUCK and never auto-triggers | - | complete | 1 | - | Dev > QC |
| feat-post-login-onboarding-wizard | Post-Login Onboarding Wizard for New Agents | - | complete | 1 | defined | PM > Marketing > Design > Dev > QC |
| fix-aha-moment-lead-simulator-not-implemented-not-star | Aha moment lead simulator not implemented (not_started at day 22) | - | complete | 1 | - | Dev > QC |
| fix-api-queries-wrong-table-sms-stats-endpoint-returns | API queries wrong table — sms-stats endpoint returns 500 | - | complete | 1 | - | Dev > QC |
| fix-deployed-pages-not-registered-in-system- | Auto-Sync Deployed Vercel Pages to System Components | - | complete | 1 | pass | Dev > QC |
| fix-stripe-secret-key-not-set-in-vercel-production | STRIPE_SECRET_KEY not set in Vercel production | - | complete | 1 | - | Dev > QC |
| fix-smoke-auth-dashboard-not-deployed | Deploy Next.js Dashboard to resolve Auth smoke failures | pilot | not_started | 1 | - | PM > Dev > QC |
| feat-frictionless-onboarding-flow | Self-Serve Frictionless Onboarding Flow | - | complete | 1 | defined | PM > Marketing > Design > Dev > QC |
| fix-triage-108-stuck-ucs-determine-which | PM: Triage 108 stuck UCs — determine which are still needed | - | complete | 1 | - | Dev > QC |
| UC-10 | Billing Portal | Phase 3 | complete | 1 | defined | PM > Design > Dev > QC |
| UC-11 | Subscription Lifecycle | Phase 3 | complete | 1 | defined | PM > Dev > QC |
| fix-failing-test-suite | Fix 90 failing tests blocking CI pipeline | - | complete | 1 | - | Dev > QC |
| fix-createstuckalerts-not-wired-into-heartbeat | createStuckAlerts() not wired into heartbeat | - | complete | 1 | - | Dev > QC |
| fix-pricing-page-checkout-buttons-do-nothing | Pricing page checkout buttons do nothing | - | complete | 1 | - | Dev > QC |
| fix-mrr-is-0-no-paying-customers-despite-all-technical | MRR is $0 — no paying customers despite all technical blockers being resolved | - | complete | 1 | - | Dev > QC |
| fix-stripe-webhook-secret-missing-from-vercel-leadflow | STRIPE_WEBHOOK_SECRET missing from Vercel leadflow-ai project | - | complete | 1 | - | Dev > QC |
| UC-3 | FUB Status Change | Phase 1 | complete | 1 | defined | PM > Dev > QC |
| fix-stripe-secret-key-missing-from-vercel-leadflow-ai- | STRIPE_SECRET_KEY missing from Vercel leadflow-ai project | - | complete | 1 | - | Dev > QC |
| fix-uc-completion-gate-missing-in-checkdistributionhea | UC completion gate missing in checkDistributionHealth() | - | complete | 2 | - | Dev > QC |
| fix-api-accepts-agent-id-as-query-parameter-instead-of | API accepts agent_id as query parameter instead of reading from session | - | complete | 2 | - | Dev > QC |
| fix-trial-period-set-to-30-days-prd-specifies-14-days | Trial period set to 30 days — PRD specifies 14 days | - | complete | 2 | - | Dev > QC |
| improve-landing-page-analytics-ga4 | Landing Page Analytics — GA4/PostHog for CTA Clicks, Scroll Depth & Conversion Funnel | - | complete | 2 | defined | PM > Dev > QC |
| fix-how-it-works-section-not-implemented | How It Works section not implemented | - | complete | 2 | - | Dev > QC |
| fix-pilot-pricing-decision-implemented-as-uc-spec | Pilot pricing decision implemented as UC spec | - | complete | 2 | - | Dev > QC |
| fix-ga4-property-and-vercel-env-var-setup-required | GA4 property and Vercel env var setup required | - | complete | 2 | - | Dev > QC |
| fix-subscriptions-table-never-populated | Subscriptions table never populated | - | complete | 2 | - | Dev > QC |
| fix-team-tier-399-mo-missing-from-pricing-page-only-3- | Team tier ($399/mo) missing from /pricing page — only 3 tiers shown | - | complete | 2 | - | Dev > QC |
| fix-verify-stripe-webhook-secret-in-production | Verify Stripe webhook secret in production | - | complete | 2 | - | Dev > QC |
| fix-onboarding-wizard-stuck-no-aha-moment-for-new-sign | Onboarding wizard stuck - no aha moment for new signups | - | complete | 2 | - | Design > Dev > QC |
| fix-no-evidence-of-wizard-auto-trigger-implementation | No evidence of wizard auto-trigger implementation | - | complete | 2 | - | Dev > QC |
| gtm-landing-page | Landing Page | - | complete | 2 | - | PM > Marketing > Design > Dev > QC |
| improve-landing-page-pricing-4-tiers | Landing Page Pricing Section — All 4 Tiers with Feature Comparison | - | complete | 2 | defined | PM > Design > Dev > QC |
| UC-LANDING-ANALYTICS-GA4-001 | Landing Page Analytics — GA4 CTA & Conversion Tracking | - | complete | 2 | defined | PM > Design > Dev > QC |
| feat-repository-structure-convention | Repository Structure Convention for LeadFlow | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| fix-stats-bar-metrics-do-not-match-prd-specification | Stats bar metrics do not match PRD specification | - | complete | 2 | - | Dev > QC |
| fix-feature-comparison-table-absent-from-pricing-page | Feature comparison table absent from /pricing page | - | complete | 2 | - | Dev > QC |
| UC-AHA-MOMENT-DEMO | Implement Aha Moment Demo — No FUB Required | stabilization | ready | 2 | - | PM > Dev > QC |
| fix-no-sessionstorage-write-on-landing-page-load-utm-l | No sessionStorage write on landing page load — UTM lost for multi-page journeys | - | complete | 2 | - | Dev > QC |
| fix-dashboard-route-guard-missing-wizard-bypass-possib | Dashboard route guard missing — wizard bypass possible | - | complete | 2 | - | Dev > QC |
| feat-lead-magnet-email-capture | Lead Magnet / Email Capture on Landing Page | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| UC-LANDING-PAGE-V2 | Landing Page Redesign V2 — High-Converting Variant | growth | ready | 2 | - | PM > Dev > QC |
| fix-bookings-table-join-missing-for-cross-table-agent- | Bookings table join missing for cross-table agent scoping | - | complete | 2 | - | Dev > QC |
| improve-add-start-free-trial-cta-frictionless | Add Start Free Trial CTA — frictionless trial entry for pilot recruitment | - | complete | 2 | - | PM > Marketing > Design > Dev > QC |
| improve-landing-page-pricing-section-show-all | Landing page pricing section — show all 4 tiers with feature comparison matching PMF.md prices | - | complete | 2 | - | PM > Marketing > Design > Dev > QC |
| fix-fixed-typescript-compilation-error-in-stripe-webho | Fixed: TypeScript compilation error in stripe webhook handler | - | complete | 2 | - | Dev > QC |
| UC-8 | Follow-up Sequences | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| UC-DEPLOY-LANDING-001 | Deploy Landing Page to Vercel | Phase 3 | complete | 2 | - | Dev > QC |
| feat-add-route-discovery-smoke-test | Route Discovery Smoke Test | Phase 3 | complete | 2 | - | PM > Dev > QC |
| fix-sendsatisfactionping-never-called-from-sms-handlin | sendSatisfactionPing never called from SMS handling flow | - | complete | 2 | - | Dev > QC |
| UC-4 | FUB Agent Assignment | Phase 1 | complete | 2 | defined | PM > Dev > QC |
| gtm-content | Content Marketing Campaign | GTM | complete | 2 | - | PM > Marketing > QC |
| fix-no-analytics-tracking-implemented-ga4-utm-conversi | No analytics tracking implemented (GA4, UTM, conversion events) | - | complete | 2 | - | Dev > QC |
| fix-onboarding-page-does-not-read-utm-params-from-sess | Onboarding page does not read UTM params from sessionStorage or URL | - | complete | 2 | - | Dev > QC |
| feat-nps-agent-feedback | NPS & Feedback Survey for Agents | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| feat-lead-experience-simulator | Lead Experience Simulator & Conversation Viewer | - | complete | 2 | defined | PM > Design > Dev > QC |
| improve-UC-5-add-canada-as-an-option-for-co | Add Canada Country Option for CASL Compliance | Phase 1 | complete | 2 | - | PM > Dev > QC |
| genome-phase1e-cicd | Genome Phase 1E: CI/CD for openclaw-genome repo | - | complete | 2 | - | Dev > QC |
| genome-phase1d-decomposition | Genome Phase 1D: Decompose heartbeat-executor.js into modules | - | complete | 2 | - | Dev > QC |
| feat-leadflow-repository-restructuring | Repository restructuring | - | complete | 2 | defined | PM > Dev > QC |
| fix-prd-md-files-remain-at-docs-root-instead-of-docs-p | PRD-*.md files remain at docs/ root instead of docs/prd/ | - | complete | 2 | - | Dev > QC |
| fix-social-proof-testimonials-section-not-implemented | Social proof / testimonials section not implemented | - | complete | 2 | - | Dev > QC |
| feat-utm-capture-marketing-attribution | UTM Parameter Capture & Marketing Attribution | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| fix-dashboard-leadsatisfactioncard-uses-hardcoded-test | Dashboard LeadSatisfactionCard uses hardcoded test-agent-id | - | complete | 2 | - | Dev > QC |
| feat-session-analytics-pilot | Session Analytics — Pilot Agent Usage Tracking | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| fix-onboarding-still-present-in-auth-routes-middleware | /onboarding still present in AUTH_ROUTES (middleware.ts line 21) | - | complete | 2 | - | Dev > QC |
| improve-UC-2-add-retry-logic | Add Retry Logic to FUB New Lead Auto-SMS | Phase 1 | complete | 2 | - | PM > Dev > QC |
| fix-frontend-components-still-fall-back-to-dashboard-o | Frontend components still fall back to /dashboard/onboarding | - | complete | 2 | - | Dev > QC |
| fix-duplicate-email-error-shows-plain-text-missing-sig | Duplicate email error shows plain text — missing sign-in link | - | complete | 2 | - | Dev > QC |
| pm-action-items-dashboard | PM Structured Action Items for Dashboard | Phase 2 | complete | 2 | defined | PM |
| fix-pricing-section-shows-pilot-only-pricing-instead-o | Pricing section shows pilot-only pricing instead of 4-tier plan grid | - | complete | 2 | - | Dev > QC |
| fix-use-cases-implementation-status-marked-complete-de | use_cases.implementation_status marked complete despite fix not being applied | - | complete | 2 | - | Dev > QC |
| fix-landing-page-does-not-capture-utm-params-to-sessio | Landing page does not capture UTM params to sessionStorage | - | complete | 2 | - | Dev > QC |
| feat-sms-analytics-dashboard | SMS Analytics Dashboard — Delivery, Reply & Booking Conversion | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| feat-genome-project-structure-convention | Project Structure Convention System | - | in_progress | 2 | - | PM > Dev > QC |
| fix-signup-routes-redirect-to-setup-not-dashboard-onbo | Signup routes redirect to /setup not /dashboard/onboarding | - | complete | 2 | - | Dev > QC |
| fix-madzunkov-hotmail-com-has-plan-tier-null-account-m | madzunkov@hotmail.com has plan_tier=null — account may be broken | - | complete | 2 | - | Dev > QC |
| fix-ahacompleted-not-included-in-onboarding-submit-pay | ahaCompleted not included in onboarding submit payload — FR-8 not implemented | - | complete | 2 | - | Dev > QC |
| UC-12 | MRR Reporting | Phase 3 | complete | 2 | defined | PM > Analytics |
| feat-genome-auto-generated-docs-convention | Auto-generated docs directory convention | - | in_progress | 2 | defined | PM > Dev > QC |
| fix-fr5-stuck-alert-product-feedback-missing | FR-5: createStuckAlerts() missing product_feedback insert | Phase 1 | complete | 2 | defined | Dev > QC |
| fix-sync-system-components-js-used-wrong-column-names- | sync-system-components.js used wrong column names causing silent failure | - | complete | 2 | - | Dev > QC |
| fix-scroll-depth-tracking-not-wired-attachscrollmilest | Scroll depth tracking not wired — attachScrollMilestoneObservers never called on landing page | - | complete | 2 | - | Dev > QC |
| fix-prd-objective-not-fully-implemented-product-api-ro | PRD objective not fully implemented: product API routes still query agents table | - | complete | 2 | - | Dev > QC |
| fix-api-route-queries-wrong-table-for-satisfaction-pin | API route queries wrong table for satisfaction_ping_enabled | - | complete | 2 | - | Dev > QC |
| fix-landing-page-page-tsx-has-zero-cta-click-analytics | Landing page (page.tsx) has zero CTA click analytics — trackCTAClick never called | - | complete | 2 | - | Dev > QC |
| fix-brokerage-tier-missing-from-pricing-page | Brokerage tier missing from pricing page | - | complete | 2 | - | Design > Dev > QC |
| fix-cookie-name-mismatch-trial-start-sets-auth-token-u | Cookie name mismatch: trial/start sets auth_token (underscore) but /api/auth/me reads auth-token (hyphen) | - | complete | 2 | - | Dev > QC |
| fix-subscription-attempts-table-does-not-exist-in-supa | subscription_attempts table does not exist in Supabase | - | complete | 2 | - | Dev > QC |
| fix-missing-how-it-works-section-ac-2-fails | Missing "How It Works" section — AC-2 fails | - | complete | 2 | - | Dev > QC |
| fix-trial-duration-mismatch-landing-says-30-day-signup | Trial duration mismatch — landing says 30-day, signup says 14-day (AC-3 fails) | - | complete | 2 | - | Dev > QC |
| fix-session-analytics-tables-exist-but-lack-integratio | Session analytics tables exist but lack integration points in dashboard UI | - | complete | 2 | - | Dev > QC |
| fix-walkthrough-spec-incomplete-missing-product-signup | Walkthrough spec incomplete — missing product signup/onboarding tests | - | complete | 2 | - | Dev > QC |
| fix-api-endpoints-developer-table-embedded-in-marketin | API Endpoints developer table embedded in marketing landing page | - | complete | 2 | - | Design > Dev > QC |
| fix-from-email-env-var-has-trailing-newline-may-cause- | FROM_EMAIL env var has trailing newline — may cause Resend delivery failure | - | complete | 2 | - | Dev > QC |
| fix-middleware-blocks-authenticated-users-from-onboard | Middleware blocks authenticated users from /onboarding route | - | complete | 2 | - | Dev > QC |
| fix-no-forgot-password-flow | Forgot Password / Password Reset Flow | - | complete | 2 | - | Dev > QC |
| fix-active-sequences-not-visible-in-agent-dashboard | Active sequences not visible in agent dashboard | - | complete | 2 | - | Dev > QC |
| fix-no-active-session-logging-due-to-lack-of-end-to-en | No active session logging due to lack of end-to-end testing | - | complete | 2 | - | Dev > QC |
| UC-6 | Cal.com Booking | Phase 2 | complete | 2 | pass | PM > Dev > QC |
| fix-no-automatic-sequence-creation-on-new-lead-no-resp | No automatic sequence creation on new lead / no-response | - | complete | 2 | - | Dev > QC |
| fix-fub-webhook-registration-not-implemented | FUB webhook registration not implemented | - | complete | 2 | - | Dev > QC |
| fix-expired-trial-handling-not-implemented-ac-8 | Expired trial handling not implemented (AC-8) | - | complete | 2 | - | Dev > QC |
| fix-next-public-ga4-measurement-id-not-configured-ga4- | NEXT_PUBLIC_GA4_MEASUREMENT_ID not configured — GA4 script will not load | - | complete | 2 | - | Dev > QC |
| fix-no-in-app-nps-prompt-on-dashboard-login | No in-app NPS prompt on dashboard login | - | complete | 2 | - | Dev > QC |
| fix-sms-messages-direction-values-are-outbound-api-not | sms_messages.direction values are outbound-api not outbound | - | complete | 2 | - | Dev > QC |
| integrate-claude-ai-sms | Integrate Claude AI for SMS Response Generation | Phase 1 | complete | 2 | - | Dev > QC |
| fix-postgrest-schema-mismatches | fix-postgrest-schema-mismatches | - | complete | 2 | - | Dev > QC |
| fix-9-acceptance-criteria-defined-but-not-all-verified | 9 acceptance criteria defined but not all verified | - | complete | 2 | - | Dev > QC |
| fix-no-cron-job-or-api-endpoint-to-trigger-automated-n | No cron job or API endpoint to trigger automated NPS surveys | - | complete | 2 | - | Dev > QC |
| fix-inactivity-alerting-cron-not-implemented | Inactivity alerting cron not implemented | - | complete | 2 | - | Dev > QC |
| feat-start-free-trial-cta | Start Free Trial CTA — Frictionless Trial Entry for Pilot Recruitment | - | complete | 2 | - | PM > Design > Dev > QC |
| fix-analytics-events-table-missing-trial-funnel-tracki | analytics_events table missing — trial funnel tracking fails silently | - | complete | 2 | - | Dev > QC |
| fix-api-start-action-requires-sessionid-before-session | API start action requires sessionId before sessionId exists — chicken-and-egg | - | complete | 2 | - | Dev > QC |
| fix-lead-magnet-feature-not-merged-to-main-branch | Lead magnet feature NOT merged to main branch | - | complete | 2 | - | Dev > QC |
| fix-api-response-format-does-not-match-prd-contract | API response format does not match PRD contract | - | complete | 2 | - | Dev > QC |
| fix-api-endpoint-not-protected-by-session-middleware | API endpoint not protected by session middleware | - | complete | 2 | - | Dev > QC |
| fix-tier-naming-inconsistency-between-pricing-page-and | Tier naming inconsistency between pricing page and checkout API | - | complete | 2 | - | Dev > QC |
| fix-use-cases-implementation-status-marked-complete-bu | use_cases.implementation_status marked complete but feature is non-functional | - | complete | 2 | - | Dev > QC |
| uc-trial-user-cohort-analytics | Analytics: Trial User Cohort Tracking & Conversion Prediction | Phase 3 | complete | 2 | - | PM > Dev > QC |
| feat-lead-satisfaction-feedback | Lead Satisfaction Feedback Collection | - | complete | 2 | defined | PM > Marketing > Design > Dev > QC |
| fix-api-endpoint-has-no-authentication-middleware | API endpoint has no authentication middleware | - | complete | 2 | - | Dev > QC |
| fix-agents-table-mismatch-auth-routes | Fix agents Table Mismatch in Auth/Onboarding API Routes | - | complete | 2 | - | Dev > QC |
| fix-main-landing-page-has-no-cta-analytics-instrumenta | Main landing page (/) has no CTA analytics instrumentation | - | complete | 2 | - | Dev > QC |
| fix-no-pilot-to-paid-conversion-email-sequence | No pilot-to-paid conversion email sequence | - | complete | 2 | - | Dev > QC |
| fix-twilio-number-provisioning-not-implemented | Twilio number provisioning not implemented | - | complete | 2 | - | Dev > QC |
| fix-utm-fix-branch-not-merged-to-main-fix-undeployed | UTM fix branch not merged to main — fix undeployed | - | complete | 2 | - | Dev > QC |
| feat-email-verification-before-login | Email Verification — Confirm Inbox Before Login | - | complete | 2 | defined | PM > Design > Dev > QC |
| uc-landing-page-refresh-messaging | Landing Page: Messaging & Conversion Refresh | Phase 3 | ready | 2 | - | PM > Dev > QC |
| fix-inbound-sms-handler-does-not-classify-satisfaction | Inbound SMS handler does not classify satisfaction replies | - | complete | 2 | - | Dev > QC |
| feat-auto-sync-deployed-pages-to-system-compo | Auto-Sync Deployed Pages to System Components | Phase 3 | complete | 3 | - | PM > Dev > QC |
| UC-7 | Dashboard Manual SMS | Phase 2 | complete | 3 | pass | PM > Design > Dev > QC |
| fix-stripe-subscriptions-table | Fix: Create Subscriptions Table for Stripe Webhook Storage | - | complete | 3 | - | Dev > QC |

## Phase: Phase 3

### feat-add-session-management-with-server-side- — add session management with server-side tokens

- **PRD:** PRD-BILLING
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

### UC-AUTH-FIX-001 — Implement Authentication Flow - Signup/Login

- **PRD:** PRD-BILLING
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

### feat-add-auth-middleware-to-protect-dashboard — add auth middleware to protect dashboard and settings routes

- **PRD:** PRD-BILLING
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

### UC-LANDING-MARKETING-001 — Marketing Landing Page — High-Converting Signup Flow

- **PRD:** PRD-LANDING-MARKETING-001
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

### UC-REVENUE-RECOVERY-001 — Revenue Recovery — Close MRR Gap

- **PRD:** PRD-REVENUE-RECOVERY-001
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

### feat-add-login-page-with-email-and-password — add login page with email and password

- **PRD:** PRD-BILLING
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

### UC-BILLING-FIX-001 — Fix Billing Integration - Agent Not Found Error

- **PRD:** PRD-BILLING
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

### fix-onboarding-500-error — Fix Onboarding Endpoint - Resolve Agents Table Schema Collision

- **PRD:** PRD-ONBOARDING-500-FIX
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

- **PRD:** PRD-BILLING
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

### uc-dashboard-trial-countdown — Dashboard: Trial Expiration Countdown & Upgrade CTA

- **PRD:** prd-revenue-recovery-002
- **Status:** complete
- **Priority:** 1
- **Description:** Add persistent header in dashboard showing "Your trial expires in X days" + prominent "Upgrade to Pro" button.
- **Workflow:** PM > Dev > QC

### uc-first-paid-customer-proof — Critical: Get First Trial User to Paid (Proof of Concept)

- **PRD:** prd-revenue-recovery-002
- **Status:** complete
- **Priority:** 1
- **Description:** Manually recruit 1 pilot user to upgrade. Email offer: "Your trial was great. Here's $50 off Pro." Confirm Stripe webhook fires.
- **Workflow:** PM > Dev > QC

### uc-trial-email-sequence-activate — Activate Pilot-to-Paid Email Sequence for Trial Users

- **PRD:** prd-revenue-recovery-002
- **Status:** complete
- **Priority:** 1
- **Description:** Email sequence triggers when trial_ends_at approaches. Sends: day 10 reminder, day 13 urgency, day 14 final notice, day +1 expired notice.
- **Workflow:** PM > Dev > QC

### uc-pricing-page-conversion-refresh — Pricing Page: Testimonials + Feature Comparison + Urgency

- **PRD:** prd-revenue-recovery-002
- **Status:** complete
- **Priority:** 1
- **Description:** Add pilot user testimonials, feature comparison table, removed API docs, added "why Pro is popular" narrative.
- **Workflow:** PM > Dev > QC

### uc-first-agent-activation-test — First Agent Onboarding — Validate Product Stickiness

- **PRD:** PRD-REVENUE-ALERT-CRITICAL-MRR
- **Status:** complete
- **Priority:** 1
- **Description:** Manual test with first trial user. Confirm: login → dashboard → FUB config → test lead → SMS → aha moment in <5 min.
- **Workflow:** PM > Dev > QC

### uc-email-verification-trial-activation — Fix Email Verification & Trial Activation — Enable Agents to Access Product

- **PRD:** PRD-REVENUE-ALERT-CRITICAL-MRR
- **Status:** ready
- **Priority:** 1
- **Description:** Email verification required but broken (34% completion). Agents cannot access trial. Fix: Resend API, auto-activate trial on verification. Acceptance: Emails send, verification works, verified accounts get trial access.
- **Workflow:** PM > Dev > QC

### uc-stripe-checkout-end-to-end — Validate Stripe Checkout — Trial to Paid Conversion Flow

- **PRD:** PRD-REVENUE-ALERT-CRITICAL-MRR
- **Status:** ready
- **Priority:** 1
- **Description:** Test Stripe integration end-to-end. Payment must succeed, subscription created, agent marked paid. This unblocks revenue.
- **Workflow:** PM > Dev > QC

### uc-marketing-campaign-launch — Launch Acquisition Campaign — Signups 10+/Day Minimum

- **PRD:** PRD-REVENUE-ALERT-CRITICAL-MRR
- **Status:** ready
- **Priority:** 1
- **Description:** Activate Facebook + Reddit + FUB Marketplace + referral program. Target: 10+ signups/day, CAC <$100, conversion >2%.
- **Workflow:** PM > Dev > QC

### uc-onboarding-aha-moment-completion — Enable Onboarding Completion + Aha Moment

- **PRD:** PRD-REVENUE-RECOVERY-CRITICAL-DAY45
- **Status:** not_started
- **Priority:** 1
- **Description:** Deploy lead simulator as final onboarding step. Enable agents to see AI responding to sample lead in <30 seconds. Target: 5+ agents complete by day 52. Impact: Increases trial-to-paid conversion probability from 0% to 20-30%, potentially 2–3 paid agents → $300–600 MRR.
- **Workflow:** PM > Dev > QC

### uc-trial-to-paid-conversion-path — Implement Trial-to-Paid Conversion Path

- **PRD:** PRD-REVENUE-RECOVERY-CRITICAL-DAY45
- **Status:** not_started
- **Priority:** 1
- **Description:** Deploy trial countdown banner, email nurture sequence (day 3, 10, 13, 14), and verify Stripe checkout end-to-end. Target: 1+ paid conversion by day 59. Impact: 1 Pro agent = $149 MRR; 2–3 total = $300–600 MRR.
- **Workflow:** PM > Dev > QC

### uc-landing-page-revenue-optimization — Optimize Landing Page for Acquisition & Conversion

- **PRD:** PRD-REVENUE-RECOVERY-CRITICAL-DAY45
- **Status:** not_started
- **Priority:** 1
- **Description:** Remove API docs, add pricing transparency, fix trial messaging (14-day consistent), add social proof (testimonials, agent count). Target: 5+ signups/week and improved conversion intent by day 66. Impact: Improve signup rate from 2.5/week to 5/week → 2.5 additional agents/week → 30% conversion → 0.75 paid agents/week → 3 agents/month → ~$450/month MRR.
- **Workflow:** PM > Design > Dev > QC

### UC-10 — Billing Portal

- **PRD:** PRD-BILLING
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

- **PRD:** PRD-BILLING
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

- **PRD:** PRD-SMOKE-ROUTE-DISCOVERY-001
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

- **PRD:** PRD-BILLING
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

### uc-trial-user-cohort-analytics — Analytics: Trial User Cohort Tracking & Conversion Prediction

- **PRD:** prd-revenue-recovery-002
- **Status:** complete
- **Priority:** 2
- **Description:** Track trial user feature usage (FUB connected, SMS sent, sequences created). Identify high-intent users for sales calls.
- **Workflow:** PM > Dev > QC

### uc-landing-page-refresh-messaging — Landing Page: Messaging & Conversion Refresh

- **PRD:** PRD-REVENUE-ALERT-CRITICAL-MRR
- **Status:** ready
- **Priority:** 2
- **Description:** Value prop, social proof, CTAs, mobile, tracking, A/B test. Target: 5%+ signup conversion.
- **Workflow:** PM > Dev > QC

### feat-auto-sync-deployed-pages-to-system-compo — Auto-Sync Deployed Pages to System Components

- **PRD:** PRD-SYSTEM-SYNC-001
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

### feat-stripe-checkout-production-e2e — Stripe Checkout Production Verification — First Real Transaction Test

- **PRD:** prd-stripe-checkout-production-e2e
- **Status:** complete
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
- **Acceptance Criteria:**
  - AC-1: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and all STRIPE_PRICE_* env vars confirmed set in Vercel (not just local .env)
AC-2: Stripe Products exist for Starter ($49/mo), Professional ($149/mo), Enterprise ($399/mo) — monthly and annual — with valid Price IDs
AC-3: POST /api/billing/create-checkout with valid agentId and tier returns { sessionId, url } (HTTP 200)
AC-4: Stripe webhook at /api/webhooks/stripe receives checkout.session.completed, verifies signature, returns { received: true } (HTTP 200)
AC-5: After webhook, real_estate_agents row has plan_tier set, stripe_customer_id set, stripe_subscription_id set, status='active', mrr > 0
AC-6: POST /api/stripe/portal-session returns valid Stripe portal URL that opens without error
AC-7: Smoke test at tests/integrated/stripe-production-smoke.test.js runs on every deployment and validates checkout/webhook/portal endpoints
AC-SEC-1: /api/billing/create-checkout requires auth — caller's session must match agentId (prevents IDOR)
AC-SEC-2: Checkout endpoint validates tier is a known enum value and agentId is valid UUID format
AC-SEC-3: Rate limiting applied to checkout endpoint (max 5 req/min per IP)
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

- **PRD:** PRD-SIGNUP-AUTH-TOKEN-FIX-001
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

### feat-admin-pilot-invite-flow — Admin Pilot Invite Flow — Direct Recruitment by Stojan

- **PRD:** prd-admin-pilot-invite-flow
- **Status:** complete
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

### implement-twilio-sms-integration — Implement Real Twilio SMS Integration - Replace Mock

- **PRD:** PRD-REVENUE-RECOVERY-001
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

### feat-self-serve-stripe-checkout — Self-Serve Stripe Checkout — In-Dashboard Upgrade Flow

- **PRD:** prd-self-serve-stripe-checkout
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

### feat-onboarding-completion-telemetry — Onboarding Completion Telemetry — Know Exactly Where Real Agents Drop Off

- **PRD:** PRD-ONBOARDING-COMPLETION-TELEMETRY
- **Status:** complete
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
- **Acceptance Criteria:**
  - AC-1: onboarding_step field updated in real time as agents progress (step 0→1→2→3→4→5)
  - AC-2: onboarding_events table logs each step transition: {agent_id, step_name, status, timestamp, metadata}
  - AC-3: Step names: 'email_verified', 'fub_connected', 'phone_configured', 'sms_verified', 'aha_completed'
  - AC-4: Admin view at /admin/funnel shows real agents (exclude smoke-test emails) with current step and time-at-step
  - AC-5: Alert inserts into product_feedback if any real agent is stuck at same step for >24 hours
  - AC-6: Dashboard shows funnel conversion rates (Step N → Step N+1) per day
  - AC-7: Exclude smoke-test@* and *@leadflow-test.com emails from funnel counts
- **Workflow:** PM > Dev > QC

### UC-2 — FUB New Lead Auto-SMS

- **PRD:** PRD-CORE-SMS
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

### UC-1 — Lead-Initiated SMS

- **PRD:** PRD-CORE-SMS
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

### fix-webhook-lead-persistence — Fix Webhook Lead Persistence - Store Leads in Supabase

- **PRD:** PRD-BILLING
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

### feat-demo-without-signup — Live AI Demo — Experience the Product Without Signing Up

- **PRD:** PRD-FEAT-DEMO-WITHOUT-SIGNUP-001
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

### feat-pilot-conversion-email-sequence — Pilot-to-Paid Conversion Email Sequence

- **PRD:** prd-pilot-conversion-email-sequence
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

### uc-revenue-alert-dedup — Fix: Revenue Alert Deduplication

- **PRD:** prd-revenue-alert-dedup
- **Status:** ready
- **Priority:** 1
- **Description:** Prevent revenue collector from creating duplicate PM tasks every heartbeat. Implement deduplication check in createRevenueAlertTasks() before task creation.
- **Acceptance Criteria:**
  - AC-1: No more than 1 revenue alert task per trajectory per goal type in ready/in_progress status
  - AC-2: TaskStore.query() called before task creation
  - AC-3: All deduplication decisions logged
  - AC-4: Trajectory improvements detected and tasks closed
  - AC-5: Stale tasks escalated to priority 0 after 48h inaction
  - AC-6: Task metadata includes goal_type, trajectory, last_checked, days_remaining
- **Workflow:** PM > Dev > QC

### uc-revenue-recovery-critical-2026-03-31 — Revenue Recovery — Critical Path to First $20K MRR

- **PRD:** PRD-REVENUE-RECOVERY-CRITICAL-2026-03-31
- **Status:** ready
- **Priority:** 1
- **Description:** Execute three-phase plan to convert $0 MRR to $20K
- **Workflow:** PM > Dev > QC

### feat-frictionless-demo-no-fub — Frictionless Demo Mode — See AI Respond in 60 Seconds (No FUB Required)

- **PRD:** -
- **Status:** not_started
- **Priority:** 1
- **Description:** Current product requires FUB webhook setup (30-60 min) before agent sees AI work. Demo mode: agent enters fake lead data post-signup, AI responds in 30s, no FUB required. 3-demo limit then FUB connect CTA. Removes #1 onboarding friction; expected 2x+ improvement in activation rate.
- **Acceptance Criteria:**
  - Demo at /dashboard/demo post-signup no FUB required
  - AI response < 30 seconds
  - Response editable before send
  - 3-demo limit then FUB connect CTA
  - Funnel events tracked
- **Workflow:** PM > Dev > QC

### UC-5 — Lead Opt-Out

- **PRD:** PRD-CORE-SMS
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

### UC-3 — FUB Status Change

- **PRD:** PRD-CORE-SMS
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

- **PRD:** PRD-CORE-SMS
- **Status:** complete
- **Priority:** 2
- **Description:** Handle agent assignment changes in FUB CRM
- **Acceptance Criteria:**
  - Agent assignment webhooks processed
  - Lead ownership updated in database
  - Dashboard shows correct agent for each lead
  - Previous agent loses access if permissions restrict
- **Workflow:** PM > Dev > QC

### improve-UC-5-add-canada-as-an-option-for-co — Add Canada Country Option for CASL Compliance

- **PRD:** PRD-OPT-OUT-CA
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

- **PRD:** PRD-UC2-RETRY
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

### fix-fr5-stuck-alert-product-feedback-missing — FR-5: createStuckAlerts() missing product_feedback insert

- **PRD:** PRD-FR5-STUCK-ALERT-PRODUCT-FEEDBACK
- **Status:** complete
- **Priority:** 2
- **Description:** lib/onboarding-telemetry.js does not exist. createStuckAlerts() must insert product_feedback rows (feedback_type=ux_issue, source=telemetry_alert) when real agents are stuck >24h at same onboarding step. Five prior attempts marked DONE without creating the file.
- **Acceptance Criteria:**
  - AC-1: lib/onboarding-telemetry.js exists at exact path (verified with ls)
  - AC-2: createStuckAlerts() is exported and is a callable function
  - AC-3: product_feedback row inserted with feedback_type=ux_issue, source=telemetry_alert when agent stuck >24h
  - AC-4: Duplicate guard — same agent+step does not produce two product_feedback rows within 24h
  - AC-5: Smoke-test emails (smoke-test@*, *@leadflow-test.com) excluded from alerts
  - AC-6: createStuckAlerts() returns { inserted: N, skipped: M }
  - AC-7: Function invocable via HTTP endpoint (cron or internal API route)
- **Workflow:** Dev > QC

### integrate-claude-ai-sms — Integrate Claude AI for SMS Response Generation

- **PRD:** PRD-BILLING
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


## Phase: Unassigned

### feat-aha-moment-lead-simulator — Aha Moment: Live Lead Simulator in Onboarding — First AI Response in <30s

- **PRD:** PRD-AHA-MOMENT-SIMULATOR-UI
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

- **PRD:** PRD-FIX-REMAINING-AGENTS-TABLE
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

### fix-smsanalyticscards-component-imported-but-never-ren — SmsAnalyticsCards component imported but never rendered in dashboard

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## SmsAnalyticsCards component imported but never rendered in dashboard
**Type:** critical
**Severity:** critical
**Source:** Product review 8da6920b-9240-4990-a672-e68b29b3326d

**Details:** The main dashboard page.tsx imports SmsAnalyticsCards on line 2, but it is never called or rendered in the JSX. The component exists but is invisible to users.

**Suggested fix:** Add <SmsAnalyticsCards /> between <StatsCards /> and <LeadFeed /> in dashboard/page.tsx
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-fixed-satisfaction-ping-route-was-using-agents-tab — Fixed: satisfaction-ping route was using agents table instead of real_estate_agents

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Fixed: satisfaction-ping route was using agents table instead of real_estate_agents
**Type:** bug_fix
**Severity:** critical
**Source:** Product review 81d98c51-bff4-4ed5-8b42-256534b58f82

**Details:** The /api/agents/satisfaction-ping route (both PATCH and GET methods) was querying the old "agents" table. Updated both methods to use "real_estate_agents" table per the schema migration.

**Suggested fix:** Migration complete - all product routes now use real_estate_agents
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-triage-the-get-free-playbook-section — PM triage: In the "Get free playbook" section, the text field for name cuts off the text, and the buttons are going out 

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** PM triage: In the "Get free playbook" section, the text field for name cuts off the text, and the buttons are going out 
- **Workflow:** Dev > QC

### fix-lib-onboarding-telemetry-js-does-not-exist — lib/onboarding-telemetry.js does not exist

- **PRD:** -
- **Status:** needs_merge
- **Priority:** 1
- **Description:** ## lib/onboarding-telemetry.js does not exist
**Type:** missing_implementation
**Severity:** critical
**Source:** Product review 76c39605-5fec-487b-8d52-b0aa06e4dd32

**Details:** The file lib/onboarding-telemetry.js is completely absent from the codebase. createStuckAlerts() has never been implemented. 5 prior dev attempts have been false positives — no code was ever actually written to this file. There is no function anywhere in the codebase that inserts product_feedback rows when agents are stuck at onboarding steps >24h.

**Suggested fix:** Create lib/onboarding-telemetry.js with a createStuckAlerts() function that: (1) queries onboarding_events for agents stuck at a step for >24h, (2) inserts a product_feedback row with feedback_type=ux_issue, source=telemetry_alert, and data payload containing agent_id, step, hours_stuck. Must be called from the heartbeat cycle.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-api-lead-capture-returns-500-db-schema-migrati — API /api/lead-capture returns 500 — DB schema migration not run

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## API /api/lead-capture returns 500 — DB schema migration not run
**Type:** bug
**Severity:** critical
**Source:** Product review a4198d11-acfd-4080-8913-e81931a65a03

**Details:** The pilot_signups table is missing columns required by the lead-capture route: first_name, status, utm_source, utm_medium, utm_campaign. The upsert fails with a DB error. Additionally, there is no unique index on pilot_signups.email, so the ON CONFLICT clause for deduplication will not work correctly.

**Suggested fix:** Run migration: ALTER TABLE pilot_signups ADD COLUMN IF NOT EXISTS first_name TEXT, ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nurture', ADD COLUMN IF NOT EXISTS utm_source TEXT, ADD COLUMN IF NOT EXISTS utm_medium TEXT, ADD COLUMN IF NOT EXISTS utm_campaign TEXT; CREATE UNIQUE INDEX IF NOT EXISTS pilot_signups_email_unique ON pilot_signups(email);
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
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

### fix-distribution-loop-migration-and-dedup — Fix Distribution Loop — Apply Migration 006, Migrate to Direct PG, Add Dedup Guards

- **PRD:** PRD-DISTRIBUTION-LOOP-DEDUP-FIX
- **Status:** ready
- **Priority:** 1
- **Description:** Distribution health check (Loop 6) creates noise tasks every heartbeat. Root cause: migration 006_distribution_metrics.sql was never applied to local PostgreSQL — tables do not exist. distribution-collector.js still uses PostgREST (localhost:8787) which is no longer running. Required fixes: (1) apply migration 006, (2) seed landing page record, (3) rewrite collector to use pg.Pool with LOCAL_PG_URL, (4) add 7-day dedup guard in createDistributionTasks(), (5) add 24h cooldown in task-store.js loop detector.
- **Workflow:** PM > Dev > QC

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

### fix-distribution-loop-dedup — Fix distribution-collector loop: add deduplication and schema guard

- **PRD:** prd-distribution-loop-dedup
- **Status:** complete
- **Priority:** 1
- **Description:** distribution-collector.js creates duplicate tasks on every heartbeat. Root causes: (1) distribution_channels table missing, (2) no dedup check in createDistributionTasks, (3) completed UCs not suppressed, (4) no cooldown. Fix all four layers.
- **Workflow:** Dev > QC

### fix-production-cron-endpoint-returns-error-on-sequence — Production cron endpoint returns error on sequences query

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Production cron endpoint returns error on sequences query
**Type:** bug
**Severity:** critical
**Source:** Product review 0b0c3433-23cd-427f-9247-64df68704c2b

**Details:** GET https://leadflow-ai-five.vercel.app/api/cron/follow-up?test=true returns {"error":"Failed to fetch sequences"}. The route uses supabaseServer client but CLAUDE.md states Supabase has been fully removed (database is local PostgreSQL). Production Vercel deployment likely has stale/broken Supabase env vars causing the lead_sequences query to fail. Local DB has the lead_sequences table; Vercel environment may not.

**Suggested fix:** Verify SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL env vars in Vercel dashboard point to correct database. If using local PG via tunnel, configure Vercel env vars accordingly. Check error logs in Vercel dashboard for the specific DB connection error.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-product-spec-selfserve-frictionless-onboarding — Product Spec: Self-Serve Frictionless Onboarding Flow

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Product Spec: Self-Serve Frictionless Onboarding Flow
- **Workflow:** Dev > QC

### fix-test-gateway-path — test gateway path

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: test gateway path
- **Workflow:** Dev > QC

### fix-db-migration-incomplete-email-verification-tokens- — DB migration incomplete: email_verification_tokens table does not exist

- **PRD:** prd-email-verification-db-migration-fix
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

### fix-signup-creates-customer-record-but-login — signup creates customer record but login queries agents table - auth flow is broken because signup and login use different database tables and password is never collected during signup

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: signup creates customer record but login queries agents table - auth flow is broken because signup and login use different database tables and password is never collected during signup
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

### fix-auth-routes-dead-supabase-env-vars — Fix 23 API routes using dead Supabase env vars — login/auth/billing all broken on Vercel

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** CRITICAL: 23 API routes create their DB client with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — env vars that DO NOT EXIST on Vercel. Every route that does this returns 500 on production. Affects: login, signup, forgot-password, reset-password, billing, admin, agents, NPS, booking, integrations, lead capture, SMS, onboarding, webhooks. The fix: replace createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) with createClient(process.env.NEXT_PUBLIC_API_URL || "https://api.imagineapi.org", process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_KEY || "") in every affected route.
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

### fix-smoke-auth-signup-login-loop — Fix Smoke Test Loop — Auth signup then login

- **PRD:** prd-fix-smoke-auth-deploy-dashboard
- **Status:** complete
- **Priority:** 1
- **Description:** auth-signup-login-flow smoke test always fails (unimplemented signup_login_flow check_type in genome). Causes 7+ task spawns/2h. Fix: implement signup_login_flow in genome/health/smoke-tests.js + write lastTaskCompleted in heartbeat-executor.js.
- **Acceptance Criteria:**
  - project.config.json smoke_tests contains NO entry with check_type: signup_login_flow
  - project.config.json has id: auth-signup-login-flow with check_type: http_200 and url key
  - JSON remains valid after the change
  - Change is committed and pushed to git
  - No new Smoke: Auth: signup then login failing tasks created in next 2 heartbeat cycles
- **Workflow:** Dev > QC

### fix-unify-auth-cookies — fix-unify-auth-cookies

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** 12 API routes only check auth-token cookie (JWT from signup). Must also check leadflow_session (from login). Use lib/auth.ts getAuthUserId() helper.
- **Workflow:** Dev > QC

### genome-phase1b-error-propagation — Genome Phase 1B: Error propagation — stop swallowing errors

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Audit all ~80 try/catch blocks in heartbeat-executor.js. Classify each as fatal (rethrow), degraded (log+continue), or expected (silent). Fatal errors must abort the step and report to Telegram. Add stepOutcome tracking: each step reports success/failure/skipped. Genome review should check for steps with 0 output (silent crash = breach). Exit criteria: zero silent failures per heartbeat for 48h.
- **Workflow:** Dev > QC

### fix-api-lead-capture-endpoint-returns-db-error-in-prod — /api/lead-capture endpoint returns DB error in production

- **PRD:** PRD-FIX-LEAD-CAPTURE-PROD-ENV
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

### fix-signup-plan-options-not-displayed — Signup page shows Choose Your Plan but no plan options are listed

- **PRD:** PRD-FIX-SIGNUP-PLAN-OPTIONS-001
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

### genome-phase1a-observability — Genome Phase 1A: Observability — make all failures visible

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Replace stdio:pipe with inherit in heartbeat-wrapper.js. Add structured JSON logging to heartbeat-executor.js (timestamp, step, outcome, duration per step). Create Telegram alerts for heartbeat failure, agent crash, budget breach, stale tasks >2h. Add /genome-health REST endpoint to dashboard server. Verify every heartbeat step produces visible output. Exit criteria: all steps visible in logs, alerts fire within 5 min of failure.
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

### fix-remaining-from-agents-refs-satisfaction-debug — Fix remaining from(agents) references in satisfaction and debug routes

- **PRD:** prd-fix-signup-login-table-mismatch
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

### fix-triage-the-simple-transparent-section-the — PM triage: In the Simple transparent section, the 3 tiers of pricing "Starter — Free pilot
Pro — Most popular
Team — 5 a

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** PM triage: In the Simple transparent section, the 3 tiers of pricing "Starter — Free pilot
Pro — Most popular
Team — 5 a
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

### fix-e2e-test-confirms-implementation-gaps — E2E test confirms implementation gaps

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## E2E test confirms implementation gaps
**Type:** test_failure
**Severity:** critical
**Source:** Product review 5d82fced-c838-4ef7-8cc7-4c01124cdebb

**Details:** Test: tests/fix-start-free-trial-cta-missing.test.js shows 4 of 5 tests FAILING. Failures: (1) CTA Placement #1: TrialSignupForm compact not in hero (expected: '<TrialSignupForm compact'), (2) CTA Placement #2: Features CTA missing (expected href='/signup/trial' with 'Start Free Trial' text), (3) CTA Placement #3: Pricing CTA missing (expected 'or start free trial' text with href='/signup/trial'), (4) TrialSignupForm not imported. Only passing test: No stale /signup?mode=trial URLs remain.

**Suggested fix:** Update product/lead-response/dashboard/app/page.tsx to match test expectations. The test file is the source of truth for implementation requirements.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### genome-phase1c-testing — Genome Phase 1C: Testing — automated tests for genome core

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Write tests for: local-pg.js (select, insert, update, delete, .not(), .is(), .contains(), .in()), workflow-engine.js (selectInitialModel, classifyAreas, checkAreaContention, estimateCost), and regression tests for all bugs found 2026-03-23 (parseUTC Date objects, .not(is null) string, insert().select().single(), prepareAndQueueSpawn status, createTask model defaults). Integration test: createTask → findTaskByTitle → updateTask. Set up GitHub Actions CI on openclaw-genome repo. Exit criteria: npm test passes, >60% coverage on core/.
- **Workflow:** Dev > QC

### fix-api-health-endpoint-wrong-table — Fix /api/health endpoint — queries wrong table (agents vs real_estate_agents)

- **PRD:** PRD-FIX-API-HEALTH-ENDPOINT
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

### fix-column-name-mismatch-in-webhook-handler — Column name mismatch in webhook handler

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Column name mismatch in webhook handler
**Type:** structural_issue
**Severity:** critical
**Source:** Product review 10346cc1-f33b-4f29-b441-9365e7534de6

**Details:** Webhook handler inserts to subscription_events and payments tables using agent_id column, but migration schema defines user_id. This will cause runtime errors when webhooks are triggered. Affected lines: product/lead-response/dashboard/app/api/webhooks/stripe/route.ts lines 56, 76, 85, 103, 121, 133, 144, 160

**Suggested fix:** Replace all instances of agent_id with user_id in webhook handler inserts to subscription_events and payments tables
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-madzunkov-hotmail-com-is-locked-out-email-verified — madzunkov@hotmail.com is locked out — email_verified=false, no way to verify

- **PRD:** prd-email-verification-db-migration-fix
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

### fix-api-endpoint-queries-non-existent-agent-id-column- — API endpoint queries non-existent "agent_id" column on messages table

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## API endpoint queries non-existent "agent_id" column on messages table
**Type:** critical
**Severity:** critical
**Source:** Product review 8da6920b-9240-4990-a672-e68b29b3326d

**Details:** The endpoint tries to filter messages by agent_id (line 56), but this column does not exist on the messages table. Must join messages → leads to get agent_id. This causes immediate query failure.

**Suggested fix:** Join messages with leads table on lead_id, then filter by leads.agent_id
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-simulator-tsx-step-component-does-not-exist — simulator.tsx step component does not exist

- **PRD:** PRD-AHA-MOMENT-SIMULATOR-UI
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

### uc-distribution-loop-migration-fix — Fix: Apply migration 006 to local PG — stop distribution loop

- **PRD:** prd-fix-distribution-loop-consolidated
- **Status:** complete
- **Priority:** 1
- **Description:** Apply migration 006_distribution_metrics.sql to local PostgreSQL, seed distribution_channels with the active landing page, add dedup guard to createDistributionTasks(), and extend loop detector cooldown in task-store.js.
- **Workflow:** PM > Dev > QC

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

### UC-FIX-DISTRIBUTION-LOOP-001 — Fix Distribution Health Check Infinite Loop

- **PRD:** PRD-FIX-DISTRIBUTION-LOOP
- **Status:** needs_merge
- **Priority:** 1
- **Description:** Fix 3 bugs in Genome Loop 6: (1) missing distribution_channels table causes no_landing_page issue every heartbeat, (2) no dedup guard in createDistributionTasks(), (3) loop detector fires again on completed investigation tasks.
- **Acceptance Criteria:**
  - {"text":"No duplicate distribution tasks. No loop-detection self-loop. distribution_channels table exists."}
- **Workflow:** Dev

### fix-page-tsx-not-updated-simulator-step-not-wired-into — page.tsx not updated — simulator step not wired into wizard

- **PRD:** PRD-AHA-MOMENT-SIMULATOR-UI
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

### fix-test-genome-separation — test genome separation

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: test genome separation
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

### uc-fix-revenue-alert-loop — Fix Revenue Alert Loop Handler

- **PRD:** prd-revenue-alert-loop-root-cause
- **Status:** complete
- **Priority:** 1
- **Description:** Implement 4 fixes to prevent loop detector from creating duplicate meta-tasks: (1) Add 24h cooldown to meta-task creation, (2) Add dedup check to revenue-collector, (3) Add auto-timeout reaper for stuck tasks, (4) Guard against auth failures
- **Workflow:** PM > Dev > QC

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

### fix-api-endpoint-uses-non-existent-column-status-inste — API endpoint uses non-existent column "status" instead of "twilio_status"

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## API endpoint uses non-existent column "status" instead of "twilio_status"
**Type:** critical
**Severity:** critical
**Source:** Product review 8da6920b-9240-4990-a672-e68b29b3326d

**Details:** The /api/analytics/sms-stats endpoint queries messages.status === "delivered", but the actual column is twilio_status. This causes the delivery rate calculation to always return 0 or error.

**Suggested fix:** Change line 50 in route.ts from .eq("status", "delivered") to .eq("twilio_status", "delivered")
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

### feat-landing-page-conversion-cleanup — Landing Page Conversion Cleanup — Remove API Docs, Fix Pricing, Add Social Proof

- **PRD:** PRD-LANDING-PAGE-CONVERSION-001
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

### fix-distribution-loop — Fix: Distribution loop — deduplicate task creation with 7-day cooldown

- **PRD:** prd-distribution-loop-fix
- **Status:** complete
- **Priority:** 1
- **Description:** Distribution health check creates identical tasks every heartbeat.
- **Acceptance Criteria:**
  - No duplicate distribution tasks created within 7-day cooldown window
  - distribution_channels table has active landing_page entry after deploy
  - No new Loop detected tasks appear after fix lands
- **Workflow:** PM > Dev > QC

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

### fix-distribution-channels-table-missing-from-local-pos — distribution_channels table missing from local PostgreSQL

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## distribution_channels table missing from local PostgreSQL
**Type:** bug
**Severity:** critical
**Source:** Product review 368d7056-d0f9-44a7-94da-22c9d5c3831e

**Details:** PostgREST query to http://localhost:8787/distribution_channels returns Not found. Migration 006_distribution_metrics.sql has not been run against local PG. This causes checkDistributionHealth() to receive null on every query and trigger PM: Distribution — Create Landing Page on every heartbeat.

**Suggested fix:** Run: psql postgresql://clawdbot@localhost/openclaw -f ~/.openclaw/genome/migrations/006_distribution_metrics.sql then seed landing page record with status=active
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
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

### fix-start-free-trial-cta-feature-not-integrated-into-l — Start Free Trial CTA feature not integrated into landing page

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Start Free Trial CTA feature not integrated into landing page
**Type:** implementation_incomplete
**Severity:** critical
**Source:** Product review 5d82fced-c838-4ef7-8cc7-4c01124cdebb

**Details:** The TrialSignupForm component (trial-signup-form.tsx) exists and is well-implemented, but is NOT imported or displayed anywhere on the landing page (product/lead-response/dashboard/app/page.tsx). The feature spec requires 3 CTA placements: (1) compact form in hero section, (2) 'Start Free Trial' link at end of features section linking to /signup/trial, (3) 'or start free trial' link in pricing section linking to /signup/trial. Current landing page only shows 'Join the Pilot' (to /pilot) and 'Get Started Free' (to /onboarding) buttons.

**Suggested fix:** Import TrialSignupForm component in page.tsx: import TrialSignupForm from '@/components/trial-signup-form'. Add: (1) <TrialSignupForm compact /> in hero div after description, (2) Link with href='/signup/trial' and text 'Start Free Trial' at end of features section, (3) Link with href='/signup/trial' and text 'or start free trial' in pricing section
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-schema-column-mismatch-satisfaction-ping-enabled-n — Schema column mismatch: satisfaction_ping_enabled not in real_estate_agents table

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Schema column mismatch: satisfaction_ping_enabled not in real_estate_agents table
**Type:** schema_mismatch
**Severity:** critical
**Source:** Product review e5b46c19-a23e-4894-8e20-13e5e54d72b8

**Details:** Migration 008 adds satisfaction_ping_enabled to agents table (orchestrator) instead of real_estate_agents (customers). Code correctly queries real_estate_agents but column does not exist. Runtime failures will occur in PATCH /api/agents/satisfaction-ping and GET /api/satisfaction/stats.

**Suggested fix:** Create migration 009 to add satisfaction_ping_enabled to real_estate_agents and fix FK in lead_satisfaction_events
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-loop-handler-distribution-dedup — Fix: Distribution loop — dedup guard + UC completion gate + loop detector cooldown

- **PRD:** prd-distribution-loop-wave8
- **Status:** complete
- **Priority:** 1
- **Description:** Stop the recurring distribution loop by: (1) adding UC completion gate in distribution-collector.js to skip issues where UC is already complete, (2) adding 30-min task cooldown in createDistributionTasks(), (3) replacing status-based dedup with timestamp-based dedup in task-store.js loop detector.
- **Workflow:** PM > Dev > QC

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

### fix-table-reference-mismatch-in-webhook-handler — Table reference mismatch in webhook handler

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Table reference mismatch in webhook handler
**Type:** structural_issue
**Severity:** critical
**Source:** Product review 10346cc1-f33b-4f29-b441-9365e7534de6

**Details:** Webhook handler attempts to update real_estate_agents table, which does not exist. The correct table name is agents. This affects all subscription-related updates. Affected lines: 47, 113, 150 in route.ts

**Suggested fix:** Replace all .from('real_estate_agents') with .from('agents') in webhook handler
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-supabase-to-postgrest-migration — Complete Supabase→PostgREST migration in dashboard API routes

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** 65 API route files still import @supabase/supabase-js. All must be migrated to use lib/db.ts (PostgREST client). Causes 500 errors on Vercel.
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

### fix-stripe-price-ids-are-placeholder-values-not-real-s — Stripe price IDs are placeholder values, not real Stripe IDs

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Stripe price IDs are placeholder values, not real Stripe IDs
**Type:** placeholder_config
**Severity:** critical
**Source:** Product review 6e578fe1-5937-44c2-a27c-cfd3508bee00

**Details:** Vercel production has NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY=price_starter_49, NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_pro_149, NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY=price_team_399. These are placeholder strings, not real Stripe price IDs (which look like price_1AbCDEFGHIJKL). Additionally, the checkout API uses server-side env vars (STRIPE_PRICE_STARTER_MONTHLY, STRIPE_PRICE_PROFESSIONAL_MONTHLY) which are not set at all — only the NEXT_PUBLIC_ versions exist. This means even after adding the secret key, checkout sessions will fail with Stripe API errors.

**Suggested fix:** Create Stripe products and prices in the Stripe Dashboard (or via CLI). Update Vercel env vars with real price IDs. Fix env var naming: create server-side STRIPE_PRICE_STARTER_MONTHLY, STRIPE_PRICE_PROFESSIONAL_MONTHLY, STRIPE_PRICE_ENTERPRISE_MONTHLY (matching what create-checkout/route.ts expects).
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-production-build-fails-typescript-error-in-trial-s — Production build fails: TypeScript error in trial-signup route

- **PRD:** PRD-TRIAL-SIGNUP-TSC-BUILD-BLOCKER
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

### fix-triage-there-are-join-the-pilot — PM triage: There are "Join the Pilot - It's Free" and "Get Started Free" options on the landing page. This needs to be r

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** PM triage: There are "Join the Pilot - It's Free" and "Get Started Free" options on the landing page. This needs to be r
- **Workflow:** Dev > QC

### fix-dashboard-routes-are-publicly-accessible — dashboard routes are publicly accessible with no auth protection

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: dashboard routes are publicly accessible with no auth protection
- **Workflow:** Dev > QC

### fix-migration-012-not-applied-to-supabase-all-telemetr — Migration 012 not applied to Supabase — all telemetry tables/views missing

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Migration 012 not applied to Supabase — all telemetry tables/views missing
**Type:** bug
**Severity:** critical
**Source:** Product review e563f19b-9d8a-45a5-8086-3e7475545ec2

**Details:** Migration file 012_onboarding_completion_telemetry.sql exists and is complete, but has NOT been applied to the Supabase database. Missing: onboarding_events table, funnel_real_agents view, funnel_conversion_rates view, onboarding_stuck_alerts table, last_onboarding_step_update column on real_estate_agents, is_smoke_test_account function. Every functional requirement (FR-1 through FR-7) fails at runtime because the database schema is absent. /admin/funnel returns API errors, event logging fails, stuck-agent alerts cannot fire.

**Suggested fix:** Apply migration: psql  -f product/lead-response/dashboard/supabase/migrations/012_onboarding_completion_telemetry.sql. Then verify all tables/views exist, smoke-test with a test agent, and redeploy dashboard to Vercel.
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

### fix-signup-form-layout-inconsistency — Fix Signup Form Layout — Match Login Field Orientation

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** On the signup page, the email and password fields render small and horizontally (side-by-side). On the login page, the same fields render full-width and vertically stacked — the correct, readable layout. This visual inconsistency breaks the perceived quality of the auth flow and confuses users who move between the two pages. The fix: update the signup form to use the same vertical, full-width field layout as the login page. No functional changes — purely CSS/layout alignment. Files to check: product/lead-response/dashboard/app/signup/page.tsx (and any sub-components like TrialSignupForm), compared against product/lead-response/dashboard/app/login/page.tsx.
- **Workflow:** Dev > QC

### fix-signup-page-has-no-link-back-to-login-an — signup page has no link back to login and no login page exists

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: signup page has no link back to login and no login page exists
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

### fix-loop-detector-uses-status-only-dedup-instead-of-24 — Loop detector uses status-only dedup instead of 24h time window

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Loop detector uses status-only dedup instead of 24h time window
**Type:** bug
**Severity:** critical
**Source:** Product review 368d7056-d0f9-44a7-94da-22c9d5c3831e

**Details:** In ~/.openclaw/genome/core/task-store.js line 147, the investigation task dedup uses .not(status, in, done/failed/cancelled). Once investigation task completes, dedup fails and a new one is created next heartbeat. Fix: replace with .gte(created_at, 24h-ago) time window check.

**Suggested fix:** In task-store.js ~line 147, replace .not(status) check with .gte(created_at, new Date(Date.now() - 24*60*60*1000).toISOString())
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

### fix-stripe-webhook-secret-not-set-in-vercel-production — STRIPE_WEBHOOK_SECRET not set in Vercel production

- **PRD:** prd-fix-stripe-env-vars-vercel
- **Status:** complete
- **Priority:** 1
- **Description:** ## STRIPE_WEBHOOK_SECRET not set in Vercel production
**Type:** missing_config
**Severity:** critical
**Source:** Product review 6e578fe1-5937-44c2-a27c-cfd3508bee00

**Details:** Webhook handler at /api/webhooks/stripe requires STRIPE_WEBHOOK_SECRET to verify Stripe event signatures. The variable is absent from Vercel production env. Even if STRIPE_SECRET_KEY is added, all webhook events will fail signature verification (or be processed unsigned, creating a security vulnerability).

**Suggested fix:** In Stripe Dashboard → Webhooks, create an endpoint pointing to https://leadflow-ai-five.vercel.app/api/webhooks/stripe. Copy the signing secret (whsec_...) and add it as STRIPE_WEBHOOK_SECRET in Vercel.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Acceptance Criteria:**
  - STRIPE_WEBHOOK_SECRET is set in Vercel production environment (whsec_...)
  - POST /api/webhooks/stripe does NOT return {"error":"Stripe not configured"} (HTTP 503)
  - Stripe webhook endpoint is registered in Stripe Dashboard pointing to production URL
  - After a test transaction, agent subscription status updates in Supabase agents table
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

### fix-status — status

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** Quick fix: status
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

### feat-post-login-onboarding-wizard — Post-Login Onboarding Wizard for New Agents

- **PRD:** PRD-ONBOARDING-WIZARD-001
- **Status:** complete
- **Priority:** 1
- **Description:** Guided setup wizard shown to new agents after first login. Walks through 3 steps: (1) Connect FUB integration via API key + webhook registration, (2) Configure Twilio phone number (provision new or enter existing), (3) Verify SMS by sending a test message to agent mobile. Wizard state persisted per agent; skipped steps accessible later in Settings -> Integrations.
- **Acceptance Criteria:**
  - ["Wizard auto-triggers on first login if onboarding_completed = false","Wizard does NOT re-trigger for agents with onboarding_completed = true","Step 1: FUB API key validation is a real live call to FUB API","Step 1: On success, webhook URL is auto-registered in FUB","Step 2: Agent can provision a new Twilio number by area code","Step 2: Agent can enter an existing Twilio number (E.164 validated)","Step 3: Test SMS is actually delivered to agent mobile number","agents table updated at each step (fub_connected, phone_configured, sms_verified)","Agent can skip any step and complete later via Settings -> Integrations","onboarding_completed = true set on completion screen","All wizard API endpoints require authenticated session","UI is mobile-responsive","E2E: full wizard flow (all 3 steps) passes","E2E: partial flow with skipped steps passes"]
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

### fix-deployed-pages-not-registered-in-system- — Auto-Sync Deployed Vercel Pages to System Components

- **PRD:** PRD-DEPLOYED-PAGES-SYNC-FIX
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

### fix-stripe-secret-key-not-set-in-vercel-production — STRIPE_SECRET_KEY not set in Vercel production

- **PRD:** prd-fix-stripe-env-vars-vercel
- **Status:** complete
- **Priority:** 1
- **Description:** ## STRIPE_SECRET_KEY not set in Vercel production
**Type:** missing_config
**Severity:** critical
**Source:** Product review 6e578fe1-5937-44c2-a27c-cfd3508bee00

**Details:** The Vercel production environment for leadflow-ai is missing STRIPE_SECRET_KEY. Both the checkout API (/api/billing/create-checkout) and webhook handler (/api/webhooks/stripe) check for this key and return HTTP 503 if absent. Direct API test confirmed: POST /api/billing/create-checkout → {"error":"Stripe not configured"}. No real transactions are possible.

**Suggested fix:** In Vercel dashboard → leadflow-ai project → Settings → Environment Variables, add STRIPE_SECRET_KEY with the live secret key (sk_live_...). Also add STRIPE_WEBHOOK_SECRET with the webhook signing secret.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Acceptance Criteria:**
  - STRIPE_SECRET_KEY is set in Vercel production environment (sk_live_...)
  - POST /api/billing/create-checkout does NOT return {"error":"Stripe not configured"} (HTTP 503)
  - A Stripe Checkout page opens when clicking upgrade in dashboard
  - Test transaction with card 4242 4242 4242 4242 completes successfully
- **Workflow:** Dev > QC

### feat-frictionless-onboarding-flow — Self-Serve Frictionless Onboarding Flow

- **PRD:** PRD-FRICTIONLESS-ONBOARDING-001
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

### fix-triage-108-stuck-ucs-determine-which — PM: Triage 108 stuck UCs — determine which are still needed

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** PM: Triage 108 stuck UCs — determine which are still needed
- **Workflow:** Dev > QC

### fix-failing-test-suite — Fix 90 failing tests blocking CI pipeline

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** CI branch protection requires tests to pass. 90/1059 tests failing across 14 test files. No PR can merge until these are fixed. This is P1 — blocks ALL development.
- **Workflow:** Dev > QC

### fix-createstuckalerts-not-wired-into-heartbeat — createStuckAlerts() not wired into heartbeat

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## createStuckAlerts() not wired into heartbeat
**Type:** missing_integration
**Severity:** critical
**Source:** Product review 76c39605-5fec-487b-8d52-b0aa06e4dd32

**Details:** Even if lib/onboarding-telemetry.js is created, it must be called from the heartbeat executor or a scheduled job. There is no existing call site for this function anywhere in the codebase. The heartbeat configuration and wiring also need to be verified.

**Suggested fix:** After creating lib/onboarding-telemetry.js, add a call to createStuckAlerts() in the heartbeat loop (likely in scripts/heartbeat.js or similar). Verify the call executes on every heartbeat run.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-pricing-page-checkout-buttons-do-nothing — Pricing page checkout buttons do nothing

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## Pricing page checkout buttons do nothing
**Type:** broken_flow
**Severity:** critical
**Source:** Product review 6e578fe1-5937-44c2-a27c-cfd3508bee00

**Details:** In /app/pricing/page.tsx, the handleSelectPlan function contains only // TODO: Implement checkout flow and console.log. Clicking any plan button (Starter, Pro, Team, Brokerage) does nothing. Users cannot initiate checkout from the pricing page.

**Suggested fix:** Implement handleSelectPlan to call POST /api/billing/create-checkout with the selected tier, agentId (from auth session), and email. On success, redirect to session.url (Stripe hosted checkout page).
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

### fix-stripe-webhook-secret-missing-from-vercel-leadflow — STRIPE_WEBHOOK_SECRET missing from Vercel leadflow-ai project

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## STRIPE_WEBHOOK_SECRET missing from Vercel leadflow-ai project
**Type:** bug
**Severity:** critical
**Source:** Product review 169a0874-1608-402e-a558-97bda66f6c24

**Details:** STRIPE_WEBHOOK_SECRET is not set in Vercel environment variables for the leadflow-ai project. Verified via "vercel env ls" — the key is absent. The webhook signature verification will fail on any incoming Stripe webhook event (payment_intent.succeeded, customer.subscription.updated, etc.), meaning subscription state changes will not be processed, agents won't be upgraded/downgraded, and trial expirations won't trigger.

**Suggested fix:** Add STRIPE_WEBHOOK_SECRET to Vercel leadflow-ai project. Get it from the Stripe Dashboard > Webhooks > leadflow endpoint > Signing Secret. Set for Production environment. Then redeploy.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-stripe-secret-key-missing-from-vercel-leadflow-ai- — STRIPE_SECRET_KEY missing from Vercel leadflow-ai project

- **PRD:** -
- **Status:** complete
- **Priority:** 1
- **Description:** ## STRIPE_SECRET_KEY missing from Vercel leadflow-ai project
**Type:** bug
**Severity:** critical
**Source:** Product review 169a0874-1608-402e-a558-97bda66f6c24

**Details:** STRIPE_SECRET_KEY is not set in Vercel environment variables for the leadflow-ai project. Verified via "vercel env ls" — the key is absent. As a result, all billing API routes that initialize the Stripe client (portal session, checkout, etc.) fail with HTTP 503 and {"error":"Stripe not configured","code":"STRIPE_NOT_CONFIGURED"}. Tested: /api/stripe/portal-session returns 503. This blocks all paid plan flows.

**Suggested fix:** Add STRIPE_SECRET_KEY to Vercel leadflow-ai project via Vercel Dashboard > Settings > Environment Variables. Set for Production environment. Then redeploy: cd product/lead-response/dashboard && vercel --prod
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-uc-completion-gate-missing-in-checkdistributionhea — UC completion gate missing in checkDistributionHealth()

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## UC completion gate missing in checkDistributionHealth()
**Type:** bug
**Severity:** high
**Source:** Product review 368d7056-d0f9-44a7-94da-22c9d5c3831e

**Details:** distribution-collector.js checkDistributionHealth() queries distribution_channels without first checking if gtm-landing-page UC has implementation_status=complete. The UC IS complete (confirmed via Supabase query). Fix: add UC status check before infra query; if implementation_status === complete, skip no_landing_page check.

**Suggested fix:** Add UC completion check before distribution_channels query in checkDistributionHealth(). If gtm-landing-page implementation_status === complete, skip no_landing_page issue.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-api-accepts-agent-id-as-query-parameter-instead-of — API accepts agent_id as query parameter instead of reading from session

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## API accepts agent_id as query parameter instead of reading from session
**Type:** high
**Severity:** high
**Source:** Product review 8da6920b-9240-4990-a672-e68b29b3326d

**Details:** The endpoint allows callers to specify ?agent_id=any-uuid, violating the PRD requirement: "existing session middleware (agent scoped — no agent can see another agent's data)". An attacker could view other agents' analytics.

**Suggested fix:** Extract agentId from the authenticated session (via getSession or middleware), not from query params. Remove the agent_id query param.
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

### improve-landing-page-analytics-ga4 — Landing Page Analytics — GA4/PostHog for CTA Clicks, Scroll Depth & Conversion Funnel

- **PRD:** PRD-LANDING-PAGE-ANALYTICS-001
- **Status:** complete
- **Priority:** 2
- **Description:** Improve the landing page with event-level analytics tracking. Implement GA4 (primary) to measure CTA click-through rates, scroll depth milestones (25/50/75/90%), and the full conversion funnel: page_view → cta_click → form_start → form_submit_attempt → pilot_signup_complete. PostHog optional for session replay.
- **Acceptance Criteria:**
  - ["GA4 script loads via Next.js Script component with strategy=afterInteractive","cta_click event fires for all CTA buttons with cta_id, section, cta_label params","Scroll depth events fire at 90% via GA4 Enhanced Measurement","Form funnel events tracked: form_start, form_submit_attempt, pilot_signup_complete","pilot_signup_complete marked as GA4 conversion","No PII (email/phone/name) in any event parameters","Page load performance not degraded (< 2s Lighthouse score maintained)","NEXT_PUBLIC_GA4_MEASUREMENT_ID env var used (not hardcoded)","Analytics works in production; no-ops gracefully in local dev without the env var"]
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

### fix-ga4-property-and-vercel-env-var-setup-required — GA4 property and Vercel env var setup required

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## GA4 property and Vercel env var setup required
**Type:** action_item
**Severity:** high
**Source:** Product review c8710612-deea-4dcc-beea-34d5e2eef80b

**Details:** Implementation is code-complete but non-functional until: (1) GA4 property is created in Google Analytics, (2) NEXT_PUBLIC_GA4_MEASUREMENT_ID is set in Vercel leadflow-ai project settings, (3) dashboard is redeployed with env var.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-subscriptions-table-never-populated — Subscriptions table never populated

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Subscriptions table never populated
**Type:** feature_gap
**Severity:** high
**Source:** Product review 10346cc1-f33b-4f29-b441-9365e7534de6

**Details:** The webhook handler creates subscription_events and payments entries but never inserts the main subscription record into the subscriptions table. This means the primary subscription tracking table will remain empty. The checkout.session.completed handler should create a subscription record.

**Suggested fix:** Add subscription insert in handleCheckoutComplete function to create the initial subscription record with user_id, stripe_customer_id, stripe_subscription_id, status, tier, and period dates
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

### fix-verify-stripe-webhook-secret-in-production — Verify Stripe webhook secret in production

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Verify Stripe webhook secret in production
**Type:** configuration_issue
**Severity:** high
**Source:** Product review 10346cc1-f33b-4f29-b441-9365e7534de6

**Details:** The webhook secret is read from process.env.STRIPE_WEBHOOK_SECRET. Need to verify this is configured in Vercel environment for production.

**Suggested fix:** Verify STRIPE_WEBHOOK_SECRET is set in Vercel environment variables for leadflow-ai and fub-inbound-webhook projects
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

### fix-no-evidence-of-wizard-auto-trigger-implementation — No evidence of wizard auto-trigger implementation

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## No evidence of wizard auto-trigger implementation
**Type:** feature_status
**Severity:** high
**Source:** Product review 0fc68ebd-42f3-4c1c-8514-1a26780db9cd

**Details:** AC-3 requires 'Setup Wizard overlay appears automatically (onboarding_completed=false)' but dashboard/page.tsx does not check onboarding_completed status or conditionally render wizard. The onboarding flow exists at /onboarding but there's no redirect from /dashboard when onboarding_completed=false.

**Suggested fix:** Add middleware or client-side logic to dashboard layout: if onboarding_completed=false, redirect to /onboarding OR render wizard as overlay with persistent state.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### gtm-landing-page — Landing Page

- **PRD:** PRD-DISTRIBUTION-LOOP-DEDUP-FIX
- **Status:** complete
- **Priority:** 2
- **Description:** Create a high-converting landing page that clearly communicates the value proposition, pricing, and includes a signup CTA.
- **Workflow:** PM > Marketing > Design > Dev > QC

### improve-landing-page-pricing-4-tiers — Landing Page Pricing Section — All 4 Tiers with Feature Comparison

- **PRD:** PRD-LANDING-PRICING-4TIERS
- **Status:** complete
- **Priority:** 2
- **Description:** Show all 4 pricing tiers (Starter $49/mo, Pro $149/mo, Team $399/mo, Brokerage $999+/mo) on the marketing landing page with a feature comparison, matching PMF.md prices. The current landing page has no pricing section; the /pricing page shows 3 wrong tiers at $497/$997/$1997.
- **Acceptance Criteria:**
  - ["Landing page (/) has a visible pricing section with all 4 tiers before the footer","Prices match PMF.md: Starter $49, Pro $149, Team $399, Brokerage $999+","Pro tier is visually highlighted as Most Popular","All tiers have working CTA buttons (Starter/Pro/Team to /signup, Brokerage to contact)","/pricing page corrected: 4 tiers at correct prices with feature comparison table","Feature comparison table shows checkmarks and dashes per feature matrix in PRD","Mobile responsive: pricing cards stack vertically on 375px viewport"]
- **Workflow:** PM > Design > Dev > QC

### UC-LANDING-ANALYTICS-GA4-001 — Landing Page Analytics — GA4 CTA & Conversion Tracking

- **PRD:** PRD-LANDING-ANALYTICS-GA4-001
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

### feat-repository-structure-convention — Repository Structure Convention for LeadFlow

- **PRD:** prd-repository-structure-convention
- **Status:** complete
- **Priority:** 2
- **Description:** Apply repository structure convention across LeadFlow: move root utility/diagnostic JS and shell scripts into scripts/ subdirectories; reorganize root documentation into docs/prd, docs/design, docs/guides, docs/reports with explicit keep-at-root exceptions; move strategy-config.json, swarm-config.json, and budget-tracker.json into config/ and update all references; consolidate test/ and tests/ into tests/{e2e,integration,unit}; create PROJECT_STRUCTURE.md from genome template; update CLAUDE.md Key Directories to match; and verify symlinks, server.js runtime, and Vercel deploy still work. Definition of done includes zero stale path references and successful smoke checks.
- **Acceptance Criteria:**
  - ["AC-1: strategy-config.json, swarm-config.json, budget-tracker.json moved to config/ with zero stale references","AC-2: tests/e2e/ and tests/integration/ created; test/ consolidated; npm test passes","AC-3: docs/prd/, docs/design/, docs/guides/, docs/reports/ created with correct files","AC-4: Root-level diagnostic scripts moved to scripts/ subdirectories","AC-5: PROJECT_STRUCTURE.md created at repo root","AC-6: CLAUDE.md Key Directories updated to reflect new layout","AC-7: node server.js starts, symlinks resolve, smoke test passes","AC-8: Zero stale path references verified by grep"]
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

### fix-no-sessionstorage-write-on-landing-page-load-utm-l — No sessionStorage write on landing page load — UTM lost for multi-page journeys

- **PRD:** PRD-UTM-SESSIONSTORAGE-WRITE-FIX
- **Status:** complete
- **Priority:** 2
- **Description:** ## No sessionStorage write on landing page load — UTM lost for multi-page journeys
**Type:** bug
**Severity:** high
**Source:** Product review 118687fe-d13b-4359-a3fe-560769c5bc79

**Details:** The onboarding page (app/onboarding/page.tsx) reads UTM from sessionStorage key leadflow_utm, expecting the landing page to have written UTM params on arrival. However, NO component in the codebase writes to sessionStorage.leadflow_utm on page load. The trial-signup-form.tsx and pilot-signup-form.tsx only read UTM from searchParams at submit time (current page URL). If a user lands on /?utm_source=google&utm_medium=cpc, clicks around the site, and then visits /onboarding without UTM params in the URL, all attribution is lost. This is the direct cause of 0/141 agents having UTM data. The fix: add a useEffect on the landing page root (or root layout) that reads UTM from URL params and writes to sessionStorage.setItem("leadflow_utm", JSON.stringify({...}))

**Suggested fix:** Add a UTM capture component in app/page.tsx or a shared layout that on mount reads UTM from searchParams and writes to sessionStorage.setItem("leadflow_utm", JSON.stringify({utm_source, utm_medium, utm_campaign, utm_content, utm_term})) only when at least one UTM param is present. This should NOT overwrite existing sessionStorage if already set (first-touch attribution). Apply to all entry pages (/, /pilot, /trial).
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Acceptance Criteria:**
  - ["AC-1: User landing with UTM params has sessionStorage.leadflow_utm set on mount","AC-2: First-touch protection — sessionStorage not overwritten on subsequent page loads with different UTM","AC-3: No UTM params in URL → sessionStorage not touched","AC-4: UTM params persist from landing page to /onboarding form submission, agent record created with correct utm fields","AC-5: No SSR crash — all sessionStorage access wrapped in try/catch","AC-6: UtmCaptureTracker present in root layout and runs on every page"]
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

### feat-lead-magnet-email-capture — Lead Magnet / Email Capture on Landing Page

- **PRD:** PRD-LEAD-MAGNET-EMAIL-CAPTURE
- **Status:** complete
- **Priority:** 2
- **Description:** Capture emails of landing page visitors not ready to sign up by offering a lead magnet (PDF guide: "The 5-Minute AI Lead Response Playbook"). Email capture form on landing page → /api/lead-capture endpoint → record stored in pilot_signups with source=lead_magnet → automated 3-email nurture sequence (instant delivery, Day 3 social proof, Day 7 pilot invite). Goal: build nurture list and convert to trial/signup within 30 days. KPIs: 20+ captures in 30 days, ≥10% → trial conversion.
- **Acceptance Criteria:**
  - ["Form renders between hero and pricing sections on landing page","Valid email submission: success message shown, record saved in pilot_signups with source=lead_magnet","Invalid email: inline error shown, API not called","Delivery email sent to captured inbox within 60 seconds","Duplicate email: success state shown, no duplicate row created","UTM parameters captured and stored on submission","Form fully usable on mobile (375px viewport)"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-bookings-table-join-missing-for-cross-table-agent- — Bookings table join missing for cross-table agent scoping

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Bookings table join missing for cross-table agent scoping
**Type:** high
**Severity:** high
**Source:** Product review 8da6920b-9240-4990-a672-e68b29b3326d

**Details:** When fetching bookings (line 97), the query filters by agent_id directly on the bookings table. If this table exists but lacks agent_id column, or if bookings lack agent context, the join will fail silently.

**Suggested fix:** Verify bookings table has agent_id, or join bookings → leads → confirm lead.agent_id
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### improve-add-start-free-trial-cta-frictionless — Add Start Free Trial CTA — frictionless trial entry for pilot recruitment

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** Add Start Free Trial CTA — frictionless trial entry for pilot recruitment
- **Workflow:** PM > Marketing > Design > Dev > QC

### improve-landing-page-pricing-section-show-all — Landing page pricing section — show all 4 tiers with feature comparison matching PMF.md prices

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** Landing page pricing section — show all 4 tiers with feature comparison matching PMF.md prices
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-fixed-typescript-compilation-error-in-stripe-webho — Fixed: TypeScript compilation error in stripe webhook handler

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Fixed: TypeScript compilation error in stripe webhook handler
**Type:** bug_fix
**Severity:** high
**Source:** Product review 81d98c51-bff4-4ed5-8b42-256534b58f82

**Details:** The stripe webhook route was failing to compile due to TypeScript type assertion issue with current_period_start and current_period_end properties. Used type assertion (subscription as any) to resolve the issue.

**Suggested fix:** Type assertion applied - build now succeeds
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-sendsatisfactionping-never-called-from-sms-handlin — sendSatisfactionPing never called from SMS handling flow

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## sendSatisfactionPing never called from SMS handling flow
**Type:** gap
**Severity:** high
**Source:** Product review 0cea3b78-ee34-4dfd-96ca-e3ea2ff1e293

**Details:** The sendSatisfactionPing function exists in lib/satisfaction.ts (dashboard) but is never imported or called from the main Express routes/ or integrations/ code that handles outbound SMS. Satisfaction pings will never fire in production.

**Suggested fix:** Integrate sendSatisfactionPing into the post-AI-response logic in the main SMS outbound handler (likely lib/twilio-sms.js or the FUB webhook handler). After sending the AI reply and checking >=2 messages in conversation, call sendSatisfactionPing with the lead and agent data.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-no-analytics-tracking-implemented-ga4-utm-conversi — No analytics tracking implemented (GA4, UTM, conversion events)

- **PRD:** PRD-LANDING-PAGE-ANALYTICS-001
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

### feat-nps-agent-feedback — NPS & Feedback Survey for Agents

- **PRD:** PRD-NPS-AGENT-FEEDBACK
- **Status:** complete
- **Priority:** 2
- **Description:** Collect NPS scores and open-ended feedback from real estate agents (customers) via automated email surveys (T+14d, T+90d), always-on in-app feedback button, admin NPS trend dashboard, and churn risk detection for detractor scores.
- **Acceptance Criteria:**
  - ["Agent receives NPS email 14 days after signup and every 90 days thereafter","Survey email contains 0-10 scale question and optional open text field","Agent can submit survey via email link without logging in (signed JWT token)","In-app NPS prompt shown on dashboard login when survey is due; dismissible","Persistent Give Feedback button in dashboard allows any-time submission","Feedback form supports 4 types: Works great, Bug, Idea, Frustration","Admin NPS view at /admin/nps shows current NPS score, trend, and recent responses","NPS calculated as % Promoters minus % Detractors from last 90 days","Detractor score (0-6) auto-creates churn_risk entry in product_feedback table","Survey scheduling tracked per agent; no duplicate sends within 30 days of last survey"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### feat-lead-experience-simulator — Lead Experience Simulator & Conversation Viewer

- **PRD:** PRD-LEAD-EXPERIENCE-SIMULATOR
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

### genome-phase1e-cicd — Genome Phase 1E: CI/CD for openclaw-genome repo

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** Set up GitHub Actions on LeonidaTheGreat/openclaw-genome: lint (node -c on all core/*.js) + test (npm test) on every push. Add pre-heartbeat syntax validation: before heartbeat runs, verify all core files parse correctly. Add auto-rollback: if heartbeat crashes 3 consecutive times, git checkout to last tagged release. Exit criteria: every genome code change tested before affecting production.
- **Workflow:** Dev > QC

### genome-phase1d-decomposition — Genome Phase 1D: Decompose heartbeat-executor.js into modules

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** Extract from heartbeat-executor.js (6,600 lines) into separate modules: merge-pipeline.js (checkPRReviews, createPRForTask, retryNeedsMergeUCs), uc-lifecycle.js (sweepUCCompletions, auditUCCompletions, retryStuckUCs, replenishQueue), spawn-manager.js (spawnAgents, detectStuckSpawns, detectZombieTasks), quality-scanner.js (checkBuildHealth, checkTestHealth, checkCodeQuality), action-items-manager.js (syncActionItems, processActionItemResponses). Each module: own file, exported functions, own test file. heartbeat-executor.js becomes thin orchestrator <1000 lines. Exit criteria: no file >1500 lines, each module independently testable.
- **Workflow:** Dev > QC

### feat-leadflow-repository-restructuring — Repository restructuring

- **PRD:** prd-repository-structure-convention
- **Status:** complete
- **Priority:** 2
- **Description:** Apply project structure convention to LeadFlow. Move root utility .js to scripts/ subdirs, .sh to scripts/, .md docs to docs/ subdirs (PRD-* to docs/prd/, DESIGN-* to docs/design/, guides to docs/guides/, reports to docs/reports/). Keep CLAUDE.md, ARCHITECTURE.md, README.md, PMF.md at root. Move config .json to config/. Consolidate test/ and tests/. Create PROJECT_STRUCTURE.md. Update CLAUDE.md. Verify symlinks, server.js, vercel deploy all work.
- **Acceptance Criteria:**
  - ["All targeted root JS utility/diagnostic files are moved from root into scripts/ subdirectories","No targeted root .sh file remains at root (except symlinks or orchestration files)","Documentation move rules applied: PRD-*.md → docs/prd/, DESIGN-*.md → docs/design/, guides → docs/guides/, reports → docs/reports/","Excluded root docs remain: CLAUDE.md, ARCHITECTURE.md, README.md, PMF.md, AGENTS.md, HEARTBEAT.md","config/ exists with the three JSON config files (strategy-config.json, swarm-config.json, budget-tracker.json) and references updated","Only one test root (tests/) with e2e, integration, unit subdirectories — legacy test/ merged","PROJECT_STRUCTURE.md exists at root and matches actual layout","CLAUDE.md Key Directories section updated to match new structure","Orchestration symlinks (task-store.js, project-config-loader.js, subagent-completion-report.js) still resolve","node server.js starts without path-related failures","Vercel deployment smoke check passes for both fub-inbound-webhook and leadflow-ai projects"]
- **Workflow:** PM > Dev > QC

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

### feat-utm-capture-marketing-attribution — UTM Parameter Capture & Marketing Attribution

- **PRD:** PRD-UTM-CAPTURE-ATTRIBUTION
- **Status:** complete
- **Priority:** 2
- **Description:** Capture UTM parameters when visitors land on the marketing landing page. Persist through signup flow. Store on agent record. Surface attribution breakdown in dashboard. Enables channel-level ROI measurement for pilot recruitment campaigns.
- **Acceptance Criteria:**
  - ["Landing page captures UTM params and writes to sessionStorage on first load (first-touch wins)","Signup form reads UTM from sessionStorage and includes in POST body","agents table has 5 new UTM columns (utm_source, utm_medium, utm_campaign, utm_content, utm_term)","API endpoint writes UTM fields to agent record on signup","Dashboard shows attribution breakdown by source/medium/campaign","Manual test: visit /?utm_source=test&utm_medium=email&utm_campaign=pm-test → sign up → confirm fields in Supabase","Direct visit (no UTM) → all UTM fields remain NULL, no errors"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-dashboard-leadsatisfactioncard-uses-hardcoded-test — Dashboard LeadSatisfactionCard uses hardcoded test-agent-id

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Dashboard LeadSatisfactionCard uses hardcoded test-agent-id
**Type:** bug
**Severity:** high
**Source:** Product review 0cea3b78-ee34-4dfd-96ca-e3ea2ff1e293

**Details:** app/dashboard/page.tsx renders <LeadSatisfactionCard agentId="test-agent-id" /> with a hardcoded placeholder. The component will never show real satisfaction data for any authenticated agent.

**Suggested fix:** Replace hardcoded agentId with the authenticated session agent ID. Read agent ID from session/cookie in the server component or pass it via context.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-session-analytics-pilot — Session Analytics — Pilot Agent Usage Tracking

- **PRD:** PRD-SESSION-ANALYTICS-PILOT
- **Status:** complete
- **Priority:** 2
- **Description:** Track whether pilot real estate agents are actively logging in and using the dashboard. Captures session events, page views, and inactivity signals. Enables proactive outreach before pilots disengage.
- **Acceptance Criteria:**
  - ["agent_sessions table populated on each pilot login","agent_page_views table tracks dashboard navigation per session","GET /api/internal/pilot-usage returns current engagement data for all pilots","Pilots with >72h inactivity trigger a Telegram alert (max once per 24h)","Session logging failures do not break the authentication flow"]
- **Workflow:** PM > Marketing > Design > Dev > QC

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

### feat-sms-analytics-dashboard — SMS Analytics Dashboard — Delivery, Reply & Booking Conversion

- **PRD:** PRD-SMS-ANALYTICS-DASHBOARD
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

### feat-genome-project-structure-convention — Project Structure Convention System

- **PRD:** genome-project-structure-convention
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

### fix-ahacompleted-not-included-in-onboarding-submit-pay — ahaCompleted not included in onboarding submit payload — FR-8 not implemented

- **PRD:** PRD-AHA-MOMENT-SIMULATOR-UI
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

### feat-genome-auto-generated-docs-convention — Auto-generated docs directory convention

- **PRD:** genome-auto-generated-docs-convention
- **Status:** in_progress
- **Priority:** 2
- **Description:** Update generate-project-docs.js to write auto-generated markdown files to docs/auto-generated/ instead of repo root. Update all references in heartbeat-executor.js, heartbeat-wrapper.js. Make output directory configurable in project.config.json under a docs section.
- **Acceptance Criteria:**
  - ["docs/auto-generated/ directory created when missing","USE_CASES.md, E2E_MAPPINGS.md, PRD_INDEX.md, JOURNEYS.md written to docs/auto-generated/","These files absent from repo root after migration","docs.auto_generated_dir in project.config.json overrides default path","Heartbeat runs end-to-end without path errors","File content unchanged (only write path changes)","docs/auto-generated/ gitignore or commit policy documented"]
- **Workflow:** PM > Dev > QC

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

### fix-scroll-depth-tracking-not-wired-attachscrollmilest — Scroll depth tracking not wired — attachScrollMilestoneObservers never called on landing page

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Scroll depth tracking not wired — attachScrollMilestoneObservers never called on landing page
**Type:** bug
**Severity:** high
**Source:** Product review 5f4f796f-2913-41fc-a523-9684248b833d

**Details:** ga4.ts provides attachScrollMilestoneObservers() which uses IntersectionObserver to fire scroll_milestone events at 25/50/75% scroll. page.tsx is a server-compatible JSX file with no useEffect or useRef hooks — it cannot attach observers. There is no client-side wrapper or ScrollDepthTracker component used in the landing page. scroll_milestone events are never fired.

**Suggested fix:** Create a ScrollDepthTracker client component (use client) that: (1) places invisible sentinel divs at 25/50/75% page landmarks, (2) calls attachScrollMilestoneObservers() in useEffect with cleanup. Add <ScrollDepthTracker /> to page.tsx alongside the existing layout.
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

### fix-api-route-queries-wrong-table-for-satisfaction-pin — API route queries wrong table for satisfaction_ping_enabled

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## API route queries wrong table for satisfaction_ping_enabled
**Type:** bug
**Severity:** high
**Source:** Product review 0cea3b78-ee34-4dfd-96ca-e3ea2ff1e293

**Details:** app/api/agents/satisfaction-ping/route.ts queries the real_estate_agents table for satisfaction_ping_enabled, but migration 008 added that column to the agents table. The column does not exist on real_estate_agents. The agent toggle (US-4) will always 404 or 500 in production.

**Suggested fix:** Change .from("real_estate_agents") to .from("agents") in /api/agents/satisfaction-ping/route.ts (both GET and PATCH handlers).
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-landing-page-page-tsx-has-zero-cta-click-analytics — Landing page (page.tsx) has zero CTA click analytics — trackCTAClick never called

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Landing page (page.tsx) has zero CTA click analytics — trackCTAClick never called
**Type:** bug
**Severity:** high
**Source:** Product review 5f4f796f-2913-41fc-a523-9684248b833d

**Details:** The ga4.ts library exports trackCTAClick() for all CTAs defined in the PRD (join_pilot_hero, get_started_hero, pricing_starter, pricing_pro, etc.), but page.tsx imports none of these. Hero CTA uses <TrialSignupForm compact /> with no onClick tracking. Nav links (/pilot, /login) have no onClick. Pricing card Get Started and start free trial links have no onClick. The pilot page imports trackCTAClick but has 0 call sites. Result: no cta_click events reach GA4 regardless of env var configuration.

**Suggested fix:** Add onClick={()=>trackCTAClick(id, label, section)} to: (1) Nav Pilot Program link, (2) TrialSignupForm submit button in compact mode, (3) Each PricingCard Get Started/trial link. Add import for trackCTAClick to page.tsx. Also add CTA click tracking to the pilot/page.tsx submit button.
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

### fix-subscription-attempts-table-does-not-exist-in-supa — subscription_attempts table does not exist in Supabase

- **PRD:** PRD-FIX-CHECKOUT-SUBSCRIPTION-ATTEMPTS
- **Status:** complete
- **Priority:** 2
- **Description:** ## subscription_attempts table does not exist in Supabase
**Type:** missing_table
**Severity:** high
**Source:** Product review 6e578fe1-5937-44c2-a27c-cfd3508bee00

**Details:** The checkout API inserts into subscription_attempts after creating a checkout session. This table does not exist in Supabase (query returns PGRST205 error: Could not find table public.subscription_attempts). The API will throw on every checkout attempt after the Stripe session is created, returning 500 to the client.

**Suggested fix:** Create the subscription_attempts table: id (uuid), agent_id (uuid), tier (text), stripe_session_id (text), status (text), created_at (timestamp). Or remove that insert and just use subscription_events instead.
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

### fix-session-analytics-tables-exist-but-lack-integratio — Session analytics tables exist but lack integration points in dashboard UI

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Session analytics tables exist but lack integration points in dashboard UI
**Type:** feature
**Severity:** high
**Source:** Product review 15b46e1f-37eb-4d09-8c51-2af70a3bdee4

**Details:** The agent_sessions and agent_page_views tables are properly created and functional, and the /api/internal/pilot-usage endpoint returns correct aggregated data. However, there is no visible UI component in the dashboard for Stojan to view this data locally.

**Suggested fix:** Create a dashboard card/widget that displays pilot engagement metrics, or document the internal API endpoint for Stojan to use via CLI/curl for monitoring.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-walkthrough-spec-incomplete-missing-product-signup — Walkthrough spec incomplete — missing product signup/onboarding tests

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Walkthrough spec incomplete — missing product signup/onboarding tests
**Type:** implementation_gap
**Severity:** high
**Source:** Product review 0fc68ebd-42f3-4c1c-8514-1a26780db9cd

**Details:** The walkthrough spec only includes the orchestration dashboard URL, but the PRD is about the customer-facing frictionless onboarding flow. The actual product signup and onboarding flow at https://leadflow-ai-five.vercel.app are NOT included in the walkthrough spec, making it impossible to fully verify the feature completeness.

**Suggested fix:** Expand walkthrough spec to include: (1) Landing page access, (2) Trial signup flow (email+password only), (3) Dashboard access post-signup, (4) Sample leads visibility, (5) Wizard auto-trigger, (6) FUB connection step, (7) SMS setup step, (8) Aha moment simulator
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

### fix-from-email-env-var-has-trailing-newline-may-cause- — FROM_EMAIL env var has trailing newline — may cause Resend delivery failure

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## FROM_EMAIL env var has trailing newline — may cause Resend delivery failure
**Type:** bug
**Severity:** high
**Source:** Product review a4198d11-acfd-4080-8913-e81931a65a03

**Details:** The .env.local FROM_EMAIL value is "onboarding@resend.dev
" (with literal 
 in the string). This will be passed to Resend as the from address with a trailing newline, which may cause email delivery to fail or be rejected.

**Suggested fix:** Strip trailing whitespace from FROM_EMAIL in .env.local and Vercel environment variables. Also RESEND_API_KEY has the same 
 issue.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

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

### fix-no-forgot-password-flow — Forgot Password / Password Reset Flow

- **PRD:** PRD-FORGOT-PASSWORD
- **Status:** complete
- **Priority:** 2
- **Description:** The login page has a stub Forgot Password button (alert). Implement full forgot password flow: email input page, token dispatch via Resend, reset-password page, API routes, and DB token table.
- **Acceptance Criteria:**
  - ["Clicking Forgot password? on /login navigates to /forgot-password (not an alert)","Entering a registered email results in receiving a reset email within 30 seconds","Submitting a non-existent email shows same success message (anti-enumeration)","Clicking reset link opens /reset-password?token=... and password can be updated","Logging in with new password succeeds; old password fails","Using same reset link twice returns error","Reset link older than 1 hour returns error"]
- **Workflow:** Dev > QC

### fix-active-sequences-not-visible-in-agent-dashboard — Active sequences not visible in agent dashboard

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Active sequences not visible in agent dashboard
**Type:** gap
**Severity:** high
**Source:** Product review 0b0c3433-23cd-427f-9247-64df68704c2b

**Details:** UC-8 AC requires "Active sequences visible in dashboard" but the lead detail page (/dashboard/leads/[id]/page.tsx) has no sequence display. There is no UI component showing sequence status, current step, last/next send time, or controls to pause/resume. The pause/resume APIs exist (/api/sequences/[id]/pause, /api/sequences/[id]/resume) but are unreachable from the UI.

**Suggested fix:** Add a SequenceStatusCard component to the lead detail sidebar showing: sequence type, current step, next send time, messages sent/remaining, and pause/resume controls. The sequences lib already has all needed functions.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-no-active-session-logging-due-to-lack-of-end-to-en — No active session logging due to lack of end-to-end testing

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## No active session logging due to lack of end-to-end testing
**Type:** feature
**Severity:** high
**Source:** Product review 15b46e1f-37eb-4d09-8c51-2af70a3bdee4

**Details:** While logSessionStart() is correctly integrated into the login flow, it has never been triggered by an actual user login. The tables are empty with 0 sessions, meaning the feature has not been validated in a real user flow.

**Suggested fix:** Conduct an end-to-end test with a real agent login, verify session creation, test page navigation logging, and confirm the pilot-usage endpoint reflects the data.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-no-automatic-sequence-creation-on-new-lead-no-resp — No automatic sequence creation on new lead / no-response

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## No automatic sequence creation on new lead / no-response
**Type:** bug
**Severity:** high
**Source:** Product review 0b0c3433-23cd-427f-9247-64df68704c2b

**Details:** The cron handler processes existing sequences but nothing creates a sequence when a new lead arrives with no response. The FUB webhook listener and lead response handler do not call createSequence(). Without a trigger to create sequences, the entire UC-8 system is dormant — sequences are never initiated.

**Suggested fix:** In the FUB webhook handler (after initial SMS is sent), call createSequence({ lead_id, sequence_type: "no_response", trigger_reason: "new_lead_no_response", next_send_at: +24h }). Also trigger "post_viewing" after confirmed booking and "no_show" after missed appointment.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

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

### fix-postgrest-schema-mismatches — fix-postgrest-schema-mismatches

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** 80+ column mismatches across 40+ API routes from Supabase migration.
- **Workflow:** Dev > QC

### fix-9-acceptance-criteria-defined-but-not-all-verified — 9 acceptance criteria defined but not all verified

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## 9 acceptance criteria defined but not all verified
**Type:** uc_acceptance_criteria_gap
**Severity:** high
**Source:** Product review 5d82fced-c838-4ef7-8cc7-4c01124cdebb

**Details:** Use case defines 9 acceptance criteria: (1) Button visible above fold desktop/mobile ❓, (2) Email+password only ✓ (form exists), (3) Redirect within 5s ✓ (route exists), (4) plan_tier=trial ✓ (DB capable), (5) trial_ends_at set 30 days out ✓ (DB capable), (6) Trial badge in nav ✓ (component exists), (7) CTA in 3 placements ❌ (MISSING), (8) source=trial_cta on agents ✓ (API capable), (9) Duplicate email error ✓ (validation exists). Gap: cannot verify any criteria without CTAs being visible on landing page.

**Suggested fix:** Complete landing page integration first. Then run full E2E test journey: visit landing page, click CTA, submit trial form, verify account created with correct fields, verify redirect.
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

### feat-start-free-trial-cta — Start Free Trial CTA — Frictionless Trial Entry for Pilot Recruitment

- **PRD:** prd-start-free-trial-cta
- **Status:** complete
- **Priority:** 2
- **Description:** Add a frictionless Start Free Trial CTA to the marketing landing page. Visitors enter email + password (2 fields), receive a 30-day Pro trial account with no credit card required, and are redirected immediately to the onboarding wizard. CTA placed in 3 locations: hero (above fold), features section, pricing section. Existing pilot application form preserved at /pilot.
- **Acceptance Criteria:**
  - ["Start Free Trial button visible above fold on desktop (1280px) and mobile (375px)","User can create account with only email + password — no credit card field","Account created and user redirected to dashboard within 5 seconds","New account has plan_tier=trial and trial_ends_at set to 30 days from creation","Trial badge with days remaining visible in dashboard nav","CTA appears in hero, features section, and pricing section (3 placements)","Existing pilot application form still accessible","Trial accounts have source=trial_cta on agents record","Duplicate email shows friendly error with sign-in link"]
- **Workflow:** PM > Design > Dev > QC

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

### fix-tier-naming-inconsistency-between-pricing-page-and — Tier naming inconsistency between pricing page and checkout API

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Tier naming inconsistency between pricing page and checkout API
**Type:** naming_mismatch
**Severity:** high
**Source:** Product review 6e578fe1-5937-44c2-a27c-cfd3508bee00

**Details:** The pricing page uses tier names: starter, pro, team, brokerage. The checkout API route.ts defines PRICING_TIERS with keys: starter_monthly, professional_monthly, enterprise_monthly. If the pricing page ever sends tier=pro_monthly, the API will return 400 Invalid pricing tier. The tier name pro (pricing page) maps to nothing in the checkout API which uses professional_monthly.

**Suggested fix:** Align tier names across pricing page and checkout API. Decide on canonical names and update both. Suggest: starter, pro, team, brokerage (matching the pricing page and PMF.md).
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-use-cases-implementation-status-marked-complete-bu — use_cases.implementation_status marked complete but feature is non-functional

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## use_cases.implementation_status marked complete but feature is non-functional
**Type:** bug
**Severity:** high
**Source:** Product review e563f19b-9d8a-45a5-8086-3e7475545ec2

**Details:** Supabase use_cases row for feat-onboarding-completion-telemetry has implementation_status=complete, but the feature is completely non-functional because the database migration has not been applied. This creates false confidence in feature readiness and may suppress re-work tasks from being spawned.

**Suggested fix:** Update use_case implementation_status to in_progress or blocked until migration is applied and end-to-end verified.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### feat-lead-satisfaction-feedback — Lead Satisfaction Feedback Collection

- **PRD:** PRD-LEAD-SATISFACTION-FEEDBACK
- **Status:** complete
- **Priority:** 2
- **Description:** Measure if leads feel helped or annoyed by AI SMS responses. Send a brief satisfaction check-in SMS after AI conversation exchanges, classify replies, surface satisfaction metrics in the agent dashboard, and allow agents to disable pings via a settings toggle.
- **Acceptance Criteria:**
  - ["lead_satisfaction_events table created with lead_id, agent_id, conversation_id, rating, raw_reply, created_at","satisfaction_ping_enabled column added to agents table (default: true)","Satisfaction ping SMS sent after 2+ AI exchanges, max once per conversation, 10-min cooldown","Inbound replies classified as positive/negative/neutral/unclassified","STOP replies also trigger existing opt-out flow","Dashboard shows LeadSatisfactionCard with % positive/negative/neutral (shown when 5+ events)","Agent settings toggle to disable satisfaction pings","All E2E tests pass"]
- **Workflow:** PM > Marketing > Design > Dev > QC

### fix-api-endpoint-has-no-authentication-middleware — API endpoint has no authentication middleware

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## API endpoint has no authentication middleware
**Type:** high
**Severity:** high
**Source:** Product review 8da6920b-9240-4990-a672-e68b29b3326d

**Details:** The GET handler does not verify the user is authenticated. Should require an active session before returning any data.

**Suggested fix:** Add auth middleware: const { user } = await auth(); if (!user) return NextResponse.json({error: "Unauthorized"}, {status: 401})
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-agents-table-mismatch-auth-routes — Fix agents Table Mismatch in Auth/Onboarding API Routes

- **PRD:** PRD-FIX-AGENTS-TABLE-MISMATCH-AUTH
- **Status:** complete
- **Priority:** 2
- **Description:** Multiple product API routes query supabase.from("agents") — the orchestrator task table — instead of supabase.from("real_estate_agents"). This breaks email check, onboarding, profile, Stripe webhooks, and satisfaction routes. Fix all 11 affected files to use real_estate_agents.
- **Acceptance Criteria:**
  - ["AC-1: Email check during signup returns correct availability from real_estate_agents","AC-2: Agent profile GET loads data from real_estate_agents","AC-3: Onboarding form submission creates/updates row in real_estate_agents","AC-4: No 500 errors on any auth/onboarding/profile endpoint","AC-5: grep of product api dir shows 0 from(agents) product-customer references","AC-6: Stripe webhook updates real_estate_agents on subscription events"]
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

### fix-utm-fix-branch-not-merged-to-main-fix-undeployed — UTM fix branch not merged to main — fix undeployed

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## UTM Fix Branch — Merge All 12 Commits to Main
**Type:** deployment
**Decision:** merge_all (approved via decision a80ca153-c9dd-4ae2-b1aa-978d927600f7)
**Source review:** 45f9dfc1-bc11-415b-a675-5b06f3f90ea4

**Branch:** dev/a3a1f6f1-dev-fix-no-sessionstorage-write-on-landi
**Commits ahead of main:** 12

**What's on this branch:**
1. UTM fix: UtmCaptureTracker writes to sessionStorage.leadflow_utm on landing page load (commits 5a5d263, 76d10b1)
2. Onboarding completion telemetry: tracks funnel drop-off per onboarding step
3. Admin pilot invite flow: Stojan can directly invite agents bypassing self-serve signup

**Merge strategy decision:** merge_all
All three features are related to attribution and analytics. Onboarding telemetry and admin invite are tested on the branch. Test suite covers key functionality. Merging all is faster than cherry-picking.

**Steps:**
1. Open PR from dev/a3a1f6f1-dev-fix-no-sessionstorage-write-on-landi → main
2. Resolve any merge conflicts (unlikely — these are additive features)
3. Run npm test to confirm suite passes
4. Merge PR
5. Deploy to Vercel: cd product/lead-response/dashboard && vercel --prod
6. Verify UTM capture is live on production landing page

## Acceptance Criteria
- Branch merged to main with all 12 commits
- npm test passes post-merge
- Production Vercel deployment reflects the merged code
- UTM params captured in sessionStorage.leadflow_utm when visiting /?utm_source=test
- Onboarding telemetry events are recorded in Supabase
- Admin invite flow accessible at /admin/invite (or equivalent)
- Existing functionality not broken (lead response, FUB integration, Stripe billing)

- **Acceptance Criteria:**
  - Branch dev/a3a1f6f1-dev-fix-no-sessionstorage-write-on-landi merged to main with all 12 commits
  - npm test passes post-merge
  - Production Vercel deployment reflects merged code
  - UTM params (utm_source, utm_medium, utm_campaign, utm_content, utm_term) captured in sessionStorage.leadflow_utm on landing page load
  - Onboarding telemetry events recorded in Supabase onboarding_events table (or equivalent)
  - Admin pilot invite flow accessible and functional
  - Existing lead response, FUB integration, Stripe billing not broken
- **Workflow:** Dev > QC

### feat-email-verification-before-login — Email Verification — Confirm Inbox Before Login

- **PRD:** prd-email-verification-before-login
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

### fix-inbound-sms-handler-does-not-classify-satisfaction — Inbound SMS handler does not classify satisfaction replies

- **PRD:** -
- **Status:** complete
- **Priority:** 2
- **Description:** ## Inbound SMS handler does not classify satisfaction replies
**Type:** gap
**Severity:** high
**Source:** Product review 0cea3b78-ee34-4dfd-96ca-e3ea2ff1e293

**Details:** getPendingSatisfactionPing and recordSatisfactionReply from lib/satisfaction.ts are never wired into the Twilio inbound webhook handler. When leads reply YES/NO to the satisfaction ping, replies are not classified or stored.

**Suggested fix:** In the inbound SMS handler, before passing the message to the AI, check getPendingSatisfactionPing for the lead. If a pending ping exists, call recordSatisfactionReply and skip AI response.
## Acceptance Criteria
- The issue described above is resolved
- Existing functionality is not broken
- Tests pass
- **Workflow:** Dev > QC

### fix-stripe-subscriptions-table — Fix: Create Subscriptions Table for Stripe Webhook Storage

- **PRD:** PRD-FIX-STRIPE-SUBS-TABLE
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


## Phase: mvp

### fix-trial-signup-redirects-to-nonexistent-onboarding-page — Fix trial signup redirect to non-existent /dashboard/onboarding page

- **PRD:** PRD-FIX-TRIAL-SIGNUP-REDIRECT-001
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


## Phase: engine

### uc-smoke-loop-dedup — Smoke Test Loop Deduplication

- **PRD:** prd-smoke-loop-fix-v4
- **Status:** complete
- **Priority:** 1
- **Description:** Orchestrator smoke test handler must not create duplicate QC/dev tasks. When a task for a given smoke failure already completed (done/failed), the system must enforce a 2h cooldown before creating another and must properly escalate QC→dev on successive failures.
- **Acceptance Criteria:**
  - findLatestTaskByTitle method added to ~/.openclaw/genome/core/task-store.js
  - Smoke handler in heartbeat-executor.js calls findLatestTaskByTitle for dedup
  - lastTaskCreated written to smoke state after creating QC task
  - Cooldown uses lastTaskCompleted || lastTaskCreated
  - 10 consecutive failing heartbeats produce at most 1 new QC task
  - Git commit exists in ~/.openclaw/genome/ with the changes
  - .smoke-test-state.json shows lastTaskCreated for vercel-dashboard after next heartbeat
- **Workflow:** PM > Dev > QC


## Phase: stabilization

### UC-ONBOARDING-MOBILE-FIRST — Mobile-First Onboarding Redesign — Fix 86% Drop-Off

- **PRD:** PRD-REVENUE-RECOVERY-BOTTLENECK-001
- **Status:** complete
- **Priority:** 1
- **Description:** 86% of verified agents drop out before completing onboarding. Redesign UX for mobile, simplify form validation, test on 2G/4G networks.
- **Workflow:** PM > Dev > QC

### UC-EMAIL-DELIVERY-FIX — Fix Email Delivery Pipeline — Verify <30s

- **PRD:** PRD-REVENUE-RECOVERY-BOTTLENECK-001
- **Status:** complete
- **Priority:** 1
- **Description:** 26% of real agents never verify email. Debug Resend API integration, ensure emails are sent, links work, agents land on onboarding.
- **Workflow:** PM > Dev > QC

### UC-ACCOUNT-TYPE-FILTER — Isolate Real Agents from Test Accounts

- **PRD:** PRD-REVENUE-RECOVERY-BOTTLENECK-001
- **Status:** complete
- **Priority:** 1
- **Description:** Add account_type field to real_estate_agents table to separate real users from test/QC accounts. Stop test pollution of analytics (currently 91% of signups are test accounts).
- **Workflow:** PM > Dev > QC

### uc-revenue-pilot-recruitment — Pilot Recruitment Campaign Launch

- **PRD:** prd-revenue-funnel-analysis-recovery
- **Status:** ready
- **Priority:** 1
- **Description:** Facebook, Reddit, LinkedIn outreach. Target 30 pilots in 30 days. Message: Free AI lead response.
- **Workflow:** PM > Dev > QC

### uc-revenue-funnel-diagnostics — Funnel Diagnostics — Trial Activation Analysis

- **PRD:** prd-revenue-funnel-analysis-recovery
- **Status:** ready
- **Priority:** 1
- **Description:** Query trial users by activation: leads captured, SMS sent, FUB integration. Segment into Active/Onboarded/Never-activated.
- **Workflow:** PM > Dev > QC

### uc-revenue-pricing-clarity — Pricing Clarity for Trial Users

- **PRD:** prd-revenue-funnel-analysis-recovery
- **Status:** ready
- **Priority:** 1
- **Description:** Ensure pricing table visible on dashboard/onboarding. 90% of trial users can articulate what they would pay for.
- **Workflow:** PM > Dev > QC

### uc-revenue-aha-moment — Trial Aha Moment — AI Response by Day 3

- **PRD:** prd-revenue-funnel-analysis-recovery
- **Status:** ready
- **Priority:** 1
- **Description:** Guarantee 80% of trial users see AI send response to a lead by day 3. Use simulator or sample lead.
- **Workflow:** PM > Dev > QC

### uc-revenue-checkout-friction — Frictionless Stripe Checkout E2E

- **PRD:** prd-revenue-funnel-analysis-recovery
- **Status:** ready
- **Priority:** 1
- **Description:** Trial user clicks Upgrade → Stripe checkout loads → payment completes → dashboard. Test E2E.
- **Workflow:** PM > Dev > QC

### uc-revenue-email-sequence — Active Trial Conversion Email Sequence

- **PRD:** prd-revenue-funnel-analysis-recovery
- **Status:** ready
- **Priority:** 1
- **Description:** Day 0: Welcome. Day 1: AI aha. Day 3: Upgrade. Day 7: Warning. Day 14: Expired. Day 15: Final chance.
- **Workflow:** PM > Dev > QC

### uc-revenue-countdown-widget — Trial Countdown Widget & Urgency

- **PRD:** prd-revenue-funnel-analysis-recovery
- **Status:** ready
- **Priority:** 1
- **Description:** Dashboard shows trial expiration countdown. Green/yellow/red urgency indicator. Large Upgrade button.
- **Workflow:** PM > Dev > QC

### UC-AHA-MOMENT-DEMO — Implement Aha Moment Demo — No FUB Required

- **PRD:** PRD-REVENUE-RECOVERY-BOTTLENECK-001
- **Status:** ready
- **Priority:** 2
- **Description:** Show agents a live demo of AI responding to a sample lead within onboarding. Reduces friction of requiring FUB connection upfront. Demo with simulated lead, not real data.
- **Workflow:** PM > Dev > QC


## Phase: ready

### uc-revenue-alert-idempotency — Revenue Alert Idempotency & Loop Prevention

- **PRD:** prd-revenue-alert-idempotency
- **Status:** complete
- **Priority:** 1
- **Description:** When a revenue goal is off-track, the system should create ONE alert task, not duplicate it across heartbeats.
- **Workflow:** PM > Dev > QC


## Phase: now

### uc-fix-loop-detector-cooldown — Fix Loop Detector Cooldown + Apply Migration 006

- **PRD:** prd-fix-loop-detector-wave5
- **Status:** needs_merge
- **Priority:** 1
- **Description:** Three-part fix: (1) Apply genome migration 006 to local PG + seed landing page record, (2) Change loop detector dedup from status-only to 24h time window, (3) Add UC completion gate in distribution-collector.js. All 3 fixes stop the recurring distribution loop.
- **Acceptance Criteria:**
  - {"summary":"Three machine-verifiable fixes: (1) migration 006 applied to local PG with active landing_page row, (2) loop detector has 24h time-based cooldown in task-store.js, (3) UC completion gate added to distribution-collector.js. After fix: no new PM:Distribution tasks for 30+ minutes."}
- **Workflow:** Dev > QC


## Phase: planning

### uc-distribution-loop-fix — Fix Distribution Health Check Loop

- **PRD:** PRD-DISTRIBUTION-LOOP-DEDUP-FIX
- **Status:** needs_merge
- **Priority:** 1
- **Description:** Prevent duplicate PM:Distribution→Create Landing Page task spawning by adding deduplication guard and seeding distribution_channels table
- **Acceptance Criteria:**
  - distribution_channels table exists and is populated with landing page
  - Landing page record has status=active
  - createDistributionTasks() skips creation if equivalent task exists in last 7 days
  - No new duplicate PM:Distribution tasks on next heartbeat
- **Workflow:** PM > Dev > QC


## Phase: infrastructure

### uc-distribution-loop-dedup — Distribution Loop Dedup — Stop Recurring Duplicate Task Creation

- **PRD:** prd-distribution-loop-wave10
- **Status:** needs_merge
- **Priority:** 1
- **Description:** Fix distribution health check loop: (1) CREATE distribution_channels table and seed active landing page row to stop no_landing_page trigger; (2) Add deduplication guard in createDistributionTasks() in ~/.openclaw/genome/scripts/distribution-collector.js to prevent creating duplicate tasks when one is already active. See PRD-DISTRIBUTION-LOOP-DEDUP-FIX.md for full spec. THIS IS A BLOCKER — loop creates noise every heartbeat and wastes agent capacity.
- **Acceptance Criteria:**
  - distribution_channels has >= 1 active landing_page row for leadflow
  - createDistributionTasks() skips if equivalent task exists in last 7 days
  - Loop detector uses 24h cooldown (grep: cooldownStart in task-store.js)
  - Zero new PM: Distribution tasks over 3 consecutive heartbeats
- **Workflow:** PM > Dev > QC


## Phase: pilot

### UC-PILOT-DIRECT-RECRUITMENT — Direct Pilot Recruitment — 5-10 Real Agents (White-Glove)

- **PRD:** PRD-REVENUE-RECOVERY-BOTTLENECK-001
- **Status:** ready
- **Priority:** 1
- **Description:** Stojan recruits 5-10 target ICP agents from personal network + real estate groups. PM provides white-glove onboarding. Goal: validate PMF with real lead flows and get first paying customer by day 47.
- **Workflow:** PM > Dev > QC

### UC-PILOT-WHITE-GLOVE — White-Glove Pilot Onboarding Support

- **PRD:** PRD-REVENUE-RECOVERY-BOTTLENECK-001
- **Status:** ready
- **Priority:** 1
- **Description:** PM + Dev provide direct support for 5-10 pilot agents: email updates, Slack/Zoom calls, real-time debugging. Ensure all agents reach aha moment and convert to trial.
- **Workflow:** PM > Dev > QC

### fix-smoke-auth-dashboard-not-deployed — Deploy Next.js Dashboard to resolve Auth smoke failures

- **PRD:** prd-fix-smoke-auth-deploy-dashboard
- **Status:** not_started
- **Priority:** 1
- **Description:** The Next.js dashboard (product/lead-response/dashboard/) is not deployed to leadflow-ai-five.vercel.app. All auth pages return 404.
- **Acceptance Criteria:**
  - GET /login returns HTTP 200
  - GET /signup returns HTTP 200
  - POST /api/auth/trial-signup returns 200 with agentId and token
  - POST /api/auth/login returns 200 with token after valid signup
- **Workflow:** PM > Dev > QC


## Phase: Phase 2

### feat-agent-referral-program — Agent Referral Program — Viral Growth via Word-of-Mouth

- **PRD:** -
- **Status:** not_started
- **Priority:** 1
- **Description:** Real estate agents trust other agents. Add a referral system: each paid agent gets a unique referral link. When a referred agent signs up and pays for any plan, the referrer gets 1 free month. Dashboard shows referral count and earned credits. Revenue impact: each activated referrer drives 2+ new paid agents at $149/mo.
- **Acceptance Criteria:**
  - Referral link in account/settings page
  - Landing page /r/{code} tracking
  - Automatic credit on referral conversion
  - Conversion notification email to referrer
- **Workflow:** PM > Dev > QC

### feat-weekly-performance-email — Weekly AI Performance Report — Prove ROI, Drive Upgrades

- **PRD:** -
- **Status:** not_started
- **Priority:** 1
- **Description:** Every Monday, each active agent receives an email showing: leads AI responded to, average response time vs 9-min benchmark, appointments booked, estimated revenue impact. Upgrade CTA for Starter users. Revenue impact: agents who see ROI data upgrade at 3x rate — critical for Starter→Pro conversion.
- **Acceptance Criteria:**
  - Weekly email at 9am agent timezone
  - Shows lead count, response time, appointments
  - Upgrade CTA for Starter plan users
  - UTM tracking on upgrade link
- **Workflow:** PM > Dev > QC

### UC-8 — Follow-up Sequences

- **PRD:** PRD-UC8-FOLLOW-UP-SEQUENCES
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

### pm-action-items-dashboard — PM Structured Action Items for Dashboard

- **PRD:** PRD-PM-ACTION-ITEMS-DASHBOARD
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

### UC-6 — Cal.com Booking

- **PRD:** PRD-INTEGRATIONS
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

- **PRD:** PRD-CORE-SMS
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


## Phase: growth

### UC-LANDING-PAGE-V2 — Landing Page Redesign V2 — High-Converting Variant

- **PRD:** PRD-REVENUE-RECOVERY-BOTTLENECK-001
- **Status:** ready
- **Priority:** 2
- **Description:** Replace current landing page with high-converting design. ICP-focused copy, clear benefits, strong CTA to signup. A/B test active by day 47.
- **Workflow:** PM > Dev > QC


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

