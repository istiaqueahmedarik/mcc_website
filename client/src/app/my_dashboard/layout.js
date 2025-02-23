import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const MyDashboardLayout = ({ children }) => {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-7xl flex items-center justify-center gap-2">
        <Link href={`/my_dashboard`}>
          <Badge>Schedules</Badge>
        </Link>
        <Link href={`/my_dashboard/progress`}>
          <Badge>Progress</Badge>
        </Link>
        <Link href={`/my_dashboard/progress_track`}>
          <Badge>Progress Track</Badge>
        </Link>
      </div>
      {children}
    </div>
  )
}

export default MyDashboardLayout
