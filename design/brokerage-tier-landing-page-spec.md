# Design Specification: Brokerage Tier on Landing Page

## Overview
Add the missing Brokerage tier card to the landing page pricing section to align with PMF.md pricing strategy and the existing `/pricing` page.

## Current State
- **Landing page (`/`)**: Shows 3 tiers (Starter $49, Pro $149, Team $399)
- **Pricing page (`/pricing`)**: Shows 4 tiers (includes Brokerage $999)
- **PMF.md**: Defines 4 tiers including Brokerage at $999+/mo

## Design Specification

### Layout Change

**Current:**
```
grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl
```

**New:**
```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl
```

### Brokerage Tier Card Specification

**Visual Treatment:**
- Same card container style as other tiers (rounded-xl, border-2, p-8)
- Border color: `border-slate-200 dark:border-slate-700` (non-highlighted)
- Background: inherits from parent section

**Content:**

| Element | Value |
|---------|-------|
| Tier Name | "Brokerage" |
| Price | "$999+" |
| Period | "/month" |
| Description | "For large brokerages (20+ agents)" |
| Badge | None (not the "Most Popular" tier) |

**Feature List:**
1. Unlimited leads
2. Multi-channel AI (SMS/email/voice/chat)
3. Unlimited agents
4. White-label options
5. Admin dashboard & compliance
6. Dedicated account manager
7. SLA guarantees (99.9% uptime)
8. Custom integrations

**CTA Button:**
- Text: "Contact Sales"
- Style: Same secondary style as Starter/Team tiers
  - `bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white`
- Link: `mailto:sales@leadflow.ai` or `/contact-sales`

**Secondary Link:** None (no trial option for Brokerage tier)

### Responsive Behavior

| Breakpoint | Grid Columns | Notes |
|------------|--------------|-------|
| Mobile (<768px) | 1 column | All cards stack vertically |
| Tablet (768px-1024px) | 2 columns | 2x2 grid layout |
| Desktop (>1024px) | 4 columns | All 4 tiers in single row |

### Spacing Adjustments

- **Container max-width**: Increase from `max-w-5xl` to `max-w-6xl` to accommodate 4th card
- **Gap**: Reduce from `gap-8` to `gap-6` to fit 4 cards comfortably
- **Card padding**: Maintain `p-8` for consistency

### Visual Hierarchy

The Brokerage tier should appear as the **4th card** (rightmost) in the grid:
1. Starter ($49)
2. Pro ($149) - "Most Popular"
3. Team ($399)
4. **Brokerage ($999+)** ← NEW

### Typography

- Tier name: `text-xl font-bold text-slate-900 dark:text-white`
- Price: `text-4xl font-bold text-slate-900 dark:text-white`
- Period: `text-slate-500 dark:text-slate-400`
- Description: `text-slate-500 dark:text-slate-400 text-sm`
- Features: `text-sm text-slate-600 dark:text-slate-300`

### Accessibility

- All interactive elements must have focus states
- Color contrast meets WCAG 2.1 AA
- Contact Sales link must be keyboard accessible

## Assets Required

None. This is a code-only change using existing components and styling.

## Implementation Notes for Dev

1. Update grid classes in the Pricing section:
   - Change `md:grid-cols-3` to `md:grid-cols-2 lg:grid-cols-4`
   - Change `max-w-5xl` to `max-w-6xl`
   - Change `gap-8` to `gap-6`

2. Add fourth `<PricingCard />` component with Brokerage tier props

3. The existing `PricingCard` component should handle the new tier without modification

4. CTA should use `mailto:` link or navigate to contact form

## Acceptance Criteria

- [ ] Landing page shows 4 pricing tiers (Starter, Pro, Team, Brokerage)
- [ ] Brokerage tier displays correct price ($999+/mo)
- [ ] Brokerage tier shows all 8 features listed above
- [ ] Brokerage tier has "Contact Sales" CTA
- [ ] Layout is responsive (1 col mobile, 2 col tablet, 4 col desktop)
- [ ] No visual regression on existing 3 tiers
- [ ] Consistent with `/pricing` page Brokerage tier
