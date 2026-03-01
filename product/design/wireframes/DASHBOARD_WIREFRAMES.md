# LeadFlow AI — Dashboard Wireframes

**Design System:** shadcn/ui + Tailwind CSS  
**Platform:** Mobile-first (iPhone 12+), responsive to tablet  
**Theme:** Dark mode (default), light mode (fallback)

---

## Screen 1: Lead Feed (Incoming Leads)

### Purpose
Primary view where agents see new and active leads. Quick scan interface with priority-at-a-glance.

### Layout
```
┌─────────────────────────────┐
│ 🟢 LeadFlow          ⚙️     │  ← Header (16px padding)
├─────────────────────────────┤
│  New Leads (12)             │  ← Tab/Filter
│  [All] [🔴 Urgent] [💬 Wait]│
├─────────────────────────────┤
│                             │
│ ┌───────────────────────┐   │  ← Lead Card (Priority: AMBER/URGENT)
│ │ 🔴 URGENT   [···]     │   │
│ │ Sarah Martinez        │   │
│ │ 📍 Downtown Lofts     │   │
│ │ 💰 $450K   📞 2 min   │   │
│ │ "Viewing property.." │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │  ← Lead Card (Priority: GREEN/QUALIFIED)
│ │ 🟢 QUALIFIED  [···]   │   │
│ │ James Chen            │   │
│ │ 📍 Westside Apt       │   │
│ │ 💰 $320K   📞 5 min   │   │
│ │ [✓ Responded]        │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │  ← Lead Card (Priority: BLUE/PENDING)
│ │ 🔵 PENDING   [···]    │   │
│ │ Lisa Wong             │   │
│ │ 📍 Midtown Suites     │   │
│ │ 💰 $275K   📞 15 min  │   │
│ │ [Waiting for reply]   │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ ⚪ CLOSED    [···]    │   │  ← Lead Card (Completed)
│ │ David Lee             │   │
│ │ 📍 Harbor View        │   │
│ │ 💰 $580K   📞 1h      │   │
│ │ [✓ Scheduled tour]    │   │
│ └───────────────────────┘   │
│                             │
│              [Load More ↓]   │  ← Lazy load trigger
│                             │
└─────────────────────────────┘
│ 📲 [Home] [📧] [📊] [👤]    │  ← Bottom nav
└─────────────────────────────┘
```

### Components & Specs

**Header (60px)**
- Logo/branding: "LeadFlow" (16px, semi-bold, emerald-500)
- Settings icon (32px touch target)
- Status badge: "12 new leads"

**Tabs/Filters (40px)**
- Pills: All, 🔴 Urgent, ✓ Responded, 💬 Waiting
- Single-select (one active tab)
- Horizontal scroll on small screens

**Lead Card (104px height)**
- Border: 1px slate-300 (light), slate-700 (dark)
- Background: slate-50 (light), slate-900 (dark)
- Padding: 12px
- Radius: 8px
- Shadow: subtle (0 1px 3px rgba...)
- Elements (top to bottom):
  1. **Priority Badge** (22px height) + Options menu (32px icon)
  2. **Lead Name** (14px, bold, white/dark-text)
  3. **Property Address** (12px, slate-500)
  4. **Price + Time Since Contact** (13px, semi-bold)
  5. **Status/Quote** (12px, italic, slate-400)

**Priority Colors:**
- 🔴 Urgent/New (Amber-500): `bg-amber-100 text-amber-900` (light), `bg-amber-900/20 border-amber-700` (dark)
- 🟢 Qualified (Emerald-500): `bg-emerald-100 text-emerald-900` (light), `bg-emerald-900/20 border-emerald-700` (dark)
- 🔵 Pending (Blue-500): `bg-blue-100 text-blue-900` (light), `bg-blue-900/20 border-blue-700` (dark)
- ⚪ Closed (Slate-400): `bg-slate-200 text-slate-700` (light), `bg-slate-800/30 border-slate-700` (dark)

**Interactive States:**
- Tap card → Open Screen 2 (Response History)
- Tap options menu → Quick actions (Snooze, Assign, Archive, etc.)
- Swipe left → Quick mark-as-read or snooze

**Bottom Navigation (56px)**
- 4 icons: Home (active), Messages, Analytics, Profile
- Active indicator: Emerald-500 underline (2px)
- Touch target: 48px minimum

---

## Screen 2: Response History (Conversations & Outcomes)

### Purpose
Detailed view of individual lead with full conversation history and action buttons.

### Layout
```
┌─────────────────────────────┐
│ ← [Sarah Martinez]    [···] │  ← Back button + header
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ URGENT • Downtown Lofts │ │
│ │ 💰 $450K • Since 2 min  │ │
│ │ Status: Awaiting response│
│ └─────────────────────────┘ │
├─────────────────────────────┤
│                             │
│  📋 CONVERSATION TIMELINE   │
│                             │
│ [← 11:24 AM] Lead submitted │
│  form on leadflow.ai        │
│                             │
│ [11:26 AM →] You: Hi Sarah! │
│  Interested in the Downtown │
│  Loft viewing? I can show   │
│  it today at 2 PM or 4 PM.  │
│  Let me know!               │
│  [✓ Sent via SMS]           │
│                             │
│ [11:28 AM →] You: Can also │
│  send virtual tour link     │
│  [✓ Sent via SMS]           │
│                             │
│ [11:30 AM ← DELIVERED] ✓✓   │
│ (Waiting for response)      │
│                             │
├─────────────────────────────┤
│  ⏱️  Response Time: 1m 56s   │  ← Metrics
│  📊 Conv. Rate: 73%         │
│                             │
├─────────────────────────────┤
│  [⏱️ Snooze] [🔄 Re-engage] │  ← Actions
│  [📞 Handoff] [✓ Complete]  │
│                             │
└─────────────────────────────┘
│ [💬] [☎️] [···]              │  ← Quick action floating bar
└─────────────────────────────┘
```

### Components & Specs

**Header Card (80px)**
- Lead name (18px, bold)
- Status badge: "URGENT" or "QUALIFIED" etc.
- Property address (12px, secondary)
- Price + time (13px, semi-bold)
- Status text (12px, slate-400)
- Back button (44px touch target, top-left)
- Menu icon (32px, top-right)

**Conversation Timeline**
- Direction: Newer messages at bottom (iOS messaging UX)
- Inbound (from lead): Left-aligned, slate-600 background
- Outbound (from agent): Right-aligned, emerald-500 background
- Each message: padding 12px, radius 12px, max-width 85% of screen
- Timestamp: 11px, slate-400, left-aligned (inbound), right-aligned (outbound)
- Delivery status: ✓ (sent), ✓✓ (delivered), 🕐 (pending)

**Metrics Section (40px)**
- Small cards: "Response Time: X", "Conv. Rate: X%"
- Icons + data pairs (12px text, 10px label)

**Action Buttons (48px)**
- Full-width: [⏱️ Snooze] [🔄 Re-engage] [📞 Handoff] [✓ Complete]
- Grid 2×2 or horizontal scroll on small screens
- Primary action: "✓ Complete" (emerald-500)
- Secondary: Slate-200

**Floating Action Bar (56px, bottom)**
- Quick access: [💬 SMS] [☎️ Call] [⋯ More]
- Emerald-500 background, white icons

---

## Screen 3: Analytics Dashboard

### Purpose
Agent's performance metrics at a glance. Response times, conversion rates, pipeline status.

### Layout
```
┌─────────────────────────────┐
│ 📊 Analytics       [🔄] [⚙️] │  ← Header
├─────────────────────────────┤
│                             │
│ ┌────────────────────────┐  │
│ │ TODAY'S PERFORMANCE    │  │
│ ├────────────────────────┤  │
│ │ Leads Responded: 12    │  │
│ │ Avg Response Time: 2m  │  │
│ │ Conversion Rate: 73%   │  │
│ └────────────────────────┘  │
│                             │
│ ┌────────────────────────┐  │
│ │ PIPELINE STATUS        │  │
│ ├────────────────────────┤  │
│ │ 🔴 URGENT:      8      │  │
│ │ 🟢 QUALIFIED:   14     │  │
│ │ 🔵 PENDING:     6      │  │
│ │ ⚪ CLOSED:      3      │  │
│ └────────────────────────┘  │
│                             │
│ ┌────────────────────────┐  │
│ │ RESPONSE TIME TREND    │  │
│ │                        │  │
│ │    📈 Chart (sparkline)│  │
│ │    [Today] [Week] [Mo] │  │
│ └────────────────────────┘  │
│                             │
│ ┌────────────────────────┐  │
│ │ CONVERSION FUNNEL      │  │
│ │ Leads Received: 31 →   │  │
│ │ Responded: 12   ⬇️    │  │
│ │ Scheduled Tour: 9      │  │
│ │ Closed: 3              │  │
│ └────────────────────────┘  │
│                             │
│ [📥 Export Stats] [📧 Email]│  ← Actions
│                             │
└─────────────────────────────┘
│ 📲 [Home] [📧] [📊] [👤]    │
└─────────────────────────────┘
```

### Components & Specs

**Metric Cards (Variable height)**
- Background: slate-50 (light), slate-900 (dark)
- Border: 1px slate-200 (light), slate-800 (dark)
- Padding: 16px
- Radius: 12px
- Title: 12px, semi-bold, slate-600 (light), slate-400 (dark)
- Content: Mix of text, numbers, percentages
- Number styling: 20px, bold, emerald-500 (positive), red-500 (negative)

**Pipeline Status Card**
- Status rows: [icon] [label: count]
- Proportional widths: each row width = count/total × 100%
- Small bar chart visualization

**Response Time Trend**
- Sparkline chart (minimal, clean)
- Three time range tabs: [Today] [Week] [Month]
- Y-axis implicit (scales to data)

**Conversion Funnel**
- Vertical stack of bars
- Each bar: label + count, proportional width
- Color gradient: amber → emerald → blue (indicating funnel stages)

**Export/Share Buttons (44px)**
- Secondary buttons: "📥 Export Stats" (PDF), "📧 Email Report"
- Tap → Share sheet or email composer

---

## Responsive Behavior

### Mobile (320px–568px)
- Single column
- Full-width cards (12px margin)
- Bottom navigation (4 icons)
- Tabs horizontal scroll

### Tablet (569px–1024px)
- Two-column layouts (where applicable)
- Side navigation (instead of bottom nav)
- Larger touch targets
- Grid-based card layouts

### Desktop (1025px+)
- Three-column layouts
- Sidebar navigation
- Expanded analytics with charts
- Multi-select capabilities

---

## Interaction States

**Lead Card:**
- Default: slate-50 bg (light), slate-900 bg (dark)
- Hover: shadow elevation + 2px border-emerald-500
- Active/Selected: border-2 emerald-500, bg-emerald-50 (light), emerald-900/10 (dark)
- Long-press: context menu (Snooze, Archive, etc.)

**Button States:**
- Idle: Normal styling
- Hover: Slight opacity increase, shadow
- Active/Pressed: Darker shade
- Disabled: Opacity 50%, cursor not-allowed

**Swipe Gestures:**
- Swipe left on lead card → Reveal quick actions (Snooze, Mark read, Archive)
- Swipe up on conversation → Collapse/minimize
- Pull-to-refresh at top of feed

---

## Accessibility Notes

- All icons paired with text labels
- Focus ring on all interactive elements (emerald-500, 2px)
- Sufficient color contrast (WCAG AA minimum)
- Semantic HTML/ARIA roles
- Keyboard navigation fully supported
- Screen reader support for status badges
