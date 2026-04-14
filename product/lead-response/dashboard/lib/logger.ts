/**
 * Dashboard structured logger — JSON output for Vercel function logs.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('message', { key: 'value' })
 *   logger.error('failed', { error: err.message })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  }
  const json = JSON.stringify(entry)
  switch (level) {
    case 'error': console.error(json); break
    case 'warn': console.warn(json); break
    default: console.log(json)
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
}
