# UC-FIRST-AGENT-ACTIVATION-TEST: First Agent Onboarding — Validate Product Stickiness

**Use Case ID:** uc-first-agent-activation-test  
**Status:** Ready for QC Execution  
**Priority:** P1 (Critical — revenue validation)  
**Workflow:** PM > Dev > QC  
**Est. Duration:** 15-30 minutes (automated) or 30-60 minutes (manual)

---

## Executive Summary

This use case validates that **a new real estate agent can complete the onboarding flow and receive an automated SMS response to a lead within 5 minutes** — the "aha moment" that proves product-market fit.

The test confirms:
✅ Agent can sign up  
✅ Agent can verify email  
✅ Agent can access dashboard  
✅ Agent can configure FUB integration (or skip with defaults)  
✅ Incoming lead triggers SMS response within 30 seconds  
✅ Lead visible in dashboard immediately  

**Total Time Target:** < 5 minutes

---

## Pre-Test Checklist (5 minutes)

Before executing the test, verify infrastructure is ready:

### ✅ Email Delivery
- [ ] Resend API key configured: `echo $RESEND_API_KEY`
- [ ] Or SendGrid configured: `echo $SENDGRID_API_KEY`
- [ ] Test email endpoint: `curl https://api.imagineapi.org/api/health | grep -i email`
- [ ] Look for: `"RESEND_API_KEY": {"ok": true}`

### ✅ SMS/Twilio
- [ ] Twilio Account SID set: `echo $TWILIO_ACCOUNT_SID`
- [ ] Twilio Auth Token set: `echo $TWILIO_AUTH_TOKEN`
- [ ] Twilio phone number provisioned: Check Twilio dashboard
- [ ] SMS not rate-limited: Check `/api/health` for SMS health status

### ✅ Database
- [ ] PostgreSQL running (local or Supabase)
- [ ] Tables exist: `agents`, `email_verification_tokens`, `leads`, `sms_logs`
- [ ] Test connection: `npm run db:health`

### ✅ API Health
- [ ] Health endpoint responds: `curl https://api.imagineapi.org/api/health`
- [ ] Expected response:
  ```json
  {
    "status": "ok",
    "checks": {
      "RESEND_API_KEY": {"ok": true},
      "TWILIO_ACCOUNT_SID": {"ok": true},
      "database": {"ok": true},
      "api": {"ok": true}
    }
  }
  ```

### ✅ Dashboard Deployed
- [ ] Dashboard accessible: `https://leadflow-ai-five.vercel.app`
- [ ] Or local: `http://localhost:3000`
- [ ] Sign up button visible
- [ ] No console errors

### ✅ Test Environment
- [ ] Browser: Chrome, Firefox, or Safari (latest)
- [ ] Network: Good (no VPN blocking needed)
- [ ] Isolation: No other tests running concurrently
- [ ] Account: Fresh test email (or one that hasn't completed onboarding)

---

## OPTION A: Automated E2E Test (Recommended)

**Time:** 5-15 minutes  
**Difficulty:** Easy (CLI-based)  
**Repeatability:** ⭐⭐⭐⭐⭐ (100% consistent)

### Step 1: Run the E2E Test Suite

```bash
cd /Users/clawdbot/projects/leadflow

# Run all activation tests
npm run test:e2e -- uc-first-agent-activation.test.js

# Or with verbose output
npm run test:e2e -- uc-first-agent-activation.test.js --verbose

# Or with Playwright UI (interactive debugging)
npm run test:e2e -- uc-first-agent-activation.test.js --ui
```

### Step 2: Monitor Test Output

Watch for these key indicators:

```
✓ Step 1: Dashboard accessible after signup (2.3s)
✓ Step 2: Signup flow with email (3.1s)
✓ Step 3: Email verification (1.2s)
✓ Step 4: Login to dashboard (2.8s)
✓ Step 5: View FUB integration option (1.5s)
✓ Step 6: Create test lead via webhook (0.8s)
✓ Step 7: Verify SMS sent within 30 seconds (4.2s)
✓ Step 8: Verify lead visible in dashboard (2.1s)
✓ AHA MOMENT VALIDATION: Complete flow in <5 minutes (18.0s)

✓ Infrastructure check: Twilio configured
✓ Infrastructure check: Email delivery configured
✓ Infrastructure check: Database connectivity
✓ Infrastructure check: API endpoints responsive

───────────────────────────────────────
✅ All tests passed (13 passed, 0 failed, 18s)
───────────────────────────────────────

AHA MOMENT ACHIEVED ✨
Total Time: 18 seconds (Target: <5 minutes)
Agent Onboarding to SMS Response: SUCCESSFUL
```

### Step 3: Success Criteria

| Check | Pass Criteria |
|-------|--------------|
| **Pre-Test Checklist** | All items checked ✅ |
| **Signup** | No errors, email verified within 2 min |
| **Login** | Dashboard or wizard accessible |
| **FUB Integration** | Visible in UI (configured or skipped) |
| **Test Lead** | Created via webhook successfully |
| **SMS Delivery** | Sent within 30 seconds |
| **Dashboard** | Lead visible immediately after SMS |
| **Total Time** | < 5 minutes |

### Step 4: If Test Fails

See **Troubleshooting** section below.

---

## OPTION B: Manual Test Steps (For Hands-On Validation)

**Time:** 30-60 minutes  
**Difficulty:** Medium (browser-based, requires interaction)  
**Repeatability:** ⭐⭐⭐ (Can vary by user input timing)

### Step 1: Fresh Email Address
Create a unique test email (never used in this system):
```
test-agent-<your-initials>-<timestamp>@imagineapi.org
```
Example: `test-agent-jd-1698765432@imagineapi.org`

### Step 2: Sign Up
1. Navigate to: `https://leadflow-ai-five.vercel.app`
2. Click "Get Started" or "Sign Up"
3. Enter:
   - **Email:** Your test email (from Step 1)
   - **Password:** `TestPassword123!`
4. Click "Sign Up"
5. **Expected:** Redirected to email verification or dashboard
6. **TIME MARKER:** Note the time (T0)

### Step 3: Verify Email
1. Check inbox for email from "Imagine API" or "LeadFlow"
2. Subject: "Verify your email"
3. Click the verification link
4. **Expected:** Redirected to dashboard
5. **TIME MARKER:** Email verified time (T1)

### Step 4: Login (if not already logged in)
1. Go to: `https://leadflow-ai-five.vercel.app/auth/login`
2. Enter email and password
3. Click "Log In"
4. **Expected:** Redirected to dashboard
5. **TIME MARKER:** Logged in time (T2)

### Step 5: Complete Onboarding Wizard (if prompted)
1. If onboarding wizard appears, complete 3-5 steps:
   - "What's your name?"
   - "What's your phone number?"
   - "How many leads do you want?"
   - "Connect to Follow Up Boss?" (optional — skip for now)
   - "Done!"
2. **Expected:** Wizard closes, dashboard visible
3. **TIME MARKER:** Wizard completed (T3)

### Step 6: View FUB Integration (Optional but recommended)
1. Go to: Dashboard → Integrations (or Settings → Integrations)
2. Look for "Follow Up Boss" or "FUB" option
3. **Expected:** Option to configure or status showing "Not Connected"
4. **Note:** Skip actual FUB configuration for this test
5. **TIME MARKER:** Integrations reviewed (T4)

### Step 7: Create Test Lead via Webhook
Use the provided test script to send a lead to your agent:

```bash
# Run the test lead injection script
npm run inject-test-lead -- --email="<your-test-email>" --phone="+12025551234"

# Or via curl:
curl -X POST https://api.imagineapi.org/webhook/fub-inbound \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LEADFLOW_API_KEY" \
  -d '{
    "agent_email": "<your-test-email>",
    "phone": "+12025551234",
    "name": "Test Lead",
    "message": "Looking for a 3BR house",
    "source": "test-manual"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Lead ingested and SMS queued",
  "lead_id": "lead_12345",
  "sms_queued": true
}
```

**TIME MARKER:** Test lead created (T5)

### Step 8: Wait for SMS
1. After webhook call, wait for SMS to arrive on `+12025551234` (or test number you provided)
2. **Expected SMS:** "Hi! We have someone interested in your services..."
3. **Time to arrive:** Should be <30 seconds
4. **NOTE:** If you don't have a real phone, check the `sms_logs` table:

```bash
# In terminal/database tool:
psql $LOCAL_PG_URL -c "SELECT * FROM sms_logs WHERE to_phone = '+12025551234' ORDER BY created_at DESC LIMIT 1;"
```

Look for:
- `status = 'sent'` or `'delivered'`
- `created_at` < 30 seconds after test lead creation
- `body` contains agent's response message

**TIME MARKER:** SMS sent/delivered (T6)

### Step 9: Verify Lead in Dashboard
1. Go to: Dashboard → Leads
2. Look for lead with phone `+12025551234`
3. Click the lead to view details
4. **Expected:** Lead details show:
   - Phone number
   - Name "Test Lead"
   - Message "Looking for a 3BR house"
   - Status: "Contacted" or "SMS Sent"
   - SMS response text visible
5. **TIME MARKER:** Lead visible in dashboard (T7)

### Step 10: Calculate Total Time
```
T0 = Signup start
T7 = Lead visible in dashboard

TOTAL TIME = T7 - T0

✅ PASS if TOTAL TIME < 5 minutes (300 seconds)
⚠️ WARNING if TOTAL TIME 5-10 minutes
❌ FAIL if TOTAL TIME > 10 minutes
```

---

## Acceptance Criteria

### All Steps Must Pass

| Step | Criterion | Pass/Fail |
|------|-----------|-----------|
| **1. Signup** | No errors, email verified | |
| **2. Email Delivery** | Verification email arrives <2 min | |
| **3. Login** | Dashboard accessible | |
| **4. Wizard (if shown)** | Completes without errors | |
| **5. FUB Integration** | Visible in UI (even if not configured) | |
| **6. Test Lead Created** | Webhook returns success | |
| **7. SMS Sent** | Arrives <30 seconds after lead creation | |
| **8. Lead Visible** | Appears in dashboard immediately | |
| **9. AHA MOMENT** | All above + total time <5 min | |

### Pass Condition
✅ **PASS** if:
- All 9 steps complete without errors
- SMS arrives within 30 seconds
- Lead visible in dashboard
- Total time < 5 minutes
- Agent understands the value proposition

### Fail Condition
❌ **FAIL** if any:
- Signup fails or email never arrives
- SMS doesn't send or takes >30 seconds
- Lead not visible in dashboard
- Total time > 10 minutes
- Error messages appear

---

## Metrics to Capture

Record these for the QC report:

```markdown
## Test Execution Log — uc-first-agent-activation-test

**Test Date:** 2026-03-31  
**Tester:** [Your Name]  
**Test Method:** [Automated / Manual]  

### Timing Breakdown
| Step | Time (seconds) | Status |
|------|---|---|
| Signup | 3.2 | ✅ |
| Email Verification | 12.5 | ✅ |
| Login | 2.8 | ✅ |
| Dashboard Access | 1.2 | ✅ |
| Wizard (optional) | 15.0 | ✅ |
| FUB Integration View | 1.5 | ✅ |
| Test Lead Creation | 0.8 | ✅ |
| SMS Delivery | 4.2 | ✅ |
| Lead Visible | 2.1 | ✅ |
| **TOTAL** | **43.3 seconds** | ✅ |

### Infrastructure Status
- Twilio: ✅ Working
- Email: ✅ Working
- Database: ✅ Working
- API: ✅ Working

### User Experience Notes
- Dashboard is intuitive
- Signup form clear
- Email verification straightforward
- SMS arrives very quickly
- Lead data accurate

### Blockers / Issues
None.

### Recommendation
✅ **PASS** — Product ready for first paid agent onboarding.
```

---

## Troubleshooting

### ❌ Email Never Arrives (Signup Verification)

**Diagnosis:**
1. Check RESEND_API_KEY is set: `echo $RESEND_API_KEY`
2. Check Vercel env var: `vercel env ls`
3. Check email was actually sent:
   ```bash
   psql $LOCAL_PG_URL -c "SELECT * FROM email_logs WHERE to_email = '<your-email>' ORDER BY created_at DESC LIMIT 5;"
   ```

**Solutions:**
- [ ] Add RESEND_API_KEY to Vercel: `vercel env add`
- [ ] Redeploy dashboard: `cd product/lead-response/dashboard && vercel --prod`
- [ ] Try different email address (Gmail, not Outlook if on corporate)
- [ ] Wait 5-10 minutes (Resend may have delays)
- [ ] Check spam folder
- [ ] **Dev Bypass:** Use `/api/auth/verify-email-admin` endpoint to force verification

### ❌ SMS Never Sends (After Lead Created)

**Diagnosis:**
1. Check Twilio account active: `echo $TWILIO_ACCOUNT_SID`
2. Check SMS logs:
   ```bash
   psql $LOCAL_PG_URL -c "SELECT * FROM sms_logs WHERE to_phone = '<phone>' ORDER BY created_at DESC LIMIT 5;"
   ```
3. Look for error message in `error_message` column

**Common Errors:**
- `"Invalid phone number"` → Use valid E.164 format: `+12025551234`
- `"Rate limited"` → Wait 60 seconds, try again
- `"Twilio account inactive"` → Check Twilio billing/status
- `"Invalid API key"` → Verify `TWILIO_AUTH_TOKEN` in `.env`

**Solutions:**
- [ ] Verify phone number format: `+1 [area] [exchange] [number]`
- [ ] Check Twilio account balance (may be depleted)
- [ ] Redeploy webhook: `git push && vercel --prod`
- [ ] Test Twilio directly via API: `curl -X POST https://api.twilio.com/...`
- [ ] Wait and retry (rate limiting)

### ❌ Lead Not Visible in Dashboard

**Diagnosis:**
1. Check lead was created:
   ```bash
   psql $LOCAL_PG_URL -c "SELECT * FROM leads WHERE phone = '<phone>' ORDER BY created_at DESC LIMIT 1;"
   ```
2. Check lead-agent association:
   ```bash
   psql $LOCAL_PG_URL -c "SELECT * FROM leads WHERE agent_id = '<agent-id>' AND created_at > NOW() - INTERVAL '5 min';"
   ```

**Solutions:**
- [ ] Hard refresh dashboard: `Cmd+Shift+R` or `Ctrl+Shift+R`
- [ ] Log out and log back in
- [ ] Check browser console for errors: `F12 → Console tab`
- [ ] Verify lead exists in database (see query above)
- [ ] Check agent_id matches: Dashboard should show same agent that received the lead

### ❌ Total Time > 5 Minutes

**Common Causes:**
- Email verification slow (>2 min) → Resend delays or ISP issues
- Wizard takes long → Expected; document the time
- SMS delivery slow (>10 sec) → Twilio queue backed up
- Dashboard slow → CDN cache issue or server load

**Solutions:**
- [ ] If email slow: This is often ISP-dependent, not a product issue
- [ ] If wizard slow: Skip wizard for automated testing
- [ ] If SMS slow: Check Twilio dashboard for account status
- [ ] If dashboard slow: Clear browser cache and hard refresh
- [ ] Retry test at different time (avoid peak hours)

---

## Success Metrics

### For Dev/QC
| Metric | Target | Pass Rate |
|--------|--------|-----------|
| Test Completion | 100% | % |
| SMS Latency | <30s | % |
| Total Flow Time | <5 min | % |
| Email Verification Time | <2 min | % |
| API Uptime | 99.9% | % |

### For Product
- ✅ Product proves "aha moment" in <5 minutes
- ✅ Can pitch to first paid agent with confidence
- ✅ Sets expectations for future onboarding
- ✅ Validates product-market fit assumption

---

## When to Run This Test

1. **Initial Deployment:** After first agent feature deployment
2. **After SMS Changes:** Any Twilio/Twilio-related code change
3. **After Auth Changes:** Email verification or login flow changes
4. **Before Revenue Launch:** Before opening to paid agents
5. **Weekly Smoke Test:** Part of CI/CD pipeline or manual regression
6. **Agent Support Issue:** If agent reports onboarding problem

---

## Quick Reference

```bash
# Automated Test
npm run test:e2e -- uc-first-agent-activation.test.js

# Health Check
curl https://api.imagineapi.org/api/health | jq .

# Manual Test Lead Injection
npm run inject-test-lead -- --email="test@example.com" --phone="+12025551234"

# View SMS Logs
psql $LOCAL_PG_URL -c "SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10;"

# View Email Logs
psql $LOCAL_PG_URL -c "SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;"

# Check Database Tables
npm run db:health
```

---

## Sign-Off

**This UC is ready for QC execution when:**
- ✅ Pre-test checklist passes
- ✅ At least one test method (automated or manual) selected
- ✅ All infrastructure checks pass
- ✅ QC has fresh test email ready
- ✅ Tester understands success criteria

**Report Status to PM/Orchestrator:**
- ✅ PASS → Product ready for first paid agent
- ❌ FAIL → Document specific failure and unblock team
- ⚠️ PARTIAL → Document which steps fail and why

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-31  
**Created By:** Dev Agent  
**For Questions:** See CLAUDE.md or contact Dev/Product team
