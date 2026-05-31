# Onboarding Wizard — Implementation Status

**Last verified:** 2026-05-29

## Summary

The post-login onboarding wizard (FUB integration, phone number, SMS verify) is **fully implemented and deployed**.

## What Exists

| Component | Location |
|-----------|----------|
| Wizard shell (multi-step) | `app/setup/page.tsx` — FUB, phone, SMS-verify, simulator, complete steps |
| Dashboard redirect target | `app/dashboard/onboarding/page.tsx` |
| Middleware enforcement | `middleware.ts` — incomplete users routed to `/dashboard/onboarding` |
| Backend APIs | `app/api/agents/onboarding/` — fub-connect, configure-phone, provision-phone, verify-sms, complete, status |
| Overlay launcher | `components/onboarding-wizard-overlay.tsx` |
| Dashboard launcher | `components/dashboard/OnboardingWizardLauncher.tsx` |
| Client lib | `lib/onboarding-api.ts`, `lib/onboarding-validation.ts`, `lib/onboarding-telemetry.js` |

## Delivery History

- **#76** — Initial wizard shell (`/setup` route, all 5 steps)
- **#182** — FUB/SMS/aha trigger fix (wizard auto-launch)
- **#894** — FUB wizard completion check via status endpoint
- **#1504** — Middleware: route incomplete users to `/dashboard/onboarding`

## UC Bookkeeping Note

UC `feature-postlogin-onboarding-wizard-for-new-agents` has no row in the `use_cases` table (exists only as a task foreign key). The feature was delivered under `feat-post-login-onboarding-wizard`. The marketing workflow for this UC failed twice; no dev task was ever needed since implementation was already live.
