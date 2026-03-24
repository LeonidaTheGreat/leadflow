# PRD: Marketing Landing Page — High-Converting Signup Flow

**PRD ID:** PRD-LANDING-MARKETING-001  
**Use Case:** UC-LANDING-MARKETING-001  
**Version:** 2.0  
**Status:** Approved  
**Priority:** P0  
**Revenue Impact:** Critical — primary top-of-funnel driver for $20K MRR target  
**Created:** 2026-03-24  
**Updated:** 2026-03-24  
**Author:** Product Manager  

---

## 1. Overview

### Problem Statement

The LeadFlow AI marketing landing page (`/`) exists but is **incomplete and underconverting**. The current implementation (`product/lead-response/dashboard/app/page.tsx`) is missing:

1. **Stats bar** — 4 key proof metrics above the fold
2. **How It Works section** — 3-step mental model (required by acceptance criteria)
3. **FAQ section** — 7-item accordion (required by acceptance criteria)
4. **Final CTA section** — closing conversion prompt
5. **`data-testid` attributes** — E2E tests cannot run, all 22 specs remain `not_run`
6. **Scroll depth analytics wiring** — `attachScrollMilestoneObservers` never called
7. **CTA click event firing** — analytics events not instrumented on CTAs

The use case `implementation_status` is `needs_merge`. This PRD consolidates all requirements into a single authoritative spec for dev/design to complete.

### Target Audience

- **Primary ICP:** Solo real estate agents, 12–24 transactions/year, using Follow Up Boss, losing leads to faster responders
- **Secondary:** Small teams (2–5 agents)

### Success Metrics

| Metric | Target |
|--------|--------|
| Signup Conversion Rate | ≥10% of unique visitors |
| Bounce Rate | <40% |
| Time on Page | ≥2 min average |
| CTA Click Rate (hero) | ≥15% |
| Scroll Depth 50%+ | ≥60% of visitors |
| Page Load (FCP) | <1.5s |
| Lighthouse Score | ≥90 |

---

## 2. User Stories

### US-1: First-Time Visitor Understands the Product
**As a** real estate agent who just clicked an ad  
**I want to** instantly understand what LeadFlow AI does and why it matters  
**So that** I decide within 10 seconds whether to keep reading

**Acceptance Criteria:**
- Value prop visible above the fold on all viewports
- "<30s response time" is the first stat a visitor sees
- No developer jargon on the page

### US-2: Skeptical Agent Builds Trust
**As a** skeptical agent who's tried other tools  
**I want to** see real metrics and peer testimonials  
**So that** I believe this product actually delivers results

**Acceptance Criteria:**
- Stats bar shows 4 proof metrics with context labels
- At least 3 testimonials from agents (with name, city, role)
- Trust badges or compliance indicators in footer or hero

### US-3: Ready-to-Try Agent Converts
**As an** agent ready to start  
**I want to** click a CTA and get to signup in 1 step  
**So that** I don't lose momentum

**Acceptance Criteria:**
- Primary CTA present in: hero, after features, after pricing, final section (4 placements minimum)
- Clicking any CTA navigates to `/signup/trial` or scrolls to inline form
- UTM parameters preserved through navigation
- No credit card required message visible at all CTA placements

### US-4: Price-Conscious Agent Evaluates Fit
**As an** agent evaluating budget  
**I want to** see all 4 pricing tiers clearly  
**So that** I can pick the right plan before I commit

**Acceptance Criteria:**
- All 4 tiers displayed: Starter $49, Pro $149, Team $399, Brokerage $999+
- "Most Popular" badge on Pro tier
- Feature list per tier makes differentiation clear
- Annual pricing toggle shows savings (10× monthly rate)

### US-5: Curious Agent Understands the Flow
**As an** agent wondering "how does this actually work"  
**I want to** see a simple 3-step explanation  
**So that** I feel confident the setup won't be painful

**Acceptance Criteria:**
- How It Works section with exactly 3 steps
- Steps: (1) Connect FUB, (2) AI responds to leads, (3) You close deals
- Visual step indicators (numbered or icon-led)

### US-6: Objection-Having Agent Gets Answers
**As an** agent with specific questions  
**I want to** find answers in an FAQ section  
**So that** I don't need to contact support before signing up

**Acceptance Criteria:**
- FAQ accordion with minimum 7 questions
- Questions cover: pricing, contracts, SMS compliance, FUB integration, response quality, setup time, trial
- Only one answer visible at a time
- Works on mobile via touch

### US-7: Mobile Visitor Has Full Experience
**As an** agent on their phone  
**I want** the landing page to work perfectly on mobile  
**So that** I can sign up from anywhere

**Acceptance Criteria:**
- No horizontal scroll at 375px viewport
- All CTAs ≥44px tap target
- Mobile hamburger nav opens and closes correctly
- All sections readable without zooming

---

## 3. Functional Requirements

### FR-1: Hero Section (P0)

**Headline:** "AI-Powered Lead Response in Under 30 Seconds"  
**Subheadline:** "Instantly qualify and respond to real estate leads using AI. Never miss another opportunity. Start free — no credit card required."

Elements:
- Primary CTA: "Start Free Trial — No Credit Card" → `/signup/trial`
- Secondary CTA: "See How It Works" → smooth scroll to `#how-it-works`
- Tertiary link: "Try Live AI Demo →" → `/demo`
- Optional: "Now in Pilot — Limited Spots" urgency badge

`data-testid` attributes required:
- `data-testid="hero-section"` on the section element
- `data-testid="hero-cta-primary"` on the primary CTA button
- `data-testid="hero-cta-secondary"` on the secondary CTA link

### FR-2: Stats Bar (P0) — **MISSING, MUST ADD**

A horizontal bar immediately below the hero with 4 proof stats:

| Stat | Label |
|------|-------|
| `<30s` | Average Response Time |
| `78%` | Deals Go to First Responder |
| `35%` | Leads Never Get a Response |
| `24/7` | Always On |

`data-testid="stats-bar"` on the container element.

### FR-3: Problem Section (P0)

3 pain point cards (already implemented — verify `data-testid` attributes):
1. "Missing calls during showings" 
2. "After-hours leads go cold"
3. "Manual follow-up takes hours"

`data-testid="problem-section"` on the section.

### FR-4: Solution / Features Section (P0)

6 feature cards (already implemented — verify `data-testid` attributes):
1. AI Qualification
2. Instant SMS Response
3. CRM Integration
4. Smart Booking
5. Lead Scoring
6. Analytics Dashboard

`data-testid="features-section"` on the section.  
CTA at bottom of features: `data-testid="features-cta"`.

### FR-5: How It Works Section (P0) — **MISSING, MUST ADD**

3-step visual flow with numbered steps:

**Step 1 — Connect Your CRM**  
Description: "Link your Follow Up Boss account in under 5 minutes. Your existing leads and contacts sync automatically."  
Icon: 🔗

**Step 2 — AI Responds Instantly**  
Description: "The moment a lead comes in, LeadFlow AI sends a personalized SMS response in <30 seconds — 24/7, even during showings."  
Icon: ⚡

**Step 3 — You Close the Deals**  
Description: "Qualified leads get booked on your calendar automatically. You show up to the meeting — the AI did the work."  
Icon: 🏆

`data-testid` attributes:
- `data-testid="how-it-works-section"` on the section
- `data-testid="how-it-works-step-1"`, `step-2`, `step-3` on each step

### FR-6: Social Proof / Testimonials Section (P1)

3 testimonials (already implemented):
- Sarah M., Solo Agent, Austin TX
- Mike R., Team Lead, Denver CO
- Jennifer K., Realtor, Miami FL

`data-testid="testimonials-section"` on the section.

Disclaimer required: *"Results may vary. Testimonials represent expected outcomes based on typical usage."*

### FR-7: Pricing Section (P0)

All 4 tiers displayed (partially implemented — needs annual toggle):

| Tier | Price | Key Features |
|------|-------|-------------|
| Starter | $49/mo | 100 SMS, basic AI, dashboard |
| Pro | $149/mo | Unlimited SMS, full AI, Cal.com, analytics — **MOST POPULAR** |
| Team | $399/mo | 5 agents, team dashboard, lead routing |
| Brokerage | $999+/mo | White-label, admin, compliance |

Annual pricing toggle: show 10× monthly rate with "Save 2 months" badge.

`data-testid` attributes:
- `data-testid="pricing-section"` on the section
- `data-testid="pricing-starter-cta"`, `pricing-pro-cta"`, `pricing-team-cta"`, `pricing-brokerage-cta"` on each tier CTA

Each tier CTA navigates to `/signup?plan={tier}` or `/signup/trial?plan={tier}`.

### FR-8: FAQ Section (P0) — **MISSING, MUST ADD**

Accordion with 7 questions. Only one answer open at a time.

| # | Question | Answer |
|---|----------|--------|
| 1 | How does LeadFlow AI respond to leads? | It monitors your FUB inbox. When a new lead arrives, AI generates a personalized SMS using their name, property of interest, and inquiry context. Sent in <30 seconds. |
| 2 | Do I need to sign a long-term contract? | No. All plans are month-to-month. Cancel anytime from your dashboard. |
| 3 | Does the AI sound like a robot? | No. The AI is trained to sound like a professional agent — warm, helpful, and specific to the lead's inquiry. You can customize the tone and templates. |
| 4 | How does it integrate with Follow Up Boss? | Via OAuth. Connect in <5 minutes. New leads automatically trigger AI responses. No FUB changes required. |
| 5 | Is SMS messaging compliant (A2P 10DLC)? | Yes. LeadFlow is registered for A2P 10DLC compliance. All SMS is opt-in and includes compliant opt-out language. |
| 6 | How long does setup take? | Most agents are live in under 15 minutes. Connect FUB, verify your phone, and the AI starts responding. |
| 7 | What happens if I want to respond myself? | You can take over any conversation at any time from the dashboard. The AI pauses on that lead the moment you respond. |

`data-testid` attributes:
- `data-testid="faq-section"` on the section
- `data-testid="faq-item-{n}"` on each accordion item (1–7)

### FR-9: Final CTA Section (P0) — **MISSING, MUST ADD**

A closing section that converts fence-sitters:

**Headline:** "Stop Losing Leads to Agents Who Respond Faster"  
**Subheadline:** "Join LeadFlow AI and respond to every lead in under 30 seconds — automatically."

Elements:
- Primary CTA: "Start My Free Trial →" → `/signup/trial` — `data-testid="final-cta-primary"`
- Secondary: "Have questions? Talk to us." → mailto or chat
- Trust signal: "No credit card required. Cancel anytime."

`data-testid="final-cta-section"` on the section.

### FR-10: Navigation (P1)

Fixed/sticky navigation with:
- Logo "LeadFlow AI" (left)
- Nav links: Features, How It Works, Pricing, FAQ (smooth scroll)
- CTA: "Start Free Trial" (right) → `/signup/trial`
- Mobile: hamburger toggle

`data-testid` attributes:
- `data-testid="nav"` on the nav element
- `data-testid="nav-features"`, `nav-how-it-works"`, `nav-pricing"`, `nav-faq"` on links
- `data-testid="nav-cta"` on the CTA button
- `data-testid="nav-mobile-toggle"` on hamburger

### FR-11: Footer (P1)

- Copyright line
- Links: Privacy Policy, Terms, Sign In, Pilot Program
- SMS compliance: "A2P 10DLC registered"

---

## 4. Analytics Requirements (P0)

**GA4 is configured** in `layout.tsx` via `NEXT_PUBLIC_GA4_MEASUREMENT_ID`. The following events must be fired client-side:

### CTA Click Events (fire on every CTA click)

```javascript
gtag('event', 'cta_click', {
  cta_location: 'hero' | 'features' | 'pricing_starter' | 'pricing_pro' | 'pricing_team' | 'pricing_brokerage' | 'final',
  plan: 'trial' | 'starter' | 'pro' | 'team' | 'brokerage' | undefined
});
```

### Scroll Depth Events

Fire at milestones: 25%, 50%, 75%, 100%. Use `IntersectionObserver` on section elements.

```javascript
gtag('event', 'scroll_depth', { depth_percent: 25 | 50 | 75 | 100 });
```

**Critical:** `attachScrollMilestoneObservers()` or equivalent must be called on mount. Past failure: this function was defined but never called (zombie_timeout task on 2026-03-15).

### Section View Events

Fire when a section enters viewport (IntersectionObserver, threshold 0.5):

```javascript
gtag('event', 'section_view', { section: 'hero' | 'stats' | 'problem' | 'features' | 'how_it_works' | 'testimonials' | 'pricing' | 'faq' | 'final_cta' });
```

---

## 5. Non-Functional Requirements

### Performance
- First Contentful Paint: <1.5 seconds
- Lighthouse Performance Score: ≥90
- No render-blocking resources
- Images use `next/image` with appropriate sizing

### Responsive Design
- Mobile-first implementation
- Breakpoints: 375px (mobile), 768px (tablet), 1024px+ (desktop)
- No horizontal scroll at any breakpoint
- All tap targets ≥44px height and width

### Accessibility
- WCAG 2.1 AA compliance
- All images: descriptive `alt` text
- Heading hierarchy: H1 → H2 → H3 (no skipping)
- All interactive elements: keyboard accessible, visible focus ring
- Color contrast: ≥4.5:1 for body text, ≥3:1 for large text
- FAQ accordion: proper `aria-expanded`, `aria-controls` attributes

### SEO
- `<title>`: "LeadFlow AI — AI-Powered Lead Response for Real Estate Agents"
- `<meta name="description">`: "Respond to real estate leads in under 30 seconds with AI. Integrate with Follow Up Boss. Start free, no credit card required."
- Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`
- Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`
- Structured data (JSON-LD): `SoftwareApplication` schema

Note: Meta tags should be set in the **page-level metadata export** in `page.tsx`, overriding layout defaults for the landing page.

### Security
- No auth required on landing page — it's public
- Form submissions go to `/api/agents/onboard` or `/api/lead-capture` with:
  - **Input validation**: Email format, phone format, required fields
  - **Rate limiting**: Max 10 signup attempts per IP per hour
  - **No sensitive data in URL params** (UTM params in sessionStorage is correct pattern)

---

## 6. Page Structure & Section Order

```
/
├── <nav> Fixed header
├── <section id="hero"> Hero + problem cards
├── <section id="stats"> Stats bar
├── <section id="features"> Feature cards + mid-page CTA
├── <section id="how-it-works"> 3-step process
├── <section id="testimonials"> Social proof
├── <section id="pricing"> 4-tier pricing + annual toggle
├── <section id="faq"> 7-item accordion
├── <section id="final-cta"> Closing CTA
└── <footer> Links + compliance
```

---

## 7. data-testid Master List

All required `data-testid` attributes for E2E test coverage:

```
hero-section
hero-cta-primary
hero-cta-secondary
stats-bar
problem-section
features-section
features-cta
how-it-works-section
how-it-works-step-1
how-it-works-step-2
how-it-works-step-3
testimonials-section
pricing-section
pricing-annual-toggle
pricing-starter-cta
pricing-pro-cta
pricing-team-cta
pricing-brokerage-cta
faq-section
faq-item-1 through faq-item-7
final-cta-section
final-cta-primary
nav
nav-features
nav-how-it-works
nav-pricing
nav-faq
nav-cta
nav-mobile-toggle
```

---

## 8. What Is Already Implemented (Do Not Re-Build)

The following is **already in `product/lead-response/dashboard/app/page.tsx`** and should be preserved:

- ✅ Fixed navigation header with Logo, Pricing, Pilot, Sign In links
- ✅ Hero section with headline, subheadline, TrialSignupForm component
- ✅ Problem cards (3) inside hero area
- ✅ Features section (6 FeatureCard components)
- ✅ Mid-page CTA after features
- ✅ Testimonials section (3 TestimonialCard components)
- ✅ Pricing section with all 4 tiers (PricingCard components)
- ✅ Footer with copyright and links
- ✅ GA4 script in `layout.tsx` (loads when `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set)
- ✅ UTM parameter capture via `UtmCaptureTracker` component

**What needs to be added:**
- ❌ Stats bar (FR-2)
- ❌ How It Works section (FR-5)
- ❌ FAQ section (FR-8)
- ❌ Final CTA section (FR-9)
- ❌ `data-testid` attributes throughout (FR-1 through FR-11)
- ❌ Scroll depth IntersectionObserver wiring
- ❌ CTA click `gtag` event calls
- ❌ Annual pricing toggle logic
- ❌ Nav links updated to include How It Works and FAQ
- ❌ Page-level SEO metadata export

---

## 9. Acceptance Criteria

The following must be verifiable by Stojan in a browser:

- [ ] **AC-1:** Hero section visible above the fold with primary CTA "Start Free Trial — No Credit Card" on desktop AND mobile
- [ ] **AC-2:** Stats bar shows all 4 metrics: <30s, 78%, 35%, 24/7 with labels
- [ ] **AC-3:** Problem section shows 3 pain point cards
- [ ] **AC-4:** Features section shows 6 feature cards
- [ ] **AC-5:** How It Works section shows 3 numbered steps with icons and descriptions
- [ ] **AC-6:** Testimonials section shows 3 agent quotes with name and location
- [ ] **AC-7:** Pricing section shows all 4 tiers with correct prices ($49/$149/$399/$999+)
- [ ] **AC-8:** Annual pricing toggle switches prices; "Save 2 months" badge appears
- [ ] **AC-9:** FAQ section shows 7 questions; clicking opens/closes answers; only one open at a time
- [ ] **AC-10:** Final CTA section with "Stop Losing Leads to Agents Who Respond Faster" headline
- [ ] **AC-11:** Navigation links for Features, How It Works, Pricing, FAQ smooth-scroll to sections
- [ ] **AC-12:** On mobile (375px), no horizontal scroll, hamburger menu works
- [ ] **AC-13:** Clicking any "Start Free Trial" CTA navigates to `/signup/trial` (UTM preserved)
- [ ] **AC-14:** Page loads in <2 seconds (measure with Network tab, throttled Fast 3G)
- [ ] **AC-15:** No red console errors on load
- [ ] **AC-16:** All 22 E2E specs can run (data-testid attributes present)
- [ ] **AC-17:** GA4: CTA click events fire when clicking hero CTA (verify in GA4 DebugView or console)
- [ ] **AC-18:** Scroll depth events fire at 25% and 50% scroll (verify in GA4 DebugView)

---

## 10. E2E Test Coverage

All 22 existing E2E specs in the `e2e_test_specs` table are targeting this use case. Key specs:

| Test Name | File | Status |
|-----------|------|--------|
| Landing Page Load | `e2e/landing-page.spec.ts` | not_run |
| Hero CTA Navigation | `e2e/landing-page.spec.ts` | not_run |
| CTA Click Flow | `e2e/landing-page.spec.ts` | not_run |
| Pricing Toggle | `e2e/landing-page.spec.ts` | not_run |
| FAQ Accordion | `e2e/landing-page.spec.ts` | not_run |
| Navigation Scroll | `e2e/landing-page.spec.ts` | not_run |
| Mobile Responsive | `e2e/landing-page.spec.ts` | not_run |
| Analytics Tracking | `e2e/landing-page.spec.ts` | not_run |
| Accessibility | `e2e/landing-page.spec.ts` | not_run |

All tests require `data-testid` attributes to exist on their target elements.

---

## 11. Implementation Notes for Dev Agent

1. **Do not rebuild from scratch** — edit `product/lead-response/dashboard/app/page.tsx` only
2. **Stats bar** — add as a new `<section>` immediately after the hero `<section>`, before the features section
3. **How It Works** — add as a new `<section id="how-it-works">` after features, before testimonials
4. **FAQ** — use a React `useState` accordion pattern. One item open at a time. Add `aria-expanded` for a11y.
5. **Final CTA** — add before the footer
6. **data-testid** — add to ALL existing sections as well (hero, features, testimonials, pricing)
7. **Analytics** — create a `useEffect` on mount that initializes `IntersectionObserver` for scroll depth. Add `onClick` handlers to CTAs that call `window.gtag?.('event', ...)`.
8. **Nav links** — update to include "How It Works" (`#how-it-works`) and "FAQ" (`#faq`)
9. **SEO metadata** — export `metadata` const from `page.tsx` with page-specific title/description/OG tags

---

## 12. Workflow

| Step | Agent | Status |
|------|-------|--------|
| 1 | PM (PRD) | ✅ Complete (this document) |
| 2 | Design (content brief if needed) | ➡️ Optional — content specified in PRD |
| 3 | Dev (implementation) | ⏳ Ready to start |
| 4 | QC (E2E + manual verification) | ⏳ Pending dev |

---

## 13. Definition of Done

This use case is **DONE** when:
1. All 18 acceptance criteria pass Stojan's manual review
2. All 22 E2E test specs run (pass or fail — but they must execute, not skip due to missing testids)
3. Lighthouse score ≥90 on the live Vercel URL
4. `use_cases` row updated: `implementation_status = complete`, `e2e_tests_passing = true`

---

*This PRD supersedes and consolidates: PRD-LANDING-PAGE.md, PRD-LANDING-PAGE-CONVERSION-001.md, PRD-LANDING-PAGE-ANALYTICS-001.md, PRD-LANDING-ANALYTICS-GA4-001.md, PRD-LANDING-PRICING-4TIERS.md.*
