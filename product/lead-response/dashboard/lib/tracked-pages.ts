export function isTrackedPage(pathname: string): boolean {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return true
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return true
  return false
}

export const TRACKED_PAGES = [
  '/dashboard',
  '/dashboard/conversations',
  '/dashboard/settings',
  '/dashboard/billing',
  '/settings',
  '/settings/billing',
]
