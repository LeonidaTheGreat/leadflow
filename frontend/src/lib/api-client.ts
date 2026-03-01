/**
 * API Error Handling Utilities
 * 
 * Standardizes API error responses and provides utilities for
 * consistent error handling across the application.
 */

import {
  LeadFlowError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  type ErrorResponse,
} from '@/lib/errors'
import { logger } from '@/lib/logger'

/**
 * Standard API response interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    statusCode: number
    fieldErrors?: Record<string, string[]>
    retryAfter?: number
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
    timestamp: string
    requestId: string
  }
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseURL: string
  defaultHeaders?: Record<string, string>
  timeout?: number
  retries?: number
  retryDelay?: number
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Handle HTTP response and convert errors to LeadFlowError types
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  const requestId = response.headers.get('X-Request-ID') || 'unknown'
  
  if (!response.ok) {
    let errorData: ErrorResponse['error'] | undefined
    
    try {
      const body = await response.json()
      errorData = body.error
    } catch {
      // If JSON parsing fails, use status text
      errorData = {
        code: 'HTTP_ERROR',
        message: response.statusText,
        statusCode: response.status,
      }
    }

    // Log the error
    logger.error(
      `API error: ${response.status} ${response.statusText}`,
      undefined,
      'API',
      {
        statusCode: response.status,
        requestId,
        url: response.url,
        errorCode: errorData?.code,
      }
    )

    // Convert to appropriate error type
    throw createErrorFromStatusCode(response.status, errorData)
  }

  // Handle empty responses
  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json()
  return data.data ?? data
}

/**
 * Create appropriate error from HTTP status code
 */
function createErrorFromStatusCode(
  statusCode: number,
  errorData?: ErrorResponse['error']
): LeadFlowError {
  const message = errorData?.message || 'Request failed'
  const context = { requestId: errorData?.code }

  switch (statusCode) {
    case 400:
      return new ValidationError(message, errorData?.fieldErrors, context)
    case 401:
      return new AuthenticationError(message, context)
    case 403:
      return new AuthorizationError(message, context)
    case 404:
      return new NotFoundError('Resource', context)
    case 409:
      return new ConflictError(message, context)
    case 429:
      return new RateLimitError(message, errorData?.retryAfter, context)
    case 502:
    case 503:
    case 504:
      return new ExternalServiceError('API', message, context)
    default:
      return new LeadFlowError(
        message,
        errorData?.code || 'API_ERROR',
        statusCode,
        true,
        context
      )
  }
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LeadFlowError(
        'Request timeout',
        'REQUEST_TIMEOUT',
        408,
        true,
        { url }
      )
    }
    throw error
  }
}

/**
 * Retry logic for failed requests
 */
async function retryFetch(
  fetchFn: () => Promise<Response>,
  retries: number,
  delayMs: number
): Promise<Response> {
  let lastError: Error | undefined

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetchFn()
      
      // Only retry on specific status codes
      if (response.status >= 500 || response.status === 429) {
        if (i < retries) {
          const delay = delayMs * Math.pow(2, i) // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (i < retries) {
        const delay = delayMs * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Create configured API client
 */
export function createApiClient(config: ApiClientConfig) {
  const { baseURL, defaultHeaders = {}, timeout = 30000, retries = 2, retryDelay = 1000 } = config

  async function request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${baseURL}${endpoint}`
    const requestId = generateRequestId()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...defaultHeaders,
      ...(options.headers as Record<string, string> || {}),
    }

    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('leadflow_token') : null
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers,
    }

    const startTime = performance.now()

    try {
      const response = await retryFetch(
        () => fetchWithTimeout(url, fetchOptions, timeout),
        retries,
        retryDelay
      )

      const duration = Math.round(performance.now() - startTime)
      
      // Log successful request
      logger.debug(
        `API request completed: ${options.method || 'GET'} ${endpoint}`,
        'API',
        {
          durationMs: duration,
          statusCode: response.status,
          requestId,
        }
      )

      return handleApiResponse<T>(response)
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      
      // Log failed request
      logger.error(
        `API request failed: ${options.method || 'GET'} ${endpoint}`,
        error instanceof Error ? error : new Error(String(error)),
        'API',
        {
          durationMs: duration,
          requestId,
        }
      )

      throw error
    }
  }

  return {
    get: <T>(endpoint: string, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'GET' }),
    
    post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
    
    put: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    
    patch: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    
    delete: <T>(endpoint: string, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'DELETE' }),
  }
}

/**
 * Error handler for React Query / SWR
 */
export function handleQueryError(error: unknown): LeadFlowError {
  if (error instanceof LeadFlowError) {
    return error
  }

  if (error instanceof Error) {
    return new LeadFlowError(
      error.message,
      'QUERY_ERROR',
      500,
      false,
      { originalName: error.name }
    )
  }

  return new LeadFlowError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500,
    false
  )
}

/**
 * Format API error for display to user
 */
export function formatApiError(error: unknown): {
  title: string
  message: string
  action?: string
} {
  if (error instanceof ValidationError && error.fieldErrors) {
    const fieldCount = Object.keys(error.fieldErrors).length
    return {
      title: 'Validation Error',
      message: `Please check ${fieldCount} field${fieldCount > 1 ? 's' : ''} and try again.`,
      action: 'Review the highlighted fields above.',
    }
  }

  if (error instanceof AuthenticationError) {
    return {
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again.',
      action: 'Redirecting to login...',
    }
  }

  if (error instanceof AuthorizationError) {
    return {
      title: 'Access Denied',
      message: "You don't have permission to perform this action.",
      action: 'Contact support if you believe this is an error.',
    }
  }

  if (error instanceof NotFoundError) {
    return {
      title: 'Not Found',
      message: "The requested resource couldn't be found.",
      action: 'Please check the URL or try again.',
    }
  }

  if (error instanceof RateLimitError) {
    const retryText = error.retryAfter 
      ? ` Try again in ${error.retryAfter} seconds.`
      : ''
    return {
      title: 'Too Many Requests',
      message: `You've made too many requests.${retryText}`,
      action: 'Please wait before trying again.',
    }
  }

  if (error instanceof ExternalServiceError) {
    return {
      title: 'Service Unavailable',
      message: 'A dependent service is temporarily unavailable.',
      action: 'Please try again in a few moments.',
    }
  }

  // Generic error
  return {
    title: 'Something Went Wrong',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    action: 'Please try again or contact support if the problem persists.',
  }
}

/**
 * Default API client instance
 */
export const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  retries: 2,
})
