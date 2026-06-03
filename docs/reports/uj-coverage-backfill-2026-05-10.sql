-- =============================================================================
-- LeadFlow UJ Coverage Backfill — 2026-05-10
-- Author: Leonida
--
-- Purpose: complete the UJ→UC graph for LeadFlow so GTM-readiness can be assessed.
-- Before this script:
--   • 4 UJs in DB. Only home-buyer-receives-ai-conversation has UCs.
--   • 386 of 398 LeadFlow UCs (97%) have no user_journey_id.
-- After this script:
--   • 11 UJs total (added 7 new).
--   • ~50 high-value UCs mapped to their primary UJ. Long-tail UCs remain
--     unmapped — genome agent's automated mapper handles those next.
--
-- The 7 new UJs each have a multi-step funnel_metrics array per §3.1.
-- Existing empty UJs (new-agent-signup, lead-response) get their
-- success_metrics fixed (currently holds migrated step data, not metrics).
-- =============================================================================

BEGIN;

-- =============================================================================
-- §1. INSERT — 7 new user_journeys
-- =============================================================================

INSERT INTO user_journeys (id, project_id, name, description, success_metrics, status, priority) VALUES

('uj-leadflow-visitor-to-signup', 'leadflow',
 'Visitor to Signup',
 'Anonymous visitor lands on the marketing site, evaluates the product (demo, pricing, FAQ), and creates an account.',
 '[
   {"step": "landing_visited",    "from": "external",         "target_rate": null,  "description": "Visitor arrives at landing page"},
   {"step": "demo_engaged",       "from": "landing_visited",  "target_rate": 0.15,  "description": "Visitor interacts with demo or simulator"},
   {"step": "signup_started",     "from": "landing_visited",  "target_rate": 0.05,  "description": "Visitor opens signup form"},
   {"step": "account_created",    "from": "signup_started",   "target_rate": 0.30,  "description": "Form submitted, account row created"}
 ]'::jsonb, 'in_progress', 1),

('uj-leadflow-agent-onboarding', 'leadflow',
 'Agent Onboarding (Post-Signup Setup)',
 'After signup the agent is guided through FUB OAuth, Twilio phone provisioning, and first configuration — gets them to ready-to-receive-leads state.',
 '[
   {"step": "first_login",        "from": "account_created",   "target_rate": 0.90,  "description": "Agent reaches dashboard after verifying email"},
   {"step": "fub_connected",      "from": "first_login",       "target_rate": 0.60,  "description": "FUB OAuth complete"},
   {"step": "phone_provisioned",  "from": "fub_connected",     "target_rate": 0.80,  "description": "Twilio number assigned to agent"},
   {"step": "wizard_complete",    "from": "phone_provisioned", "target_rate": 0.70,  "description": "Onboarding wizard finished, agent at ready state"}
 ]'::jsonb, 'in_progress', 1),

('uj-leadflow-agent-aha-moment', 'leadflow',
 'Agent Aha Moment (First AI Response Observed)',
 'Agent sees the AI handle a lead (real or simulated) for the first time — the moment that converts a curious signup into a believer.',
 '[
   {"step": "onboarded",                  "from": "wizard_complete",    "target_rate": null,  "description": "Agent has reached ready state"},
   {"step": "simulator_run",              "from": "onboarded",          "target_rate": 0.80,  "description": "Agent triggers the lead simulator at least once"},
   {"step": "first_real_lead_response",   "from": "simulator_run",      "target_rate": 0.50,  "description": "Agent observes AI replying to a real inbound lead"}
 ]'::jsonb, 'in_progress', 1),

('uj-leadflow-agent-daily-use', 'leadflow',
 'Agent Daily Use',
 'Recurring agent sessions — checking inbox, history, analytics, settings, weekly performance digest. The retention loop.',
 '[
   {"step": "monthly_active",     "from": "onboarded",        "target_rate": 0.50,  "description": "Agent logged in within last 30 days"},
   {"step": "weekly_active",      "from": "monthly_active",   "target_rate": 0.40,  "description": "Agent logged in within last 7 days"},
   {"step": "daily_active",       "from": "weekly_active",    "target_rate": 0.50,  "description": "Agent logged in within last 24h"}
 ]'::jsonb, 'in_progress', 2),

('uj-leadflow-trial-to-paid', 'leadflow',
 'Trial to Paid Conversion',
 'Trial agent reaches expiration, sees upgrade prompts, completes Stripe checkout, becomes a paying subscriber. The primary revenue journey.',
 '[
   {"step": "trial_started",      "from": "account_created",    "target_rate": null,  "description": "Trial period begins"},
   {"step": "upgrade_prompted",   "from": "trial_started",      "target_rate": 0.80,  "description": "Agent sees at least one upgrade CTA (in-product or email)"},
   {"step": "checkout_started",   "from": "upgrade_prompted",   "target_rate": 0.10,  "description": "Agent opens Stripe checkout"},
   {"step": "subscription_active","from": "checkout_started",   "target_rate": 0.70,  "description": "Checkout completed, plan_tier set"}
 ]'::jsonb, 'in_progress', 1),

('uj-leadflow-pilot-to-paid', 'leadflow',
 'Pilot Recruit to Paid (Current GTM Motion)',
 'Hand-picked pilot recruits get invited, activate the trial, and convert to paying — the current outbound GTM motion for the first paying customers.',
 '[
   {"step": "pilot_identified",   "from": "external",          "target_rate": null,  "description": "Target added to pilot_recruitment_targets"},
   {"step": "pilot_contacted",    "from": "pilot_identified",  "target_rate": 0.95,  "description": "Outreach message sent"},
   {"step": "pilot_signed_up",    "from": "pilot_contacted",   "target_rate": 0.20,  "description": "Pilot accepted invite, account created"},
   {"step": "pilot_activated",    "from": "pilot_signed_up",   "target_rate": 0.60,  "description": "Pilot onboarded + handled at least one lead"},
   {"step": "pilot_converted",    "from": "pilot_activated",   "target_rate": 0.50,  "description": "Pilot upgraded to paid plan"}
 ]'::jsonb, 'in_progress', 1),

('uj-leadflow-agent-feedback-nps', 'leadflow',
 'Agent Feedback & NPS',
 'Periodic feedback collection — NPS surveys, satisfaction pings on individual leads, free-text feedback. Closes the loop on product quality from the customer side.',
 '[
   {"step": "feedback_eligible",  "from": "agent_active",       "target_rate": null,  "description": "Agent qualifies for survey or ping"},
   {"step": "feedback_sent",      "from": "feedback_eligible",  "target_rate": 0.90,  "description": "Survey/ping delivered"},
   {"step": "feedback_responded", "from": "feedback_sent",      "target_rate": 0.30,  "description": "Agent responded"},
   {"step": "followup_actioned",  "from": "feedback_responded", "target_rate": 0.50,  "description": "Issue triaged or referral made"}
 ]'::jsonb, 'in_progress', 2);

-- =============================================================================
-- §2. UPDATE — replace migrated step-data in success_metrics for existing UJs
-- The old project.config.json journeys squashed `steps[]` into `success_metrics`.
-- Replace with funnel_metrics matching the new convention.
-- =============================================================================

UPDATE user_journeys SET
  description = 'Existing user registers a new agent account — email/password, email verify, first login. Predecessor to onboarding.',
  success_metrics = '[
    {"step": "signup_form_submitted",  "from": "visitor_landing",       "target_rate": null,  "description": "User submits signup form"},
    {"step": "account_created",        "from": "signup_form_submitted", "target_rate": 0.95,  "description": "DB row created in real_estate_agents"},
    {"step": "email_verified",         "from": "account_created",       "target_rate": 0.80,  "description": "Verification link clicked"},
    {"step": "first_login_completed",  "from": "email_verified",        "target_rate": 0.90,  "description": "Agent reaches dashboard for the first time"}
  ]'::jsonb
WHERE id = 'uj-leadflow-new-agent-signup';

UPDATE user_journeys SET
  description = 'Agent-side view of a real inbound lead arriving: agent sees the lead, watches the AI respond, can take over if needed.',
  success_metrics = '[
    {"step": "lead_arrives",           "from": "external",              "target_rate": null,  "description": "Lead lands via FUB webhook or Twilio inbound"},
    {"step": "lead_visible_in_dashboard","from":"lead_arrives",         "target_rate": 0.95,  "description": "Lead appears in agent inbox in <60s"},
    {"step": "ai_response_sent",       "from": "lead_arrives",          "target_rate": 0.90,  "description": "AI personalized SMS dispatched in <30s"},
    {"step": "agent_reviewed",         "from": "lead_visible_in_dashboard","target_rate": 0.60, "description": "Agent opened the conversation in dashboard"}
  ]'::jsonb
WHERE id = 'uj-leadflow-lead-response';

-- =============================================================================
-- §3. UPDATE — map ~50 high-value existing UCs to their primary UJ
-- One UC = one user_journey_id. When a UC could plausibly fit two UJs,
-- I pick the primary (most central) journey. The long tail (~336 unassigned)
-- stays for the genome agent's automated mapper to sweep.
-- =============================================================================

-- ── uj-leadflow-visitor-to-signup ────────────────────────────────────────────
UPDATE use_cases SET user_journey_id = 'uj-leadflow-visitor-to-signup'
WHERE id IN (
  'feat-landing-page-pre-signup-capture',
  'feat-landing-page-conversion-cleanup',
  'feat-frictionless-demo-no-fub',
  'feat-demo-without-signup',
  'feat-lead-magnet-email-capture',
  'feat-brokerage-demo-landing-page',
  'feat-shareable-demo-link-acquisition',
  'feat-fub-partner-marketplace-listing'
);

-- ── uj-leadflow-new-agent-signup ─────────────────────────────────────────────
UPDATE use_cases SET user_journey_id = 'uj-leadflow-new-agent-signup'
WHERE id IN (
  'feat-email-verification-before-login',
  'feat-auto-activation-email-on-verification',
  'feat-post-signup-redirect-to-dashboard-onboarding',
  'feat-post-signup-dashboard-onboarding-redirect',
  'feat-start-free-trial-cta',
  'feat-transactional-email-resend'
);

-- ── uj-leadflow-agent-onboarding ─────────────────────────────────────────────
UPDATE use_cases SET user_journey_id = 'uj-leadflow-agent-onboarding'
WHERE id IN (
  'feat-onboarding-fub-wizard',
  'feat-frictionless-onboarding-flow',
  'feat-post-login-onboarding-wizard',
  'feat-onboarding-completion-telemetry',
  'fix-dashboard-route-guard-missing-wizard-bypass-possib',
  'fix-dashboard-shows-banner-instead-of-auto-launching-w'
);

-- ── uj-leadflow-agent-aha-moment ─────────────────────────────────────────────
UPDATE use_cases SET user_journey_id = 'uj-leadflow-agent-aha-moment'
WHERE id IN (
  'feat-aha-moment-lead-simulator',
  'feat-frictionless-aha-no-fub-required',
  'feat-lead-experience-simulator',
  'fix-0-aha-completed-across-344-trial-users',
  'fix-onboarding-aha-moment-not-complete-agents-cannot-e',
  'UC-AHA-MOMENT-DEMO'
);

-- ── uj-leadflow-lead-response (existing UJ, was empty) ──────────────────────
UPDATE use_cases SET user_journey_id = 'uj-leadflow-lead-response'
WHERE id IN (
  'UC-1',
  'UC-2',
  'UC-3',
  'UC-4',
  'UC-7',
  'UC-8',
  'integrate-claude-ai-sms',
  'improve-UC-2-add-retry-logic',
  'fix-inbound-sms-handler-does-not-classify-satisfaction',
  'fix-sms-integration-requires-customer-owned-twilio-cre'
);

-- ── uj-leadflow-agent-daily-use ──────────────────────────────────────────────
UPDATE use_cases SET user_journey_id = 'uj-leadflow-agent-daily-use'
WHERE id IN (
  'feat-sms-analytics-dashboard',
  'feat-weekly-performance-email',
  'feat-session-analytics-pilot',
  'feat-revenue-funnel-visibility',
  'fix-active-sequences-not-visible-in-agent-dashboard',
  'feat-add-auth-middleware-to-protect-dashboard'
);

-- ── uj-leadflow-trial-to-paid ────────────────────────────────────────────────
UPDATE use_cases SET user_journey_id = 'uj-leadflow-trial-to-paid'
WHERE id IN (
  'feat-first-paying-customer-conversion-sprint',
  'feat-self-serve-stripe-checkout',
  'feat-conversion-call-booking',
  'feat-trial-activation-pipeline',
  'feat-stripe-checkout-live-end-to-end-verification',
  'feat-personal-upgrade-offer-tool',
  'feat-shareable-stripe-payment-link-admin',
  'feat-admin-force-trial-activation',
  'feat-lapsed-trial-reactivation',
  'uc-dashboard-trial-countdown',
  'feat-trial-conversion-nudge'
);

-- ── uj-leadflow-pilot-to-paid ────────────────────────────────────────────────
UPDATE use_cases SET user_journey_id = 'uj-leadflow-pilot-to-paid'
WHERE id IN (
  'feat-admin-pilot-invite-flow',
  'feat-pilot-conversion-email-sequence',
  'feat-pilot-outreach-email-blast',
  'feat-pilot-signup-follow-up-sequence',
  'feat-pilot-signup-invitation-pipeline',
  'feat-personal-outreach-to-250-verified-signups',
  'uc-pilot-conversion-sprint-direct-outreach',
  'feat-sms-upgrade-nudge-bypass-email'
);

-- ── uj-leadflow-agent-feedback-nps ───────────────────────────────────────────
UPDATE use_cases SET user_journey_id = 'uj-leadflow-agent-feedback-nps'
WHERE id IN (
  'feat-nps-survey-trial-agents',
  'feat-nps-agent-feedback',
  'feat-lead-satisfaction-feedback',
  'fix-admin-nps-page-does-not-exist-us-3-pm-dashboard-ab',
  'fix-fr5-stuck-alert-product-feedback-missing'
);

-- =============================================================================
-- VERIFICATION queries to run BEFORE COMMIT
-- =============================================================================
-- SELECT id, count(uc.id) AS uc_count FROM user_journeys uj
--   LEFT JOIN use_cases uc ON uc.user_journey_id = uj.id
--   WHERE uj.project_id='leadflow' GROUP BY uj.id ORDER BY uj.id;
-- expect: 8 UJs with >=5 UCs, 2 UJs with >=5 UCs (existing-but-empty got UCs), maintenance 1, home-buyer 12

-- SELECT count(*) FROM use_cases WHERE project_id='leadflow' AND user_journey_id IS NULL;
-- expect: 398 - 12 (home-buyer) - 1 (maintenance) - ~60 (mapped here) = ~325 unassigned for the genome agent's sweep

COMMIT;
-- ROLLBACK;
