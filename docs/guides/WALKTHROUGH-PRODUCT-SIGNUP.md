# Walkthrough Spec: Product Signup & Onboarding Flow

**Document ID:** WALKTHROUGH-PRODUCT-SIGNUP-001  
**Status:** draft  
**Version:** 1.0  
**Related PRD:** PRD-FRICTIONLESS-ONBOARDING-001  
**Environment:** https://leadflow-ai-five.vercel.app  
**Last Updated:** 2026-03-23  

---

## Overview

This walkthrough spec defines the end-to-end user journey for the LeadFlow AI frictionless onboarding flow. It covers the complete path from landing page visitor to activated user who has experienced their first "aha moment" with the AI lead response system.

**Target Time-to-Value:** < 2 minutes from landing page CTA to first AI response  
**Target Signup Completion:** < 60 seconds from CTA click to dashboard access  

---

## Walkthrough Steps

### Step 1: Landing Page Access

**URL:** https://leadflow-ai-five.vercel.app  
**User State:** Anonymous visitor  
**Expected Experience:**

1. User lands on the LeadFlow AI marketing landing page
2. Page loads within 2 seconds (LCP < 2s)
3. Hero section displays:
   - Headline: AI-powered lead response for real estate agents
   - Subheadline explaining value proposition
   - Primary CTA: "Start Free Trial" or "Get Started Free"
4. Navigation shows:
   - Logo (links to home)
   - Features link
   - Pricing link
   - Login link (for existing users)
   - CTA button
5. Lead magnet section visible below hero (email capture for nurture)
6. Pricing section displays 4 tiers (Starter $49, Pro $149, Team $399, Brokerage $999+)
7. Footer with links to privacy policy, terms, contact

**Success Criteria:**
- [ ] Page loads without errors
- [ ] All CTAs are visible and clickable
- [ ] Pricing section displays correct 4-tier pricing
- [ ] Lead magnet form renders
- [ ] Mobile responsive (375px+ width)

**Test Command:**
```bash
# Verify landing page loads
curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app
# Expected: 200
```

---

### Step 2: Trial Signup Flow (Email + Password Only)

**URL:** https://leadflow-ai-five.vercel.app/signup  
**Entry Points:**
- Landing page "Start Free Trial" CTA
- Landing page "Get Started Free" CTA
- Pricing page tier selection
- Direct navigation

**User State:** Anonymous visitor → Trial signup initiated  
**Expected Experience:**

1. User clicks "Start Free Trial" CTA on landing page
2. Redirected to `/signup` page
3. Signup form displays with fields:
   - Email Address (required)
   - Password (required, 8+ chars, complexity rules)
   - Confirm Password (required, must match)
4. No credit card fields are shown or requested
5. Terms of Service checkbox (required)
6. "Create Account" button submits form
7. Real-time validation:
   - Email format validation on blur
   - Password strength indicator
   - Password match validation
8. On successful submission:
   - Account created with `plan_tier = trial`
   - `trial_start_at` and `trial_ends_at` set (14-day trial)
   - Session/token created
   - Redirect to dashboard

**Success Criteria:**
- [ ] Signup page loads at `/signup`
- [ ] Form has email, password, confirm password fields only
- [ ] No credit card fields present
- [ ] Terms checkbox required
- [ ] Email validation works (format check)
- [ ] Password validation works (8+ chars, complexity)
- [ ] Duplicate email shows error
- [ ] Successful signup creates trial account
- [ ] Redirects to dashboard within 3 seconds

**Test Commands:**
```bash
# Verify signup page
curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/signup
# Expected: 200

# Test signup API (dry run)
curl -X POST https://leadflow-ai-five.vercel.app/api/agents/onboard \
  -H "Content-Type: application/json" \
  -d '{"email":"test-walkthrough@example.com","password":"TestPass123!","firstName":"Test","lastName":"Agent","phoneNumber":"5551234567","state":"CA"}'
# Expected: 200 with agentId in response
```

---

### Step 3: Dashboard Access Post-Signup

**URL:** https://leadflow-ai-five.vercel.app/dashboard  
**User State:** Authenticated trial user  
**Expected Experience:**

1. After successful signup, user is redirected to `/dashboard`
2. Dashboard loads with:
   - Header with agent name
   - Navigation sidebar (Leads, Analytics, Settings)
   - Main content area
3. Trial banner visible at top:
   - "14-day free trial" badge
   - Days remaining counter
   - Upgrade CTA (for later)
4. No 404 errors or redirect loops
5. Session persists on refresh
6. Authentication protected (redirects to login if not authenticated)

**Success Criteria:**
- [ ] Dashboard loads at `/dashboard`
- [ ] Trial banner shows 14-day countdown
- [ ] Agent name displays in header
- [ ] Navigation is functional
- [ ] Session persists across refresh
- [ ] Unauthenticated users redirected to login

**Test Commands:**
```bash
# Verify dashboard
curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/dashboard
# Expected: 302 (redirects to login if unauthenticated) or 200 (if authenticated)

# Verify auth middleware
curl -s https://leadflow-ai-five.vercel.app/api/auth/session
# Expected: 401 if no valid session
```

---

### Step 4: Sample Leads Visibility

**URL:** https://leadflow-ai-five.vercel.app/dashboard  
**User State:** First-time trial user (`onboarding_completed = false`)  
**Expected Experience:**

1. On first dashboard load, sample leads are automatically seeded
2. At least 3 sample leads visible in the leads table/list
3. Sample leads are clearly marked as "Demo" or "Sample"
4. Each sample lead shows:
   - Lead name
   - Source (e.g., "Zillow", "Realtor.com")
   - Status
   - AI draft response (preview)
   - Timestamp
5. Sample data does not contaminate production analytics
6. Sample leads have `is_sample = true` flag in database

**Success Criteria:**
- [ ] 3+ sample leads visible on first dashboard load
- [ ] Sample leads marked as "Demo" or "Sample"
- [ ] AI draft responses visible for each sample lead
- [ ] Sample data does not appear in production reports
- [ ] Sample leads can be interacted with (view details)

**Test Commands:**
```bash
# Query sample leads (requires DB access)
# SELECT COUNT(*) FROM leads WHERE is_sample = true AND agent_id = '<new_agent_id>';
# Expected: >= 3
```

---

### Step 5: Wizard Auto-Trigger

**URL:** https://leadflow-ai-five.vercel.app/dashboard/onboarding or wizard overlay  
**User State:** First-time trial user (`onboarding_completed = false`)  
**Expected Experience:**

1. On first dashboard visit, wizard auto-triggers if `onboarding_completed = false`
2. Wizard appears as:
   - Full-page overlay at `/dashboard/onboarding`, OR
   - Modal overlay on top of dashboard
3. Wizard shows progress indicator (Step 1 of 3)
4. Wizard can be minimized/closed and resumed later
5. Progress persists in database (`onboarding_step`, `onboarding_completed`)
6. Refreshing page resumes at current step
7. Wizard does NOT trigger for users with `onboarding_completed = true`

**Success Criteria:**
- [ ] Wizard auto-triggers for new users
- [ ] Progress indicator shows current step
- [ ] Can be closed and resumed
- [ ] Progress persists after refresh
- [ ] Does not trigger for completed users
- [ ] URL is `/dashboard/onboarding` or similar

**Test Commands:**
```bash
# Verify onboarding page exists
curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/dashboard/onboarding
# Expected: 200 (if authenticated) or 302 (redirect to login)

# Verify wizard API
curl -s https://leadflow-ai-five.vercel.app/api/onboarding/status
# Expected: 200 with { onboarding_completed: boolean, current_step: number }
```

---

### Step 6: FUB Connection Step

**Wizard Step:** Step 1 of 3  
**Component:** FUB Integration Setup  
**User State:** In onboarding wizard  
**Expected Experience:**

1. Wizard displays Step 1: "Connect Follow Up Boss"
2. Input field for FUB API Key (masked, secure input)
3. "Test Connection" button validates the API key
4. On successful validation:
   - Green checkmark appears
   - Webhook auto-registered in FUB
   - `fub_connected = true` stored
   - Advance to Step 2 enabled
5. On validation failure:
   - Error message displayed
   - Retry option available
   - "Skip for now" link available
6. Help text explains where to find FUB API key
7. Link to FUB documentation

**Success Criteria:**
- [ ] FUB API key input field visible
- [ ] Test Connection button works
- [ ] Valid key shows success state
- [ ] Invalid key shows error message
- [ ] Skip option available
- [ ] Webhook auto-registered on success
- [ ] Progress saved to database

**Test Commands:**
```bash
# Test FUB connection API
curl -X POST https://leadflow-ai-five.vercel.app/api/integrations/fub/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session_token>" \
  -d '{"apiKey":"test-api-key"}'
# Expected: 200 with { valid: boolean, message: string }
```

---

### Step 7: SMS Setup Step

**Wizard Step:** Step 2 of 3  
**Component:** SMS Configuration  
**User State:** In onboarding wizard (FUB step completed or skipped)  
**Expected Experience:**

1. Wizard displays Step 2: "Configure SMS"
2. Two options presented:
   - **Get a new Twilio number**: Enter area code, system provisions number
   - **Use existing number**: Enter existing Twilio number (E.164 format)
3. For "Get new number":
   - Area code input (US/Canada)
   - "Provision Number" button
   - System assigns available number
   - Cost disclosure shown (~$1/month)
4. For "Use existing number":
   - Phone number input with E.164 format validation
   - Format helper: "+1XXXXXXXXXX"
5. On success:
   - Number displayed with confirmation
   - `phone_configured = true` stored
   - Advance to Step 3 enabled
6. "Skip for now" link available
7. Step 3 disabled if this step is skipped

**Success Criteria:**
- [ ] Two options visible (new number / existing number)
- [ ] Area code input for new number
- [ ] Phone number input for existing number
- [ ] E.164 format validation
- [ ] Cost disclosure shown
- [ ] Success state shows assigned/entered number
- [ ] Skip option available
- [ ] Progress saved to database

**Test Commands:**
```bash
# Test Twilio number provisioning (mock in test mode)
curl -X POST https://leadflow-ai-five.vercel.app/api/integrations/twilio/provision \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session_token>" \
  -d '{"areaCode":"555"}'
# Expected: 200 with { phoneNumber: string }

# Test existing number validation
curl -X POST https://leadflow-ai-five.vercel.app/api/integrations/twilio/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session_token>" \
  -d '{"phoneNumber":"+15551234567"}'
# Expected: 200 with { valid: boolean }
```

---

### Step 8: Aha Moment Simulator

**Wizard Step:** Step 3 of 3  
**Component:** AI Response Simulator  
**User State:** In onboarding wizard (SMS step completed)  
**Expected Experience:**

1. Wizard displays Step 3: "See AI in Action"
2. Explanation text: "Experience how LeadFlow responds to leads in under 30 seconds"
3. "Simulate Inbound Lead" button triggers simulation
4. On button click:
   - Simulated lead appears ("New lead from Zillow: John Doe")
   - Loading indicator shows "AI is crafting response..."
   - AI-generated response appears within 15 seconds
5. Response shows:
   - Personalized greeting
   - Professional tone
   - Question to engage lead
   - Agent signature
6. Success message: "This is exactly what your leads will see!"
7. "Complete Setup" button finishes onboarding
8. On completion:
   - `onboarding_completed = true` set
   - `aha_simulation_completed = true` set
   - Redirect to dashboard
   - Welcome message shown

**Success Criteria:**
- [ ] Simulator step visible
- [ ] "Simulate Inbound Lead" button works
- [ ] Simulated lead appears
- [ ] AI response generates within 15 seconds
- [ ] Response is personalized and professional
- [ ] Success message shown
- [ ] Complete Setup button finishes wizard
- [ ] Onboarding marked complete in database
- [ ] Redirect to dashboard

**Test Commands:**
```bash
# Test simulator API
curl -X POST https://leadflow-ai-five.vercel.app/api/onboarding/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session_token>" \
  -d '{"agentId":"<agent_id>"}'
# Expected: 200 with { response: string, lead: object }

# Verify onboarding completion
curl -s https://leadflow-ai-five.vercel.app/api/onboarding/status \
  -H "Authorization: Bearer <session_token>"
# Expected: 200 with { onboarding_completed: true }
```

---

## End-to-End Walkthrough Test

### Complete User Journey

```gherkin
Feature: Frictionless Onboarding Flow
  As a new real estate agent
  I want to sign up and experience AI lead response quickly
  So that I can see the value of LeadFlow AI

  Scenario: Complete onboarding in under 2 minutes
    Given I am on the LeadFlow landing page
    When I click "Start Free Trial"
    Then I am taken to the signup page
    
    When I enter my email "agent@example.com"
    And I enter password "SecurePass123!"
    And I confirm password "SecurePass123!"
    And I accept the terms
    And I click "Create Account"
    Then my account is created with 14-day trial
    And I am redirected to the dashboard within 60 seconds
    
    When the dashboard loads
    Then I see at least 3 sample leads marked as "Demo"
    And I see AI draft responses for each lead
    And the onboarding wizard auto-triggers
    
    When I complete Step 1 with my FUB API key
    Then FUB is connected and webhook registered
    
    When I complete Step 2 with a Twilio phone number
    Then SMS is configured
    
    When I click "Simulate Inbound Lead" in Step 3
    Then a simulated lead appears
    And AI generates a response within 15 seconds
    
    When I click "Complete Setup"
    Then onboarding is marked complete
    And I am taken to the dashboard
    And I see a welcome message
    
    # Total time from landing page to aha moment: < 2 minutes
```

---

## Telemetry Events

The following events should be tracked during the walkthrough:

| Event | Trigger | Properties |
|-------|---------|------------|
| `trial_cta_clicked` | Landing page CTA click | cta_location, cta_text |
| `trial_signup_started` | Signup page load | referrer, utm_params |
| `trial_signup_completed` | Successful account creation | time_to_complete_ms |
| `dashboard_first_paint` | Dashboard first load | load_time_ms |
| `sample_data_rendered` | Sample leads visible | lead_count |
| `wizard_started` | Wizard auto-triggered | trigger_reason |
| `wizard_step_completed` | Each step completion | step_name, step_number |
| `fub_connected` | FUB step success | validation_time_ms |
| `sms_configured` | SMS step success | provision_method |
| `aha_simulation_started` | Simulator button clicked | - |
| `aha_simulation_completed` | AI response displayed | response_time_ms |
| `onboarding_completed` | Wizard finished | total_time_ms, steps_completed |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Landing page load time | < 2s | LCP via GA4 |
| Signup completion rate | > 80% | trial_signup_completed / trial_signup_started |
| Time to dashboard | < 60s | dashboard_first_paint - trial_signup_started |
| Sample leads visible | 100% | sample_data_rendered event fires |
| Wizard trigger rate | 100% | wizard_started for all new users |
| FUB connection success | > 70% | fub_connected / wizard_step_completed (fub) |
| SMS setup success | > 70% | sms_configured / wizard_step_completed (sms) |
| Aha moment completion | > 60% | aha_simulation_completed / wizard_started |
| End-to-end time | < 2min | onboarding_completed - trial_cta_clicked |

---

## Testing Checklist

### Manual Walkthrough Test

- [ ] 1. Landing page loads at https://leadflow-ai-five.vercel.app
- [ ] 2. All CTAs visible and clickable
- [ ] 3. Click "Start Free Trial" → goes to /signup
- [ ] 4. Signup form has email, password, confirm password only
- [ ] 5. No credit card fields present
- [ ] 6. Validation works for all fields
- [ ] 7. Successful signup redirects to /dashboard
- [ ] 8. Trial banner shows 14-day countdown
- [ ] 9. Sample leads (3+) visible with "Demo" badge
- [ ] 10. Onboarding wizard auto-triggers
- [ ] 11. Step 1: FUB connection works with valid API key
- [ ] 12. Step 2: SMS setup works (new number or existing)
- [ ] 13. Step 3: Aha simulator generates AI response < 15s
- [ ] 14. Complete setup → onboarding_completed = true
- [ ] 15. Dashboard accessible with full functionality

### Automated Tests

- [ ] E2E test: Complete flow from landing to aha moment
- [ ] E2E test: Signup validation (email, password)
- [ ] E2E test: Dashboard access post-signup
- [ ] E2E test: Sample leads visibility
- [ ] E2E test: Wizard auto-trigger
- [ ] E2E test: FUB connection step
- [ ] E2E test: SMS setup step
- [ ] E2E test: Aha moment simulator
- [ ] E2E test: Total time < 2 minutes

---

## Known Issues & Limitations

1. **External API Dependencies**: FUB and Twilio API latency can affect setup experience
2. **Sample Data**: Sample leads are read-only and may not reflect all lead scenarios
3. **Mobile Experience**: Some wizard steps may require scrolling on smaller screens
4. **Session Timeout**: Long onboarding sessions may expire; progress is saved

---

## Related Documents

- [PRD-FRICTIONLESS-ONBOARDING-001](./PRD-FRICTIONLESS-ONBOARDING-001.md)
- [PRD-ONBOARDING-WIZARD.md](./PRD-ONBOARDING-WIZARD.md)
- [E2E Test Suite](../e2e/README.md)
- [API Documentation](./api-design/)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-23 | Dev Agent | Initial walkthrough spec creation |
