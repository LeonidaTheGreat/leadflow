# Production Domain Routing Verification

**Date:** 2026-04-04
**Task:** fix-production-domain-leadflow-ai-five-vercel-app-serv

## Summary

Verified that `leadflow-ai-five.vercel.app` correctly serves the Next.js customer dashboard.

## Vercel Project Separation

| Project | URL | Serves |
|---------|-----|--------|
| `leadflow-ai` | https://leadflow-ai-five.vercel.app | Next.js dashboard ✅ |
| `leadflow` | https://leadflow-five-blush.vercel.app | server.js (FUB webhook) |
| `fub-inbound-webhook` | https://fub-inbound-webhook.vercel.app | FUB webhook handler |

## Route Verification

All customer-facing routes confirmed working on `leadflow-ai-five.vercel.app`:
- `/` → 200 (Landing page)
- `/signup` → 200
- `/login` → 200
- `/dashboard` → 307 (redirect to login — expected behavior when unauthenticated)
- `/settings` → 307 (redirect to login — expected behavior when unauthenticated)
- `/admin/simulator` → 200
- `/api/health` → 200 `{"status":"ok","checks":{...all ok...}}`

## Root Cause (Historical)

The production alias was previously attached to the `leadflow` Vercel project which deploys `server.js` (Express FUB webhook) from the repo root. It has since been reassigned to the `leadflow-ai` project which deploys the Next.js dashboard from `product/lead-response/dashboard/`.

## Dashboard Deploy Config

- **Vercel Project:** `leadflow-ai`
- **Root Directory:** `product/lead-response/dashboard/`
- **Framework:** Next.js
- **Production Domain:** `leadflow-ai-five.vercel.app`
