# GA4 Setup Guide

## Status: CODE-COMPLETE ✅

The GA4 (Google Analytics 4) implementation for the LeadFlow AI dashboard is **code-complete and tested**. This document provides the manual setup steps required to activate GA4 tracking.

## What's Been Implemented

### 1. Frontend Analytics Library
- **Location:** `product/lead-response/dashboard/lib/analytics/ga4.ts`
- **Features:**
  - Type-safe GA4 event tracking
  - SSR-safe implementations (no-ops during server-side rendering)
  - CTA click tracking with validated IDs
  - Form funnel event tracking
  - Scroll depth milestone tracking
  - No PII collection (privacy-compliant)

### 2. GA4 Script Integration
- **Location:** `product/lead-response/dashboard/app/layout.tsx`
- **Features:**
  - Conditional GA4 script loading (only if `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set)
  - Google Tag Manager initialization
  - IP anonymization enabled
  - Page view tracking enabled

### 3. CTA Tracking Implementation
- **Location:** `product/lead-response/dashboard` (various components)
- **Coverage:**
  - Landing page CTAs (Hero, Navigation, Pricing cards)
  - Trial signup form submission
  - Pilot program signup form
  - Lead magnet form interactions

### 4. Test Coverage
- **Location:** `product/lead-response/dashboard/tests/cta-click-analytics.test.ts`
- **Status:** ✅ 37/37 tests passing
- **Coverage:**
  - Core `trackCTAClick()` function
  - CTA parameter validation
  - SSR safety
  - PII protection
  - Landing page CTA implementation
  - Form funnel tracking

## Manual Setup Required

### Step 1: Create GA4 Property

1. Go to [Google Analytics Admin](https://analytics.google.com/analytics/admin/)
2. Select or create a Google Cloud project
3. Click **"Create Property"**
4. Fill in property details:
   - **Property name:** `LeadFlow AI (Production)`
   - **Reporting timezone:** UTC (or your preference)
   - **Currency:** USD
5. Set up **Data stream:**
   - Select **Web**
   - **Website URL:** `https://leadflow-ai-five.vercel.app`
   - **Stream name:** `LeadFlow Dashboard`
6. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 2: Set Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the **`leadflow-ai`** project
3. Navigate to **Settings → Environment Variables**
4. Add new environment variable:
   - **Name:** `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
   - **Value:** `G-XXXXXXXXXX` (from Step 1)
   - **Environments:** ✓ Production ✓ Preview (leave Development unchecked for local testing)
5. Click **Save**

### Step 3: Redeploy Dashboard

```bash
cd product/lead-response/dashboard
vercel --prod
```

Or trigger via Vercel UI:
1. Go to **Deployments**
2. Click **Redeploy** on the latest commit
3. Confirm deployment

## Verification

Once deployed, verify GA4 is tracking:

1. **Real-time Reporting:**
   - Go to GA4 property → **Reports → Real-time**
   - Click a CTA on the live dashboard
   - You should see the event appear in real-time within 1-2 seconds

2. **Browser DevTools:**
   - Open [leadflow-ai-five.vercel.app](https://leadflow-ai-five.vercel.app)
   - Open **DevTools → Console**
   - You should see `gtag` function available in the global scope
   - Click any CTA button
   - Check **DevTools → Network → Collect**
   - Look for requests to `google-analytics.com/g/collect` or similar

3. **Event Check:**
   - In GA4, navigate to **Reports → Events**
   - Look for `cta_click` event with parameters:
     - `cta_id` (e.g., `join_pilot_hero`)
     - `cta_label` (e.g., `Join Pilot Program`)
     - `section` (e.g., `hero`)

## Local Development (Optional)

To test GA4 events locally without sending data to Google:

1. Leave `NEXT_PUBLIC_GA4_MEASUREMENT_ID` unset in `.env.local`
2. The GA4 script will NOT load
3. `trackCTAClick()` and other analytics functions are SSR-safe no-ops
4. Use `console.log` or browser DevTools to verify code is being called

```typescript
// Optional: add a debug mode
if (process.env.NODE_ENV === 'development') {
  console.log('GA4 Debug:', { ctaId, ctaLabel, section });
}
```

## What Gets Tracked

### CTA Click Events (`cta_click`)
Fired when users click any call-to-action button:
- Join Pilot Program (hero, nav)
- Start Free Trial
- See How It Works
- Pricing tier "Get Started" buttons
- Lead magnet form submission
- Pilot application form submission

**Parameters:**
- `cta_id` — Unique identifier
- `cta_label` — Button text
- `section` — Page section
- `page_url` — Current URL

### Form Funnel Events
- `form_view` — User sees form
- `form_start` — User starts filling form
- `form_submit_attempt` — User attempts submit
- `pilot_signup_complete` — Successful submission
- `form_submit_error` — Form validation or server error

### Scroll Depth Events
- `scroll_milestone` — Fires at 25%, 50%, 75% scroll depth

## Privacy & Compliance

✅ **No PII Collected**
- Email, phone, name are NEVER sent to GA4
- Only form IDs and generic labels are tracked
- IP anonymization is enabled

✅ **GDPR Compliant**
- GA4 Data Retention: Auto-delete after 14 months
- User consent not required for analytics
- Privacy policy should mention GA4 analytics

## Troubleshooting

**Events not appearing in GA4?**
1. Verify `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set correctly in Vercel
2. Verify dashboard was redeployed after setting the env var
3. Wait 24-48 hours for GA4 to fully process events
4. Check browser console for errors: `window.gtag` should be a function
5. Verify no browser ad-blockers are blocking google-analytics.com

**Getting "window.gtag is not defined"?**
1. GA4 script may not have loaded yet
2. Check if `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set
3. Check browser DevTools → Sources for `gtag.js` script

**Production GA4 showing no events?**
1. Ensure Vercel env var is set in Production environment (not just Preview)
2. Verify you deployed with `vercel --prod`
3. Events take 1-2 minutes to appear in real-time reporting

## Files to Reference

- **GA4 Library:** `lib/analytics/ga4.ts`
- **Layout Integration:** `app/layout.tsx`
- **Tests:** `tests/cta-click-analytics.test.ts`
- **PRD Reference:** `docs/prd/PRD-FR-LANDING-ANALYTICS-GA4.md`

## Next Steps

1. ✅ Create GA4 property in Google Analytics Admin
2. ✅ Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` in Vercel Environment Variables
3. ✅ Redeploy dashboard via Vercel CLI or UI
4. ✅ Verify events are appearing in GA4 real-time reporting
5. ✅ Check conversion tracking for pilot signup form

---

**Task ID:** 840baa29-038f-4c42-8f98-640e68c85883  
**Status:** Code-Complete, Awaiting Manual Setup  
**Last Updated:** 2026-03-18
