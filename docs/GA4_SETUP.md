# GA4 Setup Guide for LeadFlow AI

## Overview
This guide explains how to set up Google Analytics 4 (GA4) for the LeadFlow AI dashboard. The GA4 script is already implemented in `app/layout.tsx` and will automatically load once you configure the Measurement ID.

## Current Status
- ✅ GA4 script integration is implemented in `/product/lead-response/dashboard/app/layout.tsx`
- ✅ All tests pass (10/10 pass rate)
- ✅ Event tracking functions are ready (trackCTAClick, trackScrollMilestone, trackFormEvent)
- ⏳ **PENDING:** Measurement ID configuration (requires manual setup in Google Analytics)

## Setup Instructions for Stojan

### 1. Create GA4 Property in Google Analytics
1. Go to [analytics.google.com](https://analytics.google.com)
2. Click **Create** (or **+** icon)
3. Select **Property**
4. Enter property name: `LeadFlow AI`
5. Select your timezone and currency
6. Click **Create**

### 2. Add Data Stream
1. In your new property, go to **Data streams**
2. Click **Create stream**
3. Select **Web**
4. Enter:
   - Website URL: `https://leadflow-ai-five.vercel.app`
   - Stream name: `LeadFlow Dashboard`
5. Click **Create stream**

### 3. Copy the Measurement ID
1. You'll see a screen with your Measurement ID (format: `G-XXXXXXXXXX`)
2. **Copy this ID** — you'll need it in steps 4 and 5

### 4. Add to Vercel Environment Variables
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select the `leadflow-ai` project
3. Go to **Settings → Environment Variables**
4. Add new variable:
   - Name: `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
   - Value: Paste your Measurement ID (e.g., `G-XXXXXXXXXX`)
   - Environments: **Production**, **Preview**, **Development**
5. Click **Save**

**Important:** After saving, redeploy the dashboard for changes to take effect:
```bash
cd product/lead-response/dashboard
vercel --prod
```

### 5. Update Local `.env.local` for Development
1. Edit `product/lead-response/dashboard/.env.local`
2. Find the line: `NEXT_PUBLIC_GA4_MEASUREMENT_ID=`
3. Replace with: `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX` (your actual ID)
4. Save the file
5. Restart the dev server: `npm run dev`

## Verification

Once you've configured the Measurement ID:

### Local Testing
1. Start the dev server: `npm run dev`
2. Open [localhost:3000](http://localhost:3000)
3. Open Chrome DevTools → **Network** tab
4. Search for `googletagmanager.com`
5. You should see a successful request to `gtag/js?id=G-XXXXXXXXXX`

### Production Testing
1. Go to [leadflow-ai-five.vercel.app](https://leadflow-ai-five.vercel.app)
2. Open Chrome DevTools → **Network** tab
3. Search for `googletagmanager.com`
4. Verify the request is successful
5. Go to [Google Analytics Real-time Report](https://analytics.google.com) → Select your property → Real-time
6. You should see active users on the dashboard

### Test Events
The dashboard tracks these events automatically:
- **cta_click**: When users click CTAs (e.g., "Join Free Pilot")
- **scroll_milestone**: When users scroll to 25%, 50%, 75%, 90%
- **form_start**: When users start filling out the signup form
- **form_submit_attempt**: When users attempt to submit
- **pilot_signup_complete**: When signup completes successfully

Check the Real-time Report in GA4 to see these events firing.

## Code Reference

### GA4 Script Integration (app/layout.tsx)
The layout.tsx file conditionally renders the GA4 script only if the Measurement ID is configured:
```tsx
const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

{GA_ID && (
  <Script
    src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
    strategy="afterInteractive"
  />
)}
```

### Event Tracking Functions (lib/analytics/ga4.ts)
Core tracking functions are available:
- `trackEvent(name, params)` — Fire any custom event
- `trackCTAClick(id, label, section)` — Track CTA clicks
- `trackScrollMilestone(percent)` — Track scroll depth
- `trackFormEvent(event, formId, extra)` — Track form interactions

Example usage:
```typescript
import { trackCTAClick } from '@/lib/analytics/ga4';

// In a button onClick handler
trackCTAClick('join_pilot_hero', 'Join Free Pilot', 'hero');
```

## Troubleshooting

### GA4 Script Not Loading
- **Check:** Is `NEXT_PUBLIC_GA4_MEASUREMENT_ID` set in your environment?
- **Check:** Did you redeploy after adding the env var to Vercel?
- **Check:** Is the ID in the correct format (`G-XXXXXXXXXX`)?

### No Events Appearing in GA4
- **Check:** Is the measurement ID correct?
- **Check:** Are you on the correct property/data stream in GA4?
- **Note:** GA4 Real-time reports show events with ~1-2 second delay

### Local Dev Not Showing GA4
- **Expected:** GA4 only loads if `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set
- **Solution:** Add your Measurement ID to `.env.local` as shown in step 5 above

## Related Files
- Implementation: `product/lead-response/dashboard/app/layout.tsx`
- Event tracking: `product/lead-response/dashboard/lib/analytics/ga4.ts`
- Tests: `product/lead-response/dashboard/__tests__/ga4-analytics.test.tsx`
- Environment: `product/lead-response/dashboard/.env.local`

## References
- [Google Analytics 4 Docs](https://support.google.com/analytics/answer/10089681)
- [Google Tag Manager Setup](https://support.google.com/tagmanager/answer/6103696)
- [Next.js Script Component](https://nextjs.org/docs/app/api-reference/components/script)
