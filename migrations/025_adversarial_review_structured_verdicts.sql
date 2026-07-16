-- Migration 025: Adversarial Review Phase 0 — Structured Verdict Schema
-- SPEC: SPEC-ADVERSARIAL-REVIEW-001
-- Adds structured verdict fields to code_reviews for cross-model refutation review.

-- verdict: the QC outcome enum (pass, pass_with_nits, concerns)
ALTER TABLE code_reviews ADD COLUMN IF NOT EXISTS verdict TEXT
  CHECK (verdict IN ('pass', 'pass_with_nits', 'concerns'));

-- rubric: structured JSON scoring {gap_closure, correctness, dead_code, drift}
-- each key maps to {ok: bool, note: text}
ALTER TABLE code_reviews ADD COLUMN IF NOT EXISTS rubric JSONB;

-- patch_id: git patch-id --stable of the full diff vs merge-base (Rule 2 binding)
ALTER TABLE code_reviews ADD COLUMN IF NOT EXISTS patch_id TEXT;

-- reviewer_model: which model performed the review (for cross-provider tracking)
ALTER TABLE code_reviews ADD COLUMN IF NOT EXISTS reviewer_model TEXT;

-- review_duration_ms: wall-clock time of the QC run (Rule 4 timing floor)
ALTER TABLE code_reviews ADD COLUMN IF NOT EXISTS review_duration_ms INTEGER;

-- dissent_agreed: whether the dissent judge agreed with the primary verdict
ALTER TABLE code_reviews ADD COLUMN IF NOT EXISTS dissent_agreed BOOLEAN;

-- Indexes for shadow rule queries
CREATE INDEX IF NOT EXISTS idx_code_reviews_patch_id
  ON code_reviews (patch_id) WHERE patch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_code_reviews_patch_id_verdict
  ON code_reviews (patch_id, verdict) WHERE patch_id IS NOT NULL AND verdict IS NOT NULL;
