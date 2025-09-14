import { publicFinalizedTeamsByContest } from '@/actions/team_collection'
import Link from 'next/link'
import Image from 'next/image'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { get_with_token } from '@/lib/action'

export const dynamic = 'force-dynamic'

async function fetchPublicProfile(vjudge){
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    const r = await fetch(`${base}/auth/public/profile/vj/${encodeURIComponent(vjudge)}`, { cache: 'force-cache', next: { revalidate: 300 } })
    return await r.json()
  } catch (e){
    return { error: 'failed' }
  }
}

async function fetchCurrentUser(){
  const user = await get_with_token('auth/user/profile')
  console.log(user);
  return user?.error ? null : user.result[0]
}

export default async function FinalizedTeamsByContestPage(){
  const [res, me] = await Promise.all([
    publicFinalizedTeamsByContest(),
    fetchCurrentUser()
  ])
  const blocks = res?.result || []
  const isAdmin = !!me?.admin

  const memberSet = new Set()
  for (const b of blocks){
    for (const t of b.teams || []){
      for (const m of (t.members || [])) memberSet.add(m)
      if (t.coach_vjudge_id) memberSet.add(t.coach_vjudge_id)
    }
  }
  const allMembers = Array.from(memberSet)
  const profilesArr = await Promise.all(allMembers.map(async vj => ({ vj, data: await fetchPublicProfile(vj) })))
  const profileMap = new Map(profilesArr.map(p => [p.vj, p.data?.result || {}]))

  const yearNow = new Date().getFullYear()
  const deriveLevel = (mistId) => {
    if(!mistId) return '-'
    const s = String(mistId)
    if(s.length < 4) return '-'
    const year = parseInt(s.slice(0,4))
    if(!Number.isFinite(year)) return '-'
    const lvl = yearNow - year
    return lvl > 0 ? lvl : 1
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
      <div className="max-w-7xl mx-auto px-5 space-y-16">
        <header className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Finalized Teams</h1>
          {isAdmin && (
            <p className="inline-flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">Admin View Enabled</p>
          )}
        </header>

        {blocks.length === 0 && (
          <div className="mx-auto max-w-md text-center rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-8">
            <p className="text-sm text-muted-foreground">No finalized teams yet. Check back soon.</p>
          </div>
        )}

        {blocks.map(block => (
          <section key={block.collection_id} className="space-y-6" aria-labelledby={`c-${block.collection_id}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 id={`c-${block.collection_id}`} className="text-2xl font-semibold text-center tracking-tight flex items-center gap-3">
                <span>{block.collection_title || 'Untitled Collection'}</span>
                <span className="inline-flex h-6 w-32 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 text-primary/60 shadow-inner">{block.teams.length} teams</span>
              </h2>
            </div>

            {!isAdmin && (
              <>
                {/* Public (shared) compact leaderboard */}
                <div className="px-2 pb-2 text-xs text-center font-medium uppercase tracking-wider text-muted-foreground">Public Leaderboard</div>
                <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur shadow-sm overflow-hidden">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead className="w-24 text-center">Team</TableHead>
                        <TableHead className="w-24">Score</TableHead>
                        <TableHead className="w-40">Member</TableHead>
                        <TableHead className="w-28">ID</TableHead>
                        {/* <TableHead className="w-16">Level</TableHead> */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {block.teams.map((t, idx) => {
                        const top = idx === 0
                        const scoreCell = (
                          <span className="inline-flex items-center gap-1 font-medium">
                            {typeof t.combined_score === 'number' ? t.combined_score.toFixed(2) : '—'}
                            {top && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20  border border-emerald-500/30">Top</span>}
                          </span>
                        )
                        return t.members.map((m, mi) => {
                          const p = profileMap.get(m) || {}
                          const display = p.full_name || m
                          const img = p.profile_pic
                          return (
                            <TableRow key={`${t.id}_${m}`} className={top ? '' : ''}>
                              {mi === 0 && <TableCell rowSpan={t.members.length} className="font-semibold align-middle text-center">{idx+1}</TableCell>}
                              {mi === 0 && (
                                <TableCell rowSpan={t.members.length} className="align-middle text-center">
                                  <Link href={`/team/final/${t.id}`} className="font-medium hover:text-primary transition-colors inline-block">{t.team_title}</Link>
                                </TableCell>
                              )}
                              {mi === 0 && <TableCell rowSpan={t.members.length}>{scoreCell}</TableCell>}
                              <TableCell>
                                <Link href={`/profile/${encodeURIComponent(m)}`} className="flex items-center gap-2 hover:text-primary">
                                  <span className="relative w-6 h-6 rounded-full overflow-hidden ring-2 ring-background/60 shadow-sm">
                                    {img ? <Image src={img} alt={display} fill sizes="24px" className="object-cover" /> : <span className="w-full h-full flex items-center justify-center text-[10px] font-semibold bg-muted/70">{display.charAt(0).toUpperCase()}</span>}
                                  </span>
                                  <span className="truncate max-w-[8rem] text-[12px]">{display}</span>
                                </Link>
                              </TableCell>
                              <TableCell className="text-muted-foreground/90">{profileMap.get(m)?.mist_id || '-'}</TableCell>
                              {/* <TableCell>{deriveLevel(profileMap.get(m)?.mist_id)}</TableCell> */}
                            </TableRow>
                          )
                        })
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {isAdmin && (
              <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur shadow-inner overflow-hidden">
                <div className="px-4 pt-4 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin Detailed View</div>
                <Table className="text-[13px]">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="w-48 text-center">Team</TableHead>
                      <TableHead className="w-48">Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-28">ID</TableHead>
                      <TableHead className="w-16">Level</TableHead>
                      <TableHead className="w-28">Contact</TableHead>
                      <TableHead className="w-40">Coach</TableHead>
                      <TableHead className="w-40">Coach Email</TableHead>
                      <TableHead className="w-28">Coach Contact</TableHead>
                      <TableHead className="w-24">Coach T-Shirt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {block.teams.map((t, idx) => {
                      const coachProfile = t.coach_vjudge_id ? profileMap.get(t.coach_vjudge_id) || {} : {}
                      return t.members.map((m, mi) => {
                        const p = profileMap.get(m) || {}
                        const display = p.full_name || m
                        const img = p.profile_pic
                        return (
                          <TableRow key={`${t.id}_${m}`}>
                            {mi === 0 && <TableCell rowSpan={t.members.length} className="align-middle font-semibold text-center">{idx+1}</TableCell>}
                            {mi === 0 && (
                              <TableCell rowSpan={t.members.length} className="align-middle text-center">
                                <div className="space-y-1">
                                  <Link href={`/team/final/${t.id}`} className="font-semibold text-sm hover:text-primary inline-block">{t.team_title}</Link>
                                  <div className="text-[11px] text-muted-foreground">Score: {typeof t.combined_score === 'number' ? t.combined_score.toFixed(2) : '—'}</div>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <Link href={`/profile/${encodeURIComponent(m)}`} className="flex items-center gap-2 hover:text-primary">
                                <span className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-background/60">
                                  {img ? <Image src={img} alt={display} fill sizes="28px" className="object-cover" /> : <span className="w-full h-full flex items-center justify-center text-[10px] font-semibold bg-muted/70">{display.charAt(0).toUpperCase()}</span>}
                                </span>
                                <span className="truncate max-w-[9rem]">{display}</span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground/90">{p.email || '-'}</TableCell>
                            <TableCell>{p.mist_id || '-'}</TableCell>
                            <TableCell>{deriveLevel(p.mist_id)}</TableCell>
                            <TableCell>{p.phone || '-'}</TableCell>
                            {mi === 0 && (
                              <>
                                <TableCell rowSpan={t.members.length} className="align-top text-xs">
                                  {t.coach_vjudge_id ? (
                                    <Link href={`/profile/${encodeURIComponent(t.coach_vjudge_id)}`} className="underline underline-offset-2 hover:text-primary">{coachProfile.full_name || t.coach_vjudge_id}</Link>
                                  ) : <span className="text-muted-foreground/60">—</span>}
                                </TableCell>
                                <TableCell rowSpan={t.members.length} className="align-top text-xs">{coachProfile.email || '-'}</TableCell>
                                <TableCell rowSpan={t.members.length} className="align-top text-xs">{coachProfile.phone || '-'}</TableCell>
                                <TableCell rowSpan={t.members.length} className="align-top text-xs">{coachProfile.tshirt_size || '-'}</TableCell>
                              </>
                            )}
                          </TableRow>
                        )
                      })
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
