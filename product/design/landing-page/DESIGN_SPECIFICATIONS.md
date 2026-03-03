# LeadFlow AI Landing Page — Design Specifications

**Document ID:** DES-LAND-001  
**Version:** 1.0  
**Date:** March 2, 2026  
**Use Case:** gtm-landing-page  
**Workflow Step:** 3/5 (Design)

---

## Design Overview

### Purpose
High-converting landing page for LeadFlow AI to capture pilot signups and drive trial activations.

### Target Audience
- Primary: Solo real estate agents (12-24 transactions/year)
- Secondary: Small real estate teams (2-5 agents)
- Tertiary: Brokerages (future)

### Design Goals
1. **Conversion:** 5%+ visitor → signup rate
2. **Clarity:** Value proposition understood in <5 seconds
3. **Trust:** Professional, modern, credible design
4. **Speed:** <2 second page load on mobile
5. **Mobile-First:** 65% of traffic expected from mobile

---

## Brand Identity

### Color Palette

**Primary Colors:**
```
Indigo (Primary):    #6366f1
Indigo Dark:         #4f46e5
Indigo Light:        #818cf8
```

**Neutral Colors:**
```
White:               #ffffff
Gray 50 (BG):        #f9fafb
Gray 100:            #f3f4f6
Gray 200:            #e5e7eb
Gray 600 (Text):     #6b7280
Gray 900 (Heading):  #111827
```

**Accent Colors:**
```
Yellow (Badge):      #f59e0b
Green (Success):     #10b981
Red (Error):         #ef4444
```

**Gradients:**
```
Dark Gradient: linear-gradient(135deg, #1f2937 0%, #111827 100%)
Light Gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)
```

### Typography

**Font Stack:**
```
Primary:   'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Monospace: 'SF Mono', Monaco, 'Courier New', monospace (for stats)
```

**Type Scale:**

| Element | Desktop | Mobile | Weight | Line Height |
|---------|---------|--------|--------|-------------|
| H1 (Hero) | 52px | 36px | 800 | 1.1 |
| H2 (Section) | 36px | 28px | 700 | 1.2 |
| H3 (Feature) | 24px | 20px | 600 | 1.3 |
| Body Large | 20px | 18px | 400 | 1.6 |
| Body | 18px | 16px | 400 | 1.6 |
| Body Small | 16px | 14px | 400 | 1.5 |
| Button | 16px | 16px | 600 | 1 |
| Caption | 14px | 12px | 500 | 1.4 |

### Spacing System

**Base Unit:** 4px

**Scale:**
```
xs:   4px
sm:   8px
md:   12px
base: 16px
lg:   24px
xl:   32px
2xl:  48px
3xl:  64px
4xl:  96px
```

---

## Component Library

See wireframes/COMPONENTS.md for detailed specifications.

---

## Responsive Breakpoints

```css
/* Mobile First Approach */
sm:  640px   /* Large phones */
md:  768px   /* Tablets */
lg:  1024px  /* Desktops */
xl:  1280px  /* Large desktops */
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance
- Color Contrast: Minimum 4.5:1 (text), 3:1 (UI)
- Keyboard Navigation: All interactive elements focusable
- Screen Readers: Semantic HTML, alt text, ARIA labels
- Touch Targets: Minimum 44px × 44px

---

## Performance Requirements

### Target Metrics
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1

### Optimization
- WebP images with fallbacks
- Critical CSS inline
- Lazy loading below fold
- Font subsetting

---

**Document Status:** Complete  
**Next Step:** Developer implementation
