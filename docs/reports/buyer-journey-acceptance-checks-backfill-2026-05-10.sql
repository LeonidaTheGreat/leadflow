-- =============================================================================
-- Backfill use_cases.acceptance_checks for the 12 buyer-journey UCs.
-- Date: 2026-05-10
-- Reason: post-audit found that features.definition_of_done is dormant code in
-- the genome. The only working verification gate is use_cases.acceptance_checks
-- (read by core/loops/execution-loop.js:362). My 12 UCs were filed with empty
-- acceptance_checks → would false-complete on task-done counts alone.
--
-- Each check shape: {id, command, expected}.
-- The genome runs `command` from project_dir, .trim()s output, requires strict
-- equality with `expected`. Commands chosen to produce clean, predictable strings.
-- =============================================================================

BEGIN;

-- UC-1 — Agent schema/type unification
UPDATE use_cases SET acceptance_checks = '[
  {"id": "no-is-active-filter", "command": "grep -r \".eq(''is_active'', true)\" product/lead-response/dashboard/lib/services/ | wc -l | tr -d '' ''", "expected": "0"}
]'::jsonb
WHERE id = 'uc-buyer-journey-agent-schema-unification';

-- UC-2 — Replace FUBService.generateAiSmsResponse
UPDATE use_cases SET acceptance_checks = '[
  {"id": "no-template-string", "command": "grep -c \"matching your interests\" lib/services/FUBService.js", "expected": "0"}
]'::jsonb
WHERE id = 'uc-buyer-journey-fubservice-real-ai';

-- UC-3 — Remove fabricated testimonials
UPDATE use_cases SET acceptance_checks = '[
  {"id": "no-michael-r", "command": "grep -rE \"Michael R\\.|\\$890K|\\$2\\.1M\" email-sequence/templates/ | wc -l | tr -d '' ''", "expected": "0"}
]'::jsonb
WHERE id = 'uc-buyer-journey-remove-fake-testimonial';

-- UC-4 — Replace Claude 3.5 Sonnet copy
UPDATE use_cases SET acceptance_checks = '[
  {"id": "no-sonnet-claim", "command": "grep -r \"Claude 3.5 Sonnet\" product/lead-response/dashboard/app/ | wc -l | tr -d '' ''", "expected": "0"}
]'::jsonb
WHERE id = 'uc-buyer-journey-fix-claude-sonnet-copy';

-- UC-5 — Remove customization promise
UPDATE use_cases SET acceptance_checks = '[
  {"id": "no-customization-promise", "command": "grep -c \"customize the tone and templates\" product/lead-response/dashboard/app/page.tsx", "expected": "0"}
]'::jsonb
WHERE id = 'uc-buyer-journey-customization-promise';

-- UC-6 — Tier gating framework
UPDATE use_cases SET acceptance_checks = '[
  {"id": "feature-gates-exist", "command": "test -f product/lead-response/dashboard/lib/feature-gates.ts && echo exists || echo missing", "expected": "exists"},
  {"id": "gating-call-sites", "command": "grep -rE \"canUseCalcom|canUseLeadRouting|canUseApi\" product/lead-response/dashboard/lib/ product/lead-response/dashboard/app/api/ | wc -l | awk ''{ if ($1>=4) print \"pass\"; else print \"fail\" }''", "expected": "pass"}
]'::jsonb
WHERE id = 'uc-buyer-journey-tier-gating-or-remove';

-- UC-7 — pilot_signups admin UI
UPDATE use_cases SET acceptance_checks = '[
  {"id": "admin-page-exists", "command": "test -f product/lead-response/dashboard/app/admin/pilot-signups/page.tsx && echo exists || echo missing", "expected": "exists"},
  {"id": "list-api-exists", "command": "test -f product/lead-response/dashboard/app/api/admin/pilot-signups/list/route.ts && echo exists || echo missing", "expected": "exists"}
]'::jsonb
WHERE id = 'uc-buyer-journey-pilot-signups-admin-ui';

-- UC-8 — Logout button
UPDATE use_cases SET acceptance_checks = '[
  {"id": "logout-testid", "command": "grep -rE \"data-testid=[\\\"'']logout[\\\"'']\" product/lead-response/dashboard/app/dashboard/ | wc -l | awk ''{ if ($1>=1) print \"pass\"; else print \"fail\" }''", "expected": "pass"}
]'::jsonb
WHERE id = 'uc-buyer-journey-logout-button';

-- UC-9 — Admin auth standardization
UPDATE use_cases SET acceptance_checks = '[
  {"id": "no-stale-admin-patterns", "command": "grep -rE \"isAdminUser|x-admin-token\" product/lead-response/dashboard/app/api/admin/ routes/admin/ 2>/dev/null | grep -v \"requireAdmin\" | wc -l | tr -d '' ''", "expected": "0"}
]'::jsonb
WHERE id = 'uc-buyer-journey-admin-auth-standardization';

-- UC-10 — Brand consolidation
UPDATE use_cases SET acceptance_checks = '[
  {"id": "no-imagine-squared-outside-legal", "command": "grep -r \"Imagine Squared\" product/lead-response/dashboard/app/ | grep -vE \"privacy|terms|footer\" | wc -l | tr -d '' ''", "expected": "0"},
  {"id": "stripe-statement-descriptor-set", "command": "grep -c \"statement_descriptor\" lib/services/BillingService.js", "expected": "1"}
]'::jsonb
WHERE id = 'uc-buyer-journey-brand-consolidation';

-- UC-11 — Take-over: AI pauses on agent reply
UPDATE use_cases SET acceptance_checks = '[
  {"id": "paused-by-agent-status", "command": "grep -c \"paused_by_agent\" product/lead-response/dashboard/lib/types/sequences.ts", "expected": "1"}
]'::jsonb
WHERE id = 'uc-buyer-journey-takeover-pause-on-agent-reply';

-- UC-12 — Reports nav honest removal
UPDATE use_cases SET acceptance_checks = '[
  {"id": "no-reports-nav-label", "command": "grep -c \"label: ''Reports''\" product/lead-response/dashboard/app/dashboard/dashboard-nav.tsx", "expected": "0"}
]'::jsonb
WHERE id = 'uc-buyer-journey-reports-honest-removal';

-- =============================================================================
-- Verification — every UC should now have ≥1 acceptance_check
-- =============================================================================

-- SELECT id, jsonb_array_length(acceptance_checks) AS n_checks
-- FROM use_cases
-- WHERE user_journey_id = 'uj-leadflow-home-buyer-receives-ai-conversation'
-- ORDER BY id;

COMMIT;
-- ROLLBACK;
