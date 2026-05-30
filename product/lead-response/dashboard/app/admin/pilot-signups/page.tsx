'use client'

/*
TASK SPEC (13590535-396f-4353-bce8-8561f44d74cc)
What:
- Create product/lead-response/dashboard/app/admin/pilot-signups/page.tsx (Pilot signups admin UI).
- Create product/lead-response/dashboard/app/api/admin/pilot-signups/list/route.ts (list + stats endpoint).
- Create product/lead-response/dashboard/app/api/admin/pilot-signups/[id]/route.ts (status update endpoint).
- Modify product/lead-response/dashboard/app/api/admin/gtm-status/route.ts to include pilotSignupCount/uninvitedSignupCount.
- Modify product/lead-response/dashboard/app/admin/page.tsx to add Signups card and extend GtmStatusResponse type.
- Add route tests in product/lead-response/dashboard/__tests__/pilot-signups-admin-routes.test.ts.

Verify:
- cd product/lead-response/dashboard && npm test -- pilot-signups-admin-routes.test.ts
- cd product/lead-response/dashboard && npx next build
- cd /Users/clawdbot/projects/leadflow && npm test
- cd /Users/clawdbot/projects/leadflow && npm run build
- rg -n "pilotSignupCount|uninvitedSignupCount|/admin/pilot-signups" product/lead-response/dashboard/app

Boundaries:
- Do not modify existing invite endpoint implementation at app/api/admin/pilot-signups/invite/route.ts.
- Do not change database schema or migrations.
- Do not alter unrelated admin pages or outreach/pilot business logic beyond required GTM card wiring.
*/

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send, X } from 'lucide-react'

type SignupStatus = 'new' | 'contacted' | 'approved' | 'declined'
type PilotSignup = { id: string; name: string; email: string; phone: string | null; brokerage_name: string | null; team_name: string | null; monthly_leads: string | null; current_crm: string | null; status: SignupStatus; source: string | null; utm_campaign: string | null; follow_up_sent: boolean; invited: boolean; invited_at: string | null; created_at: string; updated_at: string; contacted_at: string | null }
type ApiResponse = { signups: PilotSignup[]; total: number; page: number; limit: number; stats: { total: number; new: number; follow_up_sent: number; invited: number } }

const STATUS_STYLES: Record<SignupStatus, string> = { new: 'bg-blue-500/20 text-blue-300', contacted: 'bg-amber-500/20 text-amber-300', approved: 'bg-emerald-500/20 text-emerald-300', declined: 'bg-slate-500/20 text-slate-400' }

function redirectToAdminLogin(router: ReturnType<typeof useRouter>) { router.replace('/admin/login?redirect=/admin/pilot-signups') }
function daysSince(iso: string | null): string { if (!iso) return '—'; const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)); if (days <= 0) return 'today'; if (days === 1) return '1 day ago'; return `${days} days ago` }

export default function PilotSignupsPage() {
  const router = useRouter()
  const [signups, setSignups] = useState<PilotSignup[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | SignupStatus>('all')
  const [crmFilter, setCrmFilter] = useState('all')
  const [leadsFilter, setLeadsFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ total: 0, new: 0, follow_up_sent: 0, invited: 0 })
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const limit = 50

  async function loadData(targetPage: number) {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (crmFilter !== 'all') params.set('crm', crmFilter)
      if (leadsFilter !== 'all') params.set('monthly_leads', leadsFilter)
      const res = await fetch(`/api/admin/pilot-signups/list?${params.toString()}`)
      if (res.status === 401) { redirectToAdminLogin(router); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body: ApiResponse = await res.json()
      setSignups(body.signups || []); setTotal(body.total || 0); setStats(body.stats); setPage(body.page || targetPage)
    } catch (e: any) { setError(e.message || 'Failed to load signups') }
    finally { setLoading(false) }
  }

  useEffect(() => { void loadData(1) }, [statusFilter, crmFilter, leadsFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return signups
    return signups.filter((s) => `${s.name} ${s.email}`.toLowerCase().includes(q))
  }, [search, signups])

  const selected = useMemo(() => filtered.find((s) => s.id === selectedId) || null, [filtered, selectedId])

  async function sendInvite(signup: PilotSignup) {
    setActionError(null); setInviteLoadingId(signup.id)
    try {
      const res = await fetch('/api/admin/pilot-signups/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: signup.email, name: signup.name }) })
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `HTTP ${res.status}`) }
      setSignups((prev) => prev.map((s) => s.id === signup.id ? { ...s, invited: true, status: s.status === 'declined' ? 'declined' : 'contacted' } : s))
    } catch (e: any) { setActionError(`Failed to send invite - ${e.message || 'Unknown error'}`) }
    finally { setInviteLoadingId(null) }
  }

  async function setStatus(id: string, status: SignupStatus) {
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/pilot-signups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setSignups((prev) => prev.map((s) => s.id === id ? { ...s, ...body.signup } : s))
    } catch (e: any) { setActionError(`Failed to update status - ${e.message || 'Unknown error'}`) }
  }

  return <div className="min-h-screen bg-slate-950 text-slate-100"><div className="mx-auto max-w-7xl px-6 py-8"><p className="text-sm uppercase tracking-[0.25em] text-slate-500">Admin / Pilot Signups</p><h1 className="mt-3 text-4xl font-semibold text-white">Pilot Signups</h1><p className="mt-2 text-slate-400">Landing page interest forms</p>{loading && signups.length===0 && <p className="mt-4 text-slate-400">Loading...</p>}{error && <div className="mt-4 rounded-2xl border border-red-800 bg-red-950/60 p-4 text-red-200">Failed to load signups - {error}</div>}{actionError && <div className="mt-4 rounded-2xl border border-red-800 bg-red-950/60 p-4 text-red-200">{actionError}</div>}<section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[['Total Signups', stats.total], ['New', stats.new], ['Follow-up Sent', stats.follow_up_sent], ['Invited', stats.invited]].map(([title, value]) => <div key={title as string} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"><p className="text-sm uppercase tracking-[0.2em] text-slate-400">{title}</p><p className="mt-3 text-3xl font-semibold text-white">{value}</p></div>)}</section><section className="mt-6 grid gap-3 md:grid-cols-4"><select className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="approved">Approved</option><option value="declined">Declined</option></select><select className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" value={crmFilter} onChange={(e) => setCrmFilter(e.target.value)}><option value="all">All CRMs</option><option value="follow_up_boss">Follow Up Boss</option><option value="liondesk">LionDesk</option><option value="kvcore">kvCORE</option><option value="other">Other</option><option value="none">None</option></select><select className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" value={leadsFilter} onChange={(e) => setLeadsFilter(e.target.value)}><option value="all">All leads/mo</option><option value="1-10">1-10</option><option value="11-50">11-50</option><option value="51-100">51-100</option><option value="100+">100+</option></select><input className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} /></section><section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80"><table className="w-full text-sm"><thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">CRM</th><th className="px-4 py-3 text-left">Leads/mo</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Signed Up</th><th className="px-4 py-3 text-left">Action</th></tr></thead><tbody>{filtered.length===0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">{stats.total===0?'No pilot signups yet.':'No signups match this filter.'}</td></tr> : filtered.map((s)=><tr key={s.id} className={`cursor-pointer border-b border-slate-800 hover:bg-slate-800/50 ${s.status==='declined'?'opacity-50':''}`} onClick={()=>setSelectedId(s.id)}><td className="px-4 py-3"><p className="font-medium text-white">{s.name}</p><p className="text-xs text-slate-400">{s.email}</p></td><td className="px-4 py-3 text-slate-300">{s.current_crm||'—'}</td><td className="px-4 py-3 text-slate-300">{s.monthly_leads||'—'}</td><td className="px-4 py-3"><span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[s.status]}`}>{s.status}</span></td><td className="px-4 py-3 text-slate-300">{daysSince(s.created_at)}</td><td className="px-4 py-3" onClick={(e)=>e.stopPropagation()}>{!s.invited&&s.status!=='declined'?<button className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60" onClick={()=>void sendInvite(s)} disabled={inviteLoadingId===s.id}>{inviteLoadingId===s.id?<Loader2 className="h-3 w-3 animate-spin"/>:<Send className="h-3 w-3"/>}Send Invite</button>:s.invited?<span className="text-xs text-slate-400">Invited</span>:null}</td></tr>)}</tbody></table><div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400"><span>Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</span><div className="flex items-center gap-2"><button className="rounded border border-slate-700 px-2 py-1 disabled:opacity-50" disabled={page<=1||loading} onClick={()=>void loadData(page-1)}>Prev</button><span>Page {page} of {Math.max(1, Math.ceil(total/limit))}</span><button className="rounded border border-slate-700 px-2 py-1 disabled:opacity-50" disabled={page>=Math.ceil(total/limit)||loading} onClick={()=>void loadData(page+1)}>Next</button></div></div></section></div>{selected && <aside className="fixed right-0 top-0 h-screen w-full max-w-lg overflow-y-auto border-l border-slate-800 bg-slate-950 p-6"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold text-white">{selected.name}</h2><p className="text-sm text-slate-400">{selected.email}</p></div><button className="rounded border border-slate-700 p-2" onClick={()=>setSelectedId(null)}><X className="h-4 w-4"/></button></div><div className="mt-6 space-y-3 text-sm text-slate-300"><p>CRM: {selected.current_crm||'—'}</p><p>Leads/mo: {selected.monthly_leads||'—'}</p><p>Brokerage: {selected.brokerage_name||'—'}</p><p>Team: {selected.team_name||'—'}</p><p>Source: {selected.source||'—'}</p><p>Campaign: {selected.utm_campaign||'—'}</p><div className="flex gap-2 pt-2"><button className="rounded border border-slate-700 px-3 py-1" onClick={()=>void setStatus(selected.id,'declined')}>Mark as Declined</button><button className="rounded border border-slate-700 px-3 py-1" onClick={()=>void setStatus(selected.id,'contacted')}>Mark as Contacted</button></div></div></aside>}</div>
}
