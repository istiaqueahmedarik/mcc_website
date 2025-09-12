import { publicFinalizedTeamsByContest } from '@/actions/team_collection'
import Link from 'next/link'
import Image from 'next/image'

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

export default async function FinalizedTeamsByContestPage(){
  const res = await publicFinalizedTeamsByContest()
  const blocks = res?.result || []

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

  const gradientBadges = [
    'from-indigo-500 to-blue-500',
    'from-emerald-500 to-teal-500',
    'from-rose-500 to-pink-500',
    'from-amber-500 to-orange-500',
    'from-fuchsia-500 to-purple-500'
  ]

  return (
    <main className="relative min-h-screen bg-[radial-gradient(circle_at_30%_20%,hsl(var(--background))_0%,hsl(var(--background))_55%,hsl(var(--muted)/0.35)_100%)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-primary/15 to-primary/0 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-secondary/20 to-secondary/0 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-accent/25 to-accent/0 blur-3xl" />
      </div>
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <header className="space-y-8 text-center">
          
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
            Our Current Teams
          </h1>
        
        </header>

        {blocks.length === 0 && (
          <div className="mx-auto max-w-md text-center rounded-3xl border border-border/60 bg-card/40 backdrop-blur-xl p-10 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.25)]">
            <p className="text-sm text-muted-foreground">No finalized teams yet. Check back soon.</p>
          </div>
        )}

        <div className="space-y-24">
          {blocks.map(block => (
            <section
              key={block.collection_id}
              aria-labelledby={`section-${block.collection_id}`}
              className="relative space-y-8"
            >
              <div className="relative group overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card/70 to-card/30 backdrop-blur-xl px-8 py-10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.35)]">
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-primary/10 to-primary/0 blur-2xl" />
                  <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-gradient-to-tr from-muted/20 to-transparent blur-2xl" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
                  <div className="space-y-3">
                    <h2 id={`section-${block.collection_id}`} className="text-3xl font-semibold tracking-tight">
                      {block.collection_title || 'Untitled Collection'}
                    </h2>
                
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-4 py-1.5 rounded-full bg-gradient-to-br from-muted/70 to-muted/40 border border-border/60 backdrop-blur shadow-sm">
                      {block.teams.length} {block.teams.length === 1 ? 'Team' : 'Teams'}
                    </span>
                  </div>
                </div>
                <ol className="mt-10 space-y-4">
                  {block.teams.map((t, idx) => {
                    const gradient = gradientBadges[idx % gradientBadges.length]
                    const isTop = idx < 3
                    return (
                      <li key={t.id} aria-label={`Team ${t.team_title} ranked ${idx+1}`}>
                        <div className="group/item relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl p-5 md:p-6 transition-all duration-500 hover:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] focus-within:ring-2 focus-within:ring-primary/40">
                          <div className="pointer-events-none absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-700">
                            <div className={`absolute -right-10 -top-8 h-40 w-40 rounded-full bg-gradient-to-br ${gradient} opacity-[0.18] blur-2xl`} />
                          </div>
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
                            <Link href={`/team/final/${t.id}`} className="flex items-center gap-5 min-w-0 focus:outline-none rounded-xl">
                              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-semibold text-lg shadow-md shadow-black/20 ring-4 ring-background/60`}>#{idx+1}</div>
                              <div className="space-y-1 min-w-0 text-left">
                                <h3 className="font-medium text-lg tracking-tight truncate max-w-[18rem] md:max-w-[26rem] group-hover/item:text-primary transition-colors">
                                  {t.team_title}
                                </h3>
                                <p className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1">
                                    <span className={`h-1.5 w-1.5 rounded-full ${isTop ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                                    {isTop ? 'Top Performing' : 'Finalized'}
                                  </span>
                                  <span className="text-muted-foreground/40">•</span>
                                  <span>{t.members.length} {t.members.length === 1 ? 'Member' : 'Members'}</span>
                                </p>
                              </div>
                            </Link>
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center">
                                <span className={`relative inline-flex items-center gap-2 rounded-full border border-border/50 bg-gradient-to-br ${isTop ? 'from-primary/25 to-primary/5' : 'from-muted/60 to-muted/30'} px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground/90 backdrop-blur transition-colors shadow-sm`}>Score
                                  <span className="text-foreground/60 font-normal">
                                    {typeof t.combined_score === 'number' ? t.combined_score.toFixed(2) : '—'}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pl-[4.25rem]">
                            <div className="flex flex-wrap items-center gap-2">
                              {t.members.map(m => {
                                const p = profileMap.get(m)
                                const img = p?.profile_pic
                                const display = p?.full_name || m
                                return (
                                  <Link
                                    key={m}
                                    href={`/u/${encodeURIComponent(m)}`}
                                    className="group/member flex items-center gap-2 pr-4 pl-1 py-1 rounded-full bg-muted/40 border border-border/40 backdrop-blur hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors shadow-sm"
                                  >
                                    <div className="relative h-8 w-8 rounded-full overflow-hidden ring-2 ring-background/60 shadow-sm group-hover/member:scale-[1.05] transition-transform">
                                      {img ? (
                                        <Image src={img} alt={display} fill sizes="32px" className="object-cover" />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold bg-gradient-to-br from-primary/30 to-primary/10 text-foreground/80">
                                          {display.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-medium text-foreground/80 max-w-[6rem] truncate group-hover/member:text-foreground">
                                      {display}
                                    </span>
                                  </Link>
                                )
                              })}
                            </div>
                          </div>
                          <span className="absolute inset-0 pointer-events-none" aria-hidden="true" />
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
