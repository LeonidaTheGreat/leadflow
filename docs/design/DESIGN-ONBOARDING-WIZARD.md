# Design Spec: Post-Login Onboarding Wizard
**Task:** feat-post-login-onboarding-wizard  
**PRD:** PRD-ONBOARDING-WIZARD-001  
**Designer:** Design Agent  
**Status:** Delivered  

---

## 1. Design Overview

A 3-step fullscreen wizard shown immediately after first login. Not a modal overlay — the wizard *is* the page. Agents cannot access the dashboard until they complete or dismiss it.

**Goal:** Get agents to "aha moment" (first AI SMS to a lead fires) in under 10 minutes.

**Tone:** Confident, fast, frictionless. Not corporate onboarding — feels like a setup assistant that knows what it's doing.

---

## 2. Visual Language

### Color Palette (inherits from existing dashboard)

| Token | Value | Use |
|-------|-------|-----|
| `bg-slate-950` | `oklch(0.09 0 0)` | Page background |
| `bg-slate-900` | `oklch(0.13 0 0)` | Card/container |
| `bg-slate-800` | `oklch(0.18 0 0)` | Input backgrounds |
| `bg-slate-700/50` | semi-transparent | Secondary surfaces |
| `emerald-500` | `#10b981` | Primary CTA, success state |
| `emerald-400` | `#34d399` | Success text, verified badge |
| `orange-500` | `#f97316` | FUB integration accent |
| `blue-500` | `#3b82f6` | Phone step accent |
| `violet-500` | `#8b5cf6` | SMS verify step accent |
| `red-400` | `#f87171` | Error state |
| `slate-300` | `#cbd5e1` | Body text on dark |
| `slate-400` | `#94a3b8` | Secondary/muted text |
| `white` | `#ffffff` | Headings |

### Typography

| Element | Style |
|---------|-------|
| Page title | `text-3xl font-bold text-white` |
| Step title | `text-2xl font-bold text-white` |
| Step subtitle | `text-base text-slate-300` |
| Label | `text-sm font-medium text-slate-200` |
| Helper text | `text-xs text-slate-400` |
| Button primary | `text-sm font-semibold text-white` |
| Button secondary | `text-sm font-medium text-slate-300` |

### Spacing System
- Card padding: `p-8 md:p-12`  
- Section gaps: `space-y-6`  
- Input height: `h-12` (48px)  
- Button height: `h-12` (48px), full-width on mobile  
- Progress bar height: `h-2` (8px)  

### Border Radius
- Cards: `rounded-2xl`  
- Inputs: `rounded-lg`  
- Buttons: `rounded-lg`  
- Progress pills: `rounded-full`  
- Icon containers: `rounded-xl`  

### Shadows / Depth
- Card: `shadow-2xl shadow-black/40`  
- Active step in progress: subtle glow `ring-2 ring-emerald-500/30`  

---

## 3. Page Layout — `/onboarding` Route (Post-Login)

This is a **new route** separate from the existing pre-login `/onboarding` (signup flow). 

**Route:** `/onboarding/setup` or `/dashboard/setup` (dev decides, both work — just needs to differ from `/onboarding`)

> **Note to Dev:** The existing `/onboarding` handles pre-login account creation. This wizard is post-login. Consider `/setup` as the route or a query-param guard on `/onboarding` (e.g. `?step=integration`).

### Full Page Structure

```
┌──────────────────────────────────────────────────────────────┐
│  bg-slate-950 min-h-screen                                    │
│                                                               │
│  ┌── Header (fixed top, h-16) ──────────────────────────────┐ │
│  │  [LeadFlow AI logo]          [agent@email.com] [Logout]  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌── Content (centered, max-w-2xl, py-12) ──────────────────┐ │
│  │                                                           │ │
│  │  ┌── Welcome Header ──────────────────────────────────┐  │ │
│  │  │  "Welcome to LeadFlow, [Name]! 👋"                 │  │ │
│  │  │  "Let's get you connected in 3 quick steps."       │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  │                                                           │ │
│  │  ┌── Progress Bar ────────────────────────────────────┐  │ │
│  │  │  [Step 1: Connect FUB] — [Step 2: Add Phone]       │  │ │
│  │  │  — [Step 3: Verify SMS]                            │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  │                                                           │ │
│  │  ┌── Step Card (animated transition) ────────────────┐   │ │
│  │  │  [Step content changes here]                       │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Component: Progress Bar

### Visual Design

```
  Step 1              Step 2              Step 3
  ┌──────────┐  ────  ┌──────────┐  ────  ┌──────────┐
  │  ✅ or 1  │        │  🔵 or 2  │        │  ○ or 3  │
  └──────────┘        └──────────┘        └──────────┘
  Connect FUB         Add Phone           Verify SMS
```

**States per step:**
- **Completed:** Filled circle `bg-emerald-500` with white checkmark icon, connector line turns emerald
- **Active/Current:** Filled circle `bg-emerald-500` with step number, pulsing ring animation `animate-pulse ring-2 ring-emerald-500/40`
- **Pending:** Outlined circle `border-2 border-slate-600` with step number in `text-slate-500`, connector line `bg-slate-700`

**Layout:**
```
flex items-center justify-between (full width)

[○ pill] ── [thin line, flex-1] ── [○ pill] ── [thin line] ── [○ pill]
[label below each pill, text-xs, text-center, w-24]
```

**Step labels:**
- Step 1: "Connect FUB"
- Step 2: "Add Phone"
- Step 3: "Verify SMS"

**Sizing:** Pill = `w-10 h-10`, connector line = `h-0.5 flex-1 mx-2`

---

## 5. Step 1: Connect FUB

### Layout

```
┌─────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-slate-900 to-slate-800      │
│  border border-slate-700/50 rounded-2xl p-8 md:p-12 │
│                                                     │
│   ┌─ Icon container ─────────────────────────────┐  │
│   │  w-16 h-16 rounded-xl bg-orange-500/20       │  │
│   │  border-orange-500/50                        │  │
│   │  [🏠 emoji or FUB logo, text-3xl]            │  │
│   └──────────────────────────────────────────────┘  │
│   (centered)                                        │
│                                                     │
│   "Connect Follow Up Boss"  ← text-3xl font-bold   │
│   "Sync your leads automatically"  ← text-slate-300 │
│   (both centered)                                   │
│                                                     │
│   ┌─ Info box ───────────────────────────────────┐  │
│   │  bg-orange-500/10 border-orange-500/20       │  │
│   │  🔒 "Your API key is encrypted..."           │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   ┌─ Input: FUB API Key ─────────────────────────┐  │
│   │  Label: "Follow Up Boss API Key"             │  │
│   │  [🔑] [••••••••••••••••••••]  [Show/Hide]   │  │
│   │  type="password" with toggle                 │  │
│   │  Helper: "Get yours → followupboss.com/api"  │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   [STATE: idle — no button until key entered]       │
│   [STATE: key entered → "Verify API Key" btn shown] │
│   [STATE: verifying → spinner in button]            │
│   [STATE: error → red error box below input]        │
│   [STATE: verified → green success box]             │
│                                                     │
│   ┌─ Features list ──────────────────────────────┐  │
│   │  bg-slate-700/20 rounded-lg p-4              │  │
│   │  • Automatic lead syncing from FUB           │  │
│   │  • Instant AI responses to new leads         │  │
│   │  • Two-way contact sync                      │  │
│   │  • Activity logging in FUB                   │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   ┌─ Bottom nav ─────────────────────────────────┐  │
│   │  [Skip for now ↗] (text-sm text-slate-400)   │  │
│   │  [Continue →] (primary, full-width)          │  │
│   └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Input States

**Default:**
```
┌────────────────────────────────────────────────┐
│ 🔑  Enter your FUB API key              [Show] │
└────────────────────────────────────────────────┘
Border: border-slate-600/50
```

**Focus:**
```
Border: border-emerald-500, ring-1 ring-emerald-500/30
```

**Error:**
```
Border: border-red-500
↓
┌─ Error box ────────────────────────────────────┐
│ ⚠  Invalid API key. Please check and try again │
│    bg-red-500/10 border-red-500/30             │
└────────────────────────────────────────────────┘
```

**Verified:**
```
Border: border-emerald-500
↓
┌─ Success box ─────────────────────────────────┐
│ ✅  API key verified!                          │
│     Leads will sync automatically             │
│     bg-emerald-500/10 border-emerald-500/30   │
└───────────────────────────────────────────────┘
```

### Verify Button (appears when key entered)
```
┌──────────────────────────────────────────────────┐
│  🛡  Verify API Key                               │
│  bg-orange-500/20 border border-orange-500/50    │
│  text-orange-300 hover:bg-orange-500/30          │
└──────────────────────────────────────────────────┘
```

### CTA Buttons (bottom of card)

Layout on desktop: Side-by-side `flex gap-3`
Layout on mobile: Stacked, skip link above primary

**Skip link:**
```
text-sm text-slate-400 underline-offset-2
hover:text-slate-300
"Skip for now →"
```

**Continue (primary):**
```
bg-gradient-to-r from-emerald-500 to-emerald-600
hover: from-emerald-600 to-emerald-700
text-white font-semibold
h-12 rounded-lg w-full (mobile) or flex-1 (desktop)
"Continue →"
```

**Disabled state (Continue before verify):**
- Button still shows, but clicking triggers inline validation error — never hard-disabled (avoids confusion on mobile)

---

## 6. Step 2: Configure Phone Number

### Layout

```
┌─────────────────────────────────────────────────────┐
│  (same card shell as Step 1)                        │
│                                                     │
│   ┌─ Icon: ─────────────────────────────────────┐  │
│   │  bg-blue-500/20 border-blue-500/50  📱       │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│   "Set Up Your SMS Number"                          │
│   "Choose how you want to receive and send SMS"     │
│                                                     │
│   ┌─ Option selector ────────────────────────────┐  │
│   │  Two options as cards (radio-style):         │  │
│   │                                              │  │
│   │  ┌────────────────────┐ ┌──────────────────┐ │  │
│   │  │  ✨ Get a new       │ │  🔗 Use existing  │ │  │
│   │  │     number         │ │     number       │ │  │
│   │  │  Provision a fresh │ │  Enter a Twilio  │ │  │
│   │  │  Twilio number     │ │  number you own  │ │  │
│   │  │  in your area code │ │                  │ │  │
│   │  └────────────────────┘ └──────────────────┘ │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   [Conditional: changes based on selection]         │
│                                                     │
│   ┌─ Cost disclosure ────────────────────────────┐  │
│   │  💡 bg-blue-500/10 border-blue-500/20        │  │
│   │  "A Twilio phone number costs ~$1/month       │  │
│   │   — billed to your Twilio account"            │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   [Back ←]   [Skip for now →]   [Continue →]        │
└─────────────────────────────────────────────────────┘
```

### Option Cards (radio-style selection)

**Unselected:**
```
border border-slate-600/50 bg-slate-800/40 rounded-xl p-5
cursor-pointer hover:border-slate-500
```

**Selected:**
```
border-2 border-blue-500 bg-blue-500/10 rounded-xl p-5
ring-1 ring-blue-500/20
```

**Card content:**
```
[Icon emoji — large, centered or left]
[Title — text-base font-semibold text-white]
[Description — text-sm text-slate-400]
```

### Sub-form: "Get a new number"

Appears below option cards when "Get a new number" selected:

```
┌─ Area code input ────────────────────────────────────┐
│  Label: "Desired Area Code"                          │
│  [  📍  ] [ 555                                    ] │
│  Helper: "Enter your area code (e.g. 416 for Toronto)│
│  "We'll provision the closest available number"      │
└──────────────────────────────────────────────────────┘

[STATE: after provision click]
┌─ Assigned number display ────────────────────────────┐
│  ✅  Your number: +1 (555) 123-4567                   │
│  bg-emerald-500/10 border-emerald-500/30             │
│  text-emerald-400 font-mono                          │
└──────────────────────────────────────────────────────┘
```

Provision button (primary style, shown after area code entered):
```
"Get My Number"
bg-blue-500/20 border-blue-500/50 text-blue-300
hover: bg-blue-500/30
```

### Sub-form: "Use existing number"

```
┌─ Phone input ────────────────────────────────────────┐
│  Label: "Your Twilio Phone Number"                   │
│  [  📞  ] [ +1 (555) 123-4567                      ] │
│  Helper: "Must be E.164 format: +15551234567"        │
└──────────────────────────────────────────────────────┘
```

---

## 7. Step 3: Verify SMS

### Layout

```
┌─────────────────────────────────────────────────────┐
│  (same card shell)                                  │
│                                                     │
│   ┌─ Icon: ─────────────────────────────────────┐  │
│   │  bg-violet-500/20 border-violet-500/50  💬   │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│   "Verify Your Setup"                               │
│   "Send a test SMS to confirm everything works"     │
│                                                     │
│   ┌─ Disabled banner (if Step 2 skipped) ────────┐  │
│   │  ⚠️  bg-amber-500/10 border-amber-500/20     │  │
│   │  "You need to configure a phone number first. │  │
│   │  Go back to Step 2 or skip this step."        │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   ┌─ Configured number display ──────────────────┐  │
│   │  "Sending from: +1 (555) 123-4567"           │  │
│   │  bg-slate-700/30 rounded-lg text-slate-300   │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   ┌─ Mobile number input ────────────────────────┐  │
│   │  Label: "Your Mobile Number"                 │  │
│   │  [  📱  ] [ +1 (416) 555-0000              ] │  │
│   │  Helper: "We'll send a test SMS to this number│  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   [STATE: initial → "Send Test SMS" button]         │
│   [STATE: sending → spinner]                        │
│   [STATE: success → green confirmation]             │
│   [STATE: error → red error + retry]                │
│                                                     │
│   ┌─ SMS preview box ────────────────────────────┐  │
│   │  bg-slate-700/20 rounded-lg p-4              │  │
│   │  "Preview of the SMS you'll receive:"         │  │
│   │                                              │  │
│   │  ┌─ Bubble (speech-bubble style) ──────────┐ │  │
│   │  │  "Hi [Name]! 👋 Your LeadFlow setup is   │ │  │
│   │  │   complete. You're all set to auto-       │ │  │
│   │  │   respond to leads in under 30 seconds.   │ │  │
│   │  │   — LeadFlow AI"                         │ │  │
│   │  │  bg-slate-600/50 rounded-xl rounded-bl-sm│ │  │
│   │  └─────────────────────────────────────────┘ │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   [Back ←]   [Skip for now →]   [Send Test SMS →]   │
└─────────────────────────────────────────────────────┘
```

### Success State (after SMS sent)

Replaces the input area:
```
┌─ Success box ────────────────────────────────────────┐
│                                                      │
│   ┌─ Animation ───┐                                  │
│   │  Large ✅ icon  │ ← animate: scale-in + fade-in  │
│   └───────────────┘                                  │
│                                                      │
│   "SMS Sent! Check Your Phone 📱"  (text-xl bold)    │
│   "We just sent a test message to +1 (416) 555-0000" │
│   text-slate-300                                     │
│                                                      │
│   bg-emerald-500/10 border-emerald-500/30            │
│   rounded-xl p-6 text-center                         │
└──────────────────────────────────────────────────────┘

[Continue to Complete Setup →]  ← primary button, full width
```

### Error State

```
┌─ Error box ──────────────────────────────────────────┐
│  ⚠  "SMS delivery failed"                            │
│     [reason from API if available]                   │
│     bg-red-500/10 border-red-500/30                  │
└──────────────────────────────────────────────────────┘

[Retry →]  [Contact Support ↗]  (two buttons, side by side)
```

---

## 8. Completion / Success Screen

### Layout

```
┌─────────────────────────────────────────────────────┐
│  (same card shell)                                  │
│                                                     │
│   ┌─ Hero ──────────────────────────────────────┐  │
│   │  🎉 (large, 4xl, text-center)               │  │
│   │  "You're All Set!"  text-4xl font-bold      │  │
│   │  text-white text-center                     │  │
│   │  "LeadFlow is ready to auto-respond         │  │
│   │   to your leads in under 30 seconds."       │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│   ┌─ Status summary (3 status cards) ────────────┐  │
│   │                                              │  │
│   │  ┌────────────────────────────────────────┐  │  │
│   │  │  ✅  FUB Connected                      │  │  │
│   │  │      "Leads syncing from Follow Up Boss"│  │  │
│   │  └────────────────────────────────────────┘  │  │
│   │                                              │  │
│   │  ┌────────────────────────────────────────┐  │  │
│   │  │  ✅  Phone: +1 (555) 123-4567           │  │  │
│   │  │      "SMS ready to send and receive"    │  │  │
│   │  └────────────────────────────────────────┘  │  │
│   │                                              │  │
│   │  ┌────────────────────────────────────────┐  │  │
│   │  │  ✅  SMS Verified                       │  │  │
│   │  │      "Test message delivered"           │  │  │
│   │  └────────────────────────────────────────┘  │  │
│   │                                              │  │
│   └──────────────────────────────────────────────┘  │
│                                                     │
│   [If steps were skipped, settings notice:]         │
│   ┌─────────────────────────────────────────────┐  │
│   │  ⚠️ Some steps were skipped. Complete setup  │  │
│   │  anytime in Settings → Integrations.         │  │
│   │  bg-amber-500/10 border-amber-500/20         │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│   ┌─ Primary CTA ──────────────────────────────┐  │
│   │  [Go to Dashboard →]                       │  │
│   │  Full-width, emerald gradient, h-14        │  │
│   │  text-lg font-bold                         │  │
│   └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Status Card Component

**Completed state:**
```
bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4
flex items-center gap-4
[✅ icon: w-8 h-8 text-emerald-400]
[Title: text-base font-semibold text-white]
[Subtitle: text-sm text-slate-400]
```

**Skipped/not-completed state:**
```
bg-amber-500/10 border border-amber-500/30 rounded-xl p-4
flex items-center gap-4
[⚠️ icon: w-8 h-8 text-amber-400]
[Title: text-base font-semibold text-white]
[Subtitle: "Not configured — go to Settings → Integrations"
 text-sm text-amber-300/80]
```

---

## 9. Persistent Dashboard Banner

For agents who dismissed the wizard with incomplete steps, show a persistent banner at the top of the dashboard content area (below the nav, above main content).

```
┌───────────────────────────────────────────────────────────────┐
│  ⚡ Your setup isn't complete — you may be missing leads.      │
│     [Complete Setup →]                          [Dismiss ✕]   │
│  bg-amber-500/10 border-b border-amber-500/20                 │
│  text-amber-300 text-sm py-3 px-4                             │
└───────────────────────────────────────────────────────────────┘
```

- "Complete Setup" links to `/setup` (or the wizard re-entry point)
- Dismissable per session (not permanently — shows again next login until complete)
- Only shows if any step has `status = 'skipped'`

---

## 10. Animations & Transitions

| Event | Animation |
|-------|-----------|
| Step change | `animate-in fade-in slide-in-from-right-4 duration-300` |
| Going back | `animate-in fade-in slide-in-from-left-4 duration-300` |
| Step complete in progress bar | Color fill from left, `transition-colors duration-500` |
| Success checkmark (per step) | `scale-0 → scale-100 + opacity-0 → opacity-100 duration-400` |
| Completion screen entry | `animate-in fade-in zoom-in-95 duration-500` |
| Verify button → spinner | Smooth swap, no layout shift |

Use `tw-animate-css` classes (already in project). No custom keyframes needed.

---

## 11. Mobile Responsiveness

| Element | Mobile behavior |
|---------|----------------|
| Max width | Remove `max-w-2xl`, full width with `px-4` |
| Progress bar labels | Hide text labels (`hidden sm:block`), show only step numbers |
| Option cards (Step 2) | Stack vertically instead of side-by-side |
| CTA buttons | Full-width, stacked vertically (skip above primary) |
| Card padding | `p-6` on mobile (vs `p-12` on desktop) |
| Header | Simplified: just logo, no right-side email |

---

## 12. Accessibility

- All inputs have `<label>` with `htmlFor`
- Error messages use `role="alert"` for screen readers
- Progress bar uses `aria-label="Step X of 3: [name]"` on each step
- Buttons have `aria-disabled` (not `disabled`) where applicable
- Focus ring: `focus-visible:ring-2 ring-emerald-500 ring-offset-slate-900`
- Color is never the sole indicator (icons + text accompany state colors)

---

## 13. Component Inventory for Dev

These are new components to build (in `/components/onboarding/` or similar):

| Component | File | Notes |
|-----------|------|-------|
| `OnboardingShell` | `onboarding-shell.tsx` | Outer layout, header, centering |
| `OnboardingProgress` | `onboarding-progress.tsx` | 3-step progress indicator |
| `StepFUBConnect` | `step-fub-connect.tsx` | Step 1 UI |
| `StepPhoneConfig` | `step-phone-config.tsx` | Step 2 UI with radio + sub-forms |
| `StepSMSVerify` | `step-sms-verify.tsx` | Step 3 UI |
| `CompletionScreen` | `completion-screen.tsx` | Final screen |
| `StatusCard` | `status-card.tsx` | Reusable in completion screen |
| `OnboardingBanner` | `onboarding-banner.tsx` | Dashboard warning banner |
| `OptionCard` | `option-card.tsx` | Radio-style option cards (Step 2) |
| `SMSPreviewBubble` | `sms-preview-bubble.tsx` | SMS preview in Step 3 |

---

## 14. Design Decision Notes

1. **Full page, not modal** — wizard takes over the full viewport. A modal over the empty dashboard creates confusion. A full page is clear: "you're in setup mode."

2. **No back button on Step 1** — first step has no "Back," only "Skip." Avoids sending agents to a broken state. Back button added from Step 2 onward.

3. **Skip is a link, not a button** — visually de-emphasized (`text-sm text-slate-400`) to reduce skip impulse without hiding the option. Accessibility-compliant.

4. **Step 3 disabling** — when Step 2 skipped, Step 3 shows an amber warning banner but is still reachable (agent can still enter a number and re-run). Fully greying it out creates confusion about whether it's broken.

5. **FUB = orange, Phone = blue, SMS = violet** — distinct accent colors prevent visual monotony across 3 similar-looking cards. Each step has its own identity.

6. **SMS preview** — showing the actual SMS copy before sending builds confidence and reduces "what is this" support tickets. Include it in the UI.

7. **"Go to Dashboard" is size `h-14 text-lg`** — completion CTA is intentionally larger than all other buttons. This is the reward click. Make it feel good.

---

## 15. Open Design Questions (for PM/Stojan)

| # | Question | Impact |
|---|----------|--------|
| 1 | Should Step 2 show Twilio branding/logo? | Trust signal; or keep LeadFlow-branded throughout? |
| 2 | Persistent banner: dismiss permanently or per-session? | UX call — I default to per-session (more aggressive re-engagement) |
| 3 | Confetti/celebration animation on completion? | Would delight; low dev cost with `canvas-confetti` |
| 4 | Should FUB step show the registered webhook URL? | Power user transparency; adds complexity |

---

*Spec delivered by Design Agent. Dev can implement directly from this document.*
