/**
 * ERROR HANDLER - User-friendly error classification
 * 
 * Maps technical errors to user-friendly messages
 * Classifies errors for logging and UI display
 */

export type ErrorCategory = 
  | 'invalid_input'
  | 'not_found'
  | 'consent'
  | 'rate_limit'
  | 'timeout'
  | 'twilio'
  | 'ai'
  | 'server'
  | 'unknown';

export interface ErrorInfo {
  category: ErrorCategory;
  userMessage: string;
  userAction: string;
  statusCode: number;
  debugMessage: string;
  code: string;
  retryable: boolean;
}

export const ERROR_MAP: Record<string, ErrorInfo> = {
  // Input Validation
  'INVALID_PHONE': {
    category: 'invalid_input',
    userMessage: 'Invalid phone number format.',
    userAction: 'Check the lead\'s phone number and try again.',
    statusCode: 400,
    debugMessage: 'Phone number failed E.164 validation',
    code: 'INVALID_PHONE',
    retryable: false,
  },

  'MISSING_LEAD_ID': {
    category: 'invalid_input',
    userMessage: 'No lead selected.',
    userAction: 'Select a lead and try again.',
    statusCode: 400,
    debugMessage: 'lead_id missing from request',
    code: 'MISSING_LEAD_ID',
    retryable: false,
  },

  'MISSING_MESSAGE': {
    category: 'invalid_input',
    userMessage: 'Message cannot be empty.',
    userAction: 'Type a message and try again.',
    statusCode: 400,
    debugMessage: 'No message body provided',
    code: 'MISSING_MESSAGE',
    retryable: false,
  },

  // Not Found
  'LEAD_NOT_FOUND': {
    category: 'not_found',
    userMessage: 'Lead not found.',
    userAction: 'Refresh the page and try again.',
    statusCode: 404,
    debugMessage: 'Lead record does not exist',
    code: 'LEAD_NOT_FOUND',
    retryable: false,
  },

  'AGENT_NOT_FOUND': {
    category: 'not_found',
    userMessage: 'Agent not found.',
    userAction: 'Contact support.',
    statusCode: 404,
    debugMessage: 'Agent record does not exist',
    code: 'AGENT_NOT_FOUND',
    retryable: false,
  },

  // Consent Issues
  'LEAD_NOT_CONSENTED': {
    category: 'consent',
    userMessage: 'Lead has not opted in to SMS.',
    userAction: 'Add their consent and try again.',
    statusCode: 403,
    debugMessage: 'consent_sms is false',
    code: 'LEAD_NOT_CONSENTED',
    retryable: false,
  },

  'LEAD_OPTED_OUT': {
    category: 'consent',
    userMessage: 'Lead has opted out.',
    userAction: 'Cannot send SMS to opted-out leads.',
    statusCode: 403,
    debugMessage: 'Lead sent STOP or dnc=true',
    code: 'LEAD_OPTED_OUT',
    retryable: false,
  },

  'LEAD_ON_DNC': {
    category: 'consent',
    userMessage: 'Lead is on do-not-contact list.',
    userAction: 'Contact support to override.',
    statusCode: 403,
    debugMessage: 'Lead has dnc=true',
    code: 'LEAD_ON_DNC',
    retryable: false,
  },

  // Rate Limiting
  'RATE_LIMIT_EXCEEDED': {
    category: 'rate_limit',
    userMessage: 'Sending too many messages too quickly.',
    userAction: 'Wait a moment and try again.',
    statusCode: 429,
    debugMessage: 'Rate limit: 5 messages per lead per minute',
    code: 'RATE_LIMIT_EXCEEDED',
    retryable: true,
  },

  // Timeouts
  'AI_TIMEOUT': {
    category: 'timeout',
    userMessage: 'Suggestion taking longer than expected.',
    userAction: 'Try again or type your own message.',
    statusCode: 504,
    debugMessage: 'AI generation exceeded 5s timeout',
    code: 'AI_TIMEOUT',
    retryable: true,
  },

  'TWILIO_TIMEOUT': {
    category: 'timeout',
    userMessage: 'SMS service is slow. Please try again.',
    userAction: 'Wait a moment and try again.',
    statusCode: 504,
    debugMessage: 'Twilio API timeout after 10s',
    code: 'TWILIO_TIMEOUT',
    retryable: true,
  },

  // Twilio Errors
  'TWILIO_INVALID_NUMBER': {
    category: 'twilio',
    userMessage: 'Invalid phone number.',
    userAction: 'Check the lead\'s phone number format.',
    statusCode: 400,
    debugMessage: 'Twilio: Invalid phone number format',
    code: 'TWILIO_INVALID_NUMBER',
    retryable: false,
  },

  'TWILIO_UNABLE_ROUTE': {
    category: 'twilio',
    userMessage: 'Cannot send to this phone number.',
    userAction: 'Check if the number is valid and active.',
    statusCode: 400,
    debugMessage: 'Twilio: Unable to route message to destination',
    code: 'TWILIO_UNABLE_ROUTE',
    retryable: false,
  },

  'TWILIO_CARRIER_ERROR': {
    category: 'twilio',
    userMessage: 'Failed to send SMS.',
    userAction: 'Try again or call the lead instead.',
    statusCode: 503,
    debugMessage: 'Twilio: Carrier returned error',
    code: 'TWILIO_CARRIER_ERROR',
    retryable: true,
  },

  'TWILIO_API_ERROR': {
    category: 'twilio',
    userMessage: 'Failed to send SMS.',
    userAction: 'Check your internet and try again.',
    statusCode: 503,
    debugMessage: 'Twilio API returned error',
    code: 'TWILIO_API_ERROR',
    retryable: true,
  },

  'TWILIO_AUTH_ERROR': {
    category: 'twilio',
    userMessage: 'SMS service configuration error.',
    userAction: 'Contact support.',
    statusCode: 500,
    debugMessage: 'Twilio authentication failed',
    code: 'TWILIO_AUTH_ERROR',
    retryable: false,
  },

  // AI Errors
  'AI_GENERATION_FAILED': {
    category: 'ai',
    userMessage: 'Could not generate suggestion.',
    userAction: 'Try again or type your own message.',
    statusCode: 503,
    debugMessage: 'AI generation failed',
    code: 'AI_GENERATION_FAILED',
    retryable: true,
  },

  'AI_API_ERROR': {
    category: 'ai',
    userMessage: 'AI service is unavailable.',
    userAction: 'Type your own message or try again later.',
    statusCode: 503,
    debugMessage: 'AI API returned error',
    code: 'AI_API_ERROR',
    retryable: true,
  },

  // Server Errors
  'DATABASE_ERROR': {
    category: 'server',
    userMessage: 'Database error occurred.',
    userAction: 'Refresh the page and try again.',
    statusCode: 500,
    debugMessage: 'Database operation failed',
    code: 'DATABASE_ERROR',
    retryable: true,
  },

  'INTERNAL_ERROR': {
    category: 'server',
    userMessage: 'Something went wrong.',
    userAction: 'Try again or contact support.',
    statusCode: 500,
    debugMessage: 'Internal server error',
    code: 'INTERNAL_ERROR',
    retryable: true,
  },
};

/**
 * Get error info by code
 */
export function getErrorInfo(code: string): ErrorInfo {
  return ERROR_MAP[code] || ERROR_MAP['INTERNAL_ERROR'];
}

/**
 * Classify Twilio error based on error code
 */
export function classifyTwilioError(errorCode?: string, errorMessage?: string): ErrorInfo {
  if (!errorCode) return getErrorInfo('TWILIO_API_ERROR');

  const code = Number(errorCode);

  // https://www.twilio.com/docs/api/errors
  switch (code) {
    case 21211: // Invalid to number
      return getErrorInfo('TWILIO_INVALID_NUMBER');
    case 21612: // Cannot route message
      return getErrorInfo('TWILIO_UNABLE_ROUTE');
    case 21614: // Invalid from number
      return getErrorInfo('TWILIO_INVALID_NUMBER');
    case 21615: // Missing to number
      return getErrorInfo('MISSING_MESSAGE');
    case 31000: // Queue overflow
      return getErrorInfo('TWILIO_API_ERROR');
    case 32603: // Carrier connectivity error
      return getErrorInfo('TWILIO_CARRIER_ERROR');
    case 20003: // Invalid credentials
      return getErrorInfo('TWILIO_AUTH_ERROR');
    default:
      return getErrorInfo('TWILIO_API_ERROR');
  }
}

/**
 * Classify AI error based on error message
 */
export function classifyAiError(error: any): ErrorInfo {
  const message = (error?.message || '').toLowerCase();

  if (message.includes('timeout')) {
    return getErrorInfo('AI_TIMEOUT');
  }
  if (message.includes('auth') || message.includes('api key')) {
    return getErrorInfo('TWILIO_AUTH_ERROR');
  }
  if (message.includes('rate')) {
    return getErrorInfo('RATE_LIMIT_EXCEEDED');
  }

  return getErrorInfo('AI_API_ERROR');
}

/**
 * Create response for error
 */
export function createErrorResponse(code: string, debugContext?: Record<string, any>) {
  const error = getErrorInfo(code);

  return {
    statusCode: error.statusCode,
    response: {
      error: error.userMessage,
      action: error.userAction,
      code: error.code,
      category: error.category,
      retryable: error.retryable,
    },
    debug: {
      message: error.debugMessage,
      context: debugContext,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Log error with context
 */
export function logError(
  code: string,
  context: Record<string, any>,
  originalError?: any
) {
  const error = getErrorInfo(code);
  const timestamp = new Date().toISOString();

  console.error(`❌ [${timestamp}] ${code}:`, {
    category: error.category,
    userMessage: error.userMessage,
    debugMessage: error.debugMessage,
    context,
    originalError: originalError?.message,
  });

  // TODO: Send to error tracking service (Sentry, etc)
  // captureException(code, { extra: { context, originalError } });
}
