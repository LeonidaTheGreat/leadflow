'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Mail,
  Megaphone,
  RadioTower,
  Users,
} from 'lucide-react'

type GtmStatusResponse = {
  success: boolean
  execution: {
    status: 'not_started' | 'blocked' | 'in_progress' | 'ready_to_scale'
    completionPercent: number
    summary: string
  }
  recruitment: {
    activeCampaign: {
      id: string
      name: string
      goal_count: number
      status: string
    } | null
    targetCount: number
    contactedCount: number
    signedUpCount: number
    byChannel: Record<string, number>
  }
  outreach: {
    verifiedCount: number
    uncontactedVerifiedCount: number
    inviteCount: number
    pilotPlanCount: number
  }
  pilots: {
    total: number
    stuckCount: number
    paidCount: number
  }
  a2p: {
    registration: {
      status: 'registered' | 'pending' | 'not_started' | 'unknown'
      daysPending: number | null
    }
    delivery: {
      status: string
      deliveryRate: number | null
      totalSent: number
      alertMessage: string | null
    }
  }
  actionItems: Array<{
    id: string
    title: string
    type: string
    priority: number
    awaiting_input: string | null
    action_needed: string | null
  }>
}

const STATUS_STYLES = {
  not_started: 'bg-slate-800 text-slate-200 border-slate-700',
  blocked: 'bg-red-950 text-red-200 border-red-800',
  in_progress: 'bg-amber-950 text-amber-200 border-amber-800',
  ready_to_scale: 'bg-emerald-950 text-emerald-200 border-emerald-800',
} as const

const STATUS_LABELS = {
  not_started: 'Not Started',
  blocked: 'Blocked',
  in_progress: 'In Progress',
  ready_to_scale: 'Ready to Scale',
} as const

function MetricCard(props: {
  title: string
  value: string | number
  helper: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{props.title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{props.value}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-300">
          {props.icon}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-400">{props.helper}</p>
    </div>
  )
}

function formatDeliveryRate(rate: number | null): string {
  if (rate === null) return 'n/a'
  return `${Math.round(rate * 100)}%`
}

export default function AdminCommandCenterPage() {
  const [data, setData] = useState<GtmStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/gtm-status')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        setData(body)
      } catch (err: any) {
        setError(err.message || 'Failed to load GTM status')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
        <h1 className="text-3xl font-semibold">GTM Execution Command Center</h1>
        <p className="mt-3 text-slate-400">Loading execution status...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
        <h1 className="text-3xl font-semibold">GTM Execution Command Center</h1>
        <div className="mt-4 rounded-2xl border border-red-800 bg-red-950/60 p-4 text-red-200">
          {error || 'Failed to load GTM status'}
        </div>
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[data.execution.status]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))] p-8 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Admin / GTM</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                GTM Execution Command Center
              </h1>
              <p className="mt-4 text-base text-slate-300">{data.execution.summary}</p>
            </div>
            <div className={`inline-flex w-fit items-center gap-3 rounded-full border px-4 py-2 text-sm font-medium ${statusStyle}`}>
              <span>{STATUS_LABELS[data.execution.status]}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">
                {data.execution.completionPercent}% complete
              </span>
            </div>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400"
              style={{ width: `${Math.max(data.execution.completionPercent, 4)}%` }}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Recruitment Targets"
            value={data.recruitment.targetCount}
            helper={`${data.recruitment.contactedCount} contacted, ${data.recruitment.signedUpCount} signed up`}
            icon={<Megaphone className="h-6 w-6" />}
          />
          <MetricCard
            title="Verified Signups"
            value={data.outreach.verifiedCount}
            helper={`${data.outreach.uncontactedVerifiedCount} still need outreach`}
            icon={<Mail className="h-6 w-6" />}
          />
          <MetricCard
            title="Active Pilots"
            value={data.pilots.total}
            helper={`${data.pilots.stuckCount} stuck, ${data.pilots.paidCount} paid`}
            icon={<Users className="h-6 w-6" />}
          />
          <MetricCard
            title="A2P Status"
            value={data.a2p.registration.status.replace('_', ' ')}
            helper={`Delivery ${formatDeliveryRate(data.a2p.delivery.deliveryRate)} over ${data.a2p.delivery.totalSent} messages`}
            icon={<RadioTower className="h-6 w-6" />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Execution Areas</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Move recruitment, outreach, onboarding, and compliance in parallel.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Link
                href="/admin/pilot-campaigns"
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-emerald-500"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Recruitment</p>
                <p className="mt-2 text-lg font-medium text-white">Pilot campaigns</p>
                <p className="mt-2 text-sm text-slate-400">
                  {data.recruitment.activeCampaign?.name || 'No campaign configured yet'}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-300">
                  Open campaign board <ArrowRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/admin/outreach"
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-cyan-500"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Outreach</p>
                <p className="mt-2 text-lg font-medium text-white">Verified signup queue</p>
                <p className="mt-2 text-sm text-slate-400">
                  {data.outreach.uncontactedVerifiedCount} verified agents still need direct contact.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300">
                  Work outreach queue <ArrowRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/admin/pilots"
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-amber-500"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Onboarding</p>
                <p className="mt-2 text-lg font-medium text-white">Pilot concierge</p>
                <p className="mt-2 text-sm text-slate-400">
                  {data.pilots.total === 0
                    ? 'No pilots onboarded yet.'
                    : `${data.pilots.stuckCount} pilots need intervention right now.`}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-amber-300">
                  Open pilot tracker <ArrowRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/admin/funnel"
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-blue-500"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Activation</p>
                <p className="mt-2 text-lg font-medium text-white">Onboarding funnel</p>
                <p className="mt-2 text-sm text-slate-400">
                  Inspect where recruited agents stall after signup.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-blue-300">
                  Review funnel data <ArrowRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/admin/reactivation"
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-rose-500"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Win-Back</p>
                <p className="mt-2 text-lg font-medium text-white">Lapsed trial reactivation</p>
                <p className="mt-2 text-sm text-slate-400">
                  Campaign stats for expired-trial agents who never hit the aha moment.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-rose-300">
                  View reactivation funnel <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white">Immediate blockers</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pending decisions and compliance issues that stop execution.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center gap-3">
                {data.a2p.registration.status === 'registered' ? (
                  <BadgeCheck className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                )}
                <div>
                  <p className="font-medium text-white">A2P 10DLC</p>
                  <p className="text-sm text-slate-400">
                    {data.a2p.delivery.alertMessage ||
                      `Registration ${data.a2p.registration.status.replace('_', ' ')}.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {data.actionItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                  No waiting action items. Execution can proceed directly from the links on the left.
                </div>
              ) : (
                data.actionItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.title}</p>
                      <span className="rounded-full bg-red-950 px-2 py-1 text-xs text-red-200">
                        P{item.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {item.awaiting_input || 'Owner pending'}: {item.action_needed || 'Review required'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
