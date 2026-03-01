# UC-11: Stripe Test Clock Testing Guide

**Document Type:** Testing Guide  
**Status:** Ready for PM Validation  
**Date:** 2026-02-27  
**UC:** UC-11 - Subscription Lifecycle Management

---

## Overview

This guide provides step-by-step instructions for testing subscription lifecycle events using Stripe Test Clocks. Test Clocks allow you to simulate the passage of time and test time-based subscription events without waiting for real time to pass.

**What you'll test:**
- ✅ Subscription renewals (invoice.paid)
- ✅ Failed payment retry sequences (invoice.payment_failed)
- ✅ Plan upgrades and downgrades (customer.subscription.updated)
- ✅ Subscription cancellations (customer.subscription.deleted)
- ✅ Email notifications for all events
- ✅ Database updates and consistency

---

## Prerequisites

1. **Stripe Account:** Test mode access
2. **LeadFlow Dev Environment:** Local or staging
3. **Database Access:** Supabase dashboard
4. **Email Access:** To verify notification emails

---

## Setup Instructions

### Step 1: Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. URL: `https://your-app.vercel.app/api/webhooks/stripe`
4. Events to send:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy webhook signing secret
6. Add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### Step 2: Create Test Clock

1. Go to [Test Clocks](https://dashboard.stripe.com/test/billing/subscriptions/test-clocks)
2. Click **"Create test clock"**
3. Configuration:
   - **Name:** UC-11 Subscription Lifecycle Test
   - **Start time:** Current date/time
   - **Frozen:** Leave unchecked (you'll advance manually)
4. Click **"Create"**
5. Note the test clock ID (e.g., `clock_xxx`)

---

## Test Scenarios

### Test 1: Successful Renewal (invoice.paid)

**Goal:** Verify subscription renews automatically and sends confirmation email

**Steps:**

1. **Create Test Customer**
   - Go to [Customers](https://dashboard.stripe.com/test/customers)
   - Click "Add customer"
   - Email: `uc11-renewal@example.com`
   - Name: UC-11 Renewal Test
   - **Test clock:** Select "UC-11 Subscription Lifecycle Test"
   - Click "Add customer"

2. **Create Subscription**
   - In customer page, click "Add subscription"
   - Select product: LeadFlow Pro ($149/month)
   - Payment method: 4242 4242 4242 4242 (test card)
   - Click "Create subscription"

3. **Verify Initial State**
   - In Supabase dashboard, check `customers` table:
     ```sql
     SELECT status, plan_tier, mrr, current_period_end
     FROM customers
     WHERE email = 'uc11-renewal@example.com';
     ```
   - Expected: `status = 'active'`, `mrr = 149`

4. **Advance Time to Renewal**
   - Go to Test Clock page
   - Click **"Advance time"**
   - Advance by: **30 days** (one billing cycle)
   - Click "Advance"

5. **Verify Renewal**
   - Check Stripe dashboard: Invoice should show as "Paid"
   - Check database:
     ```sql
     SELECT current_period_end, updated_at
     FROM customers
     WHERE email = 'uc11-renewal@example.com';
     ```
   - Expected: `current_period_end` updated to +30 days
   
   - Check payment recorded:
     ```sql
     SELECT * FROM payments
     WHERE customer_id = (
       SELECT id FROM customers WHERE email = 'uc11-renewal@example.com'
     )
     ORDER BY created_at DESC
     LIMIT 1;
     ```
   - Expected: New payment row, `status = 'paid'`, `amount = 149`

6. **Verify Email Sent**
   - Check email events:
     ```sql
     SELECT * FROM email_events
     WHERE customer_id = (
       SELECT id FROM customers WHERE email = 'uc11-renewal@example.com'
     )
     AND email_type = 'renewal_success'
     ORDER BY created_at DESC
     LIMIT 1;
     ```
   - Expected: Email event with `status = 'sent'` or `'queued'`
   - If Resend is configured, check inbox for renewal confirmation

✅ **PASS CRITERIA:**
- [ ] Invoice paid automatically
- [ ] `current_period_end` extended by 30 days
- [ ] Payment recorded in `payments` table
- [ ] Email event logged with type `renewal_success`
- [ ] Customer receives email (if Resend configured)

---

### Test 2: Failed Payment Retry Sequence (invoice.payment_failed)

**Goal:** Verify failed payment handling and retry logic

**Steps:**

1. **Create Test Customer with Failing Card**
   - Create new customer (same process as Test 1)
   - Email: `uc11-failed@example.com`
   - **Payment method:** 4000 0000 0000 0341 (card_declined)
   - Create subscription (Pro plan)

2. **Advance to First Payment Attempt**
   - Advance test clock by 30 days
   - Payment will fail

3. **Verify First Failure**
   - Check database:
     ```sql
     SELECT status FROM customers
     WHERE email = 'uc11-failed@example.com';
     ```
   - Expected: `status = 'past_due'`
   
   - Check subscription events:
     ```sql
     SELECT * FROM subscription_events
     WHERE customer_id = (
       SELECT id FROM customers WHERE email = 'uc11-failed@example.com'
     )
     AND event_type = 'payment_failed'
     ORDER BY created_at DESC
     LIMIT 1;
     ```
   - Expected: `attempt_count = 1`

4. **Verify First Failure Email**
   - Check email events:
     ```sql
     SELECT * FROM email_events
     WHERE customer_id = (
       SELECT id FROM customers WHERE email = 'uc11-failed@example.com'
     )
     AND email_type = 'payment_failed';
     ```
   - Expected: Email with "Attempt 1 of 3" message

5. **Advance to Retry 2**
   - Advance test clock by **3 days** (Stripe's default first retry)
   - Check `attempt_count = 2` in subscription_events

6. **Advance to Retry 3**
   - Advance test clock by **5 days** (second retry)
   - Check `attempt_count = 3` in subscription_events

7. **Final State After All Retries**
   - Expected: `status = 'unpaid'` or `'past_due'`
   - Expected: 3 email_events for payment_failed

✅ **PASS CRITERIA:**
- [ ] Status changes to `past_due` on first failure
- [ ] 3 retry attempts logged
- [ ] Email sent for each failed attempt
- [ ] Email includes portal URL for payment update
- [ ] Final email indicates "final attempt"

---

### Test 3: Subscription Upgrade (customer.subscription.updated)

**Goal:** Verify upgrade flow and proration

**Steps:**

1. **Create Test Customer with Starter Plan**
   - Email: `uc11-upgrade@example.com`
   - Subscription: LeadFlow Starter ($49/month)
   - Payment method: 4242 4242 4242 4242

2. **Verify Initial State**
   ```sql
   SELECT plan_tier, mrr FROM customers
   WHERE email = 'uc11-upgrade@example.com';
   ```
   - Expected: `plan_tier = 'starter'`, `mrr = 49`

3. **Upgrade to Pro**
   - In Stripe customer page, click "Update subscription"
   - Change to: LeadFlow Pro ($149/month)
   - Proration: "Create prorations" (default)
   - Click "Update"

4. **Verify Immediate Upgrade**
   ```sql
   SELECT plan_tier, mrr, status FROM customers
   WHERE email = 'uc11-upgrade@example.com';
   ```
   - Expected: `plan_tier = 'pro'`, `mrr = 149`, `status = 'active'`

5. **Verify Upgrade Event**
   ```sql
   SELECT * FROM subscription_events
   WHERE customer_id = (
     SELECT id FROM customers WHERE email = 'uc11-upgrade@example.com'
   )
   AND event_type = 'subscription_upgraded'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Expected: `old_plan_tier = 'starter'`, `plan_tier = 'pro'`, `mrr_change = 100`

6. **Verify Upgrade Email**
   ```sql
   SELECT * FROM email_events
   WHERE customer_id = (
     SELECT id FROM customers WHERE email = 'uc11-upgrade@example.com'
   )
   AND email_type = 'subscription_upgraded';
   ```
   - Expected: Email with new features listed

✅ **PASS CRITERIA:**
- [ ] Plan tier updated immediately
- [ ] MRR increased correctly
- [ ] Proration invoice created
- [ ] Upgrade event logged with old and new plan
- [ ] Upgrade email sent with feature list

---

### Test 4: Subscription Downgrade (customer.subscription.updated)

**Goal:** Verify downgrade flow (effective at period end)

**Steps:**

1. **Create Test Customer with Team Plan**
   - Email: `uc11-downgrade@example.com`
   - Subscription: LeadFlow Team ($399/month)
   - Payment method: 4242 4242 4242 4242

2. **Downgrade to Pro**
   - Update subscription to Pro ($149/month)
   - Note: Downgrade takes effect at period end (Stripe default)

3. **Verify Immediate State**
   ```sql
   SELECT plan_tier, mrr FROM customers
   WHERE email = 'uc11-downgrade@example.com';
   ```
   - Expected: Still `plan_tier = 'team'` until period ends

4. **Verify Downgrade Event**
   ```sql
   SELECT * FROM subscription_events
   WHERE customer_id = (
     SELECT id FROM customers WHERE email = 'uc11-downgrade@example.com'
   )
   AND event_type = 'subscription_downgraded';
   ```
   - Expected: Event logged with effective date

5. **Verify Downgrade Email**
   - Expected: Email stating change effective at period end
   - Expected: List of features no longer available

6. **Advance to Period End**
   - Advance test clock to subscription renewal date
   - Verify plan tier changes to 'pro'
   - Verify MRR updated to 149

✅ **PASS CRITERIA:**
- [ ] Downgrade scheduled for period end
- [ ] Customer retains current features until then
- [ ] Downgrade email sent immediately
- [ ] Plan tier and MRR update at period end

---

### Test 5: Subscription Cancellation (customer.subscription.deleted)

**Goal:** Verify cancellation flow and data retention

**Steps:**

1. **Create Test Customer**
   - Email: `uc11-cancel@example.com`
   - Subscription: Pro plan
   - Payment method: 4242 4242 4242 4242

2. **Cancel Subscription**
   - In Stripe customer page, click "Cancel subscription"
   - Cancel at: "End of billing period" (default)
   - Cancellation reason: "Customer requested"
   - Click "Cancel subscription"

3. **Verify Immediate State**
   ```sql
   SELECT status, mrr FROM customers
   WHERE email = 'uc11-cancel@example.com';
   ```
   - Expected: `status = 'canceled'`, `mrr = 0`

4. **Verify Cancellation Event**
   ```sql
   SELECT * FROM subscription_events
   WHERE customer_id = (
     SELECT id FROM customers WHERE email = 'uc11-cancel@example.com'
   )
   AND event_type = 'subscription_cancelled'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Expected: `mrr_lost` equals previous MRR
   - Expected: `reason` captured

5. **Verify Cancellation Email**
   ```sql
   SELECT * FROM email_events
   WHERE customer_id = (
     SELECT id FROM customers WHERE email = 'uc11-cancel@example.com'
   )
   AND email_type = 'subscription_cancelled';
   ```
   - Expected: Email with service end date
   - Expected: Reactivation link included
   - Expected: Feedback survey link

6. **Verify Data Retention**
   - Check customer record still exists (soft delete)
   - Check conversation history preserved
   - Customer should have access until period end date

✅ **PASS CRITERIA:**
- [ ] Status set to `canceled`
- [ ] MRR set to 0
- [ ] Cancellation event logged with reason
- [ ] Cancellation email sent
- [ ] Email includes reactivation and feedback links
- [ ] Data preserved (not hard deleted)

---

## Validation Checklist

After completing all test scenarios, verify:

### Database Integrity
- [ ] All subscription events recorded in `subscription_events` table
- [ ] All payments recorded in `payments` table
- [ ] Customer `mrr` field always matches current subscription
- [ ] `current_period_start` and `current_period_end` updated correctly
- [ ] No orphaned records (all foreign keys valid)

### Email Notifications
- [ ] All lifecycle emails logged in `email_events` table
- [ ] Email status is `'sent'` or `'queued'` (not `'failed'`)
- [ ] Email content includes correct customer data
- [ ] Portal URLs in emails are valid and load correctly
- [ ] Unsubscribe links present (if required)

### Stripe Sync
- [ ] Stripe subscription status matches database `status`
- [ ] Stripe metadata includes `customer_id` and `plan_tier`
- [ ] Webhook events delivered within 5 seconds
- [ ] No failed webhook deliveries in Stripe dashboard

### Business Logic
- [ ] MRR calculations correct for all plan tiers
- [ ] Proration calculations accurate
- [ ] Retry sequence follows 3-attempt pattern
- [ ] Downgrades apply at period end (not immediately)
- [ ] Upgrades apply immediately
- [ ] Cancellations preserve data for 30 days

---

## Troubleshooting

### Webhooks Not Firing

**Problem:** Events not triggering database updates

**Solutions:**
1. Check webhook endpoint is receiving events:
   ```bash
   curl -X POST https://your-app.vercel.app/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"type": "ping"}'
   ```
2. Verify webhook secret in environment variables
3. Check Stripe webhook logs for delivery failures
4. Verify webhook endpoint is publicly accessible (not localhost)

### Email Not Sending

**Problem:** Email events logged but not received

**Solutions:**
1. Check Resend API key configured: `RESEND_API_KEY`
2. Verify `FROM_EMAIL` domain verified in Resend
3. Check spam folder
4. Review email_events for error_message

### Database Not Updating

**Problem:** Webhooks fire but database unchanged

**Solutions:**
1. Check Supabase service role key configured
2. Verify customer has `stripe_customer_id` populated
3. Check subscription metadata includes `customer_id`
4. Review webhook handler logs for errors

### Test Clock Issues

**Problem:** Time advancement not triggering events

**Solutions:**
1. Ensure customer is attached to test clock
2. Verify subscription was created under test clock
3. Check Stripe test mode (not live mode)
4. Wait 30 seconds after advancing time

---

## Success Criteria

**UC-11 is considered PASSING if:**

1. ✅ All 5 test scenarios pass acceptance criteria
2. ✅ All database validation checks pass
3. ✅ All email notifications send correctly
4. ✅ No webhook delivery failures in Stripe dashboard
5. ✅ PM can execute all tests without developer assistance

---

## Test Report Template

After completing tests, fill out this report:

```markdown
# UC-11 Subscription Lifecycle Test Report

**Tester:** [Your Name]
**Date:** [Test Date]
**Environment:** [Staging/Production]
**Test Clock ID:** [clock_xxx]

## Test Results

### Test 1: Renewal (invoice.paid)
- [ ] PASS / [ ] FAIL
- Notes: _______________________

### Test 2: Failed Payment (invoice.payment_failed)
- [ ] PASS / [ ] FAIL
- Notes: _______________________

### Test 3: Upgrade (customer.subscription.updated)
- [ ] PASS / [ ] FAIL
- Notes: _______________________

### Test 4: Downgrade (customer.subscription.updated)
- [ ] PASS / [ ] FAIL
- Notes: _______________________

### Test 5: Cancellation (customer.subscription.deleted)
- [ ] PASS / [ ] FAIL
- Notes: _______________________

## Overall Status
- [ ] ALL TESTS PASS - Ready for Production
- [ ] SOME FAILURES - Blocked, needs fixes

## Issues Found
1. _______________________
2. _______________________

## Sign-off
- PM: _______________________
- Date: _______________________
```

---

## Next Steps

After all tests pass:

1. ✅ Mark UC-11 as DONE in USE_CASES.md
2. ✅ Deploy to production
3. ✅ Configure production webhooks
4. ✅ Test with real customer (internal team member)
5. ✅ Monitor webhook success rate for 48 hours
6. ✅ Enable for pilot customers

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-27  
**Owner:** Product Manager
