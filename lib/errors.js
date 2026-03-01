/**
 * Backend Error Handling Utilities
 * 
 * Server-side error handling for Node.js/Express APIs
 */

// Error class definitions (same as frontend for consistency)
class LeadFlowError extends Error {
  constructor(
    message,
    code = 'INTERNAL_ERROR',
    statusCode = 500,
    isOperational = true,
    context
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
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

class ValidationError extends LeadFlowError {
  constructor(message = 'Validation failed', fieldErrors, context) {
    super(message, 'VALIDATION_ERROR', 400, true, context)
    this.fieldErrors = fieldErrors
  }

  toJSON() {
    return {
      ...super.toJSON(),
      error: {
        ...super.toJSON().error,
        fieldErrors: this.fieldErrors,
      },
    }
  }
}

class AuthenticationError extends LeadFlowError {
  constructor(message = 'Authentication required', context) {
    super(message, 'AUTHENTICATION_ERROR', 401, true, context)
  }
}

class AuthorizationError extends LeadFlowError {
  constructor(message = 'Access denied', context) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, context)
  }
}

class NotFoundError extends LeadFlowError {
  constructor(resource = 'Resource', context) {
    super(`${resource} not found`, 'NOT_FOUND', 404, true, context)
  }
}

class ConflictError extends LeadFlowError {
  constructor(message = 'Resource already exists', context) {
    super(message, 'CONFLICT', 409, true, context)
  }
}

class RateLimitError extends LeadFlowError {
  constructor(message = 'Rate limit exceeded', retryAfter, context) {
    super(message, 'RATE_LIMIT', 429, true, context)
    this.retryAfter = retryAfter
  }

  toJSON() {
    return {
      ...super.toJSON(),
      error: {
        ...super.toJSON().error,
        retryAfter: this.retryAfter,
      },
    }
  }
}

class ExternalServiceError extends LeadFlowError {
  constructor(service, message, context) {
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

class DatabaseError extends LeadFlowError {
  constructor(message = 'Database error', context) {
    super(message, 'DATABASE_ERROR', 500, false, context)
  }
}

class ConfigurationError extends LeadFlowError {
  constructor(message = 'Configuration error', context) {
    super(message, 'CONFIGURATION_ERROR', 500, false, context)
  }
}

// Export error classes
module.exports = {
  LeadFlowError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  ConfigurationError,
}

/**
 * Express error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`

  // Log the error
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: req.url,
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
    },
    user: req.user?.id || 'anonymous',
  }

  // Log to stderr for errors
  if (err.statusCode >= 500 || !err.isOperational) {
    console.error('[ERROR]', JSON.stringify(logEntry))
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack)
    }
  } else {
    console.warn('[WARN]', JSON.stringify(logEntry))
  }

  // Handle LeadFlowError
  if (err instanceof LeadFlowError) {
    const response = err.toJSON()
    
    // Add retry-after header for rate limits
    if (err instanceof RateLimitError && err.retryAfter) {
      res.setHeader('Retry-After', err.retryAfter)
    }

    return res.status(err.statusCode).json(response)
  }

  // Handle specific database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Resource already exists',
        statusCode: 409,
      },
    })
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Referenced resource does not exist',
        statusCode: 400,
      },
    })
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid token',
        statusCode: 401,
      },
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Token expired',
        statusCode: 401,
      },
    })
  }

  // Default: 500 Internal Server Error
  const response = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An internal error occurred' 
        : err.message,
      statusCode: 500,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  }

  res.status(500).json(response)
}

/**
 * Async handler wrapper for Express routes
 * Automatically catches errors and passes to error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Request validation middleware
 */
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body)
      if (!result.success) {
        const fieldErrors = {}
        result.error.errors.forEach((err) => {
          const field = err.path.join('.')
          if (!fieldErrors[field]) {
            fieldErrors[field] = []
          }
          fieldErrors[field].push(err.message)
        })
        throw new ValidationError('Validation failed', fieldErrors)
      }
      req.validatedBody = result.data
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Authentication middleware
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'))
  }
  next()
}

/**
 * Authorization middleware
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'))
    }
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError(`Required role: ${roles.join(' or ')}`))
    }
    next()
  }
}

// Export middleware
module.exports.errorHandler = errorHandler
module.exports.asyncHandler = asyncHandler
module.exports.validateRequest = validateRequest
module.exports.requireAuth = requireAuth
module.exports.requireRole = requireRole
