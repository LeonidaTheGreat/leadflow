import { notFound } from 'next/navigation'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { ConversationView } from '@/components/dashboard/ConversationView'
import { LeadDetailHeader } from '@/components/dashboard/LeadDetailHeader'
import { LeadQualificationCard } from '@/components/dashboard/LeadQualificationCard'
import { SequenceStatusCard } from '@/components/dashboard/SequenceStatusCard'
import { getLeadSequences } from '@/lib/sequences'

interface LeadDetailPageProps {
  params: Promise<{
    id: string
  }>
}

async function getLead(id: string) {
  const { data: lead } = await supabase
    .from('leads')
    .select('*, agent:real_estate_agents(*)')
    .eq('id', id)
    .single()

  return lead
}

async function getMessages(leadId: string) {
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  return messages || []
}

async function getQualifications(leadId: string) {
  // Qualifications table not created yet - return empty
  return []
}

async function getSequences(leadId: string) {
  return getLeadSequences(leadId)
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params
  const lead = await getLead(id)

  if (!lead) {
    notFound()
  }

  const [messages, qualifications, sequences] = await Promise.all([
    getMessages(id),
    getQualifications(id),
    getSequences(id),
  ])

  return (
    <div className="space-y-6">
      <LeadDetailHeader lead={lead} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation */}
        <div className="lg:col-span-2">
          <ConversationView 
            lead={lead} 
            messages={messages}
            agent={lead.agent}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SequenceStatusCard
            sequences={sequences}
            leadId={id}
          />

          <LeadQualificationCard 
            lead={lead} 
            qualifications={qualifications}
          />
          
          {/* Booking Card */}
          {lead.agent?.calcom_username && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Booking</h3>
              <a
                href={`/api/booking?lead_id=${lead.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md transition-colors"
              >
                Schedule Appointment
              </a>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Opens Cal.com booking page
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center justify-center w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-md transition-colors"
              >
                Call Lead
              </a>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-md transition-colors"
                >
                  Send Email
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
