# Design Specification: Dashboard User Menu with Profile + Logout

**Task ID:** b218fb06-38e9-4da1-9adb-c1927ea403c2  
**Use Case:** uc-buyer-journey-logout-button  
**Status:** Ready for Development  
**Last Updated:** 2026-05-22

---

## 1. Goal

Add a user-menu dropdown in dashboard navigation so authenticated agents can:
- go to profile (`/profile`)
- log out (`POST /api/auth/logout`) and get redirected to `/login`

This closes the current UX gap where logout exists in backend only.

---

## 2. Scope

Target surface:
- `app/dashboard/dashboard-nav.tsx`

Design output covers:
- desktop and mobile behavior
- component structure and states
- interaction flow for logout
- testability hooks for E2E automation

Out of scope:
- changing IA of primary nav links
- changing auth/session backend behavior

---

## 3. UX Model

### 3.1 Information architecture

Keep existing horizontal nav links. Add a right-aligned user menu trigger.

Menu items:
1. `Profile` (navigates to `/profile`)
2. `Log out` (mutation action, not plain link)

### 3.2 Trigger content

Trigger should display:
- circular avatar placeholder (agent initials or generic icon)
- optional short label (`Account`) on desktop
- chevron icon indicating expand/collapse

On mobile widths, keep icon-only if space is constrained.

### 3.3 Placement

Within the same top nav bar:
- left: existing nav link cluster
- right: user menu trigger

Alignment target:
- trigger baseline visually centered with nav links
- menu anchored bottom-end to trigger

---

## 4. Component Spec

### 4.1 User Menu Trigger

- Height: 36px
- Horizontal padding: 10px
- Radius: 8px
- Background: transparent default
- Hover: `slate-100` (light), `slate-800` (dark)
- Focus-visible ring: `2px` blue outline (`blue-500/30`)

States:
- `default`
- `hover`
- `focus`
- `expanded` (chevron rotates 180deg)

### 4.2 Dropdown Panel

- Width: 176px
- Background: white / `slate-900`
- Border: `1px` `slate-200` / `slate-700`
- Radius: 10px
- Shadow: medium (`shadow-lg`-class depth)
- Vertical padding: 6px
- Enter animation: fade + scale (95% -> 100%, 120-160ms)

### 4.3 Dropdown Items

Row spec:
- Height: 36px min
- Padding: `8px 12px`
- Text size: 14px
- Icon size: 16px
- Gap: 8px

Items:
- `Profile` with user icon
- divider line
- `Log out` with logout icon, danger-toned text (`red-600` light, `red-400` dark)

Interaction:
- hover background: `slate-100` / `slate-800`
- focus-visible follows same ring pattern

### 4.4 Logout loading state

When logout action starts:
- Replace `Log out` label with `Logging out...`
- Show spinner on row left
- Disable both rows until request resolves
- Keep menu open while pending

Failure state (non-blocking toast/banner can be handled later):
- Close loading state
- Re-enable menu
- Show inline one-line error below menu or toast: `Unable to log out. Try again.`

---

## 5. Interaction Flow

1. User lands on `/dashboard`.
2. User clicks `user-menu-trigger`.
3. Dropdown opens with `Profile` and `Log out`.
4. If `Profile` clicked:
   - menu closes
   - navigate to `/profile`
5. If `Log out` clicked:
   - call `POST /api/auth/logout` with credentials
   - on success: clear local session cache if present, navigate to `/login`
   - on failure: stay on current page and show error state

Expected post-success behavior:
- browser redirected to `/login`
- session cookie `leadflow_session` cleared server-side

---

## 6. Accessibility + Keyboard

Required semantics:
- trigger: `button` with `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`
- panel: `role="menu"`
- items: `role="menuitem"`

Keyboard:
- `Enter` / `Space`: open menu
- `Esc`: close menu and return focus to trigger
- Arrow keys cycle within items
- `Tab` out closes menu

Screen reader labels:
- Trigger label: `Open user menu`
- Logout item: `Log out`

---

## 7. Testability Contract (for E2E)

Add stable selectors:
- `data-testid="user-menu-trigger"`
- `data-testid="user-menu-panel"`
- `data-testid="user-menu-profile"`
- `data-testid="user-menu-logout"`

Acceptance E2E path:
1. load `/dashboard`
2. click `user-menu-trigger`
3. click `user-menu-logout`
4. assert URL is `/login`
5. assert `leadflow_session` cookie is missing/expired

---

## 8. Responsive Rules

### Desktop (>= 1024px)
- Show avatar + `Account` label + chevron
- Dropdown anchored right edge of nav container

### Tablet (768px - 1023px)
- Show avatar + chevron
- keep full dropdown width

### Mobile (< 768px)
- icon trigger remains tappable min 40x40
- menu overlays above nav overflow region
- ensure z-index above horizontal nav scroll area

---

## 9. Visual Consistency Notes

Use existing dashboard visual language:
- same neutral slate palette
- same rounding and spacing cadence as current nav items
- no new color system introduced

This should feel like an extension of current `DashboardNav`, not a new header pattern.
