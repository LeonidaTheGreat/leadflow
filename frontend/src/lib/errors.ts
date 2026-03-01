/**
 * Standardized Error Classes for LeadFlow
 * 
 * Provides a hierarchy of error types for different scenarios,
 * enabling consistent error handling across the application.
 */

/**
 * Base error class for all LeadFlow application errors
 */
export class LeadFlowError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, unknown>

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to a standardized JSON response
   */
  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        ...(process.env.NODE_ENV === 'development' && {
          stack: this.stack,
          context: this.context,
        }),
      },
    }
  }
}

/**
 * Validation errors - 400 Bad Request
 */
export class ValidationError extends LeadFlowError {
  public readonly fieldErrors?: Record<string, string[]>

  constructor(
    message: string = 'Validation failed',
    fieldErrors?: Record<string, string[]>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, context)
    this.fieldErrors = fieldErrors
  }

  toJSON(): ErrorResponse {
    return {
      ...super.toJSON(),
      error: {
        ...super.toJSON().error,
        fieldErrors: this.fieldErrors,
      },
    }
  }
}

/**
 * Authentication errors - 401 Unauthorized
 */
export class AuthenticationError extends LeadFlowError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, true, context)
  }
}

/**
 * Authorization errors - 403 Forbidden
 */
export class AuthorizationError extends LeadFlowError {
  constructor(message: string = 'Access denied', context?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, context)
  }
}

/**
 * Not found errors - 404 Not Found
 */
export class NotFoundError extends LeadFlowError {
  constructor(resource: string = 'Resource', context?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, true, context)
  }
}

/**
 * Conflict errors - 409 Conflict
 */
export class ConflictError extends LeadFlowError {
  constructor(message: string = 'Resource already exists', context?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, true, context)
  }
}

/**
 * Rate limit errors - 429 Too Many Requests
 */
export class RateLimitError extends LeadFlowError {
  public readonly retryAfter?: number

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, context?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT', 429, true, context)
    this.retryAfter = retryAfter
  }

  toJSON(): ErrorResponse {
    return {
      ...super.toJSON(),
      error: {
        ...super.toJSON().error,
        retryAfter: this.retryAfter,
      },
    }
  }
}

/**
 * External service errors - 502/503/504
 */
export class ExternalServiceError extends LeadFlowError {
  public readonly service: string

  constructor(service: string, message?: string, context?: Record<string, unknown>) {
    super(
      message || `External service '${service}' error`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      true,
      context
    )
    this.service = service
  }
}

/**
 * Database errors
 */
export class DatabaseError extends LeadFlowError {
  constructor(message: string = 'Database error', context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, false, context)
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends LeadFlowError {
  constructor(message: string = 'Configuration error', context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', 500, false, context)
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    statusCode: number
    stack?: string
    context?: Record<string, unknown>
    fieldErrors?: Record<string, string[]>
    retryAfter?: number
  }
}

/**
 * Type guard to check if error is a LeadFlowError
 */
export function isLeadFlowError(error: unknown): error is LeadFlowError {
  return error instanceof LeadFlowError
}

/**
 * Type guard to check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (isLeadFlowError(error)) {
    return error.isOperational
  }
  return false
}

/**
 * Convert unknown error to LeadFlowError
 */
export function normalizeError(error: unknown): LeadFlowError {
  if (isLeadFlowError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new LeadFlowError(
      error.message,
      'INTERNAL_ERROR',
      500,
      false,
      { originalError: error.name }
    )
  }

  return new LeadFlowError(
    String(error) || 'Unknown error',
    'UNKNOWN_ERROR',
    500,
    false
  )
}

/**
 * HTTP status code to error class mapping
 */
export const statusCodeToErrorClass: Record<number, new (...args: any[]) => LeadFlowError> = {
  400: ValidationError,
  401: AuthenticationError,
  403: AuthorizationError,
  404: NotFoundError,
  409: ConflictError,
  429: RateLimitError,
}

/**
 * Create error from HTTP response
 */
export function createErrorFromResponse(statusCode: number, message?: string, context?: Record<string, unknown>): LeadFlowError {
  const ErrorClass = statusCodeToErrorClass[statusCode]
  if (ErrorClass) {
    return new ErrorClass(message, context)
  }
  return new LeadFlowError(message || 'Request failed', 'REQUEST_ERROR', statusCode, true, context)
}
