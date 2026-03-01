# LeadFlow AI — Component Library

**Framework:** shadcn/ui + Tailwind CSS  
**Base:** React 18+  
**Icons:** Lucide React (open-source)

---

## Ready-to-Use Components

All components use Tailwind utilities from `tailwind-config.js`. Copy & paste snippets below.

---

## Buttons

### Primary Button
```jsx
<button className="btn-primary">
  Join Pilot Program
</button>
```
**Dark mode:** Automatic (Tailwind darkMode: 'class')

### Secondary Button
```jsx
<button className="btn-secondary">
  Learn More
</button>
```

### Ghost Button (Low emphasis)
```jsx
<button className="btn-ghost">
  Skip for now
</button>
```

### Danger Button
```jsx
<button className="btn-danger">
  Delete Lead
</button>
```

### Icon Button (32–48px touch target)
```jsx
<button className="btn-icon">
  <Settings size={20} className="text-slate-600" />
</button>
```

---

## Inputs

### Text Input
```jsx
<input
  type="text"
  placeholder="Lead name..."
  className="input-base"
/>
```

### With Label
```jsx
<label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
  Email
</label>
<input
  type="email"
  className="input-base"
/>
```

### Error State
```jsx
<input
  type="text"
  className="input-base input-error"
/>
<p className="text-xs text-red-600 mt-1">This field is required</p>
```

---

## Cards

### Basic Card
```jsx
<div className="card">
  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
    Lead Card
  </h3>
  <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
    Card content here
  </p>
</div>
```

### Elevated Card (with hover effect)
```jsx
<div className="card-elevated">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-slate-900">Sarah Martinez</span>
    <span className="badge-warning">URGENT</span>
  </div>
  <p className="text-xs text-slate-500 mt-3">Downtown Lofts • $450K</p>
</div>
```

### Lead Feed Card (Example)
```jsx
<div className="card-elevated cursor-pointer">
  <div className="flex items-start justify-between mb-2">
    <span className="badge-warning text-xs">🔴 URGENT</span>
    <button className="btn-icon">⋯</button>
  </div>
  
  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
    Sarah Martinez
  </h3>
  
  <div className="mt-2 space-y-1 text-sm">
    <p className="text-slate-600 dark:text-slate-400">📍 Downtown Lofts</p>
    <p className="text-slate-700 dark:text-slate-300 font-semibold">
      💰 $450K  •  📞 2 min ago
    </p>
    <p className="text-slate-500 dark:text-slate-400 italic">
      "Viewing property today..."
    </p>
  </div>
</div>
```

---

## Badges / Status Indicators

### Success Badge
```jsx
<span className="badge-success">✓ Converted</span>
```

### Warning Badge
```jsx
<span className="badge-warning">⚠️ Urgent</span>
```

### Danger Badge
```jsx
<span className="badge-danger">✗ Failed</span>
```

### Info Badge
```jsx
<span className="badge-info">ℹ️ Pending</span>
```

### Custom Badge
```jsx
<span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
  🟢 Qualified
</span>
```

---

## Sections & Containers

### Hero Section
```jsx
<section className="relative py-12 px-4 md:py-16 lg:py-20">
  <div className="mx-auto max-w-4xl text-center">
    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
      Never Miss a Lead Again
    </h1>
    <p className="mt-4 text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
      Respond to qualified leads in 90 seconds with AI-powered SMS.
    </p>
    <button className="btn-primary mt-6 px-6 py-3 text-base">
      🟢 Start Free Trial
    </button>
  </div>
</section>
```

### Feature Grid (3 columns)
```jsx
<section className="section-spacing">
  <div className="container-max">
    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
      Key Features
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Feature cards map here */}
      <div className="card-elevated">
        <div className="text-3xl mb-3">📲</div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Mobile Dashboard
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          See all leads on your phone. Respond on the go.
        </p>
      </div>
    </div>
  </div>
</section>
```

---

## Forms

### Contact Form
```jsx
<form className="space-y-4">
  <div>
    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
      Full Name
    </label>
    <input
      type="text"
      placeholder="John Doe"
      className="input-base w-full"
    />
  </div>
  
  <div>
    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
      Email
    </label>
    <input
      type="email"
      placeholder="john@example.com"
      className="input-base w-full"
    />
  </div>
  
  <button type="submit" className="btn-primary w-full">
    Get Started
  </button>
</form>
```

---

## Navigation

### Header Navigation
```jsx
<nav className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50">
  <div className="container-max px-4 py-4 flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2">
      <span className="text-2xl">▌█</span>
      <span className="text-lg font-bold text-slate-900 dark:text-white">
        LeadFlow AI
      </span>
    </div>
    
    {/* Menu */}
    <div className="hidden md:flex gap-8">
      <a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-500">
        Features
      </a>
      <a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-500">
        Pricing
      </a>
      <a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-500">
        Docs
      </a>
    </div>
    
    {/* CTA */}
    <button className="btn-primary">Get Started</button>
  </div>
</nav>
```

### Bottom Navigation (Mobile)
```jsx
<nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
  <div className="flex items-center justify-around">
    <button className="flex-1 py-3 text-center border-b-2 border-emerald-500 text-emerald-500">
      📲 Home
    </button>
    <button className="flex-1 py-3 text-center text-slate-600 dark:text-slate-400 hover:text-emerald-500">
      📧 Messages
    </button>
    <button className="flex-1 py-3 text-center text-slate-600 dark:text-slate-400 hover:text-emerald-500">
      📊 Analytics
    </button>
    <button className="flex-1 py-3 text-center text-slate-600 dark:text-slate-400 hover:text-emerald-500">
      👤 Profile
    </button>
  </div>
</nav>
```

---

## Modals / Dialogs

### Confirmation Modal
```jsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
  <div className="card max-w-sm w-full">
    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
      Confirm Action
    </h2>
    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
      Are you sure you want to continue?
    </p>
    <div className="flex gap-3 mt-6">
      <button className="btn-secondary flex-1">Cancel</button>
      <button className="btn-primary flex-1">Confirm</button>
    </div>
  </div>
</div>
```

---

## Tables

### Analytics Table
```jsx
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead className="border-b border-slate-200 dark:border-slate-800">
      <tr className="bg-slate-50 dark:bg-slate-800">
        <th className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-white">
          Metric
        </th>
        <th className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-white">
          Today
        </th>
        <th className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-white">
          This Week
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">Leads Received</td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">12</td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">89</td>
      </tr>
      <tr className="border-b border-slate-200 dark:border-slate-800">
        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">Response Rate</td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">83%</td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">79%</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Alerts / Notifications

### Info Alert
```jsx
<div className="rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 p-4">
  <div className="flex items-start gap-3">
    <span className="text-lg">ℹ️</span>
    <div>
      <h3 className="font-semibold text-blue-900 dark:text-blue-100">Notice</h3>
      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
        Your trial expires in 7 days. Upgrade now to continue.
      </p>
    </div>
  </div>
</div>
```

### Success Alert
```jsx
<div className="rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 p-4">
  <div className="flex items-center gap-3">
    <span className="text-lg">✓</span>
    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
      Lead response sent successfully!
    </p>
  </div>
</div>
```

### Error Alert
```jsx
<div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 p-4">
  <div className="flex items-center gap-3">
    <span className="text-lg">✗</span>
    <p className="text-sm font-medium text-red-800 dark:text-red-200">
      Failed to send response. Try again.
    </p>
  </div>
</div>
```

---

## Loading States

### Spinner
```jsx
<div className="flex items-center justify-center p-4">
  <div className="animate-spin">
    <div className="w-8 h-8 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-500 rounded-full"></div>
  </div>
</div>
```

### Skeleton (Placeholder)
```jsx
<div className="card animate-pulse">
  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mt-2 w-1/2"></div>
  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mt-4"></div>
</div>
```

---

## Empty States

### No Data
```jsx
<div className="text-center py-12">
  <div className="text-4xl mb-3">📭</div>
  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
    No leads yet
  </h3>
  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-4">
    Get started by joining the pilot program.
  </p>
  <button className="btn-primary">Start Now</button>
</div>
```

---

## Responsive Utilities

### Hide/Show by breakpoint
```jsx
{/* Hidden on mobile, visible on tablet+ */}
<div className="hidden md:block">Desktop content</div>

{/* Visible on mobile, hidden on tablet+ */}
<div className="md:hidden">Mobile content</div>
```

### Responsive Spacing
```jsx
{/* 4px padding on mobile, 16px on tablet, 24px on desktop */}
<div className="p-1 md:p-4 lg:p-6">Content</div>
```

### Responsive Grid
```jsx
{/* 1 column on mobile, 2 on tablet, 3 on desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* items */}
</div>
```

---

## Color Reference

Use these class names for consistent theming:

```jsx
// Text colors
<p className="text-slate-900 dark:text-slate-100">Dark text</p>
<p className="text-slate-600 dark:text-slate-400">Medium text</p>
<p className="text-slate-500 dark:text-slate-500">Muted text</p>

// Background colors
<div className="bg-slate-50 dark:bg-slate-900">Light bg</div>
<div className="bg-emerald-500">Success bg</div>
<div className="bg-amber-500">Warning bg</div>
<div className="bg-red-500">Danger bg</div>

// Border colors
<div className="border border-slate-200 dark:border-slate-800">Border</div>
<div className="border-2 border-emerald-500">Primary border</div>
```

---

## Animation Classes

### Hover Effects
```jsx
<button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">
  Hover me
</button>
```

### Fade In
```jsx
<div className="animate-fadeIn">Content</div>
```

### Pulse (Loading indicator)
```jsx
<div className="animate-pulse">Loading...</div>
```

---

## Integration with shadcn/ui

This component library complements shadcn/ui. For complex components:

1. **Use shadcn/ui components** for Dialog, Dropdown, Tooltip, etc.
2. **Apply Tailwind classes** from `tailwind-config.js` for styling
3. **Extend with custom CSS** for LeadFlow-specific animations

Example with shadcn/ui Dialog:
```jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function LeadDetailsModal() {
  return (
    <Dialog>
      <DialogContent className="card">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Form content */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Best Practices

1. **Always use semantic class names** from tailwind-config.js (e.g., `.btn-primary` instead of raw Tailwind)
2. **Respect dark mode** — all components include `dark:` variants
3. **Touch targets:** Minimum 44px × 44px for mobile
4. **Spacing:** Use multiples of 4px (defined in theme.spacing)
5. **Color contrast:** Test with WCAG contrast checker
6. **Responsive first:** Mobile layout, then tablet/desktop overrides
