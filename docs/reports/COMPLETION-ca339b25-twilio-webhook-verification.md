# Twilio Webhook URL Verification

**Task ID:** ca339b25-7113-4348-ab56-77c8641baaee  
**Date:** 2026-04-05  
**Status:** ✅ VERIFIED

---

## Summary

Verified Twilio webhook endpoint configuration. The correct production URL for the Twilio inbound SMS webhook is:

**`https://fub-inbound-webhook.vercel.app/webhook/twilio/inbound`**

---

## Endpoint Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `https://fub-inbound-webhook.vercel.app/webhook/twilio/inbound` | ✅ LIVE | Returns 403 (Invalid signature) for unsigned requests — correct behavior |
| `https://leadflow-ai-five.vercel.app/api/webhook/twilio` | ⚠️ LIVE but insecure | Returns 200 for unsigned requests — no signature validation |
| `https://leadflow-five-blush.vercel.app/webhook/twilio/inbound` | ❌ BROKEN | Returns 500 FUNCTION_INVOCATION_FAILED |

---

## Architecture

- **`fub-inbound-webhook.vercel.app`** — Deploys `server.js` (Express). Handles FUB webhooks, Twilio inbound SMS, and Cal.com events. **This is the correct Twilio target.**
- **`leadflow-ai-five.vercel.app`** — Deploys Next.js customer dashboard. Also has a `/api/webhook/twilio` route but it **lacks Twilio signature validation** (security gap).

---

## Signature Validation

The `fub-inbound-webhook` endpoint validates Twilio signatures via `verifyTwilioSignature()` in `integrations/twilio-inbound-sms.js`:
- Uses `TWILIO_AUTH_TOKEN` from env
- Uses `TWILIO_WEBHOOK_URL` env var as the URL for signature computation
- In production: rejects invalid signatures with HTTP 403

**Critical:** The `TWILIO_WEBHOOK_URL` env var in the `fub-inbound-webhook` Vercel project must be set to `https://fub-inbound-webhook.vercel.app/webhook/twilio/inbound`. If not set, it falls back to `http://localhost:3000/webhook/twilio/inbound` which will cause ALL Twilio requests to be rejected.

---

## Required Action

1. **Twilio Console:** Configure the inbound SMS webhook URL for your Twilio phone number to:
   ```
   https://fub-inbound-webhook.vercel.app/webhook/twilio/inbound
   ```
   Method: **HTTP POST**

2. **Vercel Env Var:** Ensure `TWILIO_WEBHOOK_URL` is set in the `fub-inbound-webhook` Vercel project:
   ```
   TWILIO_WEBHOOK_URL=https://fub-inbound-webhook.vercel.app/webhook/twilio/inbound
   ```

3. **Security Note:** The Next.js dashboard webhook at `/api/webhook/twilio` lacks signature validation — it should either add validation or be removed to prevent unauthorized SMS injection.

---

## TCPA Compliance

Routing Twilio inbound SMS to `fub-inbound-webhook.vercel.app` (not localhost or a local server) ensures:
- Requests are processed in Vercel's production environment (not a developer's machine)
- Signature validation rejects spoofed requests
- Opt-out (STOP) messages are processed reliably with TCPA footer on outbound messages
