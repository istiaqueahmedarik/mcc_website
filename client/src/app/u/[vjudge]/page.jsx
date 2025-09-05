import Image from 'next/image'

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
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4">
        <Image src={u.profile_pic || '/vercel.svg'} alt={u.full_name || u.vjudge_id} width={64} height={64} className="rounded-full" />
        <div>
          <h1 className="text-2xl font-bold">{u.full_name || u.vjudge_id}</h1>
          <p className="text-sm text-muted-foreground">VJudge: {u.vjudge_id}</p>
        </div>
      </div>
    </div>
  )
}
