# Component Specifications — LeadFlow AI Landing Page

**Document ID:** DES-LAND-COMP-001  
**Version:** 1.0  
**Date:** March 2, 2026

---

## Button Components

### Primary Button

**Visual:**
```
┌──────────────────────┐
│  Start Free Trial →  │ 
└──────────────────────┘
```

**CSS:**
```css
.btn-primary {
  background: #6366f1;
  color: #ffffff;
  padding: 14px 28px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 200ms ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-primary:hover {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}
```

**States:**
- **Default:** Indigo background, white text
- **Hover:** Darker indigo, slight lift, shadow
- **Active:** Return to default position
- **Focus:** Indigo ring (keyboard navigation)
- **Disabled:** Gray background, opacity 0.5, no pointer

**Arrow Icon:** → (U+2192) or Heroicon ChevronRightIcon, 20px

---

### Secondary Button (Outlined)

**Visual:**
```
┌──────────────────────┐
│  See How It Works    │ 
└──────────────────────┘
```

**CSS:**
```css
.btn-secondary {
  background: transparent;
  color: #6366f1;
  padding: 14px 28px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  border: 2px solid #6366f1;
  cursor: pointer;
  transition: all 200ms ease;
}

.btn-secondary:hover {
  background: rgba(99, 102, 241, 0.05);
  border-color: #4f46e5;
  color: #4f46e5;
}
```

---

## Badge Components

### Pilot Badge

**Visual:**
```
┌─────────────────────────────┐
│ 🚀 NOW IN PILOT — LIMITED   │
└─────────────────────────────┘
```

**CSS:**
```css
.badge-pilot {
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
```

**Icon:** 🚀 emoji or custom SVG rocket icon

---

### Popular Badge (Pricing)

**Visual:**
```
     ┌─────────────┐
     │ ⭐ POPULAR  │
     └─────────────┘
┌─────────────────────────┐
│                          │
│       PRO PLAN           │
│                          │
└─────────────────────────┘
```

**CSS:**
```css
.badge-popular {
  background: #6366f1;
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
}
```

---

## Input Components

### Text Input

**Visual:**
```
┌────────────────────────────┐
│ John Smith                  │
└────────────────────────────┘
```

**HTML:**
```html
<div class="input-group">
  <label for="full-name">Full Name</label>
  <input 
    type="text" 
    id="full-name" 
    name="fullName"
    placeholder="John Smith"
    class="input-text"
    required
  />
  <span class="input-error">This field is required</span>
</div>
```

**CSS:**
```css
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.input-text {
  width: 100%;
  height: 48px;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  transition: all 200ms ease;
}

.input-text::placeholder {
  color: #9ca3af;
}

.input-text:focus {
  border-color: #6366f1;
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.input-text.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.input-error {
  font-size: 14px;
  color: #ef4444;
  display: none;
}

.input-text.error ~ .input-error {
  display: block;
}
```

**States:**
- **Default:** Gray border, placeholder visible
- **Focus:** Indigo border and ring
- **Filled:** Dark text, no placeholder
- **Error:** Red border and ring, error message visible
- **Disabled:** Gray background, no pointer

---

## Card Components

### Feature Card

**Visual:**
```
┌──────────────────────────┐
│          ⚡               │
│                           │
│   Instant Response        │
│                           │
│   The moment a lead hits  │
│   your CRM, they get a    │
│   personalized SMS.       │
│                           │
│   • Under 30 seconds      │
│   • Personalized          │
│   • Your brand voice      │
│                           │
└──────────────────────────┘
```

**CSS:**
```css
.card-feature {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px;
  transition: all 300ms ease;
}

.card-feature:hover {
  border-color: #6366f1;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-feature-emoji {
  font-size: 40px;
  margin-bottom: 16px;
}

.card-feature-title {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.card-feature-description {
  font-size: 16px;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 20px;
}

.card-feature-list {
  list-style: none;
  padding: 0;
}

.card-feature-list li {
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  line-height: 2;
  padding-left: 28px;
  position: relative;
}

.card-feature-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #10b981;
  font-size: 20px;
}
```

---

### Pricing Card

**Visual (Normal):**
```
┌──────────────────────────┐
│                           │
│        STARTER            │
│                           │
│         $49               │
│        /month             │
│                           │
│      100 SMS/month        │
│                           │
│      ✓ Basic AI           │
│      ✓ FUB integration    │
│      ✓ Simple dashboard   │
│                           │
│    [  Start Trial  ]      │
│                           │
└──────────────────────────┘
```

**Visual (Popular - Highlighted):**
```
     ┌─────────────┐
     │ ⭐ POPULAR  │
     └─────────────┘
┌──────────────────────────┐
│                           │
│          PRO              │
│                           │
│        $149               │
│        /month             │
│                           │
│    Unlimited SMS          │
│                           │
│    ✓ Advanced AI          │
│    ✓ Cal.com booking      │
│    ✓ Follow-up sequences  │
│    ✓ Priority support     │
│                           │
│  [  Start Free Trial  ]   │
│                           │
└──────────────────────────┘
```

**CSS:**
```css
.card-pricing {
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 40px 32px;
  position: relative;
  transition: all 300ms ease;
}

.card-pricing.popular {
  border-color: #6366f1;
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.2);
  transform: scale(1.05);
  z-index: 1;
}

.pricing-plan-name {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.pricing-price {
  font-size: 48px;
  font-weight: 800;
  color: #111827;
  text-align: center;
  line-height: 1;
  margin-bottom: 8px;
}

.pricing-interval {
  font-size: 16px;
  font-weight: 400;
  color: #6b7280;
  text-align: center;
  margin-bottom: 8px;
}

.pricing-description {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
  margin-bottom: 24px;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin-bottom: 32px;
}

.pricing-features li {
  font-size: 14px;
  font-weight: 400;
  color: #111827;
  line-height: 2;
  padding-left: 24px;
  position: relative;
}

.pricing-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #10b981;
  font-size: 16px;
}
```

---

### Problem Card

**Visual:**
```
┌──────────────────────────┐
│                           │
│          😴               │
│                           │
│    Leads Go Cold          │
│                           │
│    By the time you        │
│    respond, they've       │
│    already talked to      │
│    3 other agents.        │
│                           │
└──────────────────────────┘
```

**CSS:**
```css
.card-problem {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
}

.card-problem-emoji {
  font-size: 48px;
  margin-bottom: 16px;
}

.card-problem-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.card-problem-description {
  font-size: 16px;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.6;
}
```

---

## Form Components

### Signup Form

**HTML Structure:**
```html
<form class="signup-form" id="signup-form">
  <h3 class="form-title">Get Started</h3>
  
  <div class="input-group">
    <input 
      type="text" 
      name="fullName" 
      placeholder="Full Name"
      required
    />
  </div>
  
  <div class="input-group">
    <input 
      type="email" 
      name="email" 
      placeholder="Email"
      required
    />
  </div>
  
  <div class="input-group">
    <input 
      type="tel" 
      name="phone" 
      placeholder="Phone"
      required
    />
  </div>
  
  <div class="input-group">
    <input 
      type="text" 
      name="brokerage" 
      placeholder="Brokerage"
    />
  </div>
  
  <button type="submit" class="btn-primary btn-full">
    Start My Free Trial →
  </button>
  
  <p class="form-microcopy">
    By signing up, you agree to our Terms and Privacy Policy
  </p>
</form>
```

**Success State:**
```html
<div class="form-success">
  <div class="success-icon">🎉</div>
  <h3 class="success-title">You're in!</h3>
  <p class="success-message">
    Check your email for next steps.
  </p>
</div>
```

**CSS:**
```css
.signup-form {
  background: #ffffff;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  text-align: center;
  margin-bottom: 24px;
}

.signup-form .input-group {
  margin-bottom: 16px;
}

.btn-full {
  width: 100%;
  height: 56px;
  font-size: 18px;
}

.form-microcopy {
  font-size: 12px;
  font-weight: 400;
  color: #9ca3af;
  text-align: center;
  margin-top: 16px;
  line-height: 1.5;
}

.form-success {
  text-align: center;
  padding: 40px;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.success-title {
  font-size: 28px;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 12px;
}

.success-message {
  font-size: 18px;
  font-weight: 400;
  color: #6b7280;
}
```

---

## Stat Component

**Visual:**
```
┌──────────────┐
│              │
│    <30s      │
│              │
│   Response   │
│    Time      │
│              │
└──────────────┘
```

**HTML:**
```html
<div class="stat">
  <div class="stat-number">&lt;30s</div>
  <div class="stat-label">Response Time</div>
</div>
```

**CSS:**
```css
.stat {
  text-align: center;
}

.stat-number {
  font-size: 36px;
  font-weight: 800;
  color: #6366f1;
  font-family: 'SF Mono', Monaco, monospace;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 16px;
  font-weight: 500;
  color: #6b7280;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .stat-number {
    font-size: 28px;
  }
  
  .stat-label {
    font-size: 14px;
  }
}
```

---

## Loading States

### Button Loading

**Visual:**
```
┌──────────────────────┐
│  ⟳  Submitting...    │
└──────────────────────┘
```

**CSS:**
```css
.btn-loading {
  position: relative;
  color: transparent;
  pointer-events: none;
}

.btn-loading::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  top: 50%;
  left: 50%;
  margin-left: -10px;
  margin-top: -10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Mobile-Specific Components

### Sticky CTA Bar

**Visual:**
```
┌─────────────────────────┐
│                          │
│  [Start Free Trial →]   │
│                          │
└─────────────────────────┘
```

**CSS:**
```css
.sticky-cta {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #ffffff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 40;
  display: none;
}

@media (max-width: 768px) {
  .sticky-cta {
    display: block;
  }
  
  .sticky-cta.hidden {
    transform: translateY(100%);
  }
}

.sticky-cta button {
  width: 100%;
  height: 48px;
  font-size: 16px;
}
```

---

## Accessibility Features

### Skip Link

**HTML:**
```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

**CSS:**
```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #6366f1;
  color: #ffffff;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 100;
  border-radius: 0 0 4px 0;
}

.skip-link:focus {
  top: 0;
}
```

---

## Icon Usage

### Heroicons v2

All icons from [Heroicons](https://heroicons.com/):

**Outline (for features, non-action):**
- ChevronRightIcon (arrows)
- CheckIcon (checkmarks)
- SparklesIcon (AI features)
- CalendarIcon (booking)
- ChatBubbleLeftRightIcon (messaging)

**Solid (for actions, CTAs):**
- ArrowRightIcon (CTA arrows)
- CheckCircleIcon (success)
- ExclamationCircleIcon (error)

**Size:** 20px (inline), 24px (standalone), 48px (hero features)  
**Color:** Inherit from parent or #6366f1 for emphasis

---

**Component Library Status:** Complete  
**Ready for:** Development implementation
