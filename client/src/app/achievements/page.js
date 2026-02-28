import InfiniteScrollAchievements from '@/components/achievements/InfiniteScrollAchievements'
import { getAchievements, getAchievementNumber } from '@/lib/action'
import { cookies } from 'next/headers'

export default async function Achievements() {
  const [achievements, totalCount] = await Promise.all([
    getAchievements(5, 0),
    getAchievementNumber(),
  ])

  if (!Array.isArray(achievements) || achievements.length === 0) {
    return <></>
  }

  const cookieStore = await cookies()
  const isAdmin =
    cookieStore.get('admin') && cookieStore.get('admin').value === 'true'

  return (
    <div className="flex flex-col items-center justify-center gap-10 p-6 md:p-12">
      <h1 className="text-2xl font-bold">Achievements</h1>
      <InfiniteScrollAchievements
        initialAchievements={achievements}
        totalCount={Number(totalCount) || 0}
        isAdmin={isAdmin}
      />
    </div>
  )
}
