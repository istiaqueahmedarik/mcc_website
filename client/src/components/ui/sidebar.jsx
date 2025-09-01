"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { Home, Inbox, Calendar, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navItems = [
  { title: "Home", url: "#", icon: Home },
  { title: "Inbox", url: "#", icon: Inbox },
  { title: "Calendar", url: "#", icon: Calendar },
  { title: "Search", url: "#", icon: Search },
  { title: "Settings", url: "#", icon: Settings },
];

export function Sidebar() {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="flex">
      {/* Sidebar Panel */}
      <div
        className={`h-screen border-r bg-neutral-900 text-neutral-100 transition-all duration-300 ${
          open ? "w-60" : "w-16"
        }`}
      >
        <div className="flex items-center justify-between p-3">
          <span className="text-lg font-bold">{open ? "Menu" : "M"}</span>
          <Collapsible.Trigger asChild>
            <button className="rounded bg-neutral-800 px-2 py-1 text-sm">
              {open ? "<" : ">"}
            </button>
          </Collapsible.Trigger>
        </div>

        <nav className="mt-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.title}
              href={item.url}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-neutral-800"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {open && <span>{item.title}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </Collapsible.Root>
  );
}
