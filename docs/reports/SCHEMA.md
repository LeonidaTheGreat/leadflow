<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from live PostgreSQL. -->
# LeadFlow Database Schema Reference

> Source of truth for table/column existence. Read BEFORE filing bugs about missing columns.
> Generated: 2026-05-04T01:21:18.865Z | 98 tables in local PostgreSQL (openclaw DB).

## Common Gotchas

- **messages has NO agent_id** — join through leads to get the agent
- **sms_messages has NO agent_id** — same, join through leads
- **"agents" in code = real_estate_agents** — customers, not AI agents
- **tasks.agent_id = AI agent role** (dev, qc, product) — different concept, text not uuid
- **Two message tables**: `messages` (full, preferred) and `sms_messages` (legacy, minimal)
- **Database**: local PostgreSQL on Mac Mini, NOT Supabase

## Table Overview

### Product — Customers

| Table | Rows | Purpose |
|-------|------|---------|
| `real_estate_agents` | 30 | |
| `customers` | 0 | |
| `profiles` | 0 | |
| `agent_profiles` | 0 | |
| `agent_settings` | 2 | |
| `agent_integrations` | 1 | |

### Product — Leads & Messages

| Table | Rows | Purpose |
|-------|------|---------|
| `leads` | 24 | |
| `messages` | 0 | |
| `sms_messages` | 0 | |
| `conversations` | 0 | |
| `lead_sequences` | 0 | |
| `lead_satisfaction_events` | 24 | |
| `lead_simulations` | 19 | |
| `dnc_list` | 0 | |

### Product — Bookings

| Table | Rows | Purpose |
|-------|------|---------|
| `bookings` | 0 | |
| `booking_activities` | 0 | |
| `booking_reminders` | 0 | |
| `agent_booking_configs` | 0 | |

### Product — Billing

| Table | Rows | Purpose |
|-------|------|---------|
| `subscriptions` | 0 | |
| `subscription_events` | 0 | |
| `payments` | 0 | |
| `checkout_sessions` | 0 | |
| `mrr_snapshots` | 0 | |

### Product — Onboarding

| Table | Rows | Purpose |
|-------|------|---------|
| `onboarding_drafts` | 0 | |
| `onboarding_simulations` | 3 | |
| `onboarding_events` | 1 | |
| `onboarding_stuck_alerts` | 0 | |
| `agent_onboarding_wizard` | 1 | |
| `pilot_invites` | 25 | |
| `pilot_signups` | 35 | |
| `pilot_progress` | 8 | |
| `pilot_recruitment_campaigns` | 1 | |
| `pilot_recruitment_targets` | 20 | |

### Product — Auth

| Table | Rows | Purpose |
|-------|------|---------|
| `sessions` | 264 | |
| `password_reset_tokens` | 103 | |
| `demo_tokens` | 9 | |

### Product — Analytics & Events

| Table | Rows | Purpose |
|-------|------|---------|
| `analytics_events` | 0 | |
| `events` | 487 | |
| `email_events` | 432 | |
| `agent_page_views` | 3 | |
| `agent_sessions` | 0 | |
| `demo_runs` | 0 | |
| `agent_nps_responses` | 0 | |
| `nps_survey_tokens` | 0 | |
| `nps_prompt_dismissals` | 1 | |
| `agent_survey_schedule` | 32 | |
| `inactivity_alerts` | 0 | |

### Product — Templates & Webhooks

| Table | Rows | Purpose |
|-------|------|---------|
| `templates` | 0 | |
| `webhook_configs` | 0 | |
| `webhook_delivery_logs` | 0 | |

### Product — Referrals & Trials

| Table | Rows | Purpose |
|-------|------|---------|
| `referral_links` | 0 | |
| `referrals` | 0 | |
| `trial_email_logs` | 0 | |

### Orchestration — Tasks

| Table | Rows | Purpose |
|-------|------|---------|
| `tasks` | 6046 | |
| `task_dependencies` | 105 | |
| `task_outcomes` | 0 | |
| `completed_work` | 9 | |
| `action_items` | 273 | |

### Orchestration — Product

| Table | Rows | Purpose |
|-------|------|---------|
| `use_cases` | 416 | |
| `prds` | 164 | |
| `e2e_test_specs` | 438 | |
| `code_reviews` | 1346 | |
| `product_feedback` | 47 | |
| `product_reviews` | 278 | |
| `product_decisions` | 44 | |

### Orchestration — Metrics

| Table | Rows | Purpose |
|-------|------|---------|
| `metrics` | 57858 | |
| `revenue_metrics` | 1 | |
| `distribution_channels` | 1 | |
| `distribution_metrics` | 250 | |
| `project_metadata` | 2 | |
| `project_goals` | 2 | |
| `system_components` | 23 | |

### System

| Table | Rows | Purpose |
|-------|------|---------|
| `schema_migrations` | 22 | |
| `weekly_performance_reports` | 0 | |
| `weekly_performance_email_logs` | 0 | |

### Uncategorized

| Table | Rows |
|-------|------|
| `code_calls` | 523 |
| `code_edges` | 779 |
| `code_exports` | 698 |
| `code_modules` | 1142 |
| `genome_graph_edges` | 3 |
| `genome_graph_nodes` | 11 |
| `genome_traces` | 138 |
| `heartbeat_step_metrics` | 223237 |
| `learning_insights` | 0 |
| `learning_qc_findings` | 9 |
| `learning_recovery_patterns` | 231 |
| `market_intelligence` | 0 |
| `mission_metrics` | 29 |
| `phone_inventory` | 1 |
| `pilot_conversion_email_logs` | 0 |
| `pilot_recruitment_touchpoints` | 2 |
| `project_missions` | 2 |
| `promo_codes` | 10 |
| `qualifications` | 0 |
| `subscription_attempts` | 0 |
| `task_modules` | 208 |
| `tool_usage` | 1101 |
| `webhook_dead_letters` | 0 |

---

## Key Table Schemas

### real_estate_agents

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| email | text | no | - |
| password_hash | text | no | - |
| first_name | text | no | - |
| last_name | text | no | - |
| phone_number | text | yes | - |
| state | text | yes | - |
| status | text | yes | 'onboarding'::text |
| timezone | text | yes | 'America/New_York'::text |
| email_verified | boolean | yes | false |
| stripe_customer_id | text | yes | - |
| subscription_status | text | yes | 'inactive'::text |
| plan_tier | text | yes | - |
| mrr | integer | yes | 0 |
| trial_ends_at | timestamp with time zone | yes | - |
| source | text | yes | - |
| pilot_started_at | timestamp with time zone | yes | - |
| pilot_expires_at | timestamp with time zone | yes | - |
| onboarding_step | integer | yes | 0 |
| last_onboarding_step_update | timestamp with time zone | yes | now() |
| onboarding_completed | boolean | yes | false |
| onboarding_completed_at | timestamp with time zone | yes | - |
| satisfaction_ping_enabled | boolean | no | true |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| last_login_at | timestamp with time zone | yes | - |
| trial_banner_dismissed | boolean | yes | false |
| trial_email_day6_sent | boolean | yes | false |
| trial_email_day3_sent | boolean | yes | false |
| trial_email_day1_sent | boolean | yes | false |
| trial_email_expired_sent | boolean | yes | false |
| subscription_start_date | timestamp with time zone | yes | - |
| utm_source | text | yes | - |
| utm_medium | text | yes | - |
| utm_campaign | text | yes | - |
| utm_content | text | yes | - |
| utm_term | text | yes | - |
| demo_runs_used | integer | yes | 0 |
| activation_email_sent | boolean | yes | false |
| trial_email_welcome_sent | boolean | no | false |
| trial_email_day1_aha_sent | boolean | no | false |
| trial_email_day3_upgrade_sent | boolean | no | false |
| trial_email_day7_warning_sent | boolean | no | false |
| trial_email_day14_expired_sent | boolean | no | false |
| trial_email_day15_final_sent | boolean | no | false |
| referred_by_agent_id | uuid | yes | - |
| referral_link_generated_at | timestamp with time zone | yes | - |
| total_referral_credits | integer | yes | 0 |
| fub_onboarding_completed | boolean | yes | false |
| fub_onboarding_step | integer | yes | 0 |
| aha_moment_day1_sent | boolean | no | false |
| aha_moment_day1_sent_at | timestamp with time zone | yes | - |
| aha_moment_day3_sent | boolean | no | false |
| aha_moment_day3_sent_at | timestamp with time zone | yes | - |
| trial_start_date | timestamp with time zone | yes | - |
| aha_completed | boolean | no | false |
| aha_response_time_ms | integer | yes | - |
| onboarding_final_step | character varying | yes | - |

**Foreign keys:**
- `referred_by_agent_id` → `real_estate_agents.id`

### leads

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| fub_id | text | yes | - |
| agent_id | uuid | yes | - |
| name | text | yes | - |
| email | text | yes | - |
| phone | text | no | - |
| source | text | no | - |
| source_metadata | jsonb | yes | '{}'::jsonb |
| status | text | yes | 'new'::text |
| market | text | yes | 'ca-ontario'::text |
| consent_sms | boolean | yes | false |
| consent_email | boolean | yes | false |
| dnc | boolean | yes | false |
| budget_min | integer | yes | - |
| budget_max | integer | yes | - |
| timeline | text | yes | - |
| location | text | yes | - |
| property_type | text | yes | - |
| urgency_score | integer | yes | - |
| last_contact_at | timestamp with time zone | yes | - |
| responded_at | timestamp with time zone | yes | - |
| sms_opt_out | boolean | yes | false |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| is_sample | boolean | no | false |
| sample_type | text | yes | - |
| property_interest | text | yes | - |
| budget | text | yes | - |

### messages

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| lead_id | uuid | no | - |
| direction | text | no | - |
| channel | text | yes | 'sms'::text |
| message_body | text | no | - |
| ai_generated | boolean | yes | false |
| ai_confidence | numeric | yes | - |
| ai_prompt_tokens | integer | yes | - |
| ai_completion_tokens | integer | yes | - |
| twilio_sid | text | yes | - |
| twilio_status | text | yes | - |
| twilio_error_code | text | yes | - |
| twilio_error_message | text | yes | - |
| status | text | yes | 'pending'::text |
| sent_at | timestamp with time zone | yes | - |
| delivered_at | timestamp with time zone | yes | - |
| failed_at | timestamp with time zone | yes | - |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp with time zone | yes | now() |
| is_sample | boolean | no | false |

### conversations

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| lead_id | uuid | yes | - |
| agent_id | uuid | yes | - |
| from_number | text | yes | - |
| to_number | text | yes | - |
| status | text | yes | - |
| trigger_type | text | yes | - |
| twilio_sid | text | yes | - |
| error_code | text | yes | - |
| error_message | text | yes | - |
| has_media | boolean | yes | false |
| media_url | text | yes | - |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |

### bookings

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| cal_booking_id | bigint | yes | - |
| cal_booking_uid | character varying | yes | - |
| cal_event_type_id | bigint | yes | - |
| cal_event_type_slug | character varying | yes | - |
| attendee_email | character varying | no | - |
| attendee_name | character varying | yes | - |
| attendee_phone | character varying | yes | - |
| attendee_timezone | character varying | yes | - |
| title | character varying | yes | - |
| description | text | yes | - |
| start_time | timestamp with time zone | no | - |
| end_time | timestamp with time zone | no | - |
| status | character varying | yes | 'booked'::character varying |
| location | character varying | yes | - |
| meeting_url | character varying | yes | - |
| meeting_link | text | yes | - |
| lead_id | uuid | yes | - |
| agent_id | uuid | yes | - |
| calcom_booking_id | text | yes | - |
| calcom_event_type_id | text | yes | - |
| notes | text | yes | - |
| metadata | jsonb | yes | '{}'::jsonb |
| source | character varying | yes | 'cal.com'::character varying |
| cancellation_reason | text | yes | - |
| reschedule_count | integer | yes | 0 |
| created_at | timestamp with time zone | yes | now() |
| updated_at | timestamp with time zone | yes | now() |
| cancelled_at | timestamp with time zone | yes | - |
| completed_at | timestamp with time zone | yes | - |

### subscriptions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | yes | - |
| customer_id | uuid | yes | - |
| stripe_customer_id | character varying | no | - |
| stripe_subscription_id | character varying | yes | - |
| status | character varying | no | 'incomplete'::character varying |
| tier | character varying | no | - |
| price_id | character varying | no | - |
| interval | character varying | no | 'month'::character varying |
| current_period_start | timestamp without time zone | yes | - |
| current_period_end | timestamp without time zone | yes | - |
| trial_start | timestamp without time zone | yes | - |
| trial_end | timestamp without time zone | yes | - |
| cancel_at_period_end | boolean | yes | false |
| canceled_at | timestamp without time zone | yes | - |
| ended_at | timestamp without time zone | yes | - |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp without time zone | yes | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | yes | CURRENT_TIMESTAMP |

### customers

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| email | text | no | - |
| name | text | no | - |
| phone | text | yes | - |
| company | text | yes | - |
| stripe_customer_id | text | yes | - |
| stripe_subscription_id | text | yes | - |
| plan_tier | text | yes | - |
| plan_price | integer | yes | - |
| billing_cycle | text | yes | 'monthly'::text |
| status | text | yes | 'trialing'::text |
| trial_ends_at | timestamp without time zone | yes | - |
| current_period_start | timestamp without time zone | yes | - |
| current_period_end | timestamp without time zone | yes | - |
| cancel_at_period_end | boolean | yes | false |
| canceled_at | timestamp without time zone | yes | - |
| mrr | integer | yes | 0 |
| lead_count | integer | yes | 0 |
| sms_sent_count | integer | yes | 0 |
| sms_quota | integer | yes | 100 |
| lead_quota | integer | yes | 50 |
| features | jsonb | yes | '{"api_access": false, "custom_branding" |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp without time zone | yes | now() |
| updated_at | timestamp without time zone | yes | now() |

### sessions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | yes | - |
| token | text | yes | - |
| ip_address | text | yes | - |
| user_agent | text | yes | - |
| last_used_at | timestamp with time zone | yes | - |
| expires_at | timestamp with time zone | yes | - |
| created_at | timestamp with time zone | yes | now() |

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

