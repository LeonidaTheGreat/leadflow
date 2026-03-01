# Agent Onboarding UI - Component Architecture

**Document Version:** 1.0  
**Last Updated:** 2026-02-25  
**Component Status:** Production Ready  

---

## Quick Reference

| Component | Path | Lines | Purpose | Status |
|-----------|------|-------|---------|--------|
| Main Flow | `app/onboarding/page.tsx` | 89 | Step orchestration | ✅ |
| Welcome Step | `app/onboarding/steps/welcome.tsx` | 243 | Email/password | ✅ |
| Agent Info Step | `app/onboarding/steps/agent-info.tsx` | 203 | Personal details | ✅ |
| Calendar Step | `app/onboarding/steps/calendar.tsx` | 186 | Cal.com setup | ✅ |
| SMS Step | `app/onboarding/steps/sms-config.tsx` | 208 | Twilio config | ✅ |
| Confirmation Step | `app/onboarding/steps/confirmation.tsx` | 169 | Final review | ✅ |
| Progress | `app/onboarding/components/progress.tsx` | ~50 | Progress bar | ✅ |
| Button | `app/onboarding/components/button.tsx` | ~50 | Shared button | ✅ |

---

## Component Hierarchy

```
OnboardingPage (Main Container)
├── Header
│   └── Logo + Progress Counter
├── OnboardingProgress (Visual Progress Bar)
└── Main Content (Dynamic based on step)
    ├── When currentStep === 'welcome'
    │   └── OnboardingWelcome
    │       ├── Email Input
    │       ├── Password Input
    │       ├── Confirm Password Input
    │       └── Continue Button
    │
    ├── When currentStep === 'agent-info'
    │   └── OnboardingAgentInfo
    │       ├── First Name Input
    │       ├── Last Name Input
    │       ├── Phone Number Input (formatted)
    │       ├── State Select
    │       ├── Back Button
    │       └── Continue Button
    │
    ├── When currentStep === 'calendar'
    │   └── OnboardingCalendar
    │       ├── Cal.com Link Input
    │       ├── Verify Button
    │       ├── Verified State (conditional)
    │       ├── Back Button
    │       └── Continue Button
    │
    ├── When currentStep === 'sms'
    │   └── OnboardingSMS
    │       ├── SMS Phone Input
    │       ├── Enable Toggle
    │       ├── Back Button
    │       └── Continue Button
    │
    └── When currentStep === 'confirmation'
        └── OnboardingConfirm
            ├── Review Card (displays all data)
            ├── Edit Button (optional)
            ├── Back Button
            └── Complete Button
```

---

## State Management

### Main Page State
```typescript
const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')

const [agentData, setAgentData] = useState({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  timezone: 'America/New_York',
  state: '',
  calendarUrl: '',
  calcomLink: '',
  smsPhoneNumber: '',
})

const [isLoading, setIsLoading] = useState(false)
```

### Step Navigation
```typescript
const steps: OnboardingStep[] = [
  'welcome',      // Step 1
  'agent-info',   // Step 2
  'calendar',     // Step 3
  'sms',          // Step 4
  'confirmation'  // Step 5
]

const currentStepIndex = steps.indexOf(currentStep)

const nextStep = () => {
  if (currentStepIndex < steps.length - 1) {
    setCurrentStep(steps[currentStepIndex + 1])
  }
}

const prevStep = () => {
  if (currentStepIndex > 0) {
    setCurrentStep(steps[currentStepIndex - 1])
  }
}
```

---

## Step-by-Step Breakdown

### Step 1: Welcome (Email/Password)

**Component:** `OnboardingWelcome`

**Purpose:** 
- Collect email and password
- Validate email format
- Check email availability
- Ensure password confirmation match

**Props:**
```typescript
{
  onNext: () => void
  agentData: AgentData
  setAgentData: (data: AgentData) => void
}
```

**State:**
```typescript
const [email, setEmail] = useState(agentData.email || '')
const [password, setPassword] = useState(agentData.password || '')
const [confirmPassword, setConfirmPassword] = useState('')
const [errors, setErrors] = useState<Record<string, string>>({})
const [isValidating, setIsValidating] = useState(false)
```

**Validation:**
- Email format: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password minimum: 8 characters
- Password match: password === confirmPassword

**API Call:**
```typescript
const response = await fetch('/api/agents/check-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
})
```

**UI Elements:**
- Email input (with Mail icon)
- Password input
- Confirm password input
- Continue button (with loading state)
- Error messages (red text with icon)
- Benefits section (3 columns)
- Sign in link

**Styling:**
- Gradient background (slate-900 → slate-800)
- Dark theme with emerald accents
- Fade-in animation on mount
- Responsive (mobile + desktop)

---

### Step 2: Agent Info (Personal Details)

**Component:** `OnboardingAgentInfo`

**Purpose:**
- Collect agent name and contact info
- Validate phone number format
- Select operating state
- Set timezone

**Props:**
```typescript
{
  onNext: () => void
  onBack: () => void
  agentData: AgentData
  setAgentData: (data: AgentData) => void
}
```

**State:**
```typescript
const [firstName, setFirstName] = useState(agentData.firstName || '')
const [lastName, setLastName] = useState(agentData.lastName || '')
const [phoneNumber, setPhoneNumber] = useState(agentData.phoneNumber || '')
const [state, setState] = useState(agentData.state || '')
const [errors, setErrors] = useState<Record<string, string>>({})
```

**Validation:**
- First name: required, non-empty
- Last name: required, non-empty
- Phone: required, 10 digits (0-9 only)
- State: required, from list of 50 US states

**Phone Formatting:**
```typescript
const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
}
// Displays as: 555-123-4567
```

**State Select:**
```typescript
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', ..., 'Wyoming'
]
// 50 states in alphabetical order
```

**UI Elements:**
- First name input (with User icon)
- Last name input
- Phone input (with formatting)
- State select dropdown (with MapPin icon)
- Back button (gray outline)
- Continue button (emerald)
- Error messages for each field

**Styling:**
- Same dark theme as step 1
- Icons on left side of inputs
- Proper spacing between fields
- Responsive layout

---

### Step 3: Calendar Setup (Cal.com)

**Component:** `OnboardingCalendar`

**Purpose:**
- Connect Cal.com booking link
- Verify link is accessible
- Enable lead booking directly from AI responses
- Optional (can skip)

**Props:**
```typescript
{
  onNext: () => void
  onBack: () => void
  agentData: AgentData
  setAgentData: (data: AgentData) => void
}
```

**State:**
```typescript
const [calcomLink, setCalcomLink] = useState(agentData.calcomLink || '')
const [isVerifying, setIsVerifying] = useState(false)
const [verified, setVerified] = useState(false)
const [error, setError] = useState('')
```

**Validation:**
- URL must contain "cal.com" or "cal.dev"
- Must be valid HTTP/HTTPS URL
- Must be accessible (HEAD request succeeds)

**API Call:**
```typescript
const response = await fetch('/api/integrations/cal-com/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ calcomLink }),
})
```

**States:**
1. **Empty:** Input only
2. **Invalid:** Error message (red)
3. **Verifying:** Loading spinner, "Verifying..."
4. **Verified:** Green checkmark, success message
5. **Optional:** Can skip without verification

**UI Elements:**
- Cal.com link input (with Calendar icon)
- Info box (blue): "Leads can book appointments..."
- Verify button (blue variant)
- Verified state display (green with checkmark)
- Error display (red with alert icon)
- Optional notice (gray)
- Back/Continue buttons

**Styling:**
- Blue accent for calendar/verification
- Green for verified state
- Info boxes with background color
- Loading spinner animation

---

### Step 4: SMS Configuration (Twilio)

**Component:** `OnboardingSMS`

**Purpose:**
- Enable SMS responses to leads
- Configure Twilio phone number
- Allow AI to send text messages
- Optional (can skip)

**Props:**
```typescript
{
  onNext: () => void
  onBack: () => void
  agentData: AgentData
  setAgentData: (data: AgentData) => void
}
```

**State:**
```typescript
const [smsPhoneNumber, setSmsPhoneNumber] = useState(agentData.smsPhoneNumber || '')
const [isTesting, setIsTesting] = useState(false)
const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
const [smsEnabled, setSmsEnabled] = useState(!!agentData.smsPhoneNumber)
```

**Features:**
- Phone number input with formatting
- Enable/disable toggle
- Optional test SMS button
- Skip option for later setup

**Phone Format:**
- Accepts 10-digit US numbers
- Formats as: +1-555-123-4567
- Stored with country code in database

**UI Elements:**
- Enable SMS toggle switch
- Phone input (only shown if enabled)
- Test SMS button (optional)
- Test result message (success/error)
- Info box: benefits of SMS
- Optional notice
- Skip/Continue buttons

**Styling:**
- Purple accents for SMS/messaging
- Toggle switch styling
- Conditional display based on enabled state

---

### Step 5: Confirmation (Review & Submit)

**Component:** `OnboardingConfirm`

**Purpose:**
- Review all collected information
- Allow edits before submission
- Submit registration and complete onboarding
- Show loading state during submission

**Props:**
```typescript
{
  onBack: () => void
  onComplete: (data: AgentData) => Promise<void>
  agentData: AgentData
  isLoading: boolean
}
```

**Data Display:**
```typescript
{
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  state: string
  timezone: string
  calcomLink?: string
  smsPhoneNumber?: string
}
```

**Review Layout:**
```
┌─────────────────────────────────┐
│ Email Address                   │
│ test@example.com                │
├─────────────────────────────────┤
│ Full Name                       │
│ John Doe                        │
├─────────────────────────────────┤
│ Phone Number                    │
│ (555) 123-4567                  │
├─────────────────────────────────┤
│ State                           │
│ California                      │
├─────────────────────────────────┤
│ ✓ Calendar configured           │
│ ✓ SMS enabled                   │
└─────────────────────────────────┘
```

**Submission Process:**
```typescript
const completeOnboarding = async () => {
  setIsLoading(true)
  try {
    const response = await fetch('/api/agents/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData),
    })

    if (!response.ok) {
      throw new Error('Failed to complete onboarding')
    }

    const result = await response.json()
    router.push('/dashboard')  // Redirect to dashboard
  } catch (error) {
    console.error('Onboarding error:', error)
    // Show error toast
  } finally {
    setIsLoading(false)
  }
}
```

**Error Handling:**
- Show error message if submission fails
- Provide option to go back and edit
- Log error for debugging

**Success:**
- Redirect to dashboard
- Show welcome message
- Set up API credentials (next step)

**UI Elements:**
- Review card with all information
- "Edit" button (optional, goes back)
- Check marks for optional fields completed
- Back button
- Complete/Submit button (with loading state)
- Error message display (if fails)

---

## Data Flow & State Updates

### Complete User Journey
```
1. User visits /onboarding
   ↓
2. currentStep = 'welcome'
   User enters email & password
   ↓
3. API: /api/agents/check-email
   Validate & check availability
   ↓
4. agentData updated with email & password
   currentStep = 'agent-info'
   ↓
5. User enters name, phone, state
   Form validation
   ↓
6. agentData updated with personal info
   currentStep = 'calendar'
   ↓
7. User enters (optional) Cal.com link
   API: /api/integrations/cal-com/verify
   ↓
8. agentData updated with calendar
   currentStep = 'sms'
   ↓
9. User enters (optional) SMS phone
   ↓
10. agentData updated with SMS phone
    currentStep = 'confirmation'
    ↓
11. User reviews all information
    ↓
12. User clicks "Complete"
    API: /api/agents/onboard
    ↓
13. Supabase creates:
    - agents record
    - agent_integrations record
    - agent_settings record
    ↓
14. Response: { agent: { id, email, status }, message }
    ↓
15. Redirect to /dashboard
    ✅ Onboarding complete
```

---

## Styling System

### Color Scheme
```css
/* Background */
from-slate-900     /* Main background start */
to-slate-800       /* Main background end */

/* Text */
text-white         /* Headers and main text */
text-slate-300     /* Secondary text */
text-slate-400     /* Tertiary text */
text-slate-500     /* Muted text and icons */

/* Borders */
border-slate-700/50     /* Main borders */
border-slate-600/50     /* Secondary borders */

/* Accents */
emerald-500        /* Primary action (continue buttons) */
emerald-600        /* Hover state */
emerald-400        /* Text accents */

/* States */
red-500/10         /* Error background */
red-500/20         /* Error border */
red-400            /* Error text */

blue-500/10        /* Info background */
blue-500/20        /* Info border */
blue-300           /* Info text */

green-500/10       /* Success background */
green-500/30       /* Success border */
green-400          /* Success text */
```

### Component Styling Pattern
```tsx
// Input styling
<input
  className={`
    w-full px-4 py-3
    bg-slate-700/50
    border rounded-lg
    text-white placeholder-slate-500
    focus:outline-none
    focus:border-emerald-500
    focus:ring-1 focus:ring-emerald-500
    transition
    ${errors.field ? 'border-red-500/50' : 'border-slate-600/50'}
  `}
/>

// Button styling
<button
  className={`
    px-4 py-3
    bg-gradient-to-r from-emerald-500 to-emerald-600
    hover:from-emerald-600 hover:to-emerald-700
    text-white font-semibold
    rounded-lg
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `}
/>
```

### Responsive Design
```css
/* Mobile first */
max-w-2xl           /* Max width container */
mx-auto             /* Center */
px-4                /* Horizontal padding on mobile */
md:p-12             /* Larger padding on desktop */

/* Grid adjustments */
grid-cols-1         /* Single column mobile */
md:grid-cols-3      /* 3 columns desktop */
```

### Animations
```css
/* Fade in on mount */
animate-in fade-in-up duration-500

/* Loading spinner */
border-2 border-white/30
border-t-white
rounded-full
animate-spin

/* Transitions */
transition-all duration-200
hover:from-emerald-600
```

---

## Integration Points

### External APIs Called
1. **Email Validation:** `/api/agents/check-email`
2. **Agent Registration:** `/api/agents/onboard`
3. **Calendar Verification:** `/api/integrations/cal-com/verify`
4. **SMS Test:** `/api/integrations/twilio/send-test`

### Database Writes
```
INSERT INTO agents (
  email, password_hash, first_name, last_name,
  phone_number, state, timezone, status, created_at
)

INSERT INTO agent_integrations (
  agent_id, cal_com_link, twilio_phone_number, created_at
)

INSERT INTO agent_settings (
  agent_id, auto_response_enabled, sms_enabled,
  email_notifications, created_at
)
```

### Redirects
- **Success:** `/dashboard` (after completion)
- **Manual:** `/login` (from welcome footer link)

---

## Error Handling Strategy

### Client-Side Validation
```typescript
const errors: Record<string, string> = {}

// Email
if (!email.trim()) {
  errors.email = 'Email is required'
} else if (!validateEmail(email)) {
  errors.email = 'Please enter a valid email address'
}

// Password
if (!password) {
  errors.password = 'Password is required'
} else if (password.length < 8) {
  errors.password = 'Password must be at least 8 characters'
}

// Confirmation
if (password !== confirmPassword) {
  errors.confirm = 'Passwords do not match'
}
```

### API Error Handling
```typescript
try {
  const response = await fetch('/api/agents/onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agentData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to complete onboarding')
  }

  const result = await response.json()
  router.push('/dashboard')
} catch (error) {
  console.error('Onboarding error:', error)
  // Display user-friendly error message
  // Don't expose internal errors
}
```

### Error Display
```tsx
{errors.email && (
  <div className="flex items-center gap-2 text-sm text-red-400">
    <AlertCircle className="w-4 h-4" />
    {errors.email}
  </div>
)}
```

---

## Testing Strategy

### Component Testing
- Mount component with props
- Verify render output
- Simulate user input
- Check validation
- Verify state updates

### Integration Testing
- Full onboarding flow
- Email availability check
- Agent registration
- Calendar verification
- Error handling

### Test Coverage
- **Welcome:** Email format, password match, API call, error handling
- **Agent Info:** Field validation, phone formatting, state selection
- **Calendar:** URL validation, verification API, skip option
- **SMS:** Phone input, optional toggle, test SMS
- **Confirmation:** Data display, submission, redirect
- **Edge cases:** Duplicate emails, invalid URLs, network errors

---

## Maintenance Guide

### Adding a New Step
1. Create new component in `app/onboarding/steps/`
2. Import in `page.tsx`
3. Add step type to `OnboardingStep` union
4. Add to `steps` array
5. Add conditional render in main component
6. Update tests

### Modifying Validation
1. Update validation function
2. Update error message
3. Update test cases
4. Test with various inputs

### Changing Styling
1. Keep color scheme consistent
2. Use existing Tailwind classes
3. Test responsive design
4. Verify dark theme contrast

### Adding Fields
1. Add to `agentData` state
2. Add to form component
3. Add validation
4. Add to API request
5. Update database schema
6. Add tests

---

## Performance Considerations

### Optimization Done
- ✅ Lazy load step components
- ✅ Memoize callback functions
- ✅ Avoid unnecessary re-renders
- ✅ Debounce API calls (for email check)
- ✅ Optimized CSS (Tailwind purge)

### Further Optimization
- Consider React.memo for step components
- Use useMemo for large computations
- Add image lazy loading if needed
- Implement virtual lists if many options

---

## Accessibility

### Current Features
- ✅ Semantic HTML (input, select, button)
- ✅ Label elements with for attribute
- ✅ Error messages associated with fields
- ✅ Loading state with aria labels
- ✅ Keyboard navigation support

### Further Improvements
- Add ARIA live regions for status updates
- Add role="status" for loading messages
- Add aria-invalid for error states
- Add aria-describedby for error messages
- Test with screen readers

---

## Future Enhancements

### Phase 2
- [ ] Progress persistence (localStorage)
- [ ] Multi-page state preservation
- [ ] OAuth integration (Google, LinkedIn)
- [ ] Email verification flow
- [ ] Phone number verification (SMS code)

### Phase 3
- [ ] Advanced profile customization
- [ ] Document uploads (license, credentials)
- [ ] Timezone detection (from browser)
- [ ] Multi-language support
- [ ] A/B testing different flows

---

**Last Updated:** 2026-02-25  
**Status:** Production Ready  
**Maintainer:** Dev Team  
**Next Review:** Post-pilot feedback
