-- Migration 008: Add project_id to hierarchy tables (prds, use_cases, e2e_test_specs)
-- Enables multi-project support — each orchestrator instance processes its own project's UCs.
-- Backfills existing rows to 'bo2026'.

ALTER TABLE prds ADD COLUMN IF NOT EXISTS project_id TEXT;
UPDATE prds SET project_id = 'bo2026' WHERE project_id IS NULL;

ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS project_id TEXT;
UPDATE use_cases SET project_id = 'bo2026' WHERE project_id IS NULL;

ALTER TABLE e2e_test_specs ADD COLUMN IF NOT EXISTS project_id TEXT;
UPDATE e2e_test_specs SET project_id = 'bo2026' WHERE project_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_prds_project_id ON prds(project_id);
CREATE INDEX IF NOT EXISTS idx_use_cases_project_id ON use_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_e2e_test_specs_project_id ON e2e_test_specs(project_id);
