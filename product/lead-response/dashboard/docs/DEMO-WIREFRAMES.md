# Live AI Demo — Wireframe & Visual Mockups

**Component Visual States**

---

## 1. Full Page Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  LeadFlow AI                                                   Sign In →     │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                           See AI Respond in                                  │
│                        Under 30 Seconds                                      │
│                                                                              │
│             Experience how LeadFlow AI instantly qualifies and               │
│              responds to your leads. No signup required.                     │
│                                                                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ○──────────○──────────●                                             │   │
│  │  Step 1   Step 2      Step 3                                         │   │
│  │  Input    Processing  Delivered                                      │   │
│  │                                                                      │   │
│  │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │   │
│  │  ┃ Simulate a Lead                                             ┃   │   │
│  │  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │   │
│  │                                                                      │   │
│  │  Lead Name                          Property Interest               │   │
│  │  ┌──────────────────────┐           ┌──────────────────────┐        │   │
│  │  │ e.g., Sarah Johnson  │           │ Single Family Home ▼ │        │   │
│  │  └──────────────────────┘           └──────────────────────┘        │   │
│  │                                                                      │   │
│  │  Lead Source (Optional)                                             │   │
│  │  ┌──────────────────────┐                                           │   │
│  │  │ Zillow ▼             │                                           │   │
│  │  └──────────────────────┘                                           │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │   ⚡ Send Lead →                                              │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │              Ready to Automate Your Lead Responses?                 │   │
│  │                                                                      │   │
│  │         Join hundreds of agents who never miss a lead.             │   │
│  │                                                                      │   │
│  │         ┌────────────────────────────────────────────────────┐      │   │
│  │         │  Start Free Trial — No Credit Card Required  →    │      │   │
│  │         └────────────────────────────────────────────────────┘      │   │
│  │                                                                      │   │
│  │         ✓ 30-day free trial   ✓ No credit card   ✓ Cancel anytime  │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Step 1: Lead Input Form (Active State)

```
  ○──────────○──────────○
  Input    Processing  Delivered

  Simulate a Lead

  Lead Name *
  ┌──────────────────────────────────────────┐
  │ Sarah Johnson                            │
  └──────────────────────────────────────────┘

  Property Interest *
  ┌──────────────────────────────────────────┐
  │ Single Family Home                     ▼ │
  └──────────────────────────────────────────┘

  Lead Source (Optional)
  ┌──────────────────────────────────────────┐
  │ Zillow                                 ▼ │
  └──────────────────────────────────────────┘

  ┌──────────────────────────────────────────┐
  │         ⚡ Send Lead →                  │
  └──────────────────────────────────────────┘

  * Required fields
```

---

## 3. Step 2: AI Processing Visualization

```
  ●──────────●──────────○
  Input    Processing  Delivered

  Timeline Progress:

  ⚡ Lead Received ─────────●───────────────○
     ✓                  AI Processing     Delivering

  ┌────────────────────────────────────────┐
  │  🤖 AI is analyzing...                 │
  │                                        │
  │  Extracting intent, budget, timeline...│
  │  ● ● ●                                 │
  └────────────────────────────────────────┘


                  ┌──────────┐
                  │  04.2s   │
                  └──────────┘
                Response time
```

---

## 4. Step 3: SMS Response Delivered (Success State)

```
  ●──────────●──────────●
  Input    Processing  Delivered

         ✓ Response Delivered in 4.2 seconds
            Here's what your lead would receive:

                ┌─────────────────────┐
                │  9:41             🔋│
                ├─────────────────────┤
                │                     │
                │  ┌───────────────┐  │
                │  │ Hey Sarah! 👋 │  │
                │  │ Thanks for    │  │
                │  │ your interest │  │
                │  │ in the single │  │
                │  │ family home.  │  │
                │  │ I'd love to   │  │
                │  │ schedule a    │  │
                │  │ showing.      │  │
                │  │               │  │
                │  │ Are you free  │  │
                │  │ this weekend? │  │
                │  └───────────────┘  │
                │                     │
                └─────────────────────┘

               ┌───────────────────────┐
               │ ⚡ 4.2s response time │
               └───────────────────────┘

  ┌────────────┐ ┌────────────┐ ┌────────────┐
  │ 🏠 Single  │ │ 💰 Budget  │ │ 📅 This    │
  │ Family     │ │ Ready      │ │ Weekend    │
  └────────────┘ └────────────┘ └────────────┘

  ┌────────────────────────┐  ┌────────────────────────┐
  │ ← Try Another Lead     │  │ Start Free Trial →     │
  └────────────────────────┘  └────────────────────────┘
```

---

## 5. Error State: Claude API Timeout

```
  ●──────────●──────────✕ (ERROR)
  Input    Processing  Failed

  ⚠️  Unable to generate response

  Our AI service is temporarily unavailable.
  Please try again in a moment.

  ┌─────────────────────┐  ┌──────────────────────────┐
  │ Try Again           │  │ Start Free Trial Anyway →│
  └─────────────────────┘  └──────────────────────────┘

  (Border color: red-500/20, background tint: red-500/5)
```

---

## 6. Mobile Layout (375px Viewport)

```
┌───────────────────────────────────┐
│ LeadFlow AI       Sign In →        │
├───────────────────────────────────┤
│                                   │
│   See AI Respond in Under         │
│         30 Seconds                │
│                                   │
│  Experience how LeadFlow AI       │
│  instantly qualifies and          │
│  responds to your leads.          │
│  No signup required.              │
│                                   │
├───────────────────────────────────┤
│  ┌─────────────────────────────┐  │
│  │ ●──────●──────●             │  │
│  │ 1      2     3              │  │
│  │                             │  │
│  │ Simulate a Lead             │  │
│  │                             │  │
│  │ Lead Name *                 │  │
│  │ ┌───────────────────────┐   │  │
│  │ │ Sarah Johnson         │   │  │
│  │ └───────────────────────┘   │  │
│  │                             │  │
│  │ Property Type *             │  │
│  │ ┌───────────────────────┐   │  │
│  │ │ Single Family Home  ▼ │   │  │
│  │ └───────────────────────┘   │  │
│  │                             │  │
│  │ Lead Source                 │  │
│  │ ┌───────────────────────┐   │  │
│  │ │ Zillow              ▼ │   │  │
│  │ └───────────────────────┘   │  │
│  │                             │  │
│  │ ┌───────────────────────┐   │  │
│  │ │ ⚡ Send Lead →       │   │  │
│  │ └───────────────────────┘   │  │
│  │                             │  │
│  └─────────────────────────────┘  │
│                                   │
├───────────────────────────────────┤
│  Ready to Automate Your Lead      │
│  Responses?                       │
│                                   │
│  Join hundreds of agents who      │
│  never miss a lead.               │
│                                   │
│  ┌───────────────────────────────┐│
│  │ Start Free Trial — No Credit  ││
│  │ Card Required          →      ││
│  └───────────────────────────────┘│
│                                   │
│  ✓ 30-day free trial              │
│  ✓ No credit card                 │
│  ✓ Cancel anytime                 │
│                                   │
└───────────────────────────────────┘
```

---

## 7. Timeline Animation Sequence

```
State 1 (Lead Received):
⚡ ──────────────────────────────────
✓

State 2 (AI Processing - 40% progress):
⚡ Lead Received ─────────●──────────○
✓                    ↑ (pulsing)

State 3 (Complete):
⚡ Lead Received ─────────✓──────────●
✓                                   ↑ (pulsing)
```

---

## 8. Color Reference Guide

```
Dark Mode (Primary)
Background: #0F172A (slate-900)
Surface: #1E293B (slate-800)
Surface Elevated: #334155 (slate-700)
Text Primary: #F8FAFC (slate-50)
Text Secondary: #94A3B8 (slate-400)
Text Muted: #64748B (slate-500)

Accent Colors
Primary Action: #10B981 (emerald-500)
Primary Hover: #059669 (emerald-600)
Success: #22C55E (green-500)
Timer: #F59E0B (amber-500)
Error: #EF4444 (red-500)
Link: #3B82F6 (blue-500)

Borders & Dividers
Default Border: #334155 (slate-700)
Focus Ring: 2px #10B981/20 (emerald-500 with transparency)
```

---

## 9. Component Animation Keyframes

### Timer Animation

```css
@keyframes timerTick {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.timer {
  animation: timerTick 0.3s ease-in-out;
}
```

### Pulsing Dot

```css
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.active-step-dot {
  animation: pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Typing Indicator

```css
@keyframes typingDot {
  0%, 60%, 100% {
    opacity: 0.3;
  }
  30% {
    opacity: 1;
  }
}

.typing-dot {
  animation: typingDot 1.4s infinite;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}
```

### Fade In + Slide Up

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-text {
  animation: slideUp 0.3s ease-out;
}
```

---

**End of Wireframes Document**