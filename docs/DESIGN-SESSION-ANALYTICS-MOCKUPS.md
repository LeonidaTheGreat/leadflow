# Session Analytics — Visual Mockups

**Use Case:** feat-session-analytics-pilot  
**Companion to:** `DESIGN-SESSION-ANALYTICS-PILOT.md`

---

## Mockup 1: Admin Pilot Usage Dashboard — Full View

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║  🏠 LeadFlow AI                                                                   ● Online   ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                              ║
║  Pilot Usage Analytics                                                          🔄 Refresh   ║
║  Track pilot agent engagement and identify at-risk users                                    ║
║                                                                                              ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     ║
║  │                  │  │    ━━            │  │    ⚠️            │  │    🚨            │     ║
║  │   Total Pilots   │  │   Active (24h)   │  │   At Risk (>72h) │  │   Inactive (>7d) │     ║
║  │                  │  │                  │  │                  │  │                  │     ║
║  │        12        │  │         8        │  │         3        │  │         1        │     ║
║  │                  │  │     ━━━━━━━━     │  │     ⚠️⚠️⚠️       │  │     🚨🚨🚨       │     ║
║  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘     ║
║                                                                                              ║
║  Filter: [All Pilots ▼]  Search: [🔍 ____________________]              [⬇ Export CSV]      ║
║                                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────────────────────┐   ║
║  │ Agent                    Last Login      Sessions   Top Feature         Status       │   ║
║  │ ───────────────────────────────────────────────────────────────────────────────────  │   ║
║  │ ┌──┐ Jane Smith          2 min ago          12      Conversations    🟢 Active       │   ║
║  │ │JS│ jane@example.com                                                      ⋮         │   ║
║  │ ├──┼──────────────────────────────────────────────────────────────────────────────── │   ║
║  │ ┌──┐ Mike Johnson        4 hours ago         8      Overview         🟢 Active       │   ║
║  │ │MJ│ mike@example.com                                                      ⋮         │   ║
║  │ ├──┼──────────────────────────────────────────────────────────────────────────────── │   ║
║  │ ┌──┐ Sarah Chen          1 day ago           5      Settings         🟡 Idle         │   ║
║  │ │SC│ sarah@example.com                                                     ⋮         │   ║
║  │ ├──┼──────────────────────────────────────────────────────────────────────────────── │   ║
║  │ ┌──┐ Tom Wilson          3 days ago          2      Overview         ⚠️ At Risk      │   ║
║  │ │TW│ tom@example.com                                                       ⋮         │   ║
║  │ ├──┼──────────────────────────────────────────────────────────────────────────────── │   ║
║  │ ┌──┐ Lisa Park           5 days ago          1      Billing          ⚠️ At Risk      │   ║
║  │ │LP│ lisa@example.com                                                      ⋮         │   ║
║  │ ├──┼──────────────────────────────────────────────────────────────────────────────── │   ║
║  │ ┌──┐ David Brown         8 days ago          0      —                🚨 Inactive      │   ║
║  │ │DB│ david@example.com                                                     ⋮         │   ║
║  └──────────────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────────────────────┐   ║
║  │  📊 Feature Usage (7 days)                                                           │   ║
║  │                                                                                      │   ║
║  │  Dashboard Overview  ████████████████████████████████████████████████   45 views    │   ║
║  │  SMS Conversations   ████████████████████████████                       28 views    │   ║
║  │  Settings            ██████████████████████                             22 views    │   ║
║  │  Billing             ████████████                                       12 views    │   ║
║  └──────────────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                              ║
║  Last updated: Mar 10, 2026 at 2:34 PM                                                       ║
║                                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Mockup 2: Status Badge Variants

```
┌─────────────────────────────────────────────────────────────┐
│  Status Badge Variants                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟢 Active                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✓  Active                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  Style: bg-emerald-50, text-emerald-700, border-emerald-200│
│                                                             │
│  🟡 Idle                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ◷  Idle                                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  Style: bg-slate-50, text-slate-700, border-slate-200      │
│                                                             │
│  ⚠️ At Risk                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ⚠  At Risk                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  Style: bg-amber-50, text-amber-700, border-amber-200      │
│                                                             │
│  🚨 Inactive                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✕  Inactive                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  Style: bg-red-50, text-red-700, border-red-200            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Mockup 3: Mobile Card View

```
╔══════════════════════════════════════╗
║  LeadFlow AI              ● Online   ║
╠══════════════════════════════════════╣
║                                      ║
║  Pilot Usage Analytics               ║
║                                      ║
║  ┌────────────────────────────────┐ ║
║  │ Total Pilots              12   │ ║
║  │ Active (24h)               8   │ ║
║  │ At Risk (>72h)             3   │ ║
║  │ Inactive (>7d)             1   │ ║
║  └────────────────────────────────┘ ║
║                                      ║
║  ┌────────────────────────────────┐ ║
║  │ Jane Smith           🟢 Active │ ║
║  │ jane@example.com               │ ║
║  │                                │ ║
║  │ Last Login      2 min ago      │ ║
║  │ Sessions (7d)   12             │ ║
║  │ Top Feature     Conversations  │ ║
║  └────────────────────────────────┘ ║
║                                      ║
║  ┌────────────────────────────────┐ ║
║  │ Tom Wilson           ⚠️ At Risk│ ║
║  │ tom@example.com                │ ║
║  │                                │ ║
║  │ Last Login      3 days ago     │ ║
║  │ Sessions (7d)   2              │ ║
║  │ Top Feature     Overview       │ ║
║  └────────────────────────────────┘ ║
║                                      ║
║  ┌────────────────────────────────┐ ║
║  │ David Brown          🚨 Inact. │ ║
║  │ david@example.com              │ ║
║  │                                │ ║
║  │ Last Login      8 days ago     │ ║
║  │ Sessions (7d)   0              │ ║
║  │ Top Feature     —              │ ║
║  └────────────────────────────────┘ ║
║                                      ║
╚══════════════════════════════════════╝
```

---

## Mockup 4: Future "My Activity" Page

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║  🏠 LeadFlow AI                                                                   ● Online   ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                              ║
║  My Activity                                                                                 ║
║  Track your engagement and discover features                                                ║
║                                                                                              ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     ║
║  │   Sessions       │  │   Time in        │  │   Last           │  │   Top            │     ║
║  │   This Week      │  │   Dashboard      │  │   Login          │  │   Section        │     ║
║  │                  │  │                  │  │                  │  │                  │     ║
║  │        8         │  │     2h 34m       │  │    2 hrs ago     │  │  Conversations   │     ║
║  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘     ║
║                                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────────────────────┐   ║
║  │  GET THE MOST FROM LEADFLOW  ───────────────────────────────────  3 of 5 completed   │   ║
║  │                                                                                      │   ║
║  │  ☑️ View dashboard overview                                                          │   ║
║  │  ☑️ Check SMS conversations                                                          │   ║
║  │  ☑️ Update your settings                                                             │   ║
║  │  ☐ Connect your calendar                                          [Connect →]      │   ║
║  │  ☐ Respond to your first lead                                     [View Leads →]     │   ║
║  │                                                                                      │   ║
║  │                                          [Complete Setup →]                          │   ║
║  └──────────────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────────────────────┐   ║
║  │  💡 TIPS BASED ON YOUR ACTIVITY                                                      │   ║
║  │                                                                                      │   ║
║  │  You haven't checked conversations in 2 days. New leads may be waiting!              │   ║
║  │                                                                                      │   ║
║  │                                          [View Conversations]                        │   ║
║  └──────────────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────────────────────┐   ║
║  │  ACTIVITY HISTORY                                                                    │   ║
║  │                                                                                      │   ║
║  │  Mon, Mar 10    ████████████████████████████████████████████████    4 sessions      │   ║
║  │  Sun, Mar 9     ████████████████████████████                        2 sessions      │   ║
║  │  Sat, Mar 8     ██████████████████                                  1 session       │   ║
║  │  Fri, Mar 7     ██████████████████████████████████████████████      3 sessions      │   ║
║  │  Thu, Mar 6     ██████████████████████████████████████████████████  5 sessions      │   ║
║  └──────────────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Mockup 5: Empty States

```
┌─────────────────────────────────────────────────────────────┐
│  No Pilots Yet                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      ┌──────────┐                           │
│                      │   👤     │                           │
│                      │    +     │                           │
│                      │   👤     │                           │
│                      └──────────┘                           │
│                                                             │
│              No pilot agents yet                            │
│     Agents will appear here after their first login         │
│                                                             │
│              [Recruit Pilots]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  No Search Results                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                         🔍                                  │
│                                                             │
│                   No agents found                           │
│         Try adjusting your search or filters                │
│                                                             │
│              [Clear Filters]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  No Activity Yet (Agent View)                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      📊                                     │
│                                                             │
│              Welcome to LeadFlow!                           │
│     Your activity will appear here once you start           │
│     using the dashboard.                                    │
│                                                             │
│              [Go to Dashboard →]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Mockup 6: Actions Dropdown Menu

```
┌─────────────────────────────────────────────┐
│ Jane Smith                    🟢 Active  [⋮]│
│ jane@example.com                            │
└─────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  👤 View Profile      │
        │  ✉️ Send Message      │
        │  📊 View Sessions     │
        │  ─────────────────    │
        │  ✓ Mark as Reached Out│
        └───────────────────────┘
```

---

## Color Reference

### Light Mode

```
Background:         #f8fafc  (slate-50)
Card Background:    #ffffff  (white)
Border:             #e2e8f0  (slate-200)
Text Primary:       #0f172a  (slate-900)
Text Secondary:     #475569  (slate-600)
Text Muted:         #94a3b8  (slate-400)

Active:             #10b981  (emerald-500)
Active Light:       #ecfdf5  (emerald-50)
Idle:               #64748b  (slate-500)
Idle Light:         #f8fafc  (slate-50)
At Risk:            #f59e0b  (amber-500)
At Risk Light:      #fffbeb  (amber-50)
Inactive:           #ef4444  (red-500)
Inactive Light:     #fef2f2  (red-50)

Chart Blue:         #3b82f6
Chart Emerald:      #10b981
Chart Purple:       #8b5cf6
Chart Amber:        #f59e0b
```

### Dark Mode

```
Background:         #020617  (slate-950)
Card Background:    #0f172a  (slate-900)
Border:             #1e293b  (slate-800)
Text Primary:       #f8fafc  (slate-50)
Text Secondary:     #94a3b8  (slate-400)
Text Muted:         #64748b  (slate-600)

Active:             #34d399  (emerald-400)
Active Dark:        #064e3b  (emerald-900/20)
Idle:               #94a3b8  (slate-400)
Idle Dark:          #1e293b  (slate-800)
At Risk:            #fbbf24  (amber-400)
At Risk Dark:       #78350f  (amber-900/20)
Inactive:           #f87171  (red-400)
Inactive Dark:      #7f1d1d  (red-900/20)
```

---

## Spacing Reference

```
Page padding:       24px (1.5rem)
Card padding:       24px (1.5rem)
Card gap:           16px (1rem)
Table cell padding: 16px vertical, 16px horizontal
Badge padding:      4px vertical, 10px horizontal
Button padding:     8px vertical, 16px horizontal
```

---

## Typography Reference

```
Page Title:         24px, font-bold, slate-900
Section Header:     18px, font-semibold, slate-900
Card Label:         14px, font-medium, slate-600
Card Value:         30px, font-bold, slate-900
Table Header:       12px, font-semibold, slate-500, uppercase
Table Cell:         14px, font-normal, slate-900
Badge:              12px, font-medium
Button:             14px, font-medium
```
