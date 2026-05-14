'use client'

import type React from 'react'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Clock, Home, LogOut, Settings, Shield, User, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardNavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Lead Feed', icon: Home },
  { href: '/dashboard/history', label: 'History', icon: Clock },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/admin', label: 'Admin', icon: Shield, adminOnly: true },
  { href: '/dashboard/dev', label: 'Dev', icon: Wrench, adminOnly: true },
] as const

export function DashboardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem('leadflow_user')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        setUserName(user.name ?? user.email ?? user.id ?? null)
      } catch {
        // ignore malformed data
      }
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('leadflow_user')
    document.cookie = 'leadflow_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    router.push('/login')
    router.refresh()
  }

  const navItems = DASHBOARD_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
            const Icon = item.icon

            return (
              <a
                key={item.href}
                href={item.href}
                data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            )
          })}
        </div>

        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            data-testid="user-menu-button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            aria-label="User menu"
          >
            <User className="h-4 w-4" />
            {userName && <span className="hidden sm:inline">{userName}</span>}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-900 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 z-50">
              <button
                data-testid="user-menu-logout-button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
