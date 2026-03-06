# Twilio SMS Integration

This document describes the real Twilio SMS integration for LeadFlow AI.

## Overview

The Twilio integration enables LeadFlow AI to send and receive SMS messages with leads. It includes:

- Real-time SMS sending via Twilio API
- Delivery status tracking with webhooks
- Cost tracking per message
- Retry logic with exponential backoff
- Error handling and classification

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# Twilio Credentials (from Twilio Console)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER_US=+1xxxxxxxxxx
TWILIO_PHONE_NUMBER_CA=+1xxxxxxxxxx

# Mock Mode (set to 'true' for testing without sending real SMS)
TWILIO_MOCK_MODE=false

# Application URL (for status callbacks)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Twilio Console Setup

1. **Get Credentials**: From Twilio Console → Account → API keys & tokens
2. **Buy Phone Numbers**: From Twilio Console → Phone Numbers → Manage → Buy a number
   - Get one US number for US leads
   - Get one Canadian number for Canadian leads
3. **Configure Webhook**: Set the SMS webhook URL to:
   ```
   https://your-domain.vercel.app/api/webhook/twilio
   ```
4. **Configure Status Callback**: Set the status callback URL to:
   ```
   https://your-domain.vercel.app/api/sms/status
   ```

## Architecture

### SMS Sending Flow

```
1. Lead event triggers SMS
   ↓
2. generateAiSmsResponse() creates message
   ↓
3. sendSms() calls Twilio API
   ↓
4. Twilio queues message
   ↓
5. Message SID stored in database
   ↓
6. Twilio sends status callback
   ↓
7. Database updated with delivery status & cost
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `lib/twilio.ts` | Core Twilio client and SMS functions |
| `app/api/sms/send/route.ts` | API endpoint for sending SMS |
| `app/api/sms/status/route.ts` | Webhook for delivery status |
| `app/api/webhook/twilio/route.ts` | Inbound SMS webhook |

## Database Schema

### Messages Table

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id),
    direction TEXT NOT NULL, -- 'inbound' or 'outbound'
    channel TEXT DEFAULT 'sms',
    message_body TEXT NOT NULL,
    
    -- AI fields
    ai_generated BOOLEAN DEFAULT false,
    ai_confidence DECIMAL(3,2),
    
    -- Twilio fields
    twilio_sid TEXT,
    twilio_status TEXT,
    twilio_error_code TEXT,
    twilio_error_message TEXT,
    twilio_price DECIMAL(10,4),        -- Cost tracking
    twilio_price_unit VARCHAR(3),       -- Usually 'USD'
    twilio_num_segments INTEGER,        -- SMS segments (1 for single, >1 for long)
    
    -- Status tracking
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Retry tracking
    retry_count INTEGER DEFAULT 0,
    retry_attempts JSONB DEFAULT '[]',
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Cost Tracking

### Views for Analytics

**sms_cost_analysis**: Daily cost breakdown
```sql
SELECT 
    DATE_TRUNC('day', sent_at) as date,
    SUM(twilio_price) as total_cost,
    COUNT(*) as total_messages
FROM messages
WHERE direction = 'outbound'
GROUP BY DATE_TRUNC('day', sent_at)
```

**sms_delivery_stats**: Delivery rates by agent
```sql
SELECT 
    agent_id,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*), 
        2
    ) as delivery_rate_pct
FROM messages m
JOIN leads l ON m.lead_id = l.id
WHERE direction = 'outbound'
GROUP BY agent_id
```

## Error Handling

### Retry Logic

- **Max Retries**: 3 attempts
- **Backoff**: 1s, 2s, 4s (exponential)
- **Retryable Errors**: Network errors, timeouts, rate limits
- **Permanent Errors**: Invalid credentials, invalid phone numbers

### Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| 21211 | Invalid phone number | No |
| 21201 | Invalid credentials | No |
| 21614 | Invalid 'From' number | No |
| 31000 | Generic error | Yes |
| 32603 | Carrier error | Yes |
| 22005 | Rate limit | Yes |

## Testing

### Unit Tests

```bash
npm test -- tests/twilio-integration.test.ts
```

### Integration Test (Sends Real SMS!)

```bash
# Set test phone number
export TEST_PHONE_US=+1YOUR_TEST_NUMBER
export TEST_PHONE_CA=+1YOUR_TEST_NUMBER

# Run test
npx ts-node scripts/test-twilio-real.ts
```

### Mock Mode

For development without sending real SMS:

```env
TWILIO_MOCK_MODE=true
```

In mock mode:
- Messages are logged to console
- Mock Message SID is returned
- No charges incurred

## Compliance

### TCPA Compliance

- All messages include opt-out instructions
- STOP/UNSUBSCRIBE keywords are handled
- DNC list is checked before sending
- Consent is tracked per lead

### A2P 10DLC

For production use in the US:
1. Register your brand with Twilio
2. Register your campaign use case
3. Use registered phone numbers

See: https://www.twilio.com/a2p-10dlc

## Monitoring

### Key Metrics

- **Delivery Rate**: % of messages successfully delivered
- **Cost per Message**: Average cost across all messages
- **Retry Rate**: % of messages that required retries
- **Error Rate**: % of messages that failed permanently

### Alerts

Set up alerts for:
- Delivery rate drops below 95%
- Error rate exceeds 5%
- Unusual cost spikes

## Troubleshooting

### Messages Not Sending

1. Check `TWILIO_MOCK_MODE` is `false`
2. Verify credentials are correct
3. Check phone number format (E.164)
4. Review Twilio Console logs

### Delivery Status Not Updating

1. Verify status callback URL is accessible
2. Check webhook signature validation
3. Review application logs

### High Costs

1. Check for long messages (multi-segment)
2. Review retry attempts
3. Monitor international sending

## API Reference

### sendSms(options)

```typescript
const result = await sendSms({
  to: '+14165551234',           // Required: E.164 phone number
  body: 'Hello!',               // Required: Message content
  from: '+15802324685',         // Optional: Override from number
  mediaUrl: 'https://...',      // Optional: Media attachment
  statusCallback: 'https://...' // Optional: Status webhook URL
})

// Result:
{
  success: true,
  messageSid: 'SM123...',
  status: 'queued',
  price: '-0.0075',
  priceUnit: 'USD',
  numSegments: '1'
}
```

### sendAiSmsResponse(lead, agent, messageBody)

```typescript
const result = await sendAiSmsResponse(
  lead,                          // Lead object
  agent,                         // Agent object
  'Hi {{name}}, interested?'     // Message template
)

// Automatically:
// - Replaces {{name}} with lead.name
// - Adds booking link if enabled
// - Adds STOP footer
// - Sets status callback
```

## Support

For issues with:
- **Twilio API**: Contact Twilio Support
- **Integration**: Check logs in Supabase events table
- **Costs**: Review Twilio Console billing
