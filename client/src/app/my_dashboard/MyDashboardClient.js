'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.full_name}!</p>
      </div>

      {/* User Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">Account verified and active</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Codeforces</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold mb-2">{cfId || 'Not Set'}</div>
            {getStatusBadge(cfStatus)}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VJudge</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold mb-2">{vjudgeId || 'Not Set'}</div>
            {getStatusBadge(vjudgeStatus)}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="verification" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="verification">Platform Verification</TabsTrigger>
          <TabsTrigger value="schedule">Schedules</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Platform Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Codeforces Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Codeforces Verification
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Verify your Codeforces account to participate in contests and tracking
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cf-handle">Codeforces Handle</Label>
                  <Input
                    id="cf-handle"
                    placeholder="Enter your Codeforces handle"
                    value={cfId}
                    onChange={(e) => setCfId(e.target.value)}
                    disabled={cfStatus === true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Status:</span>
                    {getStatusBadge(cfStatus)}
                  </div>
                  {cfStatus !== true && (
                    <Button 
                      onClick={handleCfSubmit} 
                      disabled={loading.cf}
                      size="sm"
                    >
                      {loading.cf ? 'Submitting...' : 'Submit for Verification'}
                    </Button>
                  )}
                </div>
                {cfId && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <a 
                      href={`https://codeforces.com/profile/${cfId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      View Codeforces Profile
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* VJudge Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  VJudge Verification
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Verify your VJudge account for virtual contest participation
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vjudge-handle">VJudge Handle</Label>
                  <Input
                    id="vjudge-handle"
                    placeholder="Enter your VJudge handle"
                    value={vjudgeId}
                    onChange={(e) => setVjudgeId(e.target.value)}
                    disabled={vjudgeStatus === true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Status:</span>
                    {getStatusBadge(vjudgeStatus)}
                  </div>
                  {vjudgeStatus !== true && (
                    <Button 
                      onClick={handleVjudgeSubmit} 
                      disabled={loading.vjudge}
                      size="sm"
                    >
                      {loading.vjudge ? 'Submitting...' : 'Submit for Verification'}
                    </Button>
                  )}
                </div>
                {vjudgeId && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <a 
                      href={`https://vjudge.net/user/${vjudgeId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      View VJudge Profile
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Verification Info */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Process</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium">Submit Your Handle</p>
                    <p className="text-muted-foreground">Enter your Codeforces or VJudge handle in the form above</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium">Admin Review</p>
                    <p className="text-muted-foreground">Our admins will verify that the handle belongs to you</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium">Verification Complete</p>
                    <p className="text-muted-foreground">Once verified, you can participate in contests and tracking</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Schedules</CardTitle>
              <p className="text-sm text-muted-foreground">Your upcoming contests and events</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">No upcoming schedules found.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <p className="text-sm text-muted-foreground">Your contest performance and statistics</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Performance data will be available once your accounts are verified.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}