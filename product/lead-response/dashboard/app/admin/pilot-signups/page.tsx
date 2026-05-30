'use client'

/*
TASK SPEC (13590535-396f-4353-bce8-8561f44d74cc)
What:
- Create product/lead-response/dashboard/app/admin/pilot-signups/page.tsx with Pilot Signups admin UI (summary cards, filters, table, side panel, invite/status actions).
- Add server API dependencies consumed by this page: /api/admin/pilot-signups/list and /api/admin/pilot-signups/[id].
- Modify product/lead-response/dashboard/app/admin/page.tsx and product/lead-response/dashboard/app/api/admin/gtm-status/route.ts to expose and display pilot signup queue counts in the GTM command center.
- Add tests validating the new admin page wiring and new pilot signup API route contracts.

Verify:
- npm test exits 0.
- npm run build exits 0.
- cd product/lead-response/dashboard && npx next build exits 0.
- grep checks:
  - rg -n "pilot-signups" product/lead-response/dashboard/app/admin/page.tsx
  - rg -n "pilotSignupCount|uninvitedSignupCount" product/lead-response/dashboard/app/api/admin/gtm-status/route.ts

Boundaries:
- Do not modify database schema, migrations, or invite email implementation in app/api/admin/pilot-signups/invite/route.ts.
- Do not refactor unrelated admin pages or shared auth flows.
- Do not introduce new external dependencies.
*/

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type SignupStatus = 'new' | 'contacted' | 'approved' | 'declined'

type PilotSignup = { id: string; name: string; email: string; phone: string | null; brokerage_name: string | null; team_name: string | null; monthly_leads: string | null; current_crm: string | null; status: SignupStatus; source: string | null; utm_campaign: string | null; follow_up_sent: boolean; invited: boolean; created_at: string; updated_at: string; contacted_at: string | null }
type ListResponse = { signups: PilotSignup[]; total: number; page: number; limit: number; stats: { total: number; new: number; follow_up_sent: number; invited: number } }
const STATUS_OPTIONS: Array<'all' | SignupStatus> = ['all', 'new', 'contacted', 'approved', 'declined']

function formatDateTime(iso: string | null): string { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
function daysSince(iso: string | null): string { if (!iso) return '—'; const ms = Date.now() - new Date(iso).getTime(); const days = Math.floor(ms / (1000 * 60 * 60 * 24)); if (days <= 0) return 'today'; if (days === 1) return '1 day ago'; return `${days} days ago` }

export default function PilotSignupsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'all' | SignupStatus>('all')
  const [crm, setCrm] = useState('all')
  const [monthlyLeads, setMonthlyLeads] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListResponse | null>(null)
  const [selected, setSelected] = useState<PilotSignup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingInviteEmail, setLoadingInviteEmail] = useState<string | null>(null)
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)

  async function loadData(currentPage: number) {
    setLoading(true); setError(null)
    try {
      const query = new URLSearchParams({ page: String(currentPage), limit: '50' })
      if (status !== 'all') query.set('status', status)
      if (crm !== 'all') query.set('crm', crm)
      if (monthlyLeads !== 'all') query.set('monthly_leads', monthlyLeads)
      const res = await fetch(`/api/admin/pilot-signups/list?${query.toString()}`)
      if (res.status === 401) { router.replace('/admin/login?redirect=/admin/pilot-signups'); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((await res.json()) as ListResponse)
    } catch (err: any) { setError(err.message || 'Failed to load signups') } finally { setLoading(false) }
  }

  useEffect(() => { void loadData(page) }, [page, status, crm, monthlyLeads])
  const filtered = useMemo(() => { if (!data) return []; const term = search.trim().toLowerCase(); if (!term) return data.signups; return data.signups.filter((s) => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)) }, [data, search])

  async function sendInvite(signup: PilotSignup) {
    setInlineError(null); setLoadingInviteEmail(signup.email)
    try {
      const res = await fetch('/api/admin/pilot-signups/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: signup.email, name: signup.name }) })
      const body = await res.json(); if (!res.ok) throw new Error(body.error || 'Failed to send invite')
      setData((prev) => prev ? { ...prev, signups: prev.signups.map((item) => item.email === signup.email ? { ...item, invited: true, status: item.status === 'new' ? 'contacted' : item.status } : item), stats: { ...prev.stats, invited: prev.stats.invited + 1 } } : prev)
      setSelected((prev) => (prev && prev.email === signup.email) ? { ...prev, invited: true, status: prev.status === 'new' ? 'contacted' : prev.status } : prev)
    } catch (err: any) { setInlineError(`Failed to send invite — ${err.message || 'Unknown error'}`) } finally { setLoadingInviteEmail(null) }
  }

  async function updateStatus(signup: PilotSignup, nextStatus: SignupStatus) {
    setInlineError(null); setStatusSavingId(signup.id)
    try {
      const res = await fetch(`/api/admin/pilot-signups/${signup.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) })
      const body = await res.json(); if (!res.ok || !body.signup) throw new Error(body.error || 'Failed to update status')
      const updated = body.signup as PilotSignup
      setData((prev) => prev ? { ...prev, signups: prev.signups.map((item) => item.id === updated.id ? { ...item, ...updated } : item) } : prev)
      setSelected((prev) => (prev && prev.id === updated.id) ? { ...prev, ...updated } : prev)
    } catch (err: any) { setInlineError(`Failed to update status — ${err.message || 'Unknown error'}`) } finally { setStatusSavingId(null) }
  }

  const total = data?.total || 0
  const pageCount = Math.max(1, Math.ceil(total / 50))
  const first = total === 0 ? 0 : (page - 1) * 50 + 1
  const last = Math.min(page * 50, total)

  return <div className="min-h-screen bg-slate-950 text-slate-100"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8"><div><p className="text-sm uppercase tracking-[0.3em] text-slate-400">Admin / Pilot Signups</p><h1 className="mt-2 text-3xl font-semibold text-white">Pilot Signups</h1><p className="mt-2 text-sm text-slate-400">Landing page interest forms</p></div>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-xs text-slate-400">Total Signups</p><p className="mt-2 text-2xl font-semibold">{data?.stats.total ?? 0}</p><p className="text-xs text-slate-500">All time</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-xs text-slate-400">New</p><p className="mt-2 text-2xl font-semibold">{data?.stats.new ?? 0}</p><p className="text-xs text-slate-500">Not contacted</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-xs text-slate-400">Follow-up Sent</p><p className="mt-2 text-2xl font-semibold">{data?.stats.follow_up_sent ?? 0}</p><p className="text-xs text-slate-500">welcome email sent</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><p className="text-xs text-slate-400">Invited</p><p className="mt-2 text-2xl font-semibold">{data?.stats.invited ?? 0}</p><p className="text-xs text-slate-500">has pilot invite</p></div></section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex flex-wrap items-center gap-2">{STATUS_OPTIONS.map((opt) => <Button key={opt} variant={status === opt ? 'default' : 'outline'} size="sm" onClick={() => { setStatus(opt); setPage(1) }}>{opt === 'all' ? 'All' : opt[0].toUpperCase() + opt.slice(1)}</Button>)}<select className="ml-auto rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={crm} onChange={(e) => { setCrm(e.target.value); setPage(1) }}><option value="all">All CRM</option><option value="follow_up_boss">Follow Up Boss</option><option value="liondesk">LionDesk</option><option value="kvcore">kvCORE</option><option value="other">Other</option><option value="none">None</option></select><select className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={monthlyLeads} onChange={(e) => { setMonthlyLeads(e.target.value); setPage(1) }}><option value="all">All Leads/mo</option><option value="1-10">1-10</option><option value="11-50">11-50</option><option value="51-100">51-100</option><option value="100+">100+</option></select><Input className="max-w-sm border-slate-700 bg-slate-950" placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} /></div></section>
    {loading && <p className="text-slate-400">Loading...</p>}{error && <div className="rounded-2xl border border-red-800 bg-red-950/60 p-4 text-red-200">Failed to load signups — {error}</div>}
    {!loading && !error && <section className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-slate-800 text-slate-400"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">CRM</th><th className="px-4 py-3 text-left">Leads/mo</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Signed Up</th><th className="px-4 py-3 text-left">Action</th></tr></thead><tbody>{filtered.map((signup) => <tr key={signup.id} className={`border-b border-slate-800 hover:bg-slate-800/50 ${signup.status === 'declined' ? 'opacity-50' : ''}`}><td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(signup)}><p className="font-medium text-white">{signup.name}</p><p className="text-xs text-slate-400">{signup.email}</p></td><td className="px-4 py-3"><Badge variant="outline" className="border-slate-700">{signup.current_crm || '—'}</Badge></td><td className="px-4 py-3"><Badge variant="outline" className="border-slate-700">{signup.monthly_leads || '—'}</Badge></td><td className="px-4 py-3"><Badge className="capitalize">{signup.status}</Badge></td><td className="px-4 py-3 text-slate-300">{daysSince(signup.created_at)}</td><td className="px-4 py-3">{!signup.invited && signup.status !== 'declined' ? <Button size="sm" onClick={() => void sendInvite(signup)} disabled={loadingInviteEmail === signup.email}>{loadingInviteEmail === signup.email ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}</Button> : signup.invited ? <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" />Invited</span> : null}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="p-8 text-center text-slate-400">{total === 0 ? 'No pilot signups yet.' : 'No signups match this filter.'}</div>}<div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-sm text-slate-400"><p>Showing {first}-{last} of {total}</p><div className="flex items-center gap-3"><Button variant="outline" size="sm" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /> Prev</Button><span>Page {page} of {pageCount}</span><Button variant="outline" size="sm" onClick={() => setPage((v) => Math.min(pageCount, v + 1))} disabled={page >= pageCount}>Next <ChevronRight className="h-4 w-4" /></Button></div></div></section>}
  </div>{selected && <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSelected(null)}><aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-6" onClick={(e) => e.stopPropagation()}><div className="mb-6 flex items-start justify-between"><div><h2 className="text-xl font-semibold text-white">{selected.name}</h2><p className="text-sm text-slate-400">{selected.email}</p><p className="text-sm text-slate-400">{selected.phone || '—'}</p></div><Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button></div><div className="space-y-5 text-sm"><div><p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Profile</p><p>CRM: {selected.current_crm || '—'}</p><p>Leads/mo: {selected.monthly_leads || '—'}</p><p>Brokerage: {selected.brokerage_name || '—'}</p><p>Team: {selected.team_name || '—'}</p><p>Source: {selected.source || '—'}</p><p>Campaign: {selected.utm_campaign || '—'}</p><p>Signed up: {formatDateTime(selected.created_at)}</p></div><div><p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Outreach</p><p>Follow-up email: {selected.follow_up_sent ? 'Sent' : 'Not sent'}</p><p>Invited: {selected.invited ? 'Yes' : 'Not yet'}</p></div><div className="space-y-2">{!selected.invited && <Button onClick={() => void sendInvite(selected)} disabled={loadingInviteEmail === selected.email} className="w-full">{loadingInviteEmail === selected.email ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite Email'}</Button>}<Button variant="outline" className="w-full" onClick={() => void updateStatus(selected, 'declined')} disabled={statusSavingId === selected.id}>Mark as Declined</Button><Button variant="outline" className="w-full" onClick={() => void updateStatus(selected, 'contacted')} disabled={statusSavingId === selected.id}>Mark as Contacted</Button></div><div className="space-y-2"><p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Status</p><select className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2" value={selected.status} onChange={(e) => setSelected({ ...selected, status: e.target.value as SignupStatus })}><option value="new">new</option><option value="contacted">contacted</option><option value="approved">approved</option><option value="declined">declined</option></select><Button className="w-full" onClick={() => void updateStatus(selected, selected.status)} disabled={statusSavingId === selected.id}>Save Status</Button></div>{inlineError && <p className="text-sm text-red-300">{inlineError}</p>}</div></aside></div>}</div>
}
