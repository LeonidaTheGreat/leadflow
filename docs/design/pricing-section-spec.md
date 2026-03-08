# Design Spec: Landing Page Pricing Section — 4 Tiers with Feature Comparison

## Overview
Update the pricing section on the landing page and /pricing page to display all 4 pricing tiers with accurate pricing from PMF.md, clear feature differentiation, and a visual feature comparison table.

---

## Pricing Tiers (Source: PMF.md)

| Tier | Price | Target | Positioning |
|------|-------|--------|-------------|
| **Starter** | $49/mo | Testing/solo agents | Entry point, usage-based |
| **Pro** | $149/mo | Core ICP (solo agents) | Most Popular, full features |
| **Team** | $399/mo | Small teams (2-5 agents) | Multi-agent, lead routing |
| **Brokerage** | $999+/mo | 20+ agent brokerages | White-label, enterprise |

---

## Section 1: Pricing Cards (Hero Section)

### Layout
- **Desktop**: 4-column grid, equal width cards
- **Tablet**: 2x2 grid
- **Mobile**: Stacked vertically, horizontal scroll optional
- **Gap**: 24px between cards
- **Container**: max-width 1280px, centered

### Card Structure

```
┌─────────────────────────────────────┐
│  [Badge: empty | Most Popular |     │
│   Team Favorite | Enterprise]       │
│                                     │
│  Starter                            │
│  Perfect for testing the waters     │
│                                     │
│  $49                                │
│  /month                             │
│  Billed monthly                     │
│                                     │
│  [Start Free Trial]                 │
│  14-day free, no CC required        │
│                                     │
│  ─────────────────────────────────  │
│  ✓ 100 SMS/month                    │
│  ✓ Basic AI responses               │
│  ✓ Dashboard access                 │
│  ✓ FUB integration                  │
│  ✓ Email support                    │
└─────────────────────────────────────┘
```

### Visual Design

**Card Container:**
- Background: `bg-slate-800/50` (dark mode) / `bg-white` (light)
- Border: `1px solid slate-700/50` (default), `1px solid emerald-500/50` (highlighted)
- Border Radius: `16px` (rounded-2xl)
- Padding: `32px` (p-8)
- Shadow: `shadow-lg` on hover for all cards

**Highlighted Card (Pro - Most Popular):**
- Ring: `ring-2 ring-emerald-500/20`
- Background gradient: `bg-gradient-to-br from-slate-800 to-slate-900`
- Subtle glow: `bg-gradient-to-r from-emerald-500/5 to-blue-500/5` overlay
- Badge: emerald-500 background, white text

**Badge Styles:**
- Most Popular: `bg-emerald-500 text-white`
- Team Favorite: `bg-blue-500 text-white`
- Enterprise: `bg-purple-500 text-white`

**Typography:**
- Tier Name: `text-2xl font-bold text-white`
- Description: `text-sm text-slate-400`
- Price: `text-5xl font-bold text-white`
- /month: `text-slate-400`
- Features: `text-sm text-slate-300`

**CTA Buttons:**
- Primary (highlighted card): `bg-emerald-500 hover:bg-emerald-600 text-white`
- Secondary (other cards): `bg-slate-700 hover:bg-slate-600 text-white border border-slate-600`
- Size: `w-full py-3 px-4 rounded-lg font-semibold`

---

## Section 2: Feature Comparison Table

### Layout
- Full-width container within max-width 1280px
- Horizontal scroll on mobile (< 768px)
- Sticky header on scroll

### Table Structure

```
┌──────────────┬──────────┬──────────┬──────────┬────────────┐
│              │ Starter  │   Pro    │   Team   │ Brokerage  │
├──────────────┼──────────┼──────────┼──────────┼────────────┤
│ PRICE        │          │          │          │            │
│ Monthly      │   $49    │  $149    │  $399    │   $999+    │
│ Annual       │   $490   │ $1,490   │ $3,990   │  Custom    │
├──────────────┼──────────┼──────────┼──────────┼────────────┤
│ SMS & AI     │          │          │          │            │
│ SMS/month    │   100    │ Unlimited│ Unlimited│ Unlimited  │
│ AI Model     │  Basic   │   Full   │   Full   │   Full     │
│ Response Time│  < 60s   │  < 30s   │  < 30s   │   < 15s    │
│ Custom AI    │    —     │    ✓     │    ✓     │    ✓       │
│ Training     │          │          │          │            │
├──────────────┼──────────┼──────────┼──────────┼────────────┤
│ AGENTS       │          │          │          │            │
│ Included     │    1     │    1     │    5     │   20+      │
│ Additional   │    —     │    —     │ $49/mo   │  Custom    │
├──────────────┼──────────┼──────────┼──────────┼────────────┤
│ INTEGRATIONS │          │          │          │            │
│ FUB CRM      │    ✓     │    ✓     │    ✓     │    ✓       │
│ Cal.com      │    ✓     │    ✓     │    ✓     │    ✓       │
│ Lead Routing │    —     │    —     │    ✓     │    ✓       │
│ API Access   │    —     │    ✓     │    ✓     │    ✓       │
│ Webhooks     │    —     │    ✓     │    ✓     │    ✓       │
├──────────────┼──────────┼──────────┼──────────┼────────────┤
│ ANALYTICS    │          │          │          │            │
│ Dashboard    │  Basic   │   Full   │   Full   │   Full     │
│ Team Reports │    —     │    —     │    ✓     │    ✓       │
│ Custom       │    —     │    —     │    —     │    ✓       │
│ Reports      │          │          │          │            │
├──────────────┼──────────┼──────────┼──────────┼────────────┤
│ SUPPORT      │          │          │          │            │
│ Email        │    ✓     │    ✓     │    ✓     │    ✓       │
│ Chat         │    —     │    ✓     │    ✓     │    ✓       │
│ Priority     │    —     │    —     │    ✓     │    ✓       │
│ Dedicated AM │    —     │    —     │    —     │    ✓       │
├──────────────┼──────────┼──────────┼──────────┼────────────┤
│ ENTERPRISE   │          │          │          │            │
│ White-label  │    —     │    —     │    —     │    ✓       │
│ SLA (99.9%)  │    —     │    —     │    —     │    ✓       │
│ Compliance   │    —     │    —     │    —     │    ✓       │
│ Reporting    │          │          │          │            │
│ Custom       │    —     │    —     │    —     │    ✓       │
│ Contracts    │          │          │          │            │
└──────────────┴──────────┴──────────┴──────────┴────────────┘
```

### Visual Design

**Table Container:**
- Background: `bg-slate-800/30` (dark) / `bg-slate-50` (light)
- Border: `1px solid slate-700/50`
- Border Radius: `16px`
- Overflow: `overflow-x-auto`

**Header Row:**
- Background: `bg-slate-800` (dark) / `bg-slate-100` (light)
- First column (feature names): sticky left, `bg-slate-900` with shadow
- Tier names: centered, `font-semibold`
- Highlighted tier (Pro): `text-emerald-400`

**Category Headers:**
- Background: `bg-slate-800/50`
- Text: `text-xs font-semibold text-slate-400 uppercase tracking-wider`
- Full width across all columns

**Data Cells:**
- Text: `text-sm text-slate-300`
- Checkmarks: `text-emerald-400` using Check icon
- Dashes: `text-slate-600` using Minus icon or "—"
- Alignment: Feature names left, values center

**Row Hover:**
- `hover:bg-slate-700/30` for better readability

---

## Section 3: Billing Toggle

### Design
- Container: `inline-flex bg-slate-800/50 border border-slate-700/50 rounded-lg p-1`
- Active button: `bg-emerald-500 text-white rounded-md`
- Inactive button: `text-slate-300 hover:text-white`
- Save badge on Annual: `bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded`

### Annual Savings Display
- Starter: Save $98/year (17%)
- Pro: Save $298/year (17%)
- Team: Save $798/year (17%)

---

## Section 4: FAQ Section

### Layout
- Max-width: 768px, centered
- Accordion-style expandable items
- 4-6 questions specific to pricing

### Questions to Include
1. "Can I change plans anytime?" → Yes, prorated
2. "What happens if I exceed my SMS limit?" → Upgrade or pay per SMS
3. "Is there a free trial?" → 14-day free, no CC
4. "Do you offer refunds?" → 30-day money-back
5. "What's included in white-label?" → Custom domain, branding, admin
6. "How does team lead routing work?" → Round-robin or rules-based

---

## Section 5: Final CTA

### Layout
- Full-width section with gradient background
- Centered content, max-width 600px

### Design
- Background: `bg-gradient-to-r from-emerald-600 to-blue-600`
- Headline: "Ready to transform your lead response?"
- Subtext: "Join thousands of agents closing more deals with AI"
- CTA Button: `bg-white text-emerald-600 hover:bg-slate-100`
- Trust badges: "No credit card required" • "Cancel anytime" • "14-day free trial"

---

## Responsive Behavior

### Desktop (1280px+)
- 4-column pricing cards
- Full comparison table visible
- Side-by-side layout where applicable

### Tablet (768px - 1279px)
- 2x2 pricing card grid
- Comparison table scrollable horizontally
- Stacked sections

### Mobile (< 768px)
- Single column pricing cards
- Horizontal scroll for comparison table
- Accordion for feature comparison (optional alternative)
- Larger touch targets (min 44px)

---

## Animation & Interaction

### Card Hover
- Transform: `hover:scale-[1.02]`
- Transition: `transition-all duration-200`
- Shadow increase on hover

### CTA Button Hover
- Scale: `hover:scale-105`
- Shadow: `hover:shadow-lg`

### Table Row Hover
- Background: subtle highlight
- Transition: `transition-colors duration-150`

### Scroll Reveal
- Cards fade in + translate Y on scroll into view
- Stagger: 100ms between cards

---

## Color Palette (Dark Mode Primary)

| Element | Color |
|---------|-------|
| Background | `slate-950` |
| Card Background | `slate-800/50` |
| Card Border | `slate-700/50` |
| Primary (CTA) | `emerald-500` |
| Primary Hover | `emerald-600` |
| Text Primary | `white` |
| Text Secondary | `slate-300` |
| Text Muted | `slate-400` |
| Success/Check | `emerald-400` |
| Highlight Ring | `emerald-500/20` |

---

## Assets Required

### Icons (Lucide)
- Check - feature included
- Minus/X - feature not included
- Zap - Starter tier
- Star - Pro tier
- Users - Team tier
- Building - Brokerage tier
- ArrowRight - CTA

### Images
- None required for pricing section

---

## Implementation Notes for Dev

1. **Pricing data**: Store in a const array for easy updates
2. **Feature comparison**: Use a structured data format for the table
3. **Billing toggle**: State-managed, affects all price displays
4. **Highlighted tier**: "Pro" should be visually distinct
5. **Accessibility**: Ensure proper contrast, focus states, ARIA labels
6. **Analytics**: Track tier selection, billing toggle, CTA clicks
7. **Mobile**: Test horizontal scroll on comparison table
8. **Performance**: Lazy load comparison table if below fold

---

## Files to Create/Modify

### New Design Assets
- `docs/design/pricing-section-spec.md` (this file)

### Dev Implementation (for reference)
- `product/lead-response/dashboard/app/pricing/page.tsx` - Update to 4 tiers
- `product/lead-response/dashboard/app/page.tsx` - Add pricing section to landing
- `product/lead-response/dashboard/components/pricing/` - Pricing card component
- `product/lead-response/dashboard/components/pricing/feature-comparison.tsx` - Table component
