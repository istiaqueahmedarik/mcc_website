import Image from 'next/image'
import Link from 'next/link'
import CodeforcesSubmissionDashboard from '@/components/codeforces-submission-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PastPerformanceChart from '@/components/past-performance-chart'


async function fetchAllSharedReports(){
  try{
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    const res = await fetch(`${base}/public-contest-report/all`, { cache: 'no-store' })
    return await res.json()
  } catch(e){ console.error(e); return { result: [] } }
}

function deriveUserPerformanceAcrossReports(vjudge, reports){
  const rows = []
  for(const r of (reports || [])){
    let merged
    try{ merged = JSON.parse(r.JSON_string) }catch(e){ continue }
    if(!merged || !Array.isArray(merged.users) || !Array.isArray(merged.contestIds)) continue
    const users = merged.users
    const comparePerf = (aPerf, bPerf) => {
      const aScore = aPerf?.finalScore ?? 0
      const bScore = bPerf?.finalScore ?? 0
      if (aScore !== bScore) return bScore - aScore
      const aSolved = aPerf?.solved ?? 0
      const bSolved = bPerf?.solved ?? 0
      if (aSolved !== bSolved) return bSolved - aSolved
      const aPen = aPerf?.penalty ?? Number.POSITIVE_INFINITY
      const bPen = bPerf?.penalty ?? Number.POSITIVE_INFINITY
      return aPen - bPen
    }
    for(const cid of merged.contestIds){
      const me = users.find(u => String(u.username) === String(vjudge) && u.contests && u.contests[cid])
      if(!me) continue
      const perf = me.contests[cid]
      const participants = users.filter(u => u.contests && u.contests[cid])
      const ranked = [...participants].sort((u1,u2)=>comparePerf(u1.contests[cid], u2.contests[cid]))
      const rankIdx = ranked.findIndex(u => String(u.username) === String(vjudge))
      const rank = rankIdx >= 0 ? rankIdx + 1 : undefined
      rows.push({
        roomName: merged.name || r.Shared_contest_id,
        contestId: cid,
        contestTitle: merged.contestIdToTitle?.[cid] || cid,
        solved: perf?.solved ?? 0,
        penalty: typeof perf?.penalty === 'number' ? perf.penalty : 0,
        score: typeof perf?.finalScore === 'number' ? perf.finalScore : 0,
        rank,
        participants: ranked.length,
      })
    }
  }
  const seen = new Set()
  const unique = []
  for(const row of rows){
    const key = `${row.roomName}__${row.contestId}`
    if(seen.has(key)) continue
    seen.add(key)
    unique.push(row)
  }
  // Summary
  const totalContests = unique.length
  const totalSolved = unique.reduce((s,r)=>s+(r.solved||0),0)
  const bestRank = unique.reduce((best,r)=> (r.rank && (!best || r.rank < best)) ? r.rank : best, undefined)
  const avgRank = unique.length>0 ? (unique.reduce((s,r)=>s+(r.rank||0),0) / unique.filter(r=>r.rank).length || 0) : 0
  return { rows: unique, summary: { totalContests, totalSolved, bestRank, avgRank: Number.isFinite(avgRank)? Number(avgRank.toFixed(2)): 0 } }
}

export const dynamic = 'force-dynamic'

async function fetchPublicProfile(vjudge){
  try{
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    const res = await fetch(`${base}/auth/public/profile/vj/${encodeURIComponent(vjudge)}`, { cache: 'no-store' })
    return await res.json()
  } catch(e){ console.error(e); return { error: 'Failed' } }
}

export default async function PublicProfilePage({ params }){
  const { vjudge } = params
  const [data, allReports] = await Promise.all([
    fetchPublicProfile(vjudge),
    fetchAllSharedReports(),
  ])
  if(data?.error || !data?.result){
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold">Profile not found</h1>
        <p className="text-muted-foreground mt-2">No user linked to VJudge ID: {vjudge}</p>
      </div>
    )
  }
  const u = data.result
  const perf = deriveUserPerformanceAcrossReports(vjudge, allReports?.result || [])
  return (
      <div className="container mx-auto py-8 px-4 space-y-6">
          
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Image src={u.profile_pic || '/vercel.svg'} alt={u.full_name || u.vjudge_id} width={96} height={96} className="rounded-full border" />
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-3xl font-bold">{u.full_name || u.vjudge_id}</h1>
                {u.vjudge_verified && <Badge className="bg-purple-600">VJudge Verified</Badge>}
                {u.cf_verified && <Badge className="bg-red-600">CF Verified</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground justify-center md:justify-start">
                <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                {u.email && <span>Email: {u.email}</span>}
                {u.phone && <span>Phone: {u.phone}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {u.vjudge_id && (
                  <Link href={`https://vjudge.net/user/${encodeURIComponent(u.vjudge_id)}`} target="_blank" className="underline text-purple-600">VJudge Profile</Link>
                )}
                {u.cf_id && (
                  <Link href={`https://codeforces.com/profile/${encodeURIComponent(u.cf_id)}`} target="_blank" className="underline text-red-600">Codeforces Profile</Link>
                )}
                {u.codechef_id && (
                  <Link href={`https://www.codechef.com/users/${encodeURIComponent(u.codechef_id)}`} target="_blank" className="underline text-amber-600">CodeChef Profile</Link>
                )}
                {u.atcoder_id && (
                  <Link href={`https://atcoder.jp/users/${encodeURIComponent(u.atcoder_id)}`} target="_blank" className="underline text-gray-600">AtCoder Profile</Link>
                )}
              </div>
            </div>
          </div>
        </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Past Contest Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="font-medium">Contests:</span> <Badge variant="secondary">{perf.summary.totalContests}</Badge>
                <span className="font-medium">Total Solved:</span> <Badge variant="secondary">{perf.summary.totalSolved}</Badge>
                {perf.summary.bestRank && (<><span className="font-medium">Best Rank:</span> <Badge variant="secondary">{perf.summary.bestRank}</Badge></>)}
                {perf.summary.avgRank > 0 && (<><span className="font-medium">Avg Rank:</span> <Badge variant="secondary">{perf.summary.avgRank}</Badge></>)}
              </div>

              <Tabs defaultValue="graph">
                <TabsList>
                  <TabsTrigger value="table">Table</TabsTrigger>
                  <TabsTrigger value="graph">Graph</TabsTrigger>
                </TabsList>

                <TabsContent value="table">
                  <ScrollArea className="w-full rounded-md border h-[60vh] whitespace-nowrap">
                    <div className="min-w-[800px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Room</TableHead>
                            <TableHead>Contest</TableHead>
                            <TableHead className="text-right">Rank</TableHead>
                            <TableHead className="text-right">Participants</TableHead>
                            <TableHead className="text-right">Solved</TableHead>
                            <TableHead className="text-right">Penalty</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {perf.rows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground">No appearances found in live shared data.</TableCell>
                            </TableRow>
                          ) : (
                            perf.rows.map((r, idx) => (
                              <TableRow key={`${r.roomName}-${r.contestId}-${idx}`}>
                                <TableCell>{r.roomName}</TableCell>
                                <TableCell>{r.contestTitle}</TableCell>
                                <TableCell className="text-right">{r.rank ?? '—'}</TableCell>
                                <TableCell className="text-right">{r.participants}</TableCell>
                                <TableCell className="text-right">{r.solved}</TableCell>
                                <TableCell className="text-right">{typeof r.penalty === 'number' ? r.penalty.toFixed(2) : r.penalty}</TableCell>
                                <TableCell className="text-right">{typeof r.score === 'number' ? r.score.toFixed(2) : r.score}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="graph">
                  <PastPerformanceChart rows={perf.rows} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

      {u.cf_id && (
        <Card>
          <CardHeader>
            <CardTitle>Codeforces Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeforcesSubmissionDashboard users={[{ id: u.id, full_name: u.full_name || u.vjudge_id, cf_id: u.cf_id }]} />
          </CardContent>
        </Card>
      )}

      
    </div>
  )
}
