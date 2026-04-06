/**
 * Legacy compatibility alias for /api/auth/trial-signup.
 *
 * The canonical endpoint is /api/auth/trial-signup. This handler forwards
 * POST requests so that documentation links, external integrations, and
 * marketing deep links using the old path continue to work.
 */
import { POST as authTrialSignupPOST } from '@/app/api/auth/trial-signup/route'

export { authTrialSignupPOST as POST }
