/**
 * Instrumentation hook for Next.js
 * Runs at server startup to validate configuration
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on the server
    const { logEmailConfigStatus } = await import(
      './lib/email-config-validation'
    )
    logEmailConfigStatus()
  }
}
