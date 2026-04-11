<!-- AUTO-GENERATED — DO NOT EDIT. Run `node scripts/generate-schema-docs.js` to regenerate. -->
# Schema: CRM & Leads

> Leads, qualifications, FUB-related tables, DNC list
> Generated: 2026-04-11T22:20:04.798Z | 6 tables

[← Back to SCHEMA.md](../SCHEMA.md)

## Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `leads` | 0 | |
| `lead_sequences` | 0 | |
| `lead_satisfaction_events` | 0 | |
| `lead_simulations` | 19 | |
| `dnc_list` | 0 | |
| `qualifications` | 0 | |

---

## Column Details

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

