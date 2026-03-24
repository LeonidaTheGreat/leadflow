# Design Specification: Live AI Demo — Experience the Product Without Signing Up

**Task ID:** c0a08766-ee3d-46de-a8ab-21dc85eff529  
**Use Case:** feat-demo-without-signup  
**Status:** Ready for Development  
**Last Updated:** 2026-03-12

---

## 1. Overview

This document provides visual design specifications for a public, no-authentication interactive demo that lets prospects experience LeadFlow AI's core value proposition — AI-generated personalized SMS responses in under 30 seconds.

### Design Principles
- **Instant clarity:** The value proposition is understood in under 3 seconds
- **Zero friction:** No signup, no auth, no email required to experience
- **Mobile-first:** Optimized for 375px viewport, scales elegantly to desktop
- **Trust through proof:** Show, don't tell — the AI response is the proof
- **Clear progression:** Visual timeline makes the "instant response" value obvious

---

## 2. Page Structure & Route

**Route:** `/demo`

**Three-Step Flow:**
1. **Lead Input Form** — Prospect simulates a lead scenario
2. **AI Processing Visualization** — Real-time timer + processing state
3. **SMS Response Delivered** — Phone mockup + success state + conversion CTA

---

## 3. Visual Design Specifications

### Color Palette (Tailwind Scale)

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Background | #0F172A | slate-900 | Page background |
| Surface | #1E293B | slate-800 | Card backgrounds |
| Surface Elevated | #334155 | slate-700 | Elevated elements |
| Primary | #10B981 | emerald-500 | Primary actions, success |
| Primary Hover | #059669 | emerald-600 | Button hover state |
| Accent | #3B82F6 | blue-500 | AI indicators, links |
| Text Primary | #F8FAFC | slate-50 | Headlines, primary text |
| Text Secondary | #94A3B8 | slate-400 | Body text, labels |
| Text Muted | #64748B | slate-500 | Placeholders, hints |
| Border | #334155 | slate-700 | Card borders, dividers |
| Success | #22C55E | green-500 | Success states |
| Timer | #F59E0B | amber-500 | Timer/countdown accent |

### Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| H1 (Hero) | Geist Sans | 36px / 48px* | 700 | 1.1 |
| H2 (Section) | Geist Sans | 28px / 32px* | 600 | 1.2 |
| H3 (Card) | Geist Sans | 18px | 600 | 1.3 |
| Body | Geist Sans | 16px | 400 | 1.5 |
| Body Small | Geist Sans | 14px | 400 | 1.5 |
| Caption | Geist Sans | 12px | 500 | 1.4 |
| Timer (Mono) | Geist Mono | 48px | 700 | 1.0 |
| SMS Text | Geist Sans | 14px | 400 | 1.4 |

*Mobile / Desktop

### Spacing System (Tailwind)

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### Border Radius

- sm: 6px
- md: 8px
- lg: 12px
- xl: 16px
- full: 9999px

---

## 4. Component Specifications

### 4.1 Header

- Height: 64px
- Background: transparent (overlays gradient)
- Layout: flex, space-between, container max-width 1200px
- Logo: "LeadFlow AI", white, 24px bold
- Right link: "Sign In →", text-only, slate-400/hover white

### 4.2 Hero Section

**Background:** Linear gradient from slate-900 to slate-800 (top → bottom)
**Padding:** 64px 24px (mobile) / 96px 24px (desktop)
**Text align:** center, max-width 800px

**Headline:**
```
"See AI Respond in Under 30 Seconds"
```
- Font: 36px mobile, 48px desktop, weight 700, white
- Animation: fade-in + slide-up (300ms ease-out)

**Subheadline:**
```
"Experience how LeadFlow AI instantly qualifies and responds to your leads. 
No signup required."
```
- Font: 18px mobile, 20px desktop, weight 400, slate-400

### 4.3 Demo Simulator Container

**Card Styling:**
- Background: slate-800
- Border: 1px solid slate-700
- Border-radius: 16px
- Padding: 24px (mobile) / 32px (desktop)
- Max-width: 600px, margin: 0 auto
- Shadow: `0 10px 15px -3px rgba(0,0,0,0.5)`

**Step Indicator (Top):**
```
○─────○─────○
1     2     3
```
- Filled circle (active): emerald-500, 12px diameter
- Empty circle (inactive): slate-600, 12px diameter
- Connector line: 2px, slate-700 (active: emerald-500)
- Labels: 12px uppercase, slate-500

### 4.4 Step 1: Lead Input Form

**Title:** "Simulate a Lead" (18px, 600 weight, white)

**Input Fields:**

| Field | Type | Placeholder | Required |
|-------|------|-------------|----------|
| Lead Name | text | "e.g., Sarah Johnson" | ✓ |
| Property Interest | select | "Select property type" | ✓ |
| Lead Source | select | "Where did they come from?" | |

**Input Styling:**
- Background: slate-700
- Border: 1px solid slate-700
- Border-radius: 8px
- Padding: 12px 16px
- Font: 16px, white
- Placeholder: slate-500
- Focus state: border emerald-500, ring 2px emerald-500/20

**Select Options:**
- Property: "Single Family Home", "Condo/Townhome", "Luxury Property", "Investment Property", "Land/Lot"
- Source: "Zillow", "Realtor.com", "Facebook", "Google Ads", "Referral", "Other"

**Primary Button:**
```
⚡ Send Lead →
```
- Background: emerald-500
- Hover: emerald-600
- Text: white, 16px, weight 600
- Padding: 14px 28px
- Border-radius: 8px
- Width: full (mobile) / auto (desktop)
- Icon: Zap, 16px, left-margin 8px
- Loading: Spinner replaces icon, text becomes "Sending..."
- Disabled: opacity 0.5, cursor not-allowed

**Validation:**
- Inline error message below field, red-400, 14px
- Message: "Please enter a lead name" / "Please select a property type"

### 4.5 Step 2: AI Processing Visualization

**Timeline Progress Bar:**
```
⚡ Lead Received ──────●──────────○
    ✓               AI Processing   Delivering
```

- 3 stages with icons + labels
- Active stage: emerald color, pulsing dot (scale 1.1 animation)
- Completed stage: emerald checkmark
- Connector line: animates fill left-to-right

**AI Thinking Card:**
- Background: slate-700
- Border-radius: 12px
- Padding: 20px
- Icon: Bot emoji or Lucide `Bot` icon (24px)
- Title: "AI is analyzing..." (16px bold, white)
- Subtitle: Rotating messages every 3 seconds:
  - "Extracting intent and budget..."
  - "Analyzing property preferences..."
  - "Crafting personalized response..."
- Typing indicator: 3 animated dots (● ○ ○ → ○ ● ○ → ○ ○ ●)

**Live Timer:**
- Font: Geist Mono, 48px, weight 700, amber-500
- Format: "04.2s"
- Updates every 100ms using `performance.now()`
- Label below: "Response time" (12px, slate-400)
- Centered below AI thinking card

**Fade Transition:**
- Form fades out: opacity 1 → 0, 200ms ease
- Processing view fades in: opacity 0 → 1, 300ms ease (starts at 100ms)

### 4.6 Step 3: SMS Response Delivered

**Success Header:**
```
✓ Response Delivered in 4.2 seconds
```
- Icon: CheckCircle (32px, emerald-500)
- Text: 20px, weight 600, white
- Subtext: "Here's what your lead would receive:" (14px, slate-400)

**Phone Mockup:**

```
        ┌───────────────────┐
        │  9:41         🔋  │  ← Status bar
        ├───────────────────┤
        │                   │
        │ ┌───────────────┐  │
        │ │ Hey Sarah! 👋 │  │  ← Message bubble
        │ │ Thanks for    │  │
        │ │ your interest │  │
        │ │ in the single │  │
        │ │ family home.  │  │
        │ │               │  │
        │ │ I'd love to   │  │
        │ │ schedule a    │  │
        │ │ showing.      │  │
        │ │               │  │
        │ │ Are you free  │  │
        │ │ this weekend? │  │
        │ └───────────────┘  │
        │                   │
        │ [Message input]   │
        └───────────────────┘
```

**Frame Specs:**
- Width: 260px (mobile) / 320px (desktop)
- Background: #000
- Border-radius: 40px
- Border: 8px solid #1a1a1a
- Inner padding: 16px
- Shadow: `0 25px 50px -12px rgba(0,0,0,0.6)`

**Status Bar:**
- Time: 9:41 (12px, white)
- Battery/signal icons (placeholder emojis)

**Message Bubble:**
- Background: #f0f0f0 (light gray)
- Border-radius: 18px (top-right sharp, rest rounded)
- Padding: 12px 16px
- Font: 14px, dark text
- Max-width: 80% of screen
- Animation: fade-in + scale (0.95 → 1), 400ms cubic-bezier(0.16, 1, 0.3, 1)

**Typing Effect:**
- Characters appear progressively
- 30ms per character
- Cursor blinks at end (optional)

**Response Time Badge:**
```
⚡ 4.2s response time
```
- Position: Below phone, centered, 16px margin-top
- Background: emerald-500/10
- Border: 1px solid emerald-500/30
- Border-radius: full (pill)
- Padding: 8px 16px
- Text: emerald-400, 14px, weight 500
- Icon: Zap, 16px

**Personalization Tags:**
Below badge, show detected attributes:

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🏠 Single│ │ 💰 Budget│ │ 📅 This  │
│ Family   │ │ Ready    │ │ Weekend  │
└──────────┘ └──────────┘ └──────────┘
```

- Background: slate-700
- Text: slate-300, 12px, weight 500
- Border-radius: full (pill)
- Padding: 8px 12px
- Display: flex gap, center, wrap on mobile

**Action Buttons:**
```
[← Try Another Lead]    [Start Free Trial →]
```

- Secondary button: outline style
  - Border: 1px slate-600
  - Text: white, 14px
  - Padding: 12px 24px
  - Border-radius: 8px

- Primary button: emerald fill
  - Background: emerald-500
  - Text: white, 14px, weight 600
  - Padding: 12px 24px
  - Border-radius: 8px
  - Icon: ArrowRight, 14px, right-margin 8px
  - Hover: arrow animates right (+2px)

- Layout: stack on mobile, side-by-side on desktop, gap 12px

### 4.7 Conversion CTA Section

**Background:** Gradient from slate-900 to slate-800
**Padding:** 64px 24px

**Content:**
```
"Ready to Automate Your Lead Responses?"
```
- Font: 28px, weight 700, white

```
"Join hundreds of agents who never miss a lead."
```
- Font: 16px, weight 400, slate-400

**Primary Button:**
```
Start Free Trial — No Credit Card Required →
```
- Padding: 18px 36px
- Font: 18px, weight 600, white
- Background: emerald-500
- Hover: emerald-600 + glow effect
- Glow: `0 0 40px rgba(16,185,129,0.15)`
- Icon: ArrowRight, right-aligned, animates on hover

**Trust Indicators (Below CTA):**
```
✓ 30-day free trial    ✓ No credit card    ✓ Cancel anytime
```
- Icons: CheckCircle, emerald-500, 16px
- Text: 14px, slate-400
- Layout: horizontal on desktop, stacked on mobile
- Gap: 24px

---

## 5. Animations & Interactions

### Page Load Sequence

1. **0ms:** Background visible
2. **100ms:** Header fades in (200ms)
3. **200ms:** Hero text fades in + slides up (300ms ease-out)
4. **400ms:** Demo card fades in + scales (0.95 → 1, 300ms)
5. **600ms:** Form inputs stagger in (50ms between each)

### Form Interactions

**Input Focus:**
- Border color: 150ms ease
- Ring: 2px emerald-500/20
- Scale: subtle (no transform)

**Button Hover:**
- Background: darken 150ms ease
- Transform: translateY(-1px)
- Shadow: increase

**Button Active:**
- Transform: translateY(0)
- Scale: 0.98

### Processing State

**Timeline Connector:**
- Line fills left-to-right
- Duration: matches actual API response time
- Color: animates from slate-600 to emerald-500

**Timeline Dots:**
- Active dot: scale 1 → 1.1 → 1, infinite pulse (1.2s)
- Completed dot: scale 0.9 → 1, spring bounce (300ms)

**Typing Dots:**
```
● ○ ○  →  ○ ● ○  →  ○ ○ ●  →  repeat
```
- Each dot: 200ms fade
- Staggered by 150ms

**Timer Update:**
- Smooth number transitions
- Decimal updates every 100ms
- Color: amber-500 (constant)

### Success State

**Phone Mockup Entry:**
- Start: opacity 0, translateY(20px), scale(0.95)
- End: opacity 1, translateY(0), scale(1)
- Duration: 400ms
- Easing: cubic-bezier(0.16, 1, 0.3, 1)

**Checkmark:**
- SVG stroke animation: draw path
- Duration: 300ms
- Followed by subtle pulse

**Message Bubble:**
- Character-by-character typing
- 30ms per character
- Cursor blinks (optional)

---

## 6. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Adjustments |
|------------|-------|-------------|
| Mobile | < 640px | Single column, full-width inputs, stacked buttons |
| Tablet | 640-1024px | Wider cards, side-by-side buttons |
| Desktop | > 1024px | Max-width 600px card, larger typography |

### Mobile-Specific (< 640px)

- Hero headline: 32px
- Demo card: full-width minus 32px margin
- Phone mockup: 260px width
- All buttons: full width, stacked vertically
- Timeline: vertical connector instead of horizontal
- Padding: 16px instead of 24px

### Desktop-Specific (> 1024px)

- Hero headline: 48px
- Demo card: 600px max-width, centered
- Phone mockup: 320px width
- Buttons: side-by-side
- Timeline: horizontal connector with smooth lines

---

## 7. Analytics Event Markers

Add `data-analytics` attributes to elements for tracking (implementation hook for dev):

```html
<!-- Lead form submission -->
<form data-analytics="demo-started">
  <input data-analytics-field="lead_name" />
  <select data-analytics-field="property_type" />
  <button data-analytics="demo-submit">Send Lead</button>
</form>

<!-- Success view -->
<div data-analytics="demo-completed">
  <!-- CTA button -->
  <button data-analytics="demo-cta-clicked" href="/signup/trial">
    Start Free Trial
  </button>
</div>
```

**Events to log:**
- `demo_started` — form first interaction
- `demo_response_generated` — AI response received
- `demo_completed` — success state shown
- `demo_cta_clicked` — CTA button clicked

**Event properties:**
- response_time_ms
- property_type
- lead_source
- session_id
- device_type (mobile/desktop)

---

## 8. Accessibility Requirements

### Keyboard Navigation
- Tab order follows visual order
- Enter/Space activates buttons
- Focus indicators visible on all interactive elements
- Escape cancels processing state

### Screen Reader
- All inputs have associated labels
- Live regions announce timer updates
- Status changes announced: "AI is processing your request"
- Success announced: "Response delivered in X seconds"

### Visual
- Contrast: WCAG AA minimum (4.5:1)
- Focus states: never color-only
- Error messages: icon + color + text

### Reduced Motion
- Respect `prefers-reduced-motion` media query
- Disable typing animation
- Instant state transitions instead of animated
- Static checkmarks instead of drawn SVG

---

## 9. Asset Requirements

### Icons (Use Lucide React)

- `Zap` — Send Lead button, response badge
- `Bot` — AI processing indicator
- `MessageSquare` — SMS indicators
- `CheckCircle` — Success states
- `AlertTriangle` — Error states
- `Clock` — Timer/timeline
- `ArrowRight` — CTA arrows
- `RefreshCw` — Retry button

### Custom Graphics

**Phone Frame:**
- CSS-only implementation
- Border-radius: 40px
- Notch optional

**Timeline Connector:**
- CSS gradient line
- Animated with CSS transition

---

## 10. Success Criteria Verification

| PRD Requirement | Design Implementation | Status |
|---|---|---|
| Prospect can run demo in <60 seconds | Single form, 2 required fields, minimal friction | ✓ |
| Demo shows AI-generated SMS | Phone mockup displays personalized message | ✓ |
| Response-time proof <30s | Live timer + final badge with exact timing | ✓ |
| High-intent CTA to trial | Prominent CTA section with trust indicators | ✓ |
| Analytics instrumentation | Data attributes on key interaction points | ✓ |
| Mobile-first responsive | Designed for 375px, scales to desktop | ✓ |
| No auth required | Public route, no login checks | ✓ |
| Accessibility baseline | Keyboard nav, screen reader support, WCAG AA | ✓ |

---

**End of Design Specification**