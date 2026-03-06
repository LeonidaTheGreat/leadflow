# PRD: LeadFlow AI Marketing Landing Page

**Document ID:** PRD-LANDING-PAGE-MARKETING-001  
**Version:** 2.0  
**Date:** March 6, 2026  
**Status:** Ready for Implementation  
**Replaces:** PRD-LANDING-PAGE-001 (v1.0)

---

## 1. Overview

### Problem Statement
The current landing page at `leadflow-ai-five.vercel.app` is developer-focused, displaying API endpoints instead of value proposition. Real estate agents (our ICP) land on the page and see technical documentation rather than compelling reasons to sign up. This is a **critical distribution blocker** — we have nowhere to send prospects.

### Purpose
Transform the root route (`/`) into a high-converting marketing landing page that clearly communicates LeadFlow AI's value proposition, builds trust, displays pricing, and drives trial signups.

### Target Audience
- **Primary:** Solo real estate agents (12-24 transactions/year)
- **Secondary:** Small teams (2-5 agents)
- **Pain Point:** Losing leads to competitors who respond faster

### Success Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Conversion Rate | 10%+ | 0% (no signup flow from landing) |
| Bounce Rate | <40% | Unknown |
| Time on Page | 2+ min | Unknown |
| Signup CTA Clicks | Trackable | Not tracked |

---

## 2. User Stories

### US-1: First-Time Visitor (Agent)
**As a** real estate agent visiting from a Facebook group or Google search  
**I want to** immediately understand what LeadFlow AI does and why I need it  
**So that** I can decide if it's worth my time to explore further

**AC:**
- Value prop visible above the fold within 2 seconds
- Clear statement of the problem (losing leads to slow response)
- Quantified benefit (<30s response time, 78% stat)
- No technical jargon or API references

### US-2: Price-Conscious Agent
**As a** solo agent evaluating tools within my budget  
**I want to** see clear, transparent pricing  
**So that** I can evaluate if this fits my monthly tool budget

**AC:**
- Pricing section visible within one scroll
- All 3 tiers displayed with clear feature differentiation
- "Most Popular" badge on Pro tier ($149/mo)
- No hidden fees or "contact sales" for basic tiers
- 14-day free trial prominently mentioned

### US-3: Skeptical Agent (Trust Building)
**As a** skeptical agent who's been burned by tools before  
**I want to** see social proof and understand how it works  
**So that** I feel confident this isn't vaporware

**AC:**
- Integration logos visible (FUB, Cal.com, Twilio)
- "How It Works" section explains the flow simply
- Stats bar with industry data (78% first responder, 35% never responded)
- No fake testimonials — use real pilot data when available

### US-4: Ready-to-Try Agent
**As a** convinced agent ready to start  
**I want to** sign up quickly with minimal friction  
**So that** I can start using the tool immediately

**AC:**
- CTA button prominent in hero section
- Clicking CTA scrolls to or navigates to signup form
- Signup form has 4 fields max (Name, Email, Phone, Brokerage)
- Clear statement: "14-day free trial, no credit card required"
- Alternative: Direct link to `/onboarding` for immediate start

---

## 3. Functional Requirements

### FR-1: Hero Section (P0 - Critical)
**Purpose:** Immediate value proposition and primary CTA

**Content:**
- **Headline:** "Never Lose Another Lead to Slow Response Times"
- **Subheadline:** "LeadFlow AI responds to your real estate leads in under 30 seconds — 24/7, even while you sleep. Integrated with Follow Up Boss."
- **Primary CTA:** "Start Free 14-Day Trial" → links to `/onboarding`
- **Secondary CTA:** "See How It Works" → scrolls to #how-it-works
- **Trust Badge:** "✓ Works with Follow Up Boss ✓ Cal.com Integration ✓ 24/7 Response"
- **Visual:** Simple illustration or screenshot of SMS conversation

**Requirements:**
- Must load above the fold on 1366x768 and mobile
- Headline must be <10 words for scanability
- CTA button must use high-contrast color (indigo/emerald)
- NO API documentation tables

### FR-2: Stats Bar (P0 - Critical)
**Purpose:** Social proof and urgency

**Content:**
| Stat | Label |
|------|-------|
| "<30s" | Avg Response Time |
| "78%" | Deals Go to First Responder |
| "35%" | Leads Never Get a Response |
| "24/7" | Always-On Coverage |

**Requirements:**
- Horizontal layout on desktop, 2x2 grid on mobile
- Large numbers (48px+), small labels
- Subtle background color differentiation

### FR-3: Problem Section (P0 - Critical)
**Purpose:** Agitate the pain point agents feel

**Content:**
3 problem cards:
1. **"Leads Go Cold in Minutes"** — "The average lead expects a response within 5 minutes. After 30 minutes, they're 21x less likely to convert."
2. **"You're Too Busy to Follow Up"** — "Showings, closings, paperwork — you can't be glued to your phone. But your competitors are."
3. **"Money Down the Drain"** — "You paid for Zillow leads. You paid for Facebook ads. But if you don't respond instantly, that money is wasted."

**Requirements:**
- Icon + headline + description for each
- Dark/slate background for contrast
- Lead into solution section

### FR-4: Solution/How It Works (P0 - Critical)
**Purpose:** Explain the product simply

**Content:**
4-step process:
1. **Lead Arrives** — "New lead hits your Follow Up Boss CRM from Zillow, Realtor.com, or Facebook"
2. **AI Analyzes** — "Claude AI reads the lead data and generates a personalized response in seconds"
3. **SMS Sent** — "Lead receives a natural, contextual SMS — no templates, no robots"
4. **You Get Notified** — "Full conversation history synced to FUB. You take over when ready."

**Requirements:**
- Visual flow (arrows or connected steps)
- Screenshots or illustrations for each step
- Link to "Full Features" if user wants more detail

### FR-5: Features Grid (P1 - High)
**Purpose:** Show capabilities without overwhelming

**Content:**
4 feature cards:
1. **Instant AI Response** — "Sub-30-second SMS responses, 24/7"
2. **Smart Qualification** — "AI extracts budget, timeline, and property preferences"
3. **Auto-Booking** — "Leads can book appointments via Cal.com integration"
4. **Follow-Up Sequences** — "Automated nurture sequences for non-responders"

**Requirements:**
- Icon + headline + 1-line description
- 2x2 grid on desktop, single column on mobile

### FR-6: Pricing Section (P0 - Critical)
**Purpose:** Clear pricing to qualify and convert

**Content:**
3 pricing tiers:

| Tier | Price | Features | CTA |
|------|-------|----------|-----|
| **Starter** | $49/mo | 100 SMS/mo, Basic AI, Dashboard | "Get Started" |
| **Pro** ⭐ | $149/mo | Unlimited SMS, Full AI, Cal.com, Analytics | "Start Free Trial" |
| **Team** | $399/mo | 5 agents, Team dashboard, Lead routing | "Contact Sales" |

**Requirements:**
- "Most Popular" badge on Pro tier
- Monthly pricing displayed (not annual)
- "14-day free trial" mentioned under each CTA
- Feature list bullets for each tier
- Starter/Pro link to `/onboarding`, Team links to mailto:sales@leadflow.ai

### FR-7: Final CTA Section (P0 - Critical)
**Purpose:** Capture users who scrolled through everything

**Content:**
- **Headline:** "Stop Losing Leads to Your Competitors"
- **Subheadline:** "Join the agents who never miss an opportunity. Start your free trial today."
- **CTA Button:** "Start My Free 14-Day Trial" → `/onboarding`
- **Trust Line:** "✓ No credit card required ✓ Cancel anytime ✓ Setup in 5 minutes"

### FR-8: Navigation (P1 - High)
**Purpose:** Allow users to jump to sections

**Content:**
- Logo (left)
- Links: Features, Pricing, How It Works
- CTA: "Get Started" (right) → `/onboarding`
- Mobile: Hamburger menu

**Requirements:**
- Fixed position on scroll
- Background becomes solid on scroll (glassmorphism)

### FR-9: Footer (P1 - High)
**Content:**
- Copyright: "© 2026 LeadFlow AI. All rights reserved."
- Links: Privacy Policy, Terms of Service
- Contact: support@leadflow.ai

---

## 4. Non-Functional Requirements

### Performance
- **Load time:** <2 seconds (Lighthouse performance score 90+)
- **First Contentful Paint:** <1.5s
- **Time to Interactive:** <3s
- **No render-blocking resources** above fold

### Responsive
- **Mobile-first design**
- **Breakpoints:** 320px, 768px, 1024px, 1440px
- **Touch targets:** Minimum 44x44px on mobile
- **Font sizes:** Readable without zoom on all devices

### Accessibility
- **WCAG 2.1 AA compliance**
- **Contrast ratio:** 4.5:1 minimum for text
- **Alt text:** All images have descriptive alt text
- **Keyboard navigation:** All interactive elements accessible
- **Screen reader:** Proper heading hierarchy (h1 → h2 → h3)

### SEO
- **Meta title:** "LeadFlow AI — AI Lead Response for Real Estate Agents"
- **Meta description:** "Never lose another lead. LeadFlow AI responds to your real estate leads in under 30 seconds, 24/7. Integrated with Follow Up Boss."
- **Open Graph:** Image, title, description for social sharing
- **Canonical URL:** Set to root
- **Schema.org:** LocalBusiness or SoftwareApplication markup

### Analytics & Tracking
- **Google Analytics 4:** Page views, scroll depth, outbound clicks
- **Conversion events:**
  - `landing_cta_click` — Hero CTA clicked
  - `pricing_cta_click` — Pricing tier CTA clicked
  - `scroll_to_pricing` — User scrolled to pricing section
  - `scroll_to_features` — User scrolled to features section
- **UTM parameters:** Preserve through signup flow

---

## 5. Design Requirements

### Color Palette
| Role | Color | Hex |
|------|-------|-----|
| Primary | Indigo | #6366f1 |
| Primary Hover | Indigo 600 | #4f46e5 |
| Secondary | Emerald | #10b981 |
| Background | White | #ffffff |
| Background Alt | Slate 50 | #f8fafc |
| Text Primary | Slate 900 | #0f172a |
| Text Secondary | Slate 600 | #475569 |
| Text Muted | Slate 400 | #94a3b8 |

### Typography
- **Font Family:** Inter (Google Fonts) or system-ui fallback
- **Hero Headline:** 48-56px desktop, 36px mobile, font-weight 800
- **Section Headlines:** 36-40px desktop, 28px mobile, font-weight 700
- **Body:** 16-18px, line-height 1.6
- **Stats Numbers:** 48px, font-weight 700

### Spacing
- **Section padding:** 96px desktop, 64px mobile
- **Container max-width:** 1200px
- **Grid gap:** 32px
- **Component padding:** 24px

### Components
- **Buttons:** Rounded-lg (8px), padding 16px 32px, font-weight 600
- **Cards:** Rounded-xl (12px), border slate-200, shadow-sm
- **Icons:** Lucide React icons, 24px default

---

## 6. Technical Requirements

### Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** Lucide React
- **Animation:** Framer Motion (optional, for scroll reveals)

### File Structure
```
app/
├── page.tsx                    # New marketing landing page
├── layout.tsx                  # Root layout (update meta tags)
├── globals.css                 # Global styles
├── sections/
│   ├── Hero.tsx               # Hero section component
│   ├── StatsBar.tsx           # Stats bar component
│   ├── ProblemSection.tsx     # Problem agitation
│   ├── HowItWorks.tsx         # Solution explanation
│   ├── FeaturesGrid.tsx       # Features grid
│   ├── PricingSection.tsx     # Pricing cards
│   ├── FinalCTA.tsx           # Bottom CTA
│   └── Navigation.tsx         # Fixed nav
└── components/
    ├── PricingCard.tsx        # Individual pricing card
    ├── FeatureCard.tsx        # Individual feature card
    └── StepCard.tsx           # How it works step
```

### Existing Code Handling
- **Current `page.tsx`:** Rename to `page-old.tsx` or move content to `/dev` route for internal testing
- **Test webhook button:** Remove from public landing (keep for internal use)
- **API documentation table:** Remove entirely (belongs in docs, not marketing)

### External Integrations
- **Google Analytics 4:** gtag.js or @next/third-parties/google
- **Vercel Analytics:** Optional, for Web Vitals

---

## 7. Acceptance Criteria

### Content
- [ ] All 9 sections implemented (Hero, Stats, Problem, How It Works, Features, Pricing, Final CTA, Nav, Footer)
- [ ] No API documentation or technical jargon visible
- [ ] All CTAs link to `/onboarding` (or mailto for Team tier)
- [ ] Pricing shows all 3 tiers with correct prices ($49/$149/$399)
- [ ] "14-day free trial" mentioned at least 3 times

### Functionality
- [ ] All internal links work (navigation smooth scroll)
- [ ] Mobile hamburger menu opens/closes
- [ ] CTA buttons track events for analytics
- [ ] Page loads without JavaScript errors

### Design
- [ ] Responsive on all breakpoints (320px - 1440px+)
- [ ] Visual hierarchy clear (headlines, body, CTAs)
- [ ] Color contrast meets WCAG AA
- [ ] Consistent spacing and alignment

### Performance
- [ ] Lighthouse Performance score ≥ 90
- [ ] First Contentful Paint < 1.5s
- [ ] No layout shift on load

### SEO
- [ ] Meta title and description set
- [ ] Open Graph tags present
- [ ] Semantic HTML (proper heading hierarchy)
- [ ] Alt text on all images

---

## 8. E2E Test Specs

### E2E-LP-001: Page Load and Visual Check
**Given** a visitor navigates to the landing page  
**When** the page loads  
**Then** all 9 sections are visible  
**And** no API documentation is displayed  
**And** page load time is <2 seconds

**Test Steps:**
1. Navigate to `/`
2. Verify Hero section with headline "Never Lose Another Lead"
3. Verify Stats bar with "<30s", "78%", "35%", "24/7"
4. Verify Problem section with 3 cards
5. Verify How It Works section with 4 steps
6. Verify Features grid with 4 features
7. Verify Pricing section with 3 tiers
8. Verify Final CTA section
9. Verify Navigation and Footer
10. Confirm NO API endpoint tables visible

### E2E-LP-002: Hero CTA Navigation
**Given** a visitor is on the landing page  
**When** they click "Start Free 14-Day Trial" in the hero  
**Then** they are navigated to `/onboarding`  
**And** analytics event `landing_cta_click` fires

### E2E-LP-003: Pricing CTA Navigation
**Given** a visitor views the pricing section  
**When** they click "Start Free Trial" on the Pro tier  
**Then** they are navigated to `/onboarding`  
**And** analytics event `pricing_cta_click` fires with tier="pro"

### E2E-LP-004: Mobile Responsive
**Given** a visitor on iPhone 14 Pro (393x852)  
**When** they view the landing page  
**Then** all sections stack vertically  
**And** hamburger menu is visible  
**And** CTAs are full-width and easily tappable

### E2E-LP-005: Navigation Smooth Scroll
**Given** a visitor is on the landing page  
**When** they click "Pricing" in the navigation  
**Then** the page smoothly scrolls to the Pricing section  
**And** the URL updates to `/#pricing`

### E2E-LP-006: Analytics Events
**Given** a visitor interacts with the landing page  
**When** they perform tracked actions  
**Then** the following events fire to GA4:
- `page_view` on load
- `landing_cta_click` on hero CTA
- `scroll_to_pricing` when pricing section enters viewport
- `pricing_cta_click` on pricing tier selection

---

## 9. Workflow Handoff

| Step | Team | Deliverable | Status |
|------|------|-------------|--------|
| 1 | **PM** (this PRD) | Requirements, user stories, acceptance criteria | ✅ Complete |
| 2 | **Marketing** | Copy refinement, value prop validation | ⏳ Ready |
| 3 | **Design** | Figma mockups, mobile/desktop designs | ⏳ Ready |
| 4 | **Dev** | Next.js implementation, component build | ⏳ Ready |
| 5 | **QC** | E2E tests, Lighthouse audit, cross-browser | ⏳ Ready |

### Dependencies
- **None blocking** — can implement with placeholder copy/images
- **Nice to have:** Real pilot agent testimonials (replace placeholder)
- **Nice to have:** Custom illustration/hero image (can use stock initially)

### Success Validation
After deployment, monitor for 1 week:
- Landing page conversion rate (target: 10%+)
- Scroll depth (target: 60%+ reach pricing)
- CTA click rate (target: 15%+ of visitors)
- Bounce rate (target: <40%)

---

## 10. Related Documents

- **Original PRD:** `docs/PRD-LANDING-PAGE.md` (v1.0 — developer-focused, superseded)
- **PMF Strategy:** `PMF.md` — ICP definition, pricing strategy
- **Use Cases:** `USE_CASES.md` — Product feature context
- **Design System:** `components/ui/` — shadcn/ui components

---

## 11. Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-02 | Initial developer-focused landing page PRD | PM |
| 2.0 | 2026-03-06 | Complete rewrite for marketing landing page; removed API docs, added conversion focus | PM |
