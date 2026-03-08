# Design Specification: Landing Page Pricing Section — 4 Tiers with Feature Comparison

**Task ID:** e6777feb-a212-49ef-81da-f07ee4bf3611  
**Date:** March 8, 2026  
**Designer:** Design Agent  
**Status:** Ready for Dev Handoff

---

## 1. Overview

### Purpose
Replace the minimal pricing CTA on the landing page with a comprehensive 4-tier pricing section featuring clear pricing, feature comparison, and proper visual hierarchy that matches PMF.md pricing strategy.

### Target Audience
- Solo real estate agents (Starter/Pro)
- Small teams (Team tier)
- Brokerages (Brokerage tier)

### Design Principles
- **Clarity first:** Prices and features immediately scannable
- **Visual hierarchy:** Pro tier (core ICP) gets prominence
- **Trust signals:** No hidden fees, clear value proposition
- **Mobile-first:** Cards stack vertically on small screens

---

## 2. Pricing Tiers (Source of Truth from PMF.md)

| Tier | Price | Target | Key Value Prop |
|------|-------|--------|----------------|
| **Starter** | $49/mo | Testing/solo agents | 100 SMS, basic AI, dashboard |
| **Pro** | $149/mo | Core ICP (solo agents) | Unlimited SMS, full AI, Cal.com, analytics |
| **Team** | $399/mo | Small teams (2-5 agents) | 5 agents, team dashboard, lead routing |
| **Brokerage** | $999+/mo | Brokerages (20+ agents) | White-label, admin, compliance reporting |

---

## 3. Visual Design Specifications

### 3.1 Section Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  PRICING SECTION                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Section Header                                         │    │
│  │  "Simple, transparent pricing"                          │    │
│  │  "Start free. Scale when you're ready."                 │    │
│  │  [Monthly] [Annual - Save 20%] ← Toggle                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Starter  │  │   PRO    │  │   Team   │  │ Brokerage│        │
│  │  $49/mo  │  │ $149/mo  │  │ $399/mo  │  │ $999+/mo │        │
│  │          │  │ ★ MOST   │  │          │  │          │        │
│  │          │  │  POPULAR │  │          │  │          │        │
│  │ [Features]│  │[Features]│  │[Features]│  │[Features]│        │
│  │ [CTA]    │  │  [CTA]   │  │  [CTA]   │  │  [CTA]   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Feature Comparison Table                               │    │
│  │  [Expandable/Collapsible on mobile]                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Trust Badges: "No credit card required"                │    │
│  │  "Cancel anytime" "14-day free trial"                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Color Palette

**Primary Colors:**
- Primary Action: `#10b981` (Emerald-500) — CTAs, highlights
- Primary Action Hover: `#059669` (Emerald-600)
- Primary Action Light: `#d1fae5` (Emerald-100) — Badge backgrounds

**Card Colors:**
- Card Background: `#ffffff` (White) / `#1e293b` (Slate-800 dark)
- Card Border: `#e2e8f0` (Slate-200) / `#334155` (Slate-700 dark)
- Featured Card Border: `#10b981` (Emerald-500)
- Featured Card Background: `#f0fdf4` (Emerald-50) / `#064e3b` (Emerald-900 dark)

**Text Colors:**
- Heading: `#0f172a` (Slate-900) / `#f8fafc` (Slate-50 dark)
- Body: `#475569` (Slate-600) / `#94a3b8` (Slate-400 dark)
- Price: `#0f172a` (Slate-900) / `#ffffff` (White dark)
- Price Unit: `#64748b` (Slate-500)
- Feature Check: `#10b981` (Emerald-500)
- Feature Cross: `#94a3b8` (Slate-400)

### 3.3 Typography

**Section Header:**
- Title: `text-3xl md:text-4xl font-bold text-slate-900`
- Subtitle: `text-lg md:text-xl text-slate-600 mt-2`

**Pricing Cards:**
- Tier Name: `text-xl font-semibold text-slate-900`
- Price: `text-4xl md:text-5xl font-bold text-slate-900`
- Price Unit: `text-lg text-slate-500 font-normal`
- Description: `text-sm text-slate-500 mt-1`
- Feature Text: `text-sm text-slate-600`

**Feature Comparison:**
- Category Header: `text-sm font-semibold text-slate-900 uppercase tracking-wide`
- Feature Label: `text-sm text-slate-600`
- Tier Value: `text-sm font-medium`

### 3.4 Spacing & Layout

**Section Container:**
- Padding: `py-20 md:py-24` (80px/96px vertical)
- Max Width: `max-w-7xl mx-auto` (1280px)
- Horizontal Padding: `px-4 sm:px-6 lg:px-8`

**Card Grid:**
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8`
- Card Padding: `p-6 md:p-8`
- Card Border Radius: `rounded-2xl`

**Card Internal Spacing:**
- Header to Price: `mb-4`
- Price to Features: `mb-6`
- Feature Items: `space-y-3`
- Features to CTA: `mt-auto pt-6`

---

## 4. Component Specifications

### 4.1 Billing Toggle

```
┌─────────────────────────────────────┐
│  ┌──────────┐ ┌──────────────────┐  │
│  │ Monthly  │ │ Annual           │  │
│  │          │ │ Save 20%         │  │
│  └──────────┘ └──────────────────┘  │
└─────────────────────────────────────┘
```

**Specs:**
- Container: `inline-flex bg-slate-100 rounded-lg p-1`
- Button Active: `bg-white shadow-sm text-slate-900`
- Button Inactive: `text-slate-500 hover:text-slate-700`
- Save Badge: `ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded`

### 4.2 Pricing Card (Standard)

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ Starter                          │ │
│ │ Perfect for individual agents    │ │
│ ├──────────────────────────────────┤ │
│ │                                  │ │
│ │  $49                             │ │
│ │  /month                          │ │
│ │                                  │ │
│ │  Billed monthly                  │ │
│ ├──────────────────────────────────┤ │
│ │ ✓ 100 SMS/month                  │ │
│ │ ✓ Basic AI responses             │ │
│ │ ✓ Dashboard access               │ │
│ │ ✓ Standard support               │ │
│ │ ✗ Cal.com integration            │ │
│ │ ✗ Analytics                      │ │
│ ├──────────────────────────────────┤ │
│ │ [Get Started]                    │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Specs:**
- Border: `border border-slate-200`
- Background: `bg-white`
- Shadow: `shadow-sm`

### 4.3 Pricing Card (Featured — Pro Tier)

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ ★ MOST POPULAR                   │ │
│ ├──────────────────────────────────┤ │
│ │ Pro                              │ │
│ │ Best for serious agents          │ │
│ ├──────────────────────────────────┤ │
│ │                                  │ │
│ │  $149                            │ │
│ │  /month                          │ │
│ │                                  │ │
│ │  Billed monthly                  │ │
│ ├──────────────────────────────────┤ │
│ │ ✓ Unlimited SMS                  │ │
│ │ ✓ Full AI with context           │ │
│ │ ✓ Cal.com booking                │ │
│ │ ✓ Advanced analytics             │ │
│ │ ✓ Priority support               │ │
│ ├──────────────────────────────────┤ │
│ │ [Start Free Trial]               │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Specs:**
- Border: `border-2 border-emerald-500`
- Background: `bg-gradient-to-b from-emerald-50/50 to-white`
- Shadow: `shadow-lg shadow-emerald-500/10`
- Badge: Positioned absolute top, centered

### 4.4 Brokerage Card (Enterprise)

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ Brokerage                        │ │
│ │ For growing brokerages           │ │
│ ├──────────────────────────────────┤ │
│ │                                  │ │
│ │  $999+                           │ │
│ │  /month                          │ │
│ │  Custom pricing                  │ │
│ ├──────────────────────────────────┤ │
│ │ ✓ Everything in Team             │ │
│ │ ✓ White-label options            │ │
│ │ ✓ Admin dashboard                │ │
│ │ ✓ Compliance reporting           │ │
│ │ ✓ Dedicated account manager      │ │
│ ├──────────────────────────────────┤ │
│ │ [Contact Sales]                  │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Specs:**
- Border: `border border-slate-800`
- Background: `bg-slate-900`
- Text: White/light variants
- CTA: Outline style `border-2 border-emerald-500 text-emerald-500`

---

## 5. Feature Comparison Matrix

### 5.1 Feature List by Tier

| Feature | Starter | Pro | Team | Brokerage |
|---------|:-------:|:---:|:----:|:---------:|
| **Core Features** |
| AI Lead Response | ✓ | ✓ | ✓ | ✓ |
| SMS Messages | 100/mo | Unlimited | Unlimited | Unlimited |
| Dashboard Access | ✓ | ✓ | ✓ | ✓ |
| Follow Up Boss Integration | ✓ | ✓ | ✓ | ✓ |
| **AI Capabilities** |
| Basic AI Responses | ✓ | ✓ | ✓ | ✓ |
| Full AI with Context Memory | — | ✓ | ✓ | ✓ |
| Custom AI Training | — | — | ✓ | ✓ |
| **Booking & Scheduling** |
| Cal.com Integration | — | ✓ | ✓ | ✓ |
| Auto-Booking | — | ✓ | ✓ | ✓ |
| **Team Features** |
| Number of Agents | 1 | 1 | 5 | 20+ |
| Team Dashboard | — | — | ✓ | ✓ |
| Lead Routing | — | — | ✓ | ✓ |
| **Analytics & Support** |
| Basic Analytics | ✓ | ✓ | ✓ | ✓ |
| Advanced Analytics | — | ✓ | ✓ | ✓ |
| Standard Support | ✓ | — | — | — |
| Priority Support | — | ✓ | ✓ | — |
| Dedicated Account Manager | — | — | — | ✓ |
| **Enterprise** |
| White-Label Options | — | — | — | ✓ |
| Admin Dashboard | — | — | — | ✓ |
| Compliance Reporting | — | — | — | ✓ |
| Custom Integrations | — | — | — | ✓ |
| SLA Guarantee | — | — | — | ✓ |

### 5.2 Comparison Table Layout

**Desktop (≥1024px):**
```
┌─────────────────┬─────────┬─────────┬─────────┬────────────┐
│ Feature         │ Starter │   Pro   │  Team   │ Brokerage  │
├─────────────────┼─────────┼─────────┼─────────┼────────────┤
│ Price           │  $49    │  $149   │  $399   │   $999+    │
├─────────────────┼─────────┼─────────┼─────────┼────────────┤
│ SMS Messages    │ 100/mo  │Unlimited│Unlimited│ Unlimited  │
│ AI Context      │    —    │    ✓    │    ✓    │     ✓      │
│ Cal.com         │    —    │    ✓    │    ✓    │     ✓      │
│ Agents          │    1    │    1    │    5    │    20+     │
│ ...             │   ...   │   ...   │   ...   │    ...     │
└─────────────────┴─────────┴─────────┴─────────┴────────────┘
```

**Mobile (<768px):**
- Collapsible accordion sections
- One tier per view with swipe/selector
- Or stacked cards with "Compare all features" expand

---

## 6. Interaction Design

### 6.1 Billing Toggle Behavior
- Click toggles between monthly/annual
- Annual shows "Save 20%" badge
- Price updates with smooth transition (200ms)
- State persists in URL query param (`?billing=annual`)

### 6.2 Card Hover States
- Standard cards: `hover:shadow-md hover:border-slate-300 transition-all duration-200`
- Featured card: `hover:shadow-xl hover:shadow-emerald-500/20`
- Brokerage card: `hover:bg-slate-800 transition-colors`

### 6.3 CTA Button States

**Primary CTA (Pro/Team):**
- Default: `bg-emerald-500 text-white`
- Hover: `bg-emerald-600`
- Active: `bg-emerald-700`
- Loading: Spinner + "Processing..."

**Secondary CTA (Starter):**
- Default: `bg-white border-2 border-slate-200 text-slate-700`
- Hover: `bg-slate-50 border-slate-300`

**Outline CTA (Brokerage):**
- Default: `border-2 border-emerald-500 text-emerald-500`
- Hover: `bg-emerald-500 text-white`

### 6.4 Feature Comparison Interaction
- Desktop: Full table always visible
- Tablet: Horizontal scroll with sticky first column
- Mobile: 
  - Default: Collapsed, showing only tier cards
  - "Compare all features" button expands full comparison
  - Or tier selector tabs to switch views

---

## 7. Responsive Behavior

### 7.1 Breakpoints

| Breakpoint | Cards Layout | Comparison Table |
|------------|--------------|------------------|
| < 640px (sm) | 1 column stack | Collapsed accordion |
| 640-1023px (md) | 2x2 grid | Horizontal scroll |
| ≥1024px (lg) | 4 columns | Full table |

### 7.2 Mobile Adaptations

**Card Stack:**
- Full width cards
- Increased vertical spacing between cards
- Touch-friendly CTA buttons (min 44px height)
- Swipe hint for tier comparison

**Typography Scale Down:**
- Price: `text-3xl` (from `text-5xl`)
- Tier name: `text-lg` (from `text-xl`)
- Section title: `text-2xl` (from `text-4xl`)

---

## 8. Accessibility Requirements

### 8.1 WCAG 2.1 AA Compliance

**Color Contrast:**
- All text meets 4.5:1 minimum ratio
- Interactive elements have visible focus states
- Don't rely on color alone for information (checkmarks + text)

**Keyboard Navigation:**
- All CTAs focusable
- Billing toggle operable with keyboard
- Focus order follows visual order

**Screen Readers:**
- Price announced with context: "$49 per month"
- Feature checkmarks have aria-label: "Included" / "Not included"
- "Most Popular" badge announced before tier name

### 8.2 ARIA Labels

```html
<section aria-labelledby="pricing-heading">
  <h2 id="pricing-heading">Simple, transparent pricing</h2>
  
  <div role="group" aria-label="Billing interval">
    <button aria-pressed="true">Monthly</button>
    <button aria-pressed="false">Annual</button>
  </div>
  
  <div role="list" aria-label="Pricing plans">
    <article aria-labelledby="starter-heading">
      <h3 id="starter-heading">Starter</h3>
      <p aria-label="Price: $49 per month">
        <span>$49</span><span>/month</span>
      </p>
      <ul aria-label="Plan features">
        <li><span aria-label="Included">✓</span> 100 SMS/month</li>
      </ul>
    </article>
  </div>
</section>
```

---

## 9. CTAs & Navigation

### 9.1 CTA Destinations

| Tier | CTA Text | Destination |
|------|----------|-------------|
| Starter | "Get Started" | `/signup?plan=starter` |
| Pro | "Start Free Trial" | `/signup?plan=pro` |
| Team | "Start Free Trial" | `/signup?plan=team` |
| Brokerage | "Contact Sales" | `mailto:sales@leadflow.ai` or `/contact-sales` |

### 9.2 Analytics Events

All CTAs must fire GA4 events:

```javascript
// Event structure
gtag('event', 'cta_click', {
  cta_id: 'pricing_starter_get_started',
  cta_text: 'Get Started',
  cta_location: 'pricing_section',
  plan_tier: 'starter',
  billing_interval: 'monthly' // or 'annual'
});
```

---

## 10. Assets & Deliverables

### 10.1 Files Created

| File | Path | Description |
|------|------|-------------|
| Design Spec | `docs/design/DESIGN-PRICING-SECTION-4-TIERS.md` | This document |
| Wireframe | `docs/design/wireframes/pricing-section-wireframe.svg` | Low-fi wireframe |
| Mockup | `docs/design/mockups/pricing-section-mockup.png` | Hi-fi visual mockup |
| Component Spec | `docs/design/components/pricing-card-spec.md` | Detailed component specs |

### 10.2 Design Tokens

```json
{
  "pricing": {
    "colors": {
      "primary": "#10b981",
      "primaryHover": "#059669",
      "featuredBg": "#f0fdf4",
      "featuredBorder": "#10b981",
      "brokerageBg": "#0f172a",
      "brokerageText": "#f8fafc"
    },
    "spacing": {
      "sectionY": "6rem",
      "cardGap": "1.5rem",
      "cardPadding": "2rem"
    },
    "typography": {
      "priceSize": "3rem",
      "priceSizeDesktop": "3.5rem",
      "tierNameSize": "1.25rem"
    }
  }
}
```

---

## 11. Dev Handoff Checklist

- [x] All 4 pricing tiers defined with correct prices ($49/$149/$399/$999+)
- [x] Feature comparison matrix complete
- [x] Visual specs (colors, typography, spacing) documented
- [x] Responsive behavior specified for all breakpoints
- [x] Interaction states (hover, active, loading) defined
- [x] Accessibility requirements documented
- [x] CTA destinations and analytics events specified
- [x] Mobile-first approach confirmed
- [x] Dark mode colors specified

---

## 12. Notes for Developers

### 12.1 Critical Implementation Details

1. **Price Source of Truth:** Use PMF.md prices, NOT the current /pricing page prices
2. **Tier Names:** Use canonical names: `starter`, `pro`, `team`, `brokerage`
3. **Pro Tier Highlight:** Must have "Most Popular" badge and visual prominence
4. **Annual Pricing:** Calculate as `monthly * 0.8 * 12` (20% discount)
5. **Feature Comparison:** Use checkmarks (✓) and dashes (—), not true/false

### 12.2 State Management

```typescript
// Billing interval state
type BillingInterval = 'monthly' | 'annual';

// Pricing data structure
interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: Feature[];
  cta: {
    text: string;
    href: string;
  };
  isFeatured?: boolean;
  isEnterprise?: boolean;
}
```

### 12.3 Testing Checklist for Dev

- [ ] All 4 tiers render correctly
- [ ] Prices display as $49/$149/$399/$999+
- [ ] Pro tier has "Most Popular" badge
- [ ] Billing toggle switches monthly/annual prices
- [ ] CTAs link to correct URLs with plan param
- [ ] Feature comparison table renders all rows
- [ ] Mobile: cards stack vertically
- [ ] Tablet: 2x2 grid layout
- [ ] Desktop: 4-column layout
- [ ] Dark mode colors applied correctly
- [ ] Analytics events fire on CTA click

---

## 13. Related Files

- PMF.md (pricing source of truth)
- PRD-LANDING-PAGE.md (original landing page PRD)
- PRD-FIX-PRICING-CORRECTION.md (pricing fix PRD)
- `app/page.tsx` (landing page implementation)
- `app/pricing/page.tsx` (standalone pricing page — needs sync)

---

**End of Design Specification**
