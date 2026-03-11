# Component Specifications — Onboarding Wizard Step 4

## Overview

This document provides the detailed component breakdown for implementing the "See It In Action" (Aha Moment) step in the onboarding wizard.

---

## SimulatorStep Component (`app/setup/steps/simulator.tsx`)

### Props Interface

```typescript
interface SimulatorStepProps {
  agentId: string
  agentName: string
  onComplete: () => void
  onSkip: () => void
  onBack: () => void
}
```

### State Management

```typescript
interface SimulatorState {
  loading: boolean
  error: string | null
  conversation: ConversationTurn[]
  responseTime: number | null
  completed: boolean
}
```

### Lifecycle

1. **Mount:** Auto-trigger simulation with agent name
2. **Loading:** Show loading state with spinner
3. **Success:** Display conversation with staggered animations
4. **Complete:** Show metrics, enable action buttons
5. **Error:** Show error with retry option

---

## Sub-Components

### 1. PhoneMockup Component

**Renders:** iPhone-style frame containing chat interface

```typescript
interface PhoneMockupProps {
  conversation: ConversationTurn[]
  loading: boolean
  responseTime: number | null
}

// Elements:
// - Notch (fixed at top)
// - Status bar (9:41, signal, battery)
// - Contact header (Sarah Johnson, Online)
// - Chat area (scrollable, message bubbles)
// - Input area (minimal, just "Message" placeholder)
```

**Key Features:**
- CSS rounded corners (2.5rem border-radius)
- Black background with slate border
- Shadows for depth
- Responsive scaling on smaller screens

### 2. ChatBubble Component

**Renders:** Individual message bubble with animation

```typescript
interface ChatBubbleProps {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
  animationDelay: number
}

// Lead messages (left):
// - Background: gray-700 (#374151)
// - Text: white
// - Border radius: rounded-2xl with square tl corner
// - Avatar: left side (gray circle with user icon)

// AI messages (right):
// - Background: emerald-600 (#059669)
// - Text: white
// - Border radius: rounded-2xl with square tr corner
// - Avatar: right side (emerald circle with bot icon)
```

**Animations:**
- Fade-in + slide-up with staggered delays (0s, 0.8s, 1.6s, 2.4s)

### 3. TypingIndicator Component

**Renders:** Three animated dots (used when showing AI is processing)

```typescript
interface TypingIndicatorProps {
  color?: string  // default: white/70
}

// Three dots with bounce animation
// Staggered animation delays
// Used in chat area before AI response appears
```

### 4. StatusBar Component

**Renders:** Success metrics below phone mockup

```typescript
interface StatusBarProps {
  responseTime: number | null
  messageCount: number
  completed: boolean
  error?: string
}

// Success state:
// - Icon: ⚡ (zap icon)
// - Primary text: "AI responded in X.X seconds" (emerald-400, bold)
// - Secondary text: "✅ Lead engaged • X messages exchanged" (slate-400, small)
// - Background: emerald-500/10
// - Border: emerald-500/20

// Error state:
// - Icon: ⚠️ (alert icon)
// - Text: error message (red)
// - Background: red-500/10
// - Border: red-500/20
```

### 5. ActionButtons Component

**Renders:** "Run Again" and "Go to Dashboard" buttons

```typescript
interface ActionButtonsProps {
  disabled: boolean
  onRunAgain: () => void
  onComplete: () => void
}

// Layout: side-by-side on desktop, stacked on mobile
// Primary (Go to Dashboard):
//   - Background: emerald-500
//   - Hover: emerald-400
//   - Text: white, bold
//   - Icon: arrow-right
// Secondary (Run Again):
//   - Background: transparent
//   - Border: slate-700
//   - Text: slate-400
//   - Hover: emerald accent
//   - Icon: refresh/repeat
```

---

## API Integration

### Endpoint: `POST /api/admin/simulate-lead`

**Request:**
```json
{
  "leadName": "Sarah Johnson",
  "propertyInterest": "3-bedroom home in Austin",
  "leadPhone": "optional"
}
```

**Response:**
```json
{
  "id": "uuid",
  "conversation": [
    {
      "role": "lead",
      "message": "Hi! I'm interested in buying a home in Austin...",
      "timestamp": "2026-03-11T14:41:00Z"
    },
    {
      "role": "ai",
      "message": "Hi Sarah! 👋 I'd love to help you...",
      "timestamp": "2026-03-11T14:41:05Z"
    }
  ],
  "outcome": "completed",
  "createdAt": "2026-03-11T14:41:05Z"
}
```

**Measurement:**
- Capture API call start time
- Measure time until first AI message renders
- Display as: `responseTime = firstAIMessageTime - callStartTime`

---

## Responsive Design

### Desktop (1024px+)
- Phone mockup: max-width 280px, centered
- Full card padding (p-10)
- Buttons: flex-row (side-by-side)
- All animations enabled

### Tablet (768px-1023px)
- Phone mockup: max-width 240px
- Card padding: p-6
- Buttons: flex-row, reduced spacing
- Animations: same

### Mobile (<768px)
- Phone mockup: full-width (px-2)
- Card padding: p-4
- Buttons: flex-col (stacked)
- Animations: reduced complexity (disable on very slow devices)

---

## Animation Timings

| Animation | Duration | Easing | Purpose |
|-----------|----------|--------|---------|
| Page entry | 500ms | ease-out | Content slides up on mount |
| Message pop | 400ms | ease-out | Each message animates in |
| Message stagger | 800ms delays | — | 0s, 0.8s, 1.6s, 2.4s |
| Typing dots | 1.4s | ease-in-out | Continuous bounce |
| Success pulse | 800ms | ease-out | Once on completion |
| Step indicator | 2s | — | Continuous ring pulse |

---

## Error Handling

### Scenarios

1. **API call fails**
   - Show error message below phone mockup
   - "Something went wrong. Please try again?"
   - Retry button enabled
   - Skip to dashboard link available

2. **Network timeout (>10s)**
   - Show timeout error
   - "This is taking longer than expected"
   - Retry with "Run Again" button
   - Allow skip

3. **Invalid response**
   - Show friendly error
   - "Unexpected response format"
   - Retry button
   - Support link

---

## Success Metrics (for Dev to Track)

### Analytics Events to Fire

```javascript
// When step is shown
trackEvent('wizard_step_4_shown', {
  agent_id: agentId,
  agent_name: agentName
})

// When simulation starts
trackEvent('simulator_started', {
  agent_id: agentId,
  timestamp: Date.now()
})

// When simulation completes
trackEvent('simulator_completed', {
  agent_id: agentId,
  response_time_ms: responseTime,
  message_count: conversation.length
})

// When user clicks "Go to Dashboard"
trackEvent('aha_moment_achieved', {
  agent_id: agentId,
  step: 4,
  wizard_time_ms: wizardStartToEnd
})

// When user clicks "Run Again"
trackEvent('simulator_rerun', {
  agent_id: agentId
})

// When user skips
trackEvent('wizard_step_4_skipped', {
  agent_id: agentId
})
```

---

## Accessibility

### WCAG 2.1 AA Compliance

- **Color Contrast:** All text meets 4.5:1 on backgrounds
- **Motion:** Provide `prefers-reduced-motion` fallback
- **Focus:** Visible focus indicators on all buttons
- **Keyboard:** Tab navigation works; buttons keyboard-accessible
- **ARIA:** Use `aria-label` on icon-only buttons
- **Semantic HTML:** Use `<button>` not `<div>` for interactive elements

### Implementation

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## Testing Checklist (for QC)

- [ ] Simulation auto-triggers on step entry
- [ ] All 4 messages display with correct content
- [ ] Staggered animations render smoothly (no jank)
- [ ] Response time calculated correctly
- [ ] Status bar shows accurate metrics
- [ ] "Run Again" button re-triggers simulation
- [ ] "Go to Dashboard" navigates to `/dashboard`
- [ ] "Skip" advances to completion screen
- [ ] Phone mockup renders correctly on mobile
- [ ] All buttons keyboard-accessible
- [ ] No real SMS sent (check Twilio logs)
- [ ] Simulation data stored in `lead_simulations` table
- [ ] Analytics events fire correctly
- [ ] Error handling works (simulate API failure)
- [ ] Loading state shows spinner during API call

---

## File Structure

```
product/lead-response/dashboard/
├── app/
│   ├── setup/
│   │   ├── page.tsx                 # Updated to include Step 4
│   │   ├── steps/
│   │   │   ├── fub.tsx              # Existing
│   │   │   ├── twilio.tsx           # Existing
│   │   │   ├── sms-verify.tsx       # Existing
│   │   │   ├── simulator.tsx        # NEW — Step 4
│   │   │   │   ├── SimulatorStep.tsx
│   │   │   │   ├── PhoneMockup.tsx
│   │   │   │   ├── ChatBubble.tsx
│   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   ├── StatusBar.tsx
│   │   │   │   └── ActionButtons.tsx
│   │   │   └── complete.tsx         # Updated (now Step 5 content)
```

---

## Notes for Dev

1. **Reuse existing code:** The `/api/admin/simulate-lead` endpoint already exists in the admin simulator. Reuse it here.
2. **Animation library:** Use Tailwind's `animate-` utilities + custom CSS keyframes. No need for Framer Motion.
3. **Mobile-first:** Start with mobile styles, then adjust for larger screens.
4. **No Twilio calls:** This step uses dry-run simulation only. Verify no real SMS in Twilio logs.
5. **Performance:** Phone mockup should render smoothly even on budget phones. Test on real devices if possible.

---

*Component specifications by Design Agent — LeadFlow AI*
*Date: March 11, 2026*
