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
  Backpack,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  ChartNoAxesCombined,
  Code,
  Coffee,
  Globe,
  LogIn,
  Menu,
  SheetIcon,
  ShieldHalf,
  UserCheck,
  UserPlus,
  LaptopMinimalIcon,
  Users,
} from "lucide-react";
import { Link } from "next-view-transitions";
import { cookies } from "next/headers";
import MccLogo from "./IconChanger/MccLogo";
import ThemeChanger from "./ThemeChanger";
import ProgressLink from "./ProgressLink";

const Navbar = async () => {
  const navItems = [
    {
      href: "/contest_reminders",
      icon: CalendarClock,
      label: "Contest Reminders",
    },
    { href: "/alumni", icon: Award, label: "Alumni" },
    { href: "/achievements", icon: ChartNoAxesCombined, label: "Achievements" },
    { href: "/contests_report/live", icon: Globe, label: "Contests Report" },
    { href: "/finalized-teams", icon: Users, label: "Teams" },
  ];

  const userTools = [
    { href: "/courses", icon: BookOpen, label: "Course Details" },
    { href: "/my_dashboard", icon: Backpack, label: "My Dashboard" },
  ];

  const adminTools = [
    { href: "/admin", icon: SheetIcon, label: "CMS" },

    { href: "/grantuser", icon: UserCheck, label: "Grant Users" },
    { href: "/achievements/insert", icon: Award, label: "Insert Achievement" },
    { href: "/batches", icon: BrainCircuit, label: "Batches" },
    { href: "/courses/insert", icon: Coffee, label: "Create Course" },
    { href: "/contests_report", icon: Code, label: "Generate Contest Report" },
    {
      href: "/contests_report/demerit",
      icon: AlertTriangle,
      label: "Manage Demerits",
    },
    { href: "/admin/team-collection", icon: Users, label: "Team Collections" },
    {
      href: "/admin/custom-contests",
      icon: CalendarClock,
      label: "Custom Contests",
    },
    {
      href: "/admin/vjudge-verification",
      icon: LaptopMinimalIcon,
      label: "VJudge Verification",
    },
    {
      href: "/admin/cf-verification",
      icon: LaptopMinimalIcon,
      label: "CF Verification",
    },
  ];

  const loggedIn = (await cookies()).get("token");
  const user = await get_with_token("auth/user/profile");

  return (
    <nav className="w-full px-4 md:px-8 py-4 bg-background shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <ProgressLink href="/" className="flex items-center space-x-2">
            <MccLogo w={60} h={60} />
          </ProgressLink>

          <div className="hidden lg:flex items-center justify-center w-full space-x-2">
            {navItems.map((item) => (
              <ProgressLink key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-medium"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </ProgressLink>
            ))}
            {loggedIn &&
              userTools.map((item) => (
                <ProgressLink key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm font-medium"
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </ProgressLink>
              ))}
            {user && user.result && user.result[0].admin && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex flex-row items-center gpa-2">
                  {" "}
                  <ShieldHalf className="w-4 h-4 mr-2" /> Admin
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
              href="/profile"
              className={`${!loggedIn && "hidden"}`}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={user && user.result && user.result[0].profile_pic}
                />
                <AvatarFallback>
                  {user && user.result && user.result[0].full_name[0]}
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

                  <hr className="my-4" />
                  {user &&
                    user.result &&
                    user.result[0].admin &&
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
                    href="/profile"
                    className={`${!loggedIn && "hidden"}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={user && user.result && user.result[0].profile_pic}
                      />
                      <AvatarFallback>
                        {user && user.result && user.result[0].full_name[0]}
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
