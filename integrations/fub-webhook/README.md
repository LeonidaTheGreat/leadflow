# FUB AI Webhook Integration

Receives lead data from AI agent and creates/updates contacts in Follow Up Boss CRM.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your FUB API key
   ```

3. **Get FUB API Key:**
   - Go to FUB → Admin → API → API Keys
   - Copy your API key (starts with `fub_`)
   - Paste into `.env` file

4. **Start server:**
   ```bash
   npm start
   ```

## Deploy

### Option 1: Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod
```

### Option 2: Railway
```bash
railway login
railway init
railway up
```

### Option 3: Self-hosted
Use PM2 or Docker on your own server.

## Webhook URL

After deploy, your webhook URL is:
```
https://your-domain.com/webhook/fub-lead
```

## AI Agent Integration

Send POST request to webhook URL:

```javascript
const lead = {
  name: "John Smith",
  phone: "+15551234567",
  email: "john@example.com",
  source: "AI Chatbot",
  property_interest: "3BR homes in Austin",
  urgency: "hot",
  ai_summary: "Looking to buy within 30 days, pre-approved",
  ai_qualified: true
};

fetch('https://your-domain.com/webhook/fub-lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(lead)
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FUB_API_KEY` | Yes | Your Follow Up Boss API key |
| `WEBHOOK_SECRET` | No | Optional secret to secure webhook |
| `PORT` | No | Server port (default: 3000) |

## Testing

Run test script:
```bash
npm test
```

This sends a test lead to your local webhook.

## Custom Fields in FUB

This webhook populates these custom fields (create them in FUB first):
- AI Qualified (Yes/No)
- AI Lead Source (Text)
- AI Conversation Summary (Long Text)
- AI Handoff Timestamp (Date/Time)
- Property Interest (Text)
- Urgency Level (Dropdown: hot/warm/cold)
