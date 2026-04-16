# Dashboard Architecture

Next.js customer-facing dashboard deployed to Vercel (`leadflow-ai` project).
For the API-side (webhook, SMS pipeline) see the root `ARCHITECTURE.md`.

## Route Structure

```
app/
  layout.tsx            — root layout, fonts, analytics
  page.tsx              — marketing homepage
  login/ signup/        — unauthenticated auth pages
  dashboard/            — main agent workspace (protected)
  settings/             — account, billing, integrations (protected)
  setup/ onboarding/    — first-run wizard (protected, pre-onboarding)
  admin/                — internal ops UI (protected, admin-only)
  api/                  — Next.js route handlers (server-only)
    billing/ booking/ cron/ integrations/ ...
```

All `/dashboard`, `/settings`, `/admin`, `/integrations`, `/setup`, `/profile`
routes are protected by `middleware.ts`.

## Auth Pattern

Two token types co-exist:

| Cookie | Source | Verification |
|--------|--------|--------------|
| `auth-token` | Trial signup (JWT) | `jose.jwtVerify` in middleware |
| `leadflow_session` | Login flow | SHA-256 hash lookup in `sessions` table |

`lib/services/AuthService.ts` owns session creation and validation server-side.
`middleware.ts` handles Edge-compatible auth checks (no Node.js crypto — uses Web Crypto API).

## lib/ Services

| File | Responsibility |
|------|----------------|
| `config.ts` | All env var reads for the dashboard. Import from here, not `process.env`. |
| `db.ts` | PostgREST HTTP client (PostgREST + pure fetch, no Supabase SDK). |
| `logger.ts` | Structured JSON logger for Vercel function logs. |
| `error-handler.ts` | Shared error normalisation for route handlers. |
| `services/AuthService.ts` | Session CRUD, password hashing, token management. |
| `twilio.ts` | Twilio SMS client init. |
| `fub.ts` | Follow Up Boss API client. |
| `calcom.ts` | Cal.com API client. |
| `email-service.ts` | Resend-based transactional email. |
| `trial.ts` / `trial-emails.ts` | Trial lifecycle helpers. |
| `rate-limit.ts` | Per-IP rate limiting for API routes. |

## Config

`lib/config.ts` — dashboard-only env resolution (TypeScript, ESM).
- Exports: `app`, `stripe`, `twilio`, `fub`, `calcom`.
- Critical vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`) throw at import in production.
- Do NOT read `process.env` directly in routes or services; import from here.

## Logging

Use `logger` from `lib/logger.ts` in all route handlers. Never surface raw
`error.message` to API responses — log internally, return a safe message.

## Test Organisation

```
__tests__/          — Jest unit and integration tests
tests/              — additional test suites
```

Run: `npm test` from this directory. Config: `jest.config.ts`.
