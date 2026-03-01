# Deployment Checklist - MVP

## Prerequisites

- [ ] GitHub repository created
- [ ] Vercel account ready
- [ ] Railway account ready
- [ ] Supabase account ready
- [ ] Twilio account with phone number
- [ ] Follow Up Boss API access
- [ ] Cal.com instance (or account)

## Phase 1: Database (Supabase)

1. [ ] Create new Supabase project
2. [ ] Copy `database/schema.sql` to SQL Editor
3. [ ] Execute schema (creates all tables + RLS)
4. [ ] Verify tables created: `agents`, `leads`, `qualifications`, `conversations`, `response_templates`, `events`
5. [ ] Copy connection details:
   - Project URL
   - Anon key
   - Service role key

## Phase 2: Dashboard (Vercel)

1. [ ] Push code to GitHub
2. [ ] Import to Vercel
3. [ ] Configure environment variables (from .env.example):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ANTHROPIC_API_KEY=
   (all others from .env.example)
   ```
4. [ ] Deploy
5. [ ] Test webhook: `curl -X POST https://your-app.vercel.app/api/webhook -d '{"phone":"+15555550000","source":"test","message":"Test lead"}'`

## Phase 3: Workflows (Railway n8n)

1. [ ] Deploy n8n to Railway using template
2. [ ] Set environment variables (see workflows/README.md)
3. [ ] Import workflows from `workflows/` (when created)
4. [ ] Activate workflows
5. [ ] Copy webhook URL to dashboard .env

## Phase 4: Integrations

### Twilio SMS
1. [ ] Buy phone number
2. [ ] Configure webhook to n8n or dashboard
3. [ ] Add credentials to .env
4. [ ] Test SMS send/receive

### Follow Up Boss
1. [ ] Get API key from FUB dashboard
2. [ ] Test API connection
3. [ ] Map lead fields
4. [ ] Test sync

### Cal.com
1. [ ] Set up booking page
2. [ ] Get API key (if self-hosted)
3. [ ] Configure booking link format
4. [ ] Test booking creation

## Phase 5: End-to-End Testing

- [ ] Submit test lead via webhook
- [ ] Verify lead created in Supabase
- [ ] Verify AI qualification ran
- [ ] Verify SMS sent via Twilio
- [ ] Verify CRM sync to Follow Up Boss
- [ ] Verify dashboard shows lead

## Phase 6: Production Ready

- [ ] Set up error monitoring (Sentry?)
- [ ] Configure Vercel analytics
- [ ] Set up uptime monitoring
- [ ] Document API endpoints
- [ ] Create onboarding guide for agents

## Environment Variables Reference

**Required for MVP:**
```env
# Core
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=

# SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# CRM
FUB_API_KEY=

# Booking
CALCOM_API_KEY=
CALCOM_BOOKING_URL=

# Workflows
N8N_WEBHOOK_URL=
```

## Success Criteria

✅ Lead submitted → Response sent in < 30 seconds  
✅ AI qualification accuracy > 80%  
✅ 100% SMS delivery rate  
✅ CRM sync < 1 minute latency  
✅ Dashboard shows real-time data  

## Cost Monitoring

Track monthly costs:
- Vercel: ~$20
- Supabase: ~$25
- Railway: ~$5
- Twilio: ~$0.01/SMS
- Anthropic: ~$0.05/lead

Target: < $150/month for 1000 leads/month
