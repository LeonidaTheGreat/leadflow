# UC Verified: fix-no-urgency-or-scarcity-mechanism

**Verified:** 2026-07-21  
**Task:** 23e7586c-e60e-4622-bf16-8ba4ae549a7a  
**UC Status:** complete

## Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Urgency banner visible on landing page | ✅ | `product/lead-response/dashboard/app/page.tsx` lines 65-71, `data-testid="urgency-banner"` |
| Scarcity signal present | ✅ | "Only 10 pilot spots remaining. Join today to lock in 20% lifetime pricing." |

## E2E Tests (all pass)

`tests/e2e/fix-no-urgency-or-scarcity-mechanism.test.js` — 4/4 passed:
- Landing page includes urgency banner container
- Landing page includes explicit scarcity count and pilot wording
- Landing page includes CTA urgency trigger (Apply Now)
- Landing page includes pricing lock-in FOMO trigger

## Commits

- `a3fdf857` — fix: align urgency banner text and regression test (#1878) — 2026-07-16
- `ba14031e` — Improve: uc_no_tasks — fix-no-urgency-or-scarcity-mechanism #1302 — 2026-04-24
