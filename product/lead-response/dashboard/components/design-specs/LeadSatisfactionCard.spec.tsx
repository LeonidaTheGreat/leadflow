/**
 * DESIGN SPEC — LeadSatisfactionCard
 * ====================================
 * This file is a WIREFRAME SPEC for dev to implement.
 * It is NOT production code. Types, imports, and data-fetching
 * are illustrative. Dev should replace with real Supabase queries,
 * correct imports, and auth context.
 *
 * Placement: app/dashboard/page.tsx, below <StatsCards />, above <LeadFeed />
 * See full spec: docs/DESIGN-LEAD-SATISFACTION-FEEDBACK.md
 */

// SPEC: These types define the data shape dev should query from Supabase
interface SatisfactionSummary {
  total: number
  positive: number
  negative: number
  neutral: number
  unclassified: number
  positiveRate: number // 0–1
  trend: 'improving' | 'declining' | 'stable'
}

interface SatisfactionEvent {
  id: string
  lead_id: string
  leadName?: string // joined from leads table
  raw_reply: string
  rating: 'positive' | 'negative' | 'neutral' | 'unclassified'
  created_at: string // ISO timestamp
}

// ─────────────────────────────────────────────
// SPEC: Rating color mapping — use these classes throughout
// ─────────────────────────────────────────────
const RATING_STYLES = {
  positive: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: 'bg-emerald-100 dark:bg-emerald-900/30',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    emoji: '👍',
    label: 'Positive',
  },
  negative: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: 'bg-red-100 dark:bg-red-900/30',
    bar: 'bg-red-400',
    dot: 'bg-red-400',
    emoji: '👎',
    label: 'Negative',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    icon: 'bg-slate-100 dark:bg-slate-800',
    bar: 'bg-slate-300 dark:bg-slate-600',
    dot: 'bg-slate-400',
    emoji: '😐',
    label: 'Neutral',
  },
  unclassified: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: 'bg-amber-100 dark:bg-amber-900/30',
    bar: 'bg-amber-300',
    dot: 'bg-amber-400',
    emoji: '❓',
    label: 'Unclassified',
  },
} as const

// ─────────────────────────────────────────────
// SPEC: Trend badge
// ─────────────────────────────────────────────
const TREND_STYLES = {
  improving: {
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    label: '↑ Improving vs. prior 30d',
  },
  declining: {
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label: '↓ Declining vs. prior 30d',
  },
  stable: {
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    label: '→ Stable',
  },
}

// ─────────────────────────────────────────────
// SPEC: Main component — LeadSatisfactionCard
// Render: null when total < 5 (minimum threshold per PRD)
// ─────────────────────────────────────────────
export function LeadSatisfactionCard() {
  // SPEC: Dev replaces with real state + Supabase query
  const [summary, setSummary] = /* useState<SatisfactionSummary | null>(null) */ [null, () => {}] as any
  const [events, setEvents] = /* useState<SatisfactionEvent[]>([]) */ [[], () => {}] as any
  const [loading, setLoading] = /* useState(true) */ [false, () => {}] as any
  const [expanded, setExpanded] = /* useState(false) */ [false, () => {}] as any

  // SPEC: On mount, dev fetches summary + events from Supabase
  // filtered by current agent_id from auth context

  // SPEC: Hide entirely if fewer than 5 responses (PRD: US-3)
  if (!loading && (!summary || summary.total < 5)) return null

  if (loading) return <LoadingSkeleton />

  const positivePercent = Math.round((summary.positive / summary.total) * 100)
  const neutralPercent = Math.round((summary.neutral / summary.total) * 100)
  const negativePercent = 100 - positivePercent - neutralPercent

  const trend = TREND_STYLES[summary.trend]

  return (
    // SPEC: Card container — pointer cursor since whole card expands
    <div
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors cursor-pointer p-5"
      onClick={() => setExpanded(!expanded)}
      role="button"
      aria-expanded={expanded}
      aria-label="Lead Satisfaction — click to expand"
    >
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: icon + title */}
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">😊</span>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Lead Satisfaction
          </h3>
        </div>

        {/* Middle: trend badge */}
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trend.className}`}>
          {trend.label}
        </span>

        {/* Right: expand / collapse link */}
        {/* SPEC: Clicking this link stops propagation so card click doesn't double-fire */}
        <button
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
        >
          {expanded ? '↑ Collapse' : 'View all →'}
        </button>
      </div>

      {/* ── Summary row: big number + stacked bar ── */}
      <div className="flex gap-6">
        {/* Left: big positive % */}
        <div className="w-32 shrink-0">
          <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
            {positivePercent}%
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Positive</p>
        </div>

        {/* Right: stacked bar + legend + footnote */}
        <div className="flex-1">
          {/* SPEC: Stacked progress bar — 3 adjacent segments, no gaps */}
          <div
            className="h-3 rounded-full overflow-hidden flex"
            role="progressbar"
            aria-valuenow={positivePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${positivePercent}% positive satisfaction`}
          >
            <div
              className={RATING_STYLES.positive.bar}
              style={{ width: `${positivePercent}%` }}
            />
            <div
              className={RATING_STYLES.neutral.bar}
              style={{ width: `${neutralPercent}%` }}
            />
            <div
              className={RATING_STYLES.negative.bar}
              style={{ width: `${negativePercent}%` }}
            />
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-2 flex-wrap">
            {(['positive', 'neutral', 'negative'] as const).map((key) => {
              const pct = key === 'positive' ? positivePercent
                       : key === 'neutral' ? neutralPercent
                       : negativePercent
              return (
                <span key={key} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                  <span className={`inline-block w-2 h-2 rounded-full ${RATING_STYLES[key].dot}`} />
                  {pct}% {RATING_STYLES[key].label}
                </span>
              )
            })}
          </div>

          {/* Footnote */}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Based on {summary.total} responses · Last 30 days
          </p>
        </div>
      </div>

      {/* ── Expanded: events list ── */}
      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Satisfaction Responses (last 30 days)
          </p>

          {events.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-6">
              No responses yet
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((event: SatisfactionEvent) => (
                <SatisfactionEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// SPEC: Single event row in the expanded list
// ─────────────────────────────────────────────
function SatisfactionEventRow({ event }: { event: SatisfactionEvent }) {
  const style = RATING_STYLES[event.rating]

  // SPEC: Dev formats timestamp as "Mar 7 · 2:14 PM" using Intl.DateTimeFormat
  const formattedDate = new Date(event.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center gap-3 py-3 text-sm">
      {/* Rating icon circle */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${style.icon}`}>
        {style.emoji}
      </div>

      {/* Lead name */}
      <span className="font-medium text-slate-900 dark:text-white w-28 truncate">
        {event.leadName ?? event.lead_id}
      </span>

      {/* Raw reply (italic, secondary) */}
      <span className="text-slate-500 dark:text-slate-400 italic flex-1 truncate">
        "{event.raw_reply}"
      </span>

      {/* Rating badge */}
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${style.badge}`}>
        {style.label}
      </span>

      {/* Timestamp */}
      <span className="text-slate-400 dark:text-slate-500 text-xs ml-2 whitespace-nowrap">
        {formattedDate}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// SPEC: Loading skeleton — pulse animation, matches card dimensions
// ─────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-36" />
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-28 ml-2" />
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16 ml-auto" />
      </div>
      {/* Content skeleton */}
      <div className="flex gap-6">
        <div className="w-32 shrink-0">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-14" />
        </div>
        <div className="flex-1">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full mb-3" />
          <div className="flex gap-4">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}
