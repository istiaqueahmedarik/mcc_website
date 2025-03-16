import { getAchievement } from '@/lib/action'
import { formatRelative } from 'date-fns'
import { CalendarArrowUp } from 'lucide-react'
import Image from 'next/image'

export default async function SingleAchievement({ params }) {
  const { ach_id } = params
  const achievementArr = await getAchievement(ach_id)
  const achievement = achievementArr[0]
  console.log('ach: ', achievement)
  return (
    <div className='flex flex-col items-center justify-center gap-10 p-8'>
      <Image
        src={achievement.image}
        alt={achievement.title}
        width={500}
        height={500}
      />
      <div className='flex flex-row gap-2'>
      <CalendarArrowUp />
      <p>{formatRelative(achievement.date, new Date())}</p>
      </div>
      <p className='text-gray-400 text-sm'>{achievement.description}</p>
    </div>
  )
}
