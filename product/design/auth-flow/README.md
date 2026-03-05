# Authentication Flow Design Package

**Use Case:** UC-AUTH-FIX-001 - Implement Authentication Flow - Signup/Login  
**Task ID:** 098b629f-783b-4fff-8dd6-4b288b229722  
**Date:** March 5, 2026  
**Status:** ✅ Design Complete  

---

## Package Contents

This design package provides comprehensive specifications for the LeadFlow AI authentication flow, including signup, login, password reset, and email verification.

### 📋 Documentation

1. **DESIGN_SPECIFICATIONS.md** - Complete design system and component specifications
   - Brand identity and color palette
   - Component library with detailed CSS
   - Responsive design guidelines
   - Accessibility requirements (WCAG 2.1 AA)
   - Security considerations
   - Implementation guide for developers

2. **WIREFRAMES.md** - Detailed wireframes and user flows
   - ASCII art wireframes for all pages
   - Component specifications
   - Animation guidelines
   - Mobile/tablet/desktop layouts
   - Developer handoff notes

3. **README.md** - This file (package overview)

---

## Quick Reference

### Current Status

**✅ Already Implemented:**
- Landing page with auth CTAs
- Login page (email/password)
- Signup page (multi-step with Stripe)
- Basic route protection

**⚠️ Needs Implementation:**
- Password creation in signup flow
- Forgot password page
- Reset password page
- Email verification flow
- Logout functionality
- Enhanced middleware protection

---

## Design System Summary

### Color Palette

```css
/* Primary Colors */
Emerald-500: #10b981  (Primary CTA, accents)
Emerald-600: #059669  (Hover states)
Emerald-400: #34d399  (Links, icons)

/* Background */
Slate-900:   #0f172a  (Dark background)
Slate-800:   #1e293b  (Card backgrounds)
Slate-700:   #334155  (Borders)

/* Text */
White:       #ffffff  (Primary text)
Slate-300:   #cbd5e1  (Secondary text)
Slate-400:   #94a3b8  (Tertiary text)
Slate-500:   #64748b  (Disabled text)

/* States */
Red-500:     #ef4444  (Errors)
Red-400:     #f87171  (Error text)
Yellow-500:  #eab308  (Warnings)
Green-400:   #4ade80  (Success)
```

### Typography

```css
/* Font Family */
font-family: Inter, system-ui, -apple-system, sans-serif;

/* Font Sizes */
Headings (2xl): 1.5rem (24px), weight 700
Body:           1rem (16px), weight 400
Small:          0.875rem (14px), weight 400
Tiny:           0.75rem (12px), weight 400

/* Buttons */
Button Text:    1rem (16px), weight 600
```

### Spacing

```css
/* Base Unit: 4px */
xs:   4px   (0.25rem)
sm:   8px   (0.5rem)
md:   16px  (1rem)
lg:   24px  (1.5rem)
xl:   32px  (2rem)
2xl:  48px  (3rem)

/* Component Spacing */
Card Padding:      24px
Form Gap:          16px
Button Height:     44px (mobile), 48px (desktop)
Input Height:      44px
```

---

## User Flows

### 1. New User Signup

```
Landing Page → "Get Started" 
  ↓
Signup: Step 1 - Select Plan
  ↓
Signup: Step 2 - Enter Details + Password
  ↓
Signup: Step 3 - Payment (Stripe)
  ↓
Email Verification Sent
  ↓
Dashboard (with verification banner)
  ↓
Email Verified
  ↓
Full Dashboard Access
```

### 2. Existing User Login

```
Landing Page → "Sign In"
  ↓
Login Page
  ↓
Enter Email + Password
  ↓
Dashboard (verified users only)
```

### 3. Forgot Password

```
Login Page → "Forgot Password?"
  ↓
Forgot Password Page
  ↓
Enter Email
  ↓
Check Email Page
  ↓
Click Link in Email
  ↓
Reset Password Page
  ↓
Enter New Password
  ↓
Password Reset Success
  ↓
Redirect to Login
```

### 4. Email Verification

```
Signup Complete
  ↓
Email Sent
  ↓
Dashboard (banner: "Verify your email")
  ↓
Click Link in Email
  ↓
Email Verified Success
  ↓
Dashboard (banner removed)
```

---

## Components to Implement

### Pages (New)

1. **Forgot Password Page** (`/forgot-password`)
   - Email input form
   - Submit button
   - Back to login link
   - Success state (check email)

2. **Reset Password Page** (`/reset-password`)
   - New password input
   - Confirm password input
   - Password strength indicator
   - Requirements checklist
   - Submit button
   - Success state

3. **Verify Email Page** (`/verify-email`)
   - Success state (email verified)
   - Error state (invalid/expired token)
   - Redirect to dashboard

### Components (New)

1. **PasswordStrengthIndicator** 
   - Progress bar showing password strength
   - Color-coded (red → yellow → green)
   - Labels (Weak, Medium, Strong, Very Strong)

2. **PasswordRequirements**
   - Checklist of password requirements
   - Real-time validation
   - Checkmarks for met requirements

3. **EmailVerificationBanner**
   - Warning banner for unverified emails
   - Resend verification link
   - Dismiss option

4. **UserMenu with Logout**
   - Dropdown menu in header
   - Profile, Settings, Logout options
   - Logout confirmation (optional)

### Modifications (Existing)

1. **Signup Page** - Add password fields to Step 2
2. **Login Page** - Link to forgot password page
3. **Dashboard Layout** - Add verification banner
4. **Header** - Add user menu with logout

---

## API Endpoints Required

```typescript
// Authentication
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/signup
POST /api/auth/refresh

// Password Management
POST /api/auth/forgot-password
POST /api/auth/reset-password

// Email Verification
POST /api/auth/verify-email
POST /api/auth/resend-verification

// Session
GET  /api/auth/session
```

---

## Implementation Timeline

### Phase 1: Critical Features (Week 1)
**Estimated:** 3-4 days

- [ ] Add password field to signup (Step 2)
- [ ] Password strength indicator component
- [ ] Password requirements component
- [ ] Forgot password page
- [ ] Reset password page
- [ ] API endpoints for password reset

**Deliverables:**
- Users can create passwords during signup
- Users can reset forgotten passwords
- Password strength validation works

### Phase 2: Email Verification (Week 1-2)
**Estimated:** 2-3 days

- [ ] Email verification flow
- [ ] Verify email page (success/error)
- [ ] Email verification banner in dashboard
- [ ] Resend verification endpoint
- [ ] Email templates (reset, verification)

**Deliverables:**
- Users receive verification emails
- Email verification links work
- Unverified users see banner

### Phase 3: Session Management (Week 2)
**Estimated:** 1-2 days

- [ ] Logout functionality
- [ ] User menu in header
- [ ] Enhanced middleware protection
- [ ] Session refresh mechanism
- [ ] Auto-logout on expiration

**Deliverables:**
- Users can logout
- Sessions are properly managed
- Protected routes work correctly

### Phase 4: Polish & Testing (Week 2-3)
**Estimated:** 2-3 days

- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Error handling improvements

**Deliverables:**
- All features work on all browsers
- Mobile experience is smooth
- WCAG 2.1 AA compliance verified

---

## Testing Checklist

### Functional Tests

**Signup Flow:**
- [ ] Can select a plan
- [ ] Can enter details with password
- [ ] Password strength indicator updates
- [ ] Password requirements validate
- [ ] Confirm password must match
- [ ] Can complete Stripe checkout
- [ ] Verification email is sent

**Login Flow:**
- [ ] Can login with valid credentials
- [ ] Cannot login with invalid credentials
- [ ] Remember me persists session
- [ ] Error messages display correctly
- [ ] Redirects to dashboard on success

**Forgot Password:**
- [ ] Can request password reset
- [ ] Reset email is sent
- [ ] Reset link opens reset page
- [ ] Can set new password
- [ ] Password requirements validate
- [ ] Redirects to login on success

**Email Verification:**
- [ ] Verification link works
- [ ] Success page displays
- [ ] Banner appears if unverified
- [ ] Banner disappears after verification
- [ ] Can resend verification email

**Logout:**
- [ ] Logout button is visible
- [ ] Logout clears session
- [ ] Redirects to landing page
- [ ] Cannot access protected routes after logout

### Visual Tests

- [ ] Colors match design system
- [ ] Typography is consistent
- [ ] Spacing matches specifications
- [ ] Hover states work
- [ ] Loading states display
- [ ] Error states are clear
- [ ] Success states are celebratory

### Responsive Tests

- [ ] Mobile layout works (<768px)
- [ ] Tablet layout works (768-1023px)
- [ ] Desktop layout works (≥1024px)
- [ ] Touch targets are 44px minimum
- [ ] Text is readable on all sizes

### Accessibility Tests

- [ ] Keyboard navigation works
- [ ] Screen reader announces labels
- [ ] Focus indicators are visible
- [ ] Color contrast passes WCAG AA
- [ ] Form errors are announced
- [ ] Success/error messages are clear

### Security Tests

- [ ] Passwords are hashed
- [ ] Tokens are secure
- [ ] XSS protection works
- [ ] CSRF protection works
- [ ] Rate limiting prevents abuse
- [ ] Sessions expire correctly

---

## Design Principles

### 1. Clarity Over Cleverness
- Clear labels and instructions
- Obvious next actions
- Predictable behavior
- No hidden features

### 2. Feedback First
- Immediate validation
- Clear error messages
- Loading states for all actions
- Success confirmations

### 3. Mobile-First
- Touch-friendly targets
- Readable text sizes
- Simplified layouts
- Fast loading

### 4. Accessible by Default
- Semantic HTML
- Keyboard navigation
- Screen reader support
- High contrast

### 5. Security Without Friction
- Strong password requirements
- But with helpful indicators
- Clear security messages
- No confusing jargon

---

## Common Patterns

### Error Handling

```tsx
// Display errors above the form
{error && (
  <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4">
    {error}
  </div>
)}
```

### Loading States

```tsx
// Disable button and show spinner
<Button disabled={loading}>
  {loading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Processing...
    </>
  ) : (
    <>
      Continue <ArrowRight className="w-4 h-4 ml-2" />
    </>
  )}
</Button>
```

### Form Validation

```tsx
// Real-time validation
const validateEmail = (email: string) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// Show error after blur
const [touched, setTouched] = useState(false)
const showError = touched && !validateEmail(email)
```

---

## Dependencies

### Required Libraries

```json
{
  "@supabase/supabase-js": "^2.x",
  "lucide-react": "^0.x",
  "next": "^14.x",
  "react": "^18.x",
  "react-dom": "^18.x",
  "zod": "^3.x"
}
```

### UI Components

Uses existing component library from `@/components/ui/`:
- Button
- Card
- Input
- Label
- Checkbox

---

## Support & Questions

### Documentation References

- **Full Design Specs:** `DESIGN_SPECIFICATIONS.md`
- **Wireframes:** `WIREFRAMES.md`
- **Project Context:** `CLAUDE.md`
- **API Design:** `docs/leadflow-api-design.md`

### Key Design Decisions

1. **Why Emerald Green?**
   - Represents growth and success
   - High contrast with dark theme
   - Differentiates from competitors

2. **Why Dark Theme?**
   - Modern, professional look
   - Reduces eye strain
   - Common in SaaS dashboards

3. **Why Multi-Step Signup?**
   - Reduces cognitive load
   - Shows progress clearly
   - Allows plan comparison

4. **Why Email Verification?**
   - Prevents spam signups
   - Ensures valid contact info
   - Industry best practice

5. **Why Password Requirements?**
   - Security best practice
   - Prevents weak passwords
   - Clear expectations upfront

---

## Changelog

### v1.0 - March 5, 2026
- Initial design package
- Complete specifications for auth flow
- Wireframes for all pages
- Component library defined
- Implementation guide created

---

**Design Status:** ✅ Complete and ready for development  
**Estimated Implementation Time:** 2-3 weeks  
**Priority:** High (blocking pilot agent signups)

**Next Step:** Development implementation of Phase 1 features
