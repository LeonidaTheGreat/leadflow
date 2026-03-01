# Agent Onboarding API Integration

## Overview

This directory contains the complete API integration layer for the Agent Onboarding UI. It provides typed TypeScript APIs for form submission, validation, draft saving, and error handling.

## Architecture

```
app/api/onboarding/
├── draft/route.ts         # POST/GET/DELETE - Draft CRUD operations
├── validate/route.ts      # POST/GET - Step and full form validation
├── check-email/route.ts   # POST/GET - Email availability checking
└── submit/route.ts        # POST - Final onboarding submission

lib/
├── onboarding-api.ts      # Client-side API client with retries
├── onboarding-validation.ts # Server-side validation logic
└── types/onboarding.ts    # TypeScript type definitions
```

## API Endpoints

### 1. Draft Management (`/api/onboarding/draft`)

**POST** - Save or update a draft
```typescript
POST /api/onboarding/draft
{
  draftId?: string;           // Optional - updates existing draft
  email: string;
  formData: Partial<OnboardingFormData>;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
}

Response:
{
  success: true;
  data: {
    draftId: string;
    email: string;
    expiresAt: string;
  }
}
```

**GET** - Retrieve a draft
```typescript
GET /api/onboarding/draft?email=user@example.com
GET /api/onboarding/draft?draftId=uuid

Response:
{
  success: true;
  data: OnboardingDraft | null;
}
```

**DELETE** - Delete a draft
```typescript
DELETE /api/onboarding/draft?draftId=uuid
```

### 2. Validation (`/api/onboarding/validate`)

**POST** - Validate a step or full form
```typescript
POST /api/onboarding/validate
{
  step?: OnboardingStep;      // Required if validateAll is false
  data: Partial<OnboardingFormData>;
  validateAll?: boolean;      // Validate entire form
}

Response:
{
  success: boolean;
  valid: boolean;
  errors: Array<{ field: string; message: string; code: string }>;
}
```

### 3. Email Check (`/api/onboarding/check-email`)

**POST** - Check email availability
```typescript
POST /api/onboarding/check-email
{
  email: string;
  checkDraft?: boolean;       // Also check for existing drafts
}

Response:
{
  success: true;
  available: boolean;
  valid: boolean;
  hasDraft?: boolean;
  draft?: { draftId; currentStep; completedSteps };
  suggestion?: string;        // Alternative email if taken
}
```

### 4. Submit (`/api/onboarding/submit`)

**POST** - Final onboarding submission
```typescript
POST /api/onboarding/submit
{
  data: OnboardingFormData;
  draftId?: string;
  tracking?: {
    completionTimeMs?: number;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }
}

Response:
{
  success: true;
  data: {
    agentId: string;
    email: string;
    firstName: string;
    lastName: string;
    redirectUrl: string;
  }
}
```

## Client-Side API Client

### Basic Usage

```typescript
import onboardingApi from '@/lib/onboarding-api';

// Check email availability
const result = await onboardingApi.checkEmail('user@example.com');
if (result.available) {
  // Email is available
}

// Save draft
await onboardingApi.saveDraft({
  email: 'user@example.com',
  formData: { firstName: 'John', lastName: 'Doe' },
  currentStep: 'agent-info',
  completedSteps: ['welcome'],
});

// Validate step
const { valid, errors } = await onboardingApi.validate(data, 'agent-info');

// Submit onboarding
const result = await onboardingApi.submit({
  data: fullFormData,
  tracking: { completionTimeMs: 45000 },
});
```

### Auto-Save

The API client includes auto-save functionality with debouncing:

```typescript
import onboardingApi, { createAutoSave } from '@/lib/onboarding-api';

const autoSave = createAutoSave(onboardingApi.saveDraft, 2000);

// Triggers auto-save after 2 seconds of inactivity
autoSave({
  email: 'user@example.com',
  formData: data,
  currentStep: 'agent-info',
  completedSteps: ['welcome'],
});
```

### Resume Onboarding

```typescript
import { resumeOnboarding } from '@/lib/onboarding-api';

// Check for existing draft
const result = await resumeOnboarding('user@example.com', 'email');
if (result.canResume) {
  // Resume from result.draft.currentStep
}
```

## Validation

### Server-Side Validation

Server-side validation mirrors client-side validation for consistency:

```typescript
import { onboardingValidator } from '@/lib/onboarding-validation';

// Validate a step
const isValid = onboardingValidator.validateStep('agent-info', data);
const errors = onboardingValidator.getErrors();

// Validate full form
const isValid = onboardingValidator.validateFullSubmission(data);
```

### Validation Rules

| Field | Rules |
|-------|-------|
| email | Required, valid email format |
| password | Required, minimum 8 characters |
| firstName | Required, minimum 1 character |
| lastName | Required, minimum 1 character |
| phoneNumber | Required, 10-digit US format |
| state | Required, valid US state |
| calcomLink | Optional, must be https://cal.com/username format |
| smsPhoneNumber | Optional, 10-digit format |

## Error Handling

The API client throws `OnboardingApiError` for API failures:

```typescript
import onboardingApi, { OnboardingApiError } from '@/lib/onboarding-api';

try {
  await onboardingApi.submit({ data });
} catch (error) {
  if (error instanceof OnboardingApiError) {
    console.log(error.statusCode);  // HTTP status code
    console.log(error.errors);      // Validation errors array
    console.log(error.code);        // Error code
  }
}
```

### Retry Logic

All API calls include automatic retry with exponential backoff:

- **Default retries**: 3 attempts
- **Retry delay**: Starts at 1s, doubles each attempt (max 5s)
- **Retry conditions**: Network errors and 5xx server errors
- **No retry**: 4xx client errors (except 429 rate limit)

## Database Schema

### onboarding_drafts Table

```sql
CREATE TABLE onboarding_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  form_data JSONB NOT NULL DEFAULT '{}',
  current_step TEXT NOT NULL DEFAULT 'welcome',
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_expired BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  completed_at TIMESTAMPTZ
);
```

**Features:**
- Drafts expire after 48 hours
- Auto-cleanup after 30 days for completed/expired drafts
- Triggers for timestamp updates

## Testing

Run the test suite:

```bash
# From the dashboard directory
npm test -- tests/onboarding-api.test.ts

# Or with ts-node
ts-node tests/onboarding-api.test.ts
```

## Integration with Form Components

The onboarding page (`app/onboarding/page.tsx`) integrates the API:

1. **Resume Check**: On mount, checks for existing drafts
2. **Auto-Save**: Automatically saves progress every 2 seconds
3. **Email Validation**: Real-time email availability check
4. **Error Handling**: Displays API errors in UI
5. **PostHog Tracking**: Tracks onboarding events

## Security Considerations

1. **RLS Policies**: Row Level Security on drafts table
2. **Input Sanitization**: All inputs validated server-side
3. **Password Hashing**: PBKDF2 with salt (use bcrypt/argon2 in production)
4. **Rate Limiting**: Implement rate limiting on API routes
5. **CSRF Protection**: Next.js handles CSRF automatically

## Environment Variables

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Future Enhancements

1. **Real-time Validation**: WebSocket for instant validation
2. **File Uploads**: Support for profile picture uploads
3. **Multi-step Verification**: Email/phone verification
4. **Social Login**: Google/Apple OAuth integration
5. **A/B Testing**: Different onboarding flows
