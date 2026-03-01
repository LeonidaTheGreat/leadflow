# Error Handling & Logging Standardization

This document outlines the standardized error handling and logging patterns used throughout the LeadFlow application.

## Table of Contents

- [Error Classes](#error-classes)
- [Logging](#logging)
- [Error Boundaries](#error-boundaries)
- [API Error Handling](#api-error-handling)
- [Best Practices](#best-practices)
- [Usage Examples](#usage-examples)

---

## Error Classes

All errors in the LeadFlow application extend from the base `LeadFlowError` class, providing consistent structure and behavior.

### Error Hierarchy

```
LeadFlowError (base class)
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── RateLimitError (429)
├── ExternalServiceError (502/503/504)
├── DatabaseError (500)
└── ConfigurationError (500)
```

### Error Properties

All error classes include:

- `message`: Human-readable error description
- `code`: Machine-readable error code (e.g., `VALIDATION_ERROR`)
- `statusCode`: HTTP status code
- `isOperational`: Whether error is expected (true) or programming error (false)
- `context`: Optional additional context data

### Usage

```typescript
import { ValidationError, NotFoundError } from '@/lib/errors'

// Throw a validation error with field errors
throw new ValidationError('Invalid input', {
  email: ['Email is required'],
  password: ['Password must be at least 8 characters']
})

// Throw a not found error
throw new NotFoundError('User', { userId: '123' })
```

---

## Logging

The logging utility provides structured, consistent logging across the application.

### Log Levels

- `debug`: Detailed information for debugging
- `info`: General informational messages
- `warn`: Warning messages for non-critical issues
- `error`: Error messages for failures
- `fatal`: Critical errors requiring immediate attention

### Basic Usage

```typescript
import { logger } from '@/lib/logger'

// Simple logging
logger.info('User logged in', 'Auth', { userId: '123' })
logger.error('Database connection failed', error, 'Database')

// With metadata
logger.info('Payment processed', 'Billing', {
  amount: 99.99,
  currency: 'USD',
  userId: '123'
})
```

### Component-Level Logging

```typescript
import { useLogger } from '@/lib/logger'

function MyComponent() {
  const log = useLogger('MyComponent')
  
  useEffect(() => {
    log.info('Component mounted')
  }, [log])
  
  return <div>...</div>
}
```

### Async Operation Logging

```typescript
import { withLogging } from '@/lib/logger'

const data = await withLogging(
  () => fetchUserData(userId),
  'Fetch user data',
  'UserService'
)
```

### Log Configuration

Environment variables control logging behavior:

```bash
VITE_LOG_LEVEL=debug          # Minimum log level
VITE_ENABLE_REMOTE_LOGS=true  # Enable remote logging
VITE_REMOTE_LOG_URL=https://... # Remote log endpoint
VITE_ENVIRONMENT=production   # Environment context
```

---

## Error Boundaries

Error boundaries catch JavaScript errors anywhere in their child component tree.

### Basic Usage

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />} context="App">
      <Router />
    </ErrorBoundary>
  )
}
```

### Section-Level Boundaries

```tsx
import { SectionErrorBoundary } from '@/components/ErrorBoundary'

function Dashboard() {
  return (
    <div>
      <SectionErrorBoundary sectionName="Analytics">
        <AnalyticsWidget />
      </SectionErrorBoundary>
      
      <SectionErrorBoundary sectionName="Recent Leads">
        <LeadsList />
      </SectionErrorBoundary>
    </div>
  )
}
```

### HOC Pattern

```tsx
import { withErrorBoundary } from '@/components/ErrorBoundary'

const SafeComponent = withErrorBoundary(RiskyComponent, {
  fallback: <ComponentErrorFallback />,
  context: 'RiskyComponent'
})
```

---

## API Error Handling

The API client standardizes error handling for HTTP requests.

### Making Requests

```typescript
import { apiClient } from '@/lib/api-client'

// GET request
const users = await apiClient.get<User[]>('/users')

// POST request
const newUser = await apiClient.post<User>('/users', { name: 'John' })

// PUT request
const updated = await apiClient.put<User>('/users/123', { name: 'Jane' })

// DELETE request
await apiClient.delete('/users/123')
```

### Handling Errors

```typescript
import { formatApiError } from '@/lib/api-client'
import { isLeadFlowError, ValidationError } from '@/lib/errors'

try {
  await apiClient.post('/users', userData)
} catch (error) {
  if (isLeadFlowError(error)) {
    if (error instanceof ValidationError) {
      // Handle validation errors
      console.log(error.fieldErrors)
    } else {
      // Handle other known errors
      const { title, message, action } = formatApiError(error)
      showErrorToast(title, message, action)
    }
  } else {
    // Handle unexpected errors
    logger.error('Unexpected error', error)
    showErrorToast('Error', 'Something went wrong')
  }
}
```

### Custom API Client

```typescript
import { createApiClient } from '@/lib/api-client'

const billingClient = createApiClient({
  baseURL: 'https://billing-api.leadflow.com',
  timeout: 60000,
  retries: 3,
  defaultHeaders: {
    'X-API-Version': 'v2'
  }
})
```

---

## Best Practices

### 1. Always Use Typed Errors

✅ **Good:**
```typescript
throw new ValidationError('Invalid email', { email: ['Invalid format'] })
```

❌ **Bad:**
```typescript
throw new Error('Invalid email')
```

### 2. Include Context

✅ **Good:**
```typescript
throw new NotFoundError('User', { userId, tenantId })
```

❌ **Bad:**
```typescript
throw new NotFoundError('User')
```

### 3. Distinguish Operational vs Programming Errors

Operational errors (expected, should be handled gracefully):
- Validation failures
- Authentication failures
- Rate limits
- Not found resources

Programming errors (unexpected, should be fixed):
- Null pointer exceptions
- Database connection failures
- Configuration errors

### 4. Log Appropriately

✅ **Good:**
```typescript
// Log at appropriate level
logger.debug('Processing item', 'Worker', { itemId })
logger.info('User action completed', 'Analytics', { action, userId })
logger.warn('Rate limit approaching', 'API', { current, limit })
logger.error('Critical failure', error, 'Database')
```

### 5. Don't Swallow Errors

✅ **Good:**
```typescript
try {
  await processPayment(data)
} catch (error) {
  logger.error('Payment failed', error)
  throw normalizeError(error) // Re-throw after logging
}
```

❌ **Bad:**
```typescript
try {
  await processPayment(data)
} catch (error) {
  console.log(error) // Silent failure
}
```

### 6. Use Error Boundaries Strategically

Place error boundaries at:
- App root (catches all unhandled errors)
- Major feature sections (isolates failures)
- Complex components (prevents cascading failures)

---

## Usage Examples

### Form Submission with Error Handling

```typescript
import { useState } from 'react'
import { apiClient, formatApiError } from '@/lib/api-client'
import { isLeadFlowError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

function useFormSubmit<T>(endpoint: string) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)

  const submit = async (data: T) => {
    setIsSubmitting(true)
    setFieldErrors({})
    setError(null)

    try {
      const result = await apiClient.post(endpoint, data)
      logger.info('Form submitted successfully', 'Form', { endpoint })
      return result
    } catch (err) {
      if (isLeadFlowError(err)) {
        if (err instanceof ValidationError && err.fieldErrors) {
          setFieldErrors(err.fieldErrors)
        } else {
          const formatted = formatApiError(err)
          setError(formatted.message)
        }
      } else {
        logger.error('Unexpected form submission error', err as Error)
        setError('An unexpected error occurred')
      }
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  return { submit, isSubmitting, fieldErrors, error }
}
```

### Data Fetching with Error Boundary

```tsx
import { useEffect, useState } from 'react'
import { ErrorBoundary, SectionErrorBoundary } from '@/components/ErrorBoundary'
import { apiClient } from '@/lib/api-client'

function UserProfile({ userId }: { userId: string }) {
  return (
    <SectionErrorBoundary sectionName="User Profile">
      <UserProfileContent userId={userId} />
    </SectionErrorBoundary>
  )
}

function UserProfileContent({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<User>(`/users/${userId}`)
      .then(setUser)
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <LoadingSpinner />
  if (!user) return <NotFoundState />

  return <UserDetails user={user} />
}
```

### Global Error Handler

```typescript
// In main.tsx or App.tsx
window.addEventListener('error', (event) => {
  logger.fatal('Unhandled error', event.error, 'Global')
  // Could also report to error tracking service
})

window.addEventListener('unhandledrejection', (event) => {
  logger.fatal('Unhandled promise rejection', event.reason, 'Global')
})
```

---

## Testing Error Handling

```typescript
import { describe, it, expect, vi } from 'vitest'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { handleApiResponse } from '@/lib/api-client'

describe('Error Handling', () => {
  it('should throw ValidationError for 400 response', async () => {
    const response = new Response(
      JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Invalid' } }),
      { status: 400 }
    )

    await expect(handleApiResponse(response)).rejects.toThrow(ValidationError)
  })

  it('should include field errors in ValidationError', async () => {
    const fieldErrors = { email: ['Required'] }
    const error = new ValidationError('Invalid', fieldErrors)
    
    expect(error.fieldErrors).toEqual(fieldErrors)
    expect(error.toJSON().error.fieldErrors).toEqual(fieldErrors)
  })
})
```

---

## Migration Guide

When updating existing code to use the standardized error handling:

1. Replace `throw new Error()` with appropriate `LeadFlowError` subclass
2. Replace `console.log/error` with `logger` calls
3. Add `ErrorBoundary` wrappers to major components
4. Update API calls to use `apiClient` for consistent error handling
5. Update error display logic to use `formatApiError()`

---

## Additional Resources

- [Error Classes](../frontend/src/lib/errors.ts)
- [Logger](../frontend/src/lib/logger.ts)
- [API Client](../frontend/src/lib/api-client.ts)
- [Error Boundary](../frontend/src/components/ErrorBoundary.tsx)
