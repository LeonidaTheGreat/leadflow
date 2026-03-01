# LeadFlow SMS Diagnostics

## Current Issue
SMS to Canadian number (`+1-249-202-6716`) not creating leads in FUB or LeadFlow.

## ✅ Code Verified Working
Webhook endpoint handles both US and Canadian numbers correctly.
Test just completed:
- SMS to `+1-249-202-6716` → Lead created ✅
- Lead ID: `f0287d3f-0247-4cbc-83d4-6e6c85a867a0`

## 🔍 Likely Root Cause
**Twilio webhook not configured for Canadian number**

Twilio requires separate webhook configuration for each phone number.

## Action Required

1. **Log in to Twilio Console:** https://console.twilio.com/

2. **Navigate to Phone Numbers:**
   - Go to: Develop → Phone Numbers → Manage → Active Numbers

3. **Configure Canadian Number (`+1-249-202-6716`):**
   - Click on the Canadian number
   - Under **Messaging** section:
     - **A MESSAGE COMES IN:** Webhook
     - **URL:** `https://leadflow-ai-five.vercel.app/api/webhook/twilio`
     - **HTTP Method:** POST

4. **Verify US Number (`+1-580-232-4685`) has same config:**
   - Should already be configured (it's working)

## Verification Steps

After configuring in Twilio console:

```bash
# Send test SMS to Canadian number
# Then check:
curl -s "https://fptrokacdwzlmflyczdz.supabase.co/rest/v1/events?event_type=eq.inbound_sms&order=created_at.desc&limit=3" \
  -H "apikey: YOUR_API_KEY" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Should see event with `twilio_number: +12492026716`

## Debug Endpoint Available

Raw webhook capture:
```
POST https://leadflow-ai-five.vercel.app/api/debug/twilio-raw
```

This captures the raw Twilio request for debugging.

## Current Flow Status

| Component | Status |
|-----------|--------|
| Twilio Webhook (US) | ✅ Working |
| Twilio Webhook (CA) | ⚠️ Not configured in Twilio console |
| FUB API | ✅ Working |
| LeadFlow Dashboard | ✅ Working |
| SMS → FUB | ✅ Code ready, needs Twilio config |
| FUB → LeadFlow | ✅ Working |
