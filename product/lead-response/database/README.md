# Database Setup - Supabase

## Quick Setup

1. Create Supabase project at https://app.supabase.com
2. Copy connection details to `.env.local`
3. Run migrations:

```bash
psql $SUPABASE_DB_URL < schema.sql
```

Or use Supabase Dashboard > SQL Editor.

## Schema Overview

**Core Tables:**
- `agents` - Real estate agent profiles
- `leads` - Incoming lead records
- `qualifications` - AI qualification results
- `conversations` - SMS message history
- `response_templates` - Message templates
- `events` - Analytics/audit trail

## RLS (Row Level Security)

Enabled on all tables. Agents can only access their own data via `auth.uid()`.

## Migrations

Future schema changes go in `migrations/` folder with timestamp naming:
```
migrations/
  20260215_add_booking_table.sql
  20260216_add_lead_tags.sql
```

## Backup

Supabase Pro includes automatic backups. For manual backup:

```bash
pg_dump $SUPABASE_DB_URL > backup-$(date +%Y%m%d).sql
```
