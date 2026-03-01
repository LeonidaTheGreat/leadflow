# n8n Workflows

## Setup (Railway)

1. Deploy n8n to Railway:
   - Use template: https://railway.app/template/n8n
   - Set environment variables (see below)

2. Configure webhooks:
   - Get webhook URL from Railway
   - Update `.env.local` with `N8N_WEBHOOK_URL`

## Workflows

### 1. Lead Intake Flow (`lead-intake.json`)

**Trigger:** Webhook POST to `/webhook/lead-intake`

**Flow:**
1. Receive lead (Zillow, webform, etc.)
2. Validate + normalize phone number
3. Create lead record in Supabase
4. Trigger AI qualification
5. Send to SMS flow

**Payload Example:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+15555551234",
  "source": "zillow",
  "message": "Interested in 3BR house in Austin under $500k"
}
```

### 2. AI Qualification Flow (`ai-qualification.json`)

**Trigger:** HTTP request from lead intake

**Flow:**
1. Get lead details
2. Call Vercel AI API (Claude 3.5)
3. Parse qualification (intent, budget, timeline, location)
4. Save qualification to Supabase
5. Return qualified status

### 3. SMS Response Flow (`sms-response.json`)

**Trigger:** Qualification complete

**Flow:**
1. Get qualification result
2. Select response template
3. Populate variables (name, booking link, etc.)
4. Send via Twilio
5. Log conversation to Supabase
6. Sync to Follow Up Boss CRM

### 4. Follow Up Boss Sync (`fub-sync.json`)

**Trigger:** Lead created or updated

**Flow:**
1. Map lead data to FUB format
2. POST to Follow Up Boss API
3. Store FUB ID in lead metadata
4. Log sync event

## Environment Variables (Railway n8n)

```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password

# Database (for n8n state)
DATABASE_TYPE=postgresdb
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_NAME=n8n
DATABASE_USER=n8n
DATABASE_PASSWORD=your-db-password

# Timezone
GENERIC_TIMEZONE=America/New_York

# External APIs (same as dashboard .env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-api03-...
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
FUB_API_KEY=your-fub-api-key
```

## Testing Workflows

Use n8n's built-in test mode or POST to webhook:

```bash
curl -X POST $N8N_WEBHOOK_URL/lead-intake \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead",
    "phone": "+15555559999",
    "source": "test",
    "message": "Looking to buy a house"
  }'
```

## Deployment

Workflows are version-controlled as JSON exports. Import via n8n UI:

1. Settings > Import from File
2. Select workflow JSON
3. Activate workflow
4. Copy webhook URL
