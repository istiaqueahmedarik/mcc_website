import Image from 'next/image'
import React from 'react'
import { Button } from '@/components/ui/button'
import { AirVent, ChartNoAxesGantt, Database, Pi, RefreshCcwDot, Soup } from 'lucide-react'
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

const Navbar = async () => {
  return (
    <div className="w-full px-8 py-4 bg-background">
      <div className="flex flex-row justify-between">
        <div className="flex flex-row items-center gap-12 ">
          <Link href="/">
            <MccLogo w={80} h={80} />
          </Link>

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
        <div className='lg:hidden'>
        <Sheet>
  <SheetTrigger><ChartNoAxesGantt /></SheetTrigger>
  <SheetContent className='flex flex-col justify-between'>
    <div className='py-4'>
    <Link href="/upcomingContest">
      <Button className="text-sm rounded-xl text-primary bg-transparent w-full active:bg-yellowCus1 active:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-start items-center">
        <RefreshCcwDot size={14} />
        <span>Upcoming Contests</span>
      </Button>
    </Link>
    <Link href="/upcomingContest">
      <Button className="text-sm rounded-xl text-primary bg-transparent w-full active:bg-yellowCus1 active:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-start items-center">
        <Soup size={14} />
        <span>Course Details</span>
      </Button>
    </Link>
    <Link href="/upcomingContest">
      <Button className="text-sm rounded-xl text-primary bg-transparent w-full active:bg-yellowCus1 active:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-start items-center">
        <Pi size={14} />
        <span>Problems</span>
      </Button>
    </Link>
    <Link href="/upcomingContest">
      <Button className="text-sm rounded-xl text-primary bg-transparent w-full active:bg-yellowCus1 active:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-start items-center">
        <Database size={14} />
        <span>Resources</span>
      </Button>
    </Link>
    </div>
    <div className='flex flex-row gap-2 justify-start items-center'>
    <ThemeChanger />
    <Link href="/upcomingContest">
      <Button className="text-sm rounded-xl text-primary bg-transparent active:bg-yellowCus1 active:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-start items-center">
        <span>Login</span>
      </Button>
    </Link>
    <Link href="/upcomingContest">
      <Button className="text-sm rounded-xl text-primary bg-transparent active:bg-yellowCus1 active:text-yellowCus1-foreground hover: font-mono py-1 flex flex-row gap-1 justify-start items-center">
        <span>Sign Up</span>
      </Button>
    </Link>
    </div>
  </SheetContent>
</Sheet>
        </div>
      </div>
    </div>
  )
}

export default Navbar
