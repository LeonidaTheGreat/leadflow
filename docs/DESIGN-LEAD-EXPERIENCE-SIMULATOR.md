# Design Spec: Lead Experience Simulator & Conversation Viewer

**Document ID:** DESIGN-LEAD-EXPERIENCE-SIMULATOR  
**Version:** 1.0  
**Date:** 2026-03-11  
**Status:** Ready for Dev  
**Related PRD:** PRD-LEAD-EXPERIENCE-SIMULATOR  
**Task ID:** b4878411-32af-43d5-a413-2a09d803224f

---

## 1. Design Philosophy

> Remove everything that doesn't earn its place. The simulator exists for one job: let Stojan run a live demo in under 2 minutes and feel confident doing it. Every element either enables that or gets cut.

**Design principles applied:**
- **Clarity first:** Stojan is demoing to a prospective agent. The screen must look professional — not like a debug tool.
- **Two-mode, one page:** Simulator + Conversation Viewer live in the same page via tabs. No navigating away mid-demo.
- **Chat is the hero:** The conversation UI is the product's value prop made visible. Give it room. Make it look like iMessage quality, not a log dump.
- **Demo mode is trust-building:** The share link view must be presentable to someone who has never heard of LeadFlow. No internal chrome visible.

---

## 2. Page Structure — `/admin/simulator`

### 2.1 Route & Auth

- **Authenticated path:** `/admin/simulator` — requires normal dashboard session
- **Demo path:** `/admin/simulator?demo=<token>` — bypasses auth, shows read-only simulator only

### 2.2 Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [LeadFlow AI]  Lead Feed  History  Analytics  [Simulator]   │  ← Nav (add "Simulator" link)
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Lead Experience Simulator                   [Share Demo ↗]  │  ← Page header
│  Test how AI responds to your leads                          │
│                                                              │
│  ┌─ Simulator ──┐  ┌─ Real Conversations ──────────────────┐ │  ← Tab bar
│  └──────────────┘  └────────────────────────────────────────┘ │
│                                                              │
│  [Tab content area — see §3 and §4]                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Nav addition:** Add "Simulator" link to `DashboardNav` — placed after "Analytics", before the status indicator. Font/color matches existing nav links.

**Page header:**
- H1: `Lead Experience Simulator` — `text-2xl font-bold text-slate-900`
- Subtitle: `Test how the AI responds to your leads without sending any real SMS` — `text-sm text-slate-500 mt-1`
- Share Demo button: top-right, ghost/outline variant, `Share Demo ↗` with `lucide/Share2` icon (16px). Hidden in demo mode.

---

## 3. Tab 1 — Simulator

### 3.1 Layout

Two-column split on desktop. Single-column stack on mobile (form above chat).

```
┌─────────────────────────┬──────────────────────────────────┐
│   LEFT PANEL (form)     │   RIGHT PANEL (conversation)     │
│   min-w: 320px          │   flex-1, min-w: 400px           │
│   max-w: 380px          │                                  │
└─────────────────────────┴──────────────────────────────────┘
```

**Container:** `flex gap-6`, inside a `Card` wrapper. Card: `bg-white rounded-xl border border-slate-200 shadow-sm p-6`.

---

### 3.2 Left Panel — Simulation Form

**Section label:** `Configure Lead` — `text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4`

**Fields (vertical stack, gap-4):**

#### Field 1: Lead Name
- Label: `Lead Name` — `text-sm font-medium text-slate-700`
- Input: text input, placeholder `"e.g. Sarah Johnson"`
- Validation: required, min 2 chars
- Helper text (below input): `text-xs text-slate-400` — `Used in the greeting — enter any name`

#### Field 2: Property Interest
- Label: `Property Interest` — optional badge inline with label (`Optional` — `text-xs text-slate-400`)
- Input: text input, placeholder `"e.g. 3-bed home in Scottsdale under $600K"`
- Helper text: `Shapes the AI's first response — leave blank for generic inquiry`

#### Field 3: Lead Script
- Label: `Lead Replies` — optional badge
- Control: segmented selector (radio group styled as pill buttons)
  - `Standard` (default) — 3-turn script covering inquiry → clarification → booking
  - `Skeptical` — lead pushes back, asks more questions
  - `Eager` — lead responds immediately, books fast
- Styling: pill group — `inline-flex rounded-lg border border-slate-200 overflow-hidden`
- Selected pill: `bg-slate-900 text-white`
- Unselected: `bg-white text-slate-600 hover:bg-slate-50`

**Run Simulation button:**
- Full-width, `mt-6`
- Variant: primary (filled black)
- Label: `Run Simulation`
- Icon: `lucide/Play` (16px) — left of label
- Loading state: replace icon with spinner (`lucide/Loader2` animated), label becomes `Simulating…`
- Disabled when: name is empty OR simulation is running

**Status strip (below button, conditionally shown):**
- Idle: hidden
- Running: `text-sm text-slate-500` with animated dots: `Generating AI responses…`
- Complete: `text-sm text-emerald-600` with `lucide/CheckCircle` icon (14px): `Simulation complete`
- Error: `text-sm text-red-500` with `lucide/AlertCircle` icon (14px): error message

---

### 3.3 Right Panel — Conversation Output

**Empty state (before first simulation):**
```
┌─────────────────────────────────────────┐
│                                         │
│         [MessageSquare icon 40px]       │
│                                         │
│    Run a simulation to see             │
│    the conversation here               │
│                                         │
│    Fill in the lead name on the left   │
│    and click Run Simulation            │
│                                         │
└─────────────────────────────────────────┘
```
- Icon: `lucide/MessageSquare`, 40px, `text-slate-300`
- Text: `text-sm text-slate-400 text-center`
- Background: `bg-slate-50 rounded-lg`, fills the panel height

**Populated state:**

Panel header (within right panel):
- Left: `Simulated Conversation` — `text-sm font-semibold text-slate-700`
- Right: turn count `3 turns` — `text-xs text-slate-400`
- Below: thin separator `border-b border-slate-100 mb-4`

**Conversation thread:**
- Scrollable area: `overflow-y-auto max-h-[500px]`
- Messages in chronological order, oldest first (top), newest last (bottom)
- After simulation completes: auto-scroll to bottom

**Message bubble — Lead (incoming):**
```
[L] ┌─────────────────────────────────────┐
    │ Message text here                   │
    └─────────────────────────────────────┘
         10:32 AM
```
- Avatar: circle `bg-slate-200` with lead's initial (uppercase), `text-xs font-semibold text-slate-600`, 28px
- Bubble: left-aligned, `bg-slate-100 text-slate-800`
- Max-width: 75% of panel
- Border-radius: `rounded-2xl rounded-tl-sm`
- Padding: `px-4 py-2.5`
- Timestamp: `text-xs text-slate-400 mt-1 ml-1`

**Message bubble — AI (outgoing):**
```
          ┌─────────────────────────────────────┐ [AI]
          │ Message text here                   │
          └─────────────────────────────────────┘
                                     10:32 AM
```
- Avatar: circle `bg-indigo-600` with `AI` text, `text-xs font-bold text-white`, 28px
- Bubble: right-aligned, `bg-indigo-600 text-white`
- Max-width: 75%
- Border-radius: `rounded-2xl rounded-tr-sm`
- Padding: `px-4 py-2.5`
- Timestamp: `text-xs text-indigo-300 mt-1 mr-1 text-right`

**Message spacing:** `mb-3` between each message group (lead + AI pair). `mb-5` between turns.

**Typing indicator** (while simulation is running, after each lead message):
```
[AI] ●  ●  ●
```
- 3 dots, staggered fade-in animation (CSS keyframes), `text-indigo-400`
- Disappears when AI message appears

**Outcome badge (bottom of thread, simulation complete):**
```
─────────────────────────────────────────
✓  Simulation complete · 3 turns · No SMS sent
```
- Separator line `border-t border-slate-100 mt-4 pt-3`
- Icon: `lucide/ShieldCheck` 14px `text-emerald-500`
- Text: `text-xs text-slate-500`
- "No SMS sent" portion: `font-semibold text-emerald-600`

---

### 3.4 Demo Share Link (Modal)

Triggered by "Share Demo ↗" button. Modal appears centered.

**Modal:**
- Title: `Generate Demo Link` — `text-lg font-semibold`
- Body: `text-sm text-slate-500 mb-4` — `This link lets anyone view the simulator for 24 hours — no login required. Great for pitches.`
- Generate button: `Generate Link` (filled primary) — on click, calls `/api/admin/demo-link`, shows spinner
- Output (after generation):
  ```
  ┌─────────────────────────────────────────┐
  │ https://leadflow.ai/admin/simulator?... │  [Copy]
  └─────────────────────────────────────────┘
  Expires in 24 hours
  ```
  - URL field: `bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 flex-1`
  - Copy button: `lucide/Copy` icon + "Copy" text, outline variant
  - After copy: button label flips to `✓ Copied` for 2s, then resets
  - Expiry note: `text-xs text-slate-400 mt-2`
- Dismiss: "Close" text button or click outside

---

## 4. Tab 2 — Real Conversations

### 4.1 Tab Header Area

- Tab label: `Real Conversations`
- Sub-label (right): `Last 10 conversations · anonymized` — `text-xs text-slate-400`

### 4.2 Filter Bar

```
All Outcomes ▾    [Booked]  [In Progress]  [Opted Out]
```
- Segmented control, same pill-button style as lead script selector
- Filters client-side (no re-fetch required)
- Default: "All"
- `mt-4 mb-6`

### 4.3 Conversation List

Each item is a row in a list (`divide-y divide-slate-100`). Rows are expandable.

**Collapsed row:**
```
┌──────────────────────────────────────────────────────────────┐
│  [S]  Sarah J.              2h ago   ● Booked    5 msgs  [↓] │
└──────────────────────────────────────────────────────────────┘
```

Layout: `flex items-center gap-4 py-4 cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors`

- **Avatar:** 36px circle, `bg-slate-200`, lead initial, `text-sm font-semibold text-slate-600`
- **Name:** `text-sm font-medium text-slate-800`, first name + last initial + period (e.g., `Sarah J.`) — `flex-1`
- **Date:** `text-xs text-slate-400` — relative time (e.g., `2h ago`, `Yesterday`, `Mar 9`)
- **Outcome badge:** pill, `text-xs font-medium px-2.5 py-0.5 rounded-full`
  - Booked: `bg-emerald-50 text-emerald-700 border border-emerald-200`
  - In Progress: `bg-amber-50 text-amber-700 border border-amber-200`
  - Opted Out: `bg-red-50 text-red-600 border border-red-200`
- **Message count:** `text-xs text-slate-400` — `5 msgs`
- **Chevron:** `lucide/ChevronDown` 16px `text-slate-400` — rotates 180° when expanded (CSS transition)

**Expanded row (below collapsed row, smooth accordion animation):**

```
┌──────────────────────────────────────────────────────────────┐
│  [S]  Sarah J.              2h ago   ● Booked    5 msgs  [↑] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [S] Hey I saw your listing for the property on Oak Ave     │
│                                             10:12 AM         │
│                                                              │
│            Hi Sarah! I'm LeadFlow AI... [AI bubble]  [AI]   │
│                                             10:12 AM         │
│                                                              │
│  [S] What's the price range for similar...                  │
│                              ···                             │
│                                                              │
│  Phone: ***-***-1234   ·   Booked: Cal.com appt 3/10        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Chat thread uses identical bubble styles as simulator (§3.3)
- Expands inline in the list with `max-h` transition for animation
- `bg-slate-50 rounded-b-lg px-4 pb-4`
- Thread section: `mt-3 max-h-[300px] overflow-y-auto`
- Footer strip: `border-t border-slate-100 pt-3 mt-3 text-xs text-slate-400 flex gap-4`
  - Phone masked: `Phone: ***-***-1234`
  - Outcome detail: `Booked: Cal.com appt 3/10` or `Opted out: Turn 2` or `In Progress: awaiting reply`

### 4.4 Empty State

If no real conversations exist yet:
```
┌─────────────────────────────────────────┐
│                                         │
│         [Inbox icon 40px]               │
│                                         │
│    No conversations yet                │
│                                         │
│    Real lead conversations will         │
│    appear here as they come in         │
│                                         │
└─────────────────────────────────────────┘
```
- Icon: `lucide/Inbox`, `text-slate-300`
- Center-aligned, `py-16`

---

## 5. Demo Mode — `/admin/simulator?demo=<token>`

When the page loads with a valid `?demo=` token, apply these rules:

### 5.1 Layout Differences

| Element | Auth mode | Demo mode |
|---------|-----------|-----------|
| Nav bar | Full nav | Hidden (clean header only) |
| Real Conversations tab | Visible | Hidden |
| Share Demo button | Visible | Hidden |
| Page header subtitle | Internal subtitle | `Powered by LeadFlow AI` in `text-slate-400` |
| "Simulation complete · No SMS sent" | Visible | Visible |

### 5.2 Demo Mode Header

```
┌──────────────────────────────────────────────────────────────┐
│  🏠 LeadFlow AI                          Powered by AI       │
│  Lead Experience Demo                                        │
└──────────────────────────────────────────────────────────────┘
```
- Minimal header: `bg-white border-b border-slate-200 px-8 py-4`
- Logo text: `text-lg font-bold text-slate-900` with `🏠` prefix
- Right: `text-sm text-slate-400 italic` — `Powered by AI`

### 5.3 Expired / Invalid Token

Full-page centered error state:
```
┌─────────────────────────────────────────┐
│                                         │
│         [Lock icon 48px]                │
│                                         │
│    This demo link has expired          │
│                                         │
│    Demo links are valid for 24 hours.  │
│    Ask your LeadFlow contact for a     │
│    new link.                           │
│                                         │
└─────────────────────────────────────────┘
```
- Icon: `lucide/Lock`, 48px, `text-slate-300`
- Title: `text-xl font-semibold text-slate-700`
- Body: `text-sm text-slate-400 max-w-xs text-center mt-2`
- No nav, no branding links

---

## 6. Component Specifications

### 6.1 Component Tree

```
/admin/simulator (page)
├── SimulatorPageHeader
│   ├── PageTitle + Subtitle
│   └── ShareDemoButton → DemoLinkModal
├── SimulatorTabs (shadcn Tabs)
│   ├── Tab: Simulator
│   │   └── SimulatorPanel
│   │       ├── SimulationForm (left)
│   │       │   ├── LeadNameInput
│   │       │   ├── PropertyInterestInput
│   │       │   ├── LeadScriptSelector (pill group)
│   │       │   ├── RunSimulationButton
│   │       │   └── SimulationStatus
│   │       └── ConversationOutput (right)
│   │           ├── EmptyState (no simulation yet)
│   │           └── ChatThread
│   │               ├── MessageBubble (×N)
│   │               ├── TypingIndicator
│   │               └── OutcomeBadge
│   └── Tab: Real Conversations
│       └── ConversationsPanel
│           ├── FilterBar (pill group)
│           ├── ConversationList
│           │   └── ConversationRow (×N, accordion)
│           │       ├── CollapsedRowHeader
│           │       └── ExpandedThread
│           └── EmptyState (no conversations)
└── DemoLinkModal
    ├── GenerateLinkButton
    └── LinkOutput (URL + Copy button)
```

### 6.2 Existing shadcn/ui Components to Use

| Component need | shadcn component | Import path |
|---|---|---|
| Input fields | `Input` | `@/components/ui/input` |
| Buttons | `Button` (variants: default, ghost, outline) | `@/components/ui/button` |
| Cards | `Card, CardContent, CardHeader` | `@/components/ui/card` |
| Tabs | `Tabs, TabsList, TabsTrigger, TabsContent` | `@/components/ui/tabs` |
| Modal | `Dialog, DialogContent, DialogHeader` | `@/components/ui/dialog` |
| Label | `Label` | `@/components/ui/label` |
| Badge | `Badge` | `@/components/ui/badge` |
| Separator | `Separator` | `@/components/ui/separator` |

**Do NOT add new design tokens.** Use existing CSS variables and Tailwind classes throughout.

---

## 7. Design Tokens & Color Mapping

### Outcome Badges
| State | Background | Text | Border |
|---|---|---|---|
| Booked | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| In Progress | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| Opted Out | `bg-red-50` | `text-red-600` | `border-red-200` |
| Completed (sim) | `bg-slate-100` | `text-slate-600` | `border-slate-200` |

### Chat Bubbles
| Role | Background | Text | Border-radius override |
|---|---|---|---|
| Lead (incoming) | `bg-slate-100` | `text-slate-800` | `rounded-2xl rounded-tl-sm` |
| AI (outgoing) | `bg-indigo-600` | `text-white` | `rounded-2xl rounded-tr-sm` |

### Interactive States
- Hover rows: `hover:bg-slate-50` + `transition-colors duration-150`
- Focus inputs: use default ring from design system (`focus-visible:ring-2`)
- Loading spinner: `animate-spin` on `lucide/Loader2`

---

## 8. Typography

| Element | Class |
|---|---|
| Page H1 | `text-2xl font-bold text-slate-900` |
| Section label | `text-xs font-semibold text-slate-400 uppercase tracking-wide` |
| Field label | `text-sm font-medium text-slate-700` |
| Field helper | `text-xs text-slate-400` |
| Body text | `text-sm text-slate-600` |
| Chat message | `text-sm` (inherits bubble color) |
| Timestamp | `text-xs text-slate-400` (lead) / `text-xs text-indigo-300` (AI) |
| Badge text | `text-xs font-medium` |

Font: Inter (already loaded in `DashboardLayout`). No new fonts.

---

## 9. Spacing & Sizing

| Token | Value |
|---|---|
| Form field gap | `gap-4` (16px) |
| Panel gap | `gap-6` (24px) |
| Chat bubble padding | `px-4 py-2.5` |
| Avatar size | 28px (chat) / 36px (list) |
| Max chat thread height | `max-h-[500px]` (simulator) / `max-h-[300px]` (expanded list) |
| Min left panel width | `320px` |
| Max left panel width | `380px` |

---

## 10. Responsive Behavior

| Breakpoint | Simulator tab | Conversations tab |
|---|---|---|
| `lg` (≥1024px) | Two-column side-by-side | List with full row |
| `md` (768–1023px) | Two-column (narrower) | List, date hidden |
| `sm` (<768px) | Single column (form → chat stacked) | List, compact (badge + name only) |

**Mobile stack order:** Form panel above conversation output. Conversation scrolls to view after simulation starts.

---

## 11. Animation Spec

| Interaction | Animation |
|---|---|
| Accordion expand/collapse | `max-height` transition, `duration-200 ease-in-out` |
| Message bubbles appearing | Fade in + slight upward translate, `duration-200`, staggered 100ms per bubble |
| Typing indicator dots | Keyframe: `opacity 0.6 → 1 → 0.6`, 3 dots offset by 200ms each |
| Chevron rotation | `rotate-0` → `rotate-180`, `transition-transform duration-200` |
| Copy button feedback | Label swap with `setTimeout 2000` |

---

## 12. API Contract (for Dev Reference)

### POST /api/admin/simulate-lead
**Request body:**
```json
{
  "leadName": "Sarah Johnson",
  "propertyInterest": "3-bed in Scottsdale under $600K",
  "script": "standard" | "skeptical" | "eager"
}
```
**Response:**
```json
{
  "simulationId": "uuid",
  "conversation": [
    { "role": "lead", "message": "Hi, I'm interested in...", "timestamp": "ISO8601" },
    { "role": "ai", "message": "Hey Sarah! ...", "timestamp": "ISO8601" },
    ...
  ],
  "outcome": "completed" | "error",
  "turns": 3
}
```
**UI behavior:** Stream response turn-by-turn if SSE available; otherwise load all at once after completion.

### GET /api/admin/conversations
**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "leadFirstName": "Sarah",
      "leadLastInitial": "J",
      "phoneMasked": "***-***-1234",
      "date": "ISO8601",
      "messageCount": 5,
      "outcome": "booked" | "in-progress" | "opted-out",
      "thread": [
        { "role": "lead" | "ai", "message": "...", "timestamp": "ISO8601" }
      ]
    }
  ]
}
```

### POST /api/admin/demo-link
**Response:**
```json
{
  "token": "abc123",
  "url": "https://yourdomain.com/admin/simulator?demo=abc123",
  "expiresAt": "ISO8601"
}
```

---

## 13. Accessibility

- All form inputs have associated `<Label>` via `htmlFor`/`id`
- Buttons have visible focus states (default ring)
- Chat bubbles: `role="log"` on the thread container, `aria-live="polite"` for new messages
- Accordion rows: `aria-expanded` on trigger, `aria-controls` pointing to expanded content
- Outcome badges: don't rely on color alone — text label always present
- Typing indicator: `aria-label="AI is responding"`, `aria-live="polite"`

---

## 14. File Structure for Dev

```
product/lead-response/dashboard/
├── app/
│   └── admin/
│       └── simulator/
│           └── page.tsx                    ← Main page entry
├── components/
│   ├── simulator/
│   │   ├── SimulatorPanel.tsx              ← Left form + right output
│   │   ├── SimulationForm.tsx              ← Input form
│   │   ├── ConversationOutput.tsx          ← Chat thread display
│   │   ├── MessageBubble.tsx               ← Single chat message
│   │   ├── TypingIndicator.tsx             ← Animated dots
│   │   └── DemoLinkModal.tsx               ← Share modal
│   └── conversations/
│       ├── ConversationsPanel.tsx          ← Conversations tab
│       ├── ConversationRow.tsx             ← Accordion row
│       └── OutcomeBadge.tsx                ← Reusable badge
├── app/
│   └── api/
│       └── admin/
│           ├── simulate-lead/
│           │   └── route.ts
│           ├── conversations/
│           │   └── route.ts
│           └── demo-link/
│               └── route.ts
└── middleware.ts                           ← Add demo token bypass logic
```

---

## 15. Out of Scope (Do Not Design)

- Dark mode variant (system default applies via existing CSS variables)
- Mobile app version
- Bulk simulation / batch runs
- Analytics charts on simulation history
- Multi-agent selection UI

---

## Wireframe Reference

See: `docs/wireframes/simulator-wireframe.html` for a static visual mockup.

---

*This document is the design source of truth. Dev should implement exactly as specified. Any deviation requires design approval.*
