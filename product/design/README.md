# LeadFlow AI — Design Assets (Week 1)

**Product:** AI Lead Response System for Real Estate Agents  
**Framework:** shadcn/ui + Tailwind CSS + React 18+  
**Status:** 🟢 Production-Ready

This directory contains all design assets, wireframes, and components for the LeadFlow AI MVP.

---

## 📂 Quick Navigation

### Brand & Design System
- **[BRAND_GUIDELINES.md](./brand-identity/BRAND_GUIDELINES.md)** — Color palette, typography, logo, accessibility
- **[COMPONENT_LIBRARY.md](./brand-identity/COMPONENT_LIBRARY.md)** — 30+ copy-paste-ready React components
- **[tailwind-config.js](./brand-identity/tailwind-config.js)** — Tailwind CSS configuration (drop-in ready)

### Dashboard Wireframes
- **[DASHBOARD_WIREFRAMES.md](./wireframes/DASHBOARD_WIREFRAMES.md)** — 3 screens with full specs
  - Lead Feed (incoming leads, priority badges)
  - Response History (conversations, outcomes)
  - Analytics Dashboard (performance metrics)

### SMS Message Templates
- **[SMS_MESSAGE_TEMPLATES.md](./templates/SMS_MESSAGE_TEMPLATES.md)** — 5 templates with 4 variants each
  - Initial Response (within 2–5 min)
  - Follow-up / Nurture (30–90 min)
  - Booking Confirmation
  - Handoff to Human Agent
  - Re-engagement (cold leads)

### Landing Page Design
- **[LANDING_PAGE_DESIGN.md](./landing-page/LANDING_PAGE_DESIGN.md)** — 10-section landing page design
  - Hero section with pain point
  - Feature list (6 features)
  - Testimonials / Social proof
  - Pricing section (3 tiers)
  - FAQ & Footer

### Project Summary
- **[WEEK_1_SUMMARY.md](./WEEK_1_SUMMARY.md)** — Complete deliverables checklist & recommendations

---

## 🎨 Design System Quick Start

### 1. Install Tailwind CSS
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Copy Tailwind Config
Replace your `tailwind.config.js` with our config:
```bash
cp brand-identity/tailwind-config.js ./tailwind.config.js
```

### 3. Import Components
Copy component snippets from **COMPONENT_LIBRARY.md** into your React components.

### 4. Enable Dark Mode
Add `dark` class to root element (e.g., `<html className="dark">`)

---

## 🎯 What's Included

✅ **Mobile-first wireframes** (3 dashboard screens)  
✅ **SMS templates** (5 types, 4 variants each, ready to deploy)  
✅ **Brand identity** (colors, typography, logo, accessibility)  
✅ **Landing page design** (hero, features, pricing, FAQ)  
✅ **Tailwind CSS config** (drop-in, production-ready)  
✅ **Component library** (30+ copy-paste components)  
✅ **WCAG AA compliance** (accessible to all users)  
✅ **Dark mode support** (battery-efficient, eye-friendly)  

---

## 📱 Design Specs

**Platform:** Mobile-first responsive web app  
**Breakpoints:**
- Mobile: 320px–568px
- Tablet: 569px–1024px
- Desktop: 1025px+

**Color Palette:**
- Primary: Slate-900 (deep trust)
- Success: Emerald-500 (conversions)
- Warning: Amber-500 (urgency)
- Secondary: Blue-500 (info)

**Typography:**
- Font: Inter (Google Fonts)
- Sizes: 12px–48px (8-step scale)
- Weights: Regular (400), Semi-bold (600), Bold (700)

**Touch Targets:** 44px minimum (mobile accessibility)  
**Dark Mode:** Default for app, optional for landing page

---

## 🚀 For Developers

### Quick Setup
1. Copy `tailwind-config.js` to your project root
2. Import component snippets from `COMPONENT_LIBRARY.md`
3. Use Tailwind classes to build screens

### Example: Lead Feed Card
```jsx
import { MoreVertical } from 'lucide-react'

export function LeadCard({ lead }) {
  return (
    <div className="card-elevated cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <span className="badge-warning">🔴 URGENT</span>
        <button className="btn-icon">
          <MoreVertical size={20} />
        </button>
      </div>
      
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
        {lead.name}
      </h3>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
        📍 {lead.property}
      </p>
      
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
        💰 {lead.price}  •  📞 {lead.timeSinceContact}
      </p>
    </div>
  )
}
```

### Using Components
All components are defined as CSS classes in `tailwind-config.js`:
- `.btn-primary` — Primary button
- `.btn-secondary` — Secondary button
- `.card` — Basic card
- `.card-elevated` — Card with hover shadow
- `.badge-success`, `.badge-warning`, etc.

No additional UI library needed (though shadcn/ui is recommended for complex components like Dialog, Dropdown, etc.).

---

## 📊 For Product Teams

### SMS Templates
Ready to use in:
- **CRM:** Zapier, Make.com, custom APIs
- **SMS:** Twilio, MessageBird, Nexmo
- **WhatsApp:** WhatsApp Business API
- **Email:** If adapting templates to email

Includes:
- 20 message variants (5 types × 4 options each)
- Performance benchmarks (response rates, conversion metrics)
- Personalization placeholders
- Compliance notes (TCPA, opt-out language)

### Landing Page
Copy-paste-ready sections for:
- **Webflow:** Use HTML/CSS from design specs
- **Next.js:** Use React components from library
- **Static Site Generators:** Use HTML + Tailwind

Includes:
- Responsive design (mobile-to-desktop)
- Conversion optimization (multiple CTAs)
- Social proof (testimonials, metrics)
- FAQ (objection handling)

---

## 🎯 Success Metrics

Track these after launch:

**Dashboard:**
- User time-to-first-action (goal: <10 sec)
- Lead response time (goal: <2 min avg)
- Feature adoption (all 3 screens used)

**SMS Templates:**
- Reply rate by template type
- Conversion rate (reply → meeting scheduled)
- A/B test results (tone, copy, CTA)

**Landing Page:**
- Pilot signup rate
- Traffic source performance
- Time-to-CTA click

---

## 🔒 Accessibility Checklist

All assets meet WCAG AA standards:
- [x] Color contrast 4.5:1 minimum
- [x] Focus indicators visible
- [x] Keyboard navigation supported
- [x] Alt text on all images
- [x] Form labels associated
- [x] Semantic HTML
- [x] ARIA labels where needed
- [x] Mobile-friendly font sizes

---

## 📝 File Manifest

| File | Size | Purpose |
|------|------|---------|
| BRAND_GUIDELINES.md | 5.4 KB | Brand system, colors, typography |
| COMPONENT_LIBRARY.md | 14 KB | 30+ copy-paste components |
| tailwind-config.js | 7.2 KB | Tailwind CSS configuration |
| DASHBOARD_WIREFRAMES.md | 10 KB | 3 dashboard screens |
| SMS_MESSAGE_TEMPLATES.md | 9.5 KB | 5 SMS templates (20 variants) |
| LANDING_PAGE_DESIGN.md | 17.4 KB | Landing page (10 sections) |
| WEEK_1_SUMMARY.md | 12.7 KB | Deliverables summary |
| README.md | This file | Quick start guide |

**Total:** 76 KB of production-ready design docs

---

## ✨ Highlights

🎨 **Cohesive brand identity** — Consistent across all touchpoints  
📱 **Mobile-first design** — Agents work on phones  
🔗 **Copy-paste ready** — No design tool needed for basic builds  
♿ **Accessible** — WCAG AA, all users included  
🌙 **Dark mode** — Default for app, eye-friendly  
⚡ **Performance-optimized** — Minimal CSS, fast load times  
🎯 **Conversion-focused** — Landing page optimized for signups  
📊 **Data-driven** — SMS templates include performance metrics  

---

## 🤝 Support

**Questions about design?** → Check BRAND_GUIDELINES.md  
**Need a component?** → See COMPONENT_LIBRARY.md  
**Building the dashboard?** → Review DASHBOARD_WIREFRAMES.md  
**Deploying SMS?** → Use SMS_MESSAGE_TEMPLATES.md  

---

## 📞 Design Team

Available for:
- Design clarifications
- Component customizations
- Accessibility audits
- User testing feedback

---

## 📅 Timeline

- **Week 1:** ✅ Design system, wireframes, templates, landing page
- **Week 2:** 🔄 High-fidelity mockups, interactive prototype
- **Week 3:** 🔜 User testing, refinements, design handoff

---

**Status:** 🟢 Production-Ready  
**Last Updated:** 2026-02-14  
**Framework:** shadcn/ui + Tailwind CSS + React 18+
