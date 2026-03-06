# PRD: Marketing Landing Page — High-Converting Signup Flow

**Document ID:** PRD-LANDING-MARKETING-001  
**Version:** 1.0  
**Date:** March 6, 2026  
**Status:** Ready for Implementation  
**Related Use Case:** UC-LANDING-MARKETING-001  

---

## 1. Overview

### Purpose
Transform the root route (/) from a developer-focused API docs page into a high-converting marketing landing page that drives trial signups for real estate agents.

### Current State
The landing page at `app/page.tsx` displays:
- Developer-focused "API Endpoints" table
- "Test Webhook" button (internal tool)
- Minimal value proposition
- No pricing information
- No social proof
- Basic feature cards without benefit context

**Critical Gap:** The current page blocks all prospect traffic — agents visiting the site see API documentation instead of a compelling product story.

### Target Audience
- **Primary:** Solo real estate agents (12-24 transactions/year, $500-1,500/mo tool budget)
- **Secondary:** Small teams (2-5 agents, team leader decision maker)

### Success Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Visitor-to-Signup Conversion | 10%+ | 0% (no signup flow) |
| Bounce Rate | <40% | Unknown |
| Time on Page | 2+ min | Unknown |
| CTA Click-Through Rate | 15%+ | N/A |

---

## 2. User Stories

### US-1: Agent Discovers LeadFlow
**As a** real estate agent searching for lead response solutions  
**I want to** immediately understand what LeadFlow AI does and why it matters  
**So that** I can decide if it's worth exploring further

**Acceptance Criteria:**
- Value proposition visible above the fold within 2 seconds
- Key benefit (<30s response) prominent in headline
- Stats that resonate (78% to first responder, 35% never responded to)
- Clear indication this is for real estate agents specifically
- No technical jargon or API references

### US-2: Agent Evaluates Fit
**As a** price-conscious agent comparing solutions  
**I want to** see transparent pricing and what's included  
**So that** I can evaluate budget fit without friction

**Acceptance Criteria:**
- Pricing section visible within one scroll
- All 4 tiers displayed: Starter ($49), Pro ($149), Team ($399), Brokerage ($999+)
- "Most Popular" badge on Pro tier
- Clear feature comparison between tiers
- No "Contact Sales" gatekeeping — all prices visible

### US-3: Agent Builds Trust
**As a** skeptical agent who has been burned by tools before  
**I want to** see proof that this works  
**So that** I feel confident trying it

**Acceptance Criteria:**
- At least 2 testimonials from real agents (can be pilot participants)
- Stats with credible sources (industry research)
- Trust badges: TCPA compliant, FUB integration, etc.
- Risk reversal: free trial, cancel anytime, no credit card

### US-4: Agent Takes Action
**As a** ready-to-try agent  
**I want to** sign up quickly with minimal friction  
**So that** I can start using it immediately

**Acceptance Criteria:**
- Primary CTA visible in hero section
- Form requires 4 fields max (Name, Email, Phone, Brokerage optional)
- 14-day free trial clearly stated
- "No credit card required" prominently displayed
- Success state confirms next steps

---

## 3. Functional Requirements

### FR-1: Hero Section (P0)
**Purpose:** Capture attention and communicate value in 5 seconds

**Requirements:**
- **Headline:** "Never Lose Another Lead to Slow Response"
- **Subheadline:** "LeadFlow AI responds to your real estate leads in under 30 seconds—while you're showing houses, with family, or asleep. Our AI qualifies prospects via SMS and books appointments automatically, 24/7."
- **Primary CTA:** "Start Free 14-Day Trial" → links to /signup
- **Secondary CTA:** "See How It Works" → smooth scroll to features section
- **Trust Bar (below fold):**
  - "✓ No credit card required"
  - "✓ Works with Follow Up Boss"
  - "✓ Cancel anytime"
  - "✓ TCPA Compliant"
- **Integration Logos:** FUB, Cal.com, Twilio badges

**Design Notes:**
- Full viewport height on desktop (100vh)
- Dark gradient background (slate-900) with subtle pattern
- Large typography: 48-56px headline desktop, 32-36px mobile
- CTA button: emerald-500 (#10b981), high contrast

### FR-2: Stats Bar (P0)
**Purpose:** Establish credibility with hard numbers

**Requirements:**
- 4 stat cards in horizontal row (2x2 grid on mobile)
- Stats:
  1. "<30s" — "Average Response Time"
  2. "78%" — "Deals Go to First Responder"
  3. "35%" — "Leads Never Get a Response"
  4. "24/7" — "Always-On Coverage"
- Source citation: "Source: MIT Lead Response Study, NAR Research"

**Design Notes:**
- Background: white or slate-50
- Large numbers: 48px font, indigo-600 color
- Labels: 14px, slate-600
- Subtle dividers between stats on desktop

### FR-3: Problem Section (P0)
**Purpose:** Agitate the pain point agents feel daily

**Requirements:**
- Section headline: "You're Losing 50% of Your Leads Before You Even See Them"
- 3 problem cards with icons:
  1. **"Leads Go Cold"** — "Research shows leads go cold in 5 minutes. By the time you finish your showing and call back, they've moved on."
  2. **"No Time to Follow Up"** — "You're in back-to-back showings while leads pile up. Your voicemail fills up. Opportunities slip away."
  3. **"Money Down the Drain"** — "You're paying for Zillow leads, but half never hear back. Every missed lead is thousands in lost commission."
- Supporting copy: "Every missed lead is thousands of dollars in commission walking out the door."

**Design Notes:**
- Background: light gradient or subtle pattern
- Cards with icons (use Lucide: Clock, PhoneOff, DollarSign)
- Red/orange accent color for pain points

### FR-4: Solution Section (P0)
**Purpose:** Present LeadFlow as the solution to the problems

**Requirements:**
- Section headline: "AI That Responds Like You Would—Only Faster"
- 4 feature cards with benefit-focused copy:
  1. **"⚡ Instant Response (< 30 seconds)"** — "Every lead gets an immediate text, even at 2 AM. No more 'I'll call them back later' that turns into never."
  2. **"🤖 Natural AI Conversations"** — "Our AI qualifies leads naturally—asking about budget, timeline, and what they're looking for. It feels human because it's trained on real estate conversations."
  3. **"📱 SMS-First (Where Your Leads Are)"** — "94% of text messages are read within 3 minutes. Email sits unread. Calls go to voicemail. SMS gets the conversation started immediately."
  4. **"📅 Automatic Appointment Booking"** — "Qualified leads can book directly on your Cal.com calendar. No back-and-forth. No phone tag."

**Design Notes:**
- Grid layout: 2x2 on desktop, 1 column on mobile
- Feature icons: 48px, indigo-600
- Cards with subtle shadow and hover lift effect

### FR-5: Social Proof Section (P0)
**Purpose:** Build trust through testimonials and results

**Requirements:**
- Section headline: "Agents Are Converting More Leads with AI Response"
- Stats row (same as FR-2 but with conversion focus):
  - "21x" — "More likely to convert when responded to within 5 minutes vs 30 minutes"
  - "40%" — "Increase in qualified appointments for pilot agents"
  - "98%" — "SMS open rate vs 20% email"
- **2-3 Testimonial Cards:**
  - Quote text
  - Agent name, role, location
  - Optional: small headshot placeholder
  - Example: "I used to lose at least 2-3 leads a week because I couldn't respond fast enough. Since using LeadFlow AI, every lead gets an immediate response." — Sarah M., Independent Agent, Austin TX
- **Logo Bar:** "Trusted by agents from:" eXp Realty, Keller Williams, RE/MAX, Compass logos (can be text badges initially)

**Design Notes:**
- Background: slate-50 or subtle gradient
- Testimonial cards with quote marks decoration
- Star rating display (5 stars visual)

### FR-6: How It Works Section (P0)
**Purpose:** Show simplicity and reduce perceived complexity

**Requirements:**
- Section headline: "Set It Up in 5 Minutes. Let AI Handle the Rest."
- 3-step process with numbers:
  1. **"Connect Your Lead Sources"** — "Link LeadFlow AI to your Follow Up Boss account. New leads automatically flow into our system—no manual data entry."
  2. **"AI Responds & Qualifies"** — "When a lead comes in, our AI sends an immediate SMS introduction, qualifies their needs, and answers common questions naturally."
  3. **"You Close the Deal"** — "Qualified leads book appointments directly on your calendar. Hot leads are flagged for immediate follow-up. You step in at the perfect moment."
- Visual: Simple icons or illustrations for each step

**Design Notes:**
- Horizontal layout with connecting line on desktop
- Vertical stack on mobile
- Step numbers: large circles with indigo background

### FR-7: Pricing Section (P0)
**Purpose:** Drive conversion with clear, transparent pricing

**Requirements:**
- Section headline: "Simple Pricing. No Hidden Fees."
- **4 Pricing Cards:**

| Tier | Price | Features | CTA |
|------|-------|----------|-----|
| **Starter** | $49/mo | 100 SMS/mo, Basic AI, Dashboard, FUB Integration | "Get Started" |
| **Pro** ⭐ | $149/mo | Unlimited SMS, Full AI, Cal.com Booking, Analytics | "Start Free Trial" |
| **Team** | $399/mo | 5 agents, Team Dashboard, Lead Routing, Priority Support | "Contact Sales" |
| **Brokerage** | $999+/mo | White-label, Admin Dashboard, Compliance Reporting | "Contact Sales" |

- "Most Popular" badge on Pro tier
- "Pro" tier highlighted (subtle border or background)
- All CTAs link to /signup with plan pre-selected (query param: ?plan=pro)
- Footer text: "All plans include TCPA compliance, 14-day free trial, cancel anytime."

**Design Notes:**
- Cards equal height
- Pro card slightly elevated (shadow, border)
- Price: large bold text, "/mo" smaller
- Feature lists with checkmarks

### FR-8: FAQ Section (P1)
**Purpose:** Address objections and reduce support burden

**Requirements:**
- Section headline: "Frequently Asked Questions"
- 6-8 accordion items:
  1. **"Will this sound like a robot?"** — "No. LeadFlow AI is trained specifically on real estate conversations. Most leads don't realize they're talking to AI."
  2. **"What if a lead asks something the AI can't answer?"** — "The AI handles 90%+ of common questions. For complex situations, it escalates to you with a conversation summary."
  3. **"Is this TCPA compliant?"** — "Yes. Built-in opt-out handling, consent tracking, quiet hours (9 PM - 8 AM), and message logging for compliance."
  4. **"Do I need to be technical to set this up?"** — "Not at all. Setup takes about 5 minutes—just connect your FUB account and Cal.com calendar."
  5. **"What happens after the trial?"** — "Choose to continue as a paying customer or cancel with no penalties. No auto-billing surprises."
  6. **"Can I customize the AI's responses?"** — "During the pilot, we use proven templates. Post-pilot, you'll be able to customize tone and qualifying questions."
  7. **"What CRMs do you integrate with?"** — "Currently Follow Up Boss (FUB). Expanding based on agent feedback."

**Design Notes:**
- Accordion pattern (expand/collapse)
- Clean, minimal design
- Full-width items on mobile

### FR-9: Final CTA Section (P0)
**Purpose:** Capture visitors who scrolled to the bottom

**Requirements:**
- Section headline: "Stop Losing Leads. Start Converting More."
- Subheadline: "Join agents already using LeadFlow AI to respond faster and book more appointments."
- Primary CTA: "Start Free 14-Day Trial" → /signup
- Supporting text: "No credit card required. Cancel anytime."
- Urgency element (optional): "Limited pilot spots available"

**Design Notes:**
- Dark background (slate-900) matching hero
- Large CTA button, centered
- High contrast for visibility

### FR-10: Navigation (P1)
**Purpose:** Allow easy navigation without distracting from conversion

**Requirements:**
- Fixed position on scroll
- Logo (left): "LeadFlow AI"
- Nav links (center): Features, Pricing, How It Works, FAQ
- CTA (right): "Start Free Trial" → /signup
- Mobile: hamburger menu with same links

**Design Notes:**
- Background: white with subtle shadow on scroll
- Height: 64px
- Logo: indigo-600 text
- CTA button: emerald-500, small size

### FR-11: Footer (P1)
**Purpose:** Required links and compliance

**Requirements:**
- Copyright: "© 2026 LeadFlow AI. All rights reserved."
- Links: Privacy Policy, Terms of Service, TCPA Compliance
- Optional: Social links (LinkedIn, Twitter)
- Disclaimer: "Results may vary. LeadFlow AI improves response times but does not guarantee specific conversion rates."

**Design Notes:**
- Background: slate-50 or slate-100
- Small text, muted colors
- Single row on desktop, stacked on mobile

---

## 4. Non-Functional Requirements

### Performance
- **Page Load Time:** <2 seconds (Lighthouse performance score 90+)
- **First Contentful Paint:** <1.5s
- **Time to Interactive:** <3.5s
- **Bundle Size:** <200KB initial JS

### Responsive
- **Mobile-first design**
- **Breakpoints:**
  - Mobile: 320px - 639px
  - Tablet: 640px - 1023px
  - Desktop: 1024px+
- **Touch targets:** Minimum 44x44px for all interactive elements

### Accessibility
- **WCAG 2.1 AA compliance**
- **Contrast ratio:** 4.5:1 minimum for text
- **Focus indicators:** Visible focus states for keyboard navigation
- **Alt text:** All images have descriptive alt text
- **Semantic HTML:** Proper heading hierarchy (h1 → h2 → h3)
- **ARIA labels:** For interactive elements without visible text

### SEO
- **Meta title:** "LeadFlow AI - AI Lead Response for Real Estate Agents | 24/7 SMS Follow-Up"
- **Meta description:** "Stop losing leads to slow response times. LeadFlow AI texts your real estate leads within 30 seconds, 24/7. Works with Follow Up Boss. 14-day free trial."
- **Open Graph tags:** For social sharing
- **Canonical URL:** Set to root
- **Structured data:** Organization schema, Product schema

### Analytics
- **Google Analytics 4:** Page views, scroll depth, CTA clicks
- **Conversion tracking:** Signup button clicks, form submissions
- **UTM parameter support:** Preserve UTM params through signup flow
- **Event tracking:**
  - `hero_cta_click`
  - `pricing_cta_click`
  - `scroll_depth_25`, `scroll_depth_50`, `scroll_depth_75`, `scroll_depth_100`
  - `faq_expand`

---

## 5. Design System

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#6366f1` (Indigo 500) | Headlines, links, accents |
| `--color-primary-dark` | `#4f46e5` (Indigo 600) | Hover states |
| `--color-cta` | `#10b981` (Emerald 500) | Primary buttons |
| `--color-cta-hover` | `#059669` (Emerald 600) | Button hover |
| `--color-background` | `#ffffff` | Main background |
| `--color-background-alt` | `#f9fafb` (Slate 50) | Alternate sections |
| `--color-background-dark` | `#0f172a` (Slate 900) | Hero, CTA sections |
| `--color-text-primary` | `#111827` (Slate 900) | Body text |
| `--color-text-secondary` | `#6b7280` (Slate 500) | Subtext, captions |
| `--color-text-light` | `#f9fafb` (Slate 50) | Text on dark backgrounds |
| `--color-border` | `#e5e7eb` (Slate 200) | Card borders, dividers |

### Typography
- **Font Family:** Inter (Google Fonts) or system-ui fallback
- **Headlines:**
  - H1: 48-56px desktop, 32-36px mobile, font-weight 800
  - H2: 36-40px desktop, 28-32px mobile, font-weight 700
  - H3: 24-28px desktop, 20-24px mobile, font-weight 600
- **Body:** 16-18px, line-height 1.6, font-weight 400
- **Small/Caption:** 14px, line-height 1.5

### Spacing
- **Section padding:** 80px desktop, 48px mobile
- **Container max-width:** 1200px (centered)
- **Container padding:** 16px mobile, 24px tablet, 32px desktop
- **Grid gap:** 32px desktop, 24px mobile
- **Component spacing:** 16px, 24px, 32px scale

### Components

#### Buttons
**Primary CTA:**
- Background: emerald-500
- Text: white, 16px, font-weight 600
- Padding: 16px 32px
- Border-radius: 8px
- Hover: emerald-600, subtle shadow

**Secondary CTA:**
- Background: transparent
- Border: 2px solid currentColor
- Text: inherit from context
- Padding: 14px 30px

**Ghost/Link:**
- Background: transparent
- Text: indigo-600
- Hover: underline

#### Cards
- Background: white
- Border: 1px solid slate-200
- Border-radius: 12px
- Padding: 24px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Hover: translateY(-4px), shadow increase

---

## 6. Technical Requirements

### Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (existing setup)
- **UI Components:** shadcn/ui (existing)
- **Icons:** Lucide React
- **Animations:** Framer Motion (optional, for scroll reveals)

### File Structure
```
app/
├── page.tsx                    # Main landing page (replaces current)
├── layout.tsx                  # Root layout (update metadata)
├── globals.css                 # Global styles (if needed)
├── sections/
│   ├── Hero.tsx               # Hero section component
│   ├── Stats.tsx              # Stats bar
│   ├── Problem.tsx            # Problem agitation
│   ├── Solution.tsx           # Features/Solution
│   ├── SocialProof.tsx        # Testimonials
│   ├── HowItWorks.tsx         # 3-step process
│   ├── Pricing.tsx            # Pricing cards
│   ├── FAQ.tsx                # FAQ accordion
│   ├── FinalCTA.tsx           # Bottom CTA
│   └── Navigation.tsx         # Fixed nav
├── components/
│   ├── Button.tsx             # CTA button variants
│   ├── Card.tsx               # Feature/pricing cards
│   └── Container.tsx          # Max-width wrapper
```

### Dependencies
```json
{
  "lucide-react": "^0.x",      // Already installed
  "framer-motion": "^11.x",    // Optional, for animations
  "@radix-ui/react-accordion": "^1.x"  // For FAQ (shadcn)
}
```

### Key Implementation Notes
1. **Server Component:** Make page.tsx a Server Component for SEO
2. **Client Components:** Only interactivity (accordion, mobile nav) needs "use client"
3. **Images:** Use Next.js Image component with proper sizing
4. **Analytics:** Inject GA4 script in layout.tsx
5. **Forms:** Link CTAs to /signup with query params for plan selection

---

## 7. E2E Test Specifications

### E2E-1: Page Load & SEO
**Given** a visitor navigates to the landing page  
**When** the page loads  
**Then** all sections render correctly  
**And** page load time is <2 seconds  
**And** meta title and description are present  
**And** no console errors appear

**Test Steps:**
1. Navigate to /
2. Verify hero headline visible
3. Check Lighthouse performance score ≥90
4. Verify meta title contains "LeadFlow AI"
5. Check no 404s in network tab

### E2E-2: Hero CTA Navigation
**Given** a visitor is on the landing page  
**When** they click "Start Free 14-Day Trial" in hero  
**Then** they navigate to /signup  
**And** UTM parameters are preserved (if present)

**Test Steps:**
1. Load /?utm_source=test&utm_campaign=landing
2. Click hero CTA
3. Verify URL is /signup?utm_source=test&utm_campaign=landing

### E2E-3: Pricing CTA with Plan Selection
**Given** a visitor views the pricing section  
**When** they click "Start Free Trial" on Pro tier  
**Then** they navigate to /signup?plan=pro

**Test Steps:**
1. Scroll to pricing section
2. Click Pro tier CTA
3. Verify URL contains plan=pro
4. Verify signup page highlights Pro plan

### E2E-4: Smooth Scroll Navigation
**Given** a visitor is on the landing page  
**When** they click "See How It Works" or nav links  
**Then** page smoothly scrolls to corresponding section  
**And** section is visible in viewport

**Test Steps:**
1. Click "See How It Works"
2. Verify Solution section in viewport
3. Click "Pricing" in nav
4. Verify Pricing section in viewport

### E2E-5: FAQ Accordion
**Given** a visitor views the FAQ section  
**When** they click a question  
**Then** answer expands  
**And** clicking again collapses it

**Test Steps:**
1. Scroll to FAQ
2. Click first question
3. Verify answer text visible
4. Click again
5. Verify answer hidden

### E2E-6: Responsive Design
**Given** a visitor on mobile device (375px width)  
**When** they view the landing page  
**Then** all sections stack vertically  
**And** CTAs are easily tappable (min 44px height)  
**And** text is readable without zooming

**Test Steps:**
1. Set viewport to 375x667
2. Verify hero headline fits without overflow
3. Verify pricing cards stack vertically
4. Check all buttons have min-height 44px

### E2E-7: Mobile Navigation
**Given** a visitor on mobile device  
**When** they click the hamburger menu  
**Then** navigation menu opens  
**And** clicking a link closes menu and navigates

**Test Steps:**
1. Set viewport to mobile
2. Click hamburger icon
3. Verify menu visible
4. Click "Pricing"
5. Verify menu closed and page scrolled to pricing

### E2E-8: Analytics Events
**Given** a visitor interacts with the page  
**When** they click CTAs and scroll  
**Then** analytics events fire correctly

**Test Steps:**
1. Open page with GA4 debug
2. Click hero CTA
3. Verify 'hero_cta_click' event fired
4. Scroll to 50% depth
5. Verify 'scroll_depth_50' event fired

---

## 8. Content Checklist

### Copy (from Marketing)
- [ ] Hero headline and subheadline
- [ ] All section headlines
- [ ] Feature card copy (4 cards)
- [ ] Problem card copy (3 cards)
- [ ] Testimonials (2-3 quotes with names)
- [ ] FAQ questions and answers (7 items)
- [ ] Pricing tier descriptions
- [ ] CTA button text
- [ ] Footer links and disclaimers

### Assets (from Design)
- [ ] Hero background (gradient/pattern)
- [ ] Feature icons (or Lucide icons)
- [ ] Testimonial headshots (optional)
- [ ] Integration logos (FUB, Cal.com, Twilio)
- [ ] Brokerage logos (eXp, KW, RE/MAX, Compass)

---

## 9. Workflow Handoff

| Step | Team | Deliverable | Status |
|------|------|-------------|--------|
| 1 | PM (this PRD) | Requirements, user stories, acceptance criteria | ✅ Complete |
| 2 | Marketing | Final copy, testimonials, SEO meta | ⏳ Ready |
| 3 | Design | Figma mockups, mobile + desktop | ⏳ Ready |
| 4 | Dev | Implementation in Next.js | ⏳ Ready |
| 5 | QC | E2E tests, performance validation | ⏳ Ready |

### Handoff Notes for Design
- Mobile-first approach critical (agents browse on phones)
- Hero must be visually striking — this is the first impression
- Pro tier pricing card should stand out subtly
- Trust signals (badges, testimonials) need prominence
- Loading state: skeleton or spinner for any async content

### Handoff Notes for Dev
- Keep bundle size minimal — agents may have slow connections
- Use existing shadcn/ui components where possible
- Preserve existing /signup, /login routes — only update /
- Ensure analytics events fire before navigation
- Test on actual mobile devices, not just emulator

---

## 10. Success Validation

### Pre-Launch Checklist
- [ ] All 11 sections implemented
- [ ] Responsive on 320px, 768px, 1024px+ viewports
- [ ] Lighthouse score: Performance 90+, Accessibility 95+, SEO 100
- [ ] All CTAs link to /signup with proper params
- [ ] Analytics events verified in GA4 debug
- [ ] No console errors
- [ ] Cross-browser tested (Chrome, Safari, Firefox)
- [ ] Copy proofread, no typos
- [ ] Testimonials have proper attribution

### Post-Launch Monitoring
- [ ] Conversion rate tracked daily
- [ ] Bounce rate monitored
- [ ] Page load times from RUM (Real User Monitoring)
- [ ] CTA click-through rates by section
- [ ] Scroll depth analytics

---

## Appendix A: Current vs Proposed

| Element | Current (Developer) | Proposed (Marketing) |
|---------|--------------------|---------------------|
| Headline | "AI-Powered Lead Response" | "Never Lose Another Lead to Slow Response" |
| Subheadline | Technical description | Benefit-focused with pain point |
| Primary CTA | "Get Started Free" | "Start Free 14-Day Trial" |
| Secondary CTA | "Sign In" | "See How It Works" |
| Content | API endpoints table | Value props, features, pricing |
| Target | Developers evaluating API | Real estate agents evaluating tool |
| Trust | None | Testimonials, stats, compliance badges |

---

*Document Version: 1.0*  
*Last Updated: March 6, 2026*  
*Author: Product Manager*  
*Next Review: Post-launch (1 week)*
