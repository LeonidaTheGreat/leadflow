# Authentication Flow — Design Specifications

**Use Case:** UC-AUTH-FIX-001  
**Date:** March 5, 2026  
**Status:** Design Complete  
**Agent:** Design

---

## Executive Summary

This document provides comprehensive design specifications for the LeadFlow AI authentication flow, covering signup, login, and the complete user journey from landing page to authenticated dashboard. The design leverages Supabase Auth and follows industry best practices for conversion optimization and security.

---

## Current Implementation Status

### ✅ Existing Components (Review)

1. **Landing Page** (`/app/page.tsx`)
   - CTAs visible in header and hero section
   - "Get Started" button → `/onboarding`
   - "Sign In" button → `/login`
   - Status: ✅ Complete

2. **Login Page** (`/app/login/page.tsx`)
   - Email/password authentication
   - Remember me checkbox
   - Forgot password placeholder
   - Link to signup
   - Status: ✅ Complete

3. **Signup Page** (`/app/signup/page.tsx`)
   - Multi-step flow (plan selection → details → payment)
   - Integration with Stripe Checkout
   - Status: ✅ Complete

4. **Onboarding Flow** (`/app/onboarding/`)
   - Multi-step wizard for setup
   - Status: ✅ Exists (separate from signup)

---

## Design Requirements & Improvements

### 1. Authentication Flow Architecture

```
ENTRY POINTS:
┌─────────────────────────────────────────┐
│       Landing Page (/)                   │
│                                          │
│  [Get Started]  →  Onboarding/Signup    │
│  [Sign In]      →  Login                │
└─────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│   Login      │        │   Signup     │
│              │  ←──→  │              │
│ Email/Pass   │ links  │ Multi-step   │
│ Remember Me  │        │ Plan Select  │
│ Forgot Pass  │        │ Stripe       │
└──────────────┘        └──────────────┘
        │                       │
        └───────────┬───────────┘
                    ↓
        ┌───────────────────────┐
        │  Protected Dashboard   │
        └───────────────────────┘
```

### 2. Landing Page - Auth CTAs

**Current Design:** ✅ Good foundation

**Header Navigation:**
- **Location:** Top right
- **Primary CTA:** "Get Started" (Emerald green, prominent)
- **Secondary CTA:** "Sign In" (Text link, subtle)

**Hero Section:**
- **Location:** Center, below headline
- **Primary CTA:** "Get Started Free" (Large button)
- **Secondary CTA:** "Sign In" (Gray button, less prominent)

**Design Specifications:**
```css
/* Primary CTA - Get Started */
Button {
  background: linear-gradient(to right, #10b981, #059669);
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.5rem;
  color: white;
  hover: brightness(1.1);
}

/* Secondary CTA - Sign In */
Button {
  background: rgb(226, 232, 240); /* slate-200 */
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.5rem;
  color: rgb(15, 23, 42); /* slate-900 */
  hover: brightness(0.95);
}
```

**Improvement Recommendations:**
- ✅ CTAs are visible
- ✅ Visual hierarchy is clear
- ⚠️ Consider A/B testing "Get Started Free" vs "Start Free Trial" vs "Sign Up"
- ⚠️ Add social proof near CTAs (e.g., "Join 100+ agents")

---

### 3. Login Page Design

**Current Status:** ✅ Well-designed, modern

**Layout:**
- Full-screen centered card
- Gradient background (slate-900 → slate-800)
- Logo and branding at top
- Form card with glass morphism effect

**Color Palette:**
```
Background: Gradient from #0f172a (slate-900) to #1e293b (slate-800)
Card: #1e293b/50 (slate-800 with 50% opacity)
Border: #334155 (slate-700)
Primary: #10b981 (emerald-500)
Text: #ffffff (white)
Text Secondary: #94a3b8 (slate-400)
Error: #ef4444 (red-500)
```

**Form Components:**

**Email Input:**
```
Label: "Email Address"
Icon: Mail (left-aligned, slate-500)
Placeholder: "you@example.com"
Background: slate-900
Border: slate-600
Text: white
Height: 44px (minimum touch target)
```

**Password Input:**
```
Label: "Password"
Icon: Lock (left-aligned, slate-500)
Placeholder: "••••••••"
Toggle: Eye/EyeOff icon (right-aligned)
Background: slate-900
Border: slate-600
Text: white
Type: password (toggleable to text)
```

**Remember Me Checkbox:**
```
Position: Below password, left-aligned
Style: Custom checkbox with emerald-500 active state
Label: "Remember me" (slate-400)
```

**Forgot Password Link:**
```
Position: Below password, right-aligned
Style: Text link, emerald-400
Hover: emerald-300
Action: Alert placeholder (TODO: implement reset flow)
```

**Submit Button:**
```
Text: "Sign In" with arrow icon
Width: 100%
Height: 48px
Background: Gradient emerald-500 → emerald-600
Hover: emerald-600 → emerald-700
Loading State: Spinner icon + "Signing in..."
Disabled: Opacity 50%
```

**Error Display:**
```
Background: red-500/10
Border: red-500/50
Text: red-400
Padding: 12px 16px
Border Radius: 8px
Position: Above submit button
```

**Sign Up Link:**
```
Position: Below divider
Text: "Don't have an account? Start your free trial"
Link Color: emerald-400
Hover: emerald-300
```

**Improvements Needed:**
1. ⚠️ **Implement Forgot Password Flow**
   - Currently shows alert() placeholder
   - Need password reset page
   - Email with magic link
   - Password reset form

2. ✅ **Social Login (Optional Future Enhancement)**
   - Google OAuth
   - Microsoft OAuth
   - Position: Below divider, above sign-up link

---

### 4. Signup Page Design

**Current Status:** ✅ Excellent multi-step design

**Progress Indicator:**
```
Step 1: Select Plan    [Active] → [Complete]
Step 2: Your Details   [Inactive] → [Active] → [Complete]
Step 3: Payment        [Inactive] → [Inactive] → [Active]

Visual Design:
- Circular badges with numbers/checkmarks
- Connected by horizontal lines
- Active: emerald-500 background
- Complete: emerald-500/20 background with checkmark
- Inactive: slate-700 background
```

**Step 1: Plan Selection**

**Layout:** 3-column grid (responsive)

**Plan Card Design:**
```css
Card {
  border: 2px solid slate-700;
  background: slate-800/50;
  border-radius: 12px;
  padding: 24px;
  transition: all 200ms;
  cursor: pointer;
}

Card:hover {
  border-color: slate-600;
}

Card.popular {
  border-color: emerald-500;
  background: gradient from slate-800 to slate-900;
  ring: 2px emerald-500/20;
  position: relative;
}

Popular Badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: emerald-500;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 9999px;
  text: "MOST POPULAR";
}

Plan Name {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}

Price {
  font-size: 2.25rem;
  font-weight: 700;
  color: white;
}

Price Suffix {
  font-size: 1rem;
  color: slate-400;
  text: "/month";
}

Feature List {
  margin-top: 24px;
  margin-bottom: 24px;
  spacing: 12px between items;
}

Feature Item {
  display: flex;
  gap: 8px;
  align-items: start;
}

Feature Icon {
  icon: Check (lucide);
  color: emerald-400;
  size: 20px;
  flex-shrink: 0;
}

Feature Text {
  color: slate-300;
  font-size: 0.875rem;
}

CTA Button {
  width: 100%;
  height: 44px;
  background: slate-700 for regular, gradient emerald for popular;
  text: "Get Started" with arrow icon;
}
```

**Pricing Tiers (from PMF.md):**
```
Starter:   $49/mo  - Up to 50 leads/month
Pro:       $149/mo - Up to 200 leads/month (MOST POPULAR)
Team:      $399/mo - Up to 500 leads/month
```

**Step 2: Details Form**

**Selected Plan Display:**
```
Text: "Selected plan: [Plan Name] ($[Price]/month)"
Style: slate-300 with emerald-400 highlight on plan name
Position: Below heading, centered
```

**Form Fields:**

1. **Email Address**
   ```
   Type: email
   Required: Yes
   Placeholder: "you@example.com"
   Validation: Email format regex
   AutoComplete: email
   ```

2. **Full Name**
   ```
   Type: text
   Required: Yes
   Placeholder: "John Smith"
   AutoComplete: name
   ```

3. **Phone Number**
   ```
   Type: tel
   Required: Yes
   Placeholder: "+1 (555) 123-4567"
   Validation: US phone format regex
   AutoComplete: tel
   ```

**Form Styling:**
```css
Label {
  color: white;
  margin-bottom: 8px;
  display: block;
  font-weight: 500;
}

Input {
  background: slate-900;
  border: 1px solid slate-600;
  color: white;
  padding: 12px;
  border-radius: 6px;
  width: 100%;
  font-size: 1rem;
}

Input:focus {
  outline: 2px solid emerald-500;
  border-color: emerald-500;
}

Input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

**Error Handling:**
```css
Error Container {
  background: red-500/10;
  border: 1px solid red-500/50;
  color: red-400;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}
```

**Action Buttons:**
```css
Button Container {
  display: flex;
  gap: 16px;
}

Back Button {
  flex: 1;
  variant: outline;
  border-color: slate-600;
  color: slate-300;
  hover: background slate-700;
}

Continue Button {
  flex: 1;
  background: gradient emerald-500 → emerald-600;
  hover: gradient emerald-600 → emerald-700;
  loading-state: Spinner + "Processing...";
}
```

**Trial Notice:**
```
Position: Bottom of card, below buttons
Style: Border-top separator, small text (0.75rem)
Color: slate-400
Text: "By continuing, you agree to our Terms of Service and Privacy Policy. 
       Your 14-day free trial starts today. No charge until [Date]."
```

**Step 3: Payment (Stripe Hosted)**
- Redirects to Stripe Checkout
- Not designed in-app
- Return URL: `/dashboard` on success

**Improvements Needed:**

1. ⚠️ **Password Creation**
   - Currently missing from signup flow
   - Should be added in Step 2 or as a separate step
   - Requirements: min 8 characters, uppercase, lowercase, number
   - Password strength indicator

2. ⚠️ **Email Verification**
   - Should send verification email after account creation
   - Block access until email verified
   - Resend verification link option

3. ⚠️ **Success/Confirmation Page**
   - After Stripe checkout success
   - Welcome message
   - Next steps guide
   - CTA to dashboard

---

### 5. Protected Routes & Session Management

**Authentication Flow:**

1. **Login Success**
   - Store token in `localStorage` (remember me) or `sessionStorage`
   - Redirect to `/dashboard`

2. **Route Protection**
   - Middleware checks for valid token
   - Redirects to `/login` if unauthenticated
   - Preserves intended destination (return URL)

3. **Session Persistence**
   - Token refresh mechanism
   - Auto-logout on expiration
   - "Session expired" notification

**Improvements Needed:**

1. ⚠️ **Middleware Configuration**
   - Verify all dashboard routes are protected
   - Add public route allowlist
   - Implement token validation

2. ⚠️ **Logout Flow**
   - Add logout button in dashboard header
   - Clear tokens on logout
   - Redirect to landing page

---

## Responsive Design Specifications

### Mobile (< 768px)

**Landing Page:**
- Stack CTAs vertically
- Full-width buttons
- Larger touch targets (min 44px)

**Login Page:**
- Full-screen card
- Reduce padding
- Stack elements vertically

**Signup Page:**
- Single column plan cards
- Stack buttons vertically in Step 2
- Hide step labels on progress indicator (numbers only)

### Tablet (768px - 1023px)

- 2-column grid for plan cards
- Maintain button layouts
- Adjust spacing

### Desktop (≥ 1024px)

- 3-column grid for plan cards
- Max-width containers (1280px)
- Optimal reading widths

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

1. **Color Contrast**
   - Text on background: Minimum 4.5:1
   - Large text: Minimum 3:1
   - Interactive elements: Minimum 3:1

2. **Keyboard Navigation**
   - All interactive elements focusable
   - Visible focus indicators
   - Logical tab order
   - Escape to close modals

3. **Screen Readers**
   - Semantic HTML
   - ARIA labels on icons
   - Form labels properly associated
   - Error announcements

4. **Touch Targets**
   - Minimum 44x44px
   - Adequate spacing between elements
   - No overlapping targets

5. **Form Accessibility**
   - Labels associated with inputs
   - Error messages linked to fields
   - Clear instructions
   - Validation feedback

---

## Component Library

### Button Component

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  children: React.ReactNode
}

// Styles
Primary: Emerald gradient
Secondary: Slate gray
Outline: Transparent with border
Ghost: Transparent hover effect
```

### Input Component

```typescript
interface InputProps {
  type: 'text' | 'email' | 'password' | 'tel'
  label: string
  placeholder?: string
  error?: string
  icon?: React.ReactNode
  disabled?: boolean
  required?: boolean
}

// States
Default: slate-900 background
Focus: emerald-500 outline
Error: red-500 border
Disabled: opacity 60%
```

### Card Component

```typescript
interface CardProps {
  variant: 'default' | 'highlighted'
  children: React.ReactNode
}

// Styles
Default: slate-800/50 background, slate-700 border
Highlighted: Emerald border, ring effect
```

---

## Animation & Micro-interactions

### Button Hover

```css
transition: all 200ms ease-in-out;
hover: brightness(1.1) for primary, brightness(0.95) for secondary;
```

### Loading States

```css
Spinner: rotate 360deg in 1s infinite;
Button Text: fade-out during loading;
Button: disabled, cursor-not-allowed;
```

### Form Validation

```css
Error shake: translateX(-10px) → 0 → 10px → 0 in 200ms;
Success checkmark: scale(0) → scale(1) with spring;
```

### Page Transitions

```css
Fade-in: opacity 0 → 1 in 300ms;
Slide-up: translateY(20px) → 0 in 300ms;
```

---

## Security Considerations

### Client-Side

1. **Password Visibility Toggle**
   - Icon indicates state clearly
   - Accessible via keyboard

2. **Token Storage**
   - Use httpOnly cookies (preferred)
   - Or localStorage with XSS protection
   - Never expose tokens in URL

3. **Input Sanitization**
   - Validate email format
   - Validate phone format
   - Prevent SQL injection (server-side)

### Server-Side (API Design)

1. **Password Requirements**
   - Minimum 8 characters
   - At least 1 uppercase
   - At least 1 lowercase  
   - At least 1 number
   - Optional: special character

2. **Rate Limiting**
   - Max 5 login attempts per 15 minutes
   - Exponential backoff
   - CAPTCHA after 3 failures

3. **Session Management**
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (7 days)
   - Revoke tokens on logout

---

## Testing Checklist

### Functional Testing

- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails with clear error
- [ ] Remember me persists session
- [ ] Forgot password sends reset email
- [ ] Signup creates account and redirects to Stripe
- [ ] Stripe payment success redirects to dashboard
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Logout clears session and redirects to home

### Visual Testing

- [ ] Buttons have correct hover states
- [ ] Focus indicators are visible
- [ ] Error messages display correctly
- [ ] Loading states show spinners
- [ ] Responsive layouts work on all breakpoints
- [ ] Color contrast meets WCAG AA

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader announces form labels
- [ ] Form errors are announced
- [ ] Touch targets are 44px minimum
- [ ] Focus trap in modals works

---

## Future Enhancements

### Priority 1 (Must-Have)

1. **Password Reset Flow**
   - Forgot password page
   - Email with magic link
   - Reset password form
   - Success confirmation

2. **Email Verification**
   - Send verification email on signup
   - Verification page with token
   - Resend verification option

3. **Password Creation in Signup**
   - Add password field to Step 2
   - Password strength indicator
   - Confirm password field

### Priority 2 (Should-Have)

1. **Social Login**
   - Google OAuth
   - Microsoft OAuth
   - LinkedIn OAuth

2. **Two-Factor Authentication**
   - SMS verification
   - Authenticator app support
   - Backup codes

3. **Session Management Dashboard**
   - Active sessions list
   - Logout from all devices
   - Session history

### Priority 3 (Nice-to-Have)

1. **Passwordless Login**
   - Magic link via email
   - SMS OTP
   - WebAuthn/Passkeys

2. **Account Recovery**
   - Security questions
   - Recovery email
   - Trusted device verification

---

## Implementation Guide for Developers

### Files to Modify

1. **Add Password Field to Signup**
   - File: `app/signup/page.tsx`
   - Add password and confirmPassword to formData
   - Add validation for password requirements
   - Add strength indicator component

2. **Implement Forgot Password Flow**
   - Create: `app/forgot-password/page.tsx`
   - Create: `app/reset-password/page.tsx`
   - Update: Login page to link to forgot password

3. **Add Email Verification**
   - Create: `app/verify-email/page.tsx`
   - Update: Signup flow to send verification email
   - Add resend verification endpoint

4. **Add Logout Functionality**
   - Update: Dashboard layout to include logout button
   - Create: Logout API endpoint to invalidate tokens

5. **Improve Route Protection**
   - Create: `middleware.ts` for auth checks
   - Add: Token validation logic
   - Add: Return URL preservation

### API Endpoints Needed

```
POST /api/auth/login         - Authenticate user
POST /api/auth/logout        - Invalidate session
POST /api/auth/signup        - Create account
POST /api/auth/forgot-password - Send reset email
POST /api/auth/reset-password  - Update password
POST /api/auth/verify-email    - Verify email token
POST /api/auth/resend-verification - Resend email
GET  /api/auth/session      - Get current session
POST /api/auth/refresh      - Refresh access token
```

---

## Conclusion

The LeadFlow AI authentication flow has a solid foundation with well-designed login and signup pages. The primary improvements needed are:

1. ✅ **Already Complete:**
   - Landing page CTAs
   - Login page design
   - Signup flow (plans + details)
   - Stripe integration

2. ⚠️ **Needs Implementation:**
   - Password creation in signup
   - Forgot password flow
   - Email verification
   - Success/confirmation pages
   - Logout functionality
   - Enhanced route protection

3. 🔮 **Future Enhancements:**
   - Social login
   - Two-factor authentication
   - Passwordless options

This design specification provides clear guidance for developers to implement the remaining components while maintaining visual consistency and following security best practices.

---

**Design Deliverables:**
- ✅ Complete visual specifications
- ✅ Component library definitions
- ✅ Responsive design guidelines
- ✅ Accessibility requirements
- ✅ Implementation roadmap

**Status:** Ready for development implementation
