import AchievementCard from '@/components/achievements/achievementCard'
import { getAchievements } from '@/lib/action'
import { cn } from '@/lib/utils'
import { cookies } from 'next/headers'

export default async function Achievements() {
  const achievements = await getAchievements()
  if (!Array.isArray(achievements) || achievements.length === 0) {
    return <></>
  }

  const cookieStore = await cookies()
  const isAdmin =
    cookieStore.get('admin') && cookieStore.get('admin').value === 'true'

  return (
    <div className="flex flex-col items-center justify-center gap-10 p-12">
      <h1 className="text-2xl font-bold">Achievements</h1>

      {achievements.length > 0 && (
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            {achievements.map((achievement, index) => {
              let sizeClass = ''
              const position = index % 8
              switch (position) {
                case 0:
                case 1:
                case 5:
                case 6:
                case 7:
                  sizeClass = 'col-span-1 md:col-span-6 lg:col-span-6'
                  break
                case 2:
                case 3:
                case 4:
                default:
                  sizeClass = 'col-span-1 md:col-span-4 lg:col-span-4'
              }
              const isFeatured = index % 8 === 0
              return (
                <div
                  key={achievement.id}
                  className={cn(
                    sizeClass,
                    'transition-all duration-300 hover:scale-[1.02] group',
                  )}
                >
                  <div
                    className={cn(
                      'h-full rounded-2xl overflow-hidden shadow-md',
                      isFeatured
                        ? 'bg-primary/5 ring-1 ring-primary/20'
                        : 'bg-card',
                    )}
                  >
                    <AchievementCard
                      achievement={achievement}
                      isAdmin={isAdmin}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
