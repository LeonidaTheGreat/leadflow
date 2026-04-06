'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  Target,
  Calendar,
  TrendingUp,
  MessageSquare,
  Facebook,
  Linkedin,
  Mail,
  Plus,
  Filter,
  Send,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Campaign {
  id: string
  name: string
  description: string
  goal_count: number
  start_date: string
  end_date: string
  status: string
  utm_campaign: string
}

interface Target {
  id: string
  name: string
  email: string
  phone: string
  location: string
  brokerage: string
  source_channel: string
  status: string
  notes: string
  priority: number
  created_at: string
}

interface CampaignStats {
  campaign: {
    name: string
    goal: number
    start_date: string
    end_date: string
    days_remaining: number
  }
  progress: {
    signed_up: number
    total_targets: number
    percentage: number
  }
  by_status: { status: string; count: string }[]
  by_channel: { source_channel: string; count: string }[]
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  reddit: <MessageSquare className="w-4 h-4" />,
  instagram: <MessageSquare className="w-4 h-4" />,
  twitter: <MessageSquare className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
}

const STATUS_COLORS: Record<string, string> = {
  identified: 'bg-slate-500',
  contacted: 'bg-blue-500',
  responded: 'bg-yellow-500',
  scheduled: 'bg-purple-500',
  signed_up: 'bg-emerald-500',
  declined: 'bg-red-500',
  nurture: 'bg-gray-500',
}

export default function PilotCampaignsPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [inviteLoading, setInviteLoading] = useState<string | null>(null)
  const [inviteResults, setInviteResults] = useState<Record<string, { url: string; copied: boolean }>>({})
  const [adminToken, setAdminToken] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    if (stored) {
      setAdminToken(stored)
    } else {
      const token = prompt('Enter admin token (ADMIN_SECRET):')
      if (token) {
        localStorage.setItem('admin_token', token)
        setAdminToken(token)
      }
    }
  }, [])
  const [newTarget, setNewTarget] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    brokerage: '',
    source_channel: 'facebook',
    notes: '',
    priority: 0
  })

  useEffect(() => {
    fetchCampaignData()
  }, [statusFilter])

  async function fetchCampaignData() {
    try {
      setLoading(true)
      
      // Fetch the active campaign
      const campaignsRes = await fetch('/api/admin/pilot-campaigns')
      const campaignsData = await campaignsRes.json()
      
      if (!campaignsData.success || !campaignsData.campaigns?.length) {
        setError('No active campaigns found')
        setLoading(false)
        return
      }

      const activeCampaign = campaignsData.campaigns.find((c: Campaign) => c.status === 'active') 
        || campaignsData.campaigns[0]
      
      setCampaign(activeCampaign)

      // Fetch stats
      const statsRes = await fetch(`/api/admin/pilot-campaigns/${activeCampaign.id}/stats`)
      const statsData = await statsRes.json()
      if (statsData.success) {
        setStats(statsData.stats)
      }

      // Fetch targets
      const url = statusFilter !== 'all' 
        ? `/api/admin/pilot-campaigns/${activeCampaign.id}/targets?status=${statusFilter}`
        : `/api/admin/pilot-campaigns/${activeCampaign.id}/targets`
      
      const targetsRes = await fetch(url)
      const targetsData = await targetsRes.json()
      if (targetsData.success) {
        setTargets(targetsData.targets)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign data')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTarget(e: React.FormEvent) {
    e.preventDefault()
    if (!campaign) return

    try {
      const res = await fetch(`/api/admin/pilot-campaigns/${campaign.id}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTarget)
      })

      const data = await res.json()
      if (data.success) {
        setTargets([data.target, ...targets])
        setIsAddDialogOpen(false)
        setNewTarget({
          name: '',
          email: '',
          phone: '',
          location: '',
          brokerage: '',
          source_channel: 'facebook',
          notes: '',
          priority: 0
        })
        // Refresh stats
        fetchCampaignData()
      }
    } catch (err) {
      console.error('Error adding target:', err)
    }
  }

  async function handleUpdateStatus(targetId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/admin/pilot-targets/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await res.json()
      if (data.success) {
        setTargets(targets.map(t => t.id === targetId ? { ...t, status: newStatus } : t))
        fetchCampaignData()
      }
    } catch (err) {
      console.error('Error updating target:', err)
    }
  }

  async function handleSendInvite(targetId: string) {
    if (!adminToken) {
      alert('Admin token not set. Refresh the page.')
      return
    }

    setInviteLoading(targetId)
    try {
      const res = await fetch(`/api/admin/pilot-targets/${targetId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
      })

      const data = await res.json()
      if (data.success) {
        setInviteResults(prev => ({ ...prev, [targetId]: { url: data.inviteUrl, copied: false } }))
        setTargets(targets.map(t => t.id === targetId ? { ...t, status: 'contacted' } : t))
        fetchCampaignData()
      } else {
        alert(`Failed to send invite: ${data.error}`)
      }
    } catch (err) {
      alert('Error sending invite — check console')
      console.error(err)
    } finally {
      setInviteLoading(null)
    }
  }

  function copyInviteUrl(targetId: string) {
    const result = inviteResults[targetId]
    if (!result) return
    navigator.clipboard.writeText(result.url)
    setInviteResults(prev => ({ ...prev, [targetId]: { ...prev[targetId], copied: true } }))
    setTimeout(() => {
      setInviteResults(prev => ({ ...prev, [targetId]: { ...prev[targetId], copied: false } }))
    }, 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading campaign data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-slate-400">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-white">Pilot Recruitment Campaign</h1>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Target
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Recruitment Target</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddTarget} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Name *</Label>
                      <Input
                        value={newTarget.name}
                        onChange={e => setNewTarget({...newTarget, name: e.target.value})}
                        className="bg-slate-800 border-slate-600 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Channel *</Label>
                      <Select 
                        value={newTarget.source_channel}
                        onValueChange={v => setNewTarget({...newTarget, source_channel: v})}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="reddit">Reddit</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Email</Label>
                      <Input
                        type="email"
                        value={newTarget.email}
                        onChange={e => setNewTarget({...newTarget, email: e.target.value})}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Phone</Label>
                      <Input
                        value={newTarget.phone}
                        onChange={e => setNewTarget({...newTarget, phone: e.target.value})}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Location</Label>
                      <Input
                        value={newTarget.location}
                        onChange={e => setNewTarget({...newTarget, location: e.target.value})}
                        className="bg-slate-800 border-slate-600 text-white"
                        placeholder="City, State"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Brokerage</Label>
                      <Input
                        value={newTarget.brokerage}
                        onChange={e => setNewTarget({...newTarget, brokerage: e.target.value})}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-300">Notes</Label>
                    <Textarea
                      value={newTarget.notes}
                      onChange={e => setNewTarget({...newTarget, notes: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                      placeholder="Research notes, pain points, etc."
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                    Add Target
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {stats.progress.signed_up} / {stats.campaign.goal}
                </div>
                <Progress 
                  value={stats.progress.percentage} 
                  className="mt-2 h-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {stats.progress.percentage.toFixed(1)}% complete
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {stats.progress.total_targets}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Prospects in pipeline
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Days Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stats.campaign.days_remaining < 7 ? 'text-red-400' : 'text-white'}`}>
                  {stats.campaign.days_remaining}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Until {new Date(stats.campaign.end_date).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {stats.progress.total_targets > 0 
                    ? ((stats.progress.signed_up / stats.progress.total_targets) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Signed up / Total
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Channel Breakdown */}
        {stats?.by_channel && stats.by_channel.length > 0 && (
          <Card className="bg-slate-900 border-slate-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Targets by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {stats.by_channel.map((channel) => (
                  <div key={channel.source_channel} className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg">
                    {CHANNEL_ICONS[channel.source_channel] || <MessageSquare className="w-4 h-4" />}
                    <span className="text-slate-300 capitalize">{channel.source_channel}</span>
                    <Badge variant="secondary" className="bg-slate-700 text-white">
                      {channel.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Breakdown */}
        {stats?.by_status && stats.by_status.length > 0 && (
          <Card className="bg-slate-900 border-slate-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Pipeline Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {stats.by_status.map((status) => (
                  <div key={status.status} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status.status] || 'bg-slate-500'}`} />
                    <span className="text-slate-300 capitalize">{status.status.replace('_', ' ')}</span>
                    <Badge variant="secondary" className="bg-slate-800 text-white">
                      {status.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Targets List */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Recruitment Targets</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="identified">Identified</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="signed_up">Signed Up</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {targets.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No targets found. Add your first recruitment target to get started.
                </div>
              ) : (
                targets.map((target) => (
                  <div 
                    key={target.id} 
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-semibold">
                        {target.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{target.name}</h3>
                          <Badge className={`${STATUS_COLORS[target.status]} text-white text-xs`}>
                            {target.status.replace('_', ' ')}
                          </Badge>
                          {target.priority > 0 && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-400 text-xs">
                              Priority
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                          {target.location && <span>{target.location}</span>}
                          {target.brokerage && <span>• {target.brokerage}</span>}
                          {target.email && <span>• {target.email}</span>}
                        </div>
                        {target.notes && (
                          <p className="text-sm text-slate-500 mt-2">{target.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-slate-400">
                          {CHANNEL_ICONS[target.source_channel] || <MessageSquare className="w-4 h-4" />}
                          <span className="text-sm capitalize">{target.source_channel}</span>
                        </div>
                        <Select
                          value={target.status}
                          onValueChange={(v) => handleUpdateStatus(target.id, v)}
                        >
                          <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="identified">Identified</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="responded">Responded</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="signed_up">Signed Up</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                            <SelectItem value="nurture">Nurture</SelectItem>
                          </SelectContent>
                        </Select>
                        {target.email && (target.status === 'identified' || target.status === 'contacted') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/30 text-xs"
                            disabled={inviteLoading === target.id}
                            onClick={() => handleSendInvite(target.id)}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {inviteLoading === target.id ? 'Sending...' : 'Send Invite'}
                          </Button>
                        )}
                      </div>
                      {inviteResults[target.id] && (
                        <div className="flex items-center gap-1 bg-slate-800 rounded px-2 py-1 max-w-xs">
                          <code className="text-xs text-emerald-400 truncate flex-1">
                            {inviteResults[target.id].url}
                          </code>
                          <button
                            onClick={() => copyInviteUrl(target.id)}
                            className="flex-shrink-0 p-1 hover:bg-slate-700 rounded"
                            title="Copy invite link"
                          >
                            {inviteResults[target.id].copied
                              ? <Check className="w-3 h-3 text-emerald-400" />
                              : <Copy className="w-3 h-3 text-slate-400" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
