/**
 * Backend Library Exports
 * 
 * Centralized exports for backend utilities
 */

// Error handling
const {
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
  errorHandler,
  asyncHandler,
  validateRequest,
  requireAuth,
  requireRole,
} = require('./errors')

// Logger
const { logger, requestLogger } = require('./logger')

module.exports = {
  // Errors
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
  
  // Middleware
  errorHandler,
  asyncHandler,
  validateRequest,
  requireAuth,
  requireRole,
  
  // Logger
  logger,
  requestLogger,
}
