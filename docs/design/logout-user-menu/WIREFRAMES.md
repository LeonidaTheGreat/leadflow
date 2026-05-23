# Dashboard Nav User Menu Wireframes

Task: `uc-buyer-journey-logout-button`

## Goal
Expose account actions in dashboard nav via a compact user-menu dropdown with:
- `Profile` link (`/profile`)
- `Log out` action (POST/logout flow) that redirects to `/login`

## Placement
- Component: `DashboardNav`
- Position: far right of top nav row
- Trigger: avatar circle + chevron (or avatar + user name on desktop)

## Desktop Wireframe (>= 1024px)

```text
+----------------------------------------------------------------------------------+
| LeadFeed  History  Analytics  Settings                          [AB ▼]          |
+----------------------------------------------------------------------------------+
                                                             click [AB ▼]
                                                             opens menu
                                                         +----------------+
                                                         | Profile         |
                                                         |----------------|
                                                         | Log out         |
                                                         +----------------+
```

## Tablet Wireframe (768px - 1023px)

```text
+--------------------------------------------------------------------+
| LeadFeed  History  Analytics  Settings                 [Avatar ▼]  |
+--------------------------------------------------------------------+
                                                       +--------------+
                                                       | Profile      |
                                                       |--------------|
                                                       | Log out      |
                                                       +--------------+
```

## Mobile Wireframe (< 768px)

```text
+-----------------------------------+
| LeadFeed History ...      [◯ ▼]   |
+-----------------------------------+
                     tap
                +------------------+
                | Profile          |
                |------------------|
                | Log out          |
                +------------------+
```

## Interaction States
1. Closed: only trigger visible.
2. Open: menu anchored to trigger, right-aligned to viewport-safe edge.
3. Keyboard focus: visible focus ring on trigger and each menu item.
4. Pending logout: `Log out` row disabled + subtle spinner.
5. Error fallback: keep menu open and show inline error text under `Log out`.

## Behavior Notes
- Click outside or `Esc` closes menu.
- `Profile` is immediate navigation.
- `Log out` is destructive-but-common account action and should be visually separated with divider.
- Menu width fixed (`~192px`) for predictability across breakpoints.
