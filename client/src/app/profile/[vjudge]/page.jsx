import Image from 'next/image'
import Link from 'next/link'
import CodeforcesSubmissionDashboard from '@/components/codeforces-submission-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  const data = await fetchPublicProfile(vjudge)
  if(data?.error || !data?.result){
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold">Profile not found</h1>
        <p className="text-muted-foreground mt-2">No user linked to VJudge ID: {vjudge}</p>
      </div>
    )
  }
  const u = data.result
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
