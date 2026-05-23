# Dashboard Nav User Menu Component Spec

Task: `b218fb06-38e9-4da1-9adb-c1927ea403c2`
Use case: `uc-buyer-journey-logout-button`

## Component Contract
- New subcomponent in nav context: `DashboardUserMenu`
- Parent placement: `dashboard-nav`
- Exposed actions:
  - `Profile` -> `href="/profile"`
  - `Log out` -> calls existing backend logout endpoint (`/api/auth/logout`)

## Information Architecture
- Trigger label:
  - Desktop: initials + down chevron
  - Mobile: avatar glyph + chevron
- Dropdown groups:
  - Group A: navigation (`Profile`)
  - Divider
  - Group B: session action (`Log out`)

## Visual Spec
- Trigger height: `36px`
- Trigger horizontal padding: `10px`
- Corner radius: `8px`
- Menu width: `192px`
- Menu item height: `40px`
- Menu padding: `6px`
- Divider vertical margin: `4px`

## Tailwind Token Direction
- Surface: `bg-white dark:bg-slate-900`
- Border: `border-slate-200 dark:border-slate-700`
- Text default: `text-slate-700 dark:text-slate-200`
- Text destructive: `text-red-600 dark:text-red-400`
- Hover row: `bg-slate-100 dark:bg-slate-800`
- Focus ring: `focus-visible:ring-2 focus-visible:ring-blue-500`

## Accessibility
- Trigger: `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`
- Menu container: `role="menu"`
- Items: `role="menuitem"`
- Keyboard:
  - `Enter/Space` opens
  - `ArrowDown/ArrowUp` moves focus
  - `Esc` closes and returns focus to trigger

## Testability Hooks (for E2E Acceptance)
- Trigger: `data-testid="user-menu-trigger"`
- Menu: `data-testid="user-menu"`
- Profile action: `data-testid="user-menu-profile"`
- Logout action: `data-testid="user-menu-logout"`

## Acceptance Mapping
E2E expectation alignment:
1. Load `/dashboard`
2. Open user menu via `user-menu-trigger`
3. Click `user-menu-logout`
4. Assert redirect to `/login`
5. Assert auth cookie cleared

## Edge Cases
- Slow network on logout: show pending state, prevent double-submit.
- Failed logout response: keep user in place and show action-level error.
- Very small viewport: menu remains fully visible by right-edge anchoring.
