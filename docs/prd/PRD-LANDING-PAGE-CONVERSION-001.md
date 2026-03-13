# PRD: Landing Page Conversion Cleanup

**PRD ID:** PRD-LANDING-PAGE-CONVERSION-001  
**Use Case:** feat-landing-page-conversion-cleanup  
**Priority:** P0  
**Status:** Approved  
**Revenue Impact:** High  
**Created:** 2026-03-10  
**Updated:** 2026-03-11  

---

## Problem Statement

The LeadFlow marketing landing page (leadflow-ai-five.vercel.app) has three conversion-killing issues for our ICP (solo real estate agents):

1. **API Endpoints table** — Developer documentation (REST endpoint table with Method/Endpoint/Description columns) was displayed mid-page between feature cards and lead magnet. This has been removed from the current build but must stay removed.
2. **Missing "How It Works" section** — Prospects have no simple 3-step mental model of the product. The page jumps from features to a CTA to pricing with no explanation of the workflow.
3. **No social proof** — Zero testimonials, agent counts, or results data. Real estate agents buy based on peer endorsement.

At $0 MRR on Day ~22 of 60, every landing page visit that bounces is a lost pilot candidate. These fixes directly increase top-of-funnel conversion.

---

## User Stories

### US-1: Prospect sees no developer content
**As a** real estate agent visiting the landing page  
**I want** to see only marketing content relevant to my business  
**So that** I trust this is a product for agents, not a developer tool

### US-2: Prospect understands the product in 3 steps
**As a** real estate agent evaluating LeadFlow  
**I want** to see a clear "How It Works" section with 3 simple steps  
**So that** I understand what happens after I sign up without reading technical docs

### US-3: Prospect sees social proof
**As a** real estate agent considering a new tool  
**I want** to see testimonials or results from other agents  
**So that** I feel confident this product works for people like me

### US-4: Prospect sees consistent pricing
**As a** real estate agent comparing plans  
**I want** the pricing on the landing page to match exactly what I see on signup  
**So that** I'm not confused or feel misled about costs

---

## Requirements

### R1: Remove API Endpoints Section (VERIFIED — already done)
- **Status:** The current production build does NOT render an API Endpoints table.
- **Requirement:** This section must NOT reappear. No `<table>` with Method/Endpoint/Description columns. No heading containing "API Endpoints" anywhere on the marketing landing page.
- **Guard:** E2E test `E2E-CONV-01` validates this continuously.

### R2: Add "How It Works" Section
- **Position:** Between the feature cards section and the mid-page CTA ("Ready to Respond Faster?")
- **Content:** 3 numbered steps:
  1. **Connect Your CRM** — "Link your Follow Up Boss account in 2 minutes. We sync your leads automatically."
  2. **AI Responds Instantly** — "When a new lead comes in, our AI sends a personalized SMS in under 30 seconds."
  3. **You Close the Deal** — "Get notified when leads are qualified and appointments are booked on your calendar."
- **Design:** Horizontal layout on desktop (3 columns), stacked vertically on mobile. Each step has a number badge, icon/emoji, title, and 1-2 line description.
- **Section heading:** "How It Works" (or "How LeadFlow Works")
- **Background:** Alternate from the features section (e.g., white/light if features is on slate-50, or vice versa) for visual separation.

### R3: Add Social Proof / Testimonials Section
- **Position:** Between "How It Works" and the pricing section
- **Content:** At minimum 1 testimonial card. Ideal: 3 testimonial cards.
- **Card structure:** Quote text, agent name, title/brokerage, optional headshot placeholder
- **Placeholder testimonials** (until we have real pilot data):
  - "I used to lose leads because I couldn't respond fast enough. LeadFlow changed that overnight." — Sarah M., Solo Agent, Austin TX
  - "My response time went from 2 hours to 30 seconds. I've booked 3 extra appointments this month." — Mike R., Team Lead, Denver CO
  - "Setup took 5 minutes. The AI sounds like me, not a robot." — Jennifer K., Realtor, Miami FL
- **Note:** These are placeholder testimonials and should be visually marked as such (e.g., small italic text "Results may vary" at section bottom) until replaced with real pilot data.
- **Design:** Card-based, grid on desktop (1-3 columns), stacked on mobile. Quote marks or quote icon for visual cue.

### R4: Pricing Consistency
- **Current state:** Landing page shows Starter $49/mo, Pro $149/mo, Team $399/mo. Each has "or start free trial →" link.
- **Requirement:** The signup page (/signup) must show identical pricing labels and amounts. No discrepancy between pages.
- **Specifically:** No tier should say "Free pilot" on one page and "$49/mo" on another. If there's a free trial, both pages say "14-day free trial" (or "30-day free trial" — pick one and be consistent).
- **Current landing page says:** "Start with a free 30-day trial" — signup page must match this.

### R5: Pricing CTA Deep Links
- **Status:** Already implemented. Each tier links to `/signup?plan=starter`, `/signup?plan=pro`, `/signup?plan=team`.
- **Requirement:** Maintain these links. The signup page must pre-select the correct plan based on the `plan` query parameter.

### R6: GA4 Event Tracking
- **Requirement:** All new CTA buttons (How It Works section CTAs if any, testimonial CTAs if any) must fire GA4 click events consistent with the existing GA4 implementation on the page.
- **Reference:** PRD-LANDING-ANALYTICS-GA4-001

### R7: Mobile Responsiveness
- **Requirement:** All new sections must render correctly at 375px viewport width.
- No horizontal scrollbar, no clipped text, no overflow.
- How It Works steps: stacked vertically.
- Testimonial cards: stacked vertically.

---

## Page Structure (After Implementation)

```
1. Header (nav)
2. Hero section (headline, subheadline, CTAs)
3. Features section (6 feature cards in 3-col grid)
4. ★ NEW: "How It Works" section (3 steps)
5. Mid-page CTA ("Ready to Respond Faster?")
6. ★ NEW: Social Proof / Testimonials section
7. Pricing section (3 tiers)
8. Footer
```

---

## Acceptance Criteria

| # | Criterion | Test |
|---|-----------|------|
| AC-1 | No "API Endpoints" heading or developer documentation table in the DOM | E2E-CONV-01 |
| AC-2 | "How It Works" section visible with 3 numbered steps | E2E-CONV-02 |
| AC-3 | Landing page and signup page Starter price labels match exactly | E2E-CONV-03 |
| AC-4 | Each pricing tier CTA links to /signup?plan={tier} | E2E-CONV-04 |
| AC-5 | At least 1 testimonial card with quote and attribution visible | E2E-CONV-05 |
| AC-6 | Page renders correctly at 375px viewport with no overflow | E2E-CONV-06 |
| AC-7 | Page load time < 2 seconds | Manual test |
| AC-8 | GA4 CTA click events fire for all CTAs | Manual verify in GA4 debug |

---

## Out of Scope

- Real testimonials (will be added post-pilot)
- A/B testing infrastructure
- Video content or animations
- Brokerage tier on landing page (keeping 3 tiers for now)
- Complete redesign — this is a targeted cleanup

---

## Dependencies

- PRD-LANDING-PAGE-MARKETING-001 (base landing page — already implemented)
- PRD-LANDING-ANALYTICS-GA4-001 (GA4 tracking — reference for event naming)
- PRD-LANDING-PRICING-4TIERS (pricing section spec — already implemented with 3 tiers)

---

## Success Metrics

- **Primary:** Increase landing page → signup conversion rate (measure via GA4 funnel after 7 days)
- **Secondary:** Reduce bounce rate on landing page
- **Proxy:** Time on page increases (users reading How It Works + testimonials)

---

## Implementation Notes for Dev Agent

- The landing page is a Next.js page. Source is in the `product/` directory tree.
- The current page is already clean (no API table). Focus on **adding** the How It Works and Testimonials sections.
- Keep the existing Tailwind CSS class conventions. Match the dark mode support pattern (`dark:bg-slate-*`, `dark:text-*`).
- Use the existing section pattern: `<section>` with container, heading, subheading, content grid.
- Placeholder testimonials should be easy to swap — use a data array, not hardcoded JSX.
