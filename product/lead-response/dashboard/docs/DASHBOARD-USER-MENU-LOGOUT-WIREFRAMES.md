# Dashboard User Menu Logout — Wireframes

**Task ID:** b218fb06-38e9-4da1-9adb-c1927ea403c2

---

## 1. Desktop Nav (Closed)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Lead Feed   History   Analytics   Settings                    (AB) Account ▾ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Notes:
- Left: existing nav links unchanged
- Right: new `user-menu-trigger`

---

## 2. Desktop Nav (Menu Open)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Lead Feed   History   Analytics   Settings                    (AB) Account ▴ │
└──────────────────────────────────────────────────────────────────────────────┘
                                                             ┌─────────────────┐
                                                             │ Profile         │
                                                             ├─────────────────┤
                                                             │ Log out         │
                                                             └─────────────────┘
```

Notes:
- Panel anchored to trigger's right edge
- `Log out` visually distinct as destructive action

---

## 3. Logout Pending State

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Lead Feed   History   Analytics   Settings                    (AB) Account ▴ │
└──────────────────────────────────────────────────────────────────────────────┘
                                                             ┌─────────────────┐
                                                             │ Profile         │ (disabled)
                                                             ├─────────────────┤
                                                             │ ⏳ Logging out...│
                                                             └─────────────────┘
```

Notes:
- Menu remains open while mutation is in progress
- Items disabled to prevent duplicate taps/clicks

---

## 4. Mobile (Closed)

```
┌───────────────────────────────────────┐
│ Lead Feed  History  Analytics     (AB)│
└───────────────────────────────────────┘
```

Notes:
- Compact icon/avatar trigger at far right
- Nav links remain horizontally scrollable

---

## 5. Mobile (Open)

```
┌───────────────────────────────────────┐
│ Lead Feed  History  Analytics     (AB)│
└───────────────────────────────────────┘
                         ┌──────────────┐
                         │ Profile      │
                         ├──────────────┤
                         │ Log out      │
                         └──────────────┘
```

Notes:
- Menu overlays content (higher z-index than nav scroller)
- Touch targets >= 40px height

---

## 6. Micro-Interaction Timing

- Menu open: 120-160ms ease-out
- Menu close: 80-120ms ease-in
- Chevron rotate: 120ms
- Logout row spinner appears immediately (<50ms perceived)

---

## 7. Hand-off Data Test IDs

- `user-menu-trigger`
- `user-menu-panel`
- `user-menu-profile`
- `user-menu-logout`

These IDs are required for the e2e acceptance scenario.
