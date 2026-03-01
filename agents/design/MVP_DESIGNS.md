│  ────────────────────────────────────│
│  Today                                │
│  ────────────────────────────────────│
│  🔴 2:28 PM  New lead: Sarah Martinez│
│     "Looking for 3BR downtown"       │
│     [View]                     [✕]   │
│  ────────────────────────────────────│
│  ✉️ 2:15 PM  Booking confirmed       │
│     David Lee - Tomorrow 2 PM        │
│     [View Calendar]            [✕]   │
│  ────────────────────────────────────│
│  🟢 1:52 PM  Lead qualified          │
│     AI qualified Maria Garcia        │
│     [View Lead]                [✕]   │
│                                       │
│  Earlier                              │
│  ────────────────────────────────────│
│  ⚙️ 9:00 AM  System update complete  │
│     LeadFlow AI v1.2.0 installed     │
│                                [✕]   │
│                                       │
│  [View all notifications →]          │
└────────────────────────────────────────┘
```

---

### Screen 8: Empty States

#### No Leads (New Account)
```
┌────────────────────────────────────────┐
│  ▌█ LeadFlow                    [👤]  │
├────────────────────────────────────────┤
│                                        │
│                                        │
│           ┌─────────────┐              │
│           │             │              │
│           │   📭        │              │
│           │  Empty      │              │
│           │  mailbox    │              │
│           │  icon       │              │
│           │             │              │
│           └─────────────┘              │
│                                        │
│     No leads yet                       │
│                                        │
│     Your leads will appear here when   │
│     they come in from your connected   │
│     sources like Zillow, Realtor.com   │
│                                        │
│     [Connect Lead Sources →]           │
│                                        │
│     ───────── or ─────────             │
│                                        │
│     [Import Test Lead]                 │
│                                        │
└────────────────────────────────────────┘
```

#### No Search Results
```
┌────────────────────────────────────────┐
│  🔍 "sarah"                     [✕]   │
├────────────────────────────────────────┤
│                                        │
│           ┌─────────────┐              │
│           │   🔍        │              │
│           │  Magnifying │              │
│           │   glass     │              │
│           │             │              │
│           └─────────────┘              │
│                                        │
│     No results found                   │
│                                        │
│     We couldn't find any leads         │
│     matching "sarah"                   │
│                                        │
│     Try:                               │
│     • Checking your spelling           │
│     • Using fewer keywords             │
│     • Searching by phone or email      │
│                                        │
│     [Clear Search]                     │
│                                        │
└────────────────────────────────────────┘
```

#### No Messages (Lead Detail)
```
┌────────────────────────────────────────┐
│  ← Sarah Martinez               [⋯]   │
├────────────────────────────────────────┤
│                                        │
│  ──── No messages yet ────             │
│                                        │
│  Start the conversation by sending     │
│  your first message to Sarah.          │
│                                        │
│  [💬 Send First Message]               │
│                                        │
│  ───────── or ─────────                │
│                                        │
│  Quick starts:                         │
│  [Introduce yourself]                  │
│  [Ask about timeline]                  │
│  [Send property info]                  │
│                                        │
└────────────────────────────────────────┘
```

---

### Screen 9: Loading States

#### Lead Feed Skeleton
```
┌────────────────────────────────────────┐
│  ▌█ LeadFlow                           │
├────────────────────────────────────────┤
│  📥 Leads                              │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ ⬭ ⬭⬭⬭⬭⬭⬭⬭       ⬭⬭⬭       │    │  ← Shimmer skeleton
│  │ ⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭         │    │
│  │ ⬭⬭⬭⬭  ⬭⬭⬭⬭  ⬭⬭⬭              │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │ ⬭ ⬭⬭⬭⬭⬭⬭⬭       ⬭⬭⬭       │    │
│  │ ⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭         │    │
│  │ ⬭⬭⬭⬭  ⬭⬭⬭⬭  ⬭⬭⬭              │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │ ⬭ ⬭⬭⬭⬭⬭⬭⬭       ⬭⬭⬭       │    │
│  │ ⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭⬭         │    │
│  │ ⬭⬭⬭⬭  ⬭⬭⬭⬭  ⬭⬭⬭              │    │
│  └────────────────────────────────┘    │
│                                        │
│        ⟳ Loading more...               │
│                                        │
└────────────────────────────────────────┘
```

#### Pull-to-Refresh (Mobile)
```
┌─────────────────────────────┐
│                             │
│         ↓ Pull to refresh   │  ← Release state
│                             │
│  ┌─────────────────────────┐│
│  │ Lead Card 1            ││
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│                             │
│      ⟳  Updating...         │  ← Loading state
│                             │
│  ┌─────────────────────────┐│
│  │ Lead Card 1            ││
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│                             │
│      ✓ Updated just now     │  ← Complete state
│                             │
│  ┌─────────────────────────┐│
│  │ Lead Card 1            ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

---

## Component Library

### Buttons

#### Primary Button
```jsx
<button className="
  inline-flex items-center justify-center gap-2
  px-4 py-2.5
  bg-emerald-500 hover:bg-emerald-400
  text-white font-semibold text-sm
  rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[--bg-primary]
  disabled:opacity-50 disabled:cursor-not-allowed
">
  <span>Button Label</span>
  <ArrowRight size={16} />
</button>
```

#### Secondary Button
```jsx
<button className="
  inline-flex items-center justify-center gap-2
  px-4 py-2.5
  bg-[--bg-tertiary] hover:bg-slate-600
  text-[--text-primary] font-semibold text-sm
  rounded-lg
  border border-[--border-default]
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-[--border-focus]
">
  Secondary Action
</button>
```

#### Ghost Button
```jsx
<button className="
  inline-flex items-center justify-center gap-2
  px-3 py-2
  text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-tertiary]
  font-medium text-sm
  rounded-lg
  transition-colors duration-200
">
  <Icon size={16} />
  Label
</button>
```

#### Icon Button
```jsx
<button className="
  inline-flex items-center justify-center
  w-10 h-10
  text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-tertiary]
  rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-[--border-focus]
">
  <Settings size={20} />
</button>
```

### Cards

#### Lead Card
```jsx
<div className="
  group
  flex items-start gap-4
  p-4
  bg-[--bg-secondary] hover:bg-[--bg-tertiary]
  border border-[--border-default] hover:border-emerald-500/50
  rounded-xl
  cursor-pointer
  transition-all duration-200
">
  {/* Priority Dot */}
  <div className={cn(
    "w-2 h-2 rounded-full mt-2 shrink-0",
    priority === 'urgent' && "bg-amber-500",
    priority === 'qualified' && "bg-emerald-500",
    priority === 'pending' && "bg-blue-500",
    priority === 'closed' && "bg-slate-500"
  )} />
  
  {/* Content */}
  <div className="flex-1 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-semibold text-[--text-primary] truncate">
        {lead.name}
      </h3>
      <span className="text-[--text-muted] text-sm">
        {formatRelativeTime(lead.createdAt)}
      </span>
    </div>
    
    <p className="text-[--text-secondary] text-sm mt-0.5 line-clamp-1">
      {lead.lastMessage}
    </p>
    
    <div className="flex items-center gap-3 mt-2">
      {lead.budget && (
        <span className="text-xs text-[--text-muted]">
          💰 {lead.budget}
        </span>
      )}
      {lead.location && (
        <span className="text-xs text-[--text-muted]">
          📍 {lead.location}
        </span>
      )}
      <Badge priority={lead.priority} />
    </div>
  </div>
  
  {/* Quick Actions */}
  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
    <IconButton>
      <MoreVertical size={16} />
    </IconButton>
  </div>
</div>
```

#### Metric Card
```jsx
<div className="
  bg-[--bg-secondary]
  border border-[--border-default]
  rounded-xl
  p-6
">
  <p className="text-[--text-muted] text-xs font-semibold uppercase tracking-wider">
    {label}
  </p>
  <p className="text-[--text-primary] text-3xl font-bold mt-2">
    {value}
  </p>
  {change && (
    <div className="flex items-center gap-1.5 mt-2">
      {change.type === 'increase' ? (
        <TrendingUp size={16} className="text-emerald-500" />
      ) : (
        <TrendingDown size={16} className="text-red-500" />
      )}
      <span className={cn(
        "text-sm font-medium",
        change.type === 'increase' ? "text-emerald-500" : "text-red-500"
      )}>
        {change.type === 'increase' ? '↑' : '↓'} {change.value}%
      </span>
      <span className="text-[--text-muted] text-xs">
        vs {change.comparison}
      </span>
    </div>
  )}
</div>
```

### Badges

```jsx
const badgeStyles = {
  urgent: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  qualified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  closed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  nurture: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

<span className={cn(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
  badgeStyles[priority]
)}>
  {label}
</span>
```

### Inputs

#### Text Input
```jsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-[--text-primary]">
    Label {required && <span className="text-red-500">*</span>}
  </label>
  <input
    type="text"
    className="
      w-full px-3 py-2.5
      bg-[--bg-secondary]
      border border-[--border-default]
      rounded-lg
      text-[--text-primary] text-sm
      placeholder:text-[--text-muted]
      focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500
      disabled:opacity-50 disabled:cursor-not-allowed
    "
    placeholder="Enter value..."
  />
  {error && (
    <p className="text-xs text-red-500">{error}</p>
  )}
  {hint && (
    <p className="text-xs text-[--text-muted]">{hint}</p>
  )}
</div>
```

#### Text Area (SMS Composer)
```jsx
<div className="relative">
  <textarea
    className="
      w-full px-4 py-3
      bg-[--bg-secondary]
      border border-[--border-default]
      rounded-xl
      text-[--text-primary] text-sm
      placeholder:text-[--text-muted]
      resize-none
      focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500
    "
    rows={4}
    maxLength={320}
    placeholder="Type your message..."
  />
  <div className="flex items-center justify-between mt-2 px-1">
    <span className="text-xs text-[--text-muted]">
      {charCount} / 320 characters
    </span>
    <span className={cn(
      "text-xs",
      messageCount > 2 ? "text-amber-500" : "text-[--text-muted]"
    )}>
      {messageCount} SMS {messageCount === 1 ? 'message' : 'messages'}
    </span>
  </div>
</div>
```

### Avatars

```jsx
const avatarSizes = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
};

<div className={cn(
  "inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-semibold",
  avatarSizes[size]
)}>
  {initials}
</div>
```

### Modals

```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
  
  {/* Modal */}
  <div className="
    relative
    w-full max-w-md
    bg-[--bg-primary]
    border border-[--border-default]
    rounded-2xl
    shadow-2xl
    p-6
  ">
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-[--text-primary]">
        Modal Title
      </h2>
      <IconButton onClick={onClose}>
        <X size={20} />
      </IconButton>
    </div>
    
    {/* Content */}
    <div className="space-y-4">
      {children}
    </div>
    
    {/* Footer */}
    <div className="flex items-center justify-end gap-3 mt-6">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onConfirm}>
        Confirm
      </Button>
    </div>
  </div>
</div>
```

### Toast Notifications

```jsx
const toastStyles = {
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  error: "bg-red-500/10 border-red-500/30 text-red-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
};

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

<div className={cn(
  "fixed bottom-4 right-4 z-50",
  "flex items-start gap-3",
  "px-4 py-3 rounded-lg border",
  "max-w-sm",
  "animate-in slide-in-from-bottom-2",
  toastStyles[type]
)}>
  <Icon size={20} />
  <div className="flex-1">
    <p className="font-medium text-sm">{title}</p>
    {description && (
      <p className="text-sm opacity-90 mt-0.5">{description}</p>
    )}
  </div>
  <button onClick={onDismiss}>
    <X size={16} />
  </button>
</div>
```

---

## Interaction Patterns

### Lead Feed Interactions

#### Swipe Actions (Mobile)
```
┌────────────────────────────────────────┐
│  [Archive]  [Snooze]  Lead Card  [Mark]│
│    ⬅️ Swipe left reveals actions ➡️    │
└────────────────────────────────────────┘

Threshold: 25% of card width triggers action
Velocity: 300px/s minimum for quick swipe
Animation: Spring with 0.5 damping
```

#### Pull to Refresh
```
Trigger: Pull down > 80px
Loading: Rotate indicator until complete
Success: Brief checkmark, then snap back
Failure: Error message with retry button
```

#### Quick Actions Menu
```
Triggered by: Long press or ⋯ button
Position: Anchored to trigger element
Items: [📞 Call] [💬 Message] [⏱️ Snooze] [🗄️ Archive]
Dismiss: Tap outside or swipe down
```

### Message Interactions

#### Send Message Flow
```
1. User types / AI generates message
2. [Send] button enabled when content present
3. On send:
   - Message appears in thread immediately (optimistic)
   - Status: "Sending..."
   - On success: Status → "Delivered ✓✓"
   - On failure: Retry button appears
```

#### Typing Indicator
```
┌────────────────────────────────────────┐
│  ● ● ●  AI is typing...                │
│  (3 dots with staggered pulse)         │
│                                        │
│  Animation:                            │
│  - Dot 1: 0ms delay                    │
│  - Dot 2: 150ms delay                  │
│  - Dot 3: 300ms delay                  │
│  - Each: scale 0.5 → 1 → 0.5, 600ms    │
└────────────────────────────────────────┘
```

### Navigation Patterns

#### Bottom Navigation (Mobile)
```
Active State:
- Icon: Filled variant
- Label: Visible
- Indicator: Top border 2px emerald-500
- Background: Slightly elevated

Inactive State:
- Icon: Outline variant
- Label: Visible but muted
- No indicator
```

#### Sidebar Navigation (Desktop)
```
Active Item:
- Left border: 3px emerald-500
- Background: --bg-tertiary
- Text: --text-primary

Inactive Item:
- No border
- Background: transparent
- Text: --text-secondary
- Hover: --bg-tertiary
```

### Form Interactions

#### Progressive Disclosure
```
Step 1: Show required fields only
Step 2: Reveal advanced options on toggle
Step 3: Show confirmation before save

Animation: Height expand with opacity fade
Duration: 200ms ease-out
```

#### Inline Validation
```
On blur: Validate field
On error: Show message below, red border
On type: Clear error when valid
On submit: Scroll to first error
```

---

## Mobile Responsive

### Breakpoints

| Name | Width | Target |
|------|-------|--------|
| Mobile | 0–639px | Phones |
| Tablet | 640–1023px | Tablets, small laptops |
| Desktop | 1024px+ | Laptops, monitors |
| Wide | 1440px+ | Large monitors |

### Layout Adaptations

#### Lead Feed
| Mobile | Tablet | Desktop |
|--------|--------|---------|
| Single column | Single column + side nav | Three column |
| Bottom nav | Side nav | Side nav |
| Full-width cards | Max 600px cards | Flexible grid |
| Swipe actions | Hover actions | Hover actions |

#### Lead Detail
| Mobile | Tablet | Desktop |
|--------|--------|---------|
| Stacked sections | Two column | Three column |
| Bottom action bar | Inline actions | Inline actions |
| Sheet modal for compose | Inline compose | Inline compose |

#### Analytics
| Mobile | Tablet | Desktop |
|--------|--------|---------|
| Single metric cards | 2-column grid | 3-column grid |
| Stacked charts | Side-by-side | Dashboard grid |
| Simplified funnel | Full funnel | Full funnel |

### Touch Targets

```css
/* Minimum touch target: 44×44px */
.button {
  min-width: 44px;
  min-height: 44px;
}

/* Spacing between targets: 8px minimum */
.button-group > * + * {
  margin-left: 8px;
}
```

### Typography Scale (Mobile)

| Element | Desktop | Mobile |
|---------|---------|--------|
| Display | 32px | 28px |
| H1 | 24px | 20px |
| H2 | 20px | 18px |
| H3 | 16px | 16px |
| Body | 14px | 16px |
| Caption | 12px | 12px |

---

## Accessibility

### WCAG AA Compliance

#### Color Contrast
| Element | Ratio | Pass |
|---------|-------|------|
| Text on bg-primary | 7:1 | ✅ |
| Text on bg-secondary | 4.5:1 | ✅ |
| Buttons | 4.5:1 | ✅ |
| Disabled states | 3:1 | ✅ |

#### Focus Indicators
```css
/* All interactive elements */
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (forced-colors: active) {
  :focus-visible {
    outline: 2px solid CanvasText;
  }
}
```

#### Keyboard Navigation
```
Tab: Move focus forward
Shift+Tab: Move focus backward
Enter/Space: Activate button
Escape: Close modal/dropdown
Arrow keys: Navigate lists
Home/End: Jump to start/end
```

### Screen Reader Support

#### ARIA Labels
```jsx
<button aria-label="Send message">
  <Send size={16} aria-hidden />
</button>

<div role="status" aria-live="polite">
  {notification}
</div>

<nav aria-label="Main navigation">
  {/* nav items */}
</nav>
```

#### Status Announcements
```jsx
// Toast notifications
<div role="alert" aria-live="assertive">
  Lead response sent successfully
</div>

// Loading states
<div role="status" aria-live="polite">
  <span className="sr-only">Loading leads...</span>
  <Spinner aria-hidden />
</div>
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Assets & Resources

### Iconography

**Library:** Lucide React (`lucide-react`)

| Icon | Usage | Size |
|------|-------|------|
| `Inbox` | Lead feed | 20px |
| `MessageSquare` | Messages | 20px |
| `BarChart3` | Analytics | 20px |
| `User` | Profile | 20px |
| `Settings` | Settings | 20px |
| `Bell` | Notifications | 20px |
| `MoreVertical` | Options menu | 16px |
| `ArrowLeft` | Back | 20px |
| `X` | Close | 20px |
| `Check` | Success | 16px |
| `CheckCheck` | Delivered | 14px |
| `Phone` | Call | 16px |
| `Mail` | Email | 16px |
| `Calendar` | Booking | 16px |
| `Clock` | Snooze | 16px |
| `RotateCcw` | Re-engage | 16px |
| `CheckCircle` | Complete | 16px |
| `TrendingUp` | Positive trend | 16px |
| `TrendingDown` | Negative trend | 16px |
| `Send` | Send message | 16px |
| `Plus` | Add new | 20px |
| `Filter` | Filter | 16px |
| `Search` | Search | 16px |
| `RefreshCw` | Refresh | 16px |

### Animation Specifications

#### Durations
| Animation | Duration | Easing |
|-----------|----------|--------|
| Button hover | 150ms | ease-out |
| Card hover | 200ms | ease-out |
| Modal open | 250ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Modal close | 200ms | ease-in |
| Toast in | 300ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Toast out | 200ms | ease-in |
| Page transition | 300ms | ease-in-out |
| Skeleton shimmer | 1500ms | linear (infinite) |

#### Spring Physics
```
Card swipe: { stiffness: 300, damping: 30 }
Pull to refresh: { stiffness: 400, damping: 25 }
Bottom sheet: { stiffness: 350, damping: 30 }
```

### CSS Custom Properties

```css
:root {
  /* Colors */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border-default: #334155;
  --border-focus: #10b981;
  
  /* Semantic */
  --urgent: #f59e0b;
  --qualified: #10b981;
  --pending: #3b82f6;
  --closed: #64748b;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  
  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5);
}
```

---

## Handoff Checklist

### For Developers

- [ ] All screens designed (mobile + desktop)
- [ ] Component library with code snippets
- [ ] Interaction patterns documented
- [ ] Animation specs provided
- [ ] Accessibility requirements noted
- [ ] Responsive breakpoints defined
- [ ] Assets exported (icons, if any custom)

### QA Testing Notes

#### Visual
- [ ] Dark mode renders correctly
- [ ] All priority badge colors visible
- [ ] Typography hierarchy clear
- [ ] Spacing consistent throughout

#### Functional
- [ ] All buttons have hover/focus states
- [ ] Toast notifications appear correctly
- [ ] Loading states work
- [ ] Empty states trigger appropriately

#### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators visible

---

**Design Team Notes:**

All designs prioritize the mobile experience since real estate agents primarily work on phones. The dark mode default reduces eye strain during long work hours and conserves battery.

Key UX decisions:
1. **Lead cards** show critical info at a glance (name, budget, location, priority)
2. **Color coding** for priorities uses intuitive traffic light system
3. **Quick actions** are always accessible without deep navigation
4. **AI transparency** with confidence scores builds trust
5. **Progressive onboarding** reduces cognitive load for new users

For questions, refer to the Product Spec or ping the Design Agent.
