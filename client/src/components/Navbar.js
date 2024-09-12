import Image from 'next/image'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, BookOpen, Code, FileText, Menu, LogIn, UserPlus } from 'lucide-react'
import Link from 'next/link'
import ThemeChanger from './ThemeChanger'
import MccLogo from './IconChanger/MccLogo'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const Navbar = () => {
  const navItems = [
    { href: "/upcomingContest", icon: Calendar, label: "Upcoming Contests" },
    { href: "/courseDetails", icon: BookOpen, label: "Course Details" },
    { href: "/problems", icon: Code, label: "Problems" },
    { href: "/resources", icon: FileText, label: "Resources" },
  ]

  return (
    <nav className="w-full px-4 md:px-8 py-4 bg-background shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <MccLogo w={60} h={60} />
          </Link>

          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" size="sm" className="text-sm font-medium">
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeChanger />
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/login">
              <Button variant="outline" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="default" size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </Button>
            </Link>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>
                  Navigate through our platform
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 flex flex-col space-y-4">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button variant="ghost" className="w-full justify-start text-lg">
                      <item.icon className="mr-2 h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
                <hr className="my-4" />
                <Link href="/login">
                  <Button variant="outline" className="w-full justify-start text-lg">
                    <LogIn className="mr-2 h-5 w-5" />
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="default" className="w-full justify-start text-lg">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

export default Navbar