/**
 * Email Configuration Validation
 * Ensures required environment variables are configured for email delivery
 */

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
  const fromEmail = (process.env.FROM_EMAIL || 'stojan@leadflow.ai').trim()
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
    console.error('❌ Email Configuration Issues:')
    validation.issues.forEach((issue) => {
      console.error(`   - ${issue}`)
    })
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Email Configuration Warnings:')
    validation.warnings.forEach((warning) => {
      console.warn(`   - ${warning}`)
    })
  }

  if (validation.isValid && validation.warnings.length === 0) {
    console.log('✅ Email configuration looks good')
  }
}
