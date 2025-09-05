import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

async function fetchAllSharedReports(){
  try{
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    const res = await fetch(`${base}/public-contest-report/all`, { cache: 'no-store' })
    return await res.json()
  } catch(e){ console.error(e); return { result: [], error: 'Failed to load' } }
}

export const dynamic = 'force-dynamic'

export default async function PublicSharedReportsPage(){
  const data = await fetchAllSharedReports()
  const items = Array.isArray(data?.result) ? data.result : []

  const parsed = items.map((r) => {
    let merged = null
    try { merged = r?.JSON_string ? JSON.parse(r.JSON_string) : null } catch(e) {}
    const name = merged?.name || 'Shared Contest Room'
    const contests = Array.isArray(merged?.contestIds) ? merged.contestIds.length : 0
    const participants = Array.isArray(merged?.users) ? merged.users.length : 0
    const updated = r?.Updated_at || r?.created_at
    const updatedTime = updated ? new Date(updated).getTime() : 0
    const updatedLabel = updated ? new Date(updated).toLocaleString() : '—'
    return {
      id: r?.Shared_contest_id,
      name,
      contests,
      participants,
      updated: updatedLabel,
      _updatedTime: updatedTime,
    }
  })

  // Sort by most recently updated first
  parsed.sort((a, b) => b._updatedTime - a._updatedTime)

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold">Public Contest Room Reports</h1>
        <Badge variant="secondary">{parsed.length} shared</Badge>
      </div>

      {parsed.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No shared reports available yet.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="w-full rounded-md border">
          <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {parsed.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2 leading-snug">{item.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline">Contests: {item.contests}</Badge>
                    <Badge variant="outline">Participants: {item.participants}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Last updated: {item.updated}</div>
                  <div className="mt-auto">
                    <Link href={`/contests_report/live/${encodeURIComponent(item.id)}`}>
                      <Button className="w-full">View Live Report</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
