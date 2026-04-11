<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from live PostgreSQL. -->
# LeadFlow Database Schema Reference

> Source of truth for table/column existence. Read BEFORE filing bugs about missing columns.
> Generated: 2026-04-11T22:20:04.798Z | 77 tables in local PostgreSQL (openclaw DB).

**Load only the domain file you need** — don't load this entire file when you only need 2-3 tables.

## Common Gotchas

- **messages has NO agent_id** — join through leads to get the agent
- **sms_messages has NO agent_id** — same, join through leads
- **"agents" in code = real_estate_agents** — customers, not AI agents
- **tasks.agent_id = AI agent role** (dev, qc, product) — different concept, text not uuid
- **Two message tables**: `messages` (full, preferred) and `sms_messages` (legacy, minimal)
- **Database**: local PostgreSQL on Mac Mini, NOT Supabase

## Domains

| Domain | Tables | Description |
|--------|--------|-------------|
| [Agents (Customers)](schema/agents.md) | 20 | Real estate agents (paying customers), profiles, settings, onboarding, pilot, auth |
| [CRM & Leads](schema/crm.md) | 6 | Leads, qualifications, FUB-related tables, DNC list |
| [Communications](schema/communications.md) | 6 | SMS messages, email logs, conversations, sequences, templates, webhooks |
| [Bookings](schema/bookings.md) | 4 | Cal.com bookings, appointment reminders, booking configs |
| [Billing](schema/billing.md) | 8 | Stripe subscriptions, payments, invoices, referrals, trials |
| [Analytics & Metrics](schema/analytics.md) | 18 | Events, page views, NPS, PostHog, revenue and distribution metrics |
| [Orchestration](schema/orchestration.md) | 15 | Tasks, use cases, PRDs, code reviews, product decisions, system tables |

## Quick Table Lookup

| Table | Domain |
|-------|--------|
| `action_items` | [Orchestration](schema/orchestration.md) |
| `agent_booking_configs` | [Bookings](schema/bookings.md) |
| `agent_integrations` | [Agents (Customers)](schema/agents.md) |
| `agent_nps_responses` | [Analytics & Metrics](schema/analytics.md) |
| `agent_onboarding_wizard` | [Agents (Customers)](schema/agents.md) |
| `agent_page_views` | [Analytics & Metrics](schema/analytics.md) |
| `agent_profiles` | [Agents (Customers)](schema/agents.md) |
| `agent_sessions` | [Analytics & Metrics](schema/analytics.md) |
| `agent_settings` | [Agents (Customers)](schema/agents.md) |
| `agent_survey_schedule` | [Analytics & Metrics](schema/analytics.md) |
| `analytics_events` | [Analytics & Metrics](schema/analytics.md) |
| `booking_activities` | [Bookings](schema/bookings.md) |
| `booking_reminders` | [Bookings](schema/bookings.md) |
| `bookings` | [Bookings](schema/bookings.md) |
| `checkout_sessions` | [Billing](schema/billing.md) |
| `code_reviews` | [Orchestration](schema/orchestration.md) |
| `completed_work` | [Orchestration](schema/orchestration.md) |
| `conversations` | [Communications](schema/communications.md) |
| `customers` | [Agents (Customers)](schema/agents.md) |
| `demo_runs` | [Analytics & Metrics](schema/analytics.md) |
| `demo_tokens` | [Agents (Customers)](schema/agents.md) |
| `distribution_channels` | [Analytics & Metrics](schema/analytics.md) |
| `distribution_metrics` | [Analytics & Metrics](schema/analytics.md) |
| `dnc_list` | [CRM & Leads](schema/crm.md) |
| `e2e_test_specs` | [Orchestration](schema/orchestration.md) |
| `email_events` | [Analytics & Metrics](schema/analytics.md) |
| `events` | [Analytics & Metrics](schema/analytics.md) |
| `inactivity_alerts` | [Analytics & Metrics](schema/analytics.md) |
| `lead_satisfaction_events` | [CRM & Leads](schema/crm.md) |
| `lead_sequences` | [CRM & Leads](schema/crm.md) |
| `lead_simulations` | [CRM & Leads](schema/crm.md) |
| `leads` | [CRM & Leads](schema/crm.md) |
| `messages` | [Communications](schema/communications.md) |
| `metrics` | [Analytics & Metrics](schema/analytics.md) |
| `mrr_snapshots` | [Billing](schema/billing.md) |
| `nps_prompt_dismissals` | [Analytics & Metrics](schema/analytics.md) |
| `nps_survey_tokens` | [Analytics & Metrics](schema/analytics.md) |
| `onboarding_drafts` | [Agents (Customers)](schema/agents.md) |
| `onboarding_events` | [Agents (Customers)](schema/agents.md) |
| `onboarding_simulations` | [Agents (Customers)](schema/agents.md) |
| `onboarding_stuck_alerts` | [Agents (Customers)](schema/agents.md) |
| `password_reset_tokens` | [Agents (Customers)](schema/agents.md) |
| `payments` | [Billing](schema/billing.md) |
| `pilot_invites` | [Agents (Customers)](schema/agents.md) |
| `pilot_progress` | [Agents (Customers)](schema/agents.md) |
| `pilot_recruitment_campaigns` | [Agents (Customers)](schema/agents.md) |
| `pilot_recruitment_targets` | [Agents (Customers)](schema/agents.md) |
| `pilot_recruitment_touchpoints` | [Agents (Customers)](schema/agents.md) |
| `pilot_signups` | [Agents (Customers)](schema/agents.md) |
| `prds` | [Orchestration](schema/orchestration.md) |
| `product_decisions` | [Orchestration](schema/orchestration.md) |
| `product_feedback` | [Orchestration](schema/orchestration.md) |
| `product_reviews` | [Orchestration](schema/orchestration.md) |
| `profiles` | [Agents (Customers)](schema/agents.md) |
| `project_goals` | [Analytics & Metrics](schema/analytics.md) |
| `project_metadata` | [Analytics & Metrics](schema/analytics.md) |
| `qualifications` | [CRM & Leads](schema/crm.md) |
| `real_estate_agents` | [Agents (Customers)](schema/agents.md) |
| `referral_links` | [Billing](schema/billing.md) |
| `referrals` | [Billing](schema/billing.md) |
| `revenue_metrics` | [Analytics & Metrics](schema/analytics.md) |
| `schema_migrations` | [Orchestration](schema/orchestration.md) |
| `sessions` | [Agents (Customers)](schema/agents.md) |
| `sms_messages` | [Communications](schema/communications.md) |
| `subscription_events` | [Billing](schema/billing.md) |
| `subscriptions` | [Billing](schema/billing.md) |
| `system_components` | [Analytics & Metrics](schema/analytics.md) |
| `task_dependencies` | [Orchestration](schema/orchestration.md) |
| `task_outcomes` | [Orchestration](schema/orchestration.md) |
| `tasks` | [Orchestration](schema/orchestration.md) |
| `templates` | [Communications](schema/communications.md) |
| `trial_email_logs` | [Billing](schema/billing.md) |
| `use_cases` | [Orchestration](schema/orchestration.md) |
| `webhook_configs` | [Communications](schema/communications.md) |
| `webhook_delivery_logs` | [Communications](schema/communications.md) |
| `weekly_performance_email_logs` | [Orchestration](schema/orchestration.md) |
| `weekly_performance_reports` | [Orchestration](schema/orchestration.md) |

