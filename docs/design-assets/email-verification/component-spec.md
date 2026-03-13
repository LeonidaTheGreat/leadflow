# Component Specification: Email Verification UI

**Feature:** Email Verification — Confirm Inbox Before Login  
**Task ID:** 7f6ecf1e-5ce6-47fb-be2a-9fd4aab9df20  

---

## Component Inventory

### 1. CheckInboxPage (`app/check-your-inbox/page.tsx`)

**Purpose:** Main page displayed after signup to prompt email verification.

**Props Interface:**
```typescript
interface CheckInboxPageProps {
  searchParams: {
    email?: string;                    // User's email (from signup)
    error?: 'link_expired' | 'invalid_token' | 'token_already_used';
    resent?: 'true';                   // Flag to show success banner
  }
}
```

**Page Structure:**
```
<CheckInboxPage>
  ├── <Background />                  // Gradient bg with blur decorations
  ├── <Card>
  │   ├── <ErrorBanner />             // Conditional: based on searchParams.error
  │   ├── <SuccessBanner />           // Conditional: based on searchParams.resent
  │   ├── <MailIcon />                // Large centered icon
  │   ├── <Headline />                // "Check your inbox"
  │   ├── <EmailDisplay />            // User's email in emerald
  │   ├── <Instructions />            // Helper text
  │   ├── <Divider />
  │   ├── <ExpiryNote />              // "24 hours" text
  │   └── <ResendSection>
  │       ├── <ResendButton />        // With countdown/rate-limit states
  │       └── <WrongEmailLink />      // Link back to signup
```

**Key Behaviors:**
- Reads `email` from query params (passed from signup)
- Displays appropriate banner based on `error` param
- Resend button has 60-second cooldown after click
- Rate limit: max 3 resends per hour

---

### 2. ResendVerificationButton (`components/resend-verification-button.tsx`)

**Purpose:** Button with multiple states for resending verification emails.

**Props Interface:**
```typescript
interface ResendVerificationButtonProps {
  email: string;
  onResent?: () => void;              // Callback on successful resend
  onError?: (error: string) => void;  // Callback on error
  className?: string;
}

// Internal state
type ButtonState = 
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'countdown'; secondsRemaining: number }
  | { type: 'rateLimited'; retryAfter: Date };
```

**State Machine:**
```
idle ──[click]──> loading ──[success]──> countdown (60s) ──[expire]──> idle
                   │
                   └─[rate limit]──> rateLimited ──[expire]──> idle
```

**Visual States:**

| State | Visual | Text |
|-------|--------|------|
| `idle` | `bg-emerald-500 hover:bg-emerald-600` | "Resend email" |
| `loading` | `opacity-70` + spinner | "Sending..." |
| `countdown` | `opacity-50 cursor-not-allowed` | "Resend in {n}s" |
| `rateLimited` | `bg-slate-700` | "Maximum resends reached. Try again in {time}." |

**API Call:**
```typescript
POST /api/auth/resend-verification
Body: { email: string }
```

**Error Handling:**
- 404: "Account not found"
- 429: Enter `rateLimited` state with retry time
- 500: "Something went wrong. Please try again."

---

### 3. ErrorBanner (`components/error-banner.tsx`)

**Purpose:** Reusable error banner component for check-your-inbox page.

**Props Interface:**
```typescript
type ErrorType = 'link_expired' | 'invalid_token' | 'token_already_used';

interface ErrorBannerProps {
  type: ErrorType;
  className?: string;
}

const ERROR_CONFIG: Record<ErrorType, {
  icon: LucideIcon;
  title: string;
  message: string;
  variant: 'amber' | 'blue';
}> = {
  link_expired: {
    icon: AlertTriangle,
    title: 'Link expired',
    message: 'That link has expired. Request a new one below.',
    variant: 'amber'
  },
  invalid_token: {
    icon: AlertTriangle,
    title: 'Invalid link',
    message: 'That link is invalid. Please request a new one.',
    variant: 'amber'
  },
  token_already_used: {
    icon: Info,
    title: 'Already used',
    message: 'This link has already been used. Try logging in.',
    variant: 'blue'
  }
};
```

**Styling by Variant:**

| Variant | Background | Border | Text | Icon |
|---------|------------|--------|------|------|
| `amber` | `bg-amber-500/10` | `border-amber-500/30` | `text-amber-400` | `AlertTriangle` |
| `blue` | `bg-blue-500/10` | `border-blue-500/30` | `text-blue-400` | `Info` |

---

### 4. SuccessBanner (`components/success-banner.tsx`)

**Purpose:** Success notification banner.

**Props Interface:**
```typescript
interface SuccessBannerProps {
  message: string;
  className?: string;
}
```

**Styling:**
- Background: `bg-emerald-500/10`
- Border: `border-emerald-500/30`
- Text: `text-emerald-400`
- Icon: `Check` from lucide-react

---

### 5. LoginErrorBanner (`components/login-error-banner.tsx`)

**Purpose:** Enhanced error banner for login page with resend CTA.

**Props Interface:**
```typescript
type LoginErrorType = 'unverified' | 'invalid_credentials' | 'generic';

interface LoginErrorBannerProps {
  type: LoginErrorType;
  email?: string;                     // For resending verification
  onResend?: () => Promise<void>;     // Async resend handler
  className?: string;
}

// Internal state for resend action
type ResendState = 
  | { type: 'idle' }
  | { type: 'sending' }
  | { type: 'sent' }
  | { type: 'error'; message: string };
```

**Visual States:**

| Type | Appearance | Actions |
|------|------------|---------|
| `unverified` | Amber banner + resend link | "Resend verification email →" |
| `invalid_credentials` | Red banner, no action | Static error |
| `generic` | Red banner, no action | Static error |

**Resend Flow:**
```
idle ──[click resend]──> sending ──[success]──> sent
                            │
                            └─[error]──> error ──[retry]──> sending
```

**Styling:**
- Container: `bg-amber-500/10 border border-amber-500/30 rounded-lg p-4`
- Error text: `text-amber-400 text-sm`
- Resend link: `text-emerald-400 hover:text-emerald-300 text-sm font-medium inline-flex items-center gap-1 mt-2`

---

### 6. VerificationEmailTemplate

**Purpose:** HTML email template for verification emails.

**Template Variables:**
```typescript
interface EmailTemplateData {
  firstName: string;
  verificationUrl: string;
  expiresIn: string;                  // e.g., "24 hours"
  supportEmail?: string;
}
```

**HTML Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your LeadFlow email address</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:48px 32px 32px;">
              <!-- LeadFlow Logo -->
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:0 32px 48px;">
              <!-- Greeting, body, CTA, fallback link -->
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e5e7eb;">
              <!-- Social links, copyright -->
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Plain Text Version:**
```
Hi {firstName},

You're almost ready to start using LeadFlow AI.

Confirm your email address:
{verificationUrl}

This link expires in {expiresIn}.

If you didn't create a LeadFlow account, you can safely ignore this email.

— The LeadFlow Team
```

---

## File Structure

```
app/
├── check-your-inbox/
│   └── page.tsx                      # Main check-your-inbox page
├── login/
│   └── page.tsx                      # Update existing login page
components/
├── resend-verification-button.tsx    # Resend button with states
├── error-banner.tsx                  # Reusable error banner
├── success-banner.tsx                # Reusable success banner
├── login-error-banner.tsx            # Login-specific error with resend
lib/
├── email/
│   └── templates/
│       └── verification-email.tsx    # Email template component
```

---

## Dependencies

### Required Icons (lucide-react)
```typescript
import { 
  Mail, 
  AlertTriangle, 
  Info, 
  Check, 
  Loader2, 
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
```

### Required UI Components (shadcn/ui)
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
```

### Required Hooks
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
```

---

## Responsive Breakpoints

| Breakpoint | Card Padding | Icon Size | Email Font Size |
|------------|--------------|-----------|-----------------|
| < 640px | `p-6` (24px) | `w-12 h-12` | `text-base` |
| ≥ 640px | `p-8` (32px) | `w-16 h-16` | `text-lg` |

---

## Accessibility Requirements

### ARIA Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Resend button | `aria-label` | "Resend verification email" |
| Countdown timer | `aria-live` | "polite" |
| Error banner | `role` | "alert" |
| Success banner | `role` | "status" |
| Email display | `aria-label` | "Verification email sent to {email}" |

### Keyboard Navigation
- Tab: Move between interactive elements
- Enter/Space: Activate buttons
- All buttons must be focusable
- Focus visible state: `ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900`

### Screen Reader Considerations
- Email address should be read clearly
- Countdown announces every 10 seconds
- Success/error states announced immediately via live regions

---

## Animation Specifications

### Page Load
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* Duration: 300ms, Easing: cubic-bezier(0.4, 0, 0.2, 1) */
```

### Banner Transitions
```css
/* Fade in/out with height animation */
transition: opacity 200ms ease, height 200ms ease;
```

### Button Loading State
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
/* Duration: 1s, Timing: linear, Iteration: infinite */
```

---

## API Integration

### Resend Verification Endpoint
```typescript
POST /api/auth/resend-verification
Content-Type: application/json

Request:
{
  "email": "sarah@example.com"
}

Success Response (200):
{
  "message": "Verification email sent."
}

Error Responses:
404: { "error": "AGENT_NOT_FOUND" }
429: { "error": "RATE_LIMIT", "message": "Max 3 resend attempts per hour.", "retryAfter": "2026-01-13T15:00:00Z" }
500: { "error": "INTERNAL_ERROR" }
```

---

## Testing Checklist

### Visual Tests
- [ ] Renders correctly at 375px width (mobile)
- [ ] Renders correctly at 1440px width (desktop)
- [ ] All error banner variants display correctly
- [ ] Success banner displays correctly
- [ ] Countdown timer updates every second
- [ ] Rate limited state displays correctly

### Interaction Tests
- [ ] Resend button triggers API call
- [ ] Countdown starts after successful resend
- [ ] Button disabled during countdown
- [ ] Rate limit error handled correctly
- [ ] Wrong email link navigates to signup

### Accessibility Tests
- [ ] All interactive elements keyboard accessible
- [ ] Focus states visible
- [ ] Screen reader announces states correctly
- [ ] Color contrast meets WCAG AA

### Email Tests
- [ ] Renders correctly in Gmail
- [ ] Renders correctly in Apple Mail
- [ ] Renders correctly in Outlook
- [ ] Plain text version readable
- [ ] CTA button clickable
- [ ] Fallback link works
