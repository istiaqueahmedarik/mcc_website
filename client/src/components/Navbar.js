import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { get_with_token } from '@/lib/action'
import {
  Award,
  Backpack,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  ChartNoAxesCombined,
  Code,
  Coffee,
  LogIn,
  Menu,
  ShieldHalf,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { Link } from 'next-view-transitions'
import { cookies } from 'next/headers'
import MccLogo from './IconChanger/MccLogo'
import ThemeChanger from './ThemeChanger'

const Navbar = async () => {
  const navItems = [
    {
      href: '/contest_reminders',
      icon: CalendarClock,
      label: 'Contest Reminders',
    },
    { href: '/courses', icon: BookOpen, label: 'Course Details' },
    { href: '/achievements', icon: ChartNoAxesCombined, label: 'Achievements' },
  ]

  const userTools = [
    { href: '/my_dashboard', icon: Backpack, label: 'My Dashboard' },
  ]

  const adminTools = [
    { href: '/grantuser', icon: UserCheck, label: 'Grant Users' },
    { href: '/achievements/insert', icon: Award, label: 'Insert Achievement' },
    { href: '/batches', icon: BrainCircuit, label: 'Batches' },
    { href: '/courses/insert', icon: Coffee, label: 'Create Course' },
    { href: '/contests_report', icon: Code, label: 'Generate Contest Report' },
  ]

  const loggedIn = (await cookies()).get('token')
  const user = await get_with_token('auth/user/profile')

  return (
    <nav className="w-full px-4 md:px-8 py-4 bg-background shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link
            href="/"
            className="flex items-center space-x-2"
          >
            <MccLogo
              w={60}
              h={60}
            />
          </Link>

          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-medium"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            ))}
            {loggedIn &&
              userTools.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm font-medium"
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            {user && user.result && user.result[0].admin && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex flex-row items-center gpa-2">
                  {' '}
                  <ShieldHalf className="w-4 h-4 mr-2" /> Admin Tools
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {adminTools.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                    >
                      <DropdownMenuItem>
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeChanger />
          <div className="hidden md:flex items-center space-x-2">
            <Link
              href="/login"
              className={`${loggedIn && 'hidden'}`}
            >
              <Button
                variant="outline"
                size="sm"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </Link>
            <Link
              href="/signup"
              className={`${loggedIn && 'hidden'}`}
            >
              <Button
                variant="default"
                size="sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </Button>
            </Link>
            <Link
              href="/profile"
              className={`${!loggedIn && 'hidden'}`}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={user && user.result && user.result[0].profile_pic}
                />
                <AvatarFallback>
                  {user && user.result && user.result[0].full_name[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] sm:w-[400px]"
            >
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>
                  Navigate through our platform
                </SheetDescription>
              </SheetHeader>
              <SheetClose asChild>
                <div className="mt-6 flex flex-col space-y-4">
                  {navItems.map((item, index) => (
                    <SheetClose
                      asChild
                      key={index}
                    >
                      <Link
                        key={item.href}
                        href={item.href}
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-lg"
                        >
                          <item.icon className="mr-2 h-5 w-5" />
                          {item.label}
                        </Button>
                      </Link>
                    </SheetClose>
                  ))}

                  <hr className="my-4" />
                  {user &&
                    user.result &&
                    user.result[0].admin &&
                    adminTools.map((item, index) => (
                      <SheetClose
                        asChild
                        key={index}
                      >
                        <Link
                          key={item.href}
                          href={item.href}
                        >
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-lg"
                          >
                            <item.icon className="mr-2 h-5 w-5" />
                            {item.label}
                          </Button>
                        </Link>
                      </SheetClose>
                    ))}
                  <hr className="my-4" />
                  <Link
                    href="/login"
                    className={`${loggedIn && 'hidden'}`}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start text-lg"
                    >
                      <LogIn className="mr-2 h-5 w-5" />
                      Login
                    </Button>
                  </Link>
                  <Link
                    href="/signup"
                    className={`${loggedIn && 'hidden'}`}
                  >
                    <Button
                      variant="default"
                      className="w-full justify-start text-lg"
                    >
                      <UserPlus className="mr-2 h-5 w-5" />
                      Sign Up
                    </Button>
                  </Link>
                  <Link
                    href="/profile"
                    className={`${!loggedIn && 'hidden'}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={user && user.result && user.result[0].profile_pic}
                      />
                      <AvatarFallback>
                        {user && user.result && user.result[0].full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </div>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
