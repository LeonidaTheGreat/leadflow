/**
 * Structured Logging Utility for LeadFlow
 * 
 * Provides consistent, structured logging across the application
 * with support for different log levels, contexts, and metadata.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  metadata?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
}

interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteUrl?: string
  environment: 'development' | 'staging' | 'production'
  redactFields: string[]
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',
  enableConsole: true,
  enableRemote: import.meta.env.VITE_ENABLE_REMOTE_LOGS === 'true',
  remoteUrl: import.meta.env.VITE_REMOTE_LOG_URL,
  environment: (import.meta.env.VITE_ENVIRONMENT as LoggerConfig['environment']) || 'development',
  redactFields: ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie'],
}

/**
 * Redact sensitive fields from metadata
 */
function redactSensitiveData(data: Record<string, unknown> | undefined, fieldsToRedact: string[]): Record<string, unknown> | undefined {
  if (!data) return undefined

  const redacted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    if (fieldsToRedact.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>, fieldsToRedact)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Format log entry for console output
 */
function formatConsoleOutput(entry: LogEntry): string {
  const { timestamp, level, message, context, metadata, error } = entry
  const levelEmoji = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    fatal: '💥',
  }[level]

  const contextStr = context ? ` [${context}]` : ''
  let output = `${levelEmoji} ${timestamp}${contextStr} ${message}`

  if (metadata && Object.keys(metadata).length > 0) {
    output += `\n   Metadata: ${JSON.stringify(metadata, null, 2)}`
  }

  if (error) {
    output += `\n   Error: ${error.name}: ${error.message}`
    if (error.stack && defaultConfig.environment === 'development') {
      output += `\n   Stack: ${error.stack}`
    }
  }

  return output
}

/**
 * Send log to remote server
 */
async function sendRemoteLog(entry: LogEntry): Promise<void> {
  if (!defaultConfig.enableRemote || !defaultConfig.remoteUrl) return

  try {
    // Use sendBeacon for better reliability during page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(entry)], { type: 'application/json' })
      navigator.sendBeacon(defaultConfig.remoteUrl, blob)
    } else {
      await fetch(defaultConfig.remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        keepalive: true,
      })
    }
  } catch {
    // Silent fail - don't create infinite loop
  }
}

/**
 * Main logger class
 */
class Logger {
  private config: LoggerConfig

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel]
  }

  /**
   * Create log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata: redactSensitiveData(metadata, this.config.redactFields),
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        code: (error as { code?: string }).code,
        ...(this.config.environment === 'development' && { stack: error.stack }),
      }
    }

    return entry
  }

  /**
   * Process and output log entry
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return

    const entry = this.createEntry(level, message, context, metadata, error)

    // Console output
    if (this.config.enableConsole) {
      const formatted = formatConsoleOutput(entry)
      // eslint-disable-next-line no-console
      switch (level) {
        case 'debug':
          console.debug(formatted)
          break
        case 'info':
          console.info(formatted)
          break
        case 'warn':
          console.warn(formatted)
          break
        case 'error':
        case 'fatal':
          console.error(formatted)
          break
      }
    }

    // Remote logging (fire and forget)
    if (this.config.enableRemote) {
      sendRemoteLog(entry).catch(() => {
        // Silent fail
      })
    }

    // In production, fatal errors should trigger error reporting service
    if (level === 'fatal' && this.config.environment === 'production') {
      // Could integrate with Sentry, LogRocket, etc.
      const win = typeof window !== 'undefined' ? window as unknown as { Sentry?: { captureException: (e: Error) => void } } : undefined
      if (win?.Sentry) {
        win.Sentry.captureException(error || new Error(message))
      }
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, context, metadata)
  }

  /**
   * Info level logging
   */
  info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, context, metadata)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: string, metadata?: Record<string, unknown>, error?: Error): void {
    this.log('warn', message, context, metadata, error)
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, context, metadata, error)
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, error?: Error, context?: string, metadata?: Record<string, unknown>): void {
    this.log('fatal', message, context, metadata, error)
  }

  /**
   * Create a child logger with predefined context
   */
  child(context: string): Logger {
    const childLogger = new Logger(this.config)
    const originalLog = this.log.bind(this)
    childLogger.log = (level: LogLevel, message: string, ctx?: string, meta?: Record<string, unknown>, err?: Error) => {
      originalLog(level, message, ctx || context, meta, err)
    }
    return childLogger
  }
}

// Export singleton instance
export const logger = new Logger()

// Re-export for testing and custom instances
export { Logger, type LogLevel, type LogEntry, type LoggerConfig }

/**
 * React hook for component-level logging
 */
export function useLogger(componentName: string) {
  return logger.child(componentName)
}

/**
 * Log async operation with automatic timing and error handling
 */
export async function withLogging<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: string
): Promise<T> {
  const startTime = performance.now()
  const log = context ? logger.child(context) : logger

  try {
    log.info(`Starting: ${operationName}`)
    const result = await operation()
    const duration = Math.round(performance.now() - startTime)
    log.info(`Completed: ${operationName}`, undefined, { durationMs: duration })
    return result
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    log.error(
      `Failed: ${operationName}`,
      error instanceof Error ? error : new Error(String(error)),
      undefined,
      { durationMs: duration }
    )
    throw error
  }
}
