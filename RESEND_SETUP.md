# Resend Email Configuration Setup

## Status
✅ **Code Infrastructure:** Complete and tested  
✅ **FROM_EMAIL Environment Variable:** Configured in Vercel (stojan@leadflow.ai)  
⏳ **RESEND_API_KEY:** Requires manual configuration

## What Was Done

### Code Changes (Task: 03d5b1af)
1. **Email Configuration Validation Module** (`lib/email-config-validation.ts`)
   - Validates RESEND_API_KEY and FROM_EMAIL at startup
   - Provides clear error messages if configuration is missing
   - Checks email format validity

2. **Next.js Instrumentation** (`instrumentation.ts` + `next.config.ts`)
   - Calls validation checks when server starts
   - Logs helpful diagnostics to console
   - Non-blocking (app continues even if key is missing)

3. **Comprehensive Tests** (`lib/__tests__/email-config-validation.test.ts`)
   - 6 tests covering all validation scenarios
   - ✅ All tests PASSING
   - Tests cover missing key, invalid email, defaults, etc.

4. **Environment Variables**
   - ✅ FROM_EMAIL added to Vercel production environment
   - Default value: `stojan@leadflow.ai`
   - ⏳ RESEND_API_KEY still needs to be added

5. **Documentation**
   - Updated `.env.example` with email configuration section
   - Added links to Resend API keys dashboard

## What's Blocking Completion

The `RESEND_API_KEY` is a secret credential that must be obtained from your Resend account. To add it:

### Step 1: Get Your RESEND_API_KEY

1. Go to https://resend.com/api-keys
2. If you're not logged in:
   - Log in with your existing Resend account
   - OR create a new account (if you don't have one yet)
3. Click "Create API Key" (or copy existing key if available)
4. Copy the key that starts with `re_`

### Step 2: Add to Vercel

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/projects/leadflow-ai
2. Go to Settings → Environment Variables
3. Add new variable:
   - Name: `RESEND_API_KEY`
   - Value: [Your key from Step 1]
   - Environments: Production (and Preview/Development if you want local testing)
4. Redeploy the project

**Option B: Via Vercel CLI**
```bash
cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard
vercel env add RESEND_API_KEY production
# Paste your key when prompted
```

### Step 3: Verify Configuration

Once you've added the key, you can verify it worked:

1. Check that deployments have the environment variable:
   ```bash
   vercel env ls
   # Should show RESEND_API_KEY in the list
   ```

2. View the Vercel deployment logs when the app starts:
   ```
   ✅ Email configuration looks good
   ```

3. Test email sending by triggering a lead magnet capture on the platform

## How Email Sending Works

**File:** `product/lead-response/dashboard/lib/lead-magnet-email.ts`

The `getResend()` function:
- Returns `null` if RESEND_API_KEY is missing (graceful fallback)
- Emails are logged but not sent
- Once you add the key, emails will be sent via Resend API
- No code changes needed - it will work automatically

## Email Sequence

Once configured, the following emails will be sent:

1. **Email 1 (Immediate):** Playbook Delivery
   - Trigger: Lead magnet capture on landing page
   - Subject: "Your AI Lead Response Playbook is here 🏡"
   
2. **Email 2 (Day 3):** Social Proof Nudge
   - Scheduled by cron job
   - Subject: "What happens when you respond to a lead in 5 minutes vs. 5 hours"

3. **Email 3 (Day 7):** Pilot Offer
   - Scheduled by cron job  
   - Subject: "Pilot spots are almost full — here's your invite"

## Acceptance Criteria Status

- ✅ Code infrastructure is complete and tested
- ✅ FROM_EMAIL is configured in Vercel
- ✅ Existing functionality is not broken
- ✅ Tests pass (6/6)
- ⏳ RESEND_API_KEY needs to be added to Vercel by human

Once you add the RESEND_API_KEY to Vercel, **AC-4 (Delivery Email Sent within 60 seconds)** will pass and all email functionality will work correctly.

## Questions or Issues?

If you're having trouble getting the RESEND_API_KEY:
1. Verify your Resend account is active at https://resend.com
2. Check that your domain (leadflow.ai) is verified in Resend
3. Make sure the API key is not expired
4. Contact Resend support if you can't access your account: support@resend.com

## Related Files

- Validation module: `product/lead-response/dashboard/lib/email-config-validation.ts`
- Email service: `product/lead-response/dashboard/lib/lead-magnet-email.ts`
- Tests: `product/lead-response/dashboard/lib/__tests__/email-config-validation.test.ts`
- Environment template: `product/lead-response/dashboard/.env.example`
- Integration point: `product/lead-response/dashboard/instrumentation.ts`
