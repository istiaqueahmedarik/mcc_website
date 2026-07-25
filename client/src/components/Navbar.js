import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { get_with_token } from "@/lib/action";
import {
  AlertTriangle,
  Award,
  CalendarClock,
  ChartNoAxesCombined,
  Code,
  Globe,
  Keyboard,
  LogIn,
  Menu,
  Settings,
  ShieldHalf,
  Trophy,
  UserCheck,
  UserPlus,
  Users
} from "lucide-react";
import { cookies } from "next/headers";
import MccLogo from "./IconChanger/MccLogo";
import ProgressLink from "./ProgressLink";
import ThemeChanger from "./ThemeChanger";
import NotificationBell from "./NotificationBell";

const Navbar = async () => {
  const navItems = [
    {
      href: '/contest_reminders',
      icon: CalendarClock,
      label: 'Reminders',
    },
    { href: '/contests', icon: Trophy, label: 'Contests' },
    { href: '/icpc_journey', icon: Globe, label: 'ICPC' },
    { href: '/alumni', icon: Award, label: 'Alumni' },
    { href: '/achievements', icon: ChartNoAxesCombined, label: 'Achievements' },
    { href: '/contests_report/live', icon: Globe, label: 'Reports' },
    { href: '/finalized-teams', icon: Users, label: 'Teams' },
    { href: '/typing', icon: Keyboard, label: 'Typing' },
  ]

  const userTools = [
    { href: '/classroom/list', icon: Users, label: 'Classrooms' },
  ]

  const adminTools = [
    { href: '/admin', icon: Settings, label: 'CMS' },
    { href: '/admin/dashboard', icon: UserCheck, label: 'Admin Verification' },
    { href: '/admin/trainers', icon: UserCheck, label: 'Manage Trainers' },
    { href: '/admin/icpc', icon: CalendarClock, label: 'ICPC' },
    { href: '/admin/contests', icon: Trophy, label: 'Contest Manager' },
    { href: '/achievements/insert', icon: Award, label: 'Insert Achievement' },
    // { href: '/batches', icon: BrainCircuit, label: 'Batches' },
    // { href: '/courses/insert', icon: Coffee, label: 'Create Course' },
    { href: '/contests_report', icon: Code, label: 'Generate Contest Report' },
    { href: '/contests_report/demerit', icon: AlertTriangle, label: 'Manage Demerits' },
    { href: '/admin/team-collection', icon: Users, label: 'Team Collections' },
    { href: '/admin/custom-contests', icon: CalendarClock, label: 'Custom Contests' },
  ]

  const loggedIn = (await cookies()).get("token");
  const user = await get_with_token("auth/user/profile");

  const profile = (user && user.result && user.result[0]) || null;
  const isLoggedIn = Boolean(loggedIn && profile);
  const isAdmin = Boolean(profile && profile.admin);
  const isTrainer = Boolean(profile && profile.trainer);
  const canUseTrainerDashboard = isTrainer || isAdmin;

  const trainerTools = [];
  if (canUseTrainerDashboard) {
    trainerTools.push({ href: '/trainer/dashboard', icon: Code, label: 'Trainer Dashboard' });
  }

  // Trainers/admins get their own dedicated profile page
  const profileHref = canUseTrainerDashboard ? '/trainer/profile' : '/profile';

  return (
    <nav className="w-full px-4 md:px-8 py-4 bg-background shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center w-full space-x-8">
          <ProgressLink href="/" className="flex items-center space-x-2">
            <MccLogo w={60} h={60} />
          </ProgressLink>

          <div className="hidden lg:flex flex-wrap items-center justify-center w-full gap-1">
            {navItems.map((item) => (
              <ProgressLink key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-medium"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </ProgressLink>
            ))}
            {isLoggedIn && !canUseTrainerDashboard &&
              userTools.map((item) => (
                <ProgressLink key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm font-medium"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </ProgressLink>
              ))}
            {isLoggedIn &&
              trainerTools.map((item) => (
                <ProgressLink key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm font-medium"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </ProgressLink>
              ))}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex flex-row items-center gap-2">
                  {" "}
                  <ShieldHalf className="w-4 h-4 " /> Admin
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {adminTools.map((item) => (
                    <ProgressLink key={item.href} href={item.href}>
                      <DropdownMenuItem>
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </DropdownMenuItem>
                    </ProgressLink>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {loggedIn && (
            <NotificationBell
              userId={user && user.result && user.result[0] && user.result[0].id}
            />
          )}
          <ThemeChanger />
          <div className="hidden md:flex items-center space-x-2">
            <ProgressLink href="/login" className={`${loggedIn && "hidden"}`}>
              <Button variant="outline" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </ProgressLink>
            <ProgressLink href="/signup" className={`${loggedIn && "hidden"}`}>
              <Button variant="default" size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </Button>
            </ProgressLink>
            <ProgressLink
              href={profileHref}
              className={`${!loggedIn && "hidden"}`}
            >

              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={user && user.result && user.result[0].profile_pic}
                />
                <AvatarFallback>
                  {user && user.result && user.result[0].full_name && user.result[0].full_name[0]}
                </AvatarFallback>
              </Avatar>
            </ProgressLink>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] overflow-y-auto sm:w-[400px]"
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
                    <SheetClose asChild key={index}>
                      <ProgressLink key={item.href} href={item.href}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-lg"
                        >
                          <item.icon className="mr-2 h-5 w-5" />
                          {item.label}
                        </Button>
                      </ProgressLink>
                    </SheetClose>
                  ))}

                  {isLoggedIn && !canUseTrainerDashboard &&
                    userTools.map((item, index) => (
                      <SheetClose asChild key={index}>
                        <ProgressLink key={item.href} href={item.href}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-lg"
                          >
                            <item.icon className="mr-2 h-5 w-5" />
                            {item.label}
                          </Button>
                        </ProgressLink>
                      </SheetClose>
                    ))}

                  {isLoggedIn &&
                    trainerTools.map((item, index) => (
                      <SheetClose asChild key={index}>
                        <ProgressLink key={item.href} href={item.href}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-lg"
                          >
                            <item.icon className="mr-2 h-5 w-5" />
                            {item.label}
                          </Button>
                        </ProgressLink>
                      </SheetClose>
                    ))}

                  {isAdmin && <hr className="my-4" />}
                  {isAdmin &&
                    adminTools.map((item, index) => (
                      <SheetClose asChild key={index}>
                        <ProgressLink key={item.href} href={item.href}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-lg"
                          >
                            <item.icon className="mr-2 h-5 w-5" />
                            {item.label}
                          </Button>
                        </ProgressLink>
                      </SheetClose>
                    ))}
                  <hr className="my-4" />
                  <ProgressLink
                    href="/login"
                    className={`${loggedIn && "hidden"}`}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start text-lg"
                    >
                      <LogIn className="mr-2 h-5 w-5" />
                      Login
                    </Button>
                  </ProgressLink>
                  <ProgressLink
                    href="/signup"
                    className={`${loggedIn && "hidden"}`}
                  >
                    <Button
                      variant="default"
                      className="w-full justify-start text-lg"
                    >
                      <UserPlus className="mr-2 h-5 w-5" />
                      Sign Up
                    </Button>
                  </ProgressLink>
                  <ProgressLink
                    href={profileHref}
                    className={`${!loggedIn && "hidden"}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={user && user.result && user.result[0].profile_pic}
                      />
                      <AvatarFallback>
                        {user && user.result && user.result[0].full_name && user.result[0].full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </ProgressLink>
                </div>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
