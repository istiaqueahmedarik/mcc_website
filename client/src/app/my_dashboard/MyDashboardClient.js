'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { post_with_token } from '@/lib/action'
import { AlertCircle, CheckCircle, Clock, Code, ExternalLink, Trophy, User } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function MyDashboardClient({ token, user }) {
  const [cfId, setCfId] = useState(user?.cf_id || '')
  const [vjudgeId, setVjudgeId] = useState(user?.vjudge_id || '')
  const [cfStatus, setCfStatus] = useState(user?.cf_verified || false)
  const [vjudgeStatus, setVjudgeStatus] = useState(user?.vjudge_verified || false)
  const [loading, setLoading] = useState({ cf: false, vjudge: false })

  const handleCfSubmit = async () => {
    if (!cfId.trim()) {
      toast.error('Please enter your Codeforces handle')
      return
    }

    setLoading(prev => ({ ...prev, cf: true }))
    try {
      const response = await post_with_token('user/cf/submit', { cf_id: cfId.trim() })
      if (response.error) {
        toast.error(response.error)
      } else {
        toast.success('Codeforces ID submitted for verification')
        // Refresh user data or set pending status
        setCfStatus('pending')
      }
    } catch (error) {
      toast.error('Failed to submit Codeforces ID')
    }
    setLoading(prev => ({ ...prev, cf: false }))
  }

  const handleVjudgeSubmit = async () => {
    if (!vjudgeId.trim()) {
      toast.error('Please enter your VJudge handle')
      return
    }

    setLoading(prev => ({ ...prev, vjudge: true }))
    try {
      const response = await post_with_token('user/vjudge/submit', { vjudge_id: vjudgeId.trim() })
      if (response.error) {
        toast.error(response.error)
      } else {
        toast.success('VJudge ID submitted for verification')
        // Refresh user data or set pending status
        setVjudgeStatus('pending')
      }
    } catch (error) {
      toast.error('Failed to submit VJudge ID')
    }
    setLoading(prev => ({ ...prev, vjudge: false }))
  }

  const getStatusBadge = (status) => {
    if (status === true) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
    } else if (status === 'pending') {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
    } else {
      return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Not Verified</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b pb-6">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Student dashboard</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            {user?.full_name || 'My workspace'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform identity and training readiness in one place.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-lg border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">Account ready</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Codeforces</CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="mb-2 truncate text-lg font-bold">{cfId || 'Not set'}</div>
              {getStatusBadge(cfStatus)}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VJudge</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="mb-2 truncate text-lg font-bold">{vjudgeId || 'Not set'}</div>
              {getStatusBadge(vjudgeStatus)}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Platform verification</h2>
            <p className="text-sm text-muted-foreground">Submit handles for trainer/admin review.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-lg border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Code className="h-5 w-5 text-muted-foreground" />
                  Codeforces
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cf-handle">Handle</Label>
                  <Input
                    id="cf-handle"
                    placeholder="Codeforces handle"
                    value={cfId}
                    onChange={(e) => setCfId(e.target.value)}
                    disabled={cfStatus === true}
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getStatusBadge(cfStatus)}
                  </div>
                  {cfStatus !== true && (
                    <Button onClick={handleCfSubmit} disabled={loading.cf} size="sm">
                      {loading.cf ? 'Submitting...' : 'Submit'}
                    </Button>
                  )}
                </div>
                {cfId && (
                  <a
                    href={`https://codeforces.com/profile/${cfId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Codeforces profile
                  </a>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  VJudge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vjudge-handle">Handle</Label>
                  <Input
                    id="vjudge-handle"
                    placeholder="VJudge handle"
                    value={vjudgeId}
                    onChange={(e) => setVjudgeId(e.target.value)}
                    disabled={vjudgeStatus === true}
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getStatusBadge(vjudgeStatus)}
                  </div>
                  {vjudgeStatus !== true && (
                    <Button onClick={handleVjudgeSubmit} disabled={loading.vjudge} size="sm">
                      {loading.vjudge ? 'Submitting...' : 'Submit'}
                    </Button>
                  )}
                </div>
                {vjudgeId && (
                  <a
                    href={`https://vjudge.net/user/${vjudgeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View VJudge profile
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-3 border-t pt-5 sm:grid-cols-2">
          <div className="border-l pl-3">
            <p className="text-sm font-semibold">Schedules</p>
            <p className="text-sm text-muted-foreground">No upcoming schedules found.</p>
          </div>
          <div className="border-l pl-3">
            <p className="text-sm font-semibold">Performance</p>
            <p className="text-sm text-muted-foreground">Available after verified activity.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
