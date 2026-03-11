# Onboarding Wizard — Aha Moment Design Specification

## Overview

This document provides visual design specifications for integrating the **Lead Experience Simulator** as Step 4 of the onboarding wizard. This creates the critical "aha moment" where new users see the product value within 30 seconds of setup.

**Task ID:** 40a14540-1217-4f56-b419-dda4222fa619  
**Use Case:** fix-onboarding-wizard-stuck-no-aha-moment-for-new-sign  
**Target:** LeadFlow AI Dashboard (Next.js + Tailwind)

---

## The Problem

The current onboarding wizard has 3 steps (FUB → Twilio → SMS Verify) but lacks a **value demonstration moment**. Users complete technical setup but never see the product actually work. Without experiencing an AI response in action, trial-to-paid conversion will be near zero.

## The Solution

Add **Step 4: See It In Action** — a guided Lead Experience Simulator that:
1. Auto-triggers a simulated lead scenario
2. Shows the AI response generating in real-time (<30s)
3. Displays the full conversation in an immersive chat UI
4. Celebrates the achievement with clear next steps

---

## Updated Wizard Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐
│  Step 1     │ →  │  Step 2     │ →  │  Step 3     │ →  │     Step 4          │
│ Connect FUB │    │ Configure   │    │ Verify SMS  │    │  SEE IT IN ACTION   │
│             │    │   Phone     │    │             │    │  (Aha Moment)       │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────────────┘
                                                              ↓
                                                    ┌─────────────────────┐
                                                    │    COMPLETION       │
                                                    │   Go to Dashboard   │
                                                    └─────────────────────┘
```

---

## Step 4: "See It In Action" — Design Specifications

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER (existing wizard header)                                            │
│  Logo                              Skip for now →                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  PROGRESS INDICATOR (4 steps now)                                           │
│  ●──────●──────●──────◐                                                     │
│  FUB    Phone  SMS   SEE IT                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ICON: 🎯  or animated pulse ring                                   │   │
│  │                                                                     │   │
│  │  HEADLINE: "See it in action"                                       │   │
│  │  SUBHEAD:  "Watch how LeadFlow responds to a new lead in seconds"   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  SIMULATION CARD                                             │   │   │
│  │  │                                                              │   │   │
│  │  │  ┌────────────────────────────────────────────────────────┐ │   │   │
│  │  │  │  PHONE MOCKUP / CHAT INTERFACE                          │ │   │   │
│  │  │  │                                                          │ │   │   │
│  │  │  │   ┌──────────┐                                           │ │   │   │
│  │  │  │   │ 9:41     │  ← Status bar styling                     │ │   │   │
│  │  │  │   ├──────────┤                                           │ │   │   │
│  │  │  │   │ Sarah J. │  ← Contact name                           │ │   │   │
│  │  │  │   ├──────────┤                                           │ │   │   │
│  │  │  │   │                                          ┌────────┐  │ │   │   │
│  │  │  │   │  Hi! I'm interested in buying          │ AI │  │ │   │   │
│  │  │  │   │  a home in Austin. Can you help?       │ 🤖 │  │ │   │   │
│  │  │  │   │                                          └────────┘  │ │   │   │
│  │  │  │   │  ─────────────────────────────────  9:41 AM          │ │   │   │
│  │  │  │   │                                                          │ │   │   │
│  │  │  │   │  ┌────────────────────────────────────────┐            │ │   │   │
│  │  │  │   │  │ Hi Sarah! 👋 I'd love to help...       │            │ │   │   │
│  │  │  │   │  │ [AI typing indicator ...]              │            │ │   │   │
│  │  │  │   │  └────────────────────────────────────────┘            │ │   │   │
│  │  │  │   │                                          ┌────────┐  │ │   │   │
│  │  │  │   │  Yes please!                             │ Lead │  │ │   │   │
│  │  │  │   │                                          │ 👤   │  │ │   │   │
│  │  │  │   └──────────────────────────────────────────────────────┘ │   │   │
│  │  │  │                                                          │ │   │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │   │   │
│  │  │                                                              │   │   │
│  │  │  STATUS BAR:                                                 │   │   │
│  │  │  ┌────────────────────────────────────────────────────────┐  │   │   │
│  │  │  │  ⚡ AI responded in 4.2 seconds                         │  │   │   │
│  │  │  │  ✅ Lead engaged • 3 messages exchanged                  │  │   │   │
│  │  │  └────────────────────────────────────────────────────────┘  │   │   │
│  │  │                                                              │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  [  Run Simulation Again  ]  [  Go to Dashboard →  ]       │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Visual Specifications

### Color Palette (Existing System)

```css
/* Background */
--bg-primary: #0f172a;        /* slate-900 */
--bg-secondary: #1e293b;      /* slate-800 */
--bg-card: rgba(30, 41, 59, 0.8);  /* slate-800/80 with backdrop blur */

/* Accents */
--accent-emerald: #10b981;    /* emerald-500 */
--accent-emerald-light: #34d399;  /* emerald-400 */
--accent-blue: #3b82f6;       /* blue-500 */
--accent-amber: #f59e0b;      /* amber-500 */

/* Text */
--text-primary: #ffffff;
--text-secondary: #94a3b8;    /* slate-400 */
--text-muted: #64748b;        /* slate-500 */

/* Borders */
--border-default: rgba(51, 65, 85, 0.5);  /* slate-700/50 */
--border-emerald: rgba(16, 185, 129, 0.3);  /* emerald-500/30 */
```

### Typography

```css
/* Headline */
font-size: 1.5rem;        /* text-2xl */
font-weight: 700;         /* font-bold */
color: white;
line-height: 1.2;

/* Subhead */
font-size: 0.875rem;      /* text-sm */
font-weight: 400;
color: var(--text-secondary);
line-height: 1.5;

/* Chat Messages */
font-size: 0.875rem;      /* text-sm */
line-height: 1.5;

/* Status Text */
font-size: 0.75rem;       /* text-xs */
font-weight: 500;
color: var(--accent-emerald);
```

### Spacing

```css
/* Card padding */
padding: 2rem;            /* p-8 */

/* Section gaps */
gap: 1.5rem;              /* gap-6 */

/* Chat bubble padding */
padding: 0.75rem 1rem;    /* px-4 py-3 */

/* Button padding */
padding: 0.75rem 1.5rem;  /* py-3 px-6 */
```

---

## Component Specifications

### 1. Step Indicator Update

The progress indicator must now show **4 steps** instead of 3:

```
●──────●──────●──────◐
FUB   Phone  SMS   SEE IT
```

**Visual States:**
- Completed steps: filled emerald circle with checkmark
- Current step (Step 4): pulsing emerald ring with number "4"
- Future steps: empty slate circle

### 2. Phone Mockup / Chat Interface

**Container:**
```css
/* Phone frame */
background: #000;
border-radius: 2rem;           /* rounded-[2rem] */
border: 8px solid #1e293b;     /* slate-800 */
box-shadow: 
  0 25px 50px -12px rgba(0, 0, 0, 0.5),
  0 0 0 1px rgba(255, 255, 255, 0.1);
max-width: 320px;
margin: 0 auto;
overflow: hidden;
```

**Status Bar (inside phone):**
```css
background: #000;
padding: 0.5rem 1rem;
text-align: center;
font-size: 0.75rem;
color: white;
```

**Chat Bubbles:**

*Lead Message (left):*
```css
background: #374151;           /* gray-700 */
color: white;
border-radius: 1rem;
border-bottom-left-radius: 0.25rem;  /* rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-sm */
max-width: 80%;
align-self: flex-start;
```

*AI Message (right):*
```css
background: var(--accent-emerald);
color: white;
border-radius: 1rem;
border-bottom-right-radius: 0.25rem;
max-width: 80%;
align-self: flex-end;
```

### 3. AI Typing Indicator

```css
/* Three bouncing dots */
.dots {
  display: flex;
  gap: 4px;
}
.dot {
  width: 6px;
  height: 6px;
  background: rgba(255,255,255,0.7);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
```

### 4. Status Bar (Below Phone)

```css
background: rgba(16, 185, 129, 0.1);  /* emerald-500/10 */
border: 1px solid rgba(16, 185, 129, 0.2);
border-radius: 0.75rem;
padding: 1rem;
text-align: center;
```

**Content Structure:**
- Primary metric: "⚡ AI responded in X.X seconds" (emerald-400, font-medium)
- Secondary info: "✅ Lead engaged • 3 messages exchanged" (slate-400, text-xs)

### 5. Action Buttons

*Primary CTA (Go to Dashboard):*
```css
background: var(--accent-emerald);
color: white;
border-radius: 0.5rem;
padding: 0.75rem 1.5rem;
font-weight: 600;
hover: background: var(--accent-emerald-light);
transition: all 0.2s;
```

*Secondary CTA (Run Again):*
```css
background: transparent;
border: 1px solid var(--border-default);
color: var(--text-secondary);
border-radius: 0.5rem;
padding: 0.75rem 1.5rem;
hover: border-color: var(--accent-emerald);
hover: color: var(--accent-emerald);
```

---

## Animation Specifications

### 1. Page Entry

```css
animation: fade-in-up 0.5s ease-out;

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 2. Chat Message Entry

```css
/* Each message animates in sequence */
animation: message-pop 0.3s ease-out;
animation-fill-mode: both;

@keyframes message-pop {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Stagger delays */
.message-1 { animation-delay: 0s; }
.message-2 { animation-delay: 0.8s; }
.message-3 { animation-delay: 1.6s; }
.message-4 { animation-delay: 2.4s; }
```

### 3. Success Pulse

When the simulation completes:
```css
animation: success-pulse 0.6s ease-out;

@keyframes success-pulse {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
```

### 4. Typing Indicator

See Component #3 above — three dots with staggered bounce animation.

---

## Responsive Behavior

### Desktop (≥1024px)
- Full layout as specified
- Phone mockup at max-width: 320px
- Buttons side-by-side

### Tablet (768px - 1023px)
- Phone mockup scales to max-width: 280px
- Reduced card padding (p-6)

### Mobile (<768px)
- Phone mockup full width with padding
- Buttons stack vertically (flex-col)
- Reduced animation complexity for performance
- Chat bubbles use full available width

---

## Interaction States

### Simulation Running State

While the simulation is processing:
1. Show loading spinner in place of chat
2. OR show phone mockup with "Connecting..." status
3. Disable "Run Again" button
4. Show progress: "Generating AI response..."

### Simulation Complete State

When simulation finishes:
1. All chat messages visible with stagger animation
2. Status bar shows actual response time
3. Both action buttons enabled
4. Confetti or subtle celebration animation (optional)

### Error State

If simulation fails:
1. Show error message below phone mockup
2. "Something went wrong. Try again?"
3. Retry button prominent
4. Link to skip: "Continue to dashboard →"

---

## Asset Requirements

### Icons (Lucide React)
- `Zap` — for response time indicator
- `CheckCircle2` — for completion states
- `MessageSquare` — for chat icon
- `Bot` — for AI avatar
- `User` — for lead avatar
- `Play` — for run simulation button
- `ArrowRight` — for dashboard CTA

### Optional Custom Assets
- Phone frame illustration (can be CSS-only)
- Confetti animation (optional, Lottie or CSS)

---

## File Structure for Dev

```
app/
├── setup/
│   ├── page.tsx                    # Updated to include Step 4
│   └── steps/
│       ├── fub.tsx                 # Existing
│       ├── twilio.tsx              # Existing
│       ├── sms-verify.tsx          # Existing
│       ├── simulator.tsx           # NEW — Step 4 component
│       └── complete.tsx            # Existing (now Step 5)
```

---

## API Integration Notes

The Step 4 component should:
1. Call `POST /api/admin/simulate-lead` on mount or button click
2. Pass `leadName` (auto-generated: "Sarah Johnson" or user input)
3. Pass `propertyInterest` (auto-generated: "3-bedroom home in Austin")
4. Receive conversation array and render with animations
5. Measure actual response time from API call to render

---

## Success Metrics (for Dev to Track)

- `simulation_started` — user reached Step 4
- `simulation_completed` — full conversation displayed
- `simulation_time_ms` — actual time to first AI response
- `dashboard_clicked` — user clicked "Go to Dashboard"
- `aha_moment_achieved` — simulation completed under 30s

---

## Design Principles Applied

1. **Clarity Above All:** The phone mockup immediately communicates "this is an SMS conversation"
2. **Human-Centric:** Chat bubble UI mimics familiar messaging apps (iMessage, WhatsApp)
3. **Multi-Platform:** Responsive design works on desktop (demo setting) and mobile (agent on-the-go)
4. **Appeal:** Smooth animations create delight without distraction
5. **Designed for Testing:** Stojan can verify the aha moment by timing the simulation

---

## Summary for Dev Implementation

**What to Build:**
1. Update wizard to have 4 steps (add Step 4: simulator)
2. Create `simulator.tsx` step component with:
   - Phone mockup container
   - Chat bubble UI for lead and AI messages
   - Typing indicator animation
   - Status bar showing response time
   - Run Again / Go to Dashboard buttons
3. Integrate with existing `/api/admin/simulate-lead` endpoint
4. Add staggered message animations
5. Track success metrics

**What NOT to Build:**
- Do NOT modify the existing simulator admin page
- Do NOT create new API endpoints (reuse existing)
- Do NOT modify steps 1-3 (they're complete)

---

*Design by Design Agent — LeadFlow AI*  
*Date: March 11, 2026*
