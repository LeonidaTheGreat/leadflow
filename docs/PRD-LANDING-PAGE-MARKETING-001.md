# PRD: Marketing Landing Page — High-Converting Signup Flow

**Document ID:** PRD-LANDING-PAGE-MARKETING-001  
**Version:** 2.0  
**Date:** March 6, 2026  
**Status:** Ready for Implementation  
**Use Case:** UC-LANDING-MARKETING-001  
**Priority:** P0 (Critical - Blocking All Prospect Traffic)

---

## 1. Executive Summary

### Problem
The current root route (`/`) displays a developer-focused API documentation page with webhook testing tools and endpoint tables. This is **actively blocking all prospect traffic** — real estate agents landing on the page see technical jargon instead of a compelling value proposition.

### Solution
Transform the root route into a high-converting marketing landing page that:
- Communicates clear value proposition in <3 seconds
- Drives trial signups with frictionless CTAs
- Establishes trust through social proof and transparency
- Optimizes for conversion at every scroll depth

### Success Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Conversion Rate (Visit → Signup) | 10%+ | 0% (no signup flow) |
| Bounce Rate | <40% | ~70% (estimated) |
| Time on Page | 2+ min | <30s (estimated) |
| Signup Completion Rate | 60%+ | N/A |

### Revenue Impact
**Critical Path to $20K MRR.** Without a functioning landing page, no prospects can discover or sign up for the product. This is a **hard blocker** for all customer acquisition.

---

## 2. User Stories

### US-1: Agent Discovers LeadFlow
**As a** solo real estate agent searching for lead response solutions  
**I want to** immediately understand what LeadFlow AI does  
**So that** I can determine if it solves my problem

**Acceptance Criteria:**
- Value proposition visible above the fold without scrolling
- Headline clearly states the benefit (<30s response time)
- No technical jargon or API references
- Visual hierarchy guides eye to primary CTA

### US-2: Agent Evaluates Fit
**As a** busy agent comparing solutions  
**I want to** see pricing and features quickly  
**So that** I can evaluate budget and capability fit

**Acceptance Criteria:**
- Pricing visible within 2 scrolls
- Clear feature differentiation between tiers
- "Most Popular" indicator on recommended tier
- No hidden fees or surprises

### US-3: Agent Signs Up
**As a** convinced agent ready to try  
**I want to** start my trial with minimal friction  
**So that** I can experience the product immediately

**Acceptance Criteria:**
- CTA visible at multiple scroll depths
- Form requires ≤4 fields
- 14-day free trial prominently stated
- No credit card required message visible
- Clear path from CTA to onboarding

### US-4: Mobile Agent Browsing
**As a** agent browsing on my phone between showings  
**I want to** easily navigate and sign up on mobile  
**So that** I don't need to return to desktop

**Acceptance Criteria:**
- All content readable without zooming on 320px+ screens
- CTAs easily tappable (min 44px touch targets)
- Form fields use appropriate mobile keyboards
- No horizontal scrolling required

---

## 3. Functional Requirements

### FR-1: Navigation (Fixed Header)
**Priority:** P0

| Element | Specification |
|---------|---------------|
| Logo | LeadFlow AI wordmark, left-aligned |
| Links | Features, Pricing, How It Works (anchor scroll) |
| CTA | "Start Free Trial" button (primary) |
| Behavior | Fixed position on scroll, subtle shadow on scroll |
| Mobile | Hamburger menu with sheet overlay |

**Interactions:**
- Smooth scroll to anchor sections
- CTA scrolls to signup section
- Logo scrolls to top

### FR-2: Hero Section
**Priority:** P0

| Element | Specification |
|---------|---------------|
| Headline | "Your AI Assistant That Responds to Leads in Under 30 Seconds" |
| Subheadline | "Never lose another lead to slow response times. LeadFlow AI instantly qualifies and engages your real estate leads via SMS — 24/7, even while you sleep." |
| Primary CTA | "Start Free 14-Day Trial" → scrolls to signup |
| Secondary CTA | "See How It Works" → scrolls to How It Works section |
| Badge | "🚀 Now in Pilot — Limited Spots Available" |
| Trust Bar | "✓ No Credit Card Required ✓ Cancel Anytime ✓ Setup in 5 Minutes" |
| Visual | Abstract illustration or gradient background (not API docs) |

**Design Notes:**
- Headline: 48-52px desktop, 32-36px mobile
- Max-width on text: 700px for readability
- CTA buttons: min 48px height, prominent contrast

### FR-3: Stats Bar (Social Proof)
**Priority:** P0

4-column layout with key metrics:

| Stat | Label |
|------|-------|
| <30s | Average Response Time |
| 78% | Deals Go to First Responder |
| 35% | Leads Never Get a Response |
| 24/7 | Always-On Coverage |

**Design Notes:**
- Large numbers (48-64px)
- Small labels below
- Background: subtle contrast from hero
- Source citation: "Industry research 2024"

### FR-4: Problem Section (Pain Agitation)
**Priority:** P0

3-card grid highlighting pain points:

**Card 1: Leads Go Cold**
- Icon: 🧊
- Headline: "Leads Go Cold in Minutes"
- Body: "The average agent takes 42 minutes to respond. By then, your lead has already contacted 3 competitors."

**Card 2: No Time to Follow Up**
- Icon: ⏰
- Headline: "You're Too Busy to Follow Up"
- Body: "Showings, closings, paperwork — you can't be glued to your phone. But leads expect instant responses."

**Card 3: Money Down the Drain**
- Icon: 💸
- Headline: "Money Down the Drain"
- Body: "You spend $500-2,000/month on Zillow and Facebook leads. 35% never get a response. That's wasted ad spend."

### FR-5: How It Works Section
**Priority:** P0

4-step horizontal process (vertical on mobile):

| Step | Title | Description |
|------|-------|-------------|
| 1 | Connect | Link your Follow Up Boss CRM in 2 minutes |
| 2 | Configure | Set your availability and booking preferences |
| 3 | Respond | AI instantly engages leads via SMS |
| 4 | Book | Qualified leads book appointments automatically |

**Visual:** Numbered circles with connecting line

### FR-6: Features Grid
**Priority:** P0

4 feature cards in 2x2 grid:

**Card 1: Instant Response Agent**
- Icon: ⚡
- Title: "Instant Response Agent"
- Description: "AI replies to leads within 30 seconds, 24/7. Never miss an opportunity, even at 2 AM."

**Card 2: Smart Qualification**
- Icon: 🎯
- Title: "Smart Qualification"
- Description: "Claude AI extracts budget, timeline, and property preferences. You get qualified leads, not tire-kickers."

**Card 3: Auto-Booking**
- Icon: 📅
- Title: "Auto-Booking"
- Description: "Qualified leads book directly into your Cal.com calendar. No phone tag, no back-and-forth."

**Card 4: Follow-Up Sequences**
- Icon: 🔄
- Title: "Follow-Up Sequences"
- Description: "Automated nurture sequences keep leads warm until they're ready. Stops automatically when they respond."

### FR-7: Pricing Section
**Priority:** P0

3-tier pricing cards:

**Starter — $49/month**
- 100 SMS/month
- Basic AI responses
- FUB integration
- Email support
- CTA: "Get Started"

**Pro — $149/month** (Most Popular badge)
- Unlimited SMS
- Full Claude AI qualification
- Cal.com booking
- Priority support
- Analytics dashboard
- CTA: "Start Free Trial"

**Team — $399/month**
- Everything in Pro
- 5 agent seats
- Team lead routing
- Shared calendar
- Admin dashboard
- CTA: "Contact Sales"

**Design Notes:**
- Pro tier visually emphasized (border, shadow, badge)
- Monthly pricing shown (annual option in future)
- "Most Popular" badge on Pro tier
- All CTAs link to /onboarding with plan pre-selected

### FR-8: Final CTA Section
**Priority:** P0

| Element | Specification |
|---------|---------------|
| Headline | "Start Converting More Leads Today" |
| Subheadline | "Join agents who never miss an opportunity. 14-day free trial, no credit card required." |
| Primary CTA | "Start My Free Trial" → /onboarding |
| Trust Signals | "✓ 14-Day Free Trial ✓ No Credit Card ✓ Cancel Anytime ✓ Setup in 5 Minutes" |

### FR-9: Footer
**Priority:** P1

- Copyright: © 2026 LeadFlow AI
- Links: Privacy Policy, Terms of Service
- Social: LinkedIn, Twitter/X (optional)

---

## 4. Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| First Contentful Paint | <1.5s |
| Largest Contentful Paint | <2.5s |
| Time to Interactive | <3.5s |
| Total Page Size | <500KB (excluding images) |
| Lighthouse Performance | ≥90 |

### Responsive Breakpoints
| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | 320-639px | Single column, stacked sections |
| Tablet | 640-1023px | 2-column grids |
| Desktop | 1024px+ | Full layout |

### Accessibility (WCAG 2.1 AA)
- Color contrast: 4.5:1 minimum for text
- Focus indicators: Visible on all interactive elements
- Alt text: All images have descriptive alt text
- ARIA labels: Navigation, buttons, forms
- Keyboard navigation: All functionality accessible via keyboard
- Reduced motion: Respect `prefers-reduced-motion`

### SEO
| Element | Specification |
|---------|---------------|
| Title | LeadFlow AI — AI Lead Response for Real Estate Agents |
| Meta Description | Respond to real estate leads in under 30 seconds with AI. Automated SMS qualification, booking, and follow-up. 14-day free trial. |
| Open Graph | Title, description, image for social sharing |
| Canonical | Self-referencing canonical URL |
| Structured Data | LocalBusiness schema (future) |

### Analytics
| Event | Trigger |
|-------|---------|
| hero_cta_click | Click "Start Free Trial" in hero |
| pricing_cta_click | Click any pricing tier CTA |
| final_cta_click | Click CTA in final section |
| scroll_25 / 50 / 75 / 100 | Scroll depth milestones |
| nav_link_click | Click navigation anchor links |

**Implementation:** Google Analytics 4 + GTM

---

## 5. Design Specifications

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| Primary | #6366f1 (Indigo 500) | CTAs, links, accents |
| Primary Hover | #4f46e5 (Indigo 600) | Button hover states |
| Background | #ffffff | Main background |
| Background Alt | #f9fafb (Gray 50) | Section alternation |
| Text Primary | #111827 (Gray 900) | Headlines, body |
| Text Secondary | #6b7280 (Gray 500) | Subheadings, descriptions |
| Border | #e5e7eb (Gray 200) | Cards, dividers |

### Typography
| Element | Font | Size (Desktop) | Weight |
|---------|------|----------------|--------|
| H1 (Hero) | Inter/System | 48-52px | 700 |
| H2 (Section) | Inter/System | 36-40px | 700 |
| H3 (Card) | Inter/System | 20-24px | 600 |
| Body | Inter/System | 16-18px | 400 |
| Small | Inter/System | 14px | 400 |

### Spacing
| Element | Value |
|---------|-------|
| Section Padding | 80px desktop, 48px mobile |
| Container Max-Width | 1200px |
| Grid Gap | 32px |
| Card Padding | 24px |

---

## 6. Technical Requirements

### Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** Lucide React
- **Animations:** Framer Motion (optional, for scroll reveals)

### File Structure
```
app/
├── page.tsx              # Landing page (this PRD)
├── layout.tsx            # Root layout with metadata
├── globals.css           # Global styles
├── onboarding/           # Existing onboarding flow
├── login/                # Existing login
├── signup/               # Existing signup
└── ...
```

### Dependencies
```json
{
  "framer-motion": "^11.x",
  "lucide-react": "^0.x"
}
```

### Route Behavior
- `/` → Marketing landing page (this PRD)
- `/onboarding` → Existing onboarding wizard
- `/login` → Existing login page
- `/dashboard` → Protected dashboard (existing)

### Redirects
- Authenticated users visiting `/` may see different content (future enhancement)
- For now: `/` shows marketing page to all visitors

---

## 7. E2E Test Specifications

### E2E-1: Page Load Performance
**Given** a visitor navigates to `/`  
**When** the page loads  
**Then** all sections render correctly  
**And** First Contentful Paint occurs within 1.5 seconds  
**And** no console errors are present

**Test Steps:**
1. Navigate to `/`
2. Verify hero section visible
3. Check Lighthouse Performance score ≥90
4. Verify no 404s in network tab

### E2E-2: Hero CTA Navigation
**Given** a visitor is on the landing page  
**When** they click "Start Free 14-Day Trial" in hero  
**Then** the page scrolls to signup/onboarding section  
**And** the CTA is clearly visible

**Test Steps:**
1. Load landing page
2. Click hero CTA
3. Verify smooth scroll to signup section
4. Verify analytics event fired

### E2E-3: Pricing Tier Selection
**Given** a visitor views the pricing section  
**When** they click "Start Free Trial" on Pro tier  
**Then** they navigate to `/onboarding`  
**And** Pro plan is pre-selected (if supported)

**Test Steps:**
1. Scroll to pricing section
2. Click Pro tier CTA
3. Verify navigation to `/onboarding`
4. Verify analytics event fired with plan=pro

### E2E-4: Mobile Responsiveness
**Given** a visitor on iPhone 14 (390px width)  
**When** they view the landing page  
**Then** all sections stack vertically  
**And** no horizontal scrolling occurs  
**And** CTAs are easily tappable (44px+)

**Test Steps:**
1. Open page in mobile viewport (390x844)
2. Verify single-column layout
3. Tap each CTA button
4. Verify no zoom required for form fields

### E2E-5: Navigation Smooth Scroll
**Given** a visitor is on the landing page  
**When** they click "Pricing" in navigation  
**Then** the page smoothly scrolls to pricing section  
**And** the pricing section is centered in viewport

**Test Steps:**
1. Click nav "Pricing" link
2. Verify smooth scroll animation
3. Verify pricing section in viewport
4. Repeat for "Features", "How It Works"

### E2E-6: Accessibility - Keyboard Navigation
**Given** a visitor using keyboard only  
**When** they press Tab through the page  
**Then** all interactive elements receive focus  
**And** focus indicators are clearly visible  
**And** Enter/Space activates focused elements

**Test Steps:**
1. Load page
2. Press Tab repeatedly
3. Verify focus ring on each link/button
4. Press Enter on CTA, verify action

### E2E-7: SEO Meta Tags
**Given** a search engine crawler visits the page  
**When** the HTML is parsed  
**Then** title tag is present and descriptive  
**And** meta description is present  
**And** Open Graph tags are present

**Test Steps:**
1. View page source
2. Verify `<title>` content
3. Verify `<meta name="description">`
4. Verify `<meta property="og:*">` tags

---

## 8. Workflow Handoff

| Step | Role | Deliverable | Status |
|------|------|-------------|--------|
| 1 | PM | This PRD | ✅ Complete |
| 2 | Marketing | Copy refinement, social proof content | ⏳ Ready |
| 3 | Design | Figma mockups, responsive specs | ⏳ Ready |
| 4 | Dev | Implementation in Next.js | ⏳ Ready |
| 5 | QC | E2E tests, performance validation | ⏳ Ready |

### Handoff Notes
- **Marketing:** Provide final headline variants, testimonial quotes (if available)
- **Design:** Create Figma with mobile/desktop breakpoints
- **Dev:** Replace existing `app/page.tsx` with marketing page
- **QC:** Run full E2E suite including Lighthouse audit

---

## 9. Dependencies & Blockers

### External Dependencies
| Dependency | Status | Impact |
|------------|--------|--------|
| Onboarding flow | ✅ Ready | CTA destination |
| Stripe checkout | ✅ Ready | Payment processing |
| FUB integration | ✅ Ready | Core value prop |

### Blockers
**None.** All dependencies are complete. This is ready for immediate implementation.

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Copy doesn't resonate | Medium | High | A/B test headlines, marketing input |
| Conversion lower than 10% | Medium | High | Iterate based on analytics, user feedback |
| Mobile UX issues | Low | Medium | Thorough responsive testing |
| Performance degradation | Low | Medium | Lighthouse CI, image optimization |

---

## 11. Future Enhancements (Post-MVP)

- [ ] A/B test headline variants
- [ ] Add video demo/lightbox
- [ ] Live chat widget (Intercom/Drift)
- [ ] Exit-intent popup with lead magnet
- [ ] Testimonials carousel
- [ ] Case study section
- [ ] ROI calculator
- [ ] Comparison table (vs competitors)

---

## 12. Acceptance Criteria Summary

- [ ] All 8 sections implemented (Hero, Stats, Problem, How It Works, Features, Pricing, CTA, Footer)
- [ ] Navigation with smooth scroll anchors
- [ ] Responsive on all breakpoints (320px - 1440px+)
- [ ] Performance: Lighthouse score ≥90
- [ ] Accessibility: WCAG 2.1 AA compliant
- [ ] SEO: Meta tags, Open Graph configured
- [ ] Analytics: GA4 events for all CTAs and scroll depth
- [ ] No API documentation or technical jargon visible
- [ ] All CTAs link to /onboarding
- [ ] Cross-browser tested (Chrome, Safari, Firefox)

---

*Document Version History:*
- v1.0 (Mar 2, 2026): Initial landing page PRD
- v2.0 (Mar 6, 2026): Updated for marketing focus, added E2E specs, performance requirements
