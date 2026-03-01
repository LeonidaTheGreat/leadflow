'use client'

import { useState, useEffect } from 'react'
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Key,
  Phone,
  Calendar,
  Building2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAnalytics, PostHogEvents } from '@/lib/analytics'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  loading: boolean
  error: string
  config: Record<string, any>
}

export default function IntegrationsPage() {
  const { track } = useAnalytics()
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'fub',
      name: 'Follow Up Boss',
      description: 'Sync leads automatically from your FUB account',
      icon: '🏠',
      connected: false,
      loading: false,
      error: '',
      config: { apiKey: '' },
    },
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'Send and receive SMS messages with leads',
      icon: '💬',
      connected: false,
      loading: false,
      error: '',
      config: { phoneNumber: '', accountSid: '', authToken: '' },
    },
    {
      id: 'calcom',
      name: 'Cal.com',
      description: 'Let leads book appointments directly in your calendar',
      icon: '📅',
      connected: false,
      loading: false,
      error: '',
      config: { bookingLink: '' },
    },
  ])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadIntegrationStatus()
    track(PostHogEvents.SETTINGS_PAGE_VIEWED, { tab: 'integrations' })
  }, [track])

  const loadIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status')
      if (response.ok) {
        const data = await response.json()
        setIntegrations((prev) =>
          prev.map((int) => ({
            ...int,
            connected: data[int.id]?.connected || false,
            config: { ...int.config, ...data[int.id]?.config },
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load integration status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === integrationId ? { ...int, loading: true, error: '' } : int
      )
    )

    const integration = integrations.find((i) => i.id === integrationId)
    if (!integration) return

    try {
      let response

      switch (integrationId) {
        case 'fub':
          response = await fetch('/api/integrations/fub/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: integration.config.apiKey }),
          })
          break
        case 'twilio':
          response = await fetch('/api/integrations/twilio/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber: integration.config.phoneNumber,
              accountSid: integration.config.accountSid,
              authToken: integration.config.authToken,
            }),
          })
          break
        case 'calcom':
          response = await fetch('/api/integrations/cal-com/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calcomLink: integration.config.bookingLink }),
          })
          break
        default:
          throw new Error('Unknown integration')
      }

      const data = await response.json()

      if (response.ok && data.valid !== false) {
        setIntegrations((prev) =>
          prev.map((int) =>
            int.id === integrationId
              ? { ...int, connected: true, loading: false }
              : int
          )
        )
        track(PostHogEvents.SETTINGS_INTEGRATION_CONNECTED, {
          integration_name: integrationId,
        })
        setExpandedId(null)
      } else {
        throw new Error(data.message || 'Failed to connect')
      }
    } catch (error: any) {
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === integrationId
            ? { ...int, loading: false, error: error.message }
            : int
        )
      )
      track(PostHogEvents.ERROR_OCCURRED, {
        error_type: 'integration_connect_failed',
        integration: integrationId,
      })
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === integrationId ? { ...int, loading: true } : int
      )
    )

    try {
      await fetch(`/api/integrations/${integrationId}/disconnect`, {
        method: 'POST',
      })

      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === integrationId
            ? { ...int, connected: false, loading: false, config: {} }
            : int
        )
      )
    } catch (error) {
      console.error('Disconnect error:', error)
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === integrationId ? { ...int, loading: false } : int
        )
      )
    }
  }

  const updateConfig = (integrationId: string, key: string, value: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === integrationId
          ? { ...int, config: { ...int.config, [key]: value }, error: '' }
          : int
      )
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Integrations</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Connect your tools to unlock the full power of LeadFlow AI
        </p>
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
          >
            {/* Header */}
            <div
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() =>
                setExpandedId(expandedId === integration.id ? null : integration.id)
              }
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                  {integration.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {integration.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {integration.connected ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                    <Plug className="w-4 h-4" />
                    Not connected
                  </span>
                )}
                {expandedId === integration.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>

            {/* Expanded Configuration */}
            {expandedId === integration.id && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-800/30">
                {integration.id === 'fub' && (
                  <FUBConfig
                    config={integration.config}
                    onChange={(key, value) => updateConfig(integration.id, key, value)}
                    error={integration.error}
                  />
                )}
                {integration.id === 'twilio' && (
                  <TwilioConfig
                    config={integration.config}
                    onChange={(key, value) => updateConfig(integration.id, key, value)}
                    error={integration.error}
                  />
                )}
                {integration.id === 'calcom' && (
                  <CalComConfig
                    config={integration.config}
                    onChange={(key, value) => updateConfig(integration.id, key, value)}
                    error={integration.error}
                  />
                )}

                {/* Error */}
                {integration.error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{integration.error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  {integration.connected ? (
                    <>
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        disabled={integration.loading}
                        className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        {integration.loading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Disconnect'
                        )}
                      </button>
                      <button
                        onClick={() => handleConnect(integration.id)}
                        disabled={integration.loading}
                        className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {integration.loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Update Connection
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.id)}
                      disabled={integration.loading}
                      className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {integration.loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plug className="w-4 h-4" />
                          Connect {integration.name}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Integration Help */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
          Need help with integrations?
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
          Check our documentation or contact support for assistance with setting up your integrations.
        </p>
        <a
          href="#"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Integration Docs
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}

// FUB Config Component
function FUBConfig({
  config,
  onChange,
  error,
}: {
  config: Record<string, any>
  onChange: (key: string, value: string) => void
  error: string
}) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <Building2 className="w-4 h-4 inline mr-2" />
          Follow Up Boss API Key
        </label>
        <div className="relative">
          <Key className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
          <input
            type={showKey ? 'text' : 'password'}
            value={config.apiKey || ''}
            onChange={(e) => onChange('apiKey', e.target.value)}
            placeholder="Enter your FUB API key"
            className="w-full pl-10 pr-20 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-2.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Find your API key in{' '}
          <a
            href="https://followupboss.com/account/api/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            FUB Settings <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  )
}

// Twilio Config Component
function TwilioConfig({
  config,
  onChange,
  error,
}: {
  config: Record<string, any>
  onChange: (key: string, value: string) => void
  error: string
}) {
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <Phone className="w-4 h-4 inline mr-2" />
          Twilio Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
          <input
            type="tel"
            value={config.phoneNumber || ''}
            onChange={(e) => onChange('phoneNumber', formatPhone(e.target.value))}
            placeholder="555-123-4567"
            maxLength={12}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Account SID
        </label>
        <input
          type="text"
          value={config.accountSid || ''}
          onChange={(e) => onChange('accountSid', e.target.value)}
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Auth Token
        </label>
        <input
          type="password"
          value={config.authToken || ''}
          onChange={(e) => onChange('authToken', e.target.value)}
          placeholder="Your Twilio auth token"
          className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
        <p className="mt-1 text-xs text-slate-500">
          Find these credentials in your{' '}
          <a
            href="https://console.twilio.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            Twilio Console <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  )
}

// Cal.com Config Component
function CalComConfig({
  config,
  onChange,
  error,
}: {
  config: Record<string, any>
  onChange: (key: string, value: string) => void
  error: string
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-2" />
          Cal.com Booking Link
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
          <input
            type="url"
            value={config.bookingLink || ''}
            onChange={(e) => onChange('bookingLink', e.target.value)}
            placeholder="https://cal.com/yourname"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Don't have Cal.com?{' '}
          <a
            href="https://cal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            Create a free account <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  )
}