import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatRelative } from 'date-fns'
import Image from 'next/image'

export default function AchievementCard({ achievement }) {
  return (
    <Card className='rounded-lg flex flex-col gap-4 p-4 shadow-lg h-fit max-w-sm'>
      <CardHeader>
        <Image
          src={achievement.image}
          alt={achievement.title}
          width={400}
          height={400}
        />
        <CardDescription>
          {formatRelative(achievement.date, new Date())}
        </CardDescription>
        <CardTitle>{achievement.title}</CardTitle>
      </CardHeader>
    </Card>
  )
}
