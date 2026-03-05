# Authentication Flow — Wireframes

**Use Case:** UC-AUTH-FIX-001  
**Date:** March 5, 2026  
**Status:** Design Complete  

---

## Overview

This document provides detailed wireframes for the LeadFlow AI authentication flow components. Wireframes are presented in ASCII art and detailed component descriptions.

---

## 1. Landing Page (Existing - Reference)

```
┌─────────────────────────────────────────────────────────────┐
│                     HEADER                                  │
│  LeadFlow AI                     [Get Started]  [Sign In]  │
└─────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │                     │
                    │    HERO SECTION     │
                    │                     │
                    │  AI-Powered Lead    │
                    │     Response        │
                    │                     │
                    │  Instantly qualify  │
                    │   and respond...    │
                    │                     │
                    │                     │
                    │ [Get Started Free]  │
                    │     [Sign In]       │
                    │                     │
                    └─────────────────────┘
```

**Status:** ✅ Exists and complete

---

## 2. Login Page (Existing - Reference)

```
┌─────────────────────────────────────────────────────────────┐
│                         FULL SCREEN                          │
│                    (Gradient Background)                     │
│                                                              │
│                      ┌─────────────┐                        │
│                      │   ▶ Logo    │                        │
│                      │ LeadFlow AI │                        │
│                      └─────────────┘                        │
│                                                              │
│              ┌───────────────────────────────┐              │
│              │         CARD                  │              │
│              │                               │              │
│              │        Sign In                │              │
│              │  Enter your email and pass    │              │
│              │                               │              │
│              │  Email Address                │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │ 📧 you@example.com      │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │  Password                     │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │ 🔒 ••••••••          👁│ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │  ☐ Remember me  Forgot pass? │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │   Sign In           →   │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │    ─────── Or ───────        │              │
│              │                               │              │
│              │  Don't have an account?       │              │
│              │  Start your free trial        │              │
│              │                               │              │
│              └───────────────────────────────┘              │
│                                                              │
│           By signing in, you agree to our...                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Status:** ✅ Exists and complete

---

## 3. Forgot Password Page (NEW - Needs Implementation)

### 3a. Request Reset Email

```
┌─────────────────────────────────────────────────────────────┐
│                         FULL SCREEN                          │
│                    (Gradient Background)                     │
│                                                              │
│                      ┌─────────────┐                        │
│                      │   ▶ Logo    │                        │
│                      │ LeadFlow AI │                        │
│                      └─────────────┘                        │
│                                                              │
│              ┌───────────────────────────────┐              │
│              │         CARD                  │              │
│              │                               │              │
│              │    Forgot Password?           │              │
│              │  Enter your email and we'll   │              │
│              │  send you a reset link        │              │
│              │                               │              │
│              │  Email Address                │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │ 📧 you@example.com      │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │ Send Reset Link      →  │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │  ← Back to Sign In      │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              └───────────────────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- **Header:** Logo + "LeadFlow AI"
- **Card Title:** "Forgot Password?" (2xl, bold, white)
- **Card Description:** "Enter your email and we'll send you a reset link" (slate-400)
- **Email Input:** 
  - Label: "Email Address"
  - Icon: Mail (left)
  - Placeholder: "you@example.com"
  - Validation: Email format
- **Submit Button:**
  - Text: "Send Reset Link"
  - Icon: Arrow right
  - Style: Full-width, emerald gradient
  - States: Default, loading ("Sending..."), success
- **Back Link:**
  - Text: "← Back to Sign In"
  - Style: Outline button
  - Links to: `/login`

**API Endpoint:** `POST /api/auth/forgot-password`
```json
{
  "email": "user@example.com"
}
```

---

### 3b. Check Your Email (Success State)

```
┌─────────────────────────────────────────────────────────────┐
│                         FULL SCREEN                          │
│                    (Gradient Background)                     │
│                                                              │
│                      ┌─────────────┐                        │
│                      │   ▶ Logo    │                        │
│                      │ LeadFlow AI │                        │
│                      └─────────────┘                        │
│                                                              │
│              ┌───────────────────────────────┐              │
│              │         CARD                  │              │
│              │                               │              │
│              │         📧                    │              │
│              │                               │              │
│              │    Check Your Email           │              │
│              │                               │              │
│              │  We've sent a password reset  │              │
│              │  link to your@example.com     │              │
│              │                               │              │
│              │  Click the link in the email  │              │
│              │  to reset your password.      │              │
│              │                               │              │
│              │  Didn't receive the email?    │              │
│              │  Check your spam folder or    │              │
│              │  [Resend Link]                │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │  ← Back to Sign In      │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              └───────────────────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- **Icon:** Email icon (large, emerald-400)
- **Title:** "Check Your Email" (2xl, bold, white)
- **Description:** Personalized message with user's email
- **Instructions:** Clear next steps
- **Resend Link:** Text link (emerald-400)
  - Cooldown: 60 seconds
  - Show countdown: "Resend in 45s"
- **Back Button:** Outline style

---

## 4. Reset Password Page (NEW - Needs Implementation)

```
┌─────────────────────────────────────────────────────────────┐
│                         FULL SCREEN                          │
│                    (Gradient Background)                     │
│                                                              │
│                      ┌─────────────┐                        │
│                      │   ▶ Logo    │                        │
│                      │ LeadFlow AI │                        │
│                      └─────────────┘                        │
│                                                              │
│              ┌───────────────────────────────┐              │
│              │         CARD                  │              │
│              │                               │              │
│              │    Reset Your Password        │              │
│              │  Create a new, strong password│              │
│              │                               │              │
│              │  New Password                 │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │ 🔒 ••••••••          👁│ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │  ━━━━━━━━━━  Weak           │              │
│              │                               │              │
│              │  Requirements:                │              │
│              │  ☐ At least 8 characters      │              │
│              │  ☐ One uppercase letter       │              │
│              │  ☐ One lowercase letter       │              │
│              │  ☐ One number                 │              │
│              │                               │              │
│              │  Confirm Password             │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │ 🔒 ••••••••          👁│ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │ Reset Password       →  │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              └───────────────────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- **New Password Input:**
  - Label: "New Password"
  - Icon: Lock (left)
  - Toggle: Eye/EyeOff (right)
  - Type: password (toggleable)
  - Validation: Real-time

- **Password Strength Indicator:**
  - Visual: Progress bar
  - Colors: Red (weak) → Yellow (medium) → Green (strong)
  - Levels: Weak, Medium, Strong, Very Strong

- **Requirements Checklist:**
  - Checkboxes update in real-time
  - ✅ Green when requirement met
  - ☐ Gray when not met
  - List:
    - At least 8 characters
    - One uppercase letter
    - One lowercase letter
    - One number

- **Confirm Password Input:**
  - Label: "Confirm Password"
  - Icon: Lock (left)
  - Toggle: Eye/EyeOff (right)
  - Validation: Must match new password
  - Error: "Passwords don't match" (red-400)

- **Submit Button:**
  - Text: "Reset Password"
  - Icon: Arrow right
  - Style: Full-width, emerald gradient
  - States: Default, loading ("Resetting..."), success
  - Disabled: Until all requirements met

**URL:** `/reset-password?token=xyz123`

**API Endpoint:** `POST /api/auth/reset-password`
```json
{
  "token": "xyz123",
  "newPassword": "SecurePass123"
}
```

---

### 4b. Password Reset Success

```
┌─────────────────────────────────────────────────────────────┐
│                         FULL SCREEN                          │
│                    (Gradient Background)                     │
│                                                              │
│                      ┌─────────────┐                        │
│                      │   ▶ Logo    │                        │
│                      │ LeadFlow AI │                        │
│                      └─────────────┘                        │
│                                                              │
│              ┌───────────────────────────────┐              │
│              │         CARD                  │              │
│              │                               │              │
│              │         ✅                    │              │
│              │                               │              │
│              │  Password Reset Successful!   │              │
│              │                               │              │
│              │  Your password has been       │              │
│              │  successfully reset.          │              │
│              │                               │              │
│              │  You can now sign in with     │              │
│              │  your new password.           │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │   Go to Sign In      →  │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │  (Redirecting in 3 seconds...)│              │
│              │                               │              │
│              └───────────────────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- **Icon:** Checkmark (large, green-400)
- **Title:** "Password Reset Successful!" (2xl, bold, white)
- **Description:** Confirmation message
- **CTA Button:** "Go to Sign In" → `/login`
- **Auto-redirect:** 3 second countdown
- **Redirect:** Automatic redirect to login page

---

## 5. Signup Page - Add Password Step (MODIFICATION NEEDED)

### Current Flow:
```
Step 1: Select Plan
Step 2: Enter Details (email, name, phone)
Step 3: Payment (Stripe)
```

### Improved Flow:
```
Step 1: Select Plan
Step 2: Enter Details (email, name, phone, PASSWORD)
Step 3: Payment (Stripe)
```

### Step 2 with Password (Modified)

```
┌─────────────────────────────────────────────────────────────┐
│                         HEADER                               │
│  LeadFlow AI                                                 │
└─────────────────────────────────────────────────────────────┘

         ┌───┐  ────  ┌───┐  ────  ┌───┐
         │ ✓ │        │ 2 │        │ 3 │
         └───┘        └───┘        └───┘
      Select Plan  Your Details  Payment

┌─────────────────────────────────────────────────────────────┐
│                         CARD                                 │
│                                                              │
│              Create Your Account                             │
│     Selected plan: Pro ($149/month)                         │
│                                                              │
│  Email Address *                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ you@example.com                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Full Name *                                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ John Smith                                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Phone Number *                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ +1 (555) 123-4567                                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Password *                                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │ ••••••••                                         👁 │    │
│  └────────────────────────────────────────────────────┘    │
│  ━━━━━━━━━━  Medium                                        │
│                                                              │
│  Confirm Password *                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ ••••••••                                         👁 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Requirements: ✓ 8+ chars ✓ Uppercase ✓ Lowercase ☐ Number│
│                                                              │
│                                                              │
│  ┌──────────────┐          ┌──────────────┐               │
│  │     Back     │          │ Continue  → │               │
│  └──────────────┘          └──────────────┘               │
│                                                              │
│  ──────────────────────────────────────────────────────    │
│  By continuing, you agree to our Terms of Service...        │
│  Your 14-day free trial starts today...                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**New Components to Add:**

1. **Password Input** (after phone number)
   - Label: "Password *"
   - Icon: Lock (left)
   - Toggle: Eye/EyeOff (right)
   - Strength indicator: Below input
   - Validation: Real-time

2. **Confirm Password Input**
   - Label: "Confirm Password *"
   - Icon: Lock (left)
   - Toggle: Eye/EyeOff (right)
   - Validation: Must match password
   - Error message if mismatch

3. **Requirements Indicator**
   - Compact one-line format
   - Checkmarks for met requirements
   - Example: "✓ 8+ chars ✓ Uppercase ✓ Lowercase ☐ Number"

---

## 6. Email Verification (NEW - Needs Implementation)

### 6a. Verification Email Sent

```
┌─────────────────────────────────────────────────────────────┐
│                         FULL SCREEN                          │
│                    (Gradient Background)                     │
│                                                              │
│                      ┌─────────────┐                        │
│                      │   ▶ Logo    │                        │
│                      │ LeadFlow AI │                        │
│                      └─────────────┘                        │
│                                                              │
│              ┌───────────────────────────────┐              │
│              │         CARD                  │              │
│              │                               │              │
│              │         ✉️                    │              │
│              │                               │              │
│              │  Verify Your Email            │              │
│              │                               │              │
│              │  We've sent a verification    │              │
│              │  email to your@example.com    │              │
│              │                               │              │
│              │  Please check your inbox and  │              │
│              │  click the verification link  │              │
│              │  to activate your account.    │              │
│              │                               │              │
│              │  Can't find the email?        │              │
│              │  • Check your spam folder     │              │
│              │  • [Resend Verification]      │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │ Continue to Dashboard → │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              └───────────────────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Shown immediately after signup success
- User can proceed to dashboard but features limited
- Banner in dashboard: "Please verify your email"
- Resend link has 60-second cooldown

---

### 6b. Email Verification Success

```
┌─────────────────────────────────────────────────────────────┐
│                         FULL SCREEN                          │
│                    (Gradient Background)                     │
│                                                              │
│                      ┌─────────────┐                        │
│                      │   ▶ Logo    │                        │
│                      │ LeadFlow AI │                        │
│                      └─────────────┘                        │
│                                                              │
│              ┌───────────────────────────────┐              │
│              │         CARD                  │              │
│              │                               │              │
│              │         🎉                    │              │
│              │                               │              │
│              │  Email Verified!              │              │
│              │                               │              │
│              │  Your email has been          │              │
│              │  successfully verified.       │              │
│              │                               │              │
│              │  Welcome to LeadFlow AI!      │              │
│              │  You now have full access     │              │
│              │  to all features.             │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │   Go to Dashboard    →  │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │  (Redirecting in 3 seconds...)│              │
│              │                               │              │
│              └───────────────────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**URL:** `/verify-email?token=abc123`

**API Endpoint:** `POST /api/auth/verify-email`
```json
{
  "token": "abc123"
}
```

**Behavior:**
- Auto-redirect to dashboard after 3 seconds
- Updates user record: `email_verified = true`
- Removes limitation banner from dashboard

---

### 6c. Email Verification Error

```
┌─────────────────────────────────────────────────────────────┐
│                         FULL SCREEN                          │
│                    (Gradient Background)                     │
│                                                              │
│                      ┌─────────────┐                        │
│                      │   ▶ Logo    │                        │
│                      │ LeadFlow AI │                        │
│                      └─────────────┘                        │
│                                                              │
│              ┌───────────────────────────────┐              │
│              │         CARD                  │              │
│              │                               │              │
│              │         ⚠️                    │              │
│              │                               │              │
│              │  Verification Link Invalid    │              │
│              │                               │              │
│              │  This verification link has   │              │
│              │  expired or is invalid.       │              │
│              │                               │              │
│              │  Please request a new         │              │
│              │  verification email.          │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │ Resend Verification  →  │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              │  ┌─────────────────────────┐ │              │
│              │  │    Go to Dashboard      │ │              │
│              │  └─────────────────────────┘ │              │
│              │                               │              │
│              └───────────────────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Error Cases:**
- Token expired (>24 hours old)
- Token invalid (not found in database)
- Token already used
- User already verified

---

## 7. Dashboard - Unverified Email Banner

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD HEADER                         │
│  LeadFlow AI              Leads  Analytics  Settings  [👤] │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    ⚠️  BANNER                                │
│                                                              │
│  Please verify your email address to unlock all features.   │
│  We sent a link to your@example.com  [Resend]  [Dismiss]   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                     [Dashboard Content]
```

**Banner Styling:**
```css
Background: yellow-500/10
Border: yellow-500/50
Text: yellow-200
Icon: Warning triangle (yellow-400)
```

**Actions:**
- **Resend:** Trigger new verification email
- **Dismiss:** Hide banner (temporary, shows again on reload)
- **Auto-hide:** After verification complete

---

## 8. Logout Flow

```
Dashboard Header:
┌─────────────────────────────────────────────────────────────┐
│  LeadFlow AI              Leads  Analytics  Settings  [👤]  │
│                                                      ▼       │
│                                      ┌──────────────────┐   │
│                                      │ Profile          │   │
│                                      │ Settings         │   │
│                                      │ ─────────────    │   │
│                                      │ 🚪 Logout        │   │
│                                      └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Logout Confirmation Modal (Optional):**

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│               ┌───────────────────────────┐                 │
│               │       MODAL               │                 │
│               │                           │                 │
│               │   Confirm Logout          │                 │
│               │                           │                 │
│               │  Are you sure you want    │                 │
│               │  to sign out?             │                 │
│               │                           │                 │
│               │  ┌─────────┐  ┌────────┐ │                 │
│               │  │ Cancel  │  │ Logout │ │                 │
│               │  └─────────┘  └────────┘ │                 │
│               │                           │                 │
│               └───────────────────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoint:** `POST /api/auth/logout`
```json
{
  "token": "current_session_token"
}
```

**Behavior:**
- Clear localStorage/sessionStorage
- Invalidate server session
- Redirect to landing page (`/`)
- Show success toast: "You've been signed out"

---

## Component Specifications

### Password Strength Indicator

```
━━━━━━━━━━  Weak      (Red)
━━━━━━━━━━  Medium    (Yellow)
━━━━━━━━━━  Strong    (Green)
━━━━━━━━━━  Very Strong (Bright Green)
```

**Algorithm:**
- Length: +1 point per character after 8
- Complexity: +1 for uppercase, +1 for lowercase, +1 for number, +1 for special
- Total: 0-2 = Weak, 3-4 = Medium, 5-6 = Strong, 7+ = Very Strong

### Requirements Checklist

```
☐ At least 8 characters      (Gray - not met)
✅ One uppercase letter       (Green - met)
☐ One lowercase letter       (Gray - not met)
☐ One number                 (Gray - not met)
```

**Behavior:**
- Updates in real-time as user types
- Smooth color transition on completion
- Slight scale animation when checkbox activates

### Loading States

**Button Loading:**
```
[Normal]     Continue →
[Loading]    ⟳ Processing...
[Success]    ✓ Success!
```

**Page Loading:**
```
         ⟳
    Loading...
```

---

## Responsive Breakpoints

### Mobile (<768px)

- Full-width cards
- Stack form elements vertically
- Larger touch targets (48px minimum)
- Simplified password requirements (icons only)
- Collapse step labels on progress indicator

### Tablet (768px - 1023px)

- Max-width cards (640px)
- Maintain desktop layout
- Adjust padding

### Desktop (≥1024px)

- Max-width cards (640px)
- Full layout with all labels
- Optimal spacing

---

## Animation Specifications

### Transitions

```css
/* Page Transitions */
.fade-in {
  animation: fadeIn 300ms ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Success Checkmark */
.success-check {
  animation: scaleIn 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes scaleIn {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

/* Error Shake */
.error-shake {
  animation: shake 200ms ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

/* Loading Spinner */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## Implementation Priority

### Phase 1 (Critical - Week 1)
1. ✅ Add password field to signup (Step 2)
2. ✅ Password strength indicator
3. ✅ Forgot password page
4. ✅ Reset password page

### Phase 2 (Important - Week 2)
1. ✅ Email verification flow
2. ✅ Verification success/error pages
3. ✅ Dashboard banner for unverified email
4. ✅ Logout functionality

### Phase 3 (Enhancement - Week 3+)
1. Social login buttons (Google, Microsoft)
2. Two-factor authentication
3. Session management dashboard
4. Passwordless login options

---

## Developer Handoff Notes

### Files to Create

```
app/forgot-password/page.tsx
app/reset-password/page.tsx
app/verify-email/page.tsx
components/auth/PasswordStrengthIndicator.tsx
components/auth/PasswordRequirements.tsx
components/auth/EmailVerificationBanner.tsx
```

### Files to Modify

```
app/signup/page.tsx          - Add password fields
app/login/page.tsx           - Update forgot password link
app/dashboard/layout.tsx     - Add verification banner
components/ui/UserMenu.tsx   - Add logout option
```

### API Endpoints to Implement

```
POST /api/auth/forgot-password     - Send reset email
POST /api/auth/reset-password      - Update password
POST /api/auth/verify-email        - Verify token
POST /api/auth/resend-verification - Resend email
POST /api/auth/logout              - Invalidate session
GET  /api/auth/session             - Check auth status
```

---

## Accessibility Checklist

- [ ] All forms have proper labels
- [ ] Error messages are announced to screen readers
- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus indicators are visible
- [ ] Color is not the only way to convey information
- [ ] Touch targets are minimum 44x44px
- [ ] Form validation provides clear feedback
- [ ] Success/error states are communicated clearly

---

**Status:** Design specifications and wireframes complete. Ready for development implementation.
