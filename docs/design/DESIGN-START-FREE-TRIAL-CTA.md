# Design Spec: Start Free Trial CTA — Frictionless Trial Entry for Pilot Recruitment

**Design Document ID:** DESIGN-START-FREE-TRIAL-CTA  
**PRD Reference:** `/docs/prd/PRD-START-FREE-TRIAL-CTA.md`  
**Use Case:** improve-add-start-free-trial-cta-frictionless  
**Version:** 1.0  
**Date:** 2026-03-25  
**Author:** Design Agent  
**Status:** Ready for Development

---

## Overview

This design spec provides visual specifications, component designs, and layout guidelines for the "Start Free Trial" CTA system across the LeadFlow AI marketing landing page. The CTA must appear in three strategic locations (hero, features section, pricing section) with consistent visual treatment and frictionless signup flow.

**Key Goals:**
- Drive trial signup conversion through prominent, accessible CTA placements
- Enable real estate agents to create accounts in <60 seconds with only email + password
- Maintain visual consistency across desktop (1280px) and mobile (375px) viewports
- Provide clear visual distinction between "Start Free Trial" (instant) and "Apply for Pilot" (manual) paths

---

## Design Principles

1. **Maximum Visibility:** CTAs appear above the fold (desktop) and in natural scroll positions (mobile)
2. **Clear Differentiation:** "Start Free Trial" visually distinct from "Apply for Pilot" and secondary CTAs
3. **Trust & Safety:** Copy emphasizes "No credit card required" and "Free for 30 days" prominently
4. **Progressive Disclosure:** Minimal form friction (email + password only at signup)
5. **Responsive Perfection:** Form and CTAs are equally functional on mobile (375px) and desktop (1280px)

---

## Part 1: CTA Visual Treatment

### CTA Button Design

#### Primary "Start Free Trial" Button

**Visual Style:**
- **Background Color:** `#10b981` (emerald-500)
- **Hover State:** `#059669` (emerald-600)
- **Disabled State:** Opacity 50%
- **Border:** None
- **Corner Radius:** 8px (rounded-lg)
- **Padding:** 12px 20px (py-3 px-5) for standard button
- **Typography:**
  - Font Weight: 600 (semibold)
  - Font Size: 16px (base)
  - Color: White (`#ffffff`)
  - Line Height: 1.5
- **Icon:** Arrow right (`→`) on right side, 16px, white, 8px margin-left
- **Box Shadow:** None at rest; subtle shadow on hover (optional elevation)
- **Transition:** 150ms ease-in-out on all color properties

**Loading State:**
- Show spinner icon (Loader2, 16px) on left
- Text changes to "Creating account..." or context-appropriate loading message
- Button remains disabled during loading
- Cursor: not-allowed

**Accessibility:**
- High contrast ratio (white text on emerald background = 4.5:1 or higher)
- Minimum tap target: 44px height on mobile
- Keyboard focus visible outline: `focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2`
- `aria-disabled` attribute when disabled

#### Secondary CTA Variants

**Text-only "See how it works" link:**
- Color: `#9ca3af` (gray-400) on dark backgrounds, underlined
- Hover: Color changes to `#ffffff` (white)
- No button container
- Text decoration: underline, offset 4px
- Used for anchor navigation (scrolls to #features section)

**"Apply for Pilot Program" link (in navigation):**
- Style: Text link matching nav style
- Color: `#4b5563` (slate-600) on light background
- Hover: `#1f2937` (slate-900)
- Location: Header navigation
- Maintains existing visual treatment

---

## Part 2: CTA Placements (3 Locations)

### Placement #1: Hero Section CTA (Above the Fold)

**Location:** `<section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">`

**Layout Structure:**
```
┌─────────────────────────────────────────────┐
│                                             │
│         HERO GRADIENT BACKGROUND            │
│         (Dark slate blue gradient)          │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  AI-Powered Lead Response...        │   │ ← Headline (H2, 40-48px)
│  │  [subheadline text]                 │   │ ← Subheadline (20px, slate-300)
│  │                                     │   │
│  │  ┌─────────────────────────────┐   │   │ ← Trial Signup Form
│  │  │ [Email]    [Password]  [►]  │   │   │
│  │  └─────────────────────────────┘   │   │
│  │  Free for 30 days...                │   │ ← Trust line (12px)
│  │  [See how it works] | [Live Demo]   │   │ ← Secondary CTAs
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─ Pain Points Cards (3 columns) ─────┐   │
│  │ emoji | title | description         │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**Desktop (1280px) Specifications:**
- Section padding: 96px top/bottom (py-24)
- Container max-width: 1024px (max-w-3xl)
- Headline: 48px (text-5xl), bold, white, text-center
- Subheadline: 20px (text-xl), slate-300, text-center
- Form container: max-width 448px (max-w-md), centered horizontally
- Form layout: Horizontal flex (row) on desktop
  - Email input: flex-1
  - Password input: flex-1
  - Submit button: auto width, 44px min height
  - All elements gap-3 between them
- Trust copy: 14px (text-sm), white/60 opacity, centered below form, margin-top-3
- Secondary CTAs: Below trust copy, flex row, center-aligned, gap-4

**Mobile (375px) Specifications:**
- Section padding: 64px top/bottom (py-16)
- Container padding: 16px left/right (px-4)
- Headline: 32px (text-4xl), bold, white, text-center
- Subheadline: 18px (text-lg), slate-300, text-center, margin-bottom-6
- Form container: Full width, max-width 100%
- Form layout: Vertical flex (column) on mobile <640px
  - Email input: Full width
  - Password input: Full width
  - Submit button: Full width, 44px height
  - All elements gap-3 between them
- Trust copy: 12px (text-xs), centered, margin-top-3
- Secondary CTAs: Stacked vertically on very small mobile, flex row on tablets

**Component: Trial Signup Form (Compact Mode)**

When used in hero section, the form uses `compact={true}` mode:

```
Input: Email
┌──────────────────┐
│ Enter your email │
└──────────────────┘

Input: Password (with eye icon toggle)
┌──────────────────────────┐
│ Create password (8+ chr) │ [eye]
└──────────────────────────┘

Button: "Start Free Trial →"
┌──────────────────────────┐
│ Start Free Trial    →    │
└──────────────────────────┘

Trust Line: "Free for 14 days · No credit card · Cancel anytime"
```

**Visual Styling (Compact Form):**
- Input backgrounds: `bg-white/10` (white with 10% opacity on dark background)
- Input borders: `border-white/20` (white with 20% opacity)
- Input text: White
- Input placeholder: `white/60` opacity
- Input focus: Ring `focus:ring-2 focus:ring-emerald-400`
- Button: Standard primary style (emerald)
- Error text: `text-red-400`, margin-top-2, role="alert"

**Responsive Breakpoints:**
- **Mobile (< 640px):** Vertical form stack, full width inputs
- **Tablet (640px - 1024px):** Horizontal form, full width container
- **Desktop (> 1024px):** Horizontal form, centered max-width 448px container

---

### Placement #2: Features Section CTA

**Location:** End of features/benefits section (after 3-column pain points grid)

**Layout Structure:**
```
┌─────────────────────────────────────────────┐
│                                             │
│         FEATURES SECTION                    │
│         (White background)                  │
│                                             │
│  [Features cards, content, etc.]            │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Ready to start?                    │   │ ← Headline (H3, 24-28px)
│  │                                     │   │
│  │  ┌──────────────────────────────┐   │   │ ← Standard (expanded) form
│  │  │ Email: [______________]      │   │   │
│  │  │ Password: [_______] [eye]    │   │   │
│  │  │ Name: [______________]       │   │   │
│  │  │                              │   │   │
│  │  │ [Create My Free Account  →] │   │   │
│  │  │ Free 14d · No CC · Anytime  │   │   │
│  │  │ [Already have account? ...]  │   │   │
│  │  └──────────────────────────────┘   │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**Desktop (1280px) Specifications:**
- Background: White (`bg-white`) with subtle bottom shadow/border if needed
- Section padding: 64px top/bottom (py-16)
- Container max-width: 1024px
- Headline: 28px (text-2xl), bold, slate-900, text-center, margin-bottom-8
- Form container: max-width 420px, centered
- Form layout: Vertical (column) with full-width inputs
- Input styling:
  - Label: 14px (text-sm), bold, slate-700, margin-bottom-1
  - Input: Full width, 44px height (py-3 px-4)
  - Border: 1px solid slate-300
  - Background: White
  - Placeholder text: slate-400
  - Focus: ring-2 ring-emerald-500
- Button: Full width, 44px height, emerald primary style
- Trust line: 12px, centered, slate-400, margin-top-4
- Login link: Small, centered, margin-top-4

**Mobile (375px) Specifications:**
- Section padding: 48px top/bottom (py-12)
- Container padding: 16px (px-4)
- Headline: 24px (text-xl), bold, slate-900, text-center
- Form: Full width, max-width 100%
- Input height: 44px minimum (for mobile touch targets)
- Button: Full width, 44px minimum height

**Component: Trial Signup Form (Expanded Mode)**

When used in features section, form uses default (non-compact) mode:

```
Card Container:
┌────────────────────────────────────┐
│ Start Your Free Trial              │ ← H3, 20px, bold
│ No credit card required · 14 free  │ ← Subtext, 14px, slate-500
│                                    │
│ Email address                      │ ← Label, 14px bold
│ [you@example.com___________]       │ ← Input with placeholder
│                                    │
│ Password                           │ ← Label, 14px bold
│ [Min 8 characters________] [eye]   │ ← Input with toggle
│                                    │
│ Your name (optional)               │ ← Label with optional note
│ [Your name______________]          │ ← Input
│                                    │
│ [Create My Free Account →]         │ ← Full-width button
│ Free for 14 days · No CC · Cancel  │ ← Trust line, 12px
│                                    │
│ Already have an account? Sign in   │ ← Login link, 14px
└────────────────────────────────────┘
```

**Visual Styling (Expanded Form):**
- Card background: White
- Card border: 1px solid slate-200
- Card padding: 32px (p-8)
- Card corner radius: 12px (rounded-xl)
- Card shadow: lg (shadow-lg)
- Labels: 14px bold, slate-700
- Inputs: 44px height, slate-300 border, rounded-lg
- Button: Full width, emerald primary
- Error container: Light red background, red text, 14px, margin-top-4

---

### Placement #3: Pricing Section CTA

**Location:** In pricing section, with pricing tier cards

**Layout Structure:**

```
┌─────────────────────────────────────────────┐
│         PRICING SECTION                     │
│         (Light gray background)             │
│                                             │
│  Pricing Headline & Subtext                 │
│                                             │
│  ┌──────────┬──────────┬──────────┐         │
│  │ Starter  │   Pro    │  Team    │         │ ← Pricing tier cards
│  │ $49/mo   │ $149/mo  │ $399/mo  │         │
│  │          │          │          │         │
│  │ [CTA]    │ [CTA]    │ [CTA]    │         │
│  │  OR      │  OR      │  OR      │         │
│  │ [Trial]  │ [Trial]  │ [Trial]  │         │
│  └──────────┴──────────┴──────────┘         │
│                                             │
│  ──────────────────────────────────────     │
│  Want to try before you buy?                │ ← Trial CTA section below
│  [Full Trial Signup Form]                   │
│  ──────────────────────────────────────     │
│                                             │
└─────────────────────────────────────────────┘
```

**Design Approach #1: "Or Start Free Trial" on Pricing Cards**

On each pricing tier card, below the main "Upgrade Now" button:

```
┌────────────────────────┐
│ Starter                │
│ $49/month              │
│ • Feature 1            │
│ • Feature 2            │
│                        │
│ [Upgrade Now]          │ ← Primary CTA
│                        │
│ Or Try Free First      │ ← Secondary CTA
│ [Start Trial]          │   (text button style)
└────────────────────────┘
```

- "Upgrade Now" button: Standard primary emerald style, full-width
- "Or Try Free First" text: 12px, slate-400, centered, margin-top-3
- "Start Trial" button: Text link style (no background), emerald text, underlined
- On click, scrolls down to full trial signup form OR opens modal

**Design Approach #2: Dedicated Trial Signup Section Below Pricing Cards**

Below the 3-column pricing grid:

```
┌─────────────────────────────────────────────┐
│                                             │
│  Want to try before you buy?                │ ← H3, 28px, bold
│  Start your 30-day Pro trial — no CC req'd  │ ← Subheading, 16px
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ [Trial Signup Form]                  │   │ ← Expanded form (same as #2)
│  └──────────────────────────────────────┘   │
│                                             │
│  [Small text linking to pricing comparison] │
│                                             │
└─────────────────────────────────────────────┘
```

- **Recommended:** Use Approach #2 (dedicated section) for clarity
- Section background: Light slate (slate-50) or white
- Headline: 28px, bold, slate-900, center-aligned
- Subheading: 16px, slate-600, center-aligned, margin-bottom-8
- Form: Same component as Placement #2 (expanded mode)

**Mobile Responsiveness (Pricing Section):**
- On mobile, pricing cards stack vertically (1 column)
- Trial section remains below with full-width form
- All CTAs remain touch-friendly (44px+ height)

---

## Part 3: Form Component Specifications

### Trial Signup Form — Complete Component Spec

**Component Path:** `/product/lead-response/dashboard/components/trial-signup-form.tsx`

**Two Render Modes:**

#### Mode 1: Compact (for Hero CTA)
Props: `compact={true}`

**HTML Structure:**
```jsx
<form onSubmit={handleSubmit}>
  <div className="flex flex-col sm:flex-row gap-3">
    {/* Email Input */}
    <input 
      id="trial-email-compact"
      type="email"
      placeholder="Enter your email"
      aria-describedby={error ? 'trial-error-compact' : undefined}
    />
    
    {/* Password Input with Eye Toggle */}
    <div className="relative">
      <input 
        id="trial-password-compact"
        type={showPassword ? 'text' : 'password'}
        placeholder="Create password (8+ chars)"
      />
      <button type="button" onClick={togglePassword}>
        {showPassword ? <EyeOff /> : <Eye />}
      </button>
    </div>
    
    {/* Submit Button */}
    <button type="submit" disabled={loading}>
      {loading ? <Spinner /> : <>Start Free Trial <Arrow /></>}
    </button>
  </div>
  
  {/* Error Message */}
  {error && <p id="trial-error-compact">{error}</p>}
  
  {/* Trust Copy */}
  <p>Free for 14 days · No credit card · Cancel anytime</p>
</form>
```

**Responsive Behavior:**
- Desktop (> 640px): Horizontal flex row
- Mobile (< 640px): Vertical flex column
- All inputs full-width on mobile

#### Mode 2: Expanded (for Features & Pricing Sections)
Props: `compact={false}` (default)

**HTML Structure:**
```jsx
<form onSubmit={handleSubmit}>
  <div className="card">
    {/* Header */}
    <h3>Start Your Free Trial</h3>
    <p>No credit card required · 14 days free</p>
    
    {/* Form Fields (vertical stack) */}
    <div className="space-y-4">
      {/* Email Field */}
      <div>
        <label>Email address</label>
        <input type="email" placeholder="you@example.com" />
      </div>
      
      {/* Password Field */}
      <div className="relative">
        <label>Password</label>
        <input type={showPassword ? 'text' : 'password'} />
        <button type="button" onClick={togglePassword}>
          {showPassword ? <EyeOff /> : <Eye />}
        </button>
      </div>
      
      {/* Name Field (Optional) */}
      <div>
        <label>Your name <span>(optional)</span></label>
        <input type="text" placeholder="Your name" />
      </div>
    </div>
    
    {/* Error Message */}
    {error && <div className="error-box">{error}</div>}
    
    {/* Submit Button */}
    <button type="submit">
      {loading ? <>Creating account...</> : <>Create My Free Account <Arrow /></>}
    </button>
    
    {/* Trust Copy */}
    <p className="trust-line">Free for 14 days · No credit card · Cancel anytime</p>
    
    {/* Login Link */}
    <p>Already have an account? <a href="/login">Sign in</a></p>
  </div>
</form>
```

### Input Field Specifications

**All Input Fields — Base Styling:**

| Property | Value |
|----------|-------|
| Height (Desktop) | 44px (py-3) |
| Height (Mobile) | 44px minimum |
| Padding | 16px left/right (px-4) |
| Border | 1px solid |
| Border-radius | 8px (rounded-lg) |
| Font-size | 16px (base) |
| Font-weight | 400 (normal) |
| Transition | 150ms ease |

**Light Mode (Default):**
| State | Background | Border | Text | Placeholder |
|-------|-----------|--------|------|-------------|
| Default | White | slate-300 | slate-900 | slate-400 |
| Focus | White | emerald-500 (with ring) | slate-900 | slate-400 |
| Disabled | slate-100 | slate-300 | slate-500 | slate-400 |
| Error | White | red-500 | slate-900 | slate-400 |

**Dark Mode:**
| State | Background | Border | Text | Placeholder |
|-------|-----------|--------|------|-------------|
| Default | slate-800 | slate-600 | white | slate-400 |
| Focus | slate-800 | emerald-500 (with ring) | white | slate-400 |
| Disabled | slate-700 | slate-600 | slate-500 | slate-400 |
| Error | slate-800 | red-500 | white | slate-400 |

**Focus State:**
- Ring: 2px solid emerald-500 (`focus:ring-2 focus:ring-emerald-500`)
- Ring offset: 2px (4px total focus area)
- Outline: None (replaced by ring)
- Transition: 150ms

**Placeholder Text:**
- Opacity: 60% of text color
- Font: Same as input (inherited)
- No styling change on focus

**Label Styling:**
- Font-size: 14px (text-sm)
- Font-weight: 500 (medium)
- Color: slate-700 (light mode), slate-300 (dark mode)
- Margin-bottom: 8px (mb-1)
- Font-family: Inherited

### Button Specifications

**Primary Button — "Create My Free Account" / "Start Free Trial"**

| Property | Value |
|----------|-------|
| Background (Rest) | `#10b981` (emerald-500) |
| Background (Hover) | `#059669` (emerald-600) |
| Background (Active) | `#047857` (emerald-700) |
| Text Color | White (#ffffff) |
| Border | None |
| Border-radius | 8px (rounded-lg) |
| Padding | 12px 24px (py-3 px-6) |
| Height | 44px minimum |
| Font-size | 16px (base) |
| Font-weight | 600 (semibold) |
| Letter-spacing | -0.01em |
| Transition | 150ms ease |
| Cursor | pointer (or not-allowed when disabled) |

**Button Content (Compact Mode):**
- Text: "Start Free Trial"
- Icon: Arrow right (ArrowRight from lucide-react, 16px)
- Layout: Flex row, centered, gap-2

**Button Content (Expanded Mode):**
- Text: "Create My Free Account"
- Icon: Arrow right (ArrowRight from lucide-react, 16px)
- Layout: Flex row, centered, gap-2

**Loading State:**
- Icon: Spinner (Loader2 from lucide-react, 16px, animate-spin)
- Text: Changes to "Creating account..." or "Processing..."
- Opacity: 60% or disabled appearance
- Pointer-events: None
- Cursor: not-allowed

**Disabled State:**
- Opacity: 50%
- Cursor: not-allowed
- Pointer-events: None

**Focus State:**
- Ring: 2px solid emerald-400
- Ring-offset: 2px
- No additional outline

### Error Message Specifications

**Inline Error (Compact Mode):**
- Position: Below form, margin-top-2
- Typography: 14px (text-sm), color red-400 (dark mode)
- Background: None
- Padding: None
- Font-weight: 400 (normal)
- Line-height: 1.5

**Duplicate Email Error (Special Case):**
```
An account with this email already exists. [Sign in]
```
- "Sign in" is a link: color red-300/400, underline
- Link targets: `/login` with email pre-filled if possible

**Block Error (Expanded Mode):**
- Position: Below form fields, before button
- Background: Light red (red-50 light mode, red-900/20 dark mode)
- Border: 1px solid red-200 (light), red-800 (dark)
- Border-radius: 8px (rounded-lg)
- Padding: 12px 16px (p-3)
- Typography: 14px (text-sm), bold or normal weight
- Text color: red-600 (light), red-400 (dark)
- Role: `role="alert"` for screen readers

**Validation Messages:**
- Real-time on blur or onChange
- Email validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password validation: Min 8 characters
- Error message replaces placeholder text dynamically

---

## Part 4: Visual Hierarchy & Typography

### Typography Scale

| Usage | Font-size | Weight | Line-height | Color |
|-------|-----------|--------|-------------|-------|
| Hero H2 | 48px (desktop), 32px (mobile) | 700 bold | 1.2 | white |
| Section H3 | 28px | 700 bold | 1.3 | slate-900 |
| Form card H3 | 20px | 700 bold | 1.5 | slate-900 |
| Subheading | 20px (desktop), 18px (mobile) | 400 normal | 1.5 | slate-300 (dark bg), slate-600 (light bg) |
| Input label | 14px | 500 medium | 1.5 | slate-700 (light), slate-300 (dark) |
| Button text | 16px | 600 semibold | 1.5 | white |
| Trust copy | 14px (base), 12px (compact) | 400 normal | 1.5 | slate-400 |
| Error text | 14px | 400 normal | 1.5 | red-400 |
| Small text | 12px | 400 normal | 1.5 | slate-500 |

### Color Palette

**Primary Brand Colors:**
- Primary Action: `#10b981` (emerald-500)
- Primary Hover: `#059669` (emerald-600)
- Primary Dark: `#047857` (emerald-700)

**Neutral Colors (Light Mode):**
- Background: `#ffffff` (white)
- Surface: `#f8fafc` (slate-50)
- Border: `#cbd5e1` (slate-300)
- Text Primary: `#0f172a` (slate-900)
- Text Secondary: `#475569` (slate-600)
- Text Tertiary: `#94a3b8` (slate-400)
- Placeholder: `#cbd5e1` (slate-300) with 60% opacity

**Neutral Colors (Dark Mode):**
- Background: `#0f172a` (slate-950)
- Surface: `#1e293b` (slate-900)
- Border: `#334155` (slate-700)
- Text Primary: `#f1f5f9` (slate-100)
- Text Secondary: `#cbd5e1` (slate-300)
- Text Tertiary: `#94a3b8` (slate-400)

**Status Colors:**
- Error: `#dc2626` (red-600) / `#f87171` (red-400 dark)
- Success: `#16a34a` (green-600)
- Warning: `#ea580c` (orange-600)

---

## Part 5: Responsive Design Grid

### Desktop (1280px and above)

**Hero Section:**
- Container max-width: 1024px
- Form max-width: 448px
- Form layout: Horizontal (3 inputs/button in row)
- Inputs: 3 equal-width columns with gap-3
- Button: Auto width
- All above fold without scrolling

**Features Section:**
- Container max-width: 1024px
- Form max-width: 420px
- Form layout: Vertical (inputs stacked)
- Headline: 28px

**Pricing Section:**
- Tier cards: 3 columns (flex: 0 1 calc(33.333% - gap))
- Gap between cards: 24px
- Trial section below: Full width
- Form max-width: 420px

### Tablet (768px - 1024px)

**Hero Section:**
- Form layout: Horizontal, may wrap on smaller tablets
- Container padding: 24px left/right
- Form max-width: Full width - padding

**Features/Pricing:**
- Form max-width: Full width with padding
- Pricing cards: May stack to 2-column layout depending on screen

### Mobile (375px - 768px)

**All Sections:**
- Container padding: 16px left/right (px-4)
- Form max-width: 100% with padding
- Form layout: Vertical stack (all inputs full-width)
- Inputs height: 44px (touch-friendly)
- Button height: 44px minimum
- Gap between elements: 12px (gap-3)

**Hero Section (Mobile):**
- Form appears in hero as is (can be inline or modal alternative)
- Headline: 32px (text-4xl)
- Subheading: 18px (text-lg)
- Section padding: 64px top/bottom (py-16)

**Very Small Mobile (< 375px):**
- Container padding: 12px left/right
- Form inputs: 40px height if space allows
- Typography scales down proportionally
- Button text may truncate (use ellipsis or abbreviate)

---

## Part 6: Responsive Breakpoints

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| xs | < 480px | Very small phones |
| sm | ≥ 640px | Portrait tablets / landscape phones |
| md | ≥ 768px | Landscape tablets |
| lg | ≥ 1024px | Small laptops |
| xl | ≥ 1280px | Desktop (target design) |
| 2xl | ≥ 1536px | Large monitors |

**Key Breakpoints for This Design:**
1. **Mobile (< 640px):** Vertical form, full-width inputs, stacked layout
2. **Tablet (640px - 1024px):** Transitional (form may be horizontal or vertical)
3. **Desktop (≥ 1024px):** Horizontal form in hero, vertical elsewhere, centered containers

---

## Part 7: Component States & Interactions

### Form States

#### 1. Default / Empty State
- All inputs empty
- Password eye icon visible but inactive
- Button: Enabled, no loading state
- No error message visible

#### 2. Filled State
- Email entered (valid format)
- Password entered (≥ 8 chars)
- Name optional (may be empty)
- Button: Enabled, ready to submit
- Password eye icon toggleable

#### 3. Focus State
- Input has focus ring (emerald-500)
- Input border changes to emerald-500
- Cursor is in field
- Label text may remain visible (for accessibility)

#### 4. Invalid State (Email)
- Email entered but invalid format
- Red border on input or error message below
- Error text: "Please enter a valid email address"
- Button may remain enabled (validate on submit, not blur)

#### 5. Invalid State (Password)
- Password < 8 characters
- Red border or error message below
- Error text: "Password must be at least 8 characters"
- Button may remain enabled

#### 6. Loading State
- Form inputs: Disabled (opacity-50)
- Button: Shows spinner icon + "Creating account..."
- Button text changes dynamically
- Cursor: Not-allowed
- No user input accepted

#### 7. Error State (Submission Error)
- Network or server error
- Error message: "Something went wrong. Please try again."
- Form remains populated (user can retry)
- Inputs: Re-enabled
- Button: Re-enabled, icon returns to normal

#### 8. Error State (Duplicate Email)
- 409 Conflict or "already exists" error
- Error message: "An account with this email already exists. [Sign in]"
- "Sign in" link is clickable, targets `/login?email={entered_email}`
- Form inputs: Re-enabled
- Email input may be focused for correction

#### 9. Success State
- Form submits successfully
- Brief confirmation (optional visual feedback)
- Redirect to `/setup` or `/dashboard/onboarding` within 1-2 seconds
- Loading state persists during redirect

### Eye Icon Toggle Interaction

**Password Visibility Toggle:**
- Icon location: Right side of password input (12px from right edge)
- Icon size: 16px
- Icon color: slate-400 (normal), slate-600 (hover)
- On click: Password input type switches between "password" and "text"
- Eye icon changes: Eye (closed) ↔ Eye Off (slashed)
- Tabindex: -1 (not keyboard accessible separately)
- Aria-label: "Show password" or "Hide password"
- No validation triggered on toggle

---

## Part 8: Accessibility Specifications

### WCAG 2.1 AA Compliance

**Color Contrast:**
- White text on emerald-500: 4.5:1 (AAA level)
- Form text on white input: 7:1 (AAA level)
- slate-400 text on white: 4.8:1 (AAA level)
- All error messages: 4.5:1 minimum

**Form Labels & Inputs:**
- Every input has associated `<label>` with `for="id"` matching input `id`
- Required fields indicated clearly (can use `required` attribute, or visual indicator + aria-required)
- Optional fields labeled "(optional)" in label text
- Inputs have semantic `type` attributes (email, password, text)

**Focus Management:**
- Focus visible on all interactive elements (ring or outline)
- Focus order is logical: left-to-right, top-to-bottom
- Eye toggle button: `tabindex={-1}` (skips in tab order, mouse-only)
- Form submit: Tab-accessible

**Error Messaging:**
- Error messages have `role="alert"` (screen reader announces immediately)
- Error messages associated with inputs via `aria-describedby`
- Duplicate email error link: Focus visible, keyboard accessible

**Touch Targets:**
- All buttons: 44px minimum height (mobile)
- All inputs: 44px minimum height
- All links: 44px minimum in touch context
- Spacing between interactive elements: ≥ 8px

**Keyboard Navigation:**
- Form fully navigable with Tab/Shift+Tab
- Enter submits form (on submit button)
- Password eye toggle: Mouse/pointer only (not keyboard)
- Can reach all interactive elements without mouse

**Screen Reader Support:**
- Form has semantic structure (`<form>`, `<label>`, `<input>`)
- Error messages announced immediately
- Button loading state announced (text changes)
- Aria attributes used where needed:
  - `aria-describedby` on inputs with errors
  - `aria-required` on required inputs (if not using HTML `required`)
  - `aria-label` on icon buttons

**Responsive Text:**
- Font sizes remain readable on all screen sizes
- Line height: ≥ 1.5 (150%) for body text
- Sufficient padding around text in form fields

---

## Part 9: Dark Mode Specifications

All components support both light and dark modes. Toggle is likely at system level or user preference.

**Dark Mode Theme Variables:**

```css
/* Backgrounds */
bg-slate-950  /* Page background */
bg-slate-900  /* Card/input background */
bg-slate-800  /* Hover backgrounds */

/* Text */
text-white            /* Primary text */
text-slate-100        /* Secondary text */
text-slate-300        /* Tertiary text */
text-slate-400        /* Placeholder, meta */

/* Borders */
border-slate-700      /* Input borders */
border-slate-800      /* Less prominent borders */

/* Emerald (Primary) */
emerald-500           /* Button background */
emerald-600           /* Button hover */
emerald-400           /* Focus ring */

/* Errors */
red-600               /* Error background */
red-400               /* Error text */
```

**Dark Mode Overrides:**
- Input backgrounds: `dark:bg-slate-800` instead of white
- Input borders: `dark:border-slate-600` instead of slate-300
- Text: `dark:text-white` instead of slate-900
- Placeholder: `dark:placeholder-slate-400` (same in both modes)

**Hero Section (Dark Gradient Background):**
- Always dark (gradient from-slate-900 via-slate-800)
- Text remains white in all modes
- Form inside uses light input styling (white backgrounds) for contrast

---

## Part 10: Implementation Notes for Development

### Key Implementation Guidelines

1. **Reuse Existing Component:** `TrialSignupForm` already exists at `/product/lead-response/dashboard/components/trial-signup-form.tsx` — extend it with props for different placements rather than creating new components

2. **UTM Pass-Through:** Form automatically captures UTM params from URL query and includes them in the POST request to `/api/auth/trial-signup`

3. **Redirect Location:** After successful signup, user redirects to `/setup` (onboarding wizard) or `/dashboard/onboarding`

4. **Trial Account Provisioning:** Backend API at `/api/auth/trial-signup` handles:
   - Creating Supabase auth user
   - Inserting `agents` record with `plan_tier='trial'`, `trial_ends_at`=30 days from now
   - Logging analytics event
   - Returning auth token and redirect URL

5. **Form Validation:** 
   - Email: Real-time on blur, final check on submit
   - Password: Min 8 chars (enforced on submit)
   - Name: Optional, no validation
   - Consider client-side regex for email: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

6. **Error Handling:**
   - Network timeout: Show generic error message
   - 409 Conflict (duplicate email): Special message with sign-in link
   - 400 Bad Request: Show server-provided error message
   - 5xx Server Error: Generic error message

7. **Locale/Internationalization:** No i18n required for MVP (English only)

8. **Analytics Tracking:** Existing GA4 integration via `trackCTAClick()` and `trackFormEvent()` — ensure all button clicks and form submissions are tracked with appropriate IDs and sections

9. **Loading Indicator:** Use `Loader2` component from lucide-react (already in use), add `animate-spin` class

10. **Responsive Images/Icons:** Use lucide-react icons (ArrowRight, Eye, EyeOff, Loader2) — no image assets needed

---

## Part 11: Success Metrics & Testing

### Visual Testing Checklist

- [ ] CTA visible above fold on desktop (1280px)
- [ ] CTA visible above fold on mobile (375px)
- [ ] Form layout switches from horizontal (desktop) to vertical (mobile)
- [ ] All inputs are 44px height on mobile
- [ ] All buttons are 44px height on mobile
- [ ] Focus ring visible on all inputs and buttons
- [ ] Dark mode colors render correctly
- [ ] Eye icon toggles password visibility
- [ ] Error messages display correctly below form
- [ ] Loading spinner shows during form submission
- [ ] Duplicate email error shows correct message
- [ ] Form inputs remain populated on error (not cleared)
- [ ] Trust copy text is visible and readable
- [ ] All text meets contrast requirements

### Responsive Testing Checklist

**Desktop (1280px):**
- [ ] Form fits horizontally in hero section
- [ ] No horizontal scrolling
- [ ] All three CTAs visible (hero, features, pricing)

**Tablet (768px):**
- [ ] Form may wrap or remain horizontal
- [ ] No text overflow
- [ ] Inputs responsive

**Mobile (375px):**
- [ ] Form stacks vertically
- [ ] Inputs full-width with proper padding
- [ ] Button reaches 44px height
- [ ] All elements touch-friendly
- [ ] No horizontal scrolling
- [ ] Form remains on-screen (not off-viewport)

**Very Small Mobile (< 375px):**
- [ ] Layout remains usable
- [ ] Text doesn't overflow
- [ ] Inputs remain touch-friendly

---

## Part 12: Design Tokens Summary

For developers implementing this design, here's a quick reference:

### Button
```
Primary: emerald-500 (hover: emerald-600)
Padding: py-3 px-6
Height: 44px minimum
Text: semibold, 16px, white
Icon: ArrowRight, 16px, white
Focus: ring-2 ring-emerald-400
```

### Input
```
Height: 44px
Padding: px-4 py-3
Border: 1px solid slate-300
Border-radius: rounded-lg
Focus: ring-2 ring-emerald-500
Placeholder: slate-400, 60% opacity
```

### Form Card
```
Background: white (dark: slate-900)
Border: 1px slate-200 (dark: slate-700)
Border-radius: rounded-xl
Padding: p-8
Shadow: shadow-lg
Max-width: 420px
```

### Typography
```
H2 (Hero): 48px, 700, white
H3 (Section): 28px, 700, slate-900
Label: 14px, 500, slate-700
Button: 16px, 600, white
Trust copy: 14px, 400, slate-400
```

### Spacing
```
Section padding: py-16 (mobile), py-24 (desktop)
Container padding: px-4 (mobile), px-6 (desktop)
Gap between form elements: gap-3
Gap between components: gap-4 or gap-6
```

---

## Part 13: File References

**Design System:**
- `/product/lead-response/dashboard/tailwind.config.ts` — color definitions, spacing scale
- `/product/lead-response/dashboard/app/globals.css` — global styles and utilities

**Components:**
- `/product/lead-response/dashboard/components/trial-signup-form.tsx` — form component (extend with mode props)
- `/product/lead-response/dashboard/app/page.tsx` — landing page (hero placement)
- `/product/lead-response/dashboard/app/pricing/page.tsx` — pricing section (placement #3)
- `/product/lead-response/dashboard/components/PricingSection.tsx` — pricing tier cards

**API Endpoint:**
- `/api/auth/trial-signup` — handles form submission, account creation, trial provisioning

**Analytics:**
- `/product/lead-response/dashboard/lib/analytics/ga4.ts` — GA4 integration (trackCTAClick, trackFormEvent)

---

## Conclusion

This design spec provides comprehensive visual guidelines for the "Start Free Trial" CTA system across the LeadFlow AI marketing landing page. The design prioritizes **frictionless signup** (email + password only), **maximum visibility** (three placements), and **accessibility** (WCAG AA, touch-friendly, keyboard navigable).

**Key Deliverables for Development:**
1. Extend `TrialSignupForm` component with `compact` prop for hero mode
2. Implement CTA in hero section with compact form
3. Implement "Features Section CTA" with expanded form
4. Implement "Pricing Section CTA" with trial section below pricing cards
5. Ensure responsive behavior on mobile (375px) and desktop (1280px)
6. Test form validation, error handling, and duplicate email detection
7. Verify GA4 tracking on all CTA clicks and form submissions
8. Accessibility testing: Focus management, color contrast, keyboard navigation

---

**Design Spec Version:** 1.0  
**Status:** Ready for Implementation  
**Next Step:** Hand off to Development  
**Approval:** Pending PM Review
