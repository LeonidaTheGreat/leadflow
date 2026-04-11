<!-- AUTO-GENERATED — DO NOT EDIT. Run `node scripts/generate-schema-docs.js` to regenerate. -->
# Schema: Orchestration

> Tasks, use cases, PRDs, code reviews, product decisions, system tables
> Generated: 2026-04-11T22:17:52.146Z | 15 tables

[← Back to SCHEMA.md](../SCHEMA.md)

## Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `tasks` | 3898 | |
| `task_dependencies` | 48 | |
| `task_outcomes` | 0 | |
| `completed_work` | 9 | |
| `action_items` | 242 | |
| `use_cases` | 341 | |
| `prds` | 152 | |
| `e2e_test_specs` | 438 | |
| `code_reviews` | 1153 | |
| `product_feedback` | 47 | |
| `product_reviews` | 183 | |
| `product_decisions` | 42 | |
| `schema_migrations` | 12 | |
| `weekly_performance_reports` | 0 | |
| `weekly_performance_email_logs` | 0 | |

---

## Column Details

### tasks

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | uuid_generate_v4() |
| title | text | no | - |
| description | text | yes | - |
| project_id | text | yes | 'leadflow'::text |
| agent_id | text | yes | - |
| model | text | yes | 'kimi'::text |
| status | text | yes | 'backlog'::text |
| priority | integer | yes | 3 |
| estimated_cost_usd | numeric | yes | 0.00 |
| actual_cost_usd | numeric | yes | 0.00 |
| estimated_hours | numeric | yes | 1.00 |
| parent_task_id | uuid | yes | - |
| decomposition_level | integer | yes | 0 |
| retry_count | integer | yes | 0 |
| max_retries | integer | yes | 3 |
| last_error | text | yes | - |
| acceptance_criteria | jsonb | yes | '[]'::jsonb |
| test_results | jsonb | yes | - |
| tests_passed | integer | yes | 0 |
| tests_failed | integer | yes | 0 |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| ready_at | timestamp with time zone | yes | - |
| started_at | timestamp with time zone | yes | - |
| completed_at | timestamp with time zone | yes | - |
| spawn_config | jsonb | yes | - |
| session_key | text | yes | - |
| tags | ARRAY | yes | '{}'::text[] |
| metadata | jsonb | yes | '{}'::jsonb |
| use_case_id | text | yes | - |
| prd_id | text | yes | - |
| branch_name | text | yes | - |
| pr_number | integer | yes | - |
| failure_count | integer | yes | 0 |
| retry_with_model | text | yes | - |
| dedup_key | text | yes | - |

### use_cases

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | text | no | - |
| prd_id | text | yes | - |
| name | text | no | - |
| description | text | yes | - |
| phase | text | yes | - |
| priority | integer | yes | 2 |
| implementation_status | text | yes | 'not_started'::text |
| e2e_tests_defined | boolean | yes | false |
| e2e_tests_passing | boolean | yes | false |
| acceptance_criteria | jsonb | yes | - |
| depends_on | ARRAY | yes | - |
| workflow | ARRAY | yes | ARRAY['product'::text, 'dev'::text, 'qc' |
| shippable_after_step | integer | yes | - |
| revenue_impact | text | yes | 'none'::text |
| project_id | text | yes | - |
| updated_at | timestamp with time zone | yes | CURRENT_TIMESTAMP |
| metadata | jsonb | yes | '{}'::jsonb |
| acceptance_checks | jsonb | yes | '[]'::jsonb |

**Foreign keys:**
- `prd_id` → `prds.id`

### code_reviews

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| project_id | text | no | - |
| task_id | uuid | yes | - |
| pr_number | integer | yes | - |
| branch_name | text | yes | - |
| reviewer_agent | text | yes | - |
| status | text | yes | 'pending'::text |
| review_notes | jsonb | yes | - |
| created_at | timestamp with time zone | yes | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | yes | CURRENT_TIMESTAMP |

