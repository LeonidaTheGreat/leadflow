# Design Specification: Dashboard Nav User Menu

**Feature:** User Menu Dropdown — Profile + Logout  
**Task ID:** 6c5a0ad9-cd2f-419c-8d43-d8464d194a53  
**Use Case:** uc-buyer-journey-logout-button  
**Date:** 2026-05-18  
**Designer:** Design Agent  

---

## Overview

The dashboard nav currently renders navigation links only. There is no visible way for a user to access their profile or sign out. The backend logout endpoint (`POST /api/auth/logout`) exists but is unwired. This spec adds a **user menu** to the right side of the nav bar: an avatar trigger that opens a dropdown containing a profile link and a logout action.

Design goal: discoverable, predictable, zero-friction. Standard right-side avatar menu — users know this pattern from every SaaS product. No surprises.

---

## 1. Nav Bar Layout Change

The nav container must change from a single left-aligned flex row to a **space-between** layout.

### Before

```
┌────────────────────────────────────────────────────────────────┐
│  Lead Feed  History  Analytics  Settings                       │
└────────────────────────────────────────────────────────────────┘
```

### After

```
┌────────────────────────────────────────────────────────────────┐
│  Lead Feed  History  Analytics  Settings         [  JD  ▾ ]   │
└────────────────────────────────────────────────────────────────┘
```

- Left side: existing nav links (unchanged)
- Right side: `UserMenu` component (avatar button + dropdown)

### Layout Code Change

```
// Before
<div className="flex items-center gap-2 overflow-x-auto">

// After
<div className="flex items-center justify-between gap-2">
  <div className="flex items-center gap-2 overflow-x-auto">
    {/* existing nav links */}
  </div>
  <UserMenu />
</div>
```

---

## 2. UserMenu Component — Closed State (Trigger)

A circular avatar button showing the user's initials (or a generic user icon fallback).

```
  ┌───────────────┐
  │   [ JD  ▾ ]  │   ← pill button, slate-100 bg, hover slate-200
  └───────────────┘

  [ JD ] = 32×32 circle, slate-700 bg, white text, text-sm font-semibold
  [ ▾ ]  = ChevronDown icon, 14×14, slate-500, rotates 180° when open
```

### Visual Spec — Trigger Button

| Property | Value |
|---|---|
| Height | 36px |
| Gap (avatar + chevron) | 6px (gap-1.5) |
| Padding | px-2 py-1 |
| Border radius | rounded-full |
| Background (default) | transparent |
| Background (hover) | `bg-slate-100 dark:bg-slate-800` |
| Avatar size | 28×28 (h-7 w-7) |
| Avatar bg | `bg-slate-700 dark:bg-slate-500` |
| Avatar text | `text-white text-xs font-semibold` |
| Avatar border radius | rounded-full |
| Chevron size | h-3.5 w-3.5 |
| Chevron color | `text-slate-500 dark:text-slate-400` |
| Chevron transition | rotate-0 → rotate-180 when open (transition-transform duration-150) |

### Initials Logic

Extract the first letter of `firstName` and `lastName` from user data. Fall back to first two chars of email local part. Fall back to `User` icon (Lucide) if no data.

```
"John Doe"     → "JD"
"Sarah"        → "SA"  (first two chars if single name)
"j@example.com" → "J"  (first char of email local)
no data        → <User /> icon
```

---

## 3. UserMenu Component — Open State (Dropdown)

Dropdown appears below and right-aligned to the trigger button. Width: 200px min.

```
                     ┌───────────────────────────┐
                     │  John Doe                 │  ← user name (font-medium)
                     │  john@example.com         │  ← email (text-xs, slate-500)
                     ├───────────────────────────┤
                     │  👤  Profile              │  ← /profile link
                     ├───────────────────────────┤
                     │  ↪  Sign out              │  ← logout action
                     └───────────────────────────┘
```

### Visual Spec — Dropdown Panel

| Property | Value |
|---|---|
| Width | min-w-[200px] |
| Position | absolute top-full right-0 mt-1 |
| Background | `bg-white dark:bg-slate-900` |
| Border | `border border-slate-200 dark:border-slate-700` |
| Border radius | rounded-lg |
| Shadow | `shadow-lg` |
| z-index | z-50 |
| Animation | fade-in + slide down 4px (opacity 0→1, translateY -4px→0, duration 120ms) |

### User Info Header (non-interactive)

| Property | Value |
|---|---|
| Padding | px-3 py-2.5 |
| Name | `text-sm font-medium text-slate-900 dark:text-white` |
| Email | `text-xs text-slate-500 dark:text-slate-400` truncate |
| Max width | 176px (truncate long emails) |

If no user data is available: omit the header entirely. Do not show placeholder text.

### Divider

```css
<div className="border-t border-slate-100 dark:border-slate-800" />
```

### Profile Link

```
┌──────────────────────────────────┐
│  [User icon 14px]  Profile       │
└──────────────────────────────────┘
```

| Property | Value |
|---|---|
| Element | `<Link href="/profile">` |
| Icon | `<User className="h-3.5 w-3.5" />` (Lucide) |
| Gap | gap-2 |
| Padding | px-3 py-2 |
| Text | `text-sm text-slate-700 dark:text-slate-300` |
| Hover bg | `hover:bg-slate-50 dark:hover:bg-slate-800` |
| data-testid | `profile-link` |

### Logout Button

```
┌──────────────────────────────────┐
│  [LogOut icon 14px]  Sign out    │
└──────────────────────────────────┘
```

| Property | Value |
|---|---|
| Element | `<button type="button">` |
| Icon | `<LogOut className="h-3.5 w-3.5" />` (Lucide) |
| Gap | gap-2 |
| Padding | px-3 py-2, width: w-full |
| Text align | text-left |
| Text color | `text-sm text-slate-700 dark:text-slate-300` |
| Hover bg | `hover:bg-slate-50 dark:hover:bg-slate-800` |
| Loading state | icon replaced with spinner, text "Signing out…", button disabled |
| Error state | show inline "Sign out failed — try again" in red-600 text-xs below button |
| data-testid | `logout-button` |

---

## 4. Interaction Flow

### Open / Close
- Click trigger → open dropdown, set `isOpen = true`
- Click outside the component → close dropdown
- Press `Escape` → close dropdown
- Click trigger again while open → close dropdown

Use a `useRef` + `useEffect` for click-outside detection. No library needed.

### Logout Action

```
User clicks "Sign out"
  → show loading spinner in button
  → POST /api/auth/logout (no body needed)
  → on success (200):
      → clear localStorage key "leadflow_user"
      → router.push('/login')
  → on error (non-200):
      → hide spinner
      → show inline error "Sign out failed — try again"
      → keep dropdown open
```

The logout POST requires no request body. The server reads the session cookie automatically (httpOnly cookie, always present in same-origin requests).

---

## 5. Data Source

User info (name + email) is stored in `localStorage` under key `leadflow_user`. Profile page already reads from this same source:

```ts
const stored = localStorage.getItem('leadflow_user')
const user = stored ? JSON.parse(stored) : null
// user.firstName, user.lastName, user.email
```

The `UserMenu` component reads this on mount. No API call needed — this is display-only and the profile page manages mutations.

---

## 6. Component Architecture

New file: `product/lead-response/dashboard/components/dashboard/UserMenu.tsx`

```
UserMenu
├── state: isOpen (boolean)
├── state: isLoggingOut (boolean)
├── state: logoutError (string | null)
├── ref: containerRef (click-outside)
├── effect: reads localStorage 'leadflow_user' on mount
├── render:
│   ├── <div ref={containerRef} className="relative">
│   │   ├── <button> (trigger — avatar + chevron)
│   │   └── {isOpen && <div> (dropdown panel)
│   │           ├── user info header (conditional)
│   │           ├── <hr> divider
│   │           ├── <Link href="/profile"> Profile
│   │           ├── <hr> divider
│   │           └── <button> Sign out
│   │       </div>}
│   └── </div>
```

`DashboardNav` change: import `UserMenu`, restructure the inner div for justify-between layout, render `<UserMenu />` on the right. No props needed on `UserMenu`.

---

## 7. Mobile Behavior

On small screens (< 640px), the nav already scrolls horizontally for links. The `UserMenu` trigger should be excluded from the scrolling section and stay fixed on the right. The justify-between restructure handles this — the trigger is outside the scrollable `overflow-x-auto` div.

On mobile, the dropdown should still right-align. Since it's positioned `right-0`, it won't overflow off screen.

---

## 8. Accessibility

| Element | ARIA |
|---|---|
| Trigger button | `aria-haspopup="menu"`, `aria-expanded={isOpen}`, `aria-label="User menu"` |
| Dropdown | `role="menu"` |
| Profile link | `role="menuitem"` |
| Logout button | `role="menuitem"` |

Keyboard: Tab reaches trigger → Enter/Space opens → Tab navigates items → Escape closes.

---

## 9. Test IDs (required for E2E acceptance)

| Element | data-testid |
|---|---|
| Trigger button | `user-menu-button` |
| Dropdown panel | `user-menu-dropdown` |
| Profile link | `profile-link` |
| Logout button | `logout-button` |

E2E acceptance: load `/dashboard` → click `[data-testid=user-menu-button]` → assert `[data-testid=user-menu-dropdown]` visible → click `[data-testid=logout-button]` → assert redirect to `/login` → assert `leadflow_session` cookie absent.

---

## 10. Out of Scope

- "Sign out of all devices" — not in this spec
- Session list management — not in this spec
- Avatar image upload — not in this spec (initials-only for now)
- Dark mode toggle in the menu — not in this spec
