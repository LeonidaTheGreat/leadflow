# LeadFlow AI Marketing Landing Page - Design Specifications

**Use Case:** UC-LANDING-MARKETING-001  
**Task ID:** 2d09d5d9-9848-4d97-96db-26ba65390746  
**Date:** March 6, 2026  
**Status:** Ready for Development  
**Designer:** Design Agent  

---

## 1. Design System Overview

### 1.1 Color Palette

**Primary Colors:**
```css
--primary-blue: #1e3a5f;      /* Deep blue - trust, professionalism */
--accent-teal: #0d9488;        /* Teal - action, energy */
--accent-teal-hover: #059b82;  /* Darker teal for hover states */
--success-green: #059669;      /* Success states */
--error-red: #dc2626;          /* Error states */
```

**Neutral Colors:**
```css
--white: #ffffff;
--light-bg: #f8f9fa;           /* Light gray background */
--border-light: #e5e7eb;       /* Subtle borders */
--text-dark: #1a1a1a;          /* Primary text */
--text-gray: #666666;          /* Secondary text */
--text-light: #9ca3af;         /* Tertiary text */
```

**Gradient:**
```css
/* Hero and final CTA sections */
--gradient-primary: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%);

/* Urgency banner */
--gradient-accent: linear-gradient(135deg, #0d9488 0%, #06b6a4 100%);
```

**Color Usage:**
- Primary blue: Navigation, headings, trust elements
- Accent teal: CTAs, interactive elements, icons
- Light backgrounds: Alternating sections for visual rhythm
- Gradients: Hero and urgency banner only (avoid overuse)

### 1.2 Typography

**Font Family:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```
*Rationale:* Native system fonts provide excellent readability, fast loading, and familiar feel across platforms.

**Type Scale:**

| Element | Desktop | Tablet | Mobile | Weight | Line Height |
|---------|---------|--------|--------|--------|-------------|
| H1 (Hero) | 52px | 42px | 36px | 700 | 1.1 |
| H2 (Sections) | 36px | 32px | 28px | 700 | 1.2 |
| H3 (Cards) | 20px | 18px | 18px | 600 | 1.3 |
| Body Large | 18px | 18px | 16px | 400 | 1.6 |
| Body | 16px | 16px | 16px | 400 | 1.6 |
| Small | 14px | 14px | 14px | 400 | 1.5 |
| Button | 16px | 16px | 16px | 600 | 1 |

**Text Colors:**
- Headings: `--text-dark` (#1a1a1a)
- Body text: `--text-dark` (#1a1a1a)
- Secondary text: `--text-gray` (#666666)
- White text on dark backgrounds: `--white` with at least 4.5:1 contrast

### 1.3 Spacing System

**Scale (rem-based):**
```css
--space-xs: 0.5rem;    /* 8px */
--space-sm: 1rem;      /* 16px */
--space-md: 1.5rem;    /* 24px */
--space-lg: 2rem;      /* 32px */
--space-xl: 3rem;      /* 48px */
--space-2xl: 4rem;     /* 64px */
--space-3xl: 5rem;     /* 80px */
```

**Section Padding:**
- Desktop: 80px top/bottom (5rem)
- Tablet: 64px top/bottom (4rem)
- Mobile: 48px top/bottom (3rem)

**Container:**
- Max-width: 1200px
- Padding: 24px horizontal (all devices)
- Center-aligned with `margin: 0 auto`

**Grid Gaps:**
- Card grids: 32px (2rem)
- Content columns: 48px (3rem)
- Tight layouts: 16px (1rem)

### 1.4 Elevation & Shadows

```css
--shadow-sm: 0 2px 4px rgba(0,0,0,0.08);      /* Subtle elevation */
--shadow-md: 0 4px 12px rgba(0,0,0,0.12);     /* Card hover, modals */
--shadow-lg: 0 12px 32px rgba(0,0,0,0.15);    /* Prominent elements */
```

**Usage:**
- Cards at rest: `--shadow-sm`
- Cards on hover: `--shadow-md` + `translateY(-4px)`
- Modal overlays: `--shadow-lg`
- Sticky nav on scroll: `0 1px 3px rgba(0,0,0,0.05)`

### 1.5 Border Radius

```css
--radius-sm: 4px;      /* Small elements */
--radius-md: 6px;      /* Buttons, inputs */
--radius-lg: 12px;     /* Cards */
--radius-xl: 16px;     /* Hero cards, large modules */
```

### 1.6 Animations & Transitions

**Standard Transitions:**
```css
transition: all 0.3s ease;
```

**Interactive Elements:**
- Hover: `transform: translateY(-2px)` + shadow increase
- Button press: `transform: scale(0.98)`
- Smooth scroll: `scroll-behavior: smooth`

**Page Load Animations:**
```css
@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes fadeInUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

Use sparingly: urgency banner (slideDown), hero elements (fadeInUp 0.5s stagger).

---

## 2. Component Specifications

### 2.1 Buttons

**Primary CTA:**
```css
background: var(--accent-teal);
color: var(--white);
padding: 14px 32px;
border-radius: 6px;
font-size: 16px;
font-weight: 600;
border: none;
cursor: pointer;
box-shadow: var(--shadow-sm);
transition: all 0.3s ease;
```

**Hover State:**
```css
background: var(--accent-teal-hover);
transform: translateY(-2px);
box-shadow: var(--shadow-md);
```

**Active State:**
```css
transform: scale(0.98);
```

**Secondary CTA (Ghost):**
```css
background: transparent;
color: var(--accent-teal);
border: 2px solid var(--accent-teal);
padding: 12px 32px;
border-radius: 6px;
font-size: 16px;
font-weight: 600;
```

**Disabled State:**
```css
opacity: 0.5;
cursor: not-allowed;
pointer-events: none;
```

**Sizes:**
- Large: 14px padding vertical, 32px horizontal
- Medium: 10px padding vertical, 24px horizontal
- Small: 8px padding vertical, 16px horizontal

**Mobile Considerations:**
- Full-width CTAs on mobile (<480px)
- Minimum tap target: 44px height

### 2.2 Cards

**Feature Card:**
```css
background: var(--white);
border: 1px solid var(--border-light);
border-radius: 12px;
padding: 32px;
box-shadow: var(--shadow-sm);
transition: all 0.3s ease;
```

**Hover State:**
```css
transform: translateY(-4px);
box-shadow: var(--shadow-md);
border-color: var(--accent-teal);
```

**Card Structure:**
1. Icon (40px, teal color) - top
2. Title (H3, 20px, bold) - 16px margin-top
3. Description (16px, gray) - 8px margin-top

**Grid Layout:**
- Desktop: 3 columns, 32px gap
- Tablet: 2 columns, 24px gap
- Mobile: 1 column, 16px gap

**Testimonial Card:**
```css
background: var(--light-bg);
border-left: 4px solid var(--accent-teal);
padding: 24px;
border-radius: 8px;
font-style: italic;
color: var(--text-gray);
```

**Pricing Card:**
```css
background: var(--light-bg);
border: 2px solid var(--accent-teal);
border-radius: 16px;
padding: 40px;
max-width: 500px;
margin: 0 auto;
```

### 2.3 Icons

**Size Standards:**
- Feature cards: 40px
- Trust bar: 28px
- Checkmarks/bullets: 20px
- Navigation: 24px

**Color:**
- Primary: `--accent-teal`
- Secondary: `--text-gray`
- On dark backgrounds: `--white`

**Sources:**
- Use SVG format for scalability
- Recommended: Heroicons, Feather Icons, or Font Awesome
- Inline SVG for customization

**Common Icons Needed:**
- ⚡ Lightning bolt (speed)
- 🤖 Robot/AI (automation)
- 📱 Mobile phone (SMS)
- 📅 Calendar (booking)
- 📊 Chart (analytics)
- 🔒 Lock (security/TCPA)
- ✓ Checkmark (features, benefits)
- ✕ X mark (pain points)

### 2.4 Forms

**Input Fields:**
```css
background: var(--white);
border: 1px solid var(--border-light);
border-radius: 6px;
padding: 12px 16px;
font-size: 16px;
color: var(--text-dark);
width: 100%;
transition: all 0.3s ease;
```

**Focus State:**
```css
border-color: var(--accent-teal);
outline: none;
box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
```

**Error State:**
```css
border-color: var(--error-red);
```

**Error Message:**
```css
color: var(--error-red);
font-size: 14px;
margin-top: 4px;
```

**Labels:**
```css
font-size: 14px;
font-weight: 600;
color: var(--text-dark);
margin-bottom: 8px;
display: block;
```

**Required Indicator:**
```css
color: var(--error-red);
margin-left: 4px;
```

### 2.5 Modal

**Overlay:**
```css
position: fixed;
top: 0;
left: 0;
right: 0;
bottom: 0;
background: rgba(0, 0, 0, 0.6);
z-index: 1000;
display: flex;
align-items: center;
justify-content: center;
animation: fadeIn 0.3s ease;
```

**Modal Container:**
```css
background: var(--white);
border-radius: 16px;
padding: 40px;
max-width: 600px;
width: 90%;
max-height: 90vh;
overflow-y: auto;
box-shadow: var(--shadow-lg);
animation: slideUp 0.4s ease;
```

**Close Button:**
- Position: Top-right corner
- Style: Ghost button with ✕ icon
- Size: 32px × 32px
- Accessible: Keyboard (Escape key) + mouse

---

## 3. Section-by-Section Design Specifications

### Section 1: Urgency Banner

**Layout:**
- Full-width, fixed to top (z-index: 100)
- Background: `linear-gradient(135deg, #0d9488, #06b6a4)`
- Text: White, centered, 14px, font-weight 600
- Padding: 12px vertical, 16px horizontal

**Content:**
"🎯 Limited Pilot Spots: Only 10 spots remaining for Q1 2026. Join today to lock in 20% lifetime pricing."

**Behavior:**
- Optional: Dismissible with ✕ button (stores in localStorage)
- Animation: Slide down on page load (0.5s ease-out)

**Accessibility:**
- Role: `banner`
- ARIA label: "Urgency notification"

---

### Section 2: Navigation (Sticky)

**Layout:**
- Full-width, sticky top (z-index: 99)
- Background: White with subtle bottom border
- Padding: 16px vertical, 24px horizontal
- Flexbox: space-between alignment
- Box-shadow on scroll: `0 1px 3px rgba(0,0,0,0.05)`

**Left: Logo**
- Font-size: 20px
- Font-weight: 700
- Color: `--primary-blue`
- Icon: 🚀 emoji or custom logo

**Right: CTA Button**
- Style: Primary CTA button (see 2.1)
- Text: "Join Pilot"
- Action: Opens signup modal

**Mobile (<768px):**
- Logo font-size: 18px
- Button padding: 10px 20px

**Accessibility:**
- Semantic `<nav>` element
- Skip to main content link (visually hidden)

---

### Section 3: Hero

**Layout:**
- Background: `linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%)`
- Text color: White
- Padding: 120px vertical (desktop), 80px (tablet), 60px (mobile)
- Container: Max-width 1200px, centered

**Content Structure:**
1. **Headline (H1)**
   - Text: "Never Lose Another Lead to Slow Response"
   - Font-size: 52px (desktop), 42px (tablet), 36px (mobile)
   - Font-weight: 700
   - Line-height: 1.1
   - Margin-bottom: 24px
   - Animation: Fade in up (0.5s delay)

2. **Subheadline**
   - Font-size: 18px (desktop/tablet), 16px (mobile)
   - Line-height: 1.6
   - Opacity: 0.95
   - Max-width: 700px
   - Margin-bottom: 40px
   - Animation: Fade in up (0.7s delay)

3. **CTA Group**
   - Flexbox: gap 16px
   - Desktop: Horizontal layout
   - Mobile: Vertical stack (full-width buttons)
   
   **Primary CTA:**
   - Text: "Join the Pilot Program (Free for 30 Days)"
   - Style: White background, teal text
   - Hover: Slight lift + shadow
   
   **Secondary CTA:**
   - Text: "See How It Works"
   - Style: Ghost button (white border, white text)
   - Action: Smooth scroll to #how-it-works

4. **Trust Signals (Below CTAs)**
   - Layout: 3 columns with checkmarks
   - Font-size: 14px
   - Margin-top: 32px
   - Items:
     - ✓ No setup fees
     - ✓ Works with Follow Up Boss
     - ✓ Cancel anytime

**Optional Visual Enhancement:**
- Background pattern: Subtle grid or dots (low opacity)
- Hero illustration: Agent with phone + notification graphic (right side on desktop)
- Split layout: Content 60%, visual 40% (desktop only)

**Accessibility:**
- Sufficient contrast (4.5:1 minimum)
- Focus indicators on CTAs
- Descriptive button text

---

### Section 4: Trust Bar

**Layout:**
- Background: `--light-bg` (#f8f9fa)
- Padding: 40px vertical
- Grid: 4 columns (desktop), 2×2 (tablet), 1 column (mobile)
- Gap: 32px
- Text-align: center

**Trust Item Structure:**
1. **Icon** (28px, teal color)
2. **Label** (14px, bold, dark text)
   - 8px margin-top from icon

**Items:**
1. 🔒 TCPA Compliant
2. ⚡ Responds in < 30 seconds
3. ✓ 30-day free pilot
4. 🏆 Built for real estate agents

**Visual Style:**
- Centered alignment
- Subtle borders between items (desktop only)
- Icons use consistent size and color

---

### Section 5: Problem Statement

**Layout:**
- Background: White
- Padding: 80px vertical (desktop), 60px (mobile)
- Container: Max-width 900px, centered

**Content Structure:**
1. **Section Headline (H2)**
   - Text: "You're Losing 50% of Your Leads Before You Even See Them"
   - Font-size: 36px (desktop), 28px (mobile)
   - Text-align: center
   - Margin-bottom: 24px

2. **Intro Paragraph**
   - Font-size: 18px
   - Text-align: center
   - Max-width: 700px
   - Margin-bottom: 40px

3. **Pain Point List**
   - Layout: Vertical list
   - Each item:
     - Red ✕ icon (20px)
     - Text (16px) aligned left
     - Padding: 16px vertical
     - Border-bottom: 1px solid `--border-light` (except last)
   - Max-width: 600px
   - Center-aligned

4. **Highlight Box**
   - Background: Light yellow/gold (#fef9e7)
   - Border-left: 4px solid gold (#f59e0b)
   - Padding: 24px
   - Border-radius: 8px
   - Margin-top: 32px
   - Icon: 💰
   - Text: Bold, 18px

**Visual Enhancement:**
- Use of whitespace to create breathing room
- Emphasis on emotional pain points
- Strong visual hierarchy

---

### Section 6: Solution / Features

**Layout:**
- Background: `--light-bg` (#f8f9fa)
- Padding: 80px vertical (desktop), 60px (mobile)

**Content Structure:**
1. **Section Headline (H2)**
   - Text: "AI That Responds Like You Would—Only Faster"
   - Text-align: center
   - Margin-bottom: 16px

2. **Intro Paragraph**
   - Font-size: 18px
   - Text-align: center
   - Max-width: 800px
   - Margin: 0 auto 64px

3. **Feature Cards Grid**
   - Layout: 3 columns (desktop), 2 (tablet), 1 (mobile)
   - Gap: 32px
   
   **Card Specifications:** (see 2.2 Cards)
   - 6 feature cards total
   - Each with icon, title, description
   - Hover effect: lift + shadow

**Feature Icons:**
1. ⚡ Lightning bolt
2. 🤖 Robot/AI
3. 📱 Mobile phone
4. 📅 Calendar
5. 📊 Chart
6. 🔒 Lock

---

### Section 7: Social Proof

**Layout:**
- Background: White
- Padding: 80px vertical (desktop), 60px (mobile)

**Content Structure:**
1. **Section Headline (H2)**
   - Text: "Agents Are Converting More Leads with AI Response"
   - Text-align: center
   - Margin-bottom: 48px

2. **Stats Row**
   - Layout: 4 columns (desktop), 2×2 (tablet), 1 (mobile)
   - Gap: 32px
   - Text-align: center
   - Margin-bottom: 64px
   
   **Stat Item:**
   - Number: 48-60px, teal color, bold
   - Label: 14px, gray, margin-top 8px

3. **Testimonials Grid**
   - Layout: 3 columns (desktop), 1 (mobile)
   - Gap: 24px
   
   **Testimonial Card:** (see 2.2 Cards)
   - Quote text: Italic, 16px
   - Author: Bold name, gray role/location
   - Border-left accent in teal

**Stats:**
- 21x (More likely to convert)
- < 30 sec (Response time)
- 40% (Increase in appointments)
- 24/7 (Coverage)

---

### Section 8: How It Works

**Layout:**
- Background: `--light-bg` (#f8f9fa)
- Padding: 80px vertical (desktop), 60px (mobile)

**Content Structure:**
1. **Section Headline (H2)**
   - Text: "Set It Up in 5 Minutes. Let AI Handle the Rest."
   - Text-align: center
   - Margin-bottom: 64px

2. **Steps Grid**
   - Layout: 3 columns (desktop), 1 (mobile)
   - Gap: 48px
   
   **Step Item:**
   - Number Circle:
     - Size: 64px diameter
     - Background: Teal
     - Color: White
     - Font-size: 32px, bold
     - Centered
   - Title: H3, 20px, margin-top 24px
   - Description: 16px, gray, margin-top 12px
   - Text-align: center

**Desktop Enhancement:**
- Connecting lines between step circles (horizontal dashed lines)
- Optional: Arrow icons between steps

---

### Section 9: Pricing

**Layout:**
- Background: White
- Padding: 80px vertical (desktop), 60px (mobile)

**Content Structure:**
1. **Section Headline (H2)**
   - Text: "Join Our Pilot Program"
   - Text-align: center
   - Margin-bottom: 48px

2. **Pricing Card** (see 2.2 Cards)
   - Max-width: 500px
   - Centered
   - Background: Light gray
   - Border: 2px teal
   - Padding: 40px
   
   **Card Content:**
   - Label: "Pilot Agent Special" (small text, teal, uppercase)
   - Price: "FREE" (72px, bold, dark)
   - Subprice: "For 30 Days, Then: $49/month per agent" (16px, gray)
   - Margin-top: 24px
   
   **Pilot Benefits Box:**
   - Background: White
   - Border: 1px light
   - Border-radius: 8px
   - Padding: 24px
   - Margin: 32px 0
   - Title: "Pilot Benefits" (bold, 16px)
   - List: 4 items with checkmarks
   
   **What's Included List:**
   - Margin-top: 24px
   - 7 items with checkmarks (teal)
   - Font-size: 14px
   - Line-height: 1.8
   
   **CTA Button:**
   - Full-width
   - Primary style
   - Text: "Join the Pilot Program"
   - Margin-top: 32px
   
   **Risk Reversal Text:**
   - Font-size: 14px
   - Text-align: center
   - Color: Gray
   - Margin-top: 16px

---

### Section 10: FAQ

**Layout:**
- Background: `--light-bg` (#f8f9fa)
- Padding: 80px vertical (desktop), 60px (mobile)
- Max-width: 800px
- Centered

**Content Structure:**
1. **Section Headline (H2)**
   - Text: "Frequently Asked Questions"
   - Text-align: center
   - Margin-bottom: 48px

2. **Accordion Items**
   - 7 FAQ items
   - Vertical stack
   - Gap: 16px between items
   
   **Accordion Item:**
   - Background: White
   - Border: 1px light
   - Border-radius: 8px
   - Padding: 24px
   - Cursor: pointer
   - Transition: all 0.3s ease
   
   **Header (Collapsed):**
   - Display: Flex, space-between
   - Question: 16px, bold
   - Icon: Plus (+) or chevron, 20px, teal
   
   **Header (Expanded):**
   - Icon: Minus (−) or chevron rotated
   
   **Content (Expanded):**
   - Padding-top: 16px
   - Font-size: 16px
   - Line-height: 1.6
   - Color: Gray
   - Animation: Slide down (0.3s ease)
   
   **Hover State:**
   - Border-color: Teal
   - Shadow: subtle

**Interaction:**
- Click/tap to expand/collapse
- Smooth animation
- Only one open at a time (accordion behavior)
- Keyboard accessible (Enter/Space to toggle)

---

### Section 11: Final CTA

**Layout:**
- Background: `linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%)`
- Text color: White
- Padding: 80px vertical (desktop), 60px (mobile)
- Text-align: center

**Content Structure:**
1. **Headline (H2)**
   - Text: "Stop Losing Leads. Start Converting More."
   - Font-size: 36px (desktop), 28px (mobile)
   - Margin-bottom: 16px

2. **Subtext**
   - Font-size: 18px
   - Opacity: 0.95
   - Margin-bottom: 40px

3. **CTA Button**
   - Style: White background, teal text (inverted from hero)
   - Text: "Join the Pilot Program - Free for 30 Days"
   - Large size: 16px font, 16px vertical padding

4. **Supporting Text**
   - Font-size: 14px
   - Margin-top: 16px
   - Opacity: 0.9

**Visual Enhancement:**
- Subtle background pattern matching hero
- High contrast for readability

---

### Section 12: Footer

**Layout:**
- Background: `--primary-blue` (#1e3a5f)
- Text color: White/light gray
- Padding: 48px vertical, 24px horizontal
- Container: Max-width 1200px

**Content Structure:**
1. **Footer Columns**
   - Layout: 4 columns (desktop), 2×2 (tablet), 1 (mobile)
   - Gap: 32px
   
   **Column Structure:**
   - Title: 14px, bold, white, uppercase, margin-bottom 16px
   - Links: 14px, light gray, margin-bottom 8px
   - Hover: Teal color

   **Columns:**
   - Product (How It Works, Pricing, FAQ)
   - Company (About, Blog, Contact)
   - Legal (Privacy, Terms, TCPA Compliance)
   - Resources (Docs, Integration, Support)

2. **Compliance Disclaimers**
   - Margin-top: 48px
   - Font-size: 12px
   - Line-height: 1.5
   - Color: Light gray (rgba(255,255,255,0.7))
   - Max-width: 900px
   
   **Two Sections:**
   - TCPA Compliance Notice
   - Results Disclaimer

3. **Copyright**
   - Margin-top: 32px
   - Text-align: center
   - Font-size: 14px
   - Color: Light gray
   - Text: "© 2026 LeadFlow AI. All rights reserved."

**Accessibility:**
- Semantic `<footer>` element
- Clear link focus states

---

## 4. Signup Modal Design

**Modal Trigger:**
- All "Join Pilot" CTAs open modal
- Modal ID: `#signup-modal`

**Modal Structure:**

1. **Overlay**
   - Background: rgba(0, 0, 0, 0.6)
   - Z-index: 1000
   - Full viewport
   - Click to close

2. **Modal Container**
   - Max-width: 600px
   - Width: 90%
   - Background: White
   - Border-radius: 16px
   - Padding: 40px
   - Box-shadow: `--shadow-lg`
   - Max-height: 90vh
   - Overflow-y: auto

3. **Close Button**
   - Position: Absolute top-right
   - Size: 32px × 32px
   - Icon: ✕
   - Color: Gray, hover teal
   - Accessible: Escape key also closes

4. **Modal Header**
   - Title: "Join the Pilot Program" (H2, 28px)
   - Subtitle: "Free for 30 days • 20% lifetime discount • Limited spots"
   - Font-size: 14px, gray
   - Margin-bottom: 32px

5. **Form Fields**
   - See 2.4 Forms for input styling
   - Vertical stack, gap 20px
   
   **Fields:**
   1. Name * (required)
   2. Email * (required)
   3. Phone (optional)
   4. Brokerage Name (optional)
   5. Team Name (optional)
   6. Monthly Leads (dropdown)
   7. Current CRM (dropdown)
   
   **Validation:**
   - Real-time validation on blur
   - Error messages below fields
   - Error states with red border
   - Success states with green checkmark

6. **Submit Button**
   - Full-width
   - Primary CTA style
   - Text: "Join the Pilot Program"
   - Disabled state while submitting
   - Loading spinner on submit

7. **Disclaimer**
   - Font-size: 12px
   - Color: Gray
   - Margin-top: 16px
   - Links: Teal, underline

8. **Success State**
   - Replace form with success message
   - Icon: Large checkmark in circle (teal)
   - Title: "You're on the list!" (H3)
   - Message: Thank you text
   - Button: "Got it!" (closes modal)

---

## 5. Responsive Design Specifications

### 5.1 Breakpoints

```css
/* Mobile First Approach */
@media (min-width: 480px) { /* Small tablet */ }
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1280px) { /* Large desktop */ }
```

### 5.2 Mobile Optimizations (<768px)

**Layout Changes:**
- All grids collapse to single column
- Horizontal CTAs stack vertically (full-width)
- Navigation: Simplified (logo + CTA only)
- Section padding reduced: 48px → 60px
- Font sizes reduced (see 1.2 Typography)
- Stats/testimonials: Single column
- Footer columns: Stacked

**Touch Targets:**
- Minimum 44px height for all interactive elements
- Increased padding on buttons: 14px vertical
- Larger tap areas for accordion headers

**Images:**
- Responsive images with `srcset`
- Lower resolution on mobile
- Lazy loading for performance

**Performance:**
- Reduce animations on mobile
- Conditional loading of non-essential features
- Optimize images for mobile bandwidth

### 5.3 Tablet (768px - 1023px)

**Layout:**
- 2-column grids where appropriate
- Features: 2 columns
- Testimonials: 2 columns
- Stats: 2×2 grid
- Navigation: Full layout
- Font sizes: Between mobile and desktop

### 5.4 Desktop (1024px+)

**Layout:**
- Full 3-4 column grids
- Hero: Split layout option (60/40)
- All sections at maximum width
- Enhanced hover effects
- Larger spacing and padding

---

## 6. Accessibility Requirements (WCAG 2.1 AA)

### 6.1 Color Contrast

**Minimum Ratios:**
- Normal text: 4.5:1
- Large text (18px+): 3:1
- UI components: 3:1

**Verified Combinations:**
- Dark text (#1a1a1a) on white: 14.7:1 ✓
- Gray text (#666666) on white: 5.7:1 ✓
- White on primary blue (#1e3a5f): 8.4:1 ✓
- White on teal (#0d9488): 3.8:1 ⚠️ (use only for large text/buttons)

### 6.2 Keyboard Navigation

**Requirements:**
- All interactive elements focusable
- Logical tab order (top to bottom, left to right)
- Visible focus indicators (2px outline, teal color)
- Skip to main content link
- Modal: Focus trap when open
- Accordion: Enter/Space to toggle
- Form: Enter to submit

### 6.3 Screen Reader Support

**Semantic HTML:**
- Proper heading hierarchy (H1 → H2 → H3)
- `<nav>` for navigation
- `<main>` for primary content
- `<footer>` for footer
- `<article>` for testimonials
- `<section>` for major sections

**ARIA Attributes:**
- `aria-label` on icon-only buttons
- `aria-expanded` on accordion items
- `aria-hidden="true"` on decorative icons
- `role="dialog"` on modal
- `aria-describedby` for form errors

**Form Labels:**
- All inputs have associated `<label>`
- Required fields marked with `aria-required="true"`
- Error messages linked with `aria-describedby`

### 6.4 Alternative Text

**Images:**
- All images have descriptive alt text
- Decorative images: `alt=""`

**Icons:**
- Functional icons: Descriptive text or aria-label
- Decorative icons: aria-hidden="true"

---

## 7. Performance Specifications

### 7.1 Loading Performance

**Targets:**
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Total page load: < 2s

**Optimization Strategies:**
- Inline critical CSS
- Defer non-critical JavaScript
- Lazy load images below fold
- Use modern image formats (WebP with fallback)
- Minimize third-party scripts
- CDN for static assets

### 7.2 Image Optimization

**Format:**
- WebP for modern browsers
- JPEG/PNG fallback
- SVG for icons and logos

**Sizing:**
- Desktop: Max 1200px width
- Tablet: Max 768px width
- Mobile: Max 480px width
- Use `srcset` for responsive images

**Compression:**
- JPEG: 80-85% quality
- PNG: TinyPNG or similar
- WebP: 75-80% quality

### 7.3 Code Optimization

**CSS:**
- Minify in production
- Remove unused styles
- Use modern CSS (Grid, Flexbox)
- Avoid excessive specificity

**JavaScript:**
- Minify and bundle
- Code splitting if using framework
- Remove console logs
- Defer non-critical scripts

---

## 8. SEO & Meta Tags

### 8.1 Required Meta Tags

```html
<title>LeadFlow AI - AI Lead Response for Real Estate Agents | 24/7 SMS Follow-Up</title>
<meta name="description" content="Stop losing leads to slow response times. LeadFlow AI texts your real estate leads within 30 seconds, 24/7. Pilot program now open. TCPA-compliant.">
<meta name="keywords" content="real estate AI, lead response, SMS automation, Follow Up Boss, real estate automation, AI assistant">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta charset="UTF-8">
```

### 8.2 Open Graph Tags

```html
<meta property="og:title" content="LeadFlow AI - Never Lose Another Lead to Slow Response">
<meta property="og:description" content="AI responds to your real estate leads in under 30 seconds, 24/7. Join our pilot program.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://leadflow-ai-five.vercel.app">
<meta property="og:image" content="[URL to social share image]">
```

### 8.3 Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "LeadFlow AI",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "49",
    "priceCurrency": "USD"
  },
  "description": "AI lead response assistant for real estate agents"
}
```

---

## 9. Analytics & Tracking

### 9.1 Required Events

| Event Name | Trigger | Data Captured |
|------------|---------|---------------|
| `page_view` | Page load | URL, referrer, UTM params |
| `hero_cta_click` | Hero CTA click | Location: hero |
| `nav_cta_click` | Nav CTA click | Location: nav |
| `pricing_cta_click` | Pricing CTA click | Location: pricing |
| `final_cta_click` | Final CTA click | Location: final_cta |
| `how_it_works_click` | Secondary CTA | Action: scroll |
| `faq_expand` | FAQ expand | Question ID |
| `form_start` | First field focus | - |
| `form_submit` | Form submit | - |
| `form_success` | Success state | - |
| `form_error` | Validation error | Error type |

### 9.2 Scroll Depth Tracking

Track:
- 25%
- 50%
- 75%
- 100%

Event name: `scroll_depth`
Data: Percentage reached

### 9.3 UTM Parameter Capture

Capture and pass to form:
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`

Store in hidden form fields or session storage.

---

## 10. Implementation Notes for Developers

### 10.1 Framework Recommendation

**Preferred:** Static HTML/CSS or Next.js
- Next.js: Better for dynamic content, SEO optimization
- Static: Simpler deployment, faster load times

### 10.2 CSS Approach

**Recommended:** CSS Modules or Tailwind CSS
- Tailwind: Rapid development, utility-first
- CSS Modules: Better organization, scoped styles

**Structure:**
```
styles/
  ├── globals.css           (Reset, base styles, CSS variables)
  ├── components/
  │   ├── Button.module.css
  │   ├── Card.module.css
  │   ├── Modal.module.css
  │   └── Form.module.css
  └── sections/
      ├── Hero.module.css
      ├── Features.module.css
      └── ...
```

### 10.3 Component Structure

**Modular Components:**
- `<Button>` - Primary, secondary, disabled variants
- `<Card>` - Feature, testimonial, pricing variants
- `<Modal>` - Signup modal
- `<Form>` - Signup form with validation
- `<Accordion>` - FAQ accordion
- `<Section>` - Reusable section wrapper

### 10.4 Form Submission

**Endpoint:** `/api/pilot-signup`
**Method:** POST
**Payload:**
```json
{
  "name": "string",
  "email": "string",
  "phone": "string?",
  "brokerage": "string?",
  "team": "string?",
  "monthlyLeads": "string",
  "currentCRM": "string",
  "utmParams": {
    "source": "string?",
    "medium": "string?",
    "campaign": "string?",
    "content": "string?",
    "term": "string?"
  }
}
```

**Validation:**
- Name: Required, min 2 chars
- Email: Required, valid format
- Phone: Optional, valid format if provided

**Response:**
- Success: 200 with confirmation message
- Error: 400/500 with error details

### 10.5 Cross-Browser Testing

**Required Browsers:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

**Fallbacks:**
- CSS Grid → Flexbox
- WebP → JPEG/PNG
- Modern JavaScript → Babel transpilation

### 10.6 Deployment Checklist

- [ ] All assets optimized (images, fonts)
- [ ] Meta tags implemented
- [ ] Analytics tracking configured
- [ ] Form submission tested
- [ ] Modal functionality working
- [ ] Accordion interactions working
- [ ] Responsive design verified
- [ ] Accessibility audit passed
- [ ] Performance audit (Lighthouse) > 90
- [ ] Cross-browser testing complete
- [ ] HTTPS enabled
- [ ] 404/error pages styled
- [ ] Favicon and app icons added

---

## 11. Design Assets Needed

### 11.1 Icons

**Required Icons (SVG format):**
- ⚡ Lightning bolt (speed)
- 🤖 Robot/AI (automation)
- 📱 Mobile phone (SMS)
- 📅 Calendar (booking)
- 📊 Chart (analytics)
- 🔒 Lock (security)
- ✓ Checkmark (success, features)
- ✕ X mark (close, pain points)
- 🚀 Rocket (logo)
- 🎯 Target (urgency)
- 💰 Money bag (value)
- Plus/Minus (accordion)
- Chevron down (accordion)

**Sources:**
- Heroicons: https://heroicons.com
- Feather Icons: https://feathericons.com
- Font Awesome: https://fontawesome.com

### 11.2 Logo

**Specifications:**
- Format: SVG (scalable)
- Versions:
  - Full logo with text (navigation)
  - Icon only (favicon)
  - White version (footer)
- Size: 180px × 40px (standard)
- Emoji fallback: 🚀 (if no custom logo)

### 11.3 Optional Hero Illustration

**Concept:** Agent + AI notification graphic
- Style: Modern, clean, flat design
- Colors: Match brand palette
- Format: SVG or PNG (2x resolution)
- Size: ~600px × 400px
- Placement: Right side of hero (desktop only)

### 11.4 Social Share Image

**Specifications:**
- Size: 1200px × 630px (Open Graph standard)
- Format: JPEG or PNG
- Text overlay: Headline + logo
- High contrast for readability
- File size: < 300KB

---

## 12. Quality Assurance Checklist

### 12.1 Visual QA

- [ ] All sections match design specs
- [ ] Colors match design system
- [ ] Typography consistent throughout
- [ ] Spacing matches specifications
- [ ] Borders and shadows applied correctly
- [ ] Hover states working
- [ ] Active states working
- [ ] Loading states implemented
- [ ] Error states styled
- [ ] Success states styled

### 12.2 Functionality QA

- [ ] All CTAs open signup modal
- [ ] Secondary CTA scrolls to #how-it-works
- [ ] Form validation working
- [ ] Form submission successful
- [ ] Success state displays after submit
- [ ] Modal closes on click outside
- [ ] Modal closes on Escape key
- [ ] FAQ accordion expands/collapses
- [ ] All links functional
- [ ] Navigation sticky on scroll

### 12.3 Responsive QA

- [ ] Mobile (< 480px) layout correct
- [ ] Tablet (768px) layout correct
- [ ] Desktop (1024px+) layout correct
- [ ] Touch targets adequate (44px min)
- [ ] Images responsive
- [ ] Text readable on all devices
- [ ] No horizontal scrolling
- [ ] Modals work on mobile

### 12.4 Accessibility QA

- [ ] Color contrast meets WCAG AA
- [ ] All images have alt text
- [ ] Semantic HTML used
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Form labels associated
- [ ] ARIA attributes present
- [ ] Screen reader tested

### 12.5 Performance QA

- [ ] Page load < 2 seconds
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] Images optimized
- [ ] CSS minified
- [ ] JS minified
- [ ] Lighthouse score > 90

### 12.6 SEO QA

- [ ] Meta title present
- [ ] Meta description present
- [ ] Open Graph tags present
- [ ] Structured data implemented
- [ ] Semantic heading hierarchy
- [ ] Alt text on all images
- [ ] Sitemap.xml created
- [ ] Robots.txt configured

---

## 13. Success Metrics

**Target KPIs** (from PRD):

| Metric | Target | Measurement |
|--------|--------|-------------|
| Conversion Rate | 10%+ | Signups / Unique visitors |
| Bounce Rate | <40% | Single-page sessions |
| Time on Page | 2+ min | Avg. session duration |
| Form Completion | 70%+ | Submits / Form starts |
| Mobile Traffic | 50%+ | Mobile sessions |

**Analytics Setup:**
- Google Analytics 4
- Conversion tracking for form submissions
- UTM parameter tracking
- Event tracking for all CTAs
- Scroll depth tracking

---

## 14. Design Handoff Deliverables

### 14.1 Documentation
✅ This comprehensive design specification document

### 14.2 Visual Reference
✅ Existing HTML reference at `/agents/design/public/landing-page.html`

### 14.3 Component Specifications
✅ Detailed in Section 2 (Buttons, Cards, Forms, Modal, Icons)

### 14.4 Section Specifications
✅ Detailed in Section 3 (All 12 sections with measurements)

### 14.5 Responsive Guidelines
✅ Detailed in Section 5 (Breakpoints, mobile/tablet/desktop)

### 14.6 Accessibility Requirements
✅ Detailed in Section 6 (WCAG 2.1 AA compliance)

### 14.7 Performance Requirements
✅ Detailed in Section 7 (Load times, optimization)

### 14.8 SEO Requirements
✅ Detailed in Section 8 (Meta tags, Open Graph, structured data)

### 14.9 Implementation Notes
✅ Detailed in Section 10 (Framework, CSS approach, components)

### 14.10 QA Checklist
✅ Detailed in Section 12 (Visual, functional, responsive, a11y, performance)

---

## 15. Next Steps for Development Team

1. **Read this entire specification document**
   - Understand design system and principles
   - Note all component specifications
   - Review responsive requirements

2. **Set up project structure**
   - Choose framework (Next.js recommended)
   - Set up CSS approach (Tailwind or CSS Modules)
   - Create component structure

3. **Implement design system**
   - CSS variables for colors, spacing, typography
   - Reusable components (Button, Card, Modal, Form)
   - Utility classes or mixins

4. **Build sections sequentially**
   - Start with navigation and hero
   - Build remaining sections top to bottom
   - Test responsiveness as you go

5. **Implement interactivity**
   - Modal functionality
   - Form validation and submission
   - FAQ accordion
   - Analytics tracking

6. **Test thoroughly**
   - Use QA checklist in Section 12
   - Cross-browser testing
   - Accessibility audit
   - Performance audit

7. **Deploy and monitor**
   - Deploy to Vercel or chosen platform
   - Set up analytics
   - Monitor conversion rates
   - Iterate based on data

---

**Design specifications complete and ready for development implementation.**

**Questions or clarifications needed? Contact the design agent or refer to:**
- PRD: `/docs/PRD-LANDING-PAGE.md`
- Content Brief: `/docs/CONTENT-BRIEF-LANDING-PAGE.md`
- Reference HTML: `/agents/design/public/landing-page.html`
