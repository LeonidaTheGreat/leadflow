/**
 * Dashboard structured logger — JSON output for Vercel function logs.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('message', { key: 'value' })
 *   logger.error('failed', err)
 *   logger.info('lead:', leadId)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown> | unknown

function normalizeContext(ctx: LogContext): Record<string, unknown> | undefined {
  if (ctx === undefined || ctx === null) return undefined
  if (typeof ctx === 'object' && !Array.isArray(ctx) && !(ctx instanceof Error)) {
    return ctx as Record<string, unknown>
  }
  if (ctx instanceof Error) {
    return { error: ctx.message, stack: ctx.stack }
  }
  // Bare value (string, number, etc.) — wrap as detail
  return { detail: String(ctx) }
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const normalized = normalizeContext(context)
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalized,
  }
  const json = JSON.stringify(entry)
  switch (level) {
    case 'error': console.error(json); break
    case 'warn': console.warn(json); break
    default: console.log(json)
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => log('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => log('error', msg, ctx),
}
