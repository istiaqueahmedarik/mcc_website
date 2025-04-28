import { deleteAchievement } from '@/lib/action'
import { format } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import DeleteComp from '../deleteComp'

export default function AchievementCard({ achievement, isAdmin }) {
  return (
    <div className="relative h-64 w-full rounded-2xl overflow-hidden group shadow-md">
      <Image
        src={achievement.image || '/vjudge_cover.png'}
        alt={achievement.title || 'Achievement Photo'}
        fill
        className="object-cover w-full h-full"
        priority
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all" />
      {isAdmin && (
        <DeleteComp
          delFunc={deleteAchievement}
          content={achievement}
        />
      )}
      <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
        <div>
          <h2 className="text-2xl font-bold text-white drop-shadow mb-2 truncate">
            {achievement.title}
          </h2>
          <h4 className="drop-shadow mb-2 truncate">
            {format(achievement.date, 'dd MMM yyyy')}
          </h4>
        </div>
        <div className="flex justify-end">
          <Link
            href={`/achievements/${achievement.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow"
          >
            View achievement
          </Link>
        </div>
      </div>
    </div>
  )
}
