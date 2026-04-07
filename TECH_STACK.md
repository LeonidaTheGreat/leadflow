# LeadFlow AI — Tech Stack & API Contracts

> **This file is the single source of truth for the technology stack.**
> Agents MUST read this before writing code. Tests enforce the contracts below.
> Last updated: 2026-04-03

## Stack Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16 (App Router) | `product/lead-response/dashboard/` |
| UI Components | Radix UI + Tailwind CSS | shadcn/ui pattern in `components/ui/` |
| Backend API | Next.js API Routes | `app/api/` |
| Server (webhooks) | Express.js | `server.js` + `routes/` |
| Database | PostgreSQL (local) | Mac Mini, accessed via PostgREST |
| DB Client (dashboard) | `lib/db.ts` (PostgREST) | **NOT @supabase/supabase-js** |
| DB Client (server) | `lib/postgrest-client.js` | CommonJS, same API as above |
| Auth | JWT (custom) | `auth-token` cookie, `jsonwebtoken` |
| Payments | Stripe | Production keys |
| SMS | Twilio | A2P 10DLC pending |
| CRM | Follow Up Boss API | Webhook integration |
| Booking | Cal.com | Embedded booking |
| Deployment | Vercel | CLI deploys, no GitHub auto-deploy |
| Public API | Cloudflare Tunnel | `api.imagineapi.org` → port 8788 |
| Orchestration | OpenClaw Genome | `~/.openclaw/genome/` (separate repo) |

## Critical: Banned Dependencies

These packages have been **removed** and must NEVER be reintroduced:

| Package | Reason | Replacement |
|---------|--------|-------------|
| `@supabase/supabase-js` | Removed from stack | `lib/db.ts` / `lib/postgrest-client.js` |
| `@supabase/ssr` | Removed from stack | Not needed |
| `@supabase/auth-helpers-nextjs` | Removed from stack | Custom JWT auth |

**Enforcement:** Codebase rules in `project.config.json` check every heartbeat.
Unit tests verify the PostgREST client contracts.
Agent spawn messages include these rules.

## Database Client — API Contracts

### Dashboard (TypeScript): `lib/db.ts`

```typescript
import { postgrestAdmin, from, createClient, channel } from '@/lib/db'

// Query builder — Supabase-compatible chainable API
const { data, error } = await postgrestAdmin
  .from('table_name')
  .select('*')
  .eq('id', value)
  .single()

// Insert with return
const { data, error } = await postgrestAdmin
  .from('table_name')
  .insert({ field: 'value' })
  .select('id, field')
  .single()

// Update
const { data, error } = await postgrestAdmin
  .from('table_name')
  .update({ field: 'new_value' })
  .eq('id', value)
```

### Server (CommonJS): `lib/postgrest-client.js`

```javascript
const { createClient } = require('./postgrest-client')
// or: const { createClient } = require('./db-client')  // re-exports from postgrest-client

const supabase = createClient(
  process.env.NEXT_PUBLIC_API_URL,
  process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY
)

// Same chainable API as dashboard
const { data, error } = await supabase.from('table').select('*')
```

### Channel Stub — CRITICAL CONTRACT

The `channel()` function stubs Supabase Realtime. **Methods must return the channel object itself (not a Promise)** for chaining:

```typescript
const ch = channel('name')        // Returns channel object
ch.on('event', config, callback)  // Returns ch (chainable)
ch.subscribe()                    // Returns ch (NOT a Promise)
ch.unsubscribe()                  // void (no return needed)

// Full pattern used in components:
const subscription = supabase
  .channel('leads')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, cb)
  .subscribe()

// Cleanup (useEffect return):
subscription.unsubscribe()  // Must be callable — subscription IS the channel
```

**Test:** `__tests__/postgrest-client.test.ts` (18 tests enforce this contract)

### Query Builder Methods

All return the builder (chainable):
- `.select(cols?)` `.insert(data)` `.update(data)` `.delete()` `.upsert(data, opts?)`
- `.eq(k, v)` `.neq(k, v)` `.gt(k, v)` `.gte(k, v)` `.lt(k, v)` `.lte(k, v)`
- `.in(k, vals[])` `.not(k, op, val)` `.is(k, val)` `.or(filterStr)`
- `.order(col, opts?)` `.limit(n)` `.range(start, end)`
- `.single()` `.maybeSingle()`

Returns `{ data, error }` when awaited (implements `PromiseLike`).

## Auth

| Method | Mechanism | Storage |
|--------|-----------|---------|
| Signup | `POST /api/auth/pilot-signup` or `trial-signup` | Sets `auth-token` cookie (JWT) |
| Login | `POST /api/auth/login` | Sets `auth-token` cookie (JWT) + `leadflow_session` |
| Session validation | Middleware reads JWT from cookie | `jwt.verify()` with `JWT_SECRET` |
| Protected routes | Middleware redirects to `/login` | Checks `/dashboard`, `/settings`, `/profile`, `/integrations`, `/setup` |

**JWT payload:** `{ userId, email, name }`

## Environment Variables

### Required (Vercel + local)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | PostgREST API base URL |
| `API_SECRET_KEY` | PostgREST API key (server-side) |
| `NEXT_PUBLIC_API_KEY` | PostgREST API key (client-side, limited) |
| `JWT_SECRET` | JWT signing key |
| `RESEND_API_KEY` | Email service |

### Removed (Supabase fully removed)

The following variables have been removed from the codebase and .env files:
- `SUPABASE_URL` — removed
- `SUPABASE_SERVICE_ROLE_KEY` — removed
- `NEXT_PUBLIC_SUPABASE_URL` — removed
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — removed

## Testing

### Unit Tests (Jest)
```bash
cd product/lead-response/dashboard
npx jest                    # all tests
npx jest __tests__/postgrest-client.test.ts  # PostgREST contract tests
```

### Browser Tests (Playwright)
```bash
cd ~/projects/leadflow
npx playwright test                           # all browser tests
npx playwright test tests/browser/js-errors.spec.js  # JS error detection
npx playwright test --headed                  # visual debugging
```

**Browser tests run every 6h via genome heartbeat step 5d6.**
Failures create P1 dev tasks.

### What Tests Must Cover

| Category | Test File | What It Catches |
|----------|-----------|----------------|
| PostgREST API contracts | `__tests__/postgrest-client.test.ts` | channel() return types, chainability, method signatures |
| Client-side JS errors | `tests/browser/js-errors.spec.js` | React hydration crashes, unhandled exceptions, error boundaries |
| Page loads | `tests/browser/pages.spec.js` | HTTP errors, missing content, performance |
| Auth flows | `tests/browser/auth.spec.js` | Login, signup, redirects |
| API health | `tests/browser/health.spec.js` | Endpoint availability |

## Known Gotchas

1. **channel().subscribe() must return the channel, not a Promise.** The Supabase SDK returns the channel for chaining; our stub must do the same. Components call `subscription.unsubscribe()` in useEffect cleanup.

2. **Middleware runs in Edge Runtime.** It can't use Node.js APIs. Only use `fetch`, `crypto`, and standard Web APIs.

3. **Build-time vs runtime config.** `NEXT_PUBLIC_*` vars are baked into the build. Server-only vars (`API_SECRET_KEY`) are only available in API routes and middleware.

4. **Vercel deploys are CLI-only.** No GitHub auto-deploy. After merging, run: `cd product/lead-response/dashboard && vercel --prod`

5. **Auto-generated files.** These regenerate every heartbeat — don't edit manually: `DASHBOARD.md`, `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `JOURNEYS.md`

## Adding New Dependencies

Before adding a package:
1. Check if `lib/db.ts` or `lib/postgrest-client.js` already provides what you need
2. Never add `@supabase/*` packages
3. Prefer standard Web APIs over npm packages in middleware/Edge code
4. Update this file if the tech stack changes
