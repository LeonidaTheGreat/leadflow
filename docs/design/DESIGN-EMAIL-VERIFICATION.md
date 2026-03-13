# Design Specification: Email Verification UI

**Feature:** Email Verification — Confirm Inbox Before Login  
**Task ID:** 7f6ecf1e-5ce6-47fb-be2a-9fd4aab9df20  
**Date:** 2026-01-13  
**Designer:** Design Agent  

---

## Overview

This document specifies the visual design for the email verification flow. It includes:
1. `/check-your-inbox` page — post-signup verification gate
2. Login page error state — for unverified account attempts
3. Email template — confirmation email design

All designs follow the existing LeadFlow design system (dark theme, emerald accents, slate palette).

---

## 1. /check-your-inbox Page

### Purpose
Displayed immediately after signup. Shows the user their email address and provides instructions + resend functionality.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo: LeadFlow AI]                                        │
│                                                             │
│         ┌─────────────────────────────────────┐             │
│         │  📧                                 │             │
│         │                                     │             │
│         │  Check your inbox                   │             │
│         │                                     │             │
│         │  We sent a confirmation link to     │             │
│         │  sarah@example.com                  │             │
│         │                                     │             │
│         │  Click the link to activate your    │             │
│         │  account.                           │             │
│         │                                     │             │
│         │  ─────────────────────────────────  │             │
│         │  The link expires in 24 hours.      │             │
│         │                                     │             │
│         │  [Resend email]                     │             │
│         │  Resend in 42s (countdown state)    │             │
│         │                                     │             │
│         │  Wrong email? Sign up with a        │             │
│         │  different address                  │             │
│         └─────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Visual Specifications

#### Container
- **Max width:** 420px (centered)
- **Background:** `bg-slate-900` (page) / `bg-slate-800/50` (card)
- **Card border:** `border-slate-700`
- **Card padding:** `p-8` (32px)
- **Border radius:** `rounded-xl` (12px)
- **Backdrop blur:** `backdrop-blur-sm`

#### Icon
- **Icon:** Mail icon from `lucide-react`
- **Size:** `w-16 h-16` (64px)
- **Container:** `w-20 h-20` (80px) circle
- **Background:** `bg-emerald-500/10`
- **Border:** `border border-emerald-500/30`
- **Icon color:** `text-emerald-400`
- **Border radius:** `rounded-full`

#### Typography

| Element | Font Size | Font Weight | Color | Line Height |
|---------|-----------|-------------|-------|-------------|
| Headline | `text-2xl` (24px) | `font-bold` (700) | `text-white` | `leading-tight` |
| Email address | `text-lg` (18px) | `font-semibold` (600) | `text-emerald-400` | `leading-relaxed` |
| Body text | `text-base` (16px) | `font-normal` (400) | `text-slate-300` | `leading-relaxed` |
| Expiry note | `text-sm` (14px) | `font-normal` (400) | `text-slate-400` | `leading-normal` |
| Link text | `text-sm` (14px) | `font-medium` (500) | `text-emerald-400` | `leading-normal` |

#### CTA Button (Resend)
- **Width:** `w-full`
- **Height:** `h-11` (44px)
- **Background:** `bg-emerald-500` → `hover:bg-emerald-600`
- **Text:** `text-white font-semibold`
- **Border radius:** `rounded-lg` (8px)
- **Disabled state:** `opacity-50 cursor-not-allowed`

#### Secondary Link
- **Text:** "Wrong email? Sign up with a different address"
- **Color:** `text-emerald-400` → `hover:text-emerald-300`
- **Underline:** `hover:underline`
- **Alignment:** Centered below button

### Error/Success Banner States

Banners appear at the top of the card, above the icon.

#### Success Banner (resent=true)
```
┌─────────────────────────────────────┐
│  ✅ Verification email resent.      │
│     Check your inbox.               │
└─────────────────────────────────────┘
```
- **Background:** `bg-emerald-500/10`
- **Border:** `border border-emerald-500/30`
- **Text:** `text-emerald-400`
- **Padding:** `p-4`
- **Border radius:** `rounded-lg`
- **Margin bottom:** `mb-6`

#### Error Banner — Link Expired
```
┌─────────────────────────────────────┐
│  ⚠️ That link has expired. Request  │
│     a new one below.                │
└─────────────────────────────────────┘
```
- **Background:** `bg-amber-500/10`
- **Border:** `border border-amber-500/30`
- **Text:** `text-amber-400`
- **Icon:** AlertTriangle from lucide-react

#### Error Banner — Invalid Token
```
┌─────────────────────────────────────┐
│  ⚠️ That link is invalid. Please    │
│     request a new one.              │
└─────────────────────────────────────┘
```
- Same styling as Link Expired

#### Error Banner — Token Already Used
```
┌─────────────────────────────────────┐
│  ℹ️ This link has already been      │
│     used. Try logging in.           │
└─────────────────────────────────────┘
```
- **Background:** `bg-blue-500/10`
- **Border:** `border border-blue-500/30`
- **Text:** `text-blue-400`
- **Icon:** Info from lucide-react

### Resend Button States

| State | Visual |
|-------|--------|
| Default | `bg-emerald-500 hover:bg-emerald-600` |
| Loading | Spinner + "Sending..." |
| Countdown | `opacity-50 cursor-not-allowed` + "Resend in 42s" |
| Rate Limited | `bg-slate-700` + "Maximum resends reached. Try again in an hour." |

### Mobile Adaptations (375px viewport)

- Card padding reduces to `p-6` (24px)
- Email address breaks to multiple lines if needed
- Full-width button maintained
- Icon size reduces to `w-12 h-12` (48px)

---

## 2. Login Page — Unverified Account Error State

### Purpose
When a user tries to log in with valid credentials but an unverified email, display an error with a resend CTA.

### Error Display

Replace the standard error banner with an enhanced version that includes a resend action.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⚠️ You must verify your email before logging in.   │    │
│  │                                                     │    │
│  │  [Resend verification email →]                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Visual Specifications

#### Error Container
- **Background:** `bg-amber-500/10`
- **Border:** `border border-amber-500/30`
- **Padding:** `p-4`
- **Border radius:** `rounded-lg`
- **Margin bottom:** `mb-4`

#### Error Text
- **Color:** `text-amber-400`
- **Font size:** `text-sm` (14px)
- **Icon:** AlertTriangle `w-4 h-4 mr-2`

#### Resend Link Button
- **Display:** Inline-flex with icon
- **Color:** `text-emerald-400` → `hover:text-emerald-300`
- **Font weight:** `font-medium`
- **Margin top:** `mt-2`
- **Icon:** ArrowRight `w-4 h-4 ml-1`

#### Loading State
```
┌─────────────────────────────────────────────────────────────┐
│  ⏳ Sending verification email...                           │
└─────────────────────────────────────────────────────────────┘
```
- Spinner icon (Loader2 with animate-spin)

#### Success State (after resend)
```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Verification email sent. Check your inbox.              │
└─────────────────────────────────────────────────────────────┘
```
- Switch to `bg-emerald-500/10` / `border-emerald-500/30` / `text-emerald-400`

---

## 3. Email Template Design

### Subject Line
> Confirm your LeadFlow email address

### From Address
> LeadFlow AI <noreply@leadflow.ai>

### Email Body (HTML)

#### Layout Structure

```
┌─────────────────────────────────────────┐
│           [LeadFlow Logo]               │
│                                         │
│  Hi {first_name},                       │
│                                         │
│  You're almost ready to start using     │
│  LeadFlow AI.                           │
│                                         │
│  Click the button below to confirm      │
│  your email address and activate        │
│  your account.                          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    Confirm my email address     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Or copy and paste this link:           │
│  https://leadflow.ai/api/auth/verify    │
│  -email?token=xxx                       │
│                                         │
│  ─────────────────────────────────────  │
│  This link expires in 24 hours.         │
│                                         │
│  If you didn't create a LeadFlow        │
│  account, you can safely ignore         │
│  this email.                            │
│                                         │
│  — The LeadFlow Team                    │
│                                         │
│  [Twitter] [LinkedIn] [Support]         │
└─────────────────────────────────────────┘
```

#### Visual Specifications

**Container**
- Max width: 600px
- Background: #ffffff
- Border-radius: 8px
- Padding: 48px 32px
- Font family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

**Logo**
- Centered at top
- Size: 40px height
- Format: SVG or PNG with transparent background

**Typography**

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Greeting | 18px | 600 | #1f2937 |
| Body | 16px | 400 | #4b5563 |
| Button text | 16px | 600 | #ffffff |
| Footer | 14px | 400 | #6b7280 |
| Link (fallback) | 14px | 400 | #10b981 |

**CTA Button**
- Background: #10b981 (emerald-500)
- Text: #ffffff
- Padding: 14px 32px
- Border-radius: 8px
- Hover state (for email clients that support it): #059669

**Fallback Link**
- Color: #10b981
- Word-break: break-all
- Font size: 14px

**Divider**
- Border-top: 1px solid #e5e7eb
- Margin: 24px 0

**Footer**
- Text align: center
- Color: #6b7280
- Font size: 14px

**Social Links**
- Display: inline-block
- Margin: 0 8px
- Color: #9ca3af

### Plain Text Fallback

```
Hi {first_name},

You're almost ready to start using LeadFlow AI.

Confirm your email address:
https://leadflow.ai/api/auth/verify-email?token={token}

This link expires in 24 hours.

If you didn't create a LeadFlow account, you can safely ignore this email.

— The LeadFlow Team
```

---

## 4. Component Specifications

### CheckInboxPage Component Structure

```tsx
// app/check-your-inbox/page.tsx
interface CheckInboxPageProps {
  searchParams: {
    email?: string
    error?: 'link_expired' | 'invalid_token' | 'token_already_used'
    resent?: string
  }
}
```

### ResendVerificationButton Component

```tsx
// components/resend-verification-button.tsx
interface ResendVerificationButtonProps {
  email: string
  onResent?: () => void
  onError?: (error: string) => void
}
```

States:
- `idle`: Default state, clickable
- `loading`: API call in progress
- `countdown`: 60-second cooldown with timer
- `rateLimited`: Max 3 resends reached, show retry time

### LoginErrorBanner Component

```tsx
// components/login-error-banner.tsx
interface LoginErrorBannerProps {
  type: 'unverified' | 'invalid_credentials' | 'generic'
  email?: string
  onResend?: () => void
}
```

---

## 5. Animation Specifications

### Page Load
- Card fades in with slight upward translate
- Duration: 300ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

### Banner Appear/Disappear
- Fade in/out
- Duration: 200ms
- Height animates smoothly

### Button Loading State
- Spinner rotates (360deg)
- Duration: 1s
- Timing: linear
- Iteration: infinite

### Countdown Timer
- Numbers update every second
- No animation on the number itself (clean, immediate update)

---

## 6. Accessibility Requirements

### Focus States
- All interactive elements have visible focus rings
- Focus ring: `ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900`

### ARIA Labels
- Resend button: `aria-label="Resend verification email"`
- Countdown: `aria-live="polite"` with timer announcement
- Error banners: `role="alert"`
- Success banners: `role="status"`

### Keyboard Navigation
- Tab order follows visual order
- Enter/Space activates buttons
- Escape closes any modals (if applicable)

### Screen Reader Considerations
- Email address is read clearly (spell out if needed)
- Countdown announces remaining time every 10 seconds
- Success/error states announced immediately

---

## 7. Responsive Breakpoints

| Breakpoint | Card Width | Padding | Icon Size |
|------------|------------|---------|-----------|
| < 640px (sm) | 100% - 32px | p-6 | w-12 h-12 |
| ≥ 640px (sm+) | 420px max | p-8 | w-16 h-16 |

---

## 8. Asset Checklist

- [ ] LeadFlow logo (SVG) for email header
- [ ] Mail icon (lucide-react: `Mail`)
- [ ] AlertTriangle icon (lucide-react: `AlertTriangle`)
- [ ] Check icon (lucide-react: `Check`)
- [ ] Info icon (lucide-react: `Info`)
- [ ] Loader2 icon (lucide-react: `Loader2`)
- [ ] ArrowRight icon (lucide-react: `ArrowRight`)

---

## 9. Design Tokens Reference

### Colors
```
--emerald-400: #34d399
--emerald-500: #10b981
--emerald-600: #059669
--slate-300: #cbd5e1
--slate-400: #94a3b8
--slate-700: #334155
--slate-800: #1e293b
--slate-900: #0f172a
--amber-400: #fbbf24
--blue-400: #60a5fa
--red-400: #f87171
```

### Typography
```
Font family: var(--font-geist-sans), system-ui, sans-serif
Headline: 24px / 700 / -0.02em
Body: 16px / 400 / 0
Small: 14px / 400 / 0
```

### Spacing
```
Card padding: 32px (24px mobile)
Section gap: 24px
Element gap: 16px
Button height: 44px
```

---

## Summary for Developer

1. **Create `/check-your-inbox` page** — Centered card with email icon, user's email in emerald, resend button with countdown state, error/success banners
2. **Update `/login` page** — Enhanced error banner for EMAIL_NOT_VERIFIED with inline resend CTA
3. **Create email template** — Clean HTML email with emerald CTA button, 24hr expiry notice, plain text fallback

All designs use existing Tailwind classes and shadcn/ui components where applicable. No new colors or typography needed.
