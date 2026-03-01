import { CheckCircle, XCircle, Lightbulb, Target, Home, Calendar, DollarSign } from 'lucide-react'
import type { Lead, Qualification } from '@/lib/types'

interface LeadQualificationCardProps {
  lead: Lead
  qualifications: Qualification[]
}

export function LeadQualificationCard({ lead, qualifications }: LeadQualificationCardProps) {
  const latestQualification = qualifications[0]

  if (!latestQualification) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">AI Qualification</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This lead has not been qualified yet.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">AI Qualification</h3>
        {latestQualification.is_qualified ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
            <CheckCircle className="w-3 h-3" />
            Qualified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <XCircle className="w-3 h-3" />
            Not Qualified
          </span>
        )}
      </div>

      {/* Confidence Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-600 dark:text-slate-400">Confidence</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {Math.round((latestQualification.confidence_score || 0) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(latestQualification.confidence_score || 0) * 100}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        {latestQualification.intent && (
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Intent</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                {latestQualification.intent}
              </p>
            </div>
          </div>
        )}

        {(latestQualification.budget_min || latestQualification.budget_max) && (
          <div className="flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Budget Range</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {latestQualification.budget_min 
                  ? `$${latestQualification.budget_min.toLocaleString()}`
                  : 'N/A'
                }
                {' - '}
                {latestQualification.budget_max
                  ? `$${latestQualification.budget_max.toLocaleString()}`
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        )}

        {latestQualification.timeline && (
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Timeline</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                {latestQualification.timeline.replace(/-/g, ' ')}
              </p>
            </div>
          </div>
        )}

        {latestQualification.property_type && (
          <div className="flex items-center gap-3">
            <Home className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Property Type</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                {latestQualification.property_type}
              </p>
            </div>
          </div>
        )}

        {latestQualification.bedrooms && (
          <div className="flex items-center gap-3">
            <Home className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Bedrooms</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {latestQualification.bedrooms}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Qualification Reason */}
      {latestQualification.qualification_reason && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">AI Reasoning</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {latestQualification.qualification_reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Model Info */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Model: {latestQualification.model_used || 'claude-3-5-sonnet'}
        </p>
      </div>
    </div>
  )
}
