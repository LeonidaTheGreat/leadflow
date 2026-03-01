/**
 * Backend Structured Logger
 * 
 * Provides consistent, structured logging for Node.js backend services
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

const DEFAULT_CONFIG = {
  minLevel: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',
  redactFields: ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie', 'credit_card'],
}

/**
 * Redact sensitive data from log entries
 */
function redactSensitiveData(data, fieldsToRedact) {
  if (!data || typeof data !== 'object') return data

  const redacted = Array.isArray(data) ? [...data] : { ...data }

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase()
    if (fieldsToRedact.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]'
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key], fieldsToRedact)
    }
  }

  return redacted
}

/**
 * Format log entry as JSON
 */
function formatLogEntry(level, message, context, metadata, error) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    environment: DEFAULT_CONFIG.environment,
    service: 'leadflow-api',
    metadata: redactSensitiveData(metadata, DEFAULT_CONFIG.redactFields),
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      code: error.code,
      ...(DEFAULT_CONFIG.environment === 'development' && { stack: error.stack }),
    }
  }

  return entry
}

/**
 * Check if level should be logged
 */
function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[DEFAULT_CONFIG.minLevel]
}

/**
 * Output log entry
 */
function outputLog(level, entry) {
  const logMethod = level === 'fatal' ? 'error' : level
  const output = JSON.stringify(entry)

  // eslint-disable-next-line no-console
  console[logMethod](output)
}

/**
 * Main logger object
 */
const logger = {
  debug(message, context, metadata) {
    if (!shouldLog('debug')) return
    const entry = formatLogEntry('debug', message, context, metadata)
    outputLog('debug', entry)
  },

  info(message, context, metadata) {
    if (!shouldLog('info')) return
    const entry = formatLogEntry('info', message, context, metadata)
    outputLog('info', entry)
  },

  warn(message, context, metadata, error) {
    if (!shouldLog('warn')) return
    const entry = formatLogEntry('warn', message, context, metadata, error)
    outputLog('warn', entry)
  },

  error(message, error, context, metadata) {
    if (!shouldLog('error')) return
    const entry = formatLogEntry('error', message, context, metadata, error)
    outputLog('error', entry)
  },

  fatal(message, error, context, metadata) {
    const entry = formatLogEntry('fatal', message, context, metadata, error)
    outputLog('fatal', entry)
    
    // In production, could also send to error tracking service
    if (DEFAULT_CONFIG.environment === 'production') {
      // Integration with Sentry, etc.
    }
  },

  /**
   * Create child logger with predefined context
   */
  child(context) {
    return {
      debug: (message, metadata) => this.debug(message, context, metadata),
      info: (message, metadata) => this.info(message, context, metadata),
      warn: (message, metadata, error) => this.warn(message, context, metadata, error),
      error: (message, error, metadata) => this.error(message, error, context, metadata),
      fatal: (message, error, metadata) => this.fatal(message, error, context, metadata),
    }
  },

  /**
   * Log async operation with timing
   */
  async withLogging(operation, operationName, context) {
    const startTime = Date.now()
    const log = this.child(context || 'AsyncOperation')

    try {
      log.info(`Starting: ${operationName}`)
      const result = await operation()
      const duration = Date.now() - startTime
      log.info(`Completed: ${operationName}`, { durationMs: duration })
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      log.error(
        `Failed: ${operationName}`,
        error,
        { durationMs: duration }
      )
      throw error
    }
  },
}

/**
 * Request logging middleware for Express
 */
function requestLogger(req, res, next) {
  const startTime = Date.now()
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Attach request ID for tracking
  req.requestId = requestId
  res.setHeader('X-Request-ID', requestId)

  // Log request
  logger.info('Request started', 'HTTP', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  })

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const level = res.statusCode >= 400 ? 'warn' : 'info'
    
    logger[level]('Request completed', 'HTTP', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs: duration,
    })
  })

  next()
}

module.exports = { logger, requestLogger }
module.exports.logger = logger
module.exports.requestLogger = requestLogger
