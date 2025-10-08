'use client'
import Accept from '@/components/Accept'
import Reject from '@/components/Reject'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { get_with_token, pendingUsers, post_with_token } from '@/lib/action'
import { AlertCircle, CheckCircle, ExternalLink, UserCheck, Users } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function AdminDashboardClient({ token }) {
   const [pendingU, setPendingU] = useState([])
   const [cfPending, setCfPending] = useState([])
   const [vjudgePending, setVjudgePending] = useState([])
   const [loading, setLoading] = useState({
      users: true,
      cf: true,
      vjudge: true
   })
   const [processingCf, setProcessingCf] = useState(new Set())
   const [processingVjudge, setProcessingVjudge] = useState(new Set())
   const [stats, setStats] = useState({
      totalPendingUsers: 0,
      totalCfPending: 0,
      totalVjudgePending: 0
   })

   const loadData = async () => {
      // Start all loading states
      setLoading({ users: true, cf: true, vjudge: true })
      
      try {
         // Load all data in parallel for faster loading
         const [pendingUsersData, cfRes, vjudgeRes] = await Promise.all([
            pendingUsers().catch(err => { console.error('Failed to load pending users:', err); return null; }),
            get_with_token('user/cf/pending').catch(err => { console.error('Failed to load CF pending:', err); return null; }),
            get_with_token('user/vjudge/pending').catch(err => { console.error('Failed to load VJudge pending:', err); return null; })
         ])

         // Update data as it loads
         setPendingU(pendingUsersData || [])
         setCfPending(cfRes?.result || [])
         setVjudgePending(vjudgeRes?.result || [])

         // Update stats
         setStats({
            totalPendingUsers: (pendingUsersData || []).length,
            totalCfPending: (cfRes?.result || []).length,
            totalVjudgePending: (vjudgeRes?.result || []).length
         })

         // All data loaded successfully
         setLoading({ users: false, cf: false, vjudge: false })
      } catch (error) {
         console.error('Failed to load admin data:', error)
         // Set all loading to false even on error
         setLoading({ users: false, cf: false, vjudge: false })
      }
   }

   useEffect(() => {
      loadData()
   }, [])

   const setVerifyCf = async (user_id, verified = true) => {
      setProcessingCf(prev => new Set([...prev, user_id]))
      try {
         const response = await post_with_token('user/cf/verify', { user_id, verified })
         if (response.error) {
            console.error('CF verification error:', response.error)
            alert(`Error: ${response.error}`)
         } else {
            console.log(`CF ${verified ? 'verified' : 'rejected'} for user ${user_id}`)
         }
         await loadData()
      } catch (e) {
         console.error('CF verification failed:', e)
         alert('Failed to process CF verification')
      }
      setProcessingCf(prev => {
         const newSet = new Set(prev)
         newSet.delete(user_id)
         return newSet
      })
   }

   const setVerifyVjudge = async (user_id, verified = true) => {
      setProcessingVjudge(prev => new Set([...prev, user_id]))
      try {
         const response = await post_with_token('user/vjudge/verify', { user_id, verified })
         if (response.error) {
            console.error('VJudge verification error:', response.error)
            alert(`Error: ${response.error}`)
         } else {
            console.log(`VJudge ${verified ? 'verified' : 'rejected'} for user ${user_id}`)
         }
         await loadData()
      } catch (e) {
         console.error('VJudge verification failed:', e)
         alert('Failed to process VJudge verification')
      }
      setProcessingVjudge(prev => {
         const newSet = new Set(prev)
         newSet.delete(user_id)
         return newSet
      })
   }

   console.log({ pendingU, cfPending, vjudgePending, stats })

   // Show initial loading only if all sections are loading
   const isInitialLoading = loading.users && loading.cf && loading.vjudge

   if (isInitialLoading) {
      return (
         <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-center h-64">
               <div className="text-lg">Loading admin dashboard...</div>
            </div>
         </div>
      )
   }

   return (
      <div className="container mx-auto py-8 px-4">


         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending User Approvals</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPendingUsers}</div>
                  <p className="text-xs text-muted-foreground">Users waiting for approval</p>
               </CardContent>
            </Card>

            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CF Verifications</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCfPending}</div>
                  <p className="text-xs text-muted-foreground">Codeforces IDs pending</p>
               </CardContent>
            </Card>

            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">VJudge Verifications</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{stats.totalVjudgePending}</div>
                  <p className="text-xs text-muted-foreground">VJudge IDs pending</p>
               </CardContent>
            </Card>
         </div>

         {/* Main Content Tabs */}
         <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
               <TabsTrigger value="users">User Approvals ({stats.totalPendingUsers})</TabsTrigger>
               <TabsTrigger value="codeforces">Codeforces ({stats.totalCfPending})</TabsTrigger>
               <TabsTrigger value="vjudge">VJudge ({stats.totalVjudgePending})</TabsTrigger>
            </TabsList>

            {/* User Approvals Tab */}
            <TabsContent value="users" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle>Pending User Approvals</CardTitle>
                     <p className="text-sm text-muted-foreground">Review and approve new user registrations</p>
                  </CardHeader>
                  <CardContent>
                     {loading.users ? (
                        <div className="flex items-center justify-center py-8">
                           <div className="text-sm text-muted-foreground">Loading user approvals...</div>
                        </div>
                     ) : pendingU && pendingU.length > 0 ? (
                        <Table>
                           <TableHeader>
                              <TableRow>
                                 <TableHead>Full Name</TableHead>
                                 <TableHead>Email</TableHead>
                                 <TableHead>MIST ID</TableHead>
                                 <TableHead>MIST ID Card</TableHead>
                                 <TableHead>Actions</TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {pendingU.map((user, index) => (
                                 <TableRow key={index}>
                                    <TableCell className="font-medium">{user.full_name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.mist_id}</TableCell>
                                    <TableCell>
                                       <Dialog>
                                          <DialogTrigger>
                                             <Image
                                                src={user.mist_id_card}
                                                alt={user.full_name}
                                                width={40}
                                                height={40}
                                                className="rounded cursor-pointer hover:opacity-80"
                                             />
                                          </DialogTrigger>
                                          <DialogContent className="max-w-2xl">
                                             <DialogHeader>
                                                <DialogTitle>MIST ID Card - {user.full_name}</DialogTitle>
                                                <DialogDescription>
                                                   <Image
                                                      src={user.mist_id_card}
                                                      alt={user.full_name}
                                                      width={600}
                                                      height={600}
                                                      className="w-full h-auto"
                                                   />
                                                </DialogDescription>
                                             </DialogHeader>
                                          </DialogContent>
                                       </Dialog>
                                    </TableCell>
                                    <TableCell>
                                       <div className="flex gap-2">
                                          <Accept userId={user.id} />
                                          <Reject userId={user.id} />
                                       </div>
                                    </TableCell>
                                 </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                     ) : (
                        <div className="text-center py-8">
                           <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                           <h3 className="text-lg font-medium mb-2">No Pending Users</h3>
                           <p className="text-sm text-muted-foreground">All user registrations have been processed.</p>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>

            {/* Codeforces Verification Tab */}
            <TabsContent value="codeforces" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle>Codeforces Verification</CardTitle>
                     <p className="text-sm text-muted-foreground">Verify user Codeforces accounts</p>
                  </CardHeader>
                  <CardContent>
                     {loading.cf ? (
                        <div className="flex items-center justify-center py-8">
                           <div className="text-sm text-muted-foreground">Loading CF verifications...</div>
                        </div>
                     ) : cfPending.length > 0 ? (
                        <div className="space-y-3">
                           {cfPending.map(u => (
                              <div key={u.id} className="flex items-center justify-between border rounded-md p-4">
                                 <div>
                                    <div className="font-medium">{u.full_name}
                                       <span className="text-xs text-muted-foreground ml-2">({u.email})</span>
                                    </div>
                                    <div className="text-sm mt-1">
                                       <strong>Codeforces: </strong>
                                       <a
                                          href={`https://codeforces.com/profile/${u.cf_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                                       >
                                          {u.cf_id}
                                          <ExternalLink className="h-3 w-3" />
                                       </a>
                                    </div>
                                    <div className="text-sm mt-1">
                                       <strong>VJudge: </strong>
                                       {u.vjudge_id ? (
                                          <a
                                             href={`https://vjudge.net/user/${u.vjudge_id}`}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                                          >
                                             {u.vjudge_id}
                                             <ExternalLink className="h-3 w-3" />
                                          </a>
                                       ) : (
                                          <span className="font-mono">—</span>
                                       )}
                                       {u.vjudge_verified && <Badge variant="secondary" className="ml-2">VJ Verified</Badge>}
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Button 
                                       size="sm" 
                                       onClick={() => setVerifyCf(u.id, true)}
                                       disabled={processingCf.has(u.id)}
                                    >
                                       {processingCf.has(u.id) ? 'Processing...' : 'Verify'}
                                    </Button>
                                    <Button 
                                       size="sm" 
                                       variant="outline" 
                                       onClick={() => setVerifyCf(u.id, false)}
                                       disabled={processingCf.has(u.id)}
                                    >
                                       {processingCf.has(u.id) ? 'Processing...' : 'Reject'}
                                    </Button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-8">
                           <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                           <h3 className="text-lg font-medium mb-2">No Pending Verifications</h3>
                           <p className="text-sm text-muted-foreground">All Codeforces accounts have been verified.</p>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>

            {/* VJudge Verification Tab */}
            <TabsContent value="vjudge" className="space-y-4">
               <Card>
                  <CardHeader>
                     <CardTitle>VJudge Verification</CardTitle>
                     <p className="text-sm text-muted-foreground">Verify user VJudge accounts</p>
                  </CardHeader>
                  <CardContent>
                     {loading.vjudge ? (
                        <div className="flex items-center justify-center py-8">
                           <div className="text-sm text-muted-foreground">Loading VJudge verifications...</div>
                        </div>
                     ) : vjudgePending.length > 0 ? (
                        <div className="space-y-3">
                           {vjudgePending.map(u => (
                              <div key={u.id} className="flex items-center justify-between border rounded-md p-4">
                                 <div>
                                    <div className="font-medium">{u.full_name}
                                       <span className="text-xs text-muted-foreground ml-2">({u.email})</span>
                                    </div>
                                    <div className="text-sm mt-1">
                                       <strong>VJudge: </strong>
                                       <a
                                          href={`https://vjudge.net/user/${u.vjudge_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                                       >
                                          {u.vjudge_id}
                                          <ExternalLink className="h-3 w-3" />
                                       </a>
                                    </div>
                                    <div className="text-sm mt-1">
                                       <strong>Codeforces: </strong>
                                       {u.cf_id ? (
                                          <a
                                             href={`https://codeforces.com/profile/${u.cf_id}`}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                                          >
                                             {u.cf_id}
                                             <ExternalLink className="h-3 w-3" />
                                          </a>
                                       ) : (
                                          <span className="font-mono">—</span>
                                       )}
                                       {u.cf_verified && <Badge variant="secondary" className="ml-2">CF Verified</Badge>}
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Button 
                                       size="sm" 
                                       onClick={() => setVerifyVjudge(u.id, true)}
                                       disabled={processingVjudge.has(u.id)}
                                    >
                                       {processingVjudge.has(u.id) ? 'Processing...' : 'Verify'}
                                    </Button>
                                    <Button 
                                       size="sm" 
                                       variant="outline" 
                                       onClick={() => setVerifyVjudge(u.id, false)}
                                       disabled={processingVjudge.has(u.id)}
                                    >
                                       {processingVjudge.has(u.id) ? 'Processing...' : 'Reject'}
                                    </Button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-8">
                           <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                           <h3 className="text-lg font-medium mb-2">No Pending Verifications</h3>
                           <p className="text-sm text-muted-foreground">All VJudge accounts have been verified.</p>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </TabsContent>
         </Tabs>
      </div>
   )
}