"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { post_with_token, get_with_token } from "@/lib/action"

export default function CodeforcesVerifyClient(){
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await get_with_token('user/cf/pending')
      if(res?.error){ setError(res.error); setRows([]) }
      else setRows(res.result || [])
    } catch(e){ setError('Failed to load'); setRows([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const setVerify = async (user_id, verified=true) => {
    try {
      await post_with_token('user/cf/verify', { user_id, verified })
      await load()
    } catch(e){ console.error(e) }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Codeforces Verification (Admin)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {!loading && rows.length === 0 && !error && <div className="text-sm text-muted-foreground">No pending users.</div>}
          <div className="space-y-3">
            {rows.map(u => (
              <div key={u.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="font-medium">{u.full_name} <span className="text-xs text-muted-foreground">({u.email})</span></div>
                  <div className="text-sm">Codeforces: <span className="font-mono">{u.cf_id}</span></div>
                  <div className="text-sm">VJudge: <span className="font-mono">{u.vjudge_id || '—'}</span> {u.vjudge_verified && <Badge className="ml-2">VJ Verified</Badge>}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setVerify(u.id, true)}>Verify</Button>
                  <Button size="sm" variant="outline" onClick={() => setVerify(u.id, false)}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
