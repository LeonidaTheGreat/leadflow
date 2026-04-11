<!-- AUTO-GENERATED — DO NOT EDIT. Run `node scripts/generate-schema-docs.js` to regenerate. -->
# Schema: Bookings

> Cal.com bookings, appointment reminders, booking configs
> Generated: 2026-04-11T22:17:52.146Z | 4 tables

[← Back to SCHEMA.md](../SCHEMA.md)

## Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `bookings` | 0 | |
| `booking_activities` | 0 | |
| `booking_reminders` | 0 | |
| `agent_booking_configs` | 0 | |

---

## Column Details

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

