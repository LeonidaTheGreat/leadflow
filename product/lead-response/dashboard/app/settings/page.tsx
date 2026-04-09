'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Plug, Bell, ChevronRight, CreditCard } from 'lucide-react'
import { useAnalytics, PostHogEvents } from '@/lib/analytics'
import { BillingCard } from '@/components/billing'
import { SatisfactionPingToggle } from '@/components/dashboard/SatisfactionPingToggle'

export default function SettingsPage() {
  const router = useRouter()
  const { track } = useAnalytics()
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    track(PostHogEvents.SETTINGS_PAGE_VIEWED, {
      tab: activeTab,
    })
  }, [track, activeTab])

  const handleIntegrationConnect = (integrationName: string) => {
    track(PostHogEvents.SETTINGS_INTEGRATION_CONNECTED, {
      integration_name: integrationName,
      integration_category: 'crm',
    })
  }

  const handleNotificationUpdate = (notificationType: string, enabled: boolean) => {
    track(PostHogEvents.SETTINGS_NOTIFICATIONS_UPDATED, {
      notification_type: notificationType,
      enabled,
    })
  }

  // TODO: Get actual agent ID from auth context/session
  const agentId = 'test-agent-id'

  const settingsSections = [
    {
      id: 'profile',
      label: 'Profile Settings',
      description: 'Update your personal information and business details',
      icon: User,
      href: '/profile',
      color: 'bg-blue-500',
    },
    {
      id: 'integrations',
      label: 'Integrations',
      description: 'Connect FUB, Twilio, Cal.com and other services',
      icon: Plug,
      href: '/integrations',
      color: 'bg-emerald-500',
    },
    {
      id: 'billing',
      label: 'Billing & Subscription',
      description: 'Manage your subscription, payment methods, and invoices',
      icon: CreditCard,
      href: '#billing',
      color: 'bg-purple-500',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Manage your notification preferences',
      icon: Bell,
      href: '#notifications',
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your account, integrations, and preferences
          </p>
        </div>
      </div>

      {/* Settings Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              if (section.href.startsWith('/')) {
                router.push(section.href)
              } else {
                setActiveTab(section.id)
              }
            }}
            className="flex items-start gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left group"
          >
            <div className={`w-12 h-12 ${section.color}/10 rounded-lg flex items-center justify-center shrink-0`}>
              <section.icon className={`w-6 h-6 ${section.color.replace('bg-', 'text-')}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {section.label}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {section.description}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
          </button>
        ))}
      </div>

      {/* Billing Section (inline) */}
      <div id="billing">
        <BillingCard agentId={agentId} />
      </div>

      {/* Notifications Section (inline) */}
      <div id="notifications" className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            Notification Preferences
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Choose how you want to be notified about lead activities
          </p>
        </div>
        <div className="p-6 space-y-4">
          <NotificationToggle
            label="New Lead Alerts"
            description="Get notified when a new lead is created"
            defaultChecked={true}
            onChange={(enabled) => handleNotificationUpdate('new_lead', enabled)}
          />
          <NotificationToggle
            label="SMS Responses"
            description="Get notified when a lead responds via SMS"
            defaultChecked={true}
            onChange={(enabled) => handleNotificationUpdate('sms_response', enabled)}
          />
          <NotificationToggle
            label="Weekly Reports"
            description="Receive weekly performance reports"
            defaultChecked={false}
            onChange={(enabled) => handleNotificationUpdate('weekly_report', enabled)}
          />
          <NotificationToggle
            label="Integration Alerts"
            description="Get notified about integration issues or disconnections"
            defaultChecked={true}
            onChange={(enabled) => handleNotificationUpdate('integration_alerts', enabled)}
          />
        </div>
      </div>

      {/* AI Preferences */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Preferences</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configure how the AI interacts with your leads
          </p>
        </div>
        <div className="p-6">
          {/* TODO: replace 'test-agent-id' with real agentId from session once auth is wired up */}
          <SatisfactionPingToggle agentId={agentId} />
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6">
        <h3 className="font-medium text-slate-900 dark:text-white mb-4">Quick Links</h3>
        <div className="flex flex-wrap gap-3">
          <a
            href="/profile"
            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Edit Profile
          </a>
          <a
            href="/integrations"
            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Manage Integrations
          </a>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

interface IntegrationCardProps {
  name: string
  description: string
  connected: boolean
  onConnect: () => void
}

function IntegrationCard({ name, description, connected, onConnect }: IntegrationCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
      <div>
        <h4 className="font-medium text-slate-900 dark:text-white">{name}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      <button
        onClick={onConnect}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          connected
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
        }`}
      >
        {connected ? 'Connected' : 'Connect'}
      </button>
    </div>
  )
}

interface NotificationToggleProps {
  label: string
  description: string
  defaultChecked?: boolean
  onChange: (enabled: boolean) => void
}

function NotificationToggle({ label, description, defaultChecked = false, onChange }: NotificationToggleProps) {
  const [enabled, setEnabled] = useState(defaultChecked)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked
    setEnabled(newValue)
    onChange(newValue)
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-medium text-slate-900 dark:text-white">{label}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
      </label>
    </div>
  )
}
