import InfiniteScrollAchievements from '@/components/achievements/InfiniteScrollAchievements'
import { getAchievementNumber, getAchievements } from '@/lib/action'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function Achievements() {
  const [achievements, totalCount] = await Promise.all([
    getAchievements(6, 0),
    getAchievementNumber(),
  ])

  if (!Array.isArray(achievements) || achievements.length === 0) {
    return <></>
  }

  const cookieStore = await cookies()
  const isAdmin =
    cookieStore.get('admin') && cookieStore.get('admin').value === 'true'

  return (
    <div className="flex flex-col items-center justify-center gap-10 py-4 px-2 md:px-16">
      <div className="items-center text-center">
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-zinc-600 dark:text-white/40 text-sm leading-relaxed my-4">
          A curated collection of milestones, wins, and moments worth remembering.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/[0.04] dark:bg-white/[0.04] border border-zinc-900/[0.12] dark:border-white/[0.08] text-xs text-zinc-600 dark:text-white/40 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {Number(totalCount) || 0} total achievements
        </div>
      </div>
      <InfiniteScrollAchievements
        initialAchievements={achievements}
        totalCount={Number(totalCount) || 0}
        isAdmin={isAdmin}
      />
    </div>
  )
}
