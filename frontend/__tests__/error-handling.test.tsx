/**
 * Error Handling Tests
 * 
 * Tests for error handling and logging utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  LeadFlowError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  isLeadFlowError,
  normalizeError,
} from '@/lib/errors'
import { logger, withLogging } from '@/lib/logger'
import { formatApiError } from '@/lib/api-client'

describe('Error Classes', () => {
  it('should create LeadFlowError with correct properties', () => {
    const error = new LeadFlowError('Test error', 'TEST_ERROR', 400, true, { foo: 'bar' })
    
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_ERROR')
    expect(error.statusCode).toBe(400)
    expect(error.isOperational).toBe(true)
    expect(error.context).toEqual({ foo: 'bar' })
  })

  it('should convert error to JSON', () => {
    const error = new LeadFlowError('Test error', 'TEST_ERROR', 400)
    const json = error.toJSON()
    
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('TEST_ERROR')
    expect(json.error.message).toBe('Test error')
    expect(json.error.statusCode).toBe(400)
  })

  it('should create ValidationError with field errors', () => {
    const fieldErrors = { email: ['Required'], password: ['Too short'] }
    const error = new ValidationError('Validation failed', fieldErrors)
    
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.fieldErrors).toEqual(fieldErrors)
  })

  it('should create AuthenticationError with 401 status', () => {
    const error = new AuthenticationError('Invalid credentials')
    
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('AUTHENTICATION_ERROR')
  })

  it('should create NotFoundError with 404 status', () => {
    const error = new NotFoundError('User')
    
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('User not found')
    expect(error.code).toBe('NOT_FOUND')
  })

  it('should identify LeadFlowError correctly', () => {
    const leadFlowError = new LeadFlowError('Test')
    const regularError = new Error('Test')
    
    expect(isLeadFlowError(leadFlowError)).toBe(true)
    expect(isLeadFlowError(regularError)).toBe(false)
  })

  it('should normalize regular Error to LeadFlowError', () => {
    const regularError = new Error('Regular error')
    const normalized = normalizeError(regularError)
    
    expect(isLeadFlowError(normalized)).toBe(true)
    expect(normalized.message).toBe('Regular error')
    expect(normalized.code).toBe('INTERNAL_ERROR')
  })

  it('should normalize non-Error values', () => {
    const normalized = normalizeError('string error')
    
    expect(isLeadFlowError(normalized)).toBe(true)
    expect(normalized.message).toBe('string error')
  })
})

describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should log info message', () => {
    logger.info('Test message', 'TestContext', { key: 'value' })
    
    expect(console.info).toHaveBeenCalled()
    const callArg = (console.info as any).mock.calls[0][0]
    expect(callArg).toContain('Test message')
    expect(callArg).toContain('TestContext')
  })

  it('should redact sensitive data', () => {
    logger.info('Test', 'Context', { password: 'secret123', apiKey: 'key123' })
    
    const callArg = (console.info as any).mock.calls[0][0]
    expect(callArg).toContain('[REDACTED]')
    expect(callArg).not.toContain('secret123')
    expect(callArg).not.toContain('key123')
  })

  it('should create child logger with context', () => {
    const childLogger = logger.child('ChildContext')
    childLogger.info('Child message')
    
    const callArg = (console.info as any).mock.calls[0][0]
    expect(callArg).toContain('ChildContext')
    expect(callArg).toContain('Child message')
  })
})

describe('API Error Formatting', () => {
  it('should format ValidationError correctly', () => {
    const error = new ValidationError('Invalid', { email: ['Required'] })
    const formatted = formatApiError(error)
    
    expect(formatted.title).toBe('Validation Error')
    expect(formatted.message).toContain('1 field')
  })

  it('should format AuthenticationError correctly', () => {
    const error = new AuthenticationError('Session expired')
    const formatted = formatApiError(error)
    
    expect(formatted.title).toBe('Session Expired')
    expect(formatted.message).toContain('sign in')
  })

  it('should format NotFoundError correctly', () => {
    const error = new NotFoundError('User')
    const formatted = formatApiError(error)
    
    expect(formatted.title).toBe('Not Found')
    expect(formatted.message).toContain("couldn't be found")
  })

  it('should format generic error correctly', () => {
    const error = new Error('Generic error')
    const formatted = formatApiError(error)
    
    expect(formatted.title).toBe('Something Went Wrong')
    expect(formatted.message).toBe('Generic error')
  })
})

describe('withLogging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should log successful operation', async () => {
    const operation = vi.fn().mockResolvedValue('result')
    
    const result = await withLogging(operation, 'TestOp', 'TestContext')
    
    expect(result).toBe('result')
    expect(console.info).toHaveBeenCalledTimes(2) // Start and complete
  })

  it('should log failed operation', async () => {
    const error = new Error('Failed')
    const operation = vi.fn().mockRejectedValue(error)
    
    await expect(withLogging(operation, 'TestOp', 'TestContext')).rejects.toThrow('Failed')
    expect(console.error).toHaveBeenCalled()
  })
})
