# AI Lead Response System - MVP

Real estate AI-powered instant lead response system built with Next.js 15, shadcn/ui, Supabase, and Claude.

## Features

- 🤖 AI Lead Qualification (Claude 3.5 Sonnet)
- 📱 Instant SMS Response (Twilio)
- 🔗 Follow Up Boss Integration
- 📊 Agent Dashboard
- 📅 Cal.com Booking Integration
- 🧪 E2E Test Suite

## Tech Stack

- **Frontend:** Next.js 15 + React 19 + TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **AI:** Claude 3.5 Sonnet via Vercel AI SDK
- **SMS:** Twilio
- **CRM:** Follow Up Boss
- **Scheduling:** Cal.com (self-hosted)

## Project Structure

```
app/
├── api/
│   ├── webhook/
│   │   ├── route.ts           # Generic webhook handler
│   │   └── fub/
│   │       └── route.ts       # Follow Up Boss webhook handler
│   ├── sms/
│   │   ├── send/route.ts      # Send SMS via Twilio
│   │   └── status/route.ts    # Twilio status callbacks
│   └── booking/
│       └── route.ts           # Cal.com booking links
├── dashboard/
│   ├── page.tsx               # Lead Feed
│   ├── layout.tsx             # Dashboard layout
│   ├── leads/
│   │   └── [id]/page.tsx      # Lead detail view
│   └── history/
│       └── page.tsx           # Response history
├── layout.tsx
└── page.tsx

components/
├── dashboard/
│   ├── LeadFeed.tsx           # Lead list component
│   ├── LeadCard.tsx           # Individual lead card
│   ├── ConversationView.tsx   # Message thread view
│   └── StatsCards.tsx         # Dashboard stats
└── ui/                        # shadcn/ui components

lib/
├── ai.ts                      # AI qualification engine
├── supabase.ts                # Supabase clients
├── twilio.ts                  # Twilio SMS client
├── fub.ts                     # FUB API integration
├── calcom.ts                  # Cal.com integration
└── types/
    └── index.ts               # TypeScript types

supabase/
└── migrations/
    └── 001_initial_schema.sql # Database schema

tests/
└── e2e/
    └── flow.test.ts           # E2E test suite
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic (Claude)
ANTHROPIC_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER_US=
TWILIO_PHONE_NUMBER_CA=

# Follow Up Boss
FUB_API_KEY=
FUB_WEBHOOK_SECRET=

# Cal.com
CALCOM_API_KEY=
CALCOM_EVENT_TYPE_ID=

# App
NEXT_PUBLIC_APP_URL=
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhook` | POST | Generic lead webhook |
| `/api/webhook/fub` | POST | Follow Up Boss webhook |
| `/api/sms/send` | POST | Send SMS |
| `/api/sms/status` | POST | Twilio status callback |
| `/api/booking` | GET | Get booking link |

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test
```

## License

MIT
