<!-- AUTO-GENERATED — DO NOT EDIT. Run `node scripts/generate-schema-docs.js` to regenerate. -->
# Schema: Communications

> SMS messages, email logs, conversations, sequences, templates, webhooks
> Generated: 2026-04-11T22:17:52.146Z | 6 tables

[← Back to SCHEMA.md](../SCHEMA.md)

## Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `messages` | 0 | |
| `sms_messages` | 0 | |
| `conversations` | 0 | |
| `templates` | 0 | |
| `webhook_configs` | 0 | |
| `webhook_delivery_logs` | 0 | |

---

## Column Details

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

