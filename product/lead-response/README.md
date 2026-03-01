# AI Lead Response System - MVP

**Status:** Day 1 - Infrastructure Setup  
**Target Launch:** February 28, 2026  
**Stack:** Next.js 15 | Vercel AI SDK | n8n | Supabase | Twilio | Cal.com

## Overview

Automated AI-powered lead qualification and response system for real estate agents. Responds to incoming leads in <30 seconds with intelligent qualification and booking coordination.

## Features (MVP)

- ✅ Lead intake webhook (web forms, Zillow)
- ✅ AI qualification via Claude 3.5 (intent, budget, timeline, location)
- ✅ Instant SMS via Twilio
- ✅ Follow Up Boss CRM sync
- ✅ Cal.com booking integration
- ✅ Agent dashboard with analytics

## Architecture

```
┌─────────────┐
│ Lead Source │ → Webhook → n8n Workflow
└─────────────┘              ↓
                    ┌────────────────┐
                    │ AI Qualification│ (Claude 3.5)
                    └────────┬───────┘
                             ↓
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
         Supabase DB    Twilio SMS    Follow Up Boss
              ↓
         Next.js Dashboard
```

## Project Structure

```
lead-response/
├── dashboard/          # Next.js 15 + shadcn/ui
│   ├── app/           # App router
│   ├── components/    # UI components
│   └── lib/           # Utilities, AI SDK
├── workflows/         # n8n workflow definitions
├── database/          # Supabase schema & migrations
└── docs/              # Technical documentation
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Dashboard | Next.js 15 + shadcn/ui | Agent interface |
| AI Engine | Vercel AI SDK + Claude 3.5 | Lead qualification |
| Workflows | n8n (Railway) | Orchestration |
| Database | Supabase Pro | Data + Auth |
| SMS | Twilio | Instant responses |
| Booking | Cal.com (self-hosted) | Appointment scheduling |
| CRM | Follow Up Boss API | Lead sync |
| Hosting | Vercel | Deployment |

## Quick Start

### Prerequisites

```bash
node >= 20
pnpm >= 9
```

### Environment Setup

```bash
cp .env.example .env.local
# Fill in credentials (see Environment Variables below)
```

### Development

```bash
cd dashboard
pnpm install
pnpm dev
```

Dashboard: `http://localhost:3000`

## Environment Variables

See `.env.example` for full template. Required:

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**AI:**
- `ANTHROPIC_API_KEY`

**Twilio:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

**Follow Up Boss:**
- `FUB_API_KEY`

**Cal.com:**
- `CALCOM_API_KEY`
- `CALCOM_BOOKING_URL`

**n8n:**
- `N8N_WEBHOOK_URL`

## Database Schema

See `database/schema.sql` for full schema.

**Core Tables:**
- `leads` - Lead records
- `conversations` - SMS conversation history
- `qualifications` - AI qualification results
- `agents` - Real estate agent profiles
- `responses` - Response templates & analytics

## Deployment

### Vercel (Dashboard)

```bash
vercel --prod
```

### Railway (n8n)

```bash
# See workflows/README.md
```

### Supabase

```bash
# See database/README.md
```

## Development Timeline

- **Week 1 (Feb 14-21):** Core infrastructure + AI qualification
- **Week 2 (Feb 22-28):** Integration + deployment + testing

## Daily Progress

See topic 6986 for daily updates.

## License

Proprietary - Business Opportunities 2026
