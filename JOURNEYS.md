<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# User Journeys

> Generated: 2026-03-11T17:54:37.616Z | Source: `project.config.json` journeys + `product_reviews` table

Review interval: every 14 days

| Journey | Persona | Steps | Products | Last Review | Score |
|---------|---------|-------|----------|-------------|-------|
| new-agent-signup | Real estate agent, first visit, not tech | 6 | landing-page, customer-dashboard, billing-flow | pending (-) | - |
| lead-response | Inbound lead submitting info via FUB web | 3 | fub-webhook, customer-dashboard | pending (-) | - |

---

## New Agent Signup

- **ID:** new-agent-signup
- **Persona:** Real estate agent, first visit, not tech-savvy
- **Goal:** Agent has an active account with integrations configured
- **Entry point:** https://leadflow-ai-five.vercel.app
- **Products:** landing-page, customer-dashboard, billing-flow

### Steps

1. **Find and click signup CTA** (from `/`) — Navigate to /signup
2. **Complete signup form with email, name, password** (from `/signup`) — Navigate to /login or /dashboard
3. **Log in with new credentials** (from `/login`) — Navigate to /dashboard
4. **Navigate to settings/integrations** (from `/dashboard`) — Navigate to /integrations
5. **Connect FUB integration** (from `/integrations`) — FUB connected status shown
6. **Select billing plan** (from `/settings`) — Stripe checkout loads

### Latest Review

- **Verdict:** pending
- **Score:** pending
- **Date:** in progress

---

## Lead Response Flow

- **ID:** lead-response
- **Persona:** Inbound lead submitting info via FUB web form
- **Goal:** Lead receives AI SMS response and appears in agent dashboard
- **Entry point:** https://fub-inbound-webhook.vercel.app/webhook/fub
- **Products:** fub-webhook, customer-dashboard

### Steps

1. **Submit lead via FUB webhook payload** (from `/webhook/fub`) — 200 OK response
2. **Verify lead appears in dashboard** (from `/dashboard`) — New lead visible in lead list
3. **Check SMS was sent to lead** (from `/dashboard/leads/{id}`) — AI response message shown

### Latest Review

- **Verdict:** pending
- **Score:** pending
- **Date:** in progress

---

> **PM responsibility:** Review and update journey definitions in `project.config.json` → `journeys[]`.
> Add new journeys as product grows. Update steps when flows change. Trigger manual reviews with `!journey-review`.
