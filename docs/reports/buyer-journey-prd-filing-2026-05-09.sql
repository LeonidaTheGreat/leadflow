-- =============================================================================
-- Filing inserts for PRD-LEADFLOW-BUYER-JOURNEY-001 + PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001
-- Date: 2026-05-09
-- Author: Leonida (genome auditor session)
--
-- Review before running. Two PRDs, 19 UCs (12 product + 7 traceability),
-- 19 first-step tasks. Wraps in a transaction so it all-or-nothings.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PRD ROWS
-- =============================================================================

INSERT INTO prds (id, title, description, status, file_path, project_id, version)
VALUES (
  'PRD-LEADFLOW-BUYER-JOURNEY-001',
  'Buyer Journey Integrity — Make the Promised AI Conversation Actually Work',
  'Twelve substantive UCs to close the gap between marketing promise and product reality on the home-buyer journey. Source: audit-2026-05-03, marketing-claims-audit-2026-05-04, buyer-journey-2026-05-05. Drops items already shipped (trial-expired redirect, Vercel root config, A2P registration, email delivery, dashboard-nav workaround). Keeps: agent schema/type unification, FUBService AI replacement, fabricated testimonial, Claude 3.5 Sonnet copy, customization promise, tier gating, pilot_signups admin UI, logout button, admin auth standardization, brand consolidation, take-over pause-on-agent-reply, real Reports page or honest removal.',
  'draft',
  'docs/prd/PRD-LEADFLOW-BUYER-JOURNEY-001.md',
  'leadflow',
  '1.0'
);

INSERT INTO prds (id, title, description, status, file_path, project_id, version)
VALUES (
  'PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001',
  'Product Asset Registry — Every Visible Thing Tied to a UJ/UC/PRD/Task with an Instant Status',
  'Registry that ties every user-visible asset (page, nav-item, button, claim, testimonial, FAQ-answer, tier-feature, email-template, schema-table, route) to its source UJ/UC/PRD/Task and assigns a status (stub/duplicate/wrong/correct/verified/orphan) with evidence. Static crawler + tagged inline + scheduled evidence runner + PR gate + dashboard panel. Companion to PRD-LEADFLOW-BUYER-JOURNEY-001: prevents the failure modes that PRD fixes from recurring invisibly.',
  'draft',
  'docs/prd/PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001.md',
  'leadflow',
  '1.0'
);

-- =============================================================================
-- USE CASES — Buyer Journey PRD (12)
-- All linked to PRD-LEADFLOW-BUYER-JOURNEY-001 via prd_id.
-- Workflow defaults: ['product','dev','qc'] for fixes, ['product','design','dev','qc']
-- for features. Priority 1 = P0 blocker, 2 = P1, 3 = P2.
-- =============================================================================

INSERT INTO use_cases (id, prd_id, name, description, implementation_status, workflow, priority, project_id) VALUES
('uc-buyer-journey-agent-schema-unification', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Unify Agent TS type with real_estate_agents DB shape (mapper + view)',
 'TS Agent interface promises name/market/settings/is_active/calcom_username/fub_id; real_estate_agents has none. Build realEstateAgentRowToAgent mapper (or v_agents_canonical view), apply at every read site (getDefaultAgent, resolveAgent), update interface. Acceptance: zero is_active=true filters in inbound-sms-service; signed Twilio inbound test produces hasRequiredAgent:true.',
 'not_started', ARRAY['product','dev','qc'], 1, 'leadflow'),

('uc-buyer-journey-fubservice-real-ai', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Replace FUBService.generateAiSmsResponse hardcoded template with real AI',
 'lib/services/FUBService.js:351 returns a templated string using process.env.AGENT_NAME. Replace with generateAgentResponse + buildSmsPrompt against the resolved agent. Acceptance: grep "matching your interests" lib/services/FUBService.js → 0; new E2E asserts outbound contains lead first name + assigned agent first name.',
 'not_started', ARRAY['product','dev','qc'], 1, 'leadflow'),

('uc-buyer-journey-remove-fake-testimonial', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Remove fabricated testimonials from email templates',
 'week1_checkin.html cites Michael R., Compass, San Diego with $890K deal — no such record exists. day3_tips.html cites anonymous $2.1M recovery. With 0 paying customers both are impossible. Replace with feature-only copy. Acceptance: grep "Michael R\\|890K\\|2\\.1M" email-sequence/templates/ → 0.',
 'not_started', ARRAY['product','dev','qc'], 1, 'leadflow'),

('uc-buyer-journey-fix-claude-sonnet-copy', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Replace Claude 3.5 Sonnet copy with truthful model name',
 'app/page.tsx:201 claims Claude 3.5 Sonnet. Production runs claude-3-haiku or qwen3.5-14b. Recommended: upgrade Anthropic fallback to claude-haiku-4-5, update copy. Acceptance: grep "Claude 3.5 Sonnet" product/lead-response/dashboard/app/ → 0; copy matches AI_MODEL env.',
 'not_started', ARRAY['product','dev','qc'], 1, 'leadflow'),

('uc-buyer-journey-customization-promise', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Remove "customize the tone and templates" FAQ promise OR build the surface',
 'FAQ promises template/tone customization with zero implementation (templates table empty, no settings UI, AI does not consult bio). Recommended: remove the sentence now, file template editor as a separate UC. Acceptance: grep "customize the tone and templates" app/page.tsx → 0.',
 'not_started', ARRAY['product','dev','qc'], 2, 'leadflow'),

('uc-buyer-journey-tier-gating-or-remove', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Build tier feature gating in code, OR remove gated promises from pricing page',
 'Pricing claims Cal.com booking (Pro+), lead routing (Team+), API access (Pro+), white-label/SLA/AM/compliance (Brokerage). Zero enforcement. Build lib/feature-gates.ts with canUseCalcom/LeadRouting/Api/WhiteLabel; enforce in routes. Brokerage-only fluff features with no code: remove. Single source of truth lib/plans.ts. Acceptance: ≥4 enforcement sites; pricing page renders from lib/plans.ts; Starter user → 403 on Cal.com endpoint.',
 'not_started', ARRAY['product','design','dev','qc'], 2, 'leadflow'),

('uc-buyer-journey-pilot-signups-admin-ui', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Build admin UI for pilot_signups table',
 'pilot_signups holds 37+ research rows with no admin page. Build app/admin/pilot-signups/page.tsx (list + filter + click-through to invite). Add /api/admin/pilot-signups/list. Wire into admin nav. Acceptance: page loads at /admin/pilot-signups, shows rows; API returns 200.',
 'not_started', ARRAY['product','design','dev','qc'], 3, 'leadflow'),

('uc-buyer-journey-logout-button', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Wire logout button into dashboard nav user menu',
 'Backend logout exists (app/api/auth/logout/route.ts), profile page exists, no UI link to either. Add user-menu dropdown to dashboard-nav with profile link + logout. Acceptance: E2E loads /dashboard, opens user-menu, clicks logout, asserts redirect to /login + cookie cleared.',
 'not_started', ARRAY['product','design','dev','qc'], 3, 'leadflow'),

('uc-buyer-journey-admin-auth-standardization', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Standardize admin auth — pick one pattern, migrate the other two',
 'Three admin auth patterns coexist: isAdminUser (ADMIN_EMAIL), x-admin-token (ADMIN_SECRET), ApiKeyAuthService (LEADFLOW_API_KEY). Adopt ApiKeyAuthService (reusable). New helper requireAdmin() in AuthService. Migrate all admin endpoints. Delete dead env vars. Acceptance: grep "isAdminUser\\|x-admin-token" app/api/admin routes/admin → 0 outside requireAdmin itself.',
 'not_started', ARRAY['product','dev','qc'], 3, 'leadflow'),

('uc-buyer-journey-brand-consolidation', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Consolidate brand: LeadFlow AI (product) / Imagine Squared (legal) / landyourleads.com (domain)',
 'Three names coexist in user-facing surfaces. Statement descriptor set in Stripe Dashboard, not code (drift risk). Reconcile copy: home/demo/pricing/dashboard show LeadFlow AI; privacy/terms/footer mention Imagine Squared; domain stays. BillingService.createCustomer explicitly sets statement_descriptor LANDYOURLEADS. Acceptance: grep Imagine Squared in app/ outside privacy/terms/footer → 0; BillingService has statement_descriptor; new unit test asserts.',
 'not_started', ARRAY['product','dev','qc'], 3, 'leadflow'),

('uc-buyer-journey-takeover-pause-on-agent-reply', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'AI pauses sequences when human agent replies (FAQ promise)',
 'FAQ says "AI pauses the moment you respond." Code only pauses on lead reply. Add paused_by_agent SequenceStatus. When human agent sends outbound from inbox, mark active sequences for that lead as paused_by_agent. Add resume button. Acceptance: E2E - agent sends outbound, sequence row → paused_by_agent within 5s; next_send_at suppressed.',
 'not_started', ARRAY['product','design','dev','qc'], 3, 'leadflow'),

('uc-buyer-journey-reports-honest-removal', 'PRD-LEADFLOW-BUYER-JOURNEY-001',
 'Remove Reports nav item until real reports feature is built',
 'PR #1523 retargeted Reports → /dashboard/analytics, hiding the 404 by aliasing. Two labels for one page is dishonest. Remove Reports from DASHBOARD_NAV_ITEMS until UC builds the real page. File real reports page as a separate UC. Acceptance: grep "label: ''Reports''" dashboard-nav.tsx → 0.',
 'not_started', ARRAY['product','dev','qc'], 3, 'leadflow');

-- =============================================================================
-- USE CASES — Traceability PRD (7)
-- =============================================================================

INSERT INTO use_cases (id, prd_id, name, description, implementation_status, workflow, priority, project_id) VALUES
('uc-traceability-schema-migration', 'PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001',
 'Create product_assets table + migration',
 'Schema per PRD §Schema. Adds product_assets with FKs to prds, use_cases, tasks. Migration goes in genome migrations next number. Acceptance: \\d product_assets returns schema; migration is idempotent.',
 'not_started', ARRAY['product','dev','qc'], 1, 'leadflow'),

('uc-traceability-static-crawler', 'PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001',
 'Static asset crawler — populate product_assets from repo',
 'scripts/asset-crawler.js parses nav arrays, claim regexes, testimonial blocks, CREATE TABLEs, route definitions. Emits (asset_id, kind, location, text). UPSERT into product_assets. Runs every heartbeat. Acceptance: <30s run, ≥100 assets, idempotent.',
 'not_started', ARRAY['product','dev','qc'], 1, 'leadflow'),

('uc-traceability-evidence-runner', 'PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001',
 'Evidence runner — verify each asset against its kind template',
 'scripts/asset-evidence-runner.js: per kind, runs default evidence (HTTP probe, regex check, DB cross-ref, code-grep). Updates status + last_verified_at + evidence. Failures auto-create Fix tasks. P0 claims first. Acceptance: every asset gets a status update; evidence failures spawn Fix tasks.',
 'not_started', ARRAY['product','dev','qc'], 1, 'leadflow'),

('uc-traceability-pr-gate', 'PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001',
 'PR gate — block merges that introduce orphan assets',
 'lib/middleware/asset-gate.js + integration into quality-audit.js. Crawls PR diff. New asset without source_uc_id/source_prd_id → fail. Modified claim text without evidence update → fail. Acceptance: test PR with orphan → CI fail; tagged PR → pass.',
 'not_started', ARRAY['product','dev','qc'], 2, 'leadflow'),

('uc-traceability-dashboard-panel', 'PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001',
 'Add Product Assets panel to orchestration dashboard',
 'New section on ~/.openclaw/dashboard/dashboard.html. Summary counts (verified/wrong/stub/orphan/duplicate). Top issues list. Click asset → sidebar with trace chain + evidence + status history. Fed by /api/assets/list via PostgREST. Acceptance: dashboard loads, shows summary, click drills in.',
 'not_started', ARRAY['product','design','dev','qc'], 2, 'leadflow'),

('uc-traceability-backfill', 'PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001',
 'Backfill product_assets for existing LeadFlow product',
 'One-time script walks current code, emits ~200-300 assets. For each, derives source_uc_id from git blame → commit → task → UC. Manual review for orphans. Acceptance: ≥90% of detected assets have source_uc_id; orphans listed for human review.',
 'not_started', ARRAY['product','dev','qc'], 2, 'leadflow'),

('uc-traceability-inline-tagging', 'PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001',
 'Inline tagging convention (data-trace-* attrs)',
 'Add data-trace-uc, data-trace-prd HTML attributes. Update CONTRIBUTING.md / agent prompts to require them on new user-visible elements. Playwright crawler reads them. Acceptance: ≥1 tagged asset, PR template asks "is this asset tagged?".',
 'not_started', ARRAY['product','dev','qc'], 3, 'leadflow');

-- =============================================================================
-- FIRST-STEP TASKS — one per UC, agent_id = workflow[0]
-- =============================================================================
-- NOTE: model + estimated_cost will be set by the orchestrator on pickup.
-- We populate the minimum required fields. Each task points at its UC and is
-- 'ready' so the spawn consumer can pick it up.
-- =============================================================================

INSERT INTO tasks (title, description, project_id, agent_id, status, priority, use_case_id, metadata)
SELECT
  'PM: ' || uc.id || ' - ' || uc.name,
  uc.description,
  uc.project_id,
  uc.workflow[1],
  'ready',
  uc.priority,
  uc.id,
  jsonb_build_object('created_by', 'manual-prd-filing', 'prd_id', uc.prd_id)
FROM use_cases uc
WHERE uc.id IN (
  'uc-buyer-journey-agent-schema-unification',
  'uc-buyer-journey-fubservice-real-ai',
  'uc-buyer-journey-remove-fake-testimonial',
  'uc-buyer-journey-fix-claude-sonnet-copy',
  'uc-buyer-journey-customization-promise',
  'uc-buyer-journey-tier-gating-or-remove',
  'uc-buyer-journey-pilot-signups-admin-ui',
  'uc-buyer-journey-logout-button',
  'uc-buyer-journey-admin-auth-standardization',
  'uc-buyer-journey-brand-consolidation',
  'uc-buyer-journey-takeover-pause-on-agent-reply',
  'uc-buyer-journey-reports-honest-removal',
  'uc-traceability-schema-migration',
  'uc-traceability-static-crawler',
  'uc-traceability-evidence-runner',
  'uc-traceability-pr-gate',
  'uc-traceability-dashboard-panel',
  'uc-traceability-backfill',
  'uc-traceability-inline-tagging'
);

-- =============================================================================
-- COMMIT or ROLLBACK — review the row counts first
-- =============================================================================
-- After running this script, verify:
--   SELECT count(*) FROM prds WHERE id LIKE 'PRD-LEADFLOW-%-001';     -- expect 2
--   SELECT count(*) FROM use_cases WHERE prd_id LIKE 'PRD-LEADFLOW-%-001';  -- expect 19
--   SELECT count(*) FROM tasks WHERE use_case_id LIKE 'uc-buyer-journey-%' OR use_case_id LIKE 'uc-traceability-%';  -- expect 19
-- If any number is wrong, ROLLBACK and investigate.

COMMIT;
-- ROLLBACK;
