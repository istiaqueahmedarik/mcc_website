
import AchievementCard from '@/components/achievements/achievementCard'
import { getAchievements } from '@/lib/action'

export default async function Achievements() {
  const achievements = await getAchievements()
  if (!Array.isArray(achievements) || achievements.length === 0) {
    return <></>
  }

  const firstColumn = achievements.filter((_, index) => index % 3 === 0)
  const secondColumn = achievements.filter((_, index) => index % 3 === 1)
  const thirdColumn = achievements.filter((_, index) => index % 3 === 2)
  return (
    <div className="flex flex-col items-center justify-center gap-10 p-8">
      <h1 className="text-2xl font-bold">Achievements</h1>

      {achievements.length === 0 && <p>No courses available</p>}
      {achievements.length < 3 ? (
        <div className="flex flex-row flex-wrap mt-12 gap-10">
          {achievements.map((achievement) => (
            <AchievementCard
              achievement={achievement}
              key={achievement.id}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-12">
          <div className="flex flex-col gap-10">
            {firstColumn.map((achievement) => (
              <AchievementCard
                achievement={achievement}
                key={achievement.id}
              />
            ))}
          </div>
          <div className="flex flex-col gap-10">
            {secondColumn.map((achievement) => (
              <AchievementCard
                achievement={achievement}
                key={achievement.id}
              />
            ))}
          </div>
          <div className="flex flex-col gap-10">
            {thirdColumn.map((achievement) => (
              <AchievementCard
                achievement={achievement}
                key={achievement.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
