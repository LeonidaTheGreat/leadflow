/**
 * Error handling and logging utilities
 */

// Error classes
export {
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
  type ErrorResponse,
  isLeadFlowError,
  isOperationalError,
  normalizeError,
  createErrorFromResponse,
} from './errors'

// Logger
export {
  Logger,
  logger,
  useLogger,
  withLogging,
  type LogLevel,
  type LogEntry,
  type LoggerConfig,
} from './logger'

// API Client
export {
  apiClient,
  createApiClient,
  handleApiResponse,
  handleQueryError,
  formatApiError,
  type ApiResponse,
  type ApiClientConfig,
} from './api-client'

// Analytics Events
export {
  PostHogEvents,
  PageEvents,
  UserEvents,
  LeadEvents,
  FunnelEvents,
  ConversionEvents,
  FeatureEvents,
  IntegrationEvents,
  ErrorEvents,
  PerformanceEvents,
  NavigationEvents,
  type PostHogEventName,
  type EventProperties,
  type ConversionProperties,
  type LeadProperties,
  type PageViewProperties,
  type FeatureProperties,
  type ErrorProperties,
  type PerformanceProperties,
} from './analytics-events'
