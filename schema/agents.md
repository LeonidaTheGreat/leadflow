<!-- AUTO-GENERATED — DO NOT EDIT. Run `node scripts/generate-schema-docs.js` to regenerate. -->
# Schema: Agents (Customers)

> Real estate agents (paying customers), profiles, settings, onboarding, pilot, auth
> Generated: 2026-04-11T22:20:04.798Z | 20 tables

[← Back to SCHEMA.md](../SCHEMA.md)

## Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `real_estate_agents` | 22 | |
| `customers` | 0 | |
| `profiles` | 0 | |
| `agent_profiles` | 0 | |
| `agent_settings` | 1 | |
| `agent_integrations` | 2 | |
| `onboarding_drafts` | 0 | |
| `onboarding_simulations` | 7 | |
| `onboarding_events` | 0 | |
| `onboarding_stuck_alerts` | 0 | |
| `agent_onboarding_wizard` | 0 | |
| `pilot_invites` | 10 | |
| `pilot_signups` | 20 | |
| `pilot_progress` | 9 | |
| `pilot_recruitment_campaigns` | 1 | |
| `pilot_recruitment_targets` | 20 | |
| `pilot_recruitment_touchpoints` | 2 | |
| `sessions` | 168 | |
| `password_reset_tokens` | 320 | |
| `demo_tokens` | 9 | |

---

## Column Details

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

