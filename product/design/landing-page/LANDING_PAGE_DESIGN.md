# LeadFlow AI — Landing Page Design

**Platform:** Web (Mobile-first, responsive desktop)  
**Design System:** shadcn/ui + Tailwind CSS  
**Primary CTA:** "Join Pilot Program (Free)"  
**Target Audience:** Real estate agents, brokerage managers

---

## Page Structure (Mobile First)

```
┌─────────────────────────────┐
│ SECTION 1: HEADER/NAV       │  ← Fixed or sticky
├─────────────────────────────┤
│ SECTION 2: HERO             │  ← Primary pain point + CTA
├─────────────────────────────┤
│ SECTION 3: PAIN POINTS      │  ← Problem validation
├─────────────────────────────┤
│ SECTION 4: SOLUTION         │  ← How LeadFlow solves it
├─────────────────────────────┤
│ SECTION 5: FEATURES         │  ← Key capabilities (4–6)
├─────────────────────────────┤
│ SECTION 6: TESTIMONIALS     │  ← Social proof (3–5)
├─────────────────────────────┤
│ SECTION 7: PRICING          │  ← Plans & value
├─────────────────────────────┤
│ SECTION 8: CTA SECTION      │  ← Final conversion push
├─────────────────────────────┤
│ SECTION 9: FAQ              │  ← Objection handling
├─────────────────────────────┤
│ SECTION 10: FOOTER          │  ← Links, legal, social
└─────────────────────────────┘
```

---

## Section 1: Header / Navigation

```
┌─────────────────────────────┐
│ ▌█ LeadFlow AI      [≡]     │  ← Mobile: hamburger menu
│                             │
│ (Desktop: Sticky nav with   │
│  logo + menu items)         │
└─────────────────────────────┘
```

### Desktop Navigation
```
┌──────────────────────────────────────────┐
│ LeadFlow AI    [Features] [Pricing]      │
│ (Logo)         [How It Works] [Blog]     │
│                [Sign In]  [Get Started →]│
└──────────────────────────────────────────┘
```

**Style:**
- **Logo:** LeadFlow mark (32px) + wordmark (16px, semi-bold)
- **Menu Items:** 14px, regular, slate-600 (hover: emerald-500)
- **CTA Button:** "Get Started" (emerald-500 bg, white text, 13px semi-bold)
- **Background:** White (light), slate-900 (dark mode)
- **Sticky:** On scroll, adds subtle shadow

---

## Section 2: Hero Section

```
┌─────────────────────────────┐
│                             │
│   🚀 Never Miss a Lead      │
│      Again                  │
│                             │
│   Respond to qualified      │
│   leads in 90 seconds       │
│   with AI-powered SMS.      │
│                             │
│   ┌──────────────────────┐  │
│   │ 🟢 Join Pilot (Free) │  │
│   └──────────────────────┘  │
│                             │
│   ┌──────────────────────┐  │
│   │  [Agent Dashboard]   │  │
│   │  (Screenshot/visual) │  │
│   └──────────────────────┘  │
│                             │
└─────────────────────────────┘
```

### Components

**Headline (Mobile: 32px, Desktop: 48px)**
- "Never Miss a Lead Again"
- Bold, slate-900/white (light/dark)
- Line height: 1.2

**Subheadline (Mobile: 16px, Desktop: 20px)**
- "Respond to qualified leads in 90 seconds with AI-powered SMS."
- Semi-bold, slate-600/slate-300
- Line height: 1.4
- Max width: 560px

**Primary CTA Button (48px height)**
- Text: "🟢 Join Pilot Program (Free)"
- Background: Emerald-500
- Text: White, 14px semi-bold
- Hover: Emerald-600 + lift shadow
- Padding: 12px 24px
- Radius: 8px
- Width: 100% (mobile), auto (desktop)

**Hero Visual (Mobile: 100%, Desktop: 50% width)**
- Screenshot of agent dashboard (realistic, clean)
- OR: Animated 3D illustration (optional, higher production cost)
- Container: Rounded 12px, subtle shadow
- Border: 1px emerald-200/600

**Secondary Metrics (Below visual)**
```
✓ 2min avg response time    ✓ 73% conversion rate
✓ Works with all major CRMs ✓ Mobile-first
```
- Small text (12px), icons + labels
- Grid 2×2 (mobile), horizontal (desktop)

---

## Section 3: Pain Points

```
┌─────────────────────────────┐
│   The Problem: Agents      │
│   Are Drowning in Leads    │
│                             │
│ ✗ Slow to respond          │
│   (miss hot leads)          │
│                             │
│ ✗ Manual qualification      │
│   (takes time)              │
│                             │
│ ✗ Inconsistent follow-up    │
│   (leads go cold)           │
│                             │
│ ✗ No visibility into        │
│   performance               │
│                             │
│ ┏━━━━━━━━━━━━━━━━━━━━┓     │
│ ┃ Result: 40% of      ┃     │
│ ┃ leads lost to       ┃     │
│ ┃ faster competitors  ┃     │
│ ┗━━━━━━━━━━━━━━━━━━━━┛     │
│                             │
└─────────────────────────────┘
```

**Style:**
- **Section title:** 28px (mobile), 36px (desktop), bold, slate-900
- **Pain points:** List of 4 problems, each with icon + text
  - Icon: 24px, red-500 (✗ or ⚠️)
  - Text: 16px, slate-700
  - Spacing: 16px between items
- **Callout box:** Red/warning tinted background, bold statement
  - Background: Red-50 (light), red-900/10 (dark)
  - Border-left: 4px red-500
  - Padding: 16px

---

## Section 4: Solution Overview

```
┌─────────────────────────────┐
│                             │
│   LeadFlow AI Solves It     │
│                             │
│ ┌─────────────────────────┐ │
│ │ 1️⃣  Qualify leads       │ │
│ │    instantly             │ │
│ │                          │ │
│ │ 2️⃣  Respond in 90 sec   │ │
│ │    automatically         │ │
│ │                          │ │
│ │ 3️⃣  Track every lead    │ │
│ │    with analytics        │ │
│ │                          │ │
│ │ 4️⃣  Scale without hiring│ │
│ │                          │ │
│ └─────────────────────────┘ │
│                             │
│    [Watch 2-min demo]       │
│                             │
└─────────────────────────────┘
```

**Style:**
- **Title:** 28px (mobile), 36px (desktop), bold, slate-900
- **Solution cards:** Vertical stack (mobile), grid 2×2 (tablet+)
  - Each card: 1️⃣ emoji + heading (16px, semi-bold) + description (14px)
  - Background: Emerald-50 (light), emerald-900/10 (dark)
  - Border: 1px emerald-200/600
  - Padding: 16px
  - Radius: 8px
- **CTA link:** "[Watch 2-min demo]" (14px, emerald-500, underline on hover)

---

## Section 5: Key Features (4–6)

```
┌─────────────────────────────┐
│   Powerful Features         │
│   Built for Real Agents     │
│                             │
│ ┌──────────────────────┐    │
│ │ 📲 Mobile Dashboard  │    │
│ │ See all leads on your│    │
│ │ phone. Respond on    │    │
│ │ the go.              │    │
│ └──────────────────────┘    │
│                             │
│ ┌──────────────────────┐    │
│ │ 🤖 AI Qualification  │    │
│ │ Auto-qualify leads   │    │
│ │ based on property    │    │
│ │ type & budget.       │    │
│ └──────────────────────┘    │
│                             │
│ ┌──────────────────────┐    │
│ │ 📊 Real Analytics    │    │
│ │ Track response time, │    │
│ │ conversion rate, and │    │
│ │ pipeline health.     │    │
│ └──────────────────────┘    │
│                             │
│ ┌──────────────────────┐    │
│ │ 🔌 CRM Integration   │    │
│ │ Syncs with HubSpot,  │    │
│ │ Salesforce, Pipedrive│    │
│ └──────────────────────┘    │
│                             │
│ ┌──────────────────────┐    │
│ │ 📧 Multi-Channel     │    │
│ │ SMS, WhatsApp,       │    │
│ │ Facebook Messenger   │    │
│ │ in one platform.     │    │
│ └──────────────────────┘    │
│                             │
│ ┌──────────────────────┐    │
│ │ 🔐 Enterprise Safe   │    │
│ │ HIPAA-compliant,     │    │
│ │ encrypted, audited.  │    │
│ └──────────────────────┘    │
│                             │
└─────────────────────────────┘
```

**Style:**
- **Section title:** 28px (mobile), 36px (desktop), bold, slate-900
- **Feature cards:** 3-column grid (desktop), 1-column (mobile/tablet)
  - Icon: 40px, emerald-500
  - Heading: 16px semi-bold, slate-900
  - Description: 14px, slate-600
  - Background: White/slate-900 (light/dark)
  - Border: 1px slate-200/800
  - Padding: 20px
  - Radius: 8px
  - Hover: Shadow elevation + slight scale (1.02)

---

## Section 6: Testimonials / Social Proof

```
┌─────────────────────────────┐
│   What Agents Say           │
│                             │
│ ┌──────────────────────┐    │
│ │ ⭐⭐⭐⭐⭐             │    │
│ │ "LeadFlow cut my     │    │
│ │ response time in     │    │
│ │ half. I'm closing    │    │
│ │ 30% more deals."     │    │
│ │                      │    │
│ │ Sarah Martinez       │    │
│ │ Remax | Phoenix, AZ  │    │
│ └──────────────────────┘    │
│                             │
│ ┌──────────────────────┐    │
│ │ ⭐⭐⭐⭐⭐             │    │
│ │ "Best lead tool I've │    │
│ │ used. Hands-free     │    │
│ │ qualification that   │    │
│ │ actually works."     │    │
│ │                      │    │
│ │ James Chen           │    │
│ │ Coldwell Banker      │    │
│ │ Los Angeles, CA      │    │
│ └──────────────────────┘    │
│                             │
│ ┌──────────────────────┐    │
│ │ ⭐⭐⭐⭐⭐             │    │
│ │ "Finally, a tool     │    │
│ │ that lets me focus   │    │
│ │ on selling, not data │    │
│ │ entry."              │    │
│ │                      │    │
│ │ Lisa Wong            │    │
│ │ Sotheby's Int'l Rty  │    │
│ │ New York, NY         │    │
│ └──────────────────────┘    │
│                             │
│    ↓ [More testimonials]    │
│                             │
└─────────────────────────────┘
```

**Style:**
- **Section title:** 28px (mobile), 36px (desktop), bold, slate-900
- **Testimonial cards:** 1-column (mobile), 2–3-column (desktop)
  - Star rating: 5 stars (⭐ or icon), 14px, amber-500
  - Quote: 14px italic, slate-700
  - Author: 13px semi-bold, slate-900
  - Location: 12px, slate-500
  - Background: Slate-50 (light), slate-900 (dark)
  - Border-left: 4px emerald-500
  - Padding: 16px
  - Radius: 8px
- **Load more link:** "More testimonials →" (14px, emerald-500)

**Metrics Bar (Below testimonials):**
```
┌────────────────────────────────────────┐
│  500+ Agents  |  2.5K leads/week       │
│  73% avg conversion  |  4.8/5 stars    │
└────────────────────────────────────────┘
```

---

## Section 7: Pricing

```
┌─────────────────────────────┐
│   Simple Pricing            │
│   No hidden fees            │
│                             │
│ ┌──────────────────────┐    │
│ │ STARTER              │    │
│ │ Free                 │    │
│ │                      │    │
│ │ ✓ 10 leads/month     │    │
│ │ ✓ Basic dashboard    │    │
│ │ ✓ Manual responses   │    │
│ │                      │    │
│ │ [Get Started]        │    │
│ └──────────────────────┘    │
│                             │
│ ┌──────────────────────┐    │
│ │ PROFESSIONAL ⭐       │    │
│ │ $99/month            │    │
│ │ (or $990/year)       │    │
│ │                      │    │
│ │ ✓ 500 leads/month    │    │
│ │ ✓ AI qualification   │    │
│ │ ✓ Auto-responses     │    │
│ │ ✓ Analytics          │    │
│ │ ✓ CRM sync           │    │
│ │                      │    │
│ │ [Start 14-Day Trial] │    │
│ └──────────────────────┘    │
│                             │
│ ┌──────────────────────┐    │
│ │ ENTERPRISE           │    │
│ │ Custom               │    │
│ │                      │    │
│ │ ✓ Unlimited leads    │    │
│ │ ✓ Advanced AI        │    │
│ │ ✓ Multi-agent teams  │    │
│ │ ✓ White-label option │    │
│ │ ✓ Dedicated support  │    │
│ │                      │    │
│ │ [Contact Sales]      │    │
│ └──────────────────────┘    │
│                             │
│ 💳 All plans: 14-day trial  │
│ No credit card required     │
│                             │
└─────────────────────────────┘
```

**Style:**
- **Section title:** 28px (mobile), 36px (desktop), bold, slate-900
- **Pricing cards:** 1-column (mobile), 3-column (desktop), equal height
  - Plan name: 18px semi-bold, slate-900
  - Price: 32px bold, emerald-500 (or slate-600 for free)
  - Billing note: 12px, slate-500 (annual savings shown)
  - Features list: 14px, checkmark icons (✓), slate-700
  - CTA button: Full-width (mobile), auto (desktop)
  - Background: White (light), slate-900 (dark)
  - Border: 1px slate-200/800
  - "Most popular" card (Professional): 2px emerald-500 border, shadow elevation
  - Padding: 24px

**Comparison Table (Expandable, below cards):**
- Toggle: "[Compare all features →]"
- Table: Feature list (all plans visible horizontally)
- Sticky header for mobile

---

## Section 8: Final CTA Section

```
┌─────────────────────────────┐
│   Ready to Get Started?     │
│                             │
│   Join 500+ agents who      │
│   never miss another lead.  │
│                             │
│ ┌──────────────────────────┐│
│ │ 🟢 Start Free Trial      ││
│ │ (No credit card required)││
│ └──────────────────────────┘│
│                             │
│ Questions?                  │
│ [Chat with us] [Email]      │
│                             │
└─────────────────────────────┘
```

**Style:**
- **Background:** Emerald gradient (subtle, light-to-dark)
- **Headline:** 28px (mobile), 36px (desktop), bold, white/light text
- **Subheadline:** 16px, slate-100
- **CTA Button:** Large, white bg, emerald-500 text, 16px semi-bold
  - Padding: 14px 28px
  - Width: 100% (mobile), auto (desktop)
- **Support links:** Below button, 13px, white (underline on hover)

---

## Section 9: FAQ (Collapsible)

```
┌─────────────────────────────┐
│   Frequently Asked          │
│   Questions                 │
│                             │
│ ▶ How does AI qualification │
│   work?                     │
│   (Click to expand →)       │
│                             │
│ ▶ Is my data secure?        │
│                             │
│ ▶ Can I integrate with my   │
│   existing CRM?             │
│                             │
│ ▼ What's the free trial     │
│   limitation?               │
│                             │
│   The free tier includes    │
│   10 leads/month and basic  │
│   features. Upgrade to Pro  │
│   for unlimited leads and   │
│   AI qualification.         │
│                             │
│ ▶ Do you support SMS + ...  │
│   WhatsApp?                 │
│                             │
│ ▶ How do I cancel?          │
│                             │
└─────────────────────────────┘
```

**Style:**
- **Section title:** 28px (mobile), 36px (desktop), bold
- **FAQ items:** Accordion (collapsible)
  - Question: 14px semi-bold, slate-900
  - Icon: ▶ (closed) / ▼ (open), emerald-500
  - Answer: 14px, slate-700 (appears on click)
  - Padding: 16px per item
  - Background: Alternating slate-50/white (light), slate-900/slate-800 (dark)
  - Border-bottom: 1px slate-200/800

---

## Section 10: Footer

```
┌─────────────────────────────┐
│                             │
│ LeadFlow AI                 │
│                             │
│ Product      Company        │
│ [Features]   [About]        │
│ [Pricing]    [Blog]         │
│ [Docs]       [Careers]      │
│             [Press]         │
│ Integrations Legal          │
│ [HubSpot]    [Terms]        │
│ [Salesforce] [Privacy]      │
│ [Pipedrive]  [Security]     │
│                             │
│ Follow us                   │
│ [LinkedIn] [Twitter] [Demo] │
│                             │
│ © 2026 LeadFlow AI, Inc.    │
│ All rights reserved.        │
│                             │
└─────────────────────────────┘
```

**Style:**
- **Background:** Slate-900 (dark), slate-100 (light)
- **Text color:** White (dark bg), slate-700 (light bg)
- **Layout:** 4–5 columns (desktop), 2 columns (mobile), stacked on small
- **Links:** 13px, hover: emerald-500
- **Copyright:** 12px, slate-500

---

## Responsive Breakpoints

### Mobile (320px–568px)
- Single-column layouts
- Full-width buttons
- Stacked navigation (hamburger menu)
- Feature cards 1 per row
- Pricing cards 1 per row, scrollable carousel alternative

### Tablet (569px–1024px)
- Two-column layouts
- Grid 2×3 for features
- Pricing: 3 cards visible, slight compression
- Side navigation (optional)

### Desktop (1025px+)
- Multi-column layouts
- Hero image + text split 50/50
- Features grid 3 per row
- Full pricing table visible
- Sticky header navigation

---

## Performance Optimization

1. **Image optimization:**
   - Dashboard screenshot: Webp (optimized), 2x resolution for retina
   - Icons: SVG (crisp, small file size)
   - Background images: Gradients (CSS, no raster images)

2. **Code splitting:**
   - Demo video (lazy-loaded)
   - Testimonials carousel (only if >3 items)
   - FAQ accordion (collapsed by default)

3. **Load times:**
   - Target: < 3 seconds on 4G
   - Lighthouse score: 90+
   - Core Web Vitals: Green across the board

---

## Conversion Optimization

**Primary CTA:** "Start Free Trial"
- Appears in: Hero, Final section, Navigation (desktop)
- Color: Emerald-500 (primary), Red-500 (urgency variant for final CTA)
- Copy variants to test: "Start Free", "Get Started", "Join Pilot"

**Secondary CTAs:**
- "Watch demo" (video-based conversion)
- "Chat with us" (support-based conversion)
- "View pricing" (self-serve conversion)

**Trust signals:**
- Customer count (500+ agents)
- Trial availability (no card required)
- Security badges (HIPAA, SOC 2 if applicable)
- Money-back guarantee (optional)

---

## Accessibility Checklist

- [ ] Semantic HTML (h1, h2, nav, main, footer)
- [ ] ARIA labels on interactive elements
- [ ] Sufficient color contrast (WCAG AA)
- [ ] Focus indicators visible
- [ ] Keyboard navigation fully supported
- [ ] Form labels associated with inputs
- [ ] Alt text on all images
- [ ] Video captions (for demo video)
