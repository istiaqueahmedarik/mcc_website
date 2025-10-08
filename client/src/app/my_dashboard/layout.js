import { Badge } from '@/components/ui/badge'
import {Link} from 'next-view-transitions'

const MyDashboardLayout = ({ children }) => {
  return (
    <div className="w-full flex flex-col items-center">
      {children}
    </div>
  )
}

export default MyDashboardLayout
