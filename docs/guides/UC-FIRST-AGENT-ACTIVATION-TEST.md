# UC: First Agent Onboarding — Validate Product Stickiness

**Use Case ID:** `uc-first-agent-activation-test`  
**Priority:** P1 (Critical)  
**Phase:** Phase 3  
**Workflow:** Product (setup) → Dev (test env) → QC (manual test)  
**Success Metric:** AHA MOMENT in <5 minutes

---

## Overview

This use case validates that a newly onboarded trial agent can:
1. Create an account and login
2. Configure FUB integration
3. Receive and respond to test leads via SMS
4. See the lead response in the dashboard within <5 minutes

**Key Success Criteria:**
- ✓ Account creation works
- ✓ Email verification triggers trial activation
- ✓ Dashboard is accessible and functional
- ✓ FUB integration can be connected
- ✓ Test lead triggers SMS response
- ✓ SMS arrives within 30 seconds
- ✓ Lead visible in dashboard immediately after SMS

---

## Pre-Test Checklist

Before executing this test, verify:

- [ ] **Email Delivery**: Resend API key configured in `VERCEL_ENV` or `.env`
  - Test: `node scripts/diagnostics/test-email-delivery.js`
  
- [ ] **Twilio SMS**: Twilio account configured with phone number
  - Test: `node scripts/diagnostics/test-twilio-sms.js`

- [ ] **FUB API**: FUB test API key available (from Follow Up Boss sandbox)
  - Required: Follow Up Boss account + API key
  
- [ ] **Database**: PostgreSQL running with schema up-to-date
  - Test: `npm run db:health`

- [ ] **Vercel Deployment**: Dashboard accessible at production URL
  - Test: `curl https://leadflow-ai-five.vercel.app/api/health`

---

## Test Execution (Manual)

### Option A: Automated (using Playwright E2E test)

```bash
# Run the automated e2e test
npm run test:e2e -- uc-first-agent-activation.test.js

# Or with specific settings
PLAYWRIGHT_HEADLESS=false npm run test:e2e -- uc-first-agent-activation.test.js
```

**Expected Output:**
```
✓ Step 1 PASS: Dashboard accessible
✓ Step 2 PASS: FUB integration available
✓ Step 3 PASS: FUB configured (or WARNING: manual config required)
✓ Step 4 PASS: Test lead created
✓ Step 5 PASS: SMS sent (2500ms)
✓ Step 6 PASS: Lead visible in dashboard
✅ AHA MOMENT ACHIEVED (Total: 45s)
```

### Option B: Manual Test Steps (for QC)

**Prerequisites:**
- FUB test account with API key
- Twilio test phone number
- Real email address for signup (or use test@example.com)

**Step 1: Create Trial Account**
1. Go to https://leadflow-ai-five.vercel.app/signup
2. Enter email: `test-agent-[DATE]@example.com`
3. Enter password: `TempPassword123!`
4. Click "Sign Up"
5. **Expected:** Redirect to verify email page

**Step 2: Verify Email**
1. Check email inbox (or Mailgun/Resend logs)
2. Click verification link
3. **Expected:** Redirect to onboarding or dashboard

**Step 3: Dashboard Access**
1. You should be automatically logged in after email verification
2. If not, return to login and use same credentials
3. **Expected:** See dashboard with "Connect Integration" CTA

**Step 4: Configure FUB Integration**
1. Click "Connect Integrations" or "Settings → Integrations"
2. Click "Follow Up Boss"
3. Paste FUB API key (from test account)
4. Click "Connect"
5. **Expected:** Integration status shows "Connected ✓"

**Step 5: Create Test Lead (via FUB)**
1. Go to your FUB test account at fub.com
2. Create a new lead manually:
   - Name: "E2E Test Lead"
   - Phone: "+1 202-555-1234"
   - Source: "Website Form"
   - Message: "Interested in demo"
3. **Expected:** Lead created in FUB

**Step 6: Verify SMS Sent**
1. The agent should receive an SMS to their phone in <30 seconds
2. SMS should say something like: "New lead from FUB: E2E Test Lead. Interested in demo. Reply to respond."
3. **Expected:** SMS arrives within 30 seconds

**Step 7: Check Dashboard**
1. Refresh the LeadFlow dashboard
2. Navigate to "Leads" or "Recent Activity"
3. The test lead should appear in the list
4. **Expected:** Lead visible with SMS status showing "sent"

**Step 8: Timeline Validation**
1. Note the total time from account creation to SMS received
2. **Expected:** <5 minutes total, <30 seconds from lead creation to SMS

---

## Success Criteria (Pass/Fail)

### ✅ PASS Conditions
- All 7 steps completed without errors
- SMS received within 30 seconds of lead creation
- Lead visible in dashboard immediately
- Total time from signup to SMS <5 minutes
- Agent can see lead in dashboard and understand the "aha moment"

### ❌ FAIL Conditions
- Any step times out or errors
- SMS not received within 60 seconds
- Lead not visible in dashboard
- Total time >5 minutes
- Dashboard doesn't show lead status updates

### ⚠️ PARTIAL PASS Conditions (escalate to Dev)
- Email verification doesn't work → Email delivery issue
- FUB integration fails → API key or connectivity issue
- SMS doesn't send → Twilio issue or lead ingestion broken
- Lead not visible in dashboard → Database or API issue

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Email not received | Resend API key missing | Add `RESEND_API_KEY` to `.env` in Vercel |
| Can't login after signup | Trial not auto-activated | Run: `node scripts/db/activate-trial-accounts.js` |
| SMS not sent | Twilio account or phone number | Check `TWILIO_PHONE_NUMBER` in `.env` |
| Lead not in dashboard | Database not syncing | Check webhook logs: `npm run logs:webhooks` |
| Dashboard slow/unresponsive | Vercel cold start | Refresh page, wait 10s, try again |
| FUB integration fails | Wrong API key or FUB down | Test FUB directly: https://dev.followupboss.com/api |

---

## Acceptance Checklist (for QC)

- [ ] Test environment is clean (no conflicting test data)
- [ ] All pre-test checklist items passing
- [ ] Manual test executed successfully (or automated test passed)
- [ ] AHA MOMENT validated: agent receives SMS <30s, sees in dashboard
- [ ] Total time <5 minutes documented
- [ ] All 7 steps completed without escalation
- [ ] Screenshots/video recorded if possible
- [ ] No errors in browser console or server logs
- [ ] Sign-off: Test completed by QC agent

---

## Metrics to Capture

When executing this test, capture:

1. **Email Delivery Time**: Time from signup to verification email received
2. **Lead Ingestion Latency**: Time from FUB create to LeadFlow webhook received
3. **SMS Send Latency**: Time from lead creation to SMS sent
4. **Dashboard Sync Latency**: Time from SMS sent to lead visible in dashboard
5. **Total Time**: From account signup to SMS received
6. **Agent Experience**: Any friction points or confusion in the flow

---

## Related Documentation

- [4-LOOP-ARCHITECTURE.md](./4-LOOP-ARCHITECTURE.md) — System architecture
- [CLAUDE.md](../CLAUDE.md) — Project context
- [FUB Integration Guide](./FUB-INTEGRATION-SETUP.md)
- [Twilio SMS Setup](./TWILIO-SMS-SETUP.md)

---

## Sign-Off

**Status:** 🟡 Ready for Manual Testing (Automated test script available)  
**Last Updated:** 2026-03-31  
**Assigned to:** QC Agent (manual execution)

When this test passes, update the use case status:
```
UPDATE use_cases SET implementation_status = 'complete' 
WHERE id = 'uc-first-agent-activation-test';
```
