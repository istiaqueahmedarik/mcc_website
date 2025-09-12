import { publicFinalizedTeamsByContest } from '@/actions/team_collection'
import Link from 'next/link'
import Image from 'next/image'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
    const r = await fetch(`${base}/auth/profile`, { cache: 'no-store' })
    if(!r.ok) return null
    const j = await r.json()
    return j?.result || null
  } catch {
    return null
  }
}

export default async function FinalizedTeamsByContestPage(){
  const [res, me] = await Promise.all([
    publicFinalizedTeamsByContest(),
    fetchCurrentUser()
  ])
  const blocks = res?.result || []
  const isAdmin = !!me?.admin

  // Collect unique member ids across all finalized teams
  const memberSet = new Set()
  for (const b of blocks){
    for (const t of b.teams || []){
      for (const m of (t.members || [])) memberSet.add(m)
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
          <p className="text-sm text-muted-foreground">Simple, information-rich listing powered by shadcn/ui table.</p>
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
              <h2 id={`c-${block.collection_id}`} className="text-2xl font-semibold tracking-tight flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-bold shadow-inner">{block.teams.length}</span>
                <span>{block.collection_title || 'Untitled Collection'}</span>
              </h2>
            </div>

            {/* Public (shared) compact leaderboard */}
            <div className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Public Leaderboard</div>
            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur shadow-sm overflow-hidden">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="w-28">Score</TableHead>
                    <TableHead>Members</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {block.teams.map((t, idx) => {
                    const top = idx === 0
                    return (
                      <TableRow key={t.id} className={top ? 'bg-gradient-to-r from-emerald-500/15 to-emerald-500/0' : ''}>
                        <TableCell className="font-semibold">#{idx+1}</TableCell>
                        <TableCell>
                          <Link href={`/team/final/${t.id}`} className="font-medium hover:text-primary transition-colors">{t.team_title}</Link>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 font-medium">
                            {typeof t.combined_score === 'number' ? t.combined_score.toFixed(2) : '—'}
                            {top && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">Top</span>}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-wrap gap-2">
                            {t.members.map(m => {
                              const p = profileMap.get(m) || {}
                              const display = p.full_name || m
                              const img = p.profile_pic
                              return (
                                <Link key={m} href={`/u/${encodeURIComponent(m)}`} className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border border-border/40 hover:bg-muted/70 transition-colors">
                                  <span className="relative w-6 h-6 rounded-full overflow-hidden ring-2 ring-background/60 shadow-sm">
                                    {img ? (
                                      <Image src={img} alt={display} fill sizes="24px" className="object-cover" />
                                    ) : (
                                      <span className="w-full h-full flex items-center justify-center text-[10px] font-semibold bg-gradient-to-br from-primary/30 to-primary/10 text-foreground/80">
                                        {display.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[11px] max-w-[6rem] truncate group-hover:text-foreground/90">{display}</span>
                                </Link>
                              )
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {isAdmin && (
              <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur shadow-inner overflow-hidden">
                <div className="px-4 pt-4 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin Detailed View</div>
                <Table className="text-[13px]">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-52">Team</TableHead>
                      <TableHead className="w-48">Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-28">Student ID</TableHead>
                      <TableHead className="w-20">Level</TableHead>
                      <TableHead className="w-32">Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {block.teams.flatMap(t => {
                      const members = t.members
                      return members.map((m, i) => {
                        const p = profileMap.get(m) || {}
                        const display = p.full_name || m
                        const img = p.profile_pic
                        return (
                          <TableRow key={`${t.id}_${m}`}> 
                            {i === 0 && (
                              <TableCell rowSpan={members.length} className="align-top">
                                <div className="space-y-1">
                                  <Link href={`/team/final/${t.id}`} className="font-semibold text-sm hover:text-primary">{t.team_title}</Link>
                                  <div className="text-[11px] text-muted-foreground">Score: {typeof t.combined_score === 'number' ? t.combined_score.toFixed(2) : '—'}</div>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <Link href={`/u/${encodeURIComponent(m)}`} className="flex items-center gap-2 hover:text-primary">
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
