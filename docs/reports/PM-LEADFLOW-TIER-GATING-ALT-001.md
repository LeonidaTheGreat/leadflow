# PM-LEADFLOW-TIER-GATING-ALT-001

Task: `0031b150-36d9-4028-b828-a655dfc25f47`
Use case: `uc-buyer-journey-tier-gating-or-remove`
Diagnosis category: `needs_alternative_approach`
Date: 2026-05-23

## Product State
- Mission: active/scale.
- UC state: `in_progress`.
- Top stated conversion risk: pricing promises exceed enforced capabilities.

## Why Prior Approach Failed
1. Prior implementation became stranded after PR `#1680` closure (`last_error`: safety-net cleanup).
2. Retries kept targeting a broad cross-app refactor instead of smallest shippable conversion fix.
3. Scope coupled three hard changes: pricing content rewrite + shared plan abstraction + multi-route backend enforcement.

## New Strategy
1. Phase 1 (P1, immediate): remove unenforced gated promises from pricing copy/table only.
2. Phase 2 (new follow-up UC): add minimal deterministic gating for Cal.com connect and API key creation only.
3. Explicit constraint: no global plan abstraction in MVP pass; max three files touched in Phase 1.

## DB Updates Applied
- `use_cases.description` rewritten with phased strategy and acceptance criteria.
- `use_cases.priority` raised from `2` to `1`.
- `use_cases.metadata.respec` set with root cause + evidence.
