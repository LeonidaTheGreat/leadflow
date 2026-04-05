/**
 * Referral Program Widget Component
 * Displays referral link, stats, and actions for paid agents
 */

'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, Zap } from 'lucide-react'

interface ReferralStats {
  total_referred: number
  converted_count: number
  pending_count: number
  earned_free_months: number
  total_credits: number
  estimated_value: number
  conversion_rate: number | string
  referrals: any[]
}

export default function ReferralWidget() {
  const [link, setLink] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    loadReferralData()
  }, [])

  const loadReferralData = async () => {
    try {
      setLoading(true)

      // Try to generate link if not exists
      if (!generated) {
        try {
          const generateRes = await fetch('/api/referrals/generate', {
            method: 'POST'
          })
          if (generateRes.ok) {
            const data = await generateRes.json()
            setLink(data.referral_link)
            setCode(data.referral_code)
            setGenerated(true)
          }
        } catch (e) {
          // Link might already exist, continue to stats
        }
      }

      // Fetch stats
      const statsRes = await fetch('/api/referrals/stats')
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      } else {
        setError('Failed to load referral stats')
      }
    } catch (err) {
      console.error('Error loading referral data:', err)
      setError('Failed to load referral data')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (link) {
      try {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleGenerateLink = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/referrals/generate', {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        setLink(data.referral_link)
        setCode(data.referral_code)
        setGenerated(true)
      } else {
        setError('Failed to generate referral link')
      }
    } catch (err) {
      console.error('Error generating link:', err)
      setError('Failed to generate link')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Referral Program
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Earn 1 free month for each agent you refer who upgrades to a paid plan
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!link && !generated ? (
        <div className="mb-6">
          <button
            onClick={handleGenerateLink}
            disabled={loading}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating...' : 'Generate My Referral Link'}
          </button>
        </div>
      ) : link ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Referral Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={link}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-mono"
            />
            <button
              onClick={copyToClipboard}
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Referral Code: <code className="font-mono bg-white px-1 py-0.5 rounded">{code}</code>
          </p>
        </div>
      ) : null}

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total_referred}</div>
            <div className="text-xs text-gray-600">Total Referred</div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="text-2xl font-bold text-green-600">{stats.converted_count}</div>
            <div className="text-xs text-gray-600">Converted</div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.pending_count}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>

          <div className="rounded-lg bg-white p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.earned_free_months}</div>
            <div className="text-xs text-gray-600">Free Months Earned</div>
          </div>

          <div className="rounded-lg bg-white p-4 col-span-2 sm:col-span-2">
            <div className="text-2xl font-bold text-gray-900">${stats.estimated_value}</div>
            <div className="text-xs text-gray-600">Referral Value</div>
          </div>

          <div className="rounded-lg bg-white p-4 col-span-2 sm:col-span-2">
            <div className="text-2xl font-bold text-gray-900">{stats.conversion_rate}%</div>
            <div className="text-xs text-gray-600">Conversion Rate</div>
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-blue-200">
        <p className="text-xs text-gray-600">
          💡 Pro Tip: Share your referral link on your email signature, LinkedIn, or with fellow agents.
          Each conversion gives you a free month!
        </p>
      </div>
    </div>
  )
}
