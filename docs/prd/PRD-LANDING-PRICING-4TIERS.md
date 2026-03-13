# PRD: Landing Page Pricing Section — All 4 Tiers with Feature Comparison
**PRD ID:** PRD-LANDING-PRICING-4TIERS  
**Status:** draft  
**Version:** 1.0  
**Date:** 2026-03-07  
**Author:** Product Manager  
**Linked UC:** improve-landing-page-pricing-4-tiers

---

## 1. Problem Statement

The LeadFlow AI landing page (root `/`) currently contains no pricing section — it is a developer-facing page with an API endpoints table and webhook test button. The standalone `/pricing` page exists but shows 3 tiers at completely wrong prices ($497, $997, $1997/mo) that do not match the business strategy in PMF.md ($49, $149, $399, $999+/mo).

**Impact:** Prospects who land on leadflow-ai-five.vercel.app cannot evaluate the product commercially. Without visible, accurate pricing, conversion to pilot signup or paid plan is impossible.

---

## 2. Goals

1. The **marketing landing page** (`/`) must include a pricing section showing all **4 tiers** with correct prices matching PMF.md.
2. The **standalone `/pricing` page** must also be corrected to show all 4 tiers with correct prices and a feature comparison table.
3. Every tier must show its price, feature list, and a CTA button.
4. A **feature comparison table** must allow prospects to evaluate tiers side-by-side.
5. The "Most Popular" / recommended tier must be visually highlighted (Pro at $149/mo).
6. Brokerage tier CTA must route to "Contact Sales" (not self-serve checkout), since it's $999+/mo.

**Non-goal:** This PRD does not cover backend Stripe plan changes. Pricing display only.

---

## 3. Pricing Tiers (Source of Truth: PMF.md)

| Tier | Price | Target Audience |
|------|-------|-----------------|
| **Starter** | $49/mo | Solo agents testing AI |
| **Pro** | $149/mo | Core ICP — working real estate agents |
| **Team** | $399/mo | Small teams (≤5 agents) |
| **Brokerage** | $999+/mo | Large brokerages, white-label |

---

## 4. Feature Matrix (per tier)

| Feature | Starter | Pro | Team | Brokerage |
|---------|---------|-----|------|-----------|
| SMS responses | 100/mo | Unlimited | Unlimited | Unlimited |
| AI quality | Basic | Full AI (Claude) | Full AI (Claude) | Full AI + Custom |
| Follow Up Boss integration | ✓ | ✓ | ✓ | ✓ |
| Cal.com booking | — | ✓ | ✓ | ✓ |
| Analytics dashboard | Basic | Full | Full | Full + Admin |
| Lead qualification scoring | — | ✓ | ✓ | ✓ |
| Agents included | 1 | 1 | 5 | Unlimited |
| Lead routing | — | — | ✓ | ✓ |
| White-label | — | — | — | ✓ |
| Compliance reporting | — | — | — | ✓ |
| Support | Email | Priority | Priority | Dedicated |
| CTA | Get Started | Start Free Trial | Get Started | Contact Sales |

---

## 5. Functional Requirements

### FR-1: Landing Page Pricing Section
- The root landing page (`/`) MUST include a full pricing section between the "Features" section and the footer.
- Section heading: "Simple, Transparent Pricing" or equivalent.
- All 4 tiers must be displayed as cards in a responsive grid.
- On mobile: single-column stack. On tablet: 2-column. On desktop: 4-column.

### FR-2: Correct Prices
- Starter: **$49/mo**
- Pro: **$149/mo**
- Team: **$399/mo**
- Brokerage: **$999+/mo** (displayed as "$999+")
- Prices must NOT say $497, $997, or $1997 anywhere.

### FR-3: Tier Cards
Each card must contain:
- Tier name
- Price (large, prominent)
- Short description (1 line)
- Feature list with checkmarks (✓) and dashes (—) for absent features
- CTA button (see feature matrix above)

### FR-4: Pro Tier Highlighted
- Pro tier card must display a "Most Popular" badge.
- Pro card should have a visual distinction: border highlight, background tint, or elevated shadow.

### FR-5: Feature Comparison Table (on /pricing page)
- The `/pricing` page must include a feature comparison table below the tier cards.
- Rows = features (from the feature matrix in this PRD).
- Columns = tiers (Starter, Pro, Team, Brokerage).
- Use ✓ / — icons for boolean features, text for quantitative features (e.g., "100/mo", "Unlimited").

### FR-6: CTA Routing
- Starter / Pro / Team CTAs: link to `/signup` (or `/signup?plan=starter|pro|team`).
- Brokerage CTA: link to `mailto:hello@leadflow.ai` or a contact form.

### FR-7: /pricing Page Corrections
- Fix the 3 placeholder tiers ($497/$997/$1997) to the correct 4 tiers matching PMF.md.
- Remove or rename "Professional" → "Pro", "Enterprise" → "Brokerage" (or add "Team" as 4th tier).
- Remove the "Add-Ons" section (not part of current pricing model).

### FR-8: Pilot Context Note
- A small note near the pricing section may read: "Currently offering free pilots to qualifying agents — [Join the pilot]" linking to the pilot signup modal/form.
- This does NOT replace the pricing section; it is supplementary.

---

## 6. Non-Functional Requirements

- **Responsive:** Works on 320px to 1440px+ screens.
- **Dark mode:** Consistent with existing site theme (slate/emerald palette).
- **Accessibility:** Tier cards and comparison table must be keyboard-navigable and screen-reader compatible (use semantic `<table>` for comparison grid).
- **No new dependencies:** Use existing Tailwind CSS and lucide-react icon set.
- **Performance:** Pricing section is static — no API calls, no hydration on this component.

---

## 7. User Stories

**US-1 (Solo Agent):** "As a solo real estate agent visiting the landing page, I want to see pricing tiers and their features so I can decide which plan fits my volume and budget."

**US-2 (Team Lead):** "As a team manager evaluating LeadFlow AI, I want to compare the Team plan features versus Pro so I can justify the price difference to my broker."

**US-3 (Brokerage Decision Maker):** "As a brokerage owner interested in white-label, I want to see Brokerage tier pricing and contact sales without being pushed through a self-serve checkout."

**US-4 (Prospect on Budget):** "As an agent who's price-sensitive, I want to see a $49/mo Starter option so I can trial the service at low risk."

---

## 8. Acceptance Criteria

### AC-1: Landing Page Has Pricing Section
- [ ] Navigate to `leadflow-ai-five.vercel.app`
- [ ] Scroll down — a "Pricing" section is visible before the footer
- [ ] All 4 tiers (Starter, Pro, Team, Brokerage) are displayed

### AC-2: Correct PMF.md Prices Shown
- [ ] Starter shows $49/mo
- [ ] Pro shows $149/mo
- [ ] Team shows $399/mo
- [ ] Brokerage shows $999+ (or $999+/mo)
- [ ] No tier shows prices of $497, $997, $1997

### AC-3: Pro Highlighted
- [ ] Pro tier card has "Most Popular" badge (or equivalent)
- [ ] Pro card is visually distinct from other cards

### AC-4: All 4 Tiers Have CTAs
- [ ] Starter CTA links to `/signup` (or `/signup?plan=starter`)
- [ ] Pro CTA links to `/signup` (or `/signup?plan=pro`)
- [ ] Team CTA links to `/signup` (or `/signup?plan=team`)
- [ ] Brokerage CTA opens a contact form or `mailto:` link

### AC-5: /pricing Page Updated
- [ ] Navigate to `/pricing`
- [ ] All 4 tiers shown with PMF.md prices
- [ ] Feature comparison table present with ✓ / — per row/column
- [ ] No "$497", "$997", "$1997" visible anywhere

### AC-6: Feature Comparison Table
- [ ] On `/pricing` page: a table with features as rows and tiers as columns
- [ ] Each cell correctly shows ✓ or — (or text value) per the feature matrix in this PRD
- [ ] Table is readable on mobile (horizontal scroll or condensed layout acceptable)

### AC-7: Mobile Responsiveness
- [ ] On 375px viewport (iPhone SE): pricing cards stack vertically, all readable
- [ ] No horizontal overflow on landing page or /pricing page

---

## 9. Design Notes for Design Agent

- Use the existing slate/emerald color palette (dark mode first — `bg-slate-800`, `border-emerald-500`, `text-emerald-400`).
- Feature list rows: alternate `bg-slate-800/30` and `bg-slate-900/50` for readability.
- Consider a `sticky` header row on the comparison table for long tables.
- Brokerage tier: use a muted/subtle style (not the "best deal" framing — it's enterprise).
- Pro tier: ring-2 ring-emerald-500/40, slight background highlight.
- Pilot note banner: small, secondary — beneath the tier headline or above the footer CTA.

---

## 10. Out of Scope

- Backend Stripe plan changes or price ID updates.
- Actual checkout flow (handled by `UC-9 Customer Sign-Up Flow`).
- Annual billing toggle on the landing page pricing section (keep it simple; `/pricing` page can retain toggle if present).
- New pricing tiers or price changes (use PMF.md as frozen source of truth for this task).
