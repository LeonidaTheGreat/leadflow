# LeadFlow AI Landing Page — Complete Wireframes

**Document ID:** DES-LAND-WIRE-001  
**Version:** 1.0  
**Date:** March 2, 2026

---

## Page Structure

```
1. Navigation (sticky)
2. Hero Section
3. Stats Bar
4. Problem Section
5. Features Section (4 features)
6. Pricing Section (3 tiers)
7. Signup Section
8. Footer
```

---

## Section 1: Navigation

### Desktop Layout (1440px)

```
┌────────────────────────────────────────────────────────────────┐
│  ⚡ LeadFlow AI        Features  Pricing        [Get Started]  │
└────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (375px)

```
┌─────────────────────────┐
│ ⚡ LeadFlow AI    [☰]   │
└─────────────────────────┘
```

### Specs
- **Height:** 72px (desktop), 64px (mobile)
- **Background:** White (#ffffff) with bottom border (#e5e7eb)
- **Sticky:** Yes (position: fixed, top: 0, z-index: 50)
- **Logo:** Height 32px, weight 700, color #111827
- **Nav Links:** Font 16px, weight 500, color #6b7280, hover #111827
- **CTA Button:** Primary button style (14px 24px padding)

---

## Section 2: Hero Section

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    [🚀 Now in Pilot — Limited Spots]           │
│                                                                 │
│           Your AI Assistant That Responds to Leads              │
│                    in Under 30 Seconds                          │
│                                                                 │
│         Stop losing deals to slow follow-up. LeadFlow AI        │
│         automatically responds to your real estate leads        │
│         via SMS, qualifies them, and books appointments         │
│         while you focus on closing.                             │
│                                                                 │
│      [Start Free 14-Day Trial]   [See How It Works]           │
│                                                                 │
│    Works with Follow Up Boss, Cal.com, Twilio • No credit card │
│                                                                 │
│                                                                 │
│              [HERO IMAGE: Dashboard Screenshot]                 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────────┐
│  [🚀 Now in Pilot —      │
│   Limited Spots]         │
│                          │
│  Your AI Assistant       │
│  That Responds to        │
│  Leads in Under          │
│  30 Seconds              │
│                          │
│  Stop losing deals       │
│  to slow follow-up.      │
│  LeadFlow AI             │
│  automatically           │
│  responds...             │
│                          │
│  [Start Free Trial]      │
│  [See How It Works]      │
│                          │
│  Works with FUB, Cal.com │
│  No credit card required │
│                          │
│  [HERO IMAGE]            │
│                          │
└─────────────────────────┘
```

### Component Specs

**Pilot Badge:**
- Background: linear-gradient(135deg, #f59e0b, #f97316)
- Color: #ffffff
- Padding: 6px 12px
- Border-radius: 4px
- Font: 12px, weight 600, uppercase
- Margin-bottom: 24px

**H1 Headline:**
- Font: 52px (desktop), 36px (mobile)
- Weight: 800
- Color: #111827
- Line-height: 1.1
- Max-width: 800px
- Margin-bottom: 24px
- Text-align: center

**Subheadline:**
- Font: 20px (desktop), 18px (mobile)
- Weight: 400
- Color: #6b7280
- Line-height: 1.6
- Max-width: 700px
- Margin-bottom: 32px
- Text-align: center

**CTA Buttons:**
- Primary: Indigo (#6366f1), 16px 32px padding
- Secondary: Outlined, 16px 32px padding
- Gap: 16px
- Desktop: Inline
- Mobile: Stack (full width)

**Micro-copy:**
- Font: 14px, weight 500, color #9ca3af
- Text-align: center

**Hero Image:**
- Aspect ratio: 16:9
- Max-width: 900px
- Border-radius: 16px
- Box-shadow: xl
- Margin-top: 48px

---

## Section 3: Stats Bar

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│     <30s           78%            35%           24/7            │
│  Response Time   First Responder  Never Get    Always On       │
│                   Gets Deal      Response                       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Specs

**Container:**
- Background: #f9fafb
- Padding: 48px 0 (desktop), 40px 16px (mobile)
- Grid: 4 columns (desktop), 2 columns (mobile)
- Gap: 32px

**Stat Number:**
- Font: 36px (desktop), 28px (mobile)
- Weight: 800
- Color: #6366f1
- Font-family: Monospace
- Margin-bottom: 8px

**Stat Label:**
- Font: 16px (desktop), 14px (mobile)
- Weight: 500
- Color: #6b7280
- Line-height: 1.4

---

## Section 4: Problem Section

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      Here's the Hard Truth                      │
│            78% of deals go to the agent who responds first      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │              │  │              │  │              │        │
│  │     😴       │  │      ⏰      │  │     💸       │        │
│  │              │  │              │  │              │        │
│  │ Leads Go     │  │ No Time to   │  │ Money Down   │        │
│  │ Cold         │  │ Follow Up    │  │ the Drain    │        │
│  │              │  │              │  │              │        │
│  │ By the time  │  │ You're       │  │ $50-200 per  │        │
│  │ you respond, │  │ showing      │  │ Zillow lead, │        │
│  │ they've...   │  │ houses...    │  │ and most...  │        │
│  │              │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Specs

**Section Title:**
- Font: 36px (desktop), 28px (mobile)
- Weight: 700
- Color: #111827
- Text-align: center
- Margin-bottom: 16px

**Subtitle:**
- Font: 20px (desktop), 18px (mobile)
- Weight: 400
- Color: #6b7280
- Text-align: center
- Margin-bottom: 48px

**Problem Cards:**
- Background: #ffffff
- Border: 1px solid #e5e7eb
- Border-radius: 12px
- Padding: 32px
- Grid: 3 columns (desktop), 1 column (mobile)
- Gap: 24px

**Emoji:**
- Font-size: 48px
- Margin-bottom: 16px

**Card Title:**
- Font: 20px, weight 600
- Color: #111827
- Margin-bottom: 12px

**Card Description:**
- Font: 16px, weight 400
- Color: #6b7280
- Line-height: 1.6

---

## Section 5: Features Section

### Layout (2-Column Alternating)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│              What LeadFlow AI Does For You                      │
│         Four AI agents working together to fill your calendar   │
│                                                                 │
│  ┌──────────────┐                    ┌──────────────┐         │
│  │              │                    │              │         │
│  │  [Feature    │    ⚡ Instant     │  Description │         │
│  │   Image 1]   │    Response Agent │  text here   │         │
│  │              │                    │              │         │
│  └──────────────┘                    └──────────────┘         │
│                                                                 │
│  ┌──────────────┐                    ┌──────────────┐         │
│  │  Description │    🎯 Smart       │  [Feature    │         │
│  │  text here   │    Qualification  │   Image 2]   │         │
│  │              │                    │              │         │
│  └──────────────┘                    └──────────────┘         │
│                                                                 │
│  (Repeat pattern for 📅 Auto-Booking and 🔄 Follow-Up)        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Specs

**Section Title:**
- Font: 36px (desktop), 28px (mobile)
- Weight: 700
- Color: #111827
- Text-align: center
- Margin-bottom: 16px

**Feature Row:**
- Grid: 2 columns (desktop), 1 column (mobile)
- Gap: 64px (desktop), 32px (mobile)
- Alternate image left/right
- Vertical spacing: 64px between rows

**Feature Emoji:**
- Font-size: 40px
- Margin-bottom: 16px

**Feature Title:**
- Font: 24px (desktop), 20px (mobile)
- Weight: 600
- Color: #111827
- Margin-bottom: 12px

**Feature Description:**
- Font: 18px (desktop), 16px (mobile)
- Weight: 400
- Color: #6b7280
- Line-height: 1.6
- Margin-bottom: 20px

**Feature Bullets:**
- Font: 16px, weight 500
- Color: #111827
- Checkmark icon: #10b981, 20px
- Line-height: 2

**Feature Image:**
- Border-radius: 12px
- Box-shadow: lg
- Aspect ratio: 4:3

---

## Section 6: Pricing Section

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│                 Simple, Transparent Pricing                     │
│            Start free for 14 days. No credit card required.     │
│                                                                 │
│  ┌──────────┐     ┌──────────────┐     ┌──────────┐          │
│  │ STARTER  │     │     PRO       │     │   TEAM   │          │
│  │          │     │  [⭐ POPULAR] │     │          │          │
│  │ $49      │     │     $149      │     │  $399    │          │
│  │ /month   │     │     /month    │     │  /month  │          │
│  │          │     │               │     │          │          │
│  │ 100 SMS  │     │ Unlimited SMS │     │ 5 agents │          │
│  │ ✓ Basic  │     │ ✓ Advanced AI │     │ ✓ All Pro│          │
│  │ ✓ FUB    │     │ ✓ Cal.com     │     │ ✓ Team   │          │
│  │ ✓ Dash   │     │ ✓ Follow-up   │     │ ✓ Route  │          │
│  │          │     │ ✓ Priority    │     │          │          │
│  │          │     │               │     │          │          │
│  │ [Start]  │     │ [Start Trial] │     │ [Contact]│          │
│  │          │     │               │     │          │          │
│  └──────────┘     └──────────────┘     └──────────┘          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Specs

**Pricing Card (Normal):**
- Background: #ffffff
- Border: 2px solid #e5e7eb
- Border-radius: 12px
- Padding: 40px 32px
- Width: 300px

**Pricing Card (Popular):**
- Border: 2px solid #6366f1
- Box-shadow: 0 10px 15px rgba(99, 102, 241, 0.2)
- Transform: scale(1.05)
- Z-index: 1

**Popular Badge:**
- Background: #6366f1
- Color: #ffffff
- Padding: 4px 12px
- Border-radius: 4px
- Font: 12px, weight 600, uppercase
- Position: absolute, top -12px

**Plan Name:**
- Font: 20px, weight 600
- Color: #111827
- Text-align: center
- Margin-bottom: 16px
- Text-transform: uppercase
- Letter-spacing: 0.05em

**Price:**
- Font: 48px, weight 800
- Color: #111827
- Text-align: center
- Margin-bottom: 8px

**Interval:**
- Font: 16px, weight 400
- Color: #6b7280
- Text-align: center
- Margin-bottom: 24px

**Feature List:**
- Font: 14px, weight 400
- Checkmark: #10b981, 16px
- Line-height: 2
- Margin-bottom: 32px

**CTA Button:**
- Full width
- Height: 48px
- Popular: Primary style
- Others: Secondary (outlined)

---

## Section 7: Signup Section

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────────┐       ┌────────────────────────┐     │
│  │                      │       │    Get Started         │     │
│  │ Stop Losing Leads.   │       │                        │     │
│  │ Start Booking        │       │  [Full Name      ]     │     │
│  │ Appointments.        │       │  [Email          ]     │     │
│  │                      │       │  [Phone          ]     │     │
│  │ Join the pilot and   │       │  [Brokerage      ]     │     │
│  │ get 14 days free.    │       │                        │     │
│  │                      │       │  [Start Free Trial →]  │     │
│  │ ✓ 14-day free trial  │       │                        │     │
│  │ ✓ No credit card     │       │  Micro-copy: Privacy   │     │
│  │ ✓ Cancel anytime     │       │                        │     │
│  │                      │       │                        │     │
│  └─────────────────────┘       └────────────────────────┘     │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Specs

**Container:**
- Background: linear-gradient(135deg, #6366f1, #8b5cf6)
- Padding: 96px 0
- Grid: 2 columns (desktop), 1 column (mobile)
- Gap: 64px

**Left Column (Text):**
- Color: #ffffff
- Max-width: 500px

**Title:**
- Font: 36px (desktop), 28px (mobile)
- Weight: 700
- Color: #ffffff
- Margin-bottom: 16px

**Description:**
- Font: 20px (desktop), 18px (mobile)
- Weight: 400
- Color: rgba(255,255,255,0.9)
- Margin-bottom: 32px

**Checkmarks:**
- Font: 16px, weight 500
- Color: #ffffff
- Icon: ✓, 20px
- Line-height: 2

**Right Column (Form):**
- Background: #ffffff
- Border-radius: 12px
- Padding: 40px
- Box-shadow: xl

**Form Title:**
- Font: 24px, weight 700
- Color: #111827
- Margin-bottom: 24px

**Input Fields:**
- Height: 48px
- Border: 1px solid #e5e7eb
- Border-radius: 8px
- Font: 16px
- Margin-bottom: 16px
- Full width

**Submit Button:**
- Primary style
- Full width
- Height: 56px
- Font: 18px

**Micro-copy:**
- Font: 12px, weight 400
- Color: #9ca3af
- Text-align: center
- Margin-top: 16px

**Success State:**
- Replace form with:
  - Emoji: 🎉, 48px
  - Message: "You're in! Check your email for next steps."
  - Font: 20px, weight 600, color #10b981

**Error State:**
- Show error below field
- Font: 14px, color #ef4444
- Icon: ⚠️

---

## Section 8: Footer

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│                © 2026 LeadFlow AI. All rights reserved.         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Specs

**Container:**
- Background: #111827
- Padding: 32px 0
- Text-align: center

**Copyright:**
- Font: 14px, weight 400
- Color: #9ca3af

---

## Mobile-Specific Optimizations

### Sticky CTA Bar (Mobile Only)

```
┌─────────────────────────┐
│                          │
│  (Content scrolling...)  │
│                          │
├─────────────────────────┤
│  [Start Free Trial →]   │
└─────────────────────────┘
```

**Specs:**
- Position: fixed, bottom: 0
- Background: #ffffff
- Box-shadow: top shadow
- Padding: 12px 16px
- Z-index: 40
- Hide when: At hero or signup section

---

## Responsive Behavior

| Element | Mobile (<768px) | Desktop (≥768px) |
|---------|-----------------|------------------|
| Hero CTAs | Stack (full width) | Inline (auto width) |
| Stats | 2×2 grid | 1×4 grid |
| Problem Cards | Stack | 3-column grid |
| Features | Stack (image above text) | 2-column alternating |
| Pricing | Stack | 3-column (popular scaled) |
| Signup | Stack | 2-column |
| Nav | Hamburger | Horizontal links |

---

**Design Status:** Complete  
**Ready for:** Developer handoff  
**Estimated Build:** 5-7 days
