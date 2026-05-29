'use client'

/*
TASK SPEC (5eca6629-5f58-4163-aee2-219dd70d75f6)
What:
- Change product/lead-response/dashboard/app/admin/simulator/page.tsx (SimulatorPanel, ConversationsViewer, SimulatorPageContent) to implement unified Lead Experience Visibility flow:
  explicit simulator state (idle|running|success|failed|timed_out), one-click fallback to sample viewer, telemetry events, last-path persistence, and demo link generation for simulator/sample content.
- Change product/lead-response/dashboard/app/api/admin/simulate-lead/route.ts, product/lead-response/dashboard/app/api/admin/conversations/route.ts, product/lead-response/dashboard/app/api/admin/demo-link/route.ts to delegate domain logic to a service and support fallback-safe sample data + demo link revoke/audit flow.
- Create product/lead-response/dashboard/lib/services/lead-experience-visibility-service.ts (LeadExperienceVisibilityService class) to centralize simulation, sample conversation, and demo token logic.

Verify:
- npm test
- npm run build
- cd product/lead-response/dashboard && npx next build
- rg -n "lead_visibility_opened|lead_simulator_started|lead_simulator_succeeded|lead_simulator_failed|lead_visibility_fallback_used|sample_viewer_opened|demo_link_generated" product/lead-response/dashboard/app/admin/simulator/page.tsx
- Manual check: /admin/simulator supports simulator run, failure fallback CTA to sample viewer without page navigation, sample list returns 10 threads, demo link generation/revoke endpoints respond 200.

Boundaries:
- Do not touch onboarding simulator flow, billing, CRM integrations, or unrelated dashboard pages/routes.
- Do not modify schema migrations in this task.
- Do not change protected auto-generated docs/config files.
*/

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Play, Loader2, Share2, Check, ChevronDown, ChevronUp, MessageSquare, Bot, User } from 'lucide-react'

type SimulatorState = 'idle' | 'running' | 'success' | 'failed' | 'timed_out'

interface ConversationTurn {
  role: 'lead' | 'ai'
  message: string
  timestamp: string
}

interface SimulationResult {
  id: string | null
  conversation: ConversationTurn[]
  outcome: string
  createdAt?: string
}

interface ConversationRecord {
  id: string
  scenarioLabel?: string
  leadName: string
  maskedPhone: string
  date: string
  messageCount: number
  outcome: 'booked' | 'in_progress' | 'opted_out' | 'unqualified'
  messages: Array<{ id: string; direction: string; body: string; timestamp: string }>
}

function track(eventType: string, properties: Record<string, unknown> = {}) {
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, properties }),
  }).catch(() => {})
}

function formatTime(ts: string) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
function formatDate(ts: string) { return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) }

function ChatBubble({ role, message, timestamp }: ConversationTurn) {
  const isAI = role === 'ai'
  return <div className={`flex gap-2 mb-3 ${isAI ? 'flex-row-reverse' : 'flex-row'}`}><div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isAI ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{isAI ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}</div><div className={`max-w-[75%] ${isAI ? 'items-end' : 'items-start'} flex flex-col gap-1`}><div className={`px-3 py-2 rounded-2xl text-sm ${isAI ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-900 rounded-tl-sm'}`}>{message}</div><span className="text-xs text-slate-400">{formatTime(timestamp)}</span></div></div>
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const labels: Record<string, string> = { booked: 'Booked', in_progress: 'In Progress', opted_out: 'Opted Out', unqualified: 'Unqualified', completed: 'Simulation Complete' }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">{labels[outcome] || outcome}</span>
}

function SimulatorPanel({ onFallback }: { onFallback: () => void }) {
  const [leadName, setLeadName] = useState('')
  const [propertyInterest, setPropertyInterest] = useState('')
  const [simState, setSimState] = useState<SimulatorState>('idle')
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [demoLinkState, setDemoLinkState] = useState<'idle' | 'loading' | 'copied'>('idle')
  const [demoUrl, setDemoUrl] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (result) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [result])

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault()
    if (!leadName.trim() || simState === 'running') return

    const startedAt = Date.now()
    const timeoutMs = 10000
    setSimState('running')
    setError(null)
    setResult(null)
    track('lead_simulator_started', { scenario_id: 'manual', timestamp: new Date().toISOString(), result_state: 'running' })

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timed_out')), timeoutMs))

    try {
      const res: any = await Promise.race([
        fetch('/api/admin/simulate-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadName: leadName.trim(), propertyInterest: propertyInterest.trim() || null }) }),
        timeoutPromise,
      ])
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Simulation failed')
      setResult(data)
      setSimState('success')
      track('lead_simulator_succeeded', { scenario_id: 'manual', elapsed_ms: Date.now() - startedAt, timestamp: new Date().toISOString(), result_state: 'success' })
    } catch (err: any) {
      const timedOut = err?.message === 'timed_out'
      setSimState(timedOut ? 'timed_out' : 'failed')
      setError(timedOut ? 'Simulation timed out. Use sample conversation fallback now.' : 'Simulation failed. Use sample conversation fallback now.')
      track('lead_simulator_failed', { scenario_id: 'manual', elapsed_ms: Date.now() - startedAt, timestamp: new Date().toISOString(), result_state: timedOut ? 'timed_out' : 'failed' })
    }
  }

  async function handleGenerateDemoLink() {
    setDemoLinkState('loading')
    try {
      const res = await fetch('/api/admin/demo-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: 'Lead Experience Visibility', contentType: 'simulator', contentId: result?.id || 'latest' }) })
      const data = await res.json()
      if (res.ok && data.url) {
        setDemoUrl(data.url)
        await navigator.clipboard.writeText(data.url)
        setDemoLinkState('copied')
        track('demo_link_generated', { scenario_id: result?.id || 'latest', timestamp: new Date().toISOString(), result_state: 'success' })
        setTimeout(() => setDemoLinkState('idle'), 2000)
        return
      }
    } catch {}
    setDemoLinkState('idle')
  }

  return <div className="grid gap-6 lg:grid-cols-[320px_1fr]"><div className="bg-white rounded-xl border border-slate-200 p-5"><h2 className="text-sm font-semibold text-slate-900">Run Test Lead Simulator</h2><p className="text-xs text-slate-500 mt-1">Dry run only. No live SMS is ever sent.</p><form onSubmit={handleSimulate} className="space-y-3 mt-4"><input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Lead name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" required /><input value={propertyInterest} onChange={(e) => setPropertyInterest(e.target.value)} placeholder="Property interest" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /><button type="submit" disabled={simState === 'running' || !leadName.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg">{simState === 'running' ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Play className="h-4 w-4" /> Start Simulation</>}</button></form>{(simState === 'failed' || simState === 'timed_out') && <button onClick={() => { onFallback(); track('lead_visibility_fallback_used', { scenario_id: 'manual', timestamp: new Date().toISOString(), result_state: simState }) }} className="w-full mt-3 px-4 py-2 text-sm rounded-lg border border-amber-300 bg-amber-50 text-amber-800">Open Sample Conversation</button>}<div className="mt-4 pt-4 border-t border-slate-200"><button onClick={handleGenerateDemoLink} disabled={demoLinkState === 'loading'} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-xs rounded-lg">{demoLinkState === 'loading' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</> : demoLinkState === 'copied' ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Share2 className="h-3.5 w-3.5" /> Generate Demo Link</>}</button>{demoUrl && <p className="mt-2 text-xs text-slate-400 truncate">{demoUrl}</p>}</div></div><div className="bg-white rounded-xl border border-slate-200 min-h-[420px]"><div className="p-4 border-b border-slate-200 flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Transcript</span>{result && <OutcomeBadge outcome={result.outcome} />}</div><div className="p-4">{simState === 'idle' && <p className="text-sm text-slate-500">Run a simulation to view transcript.</p>}{simState === 'running' && <p className="text-sm text-slate-500">Simulation is running…</p>}{error && <p className="text-sm text-red-600">{error}</p>}{simState === 'success' && result && <div>{result.conversation.map((turn, i) => <ChatBubble key={i} {...turn} />)}<div ref={chatEndRef} /></div>}</div></div></div>
}

function ConversationsViewer({ active, onShare }: { active: boolean; onShare: (conversationId: string) => void }) {
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [outcomeFilter, setOutcomeFilter] = useState('all')

  useEffect(() => {
    if (!active) return
    track('sample_viewer_opened', { scenario_id: outcomeFilter, timestamp: new Date().toISOString(), result_state: 'visible' })
    setLoading(true)
    fetch(`/api/admin/conversations?outcome=${outcomeFilter}`)
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations || []))
      .finally(() => setLoading(false))
  }, [active, outcomeFilter])

  return <div className="space-y-4"><div className="flex gap-2 flex-wrap">{['all', 'booked', 'in_progress', 'opted_out', 'unqualified'].map((f) => <button key={f} onClick={() => setOutcomeFilter(f)} className={`px-3 py-1.5 rounded-full text-xs ${outcomeFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{f}</button>)}</div><div className="bg-white rounded-xl border border-slate-200 overflow-hidden">{loading && <div className="py-8 text-center text-sm text-slate-500">Loading conversations…</div>}{!loading && <ul>{conversations.map((conv) => <li key={conv.id} className="border-b border-slate-100"><button onClick={() => setExpanded(expanded === conv.id ? null : conv.id)} className="w-full text-left px-4 py-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">{conv.scenarioLabel || conv.leadName}</p><p className="text-xs text-slate-500">{conv.maskedPhone} • {formatDate(conv.date)} • {conv.messageCount} messages</p></div><div className="flex items-center gap-2"><OutcomeBadge outcome={conv.outcome} />{expanded === conv.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div></div></button>{expanded === conv.id && <div className="px-4 pb-4 bg-slate-50"><div className="pb-2"><button onClick={() => onShare(conv.id)} className="text-xs text-blue-700">Generate share link for this conversation</button></div>{conv.messages.map((msg) => <ChatBubble key={msg.id} role={msg.direction === 'inbound' ? 'lead' : 'ai'} message={msg.body} timestamp={msg.timestamp} />)}</div>}</li>)}</ul>}</div></div>
}

function SimulatorPageContent() {
  const searchParams = useSearchParams()
  const demoToken = searchParams.get('demo')
  const [activeTab, setActiveTab] = useState<'simulator' | 'conversations'>('simulator')
  const [demoValid, setDemoValid] = useState<boolean | null>(demoToken ? null : true)

  useEffect(() => {
    track('lead_visibility_opened', { scenario_id: 'entry', timestamp: new Date().toISOString(), result_state: 'opened' })
    const lastTab = localStorage.getItem('lead-visibility-last-tab')
    if (lastTab === 'simulator' || lastTab === 'conversations') setActiveTab(lastTab)
  }, [])

  useEffect(() => { localStorage.setItem('lead-visibility-last-tab', activeTab) }, [activeTab])

  useEffect(() => {
    if (!demoToken) return
    fetch(`/api/admin/demo-link?token=${demoToken}`).then((r) => r.json()).then((d) => setDemoValid(d.valid)).catch(() => setDemoValid(false))
  }, [demoToken])

  async function shareConversation(conversationId: string) {
    const res = await fetch('/api/admin/demo-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: 'Lead Experience Visibility', contentType: 'sample_conversation', contentId: conversationId }) })
    const data = await res.json()
    if (res.ok && data.url) {
      await navigator.clipboard.writeText(data.url)
      track('demo_link_generated', { scenario_id: conversationId, timestamp: new Date().toISOString(), result_state: 'success' })
    }
  }

  if (demoToken && demoValid === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (demoToken && demoValid === false) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm text-slate-500">Demo link is invalid or expired.</p></div>

  return <div className="min-h-screen bg-slate-50"><div className="bg-white border-b border-slate-200"><div className="max-w-6xl mx-auto px-4 py-4"><h1 className="text-lg font-bold text-slate-900">Lead Experience Visibility</h1><p className="text-xs text-slate-500 mt-0.5">Fast simulator path with one-click fallback sample conversations</p><div className="flex gap-2 mt-4"><button onClick={() => setActiveTab('simulator')} className={`px-4 py-2 text-sm rounded-lg ${activeTab === 'simulator' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Run Test Lead Simulator</button><button onClick={() => setActiveTab('conversations')} className={`px-4 py-2 text-sm rounded-lg ${activeTab === 'conversations' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Open Sample Conversation Viewer</button></div></div></div><div className="max-w-6xl mx-auto px-4 py-6">{activeTab === 'simulator' && <SimulatorPanel onFallback={() => setActiveTab('conversations')} />}{activeTab === 'conversations' && <ConversationsViewer active onShare={shareConversation} />}</div></div>
}

export default function SimulatorPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}><SimulatorPageContent /></Suspense>
}
