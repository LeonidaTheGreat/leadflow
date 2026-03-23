# PRD: Start Free Trial CTA — Frictionless Trial Entry
**PRD ID:** prd-start-free-trial-cta  
**Use Case:** feat-start-free-trial-cta  
**Status:** ready  
**Version:** 1.0  
**Author:** Product Manager  
**Date:** 2026-03-07  

---

## 1. Problem

LeadFlow is in the pilot recruitment phase. The current conversion funnel is:

1. Visitor lands on marketing page
2. Sees "Join the Pilot" CTA → pilot signup form (name, email, phone, brokerage, team size, CRM)
3. After form submission, agents wait for manual follow-up

**Problems identified:**
- The existing pilot form has 6+ fields — creates friction before prospects experience value
- No dedicated "Start Free Trial" path distinct from the full pilot application form
- No self-serve trial activation — agents cannot start using the product immediately after signup
- CTAs are not clearly differentiated between "apply for pilot" (gated) and "start now" (instant)
- Missing above-the-fold "Start Free Trial" CTA in the hero section

**Impact:** Each hour of friction is a conversion lost during the critical 60-day pilot window.

---

## 2. Goal

Create a frictionless "Start Free Trial" entry path that:
1. Captures email + password in ≤ 2 fields (hero CTA)
2. Auto-provisions a free trial account (no credit card required)
3. Redirects to the onboarding wizard immediately
4. Allows pilot recruitment context to be captured post-activation (progressive profiling)

**KPIs:**
- Trial CTA click-through rate ≥ 15% of landing page visitors
- Email → trial account created within 60 seconds (no manual step)
- Trial → active setup (FUB connected) within 7 days ≥ 40%

---

## 3. Users

| User | Scenario |
|------|----------|
| Solo real estate agent | Visits landing page, wants to try product now with no commitment |
| Team leader | Evaluating for team — wants to test before buying |
| Pilot recruit (inbound) | Referred by Stojan/email — wants instant access |

---

## 4. Functional Requirements

### FR-1: Hero CTA — "Start Free Trial"
- **Location:** Hero section, above the fold
- **Label:** "Start Free Trial — No Credit Card"
- **Design:** Primary button, high contrast; sits below the headline + subheadline
- **Behavior:** Clicking opens inline email input OR navigates to `/signup?mode=trial`
- **Secondary CTA:** "See How It Works" (scroll anchor) stays as secondary option

### FR-2: Trial Signup Page (`/signup?mode=trial`)
- **Fields (required):** Email address, Password (min 8 chars)
- **Fields (optional, progressive):** First name (single field, placeholder "Your name")
- **Submit label:** "Create My Free Account"
- **Trust signals below form:** "Free for 30 days · No credit card · Cancel anytime"
- **No plan selection at signup** — trial defaults to Pro tier features for 30 days

### FR-3: Trial Account Provisioning
On successful form submit:
1. Create Supabase auth user (email/password)
2. Insert row in `agents` table: `plan_tier = 'trial'`, `trial_ends_at = now() + 30 days`, `mrr = 0`
3. Log `trial_started` event to `analytics_events` (or equivalent)
4. Redirect to `/dashboard/onboarding` (existing onboarding wizard)

### FR-4: Trial Badge in Dashboard
- Show "Trial · X days remaining" badge in dashboard nav
- Link badge to `/settings/billing` (upgrade CTA)
- Badge turns red when ≤ 7 days remaining

### FR-5: Multiple CTA Placements
"Start Free Trial" CTA must appear in ≥ 3 locations on the landing page:
1. Hero section (FR-1)
2. End of features/benefits section
3. Pricing section (alongside each paid plan's existing CTA, as "or start free trial")

### FR-6: Backward Compatibility
- Existing "Join the Pilot" form (for pilot-specific tracking) remains available
- Pilot form accessible via `/pilot` or a "Apply for Pilot Program" secondary link
- Both paths converge: trial signup auto-flags `source = 'trial_cta'`; pilot form sets `source = 'pilot_application'`

### FR-7: UTM Pass-Through
- Capture UTM params at trial signup (utm_source, utm_medium, utm_campaign)
- Store on `agents` record for attribution (existing UTM capture UC applies)

---

## 5. Non-Functional Requirements

| NFR | Requirement |
|-----|-------------|
| **Speed** | Account provisioning completes in < 3 seconds |
| **Mobile** | CTA and signup form fully responsive on iOS/Android Safari |
| **Accessibility** | Form meets WCAG 2.1 AA (labels, error states, keyboard nav) |
| **Security** | Password min 8 chars; Supabase Auth handles hashing |
| **Spam Prevention** | Duplicate email returns helpful error: "Account exists — sign in instead" |

---

## 6. Out of Scope

- Email verification gate before trial starts (adds friction — skip for now)
- Credit card collection at trial start
- Team/multi-seat trial provisioning
- Trial extension logic

---

## 7. Acceptance Criteria

### AC-1: CTA Visibility
- [ ] "Start Free Trial" button is visible above the fold on desktop (1280px) without scrolling
- [ ] "Start Free Trial" button is visible above the fold on mobile (375px) without scrolling

### AC-2: Frictionless Signup
- [ ] User can create an account with only email + password (2 fields)
- [ ] Account is created and user is redirected to dashboard within 5 seconds of form submit
- [ ] No credit card field is shown during trial signup

### AC-3: Trial Account State
- [ ] New account has `plan_tier = 'trial'` in `agents` table
- [ ] `trial_ends_at` is set to 30 days from creation
- [ ] User sees "Trial · X days remaining" badge in dashboard nav

### AC-4: Multiple CTA Placements
- [ ] "Start Free Trial" CTA appears in hero, features section, and pricing section

### AC-5: Existing Pilot Form
- [ ] Existing pilot application form still accessible at `/pilot` or equivalent
- [ ] No regression on existing signup flow

### AC-6: Source Attribution
- [ ] Trial accounts created via this CTA have `source = 'trial_cta'` on their `agents` record

### AC-7: Error Handling
- [ ] Duplicate email shows: "An account with this email already exists. Sign in instead."
- [ ] Invalid email shows inline validation error
- [ ] Network error shows: "Something went wrong. Please try again."

---

## 8. Design Notes

- Primary CTA color: match brand primary (existing button styles)
- "No Credit Card" text must be visible without hover — inline below or next to button
- Trial badge in nav: pill/tag component, not a banner (avoid dashboard clutter)
- Signup form: centered card, max-width 420px, same visual style as existing login page

---

## 9. Dependencies

| Dependency | Status |
|------------|--------|
| Supabase `agents` table with `plan_tier` + `trial_ends_at` columns | Verify exists / add columns |
| Existing `/signup` route | Exists (extend, don't replace) |
| Existing onboarding wizard (`/dashboard/onboarding`) | Exists (`feat-post-login-onboarding-wizard` not_started — may need coordination) |
| UTM capture (feat-utm-capture-marketing-attribution) | Complete ✅ |
| Auth middleware | Complete ✅ |

---

## 10. Success Definition

A real estate agent discovers LeadFlow AI, clicks "Start Free Trial", enters email + password, and is inside the product dashboard within 60 seconds — with no payment required, no manual approval, and no human intervention.
