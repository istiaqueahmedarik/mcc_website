import Image from 'next/image'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Database, Pi, RefreshCcwDot, Soup } from 'lucide-react'
import Link from 'next/link'
import ThemeChanger from './ThemeChanger'
import MccLogo from './IconChanger/MccLogo'

const Navbar = async () => {
  return (
    <div className="w-full px-8 py-4 bg-background">
      <div className="flex flex-row justify-between">
        <div className="flex flex-row items-center gap-12 ">
          <MccLogo w={80} h={80} />

          <div className="flex flex-row items-center gap-4 max-lg:hidden">
            <Link href="/upcomingContest">
              <Button className="text-sm rounded-xl text-primary bg-transparent border border-primary hover:bg-yellowCus1 hover:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-between items-center">
                <RefreshCcwDot size={14} />
                <span>Upcoming Contests</span>
              </Button>
            </Link>
            <Link href="/upcomingContest">
              <Button className="text-sm rounded-xl text-primary bg-transparent border border-primary hover:bg-yellowCus1 hover:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-between items-center">
                <Soup size={14} />
                <span>Course Details</span>
              </Button>
            </Link>
            <Link href="/upcomingContest">
              <Button className="text-sm rounded-xl text-primary bg-transparent border border-primary hover:bg-yellowCus1 hover:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-between items-center">
                <Pi size={14} />
                <span>Problems</span>
              </Button>
            </Link>
            <Link href="/upcomingContest">
              <Button className="text-sm rounded-xl text-primary bg-transparent border border-primary hover:bg-yellowCus1 hover:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-between items-center">
                <Database size={14} />
                <span>Resources</span>
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex flex-row justify-between items-center gap-4 max-lg:hidden">
          <ThemeChanger />
          <Link href="/upcomingContest">
            <Button className="text-sm rounded-xl text-primary bg-transparent border border-primary hover:bg-yellowCus1 hover:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-between items-center">
              <span>Login</span>
            </Button>
          </Link>
          <Link href="/upcomingContest">
            <Button className="text-sm rounded-xl text-primary bg-transparent border border-primary hover:bg-yellowCus1 hover:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-between items-center">
              <span>Sign Up</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Navbar
