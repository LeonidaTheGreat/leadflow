import { redirect } from 'next/navigation'

/**
 * Upgrade Page
 * 
 * Redirects to pricing page for expired trials
 * This handles AC-8: Expired trial users redirected to /upgrade
 */
export default function UpgradePage() {
  // Redirect to pricing page which handles plan selection and upgrade
  redirect('/pricing')
}
