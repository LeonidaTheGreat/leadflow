# PRD: Billing & Subscriptions

**Document ID:** PRD-BILLING  
**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-03-03  
**Owner:** Product Manager

---

## 1. Overview

### 1.1 Problem Statement
LeadFlow AI requires a complete billing system to handle subscriptions, payments, and customer lifecycle management. Without proper billing, we cannot generate revenue or manage paid pilot customers.

### 1.2 Product Goal
Enable customers to sign up, subscribe to paid plans, manage their billing, and handle subscription lifecycle events (upgrades, downgrades, cancellations) through a self-serve interface integrated with Stripe.

### 1.3 Target Users
- **Primary:** Real estate agents signing up for LeadFlow AI
- **Secondary:** Team leaders managing multiple agent subscriptions
- **Internal:** Admin staff viewing MRR reports

### 1.4 Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Sign-up Conversion | >20% | % of landing page visitors who complete signup |
| Payment Success | >95% | % of checkout attempts that succeed |
| Churn Rate | <5%/month | % of customers canceling monthly |
| MRR Tracking | 100% accurate | Reconciliation with Stripe |

---

## 2. Pricing Strategy

### 2.1 Pricing Tiers

| Tier | Price | Features | Target |
|------|-------|----------|--------|
| **Starter** | $49/mo | 100 SMS, basic AI, dashboard | Testing/solo agents |
| **Pro** | $149/mo | Unlimited SMS, full AI, Cal.com, analytics | Core ICP |
| **Team** | $399/mo | 5 agents, team dashboard, lead routing | Small teams |
| **Brokerage** | $999+/mo | White-label, admin, compliance reporting | Future |

### 2.2 Path to $20K MRR

| Scenario | Mix | MRR |
|----------|-----|-----|
| Conservative | 100 Pro + 20 Team | $22,860 |
| Balanced | 50 Pro + 40 Team + 5 Brokerage | $22,445 |

---

## 3. Use Cases

### UC-9: Customer Sign-Up Flow
**Description:** Stripe checkout + onboarding for new customers

**Trigger:** User clicks "Get Started" or "Sign Up" on landing page

**Flow:**
1. User arrives at landing page
2. Clicks "Get Started" or pricing CTA
3. Selects plan (Starter/Pro/Team)
4. Enters email and creates password (Supabase Auth)
5. Redirected to Stripe Checkout
6. Enters payment information
7. Stripe creates subscription
8. Webhook received → activate account
9. Redirected to onboarding/dashboard

**Acceptance Criteria:**
- [ ] Landing page has visible signup CTA
- [ ] Plan selection clearly shows pricing and features
- [ ] Email/password registration works (Supabase Auth)
- [ ] Stripe Checkout session created correctly
- [ ] Payment processing succeeds >95% of time
- [ ] Account activated immediately after successful payment
- [ ] User redirected to dashboard post-signup
- [ ] Welcome email sent

**Critical Issue (2026-03-03 Review):**
- ❌ No visible authentication/signup flow on landing page
- ❌ Authentication UI missing entirely

---

### UC-10: Billing Portal
**Description:** Customer self-serve billing management via Stripe portal

**Trigger:** User navigates to Settings > Billing & Subscription

**Flow:**
1. User clicks "Billing & Subscription" in settings
2. System retrieves subscription info from Stripe
3. Displays current plan, price, next billing date
4. Shows payment methods on file
5. Shows invoice history
6. User can update payment method
7. User can view/download invoices
8. User can access Stripe Customer Portal for advanced actions

**Acceptance Criteria:**
- [ ] Billing section loads without errors
- [ ] Current subscription plan displayed
- [ ] Monthly price shown
- [ ] Next billing date visible
- [ ] Payment methods listed
- [ ] Invoice history with download links
- [ ] Update payment method works
- [ ] Link to Stripe Customer Portal works
- [ ] Graceful error handling if billing data missing

**Critical Issue (2026-03-03 Review):**
- ❌ Billing section shows "Failed to load billing info - Agent not found"
- ❌ No subscription details visible
- ❌ No payment methods accessible
- ❌ No invoice history

---

### UC-11: Subscription Lifecycle
**Description:** Handle upgrades, downgrades, cancellations, renewals

**Trigger:** User initiates plan change or system processes renewal

**Flow - Upgrade:**
1. User views current plan in billing portal
2. Clicks "Upgrade" on higher tier
3. Stripe prorates difference
4. Payment processed for prorated amount
5. New features immediately available
6. Confirmation email sent

**Flow - Downgrade:**
1. User clicks "Downgrade" on lower tier
2. Change scheduled for next billing cycle
3. Confirmation shown with effective date
4. Email confirmation sent

**Flow - Cancellation:**
1. User clicks "Cancel Subscription"
2. Confirmation modal explains consequences
3. User confirms cancellation
4. Access continues until period end
5. Cancellation email sent
6. Account marked for deletion/archival

**Flow - Renewal:**
1. Stripe processes automatic renewal
2. Webhook received
3. Renewal logged in system
4. Receipt email sent
5. MRR updated

**Acceptance Criteria:**
- [ ] Upgrade processes immediately with proration
- [ ] Downgrade schedules correctly for next period
- [ ] Cancellation stops auto-renewal
- [ ] Access continues until paid period ends
- [ ] All lifecycle events send confirmation emails
- [ ] Failed payments retry (Stripe Smart Retries)
- [ ] Dunning emails sent on failed payment
- [ ] Grace period before account suspension

**Critical Issue (2026-03-03 Review):**
- ❌ Cannot test lifecycle events due to billing section failure
- ❌ Missing billing records prevent subscription operations

---

### UC-12: MRR Reporting
**Description:** Monthly recurring revenue tracking and analytics dashboard

**Trigger:** Admin views MRR dashboard or scheduled report generation

**Flow:**
1. System queries Stripe for active subscriptions
2. Aggregates by plan tier
3. Calculates MRR (Monthly Recurring Revenue)
4. Shows trends (new, churned, expansion, contraction)
5. Displays in dashboard
6. Optional: Email weekly summary

**Acceptance Criteria:**
- [ ] MRR calculated accurately from Stripe data
- [ ] Breakdown by plan tier (Starter/Pro/Team/Brokerage)
- [ ] New MRR (new customers this month)
- [ ] Churned MRR (cancellations)
- [ ] Expansion MRR (upgrades)
- [ ] Contraction MRR (downgrades)
- [ ] Net MRR growth rate
- [ ] Dashboard updates in real-time or near-real-time
- [ ] Export to CSV available

---

## 4. Technical Requirements

### 4.1 Database Schema

**subscriptions**
```
id: UUID
user_id: UUID (references auth.users)
stripe_customer_id: string
stripe_subscription_id: string
plan_id: enum (starter, pro, team, brokerage)
status: enum (active, canceled, past_due, unpaid)
current_period_start: timestamp
current_period_end: timestamp
cancel_at_period_end: boolean
created_at: timestamp
updated_at: timestamp
```

**invoices**
```
id: UUID
user_id: UUID
stripe_invoice_id: string
subscription_id: UUID
amount_due: integer (cents)
amount_paid: integer (cents)
status: enum (draft, open, paid, void, uncollectible)
pdf_url: string
created_at: timestamp
```

**payment_methods**
```
id: UUID
user_id: UUID
stripe_payment_method_id: string
type: enum (card, bank_transfer)
last4: string
brand: string
exp_month: integer
exp_year: integer
is_default: boolean
```

### 4.2 Stripe Integration

**Webhooks to Handle:**
- `customer.created`
- `customer.updated`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.created`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_method.attached`
- `payment_method.detached`

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/billing/subscription` | GET | Get current subscription |
| `/api/billing/invoices` | GET | List invoices |
| `/api/billing/payment-methods` | GET/POST | Manage payment methods |
| `/api/billing/portal` | POST | Create Stripe portal session |
| `/api/billing/checkout` | POST | Create Stripe checkout session |
| `/webhook/stripe` | POST | Receive Stripe webhooks |
| `/api/admin/mrr` | GET | Get MRR metrics (admin only) |

### 4.3 Authentication Requirements

- Supabase Auth for user management
- Email/password authentication required
- Magic link as alternative
- Auth webhook to create Stripe customer on signup

### 4.4 Error Handling

**Billing Load Failure (Agent not found):**
- Log error with context
- Show user-friendly error message
- Provide "Contact Support" option
- Queue background job to retry
- Alert admin of data inconsistency

**Payment Failures:**
- Stripe Smart Retries enabled
- Dunning email campaign
- Grace period before suspension
- Clear messaging to user

---

## 5. E2E Test Specifications

### E2E-BILLING-1: Customer Sign-Up Flow
**URL:** https://leadflow-ai-five.vercel.app  
**Test Steps:**
1. Navigate to landing page
2. Click "Get Started" or pricing CTA
3. Select Pro plan
4. Enter email and password
5. Complete Stripe Checkout with test card
6. Verify redirect to dashboard
7. Verify welcome email received
8. Verify subscription active in settings

**Expected Result:** Complete signup in <2 minutes, account activated

### E2E-BILLING-2: Billing Portal Access
**URL:** https://leadflow-ai-five.vercel.app/settings  
**Test Steps:**
1. Log in as paid customer
2. Navigate to Settings > Billing & Subscription
3. Verify subscription details load
4. Verify payment methods visible
5. Verify invoice history displayed
6. Click "Update Payment Method"
7. Add new test card
8. Verify new method saved

**Expected Result:** All billing information loads and updates correctly

### E2E-BILLING-3: Subscription Upgrade
**Test Steps:**
1. Start with Starter plan
2. Go to billing portal
3. Click Upgrade to Pro
4. Complete prorated payment
5. Verify immediate feature access
6. Verify confirmation email received

**Expected Result:** Upgrade processes immediately, features unlocked

### E2E-BILLING-4: Subscription Cancellation
**Test Steps:**
1. Go to billing portal
2. Click Cancel Subscription
3. Confirm cancellation
4. Verify cancellation scheduled
5. Verify email received
6. Verify access continues until period end

**Expected Result:** Cancellation scheduled, access retained until period end

### E2E-BILLING-5: MRR Dashboard
**URL:** Internal dashboard  
**Test Steps:**
1. Navigate to MRR section
2. Verify MRR total displayed
3. Verify breakdown by plan
4. Verify trend chart visible
5. Click export to CSV
6. Verify file downloads

**Expected Result:** MRR data accurate and exportable

---

## 6. Review Findings & Spec Updates

Based on Product Review (2026-03-03):

### Issue 1: Billing Integration Failure (Critical)
**Finding:** Billing section shows "Failed to load billing info - Agent not found"
**Impact:** COMPLETE BLOCKER - No billing operations possible
**Spec Updates:**
- Add requirement for graceful error handling when billing records missing
- Add data migration requirement to create billing records for existing agents
- Add acceptance criteria for error state UI
- Add monitoring/alerting for billing data inconsistencies

### Issue 2: Missing Authentication Flow (High)
**Finding:** No visible login/signup on customer dashboard landing page
**Impact:** Customers cannot self-signup
**Spec Updates:**
- Add requirement for visible auth entry points on landing page
- Add acceptance criteria for auth UI components
- Document sign-up flow with Stripe integration

### Issue 3: Missing Billing Records (High)
**Finding:** Pilot agents exist but lack Stripe customer records
**Impact:** Billing portal cannot load
**Spec Updates:**
- Add data integrity requirements
- Add acceptance criteria for billing record creation on signup
- Add backfill/migration process for existing users

---

## 7. Release Criteria

### MVP (Pilot Ready)
- [ ] UC-9: Sign-up flow working end-to-end
- [ ] UC-10: Billing portal loads and displays data
- [ ] Stripe integration operational
- [ ] 3 pilot agents can signup and pay
- [ ] Basic MRR tracking functional

### Production Ready
- [ ] All 4 use cases complete
- [ ] E2E test pass rate 80%+
- [ ] Payment success rate >95%
- [ ] Dunning/churn handling implemented
- [ ] MRR reporting accurate
- [ ] Admin dashboard for revenue metrics

---

## 8. Dependencies

| Dependency | Status | Blocker |
|------------|--------|---------|
| Stripe Account | ✅ Ready | No |
| Supabase Auth | ✅ Ready | No |
| Stripe Webhook Endpoint | ⚠️ Needs verification | Potentially |
| Customer Dashboard | ✅ Ready | No |
| Pilot Agent Data | ❌ Missing billing records | **YES** |

---

## 9. Open Questions

1. Should we offer annual billing with discount?
2. How should we handle failed payments (grace period length)?
3. Do we need team/brokerage multi-seat management now or later?
4. Should we implement usage-based billing for SMS overages?
5. How do we handle refunds and disputes?

