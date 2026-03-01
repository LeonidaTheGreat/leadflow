# UC-9: Customer Sign-Up Testing Instructions

**Task ID:** billing-002-customer-signup  
**Status:** Ready for PM Validation  
**Date:** 2026-02-27

---

## Overview

This document provides step-by-step instructions for validating the complete customer sign-up and subscription creation flow for LeadFlow AI.

**Acceptance Criteria:**
1. ✅ Landing page with 3 plan options (Starter $49, Pro $149, Team $399)
2. ✅ Sign-up form collects email, name, phone
3. ✅ Stripe checkout integration for payment
4. ✅ Webhook handler creates customer record in database
5. ✅ Welcome email sent after successful signup (logged, email service TBD)
6. ✅ Redirect to onboarding wizard after payment
7. ⏳ **Human validation required** - PM can complete full signup flow with test card

---

## Prerequisites

### 1. Stripe Test Mode Configuration

Ensure the following environment variables are set in `.env.local`:

```bash
# Stripe Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (Create in Stripe Dashboard)
STRIPE_PRICE_STARTER_MONTHLY=price_starter_49  # $49/month
STRIPE_PRICE_PRO_MONTHLY=price_pro_149         # $149/month
STRIPE_PRICE_TEAM_MONTHLY=price_team_399       # $399/month

# App URL
NEXT_PUBLIC_APP_URL=https://leadflow-ai-five.vercel.app
# or for local testing:
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Create Stripe Products & Prices

In your Stripe Dashboard (Test Mode):

1. Go to **Products** → **Add Product**
2. Create three products:

**Starter Plan:**
- Name: "LeadFlow AI - Starter"
- Description: "Up to 50 leads/month"
- Price: $49.00 USD / month
- Copy the Price ID → Set as `STRIPE_PRICE_STARTER_MONTHLY`

**Pro Plan:**
- Name: "LeadFlow AI - Pro"
- Description: "Up to 200 leads/month"
- Price: $149.00 USD / month
- Copy the Price ID → Set as `STRIPE_PRICE_PRO_MONTHLY`

**Team Plan:**
- Name: "LeadFlow AI - Team"
- Description: "Up to 500 leads/month"
- Price: $399.00 USD / month
- Copy the Price ID → Set as `STRIPE_PRICE_TEAM_MONTHLY`

### 3. Set Up Stripe Webhook

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://leadflow-ai-five.vercel.app/api/webhooks/stripe`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → Set as `STRIPE_WEBHOOK_SECRET`

### 4. Database Schema

Ensure the customers table exists (run migration if needed):

```bash
# Check if customers table exists
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM customers;"

# If not, run migration
psql "$SUPABASE_DB_URL" -f sql/customers-table-migration.sql
```

---

## Test Flow: Complete Sign-Up Journey

### Test 1: Starter Plan Sign-Up ($49/month)

#### Step 1: Access Landing Page
1. Navigate to: `https://leadflow-ai-five.vercel.app/`
2. **Verify:** Page loads with LeadFlow AI branding
3. **Verify:** "Join the Pilot Program" CTA buttons are visible

#### Step 2: Navigate to Sign-Up
1. Click **"Join the Pilot Program"** (any of the CTAs)
2. **Verify:** Redirects to `/signup`
3. **Verify:** Three pricing cards are displayed:
   - Starter: $49/month
   - Pro: $149/month (marked "MOST POPULAR")
   - Team: $399/month

#### Step 3: Select Starter Plan
1. Click **"Get Started"** on the Starter plan card
2. **Verify:** Progress indicator shows Step 2 "Your Details" is active
3. **Verify:** Form displays three fields: Email, Full Name, Phone Number

#### Step 4: Fill Sign-Up Form
Enter the following test data:
- **Email:** `test-starter@example.com`
- **Full Name:** `Test Agent Starter`
- **Phone:** `+1 (555) 123-4567`

1. Fill in all three fields
2. Click **"Continue to Payment"**
3. **Verify:** Button shows loading spinner
4. **Verify:** Redirects to Stripe Checkout page

#### Step 5: Complete Stripe Checkout
1. **Verify:** Stripe Checkout page displays:
   - Product: "LeadFlow AI - Starter"
   - Price: $49.00 / month
   - Trial: 14-day free trial message
2. Enter test card details:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/25`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **Billing ZIP:** Any 5 digits (e.g., `12345`)
3. Click **"Subscribe"**
4. **Verify:** Processes payment successfully
5. **Verify:** Redirects to `/onboarding?session_id=cs_test_...`

#### Step 6: Verify Database Records
Run the following SQL queries in Supabase SQL Editor:

```sql
-- Check customer was created
SELECT 
  id, email, name, phone, plan_tier, plan_price, 
  status, stripe_customer_id, stripe_subscription_id, trial_ends_at
FROM customers
WHERE email = 'test-starter@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ `email`: `test-starter@example.com`
- ✅ `name`: `Test Agent Starter`
- ✅ `phone`: `+1 (555) 123-4567`
- ✅ `plan_tier`: `starter`
- ✅ `plan_price`: `4900` (in cents)
- ✅ `status`: `trialing` or `active`
- ✅ `stripe_customer_id`: `cus_...` (not null)
- ✅ `stripe_subscription_id`: `sub_...` (not null)
- ✅ `trial_ends_at`: ~14 days from now
- ✅ `mrr`: `49` (or 0 during trial)

```sql
-- Check subscription event was logged
SELECT 
  event_type, plan_tier, mrr, trial_ends_at, created_at
FROM subscription_events
WHERE customer_id = (SELECT id FROM customers WHERE email = 'test-starter@example.com')
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ `event_type`: `subscription_created`
- ✅ `plan_tier`: `starter`
- ✅ `mrr`: `49`

```sql
-- Check checkout session was logged
SELECT 
  plan_tier, status, created_at
FROM checkout_sessions
WHERE customer_id = (SELECT id FROM customers WHERE email = 'test-starter@example.com')
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ `plan_tier`: `starter`
- ✅ `status`: `completed`

```sql
-- Check welcome email was logged (optional - depends on email service)
SELECT 
  email_type, recipient, status, sent_at
FROM email_events
WHERE customer_id = (SELECT id FROM customers WHERE email = 'test-starter@example.com')
ORDER BY sent_at DESC
LIMIT 1;
```

**Expected Results (if implemented):**
- ✅ `email_type`: `welcome`
- ✅ `status`: `sent` or `queued`

#### Step 7: Verify in Stripe Dashboard
1. Go to Stripe Dashboard (Test Mode)
2. Navigate to **Customers**
3. Search for `test-starter@example.com`
4. **Verify:**
   - Customer exists
   - Email matches
   - Name matches
   - Has active subscription
   - Plan: "LeadFlow AI - Starter" ($49/month)
   - Status: Trialing (14 days remaining)

---

### Test 2: Pro Plan Sign-Up ($149/month)

Repeat the same flow with:
- **Plan:** Pro
- **Email:** `test-pro@example.com`
- **Name:** `Test Agent Pro`
- **Phone:** `+1 (555) 234-5678`

**Expected Database Values:**
- `plan_tier`: `pro`
- `plan_price`: `14900` (in cents)
- `mrr`: `149`

---

### Test 3: Team Plan Sign-Up ($399/month)

Repeat the same flow with:
- **Plan:** Team
- **Email:** `test-team@example.com`
- **Name:** `Test Agent Team`
- **Phone:** `+1 (555) 345-6789`

**Expected Database Values:**
- `plan_tier`: `team`
- `plan_price`: `39900` (in cents)
- `mrr`: `399`

---

## Test Scenarios: Edge Cases

### Test 4: Duplicate Email
1. Attempt to sign up with `test-starter@example.com` again
2. **Expected:** System detects existing account
3. **Expected:** Returns existing customer ID with message "Account already exists"

### Test 5: Invalid Email Format
1. Enter email: `invalid-email`
2. **Expected:** Form validation error: "Please enter a valid email address"

### Test 6: Invalid Phone Format
1. Enter phone: `123`
2. **Expected:** Form validation error: "Please enter a valid phone number"

### Test 7: Missing Required Fields
1. Leave one or more fields blank
2. **Expected:** Form validation error: "All fields are required"

### Test 8: Cancelled Checkout
1. Start sign-up flow
2. Get to Stripe Checkout page
3. Click browser back button or close tab
4. **Expected:** Redirects to `/signup?cancelled=true`
5. **Expected:** Customer record created but no subscription

### Test 9: Failed Payment
1. Use test card: `4000 0000 0000 0002` (Declined)
2. **Expected:** Stripe shows error "Your card was declined"
3. **Expected:** Can retry with valid card

---

## Test Checklist

### Pre-Launch Validation
- [ ] All three pricing plans display correctly
- [ ] Sign-up form validation works
- [ ] Stripe checkout integration functional
- [ ] Customer record created in database
- [ ] Subscription linked to customer
- [ ] Webhook handler processes events
- [ ] MRR calculated correctly
- [ ] Trial period set to 14 days
- [ ] Redirect to onboarding works
- [ ] Welcome email logged (or sent if service connected)

### Database Integrity
- [ ] Customers table populated correctly
- [ ] Stripe IDs stored properly
- [ ] Subscription events logged
- [ ] Checkout sessions tracked
- [ ] Foreign key relationships intact

### Stripe Integration
- [ ] Customers created in Stripe
- [ ] Subscriptions created with correct plans
- [ ] Trial period configured
- [ ] Webhook events delivered
- [ ] Test mode vs. production mode clear

---

## Rollback Plan

If issues are found during testing:

1. **Stop new signups:** Remove signup links from landing page
2. **Investigate:** Check logs in Vercel and Supabase
3. **Database cleanup (if needed):**

```sql
-- Delete test customers
DELETE FROM customers WHERE email LIKE 'test-%@example.com';

-- Verify cleanup
SELECT COUNT(*) FROM customers WHERE email LIKE 'test-%@example.com';
-- Should return 0
```

4. **Stripe cleanup:** Cancel test subscriptions in Stripe Dashboard

---

## Success Criteria

✅ **UC-9 is COMPLETE when:**

1. PM has successfully completed sign-up for all 3 plans
2. All database records are correct
3. All Stripe records are correct
4. Welcome email is logged (or sent if service connected)
5. Onboarding redirect works
6. No errors in logs
7. Test checklist 100% passed

---

## Support & Troubleshooting

### Common Issues

**"Stripe not configured" error**
→ Check `STRIPE_SECRET_KEY` is set in `.env.local`

**"Invalid price ID" error**
→ Verify Stripe Price IDs match the ones created in Stripe Dashboard

**Webhook not triggering**
→ Check webhook endpoint URL and signing secret
→ Test webhook delivery in Stripe Dashboard → Webhooks → Send test webhook

**Customer not created in database**
→ Check Supabase connection
→ Verify `customers` table exists
→ Check API logs for errors

**Redirect to onboarding fails**
→ Verify `/onboarding` page exists
→ Check `NEXT_PUBLIC_APP_URL` is set correctly

### Logs to Check

**Vercel Logs:**
```bash
vercel logs --follow
```

**Supabase Logs:**
Go to Supabase Dashboard → Logs → API

**Stripe Events:**
Go to Stripe Dashboard → Developers → Events

---

## Files Modified/Created

### New Files
1. `product/lead-response/dashboard/app/signup/page.tsx` - Sign-up flow UI
2. `product/lead-response/dashboard/app/api/customers/create/route.ts` - Customer creation API
3. `product/lead-response/dashboard/app/api/billing/create-checkout/route.ts` - Updated checkout
4. `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts` - Updated webhook handler
5. `docs/UC-9-TESTING-INSTRUCTIONS.md` - This document

### Modified Files
1. `product/lead-response/dashboard/app/page.tsx` - Updated CTAs to point to `/signup`

---

## Next Steps After Validation

Once UC-9 testing is complete and all acceptance criteria are met:

1. Update `USE_CASES.md` → Mark UC-9 as ✅ DONE
2. Update `E2E_MAPPINGS.md` → Add UC-9 test mapping
3. Deploy to production
4. Set up real email service (SendGrid, Resend, etc.)
5. Update Stripe webhook to production URL
6. Test with real credit card (PM's card, refund immediately)
7. Open pilot signups to first 10 agents

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-27  
**Author:** LeadFlow Dev Team  
**Status:** Ready for PM Validation
