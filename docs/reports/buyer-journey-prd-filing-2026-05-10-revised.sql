-- =============================================================================
-- LeadFlow Buyer Journey filing — REVISED for new UJ→UC→Feature→PRD→Task schema
-- Date: 2026-05-10
-- Author: Leonida (genome auditor session)
-- Schema: post-migrations 039, 040, 041 (UJ + Features + prd.kind + product_assets)
-- Supersedes: docs/reports/buyer-journey-prd-filing-2026-05-09.sql
--
-- Scope: 1 UJ + 1 strategic PRD + 12 UCs + 12 Features + 12 first-step tasks.
-- Excluded: traceability UCs — genome team owns the asset registry implementation,
--           so those UCs belong under a genome-side UJ, not LeadFlow's.
--
-- The strategic PRD docs themselves are at:
--   docs/prd/PRD-LEADFLOW-BUYER-JOURNEY-001.md (kept; will rename to EPIC-* in §A)
--   docs/prd/PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001.md (reference only — not filed)
-- =============================================================================

BEGIN;

-- =============================================================================
-- §1. USER JOURNEY — buyer's POV from inquiry to confirmed booking
-- =============================================================================
-- success_metrics uses funnel-style array per §3.1 of genome-requests-2026-05-10.
-- Each step has its own target conversion rate.
-- =============================================================================

INSERT INTO user_journeys (id, project_id, name, description, success_metrics, status, priority)
VALUES (
  'uj-leadflow-home-buyer-receives-ai-conversation',
  'leadflow',
  'Home Buyer Receives AI Conversation',
  'Real-estate buyer (mid-30s) submits inquiry online or texts agent number, expects quick human-feeling response. End-to-end AI conversation qualifies them and books a meeting via Cal.com. Detailed flow in docs/reports/buyer-journey-2026-05-05.md.',
  '[
    {"step": "lead_received",       "from": "external",          "target_rate": null,  "description": "FUB webhook OR Twilio inbound lands"},
    {"step": "initial_sms_sent",    "from": "lead_received",     "target_rate": 0.95,  "description": "Personalized AI SMS sent within 30s"},
    {"step": "lead_replied",        "from": "initial_sms_sent",  "target_rate": 0.30,  "description": "Lead responds at least once"},
    {"step": "lead_qualified",      "from": "lead_replied",      "target_rate": 0.50,  "description": "Name+location+budget+timeline captured"},
    {"step": "calcom_link_sent",    "from": "lead_qualified",    "target_rate": 0.80,  "description": "Booking link delivered when qualified"},
    {"step": "meeting_booked",      "from": "calcom_link_sent",  "target_rate": 0.40,  "description": "Buyer schedules a slot"},
    {"step": "meeting_confirmed",   "from": "meeting_booked",    "target_rate": 0.95,  "description": "Confirmation SMS delivered"},
    {"step": "buyer_attended",      "from": "meeting_confirmed", "target_rate": 0.70,  "description": "Buyer shows up to meeting"}
  ]'::jsonb,
  'in_progress',
  1
);

-- =============================================================================
-- §2. STRATEGIC PRD — covers the 12 UCs below
-- kind='strategic' so cascading verification doesn't try to apply to it.
-- =============================================================================

INSERT INTO prds (id, title, description, status, file_path, project_id, version, kind)
VALUES (
  'PRD-LEADFLOW-BUYER-JOURNEY-001',
  'Buyer Journey Integrity — Make the Promised AI Conversation Actually Work',
  'Twelve substantive UCs to close the gap between marketing promise and product reality on the home-buyer journey. Sources: docs/reports/audit-2026-05-03.md, marketing-claims-audit-2026-05-04.md, buyer-journey-2026-05-05.md. Drops items already shipped (trial-expired redirect, Vercel root config, A2P registration, email delivery, dashboard-nav workaround). Keeps: agent schema unification, FUBService AI replacement, fabricated testimonial, Claude 3.5 Sonnet copy, customization promise, tier gating, pilot_signups admin UI, logout button, admin auth, brand consolidation, take-over pause-on-agent-reply, real Reports page or honest removal.',
  'draft',
  'docs/prd/PRD-LEADFLOW-BUYER-JOURNEY-001.md',
  'leadflow',
  '1.0',
  'strategic'
);

-- =============================================================================
-- §3. USE CASES — 12, all under the buyer-journey UJ, linked to the strategic PRD
-- depends_on enforces UC-1 (Agent schema unification) as a hard prerequisite for
-- UC-2 and UC-11. order_in_journey roughly tracks the funnel position.
-- =============================================================================

INSERT INTO use_cases (id, prd_id, user_journey_id, order_in_journey, name, description, implementation_status, workflow, priority, depends_on, project_id) VALUES

-- UC-1 — the keystone, blocks UC-2 and UC-11
('uc-buyer-journey-agent-schema-unification', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 10,
 'Unify Agent TS type with real_estate_agents DB shape (mapper + view)',
 'TS Agent interface promises name/market/settings/is_active/calcom_username/fub_id; real_estate_agents has none. Build realEstateAgentRowToAgent mapper (or v_agents_canonical view), apply at every read site (getDefaultAgent in inbound-sms-service.ts and fub-webhook-service.ts, resolveAgent), update interface. Acceptance: zero is_active=true filters in inbound-sms-service; signed Twilio inbound test produces hasRequiredAgent:true.',
 'not_started', ARRAY['product','dev','qc'], 1, ARRAY[]::text[], 'leadflow'),

-- UC-2 — depends on UC-1
('uc-buyer-journey-fubservice-real-ai', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 20,
 'Replace FUBService.generateAiSmsResponse hardcoded template with real AI',
 'lib/services/FUBService.js:351 returns a templated string using process.env.AGENT_NAME. Replace with generateAgentResponse + buildSmsPrompt against the resolved agent. Acceptance: grep "matching your interests" lib/services/FUBService.js → 0; new E2E asserts outbound contains lead first name + assigned agent first name (not the env var).',
 'not_started', ARRAY['product','dev','qc'], 1, ARRAY['uc-buyer-journey-agent-schema-unification']::text[], 'leadflow'),

-- UC-3 — independent, P0 credibility
('uc-buyer-journey-remove-fake-testimonial', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 30,
 'Remove fabricated testimonials from email templates',
 'week1_checkin.html cites Michael R., Compass, San Diego with $890K deal — no such record exists. day3_tips.html cites anonymous $2.1M recovery. With 0 paying customers both are impossible. Replace with feature-only copy. Acceptance: grep "Michael R\\|890K\\|2\\.1M" email-sequence/templates/ → 0.',
 'not_started', ARRAY['product','dev','qc'], 1, ARRAY[]::text[], 'leadflow'),

-- UC-4 — independent, P0 false product claim
('uc-buyer-journey-fix-claude-sonnet-copy', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 40,
 'Replace Claude 3.5 Sonnet copy with truthful model name',
 'app/page.tsx:201 claims Claude 3.5 Sonnet. Production runs claude-3-haiku or qwen3.5-14b. Recommended: upgrade Anthropic fallback to claude-haiku-4-5, update copy. Acceptance: grep "Claude 3.5 Sonnet" product/lead-response/dashboard/app/ → 0; copy matches AI_MODEL env.',
 'not_started', ARRAY['product','dev','qc'], 1, ARRAY[]::text[], 'leadflow'),

-- UC-5
('uc-buyer-journey-customization-promise', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 50,
 'Remove "customize the tone and templates" FAQ promise (path A) — building the editor is a separate future UC',
 'FAQ promises template/tone customization with zero implementation (templates table empty, no settings UI, AI does not consult bio). Per accepted resolution: remove the sentence now, file template editor as a separate UC if customer demand surfaces. Acceptance: grep "customize the tone and templates" product/lead-response/dashboard/app/page.tsx → 0.',
 'not_started', ARRAY['product','dev','qc'], 2, ARRAY[]::text[], 'leadflow'),

-- UC-6
('uc-buyer-journey-tier-gating-or-remove', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 60,
 'Build tier feature gating in code, OR remove gated promises from pricing page',
 'Pricing claims Cal.com booking (Pro+), lead routing (Team+), API access (Pro+), white-label/SLA/AM/compliance (Brokerage). Zero enforcement. Build lib/feature-gates.ts with canUseCalcom/LeadRouting/Api/WhiteLabel; enforce in routes. Brokerage-only fluff features with no code: remove. Single source of truth lib/plans.ts. Acceptance: ≥4 enforcement sites; pricing page renders from lib/plans.ts; Starter user → 403 on Cal.com endpoint.',
 'not_started', ARRAY['product','design','dev','qc'], 2, ARRAY[]::text[], 'leadflow'),

-- UC-7
('uc-buyer-journey-pilot-signups-admin-ui', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 70,
 'Build admin UI for pilot_signups table',
 'pilot_signups holds 37+ research rows with no admin page. Build app/admin/pilot-signups/page.tsx (list + filter + click-through to invite). Add /api/admin/pilot-signups/list. Wire into admin nav. Acceptance: page loads at /admin/pilot-signups, shows rows; API returns 200.',
 'not_started', ARRAY['product','design','dev','qc'], 3, ARRAY[]::text[], 'leadflow'),

-- UC-8
('uc-buyer-journey-logout-button', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 80,
 'Wire logout button into dashboard nav user menu',
 'Backend logout exists (app/api/auth/logout/route.ts), profile page exists, no UI link to either. Add user-menu dropdown to dashboard-nav with profile link + logout. Acceptance: E2E loads /dashboard, opens user-menu, clicks logout, asserts redirect to /login + cookie cleared.',
 'not_started', ARRAY['product','design','dev','qc'], 3, ARRAY[]::text[], 'leadflow'),

-- UC-9
('uc-buyer-journey-admin-auth-standardization', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 90,
 'Standardize admin auth — pick one pattern, migrate the other two',
 'Three admin auth patterns coexist: isAdminUser (ADMIN_EMAIL), x-admin-token (ADMIN_SECRET), ApiKeyAuthService (LEADFLOW_API_KEY). Adopt ApiKeyAuthService (reusable). New helper requireAdmin() in AuthService. Migrate all admin endpoints. Delete dead env vars. Acceptance: grep "isAdminUser\\|x-admin-token" app/api/admin routes/admin → 0 outside requireAdmin itself.',
 'not_started', ARRAY['product','dev','qc'], 3, ARRAY[]::text[], 'leadflow'),

-- UC-10
('uc-buyer-journey-brand-consolidation', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 100,
 'Consolidate brand: LeadFlow AI (product) / Imagine Squared (legal) / landyourleads.com (domain)',
 'Three names coexist in user-facing surfaces. Statement descriptor set in Stripe Dashboard, not code (drift risk). Reconcile copy: home/demo/pricing/dashboard show LeadFlow AI; privacy/terms/footer mention Imagine Squared; domain stays. BillingService.createCustomer explicitly sets statement_descriptor LANDYOURLEADS. Acceptance: grep Imagine Squared in app/ outside privacy/terms/footer → 0; BillingService has statement_descriptor; new unit test asserts.',
 'not_started', ARRAY['product','dev','qc'], 3, ARRAY[]::text[], 'leadflow'),

-- UC-11 — depends on UC-1 (sequences need correct agent resolution)
('uc-buyer-journey-takeover-pause-on-agent-reply', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 110,
 'AI pauses sequences when human agent replies (FAQ promise)',
 'FAQ says "AI pauses the moment you respond." Code only pauses on lead reply. Add paused_by_agent SequenceStatus. When human agent sends outbound from inbox, mark active sequences for that lead as paused_by_agent. Add resume button. Acceptance: E2E - agent sends outbound, sequence row → paused_by_agent within 5s; next_send_at suppressed.',
 'not_started', ARRAY['product','design','dev','qc'], 3, ARRAY['uc-buyer-journey-agent-schema-unification']::text[], 'leadflow'),

-- UC-12
('uc-buyer-journey-reports-honest-removal', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'uj-leadflow-home-buyer-receives-ai-conversation', 120,
 'Remove Reports nav item until real reports feature is built',
 'PR #1523 retargeted Reports → /dashboard/analytics, hiding the 404 by aliasing. Two labels for one page is dishonest. Remove Reports from DASHBOARD_NAV_ITEMS until UC builds the real page. File real reports page as a separate UC. Acceptance: grep "label: ''Reports''" dashboard-nav.tsx → 0.',
 'not_started', ARRAY['product','dev','qc'], 3, ARRAY[]::text[], 'leadflow');

-- =============================================================================
-- §4. FEATURES — one per UC, definition_of_done derived from each UC's acceptance
-- This avoids the actuator falling tasks back to feat-leadflow-maintenance.
-- =============================================================================

INSERT INTO features (id, use_case_id, name, description, definition_of_done, status) VALUES

('feat-bj-agent-schema-unification', 'uc-buyer-journey-agent-schema-unification',
 'Agent shape mapper + canonical view',
 'realEstateAgentRowToAgent mapper applied at all read sites; TS Agent interface matches mapper output.',
 '[
   {"check": "grep -rn \".eq(''is_active'', true)\" product/lead-response/dashboard/lib/services/", "expected": "0 matches"},
   {"check": "Signed Twilio inbound to /api/webhook/twilio", "expected": "hasRequiredAgent:true in logs"},
   {"check": "Unit test for mapper", "expected": "All 8 fields populated for active agent"}
 ]'::jsonb, 'not_started'),

('feat-bj-fubservice-real-ai', 'uc-buyer-journey-fubservice-real-ai',
 'Real AI on FUB-routed first-contact SMS',
 'FUBService.handleLeadCreated calls generateAgentResponse instead of templated switch.',
 '[
   {"check": "grep \"matching your interests\" lib/services/FUBService.js", "expected": "0 matches"},
   {"check": "E2E: signed FUB webhook → outbound SMS contains lead first_name AND agent first_name (not env var)", "expected": "pass"}
 ]'::jsonb, 'not_started'),

('feat-bj-remove-fake-testimonial', 'uc-buyer-journey-remove-fake-testimonial',
 'Remove fabricated testimonials from email templates',
 'No named/dollar-amount testimonials in email-sequence/templates/ until a real verifiable customer outcome exists.',
 '[
   {"check": "grep \"Michael R\\|890K\\|2\\\\.1M\" email-sequence/templates/", "expected": "0 matches"}
 ]'::jsonb, 'not_started'),

('feat-bj-fix-claude-sonnet-copy', 'uc-buyer-journey-fix-claude-sonnet-copy',
 'Truthful model name in marketing copy',
 'Marketing copy matches the AI_MODEL actually running in production.',
 '[
   {"check": "grep \"Claude 3.5 Sonnet\" product/lead-response/dashboard/app/", "expected": "0 matches"},
   {"check": "Copy + AI_MODEL agreement", "expected": "page.tsx model name matches Vercel-prod env"}
 ]'::jsonb, 'not_started'),

('feat-bj-customization-promise', 'uc-buyer-journey-customization-promise',
 'Remove unimplemented customization FAQ promise',
 'FAQ does not promise template/tone customization while UI does not exist.',
 '[
   {"check": "grep \"customize the tone and templates\" app/page.tsx", "expected": "0 matches"}
 ]'::jsonb, 'not_started'),

('feat-bj-tier-gating-or-remove', 'uc-buyer-journey-tier-gating-or-remove',
 'Tier feature gating framework + per-feature enforcement',
 'lib/feature-gates.ts exists, ≥4 enforcement sites, pricing page renders from lib/plans.ts.',
 '[
   {"check": "grep \"canUseCalcom\\|canUseLeadRouting\\|canUseApi\" lib/ app/api/", "expected": "≥4 matches"},
   {"check": "E2E: Starter user accessing Cal.com endpoint", "expected": "403"},
   {"check": "Pricing page imports from lib/plans.ts", "expected": "single source of truth"}
 ]'::jsonb, 'not_started'),

('feat-bj-pilot-signups-admin-ui', 'uc-buyer-journey-pilot-signups-admin-ui',
 'Admin UI for pilot_signups table',
 'Admin can list, filter, and act on pilot_signups rows.',
 '[
   {"check": "GET /admin/pilot-signups (admin auth)", "expected": "200, list of rows"},
   {"check": "GET /api/admin/pilot-signups/list", "expected": "200 JSON"}
 ]'::jsonb, 'not_started'),

('feat-bj-logout-button', 'uc-buyer-journey-logout-button',
 'User menu with logout in dashboard nav',
 'Authenticated user can sign out from any dashboard page.',
 '[
   {"check": "E2E: open user-menu → click logout → redirect to /login → cookie cleared", "expected": "pass"}
 ]'::jsonb, 'not_started'),

('feat-bj-admin-auth-standardization', 'uc-buyer-journey-admin-auth-standardization',
 'Single admin auth pattern (requireAdmin) across all admin endpoints',
 'All app/api/admin/** and routes/admin/** import requireAdmin; alternate patterns deleted.',
 '[
   {"check": "grep \"isAdminUser\\|x-admin-token\" app/api/admin routes/admin", "expected": "0 outside requireAdmin"},
   {"check": "Unused env vars (ADMIN_EMAIL, ADMIN_SECRET) deleted from code + .env.example", "expected": "no references"}
 ]'::jsonb, 'not_started'),

('feat-bj-brand-consolidation', 'uc-buyer-journey-brand-consolidation',
 'Single brand hierarchy (LeadFlow AI / Imagine Squared / landyourleads)',
 'User-facing pages use LeadFlow AI; legal pages mention Imagine Squared; statement_descriptor set in code.',
 '[
   {"check": "grep \"Imagine Squared\" app/ outside privacy/terms/footer", "expected": "0 matches"},
   {"check": "BillingService.createCustomer sets statement_descriptor", "expected": "≥1 match"},
   {"check": "Unit test asserts descriptor", "expected": "pass"}
 ]'::jsonb, 'not_started'),

('feat-bj-takeover-pause-on-agent-reply', 'uc-buyer-journey-takeover-pause-on-agent-reply',
 'AI pauses sequences when human agent sends outbound',
 'paused_by_agent SequenceStatus + handler when agent replies + resume button.',
 '[
   {"check": "E2E: agent sends outbound → sequence status flips to paused_by_agent within 5s", "expected": "pass"},
   {"check": "next_send_at suppressed for paused_by_agent rows", "expected": "no scheduled sends"}
 ]'::jsonb, 'not_started'),

('feat-bj-reports-honest-removal', 'uc-buyer-journey-reports-honest-removal',
 'Remove Reports nav alias',
 'Reports label removed from DASHBOARD_NAV_ITEMS until real Reports feature is built.',
 '[
   {"check": "grep \"label: ''Reports''\" product/lead-response/dashboard/app/dashboard/dashboard-nav.tsx", "expected": "0 matches"}
 ]'::jsonb, 'not_started');

-- =============================================================================
-- §5. FIRST-STEP TASKS — one per UC, agent_id = workflow[0], with feature_id set
-- Tasks for UCs that depend on UC-1 will be blocked at spawn-time per
-- core/spawn-preparer.js:177 until UC-1 is complete. That's the desired behavior.
-- =============================================================================

INSERT INTO tasks (title, description, project_id, agent_id, status, priority, use_case_id, feature_id, version, metadata)
SELECT
  'PM: ' || uc.id || ' - ' || uc.name,
  uc.description,
  uc.project_id,
  uc.workflow[1],
  'ready',
  uc.priority,
  uc.id,
  f.id,
  '1.0',
  jsonb_build_object('created_by', 'manual-prd-filing', 'prd_id', uc.prd_id, 'filing_date', '2026-05-10')
FROM use_cases uc
JOIN features f ON f.use_case_id = uc.id
WHERE uc.user_journey_id = 'uj-leadflow-home-buyer-receives-ai-conversation'
  AND f.id LIKE 'feat-bj-%';

-- =============================================================================
-- §A. RENAME LOCAL PRD DOC — strategic PRDs follow EPIC- prefix per spec §3.3
-- This is a separate command (file rename), not SQL. After running this script:
--   git mv docs/prd/PRD-LEADFLOW-BUYER-JOURNEY-001.md docs/prd/EPIC-LEADFLOW-BUYER-JOURNEY-001.md
--   UPDATE prds SET file_path='docs/prd/EPIC-LEADFLOW-BUYER-JOURNEY-001.md'
--                   WHERE id='PRD-LEADFLOW-BUYER-JOURNEY-001';
-- (Per genome's 040 backfill, kind is already strategic from title match.)
-- =============================================================================

-- =============================================================================
-- VERIFICATION queries to run BEFORE COMMIT (or after, then ROLLBACK if wrong)
-- =============================================================================
-- SELECT count(*) FROM user_journeys WHERE id = 'uj-leadflow-home-buyer-receives-ai-conversation';                  -- expect 1
-- SELECT count(*) FROM prds WHERE id = 'PRD-LEADFLOW-BUYER-JOURNEY-001' AND kind = 'strategic';                     -- expect 1
-- SELECT count(*) FROM use_cases WHERE user_journey_id = 'uj-leadflow-home-buyer-receives-ai-conversation';         -- expect 12
-- SELECT count(*) FROM features WHERE id LIKE 'feat-bj-%';                                                          -- expect 12
-- SELECT count(*) FROM tasks WHERE metadata->>'prd_id' = 'PRD-LEADFLOW-BUYER-JOURNEY-001';                          -- expect 12
-- SELECT count(*) FROM use_cases WHERE 'uc-buyer-journey-agent-schema-unification' = ANY(depends_on);               -- expect 2 (UC-2 + UC-11)

COMMIT;
-- ROLLBACK;

-- =============================================================================
-- POST-FILING NOTES
-- =============================================================================
-- 1. UC-2 (FUBService AI) and UC-11 (take-over) tasks will sit at status='ready'
--    but be blocked at spawn-time until UC-1 (Agent schema unification) flips to
--    implementation_status='complete'. This is the new depends_on enforcement
--    behavior in core/spawn-preparer.js:177. Expected and correct.
--
-- 2. Cascading verification (PRD spec → Feature DoD → UC AC → UJ metrics) is
--    expected behavior of the new schema; the genome's verification path is
--    not yet wired (per the 040 migration's note that cascading "applies only
--    to technical PRDs"). Watch for the genome team to land that.
--
-- 3. The Product Asset Traceability work is being done by the genome team. The
--    LeadFlow side will get integration UCs once the asset_kinds config + sensor
--    are ready in the genome. Tracked separately, NOT filed in this script.
--
-- 4. ⚠️ Flagging back to genome team:
--    The migration of project.config.json → user_journeys appears to have stored
--    the old `steps[]` array in `success_metrics` for uj-leadflow-new-agent-signup
--    and uj-leadflow-lead-response. success_metrics should hold metrics, not steps.
--    Worth either re-migrating those journeys or accepting the squash and adding
--    a `steps` field. Filed in a separate quick note (see Telegram).
-- =============================================================================
