import { Button } from '@/components/ui/button'
import { logout } from '@/lib/action'
import { LogOut } from 'lucide-react'

const Page = () => {
  return (
    <div>
      <form action={logout}>
        <Button
          variant="destructive"
          className="w-full"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </form>
    </div>
  )
}

export default Page
