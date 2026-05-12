/**
 * Email Configuration Validation
 * Ensures required environment variables are configured for email delivery
 */

import { logger } from '@/lib/logger'

// Domains not verified in Resend — sending from these causes silent delivery failures.
// landyourleads.com was the original default but was never added to the Resend account.
const UNVERIFIED_DOMAINS = ['landyourleads.com']

export interface EmailConfigValidation {
  isValid: boolean
  issues: string[]
  warnings: string[]
}

/**
 * Validate email configuration at startup
 * Logs issues and warnings without blocking the application
 */
export function validateEmailConfig(): EmailConfigValidation {
  const issues: string[] = []
  const warnings: string[] = []

  // Check RESEND_API_KEY
  // .trim() guards against trailing whitespace/newlines in env var values
  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  if (!resendApiKey) {
    issues.push(
      'RESEND_API_KEY is not configured. Email delivery will not work. ' +
        'See: https://resend.com/api-keys'
    )
  }

  // Check FROM_EMAIL
  // .trim() guards against trailing whitespace/newlines in env var values
  const fromEmail = (process.env.FROM_EMAIL || 'onboarding@leadflow.ai').trim()
  if (!process.env.FROM_EMAIL) {
    warnings.push(
      `FROM_EMAIL not configured, using default: ${fromEmail}`
    )
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(fromEmail)) {
    issues.push(`FROM_EMAIL appears invalid: ${fromEmail}`)
  }

  // Guard against domains known to be unverified in Resend — they cause silent delivery failures.
  const fromDomain = fromEmail.split('@')[1]?.toLowerCase()
  if (fromDomain && UNVERIFIED_DOMAINS.includes(fromDomain)) {
    issues.push(
      `FROM_EMAIL domain "${fromDomain}" is not verified with Resend. ` +
        'Emails will be silently blocked. Use onboarding@leadflow.ai or verify the domain at resend.com/domains.'
    )
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
  }
}

/**
 * Log email configuration status
 * Called at application startup to help diagnose email issues
 */
export function logEmailConfigStatus(): void {
  const validation = validateEmailConfig()

  if (!validation.isValid) {
    logger.error('Email Configuration Issues:')
    validation.issues.forEach((issue) => {
      logger.error(`   - ${issue}`)
    })
  }

  if (validation.warnings.length > 0) {
    logger.warn('Email Configuration Warnings:')
    validation.warnings.forEach((warning) => {
      logger.warn(`   - ${warning}`)
    })
  }

  if (validation.isValid && validation.warnings.length === 0) {
    logger.info('Email configuration looks good')
  }
}
