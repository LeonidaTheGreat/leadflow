# LeadFlow Database Schema Reference
> Source of truth for table/column existence. Read BEFORE filing bugs about missing columns.
> 68 tables in local PostgreSQL (openclaw DB).

## Common Gotchas
- **messages has NO agent_id** — join through leads to get the agent
- **sms_messages has NO agent_id** — same, join through leads  
- **"agents" in code = real_estate_agents** — customers, not AI agents
- **tasks.agent_id = AI agent role** (dev, qc, product) — different concept
- **Two message tables**: `messages` (full, preferred) and `sms_messages` (legacy, minimal)

## Key Product Tables

### real_estate_agents (THE customer table)
id (uuid), email, password_hash, first_name, last_name, phone_number, state, status, timezone, email_verified, stripe_customer_id, subscription_status, plan_tier, mrr, trial_ends_at, source, pilot_started_at, onboarding_step, onboarding_completed, utm_source/medium/campaign, created_at, updated_at

### leads
id (uuid), fub_id, **agent_id (uuid FK→real_estate_agents)**, name, email, phone, source, status, market, consent_sms, dnc, budget_min/max, timeline, urgency_score, created_at

### messages (primary — use this for SMS)
id (uuid), **lead_id (uuid FK→leads)**, direction, channel, message_body, ai_generated, twilio_sid, twilio_status, status, sent_at, metadata, created_at. **NO agent_id.**

### sms_messages (legacy — prefer messages)
id (uuid), lead_id, direction, body, twilio_sid, status, created_at. **NO agent_id.**

### conversations
id (uuid), lead_id, agent_id, from_number, to_number, status, trigger_type, twilio_sid

### bookings
id (uuid), attendee_email/name/phone, start_time, end_time, status, lead_id, agent_id, meeting_url, source

## Billing Tables
- **subscriptions**: id, user_id, customer_id, stripe_customer_id, stripe_subscription_id, status, tier, interval, current_period_start/end
- **customers**: id, email, name, stripe_customer_id, plan_tier, mrr, status, trial_ends_at
- **checkout_sessions**: id, user_id, customer_id, stripe_session_id, tier, status
- **payments**: id, subscription_id, stripe_invoice_id, amount, currency, status

## Orchestration Tables
- **tasks**: id, title, description, project_id, agent_id (AI role), model, status, priority, spawn_config (jsonb), use_case_id, pr_number
- **use_cases**: id, name, description, priority, implementation_status, workflow (array), revenue_impact
- **code_reviews**: id, task_id, pr_number, branch_name, status, review_notes (jsonb)
