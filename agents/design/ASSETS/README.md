# LeadFlow AI — Design Assets

**Project:** BO2026 — AI Lead Response System MVP  
**Last Updated:** 2026-02-16

---

## 📦 Asset Inventory

| Asset | Location | Format | Purpose |
|-------|----------|--------|---------|
| Animations | `ASSETS/animations.css` | CSS | All animations, transitions, keyframes |
| Icons | `ASSETS/icons/icon-set.svg` | SVG | Lucide icon exports |

---

## 🎨 Animations (animations.css)

### What's Included

1. **CSS Custom Properties** — Complete design token system
2. **Animation Keyframes** — 15+ predefined animations
3. **Component Animations** — Ready-to-use classes
4. **Page Transitions** — Route change animations
5. **Micro-interactions** — Hover, focus, tap effects
6. **Reduced Motion Support** — Accessibility-compliant

### Quick Reference

| Animation | Class | Duration |
|-----------|-------|----------|
| Fade In | `.animate-fade-in` | 200ms |
| Fade In Up | `.animate-fade-in-up` | 300ms |
| Scale In | `.animate-scale-in` | 300ms |
| Slide In Right | `.animate-slide-in-right` | 300ms |
| Spinner | `.animate-spin` | 1000ms (infinite) |
| Pulse | `.animate-pulse` | 2000ms (infinite) |
| Shake | `.animate-shake` | 400ms |

### Usage Example

```jsx
// React component with animation
function LeadCard({ lead }) {
  return (
    <div className="card-hover animate-fade-in-up">
      {/* card content */}
    </div>
  );
}
```

### Import

```css
/* In your main CSS */
@import './assets/animations.css';
```

```javascript
// Or in JS bundler
import './assets/animations.css';
```

---

## 🎯 Icons (icon-set.svg)

### Icon Categories

| Category | Icons | Size |
|----------|-------|------|
| Navigation | Inbox, Message, Analytics, User, Settings, Bell | 20×20 |
| Actions | More, Arrow Left, X, Check, Phone, Mail, Calendar | 16×16 |
| Status | Trending Up/Down, Info, Alert, Error | 16×16 |
| Lead Info | Dollar, Map Pin, Target, Home | 16×16 |
| Utility | Loader, Chevron, Log Out, Edit, Trash | 16×16 |

### Usage

**Option 1: Use Lucide React (Recommended)**
```bash
npm install lucide-react
```

```jsx
import { Inbox, MessageSquare, User, Settings } from 'lucide-react';

<Inbox size={20} />
<MessageSquare size={20} />
```

**Option 2: Use SVG exports**
```jsx
// Copy SVG from icon-set.svg
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  {/* icon path */}
</svg>
```

### Icon Sizes

| Context | Size | Example |
|---------|------|---------|
| Navigation | 20×20 | Bottom nav, sidebar |
| Actions | 16×16 | Buttons, inline actions |
| Status indicators | 14×14 | Delivered check, inline status |
| Priority dots | 8×8 | Lead priority indicators |

---

## 📋 Implementation Checklist

### For Developers

- [ ] Import `animations.css` in main entry
- [ ] Install `lucide-react` for icons
- [ ] Use CSS custom properties for theming
- [ ] Test reduced motion preferences
- [ ] Verify animation performance (60fps)

### For QA

- [ ] All hover states work
- [ ] Focus rings visible
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Icons render correctly at all sizes
- [ ] No layout shift during animations

---

## 🔧 Customization

### Changing Animation Speed

```css
:root {
  --duration-fast: 100ms;  /* Default: 150ms */
  --duration-normal: 150ms; /* Default: 200ms */
  --duration-slow: 250ms;  /* Default: 300ms */
}
```

### Adding Custom Colors

```css
:root {
  --color-custom: #your-color;
}
```

### Custom Animations

```css
@keyframes custom-animation {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.animate-custom {
  animation: custom-animation 300ms var(--ease-spring);
}
```

---

## 📝 Notes

- All icons are stroke-based (not filled) for consistency
- Animations use hardware-accelerated properties only (transform, opacity)
- CSS custom properties enable runtime theming (dark/light mode)
- Reduced motion support is automatic — no extra work needed

---

## 🔗 Related Files

- [MVP_DESIGNS.md](../MVP_DESIGNS.md) — Full design specifications
- [COMPONENT_LIBRARY.md](../../../product/design/brand-identity/COMPONENT_LIBRARY.md) — React components
- [BRAND_GUIDELINES.md](../../../product/design/brand-identity/BRAND_GUIDELINES.md) — Brand specs
